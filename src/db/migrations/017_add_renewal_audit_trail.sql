-- =====================================================
-- Migration 017: Add Renewal Audit Trail
-- =====================================================
-- This migration:
-- 1. Creates subscription_renewals table to track all renewals
-- 2. Updates activate_pro_key function to log renewals
-- 3. Provides complete audit trail for subscription renewals
-- =====================================================

-- =====================================================
-- PART 1: Create subscription_renewals table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.subscription_renewals (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    old_expiry_date TIMESTAMP WITH TIME ZONE NOT NULL,
    new_expiry_date TIMESTAMP WITH TIME ZONE NOT NULL,
    key_id UUID NOT NULL,  -- The renewal key that was used
    duration_added_days INTEGER NOT NULL,
    was_capped BOOLEAN DEFAULT false,  -- Whether expiry was capped at maximum
    renewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT subscription_renewals_pkey PRIMARY KEY (id),
    CONSTRAINT subscription_renewals_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
    CONSTRAINT subscription_renewals_key_id_fkey FOREIGN KEY (key_id) REFERENCES public.keys(id) ON DELETE RESTRICT
);

-- =====================================================
-- PART 2: Create indexes for efficient queries
-- =====================================================

-- Index for querying renewals by user
CREATE INDEX IF NOT EXISTS subscription_renewals_user_id_idx 
    ON public.subscription_renewals(user_id);

-- Index for querying renewals by key
CREATE INDEX IF NOT EXISTS subscription_renewals_key_id_idx 
    ON public.subscription_renewals(key_id);

-- Index for querying renewals by date (for analytics)
CREATE INDEX IF NOT EXISTS subscription_renewals_renewed_at_idx 
    ON public.subscription_renewals(renewed_at DESC);

-- =====================================================
-- PART 3: Update activate_pro_key function to log renewals
-- =====================================================

CREATE OR REPLACE FUNCTION public.activate_pro_key(
    key_id uuid,
    user_identifier uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_period date;
    affected_rows integer;
    existing_key_record record;
    new_key_record record;
    current_expiry_date timestamp with time zone;
    new_expiry_date timestamp with time zone;
    max_allowed_expiry timestamp with time zone;
    duration_days_to_add integer;
    is_renewal boolean := false;
    max_future_expiry_months integer := 12;  -- Maximum 12 months from today
    renewal_was_capped boolean := false;
BEGIN
    -- Validate key exists and is unused
    IF NOT EXISTS (
        SELECT 1 FROM keys 
        WHERE id = key_id 
        AND is_used = false
        AND expiry_date > CURRENT_TIMESTAMP
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Key is invalid, already used, or expired'
        );
    END IF;
    
    -- Get the new key's duration
    SELECT duration_days INTO duration_days_to_add
    FROM keys
    WHERE id = key_id;
    
    IF duration_days_to_add IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Key duration not found'
        );
    END IF;
    
    -- Check if user has an active subscription (not expired)
    SELECT 
        id,
        expiry_date
    INTO existing_key_record
    FROM keys
    WHERE used_by = user_identifier
    AND is_used = true
    AND expiry_date > CURRENT_TIMESTAMP
    ORDER BY expiry_date DESC
    LIMIT 1;
    
    -- Determine if this is a renewal or new activation
    IF existing_key_record IS NOT NULL THEN
        -- =====================================================
        -- RENEWAL PATH
        -- =====================================================
        is_renewal := true;
        current_expiry_date := existing_key_record.expiry_date;
        
        -- Calculate new expiry date: current expiry + duration from new key
        new_expiry_date := current_expiry_date + (duration_days_to_add || ' days')::interval;
        
        -- Apply maximum expiry cap (12 months from today)
        max_allowed_expiry := CURRENT_TIMESTAMP + (max_future_expiry_months || ' months')::interval;
        
        -- If calculated expiry exceeds cap, cap it at maximum
        IF new_expiry_date > max_allowed_expiry THEN
            new_expiry_date := max_allowed_expiry;
            renewal_was_capped := true;
            -- Log warning (using RAISE NOTICE for visibility)
            RAISE NOTICE 'Subscription renewal capped at maximum: user_id=%, old_expiry=%, calculated_expiry=%, capped_expiry=%',
                user_identifier, current_expiry_date, 
                current_expiry_date + (duration_days_to_add || ' days')::interval,
                new_expiry_date;
        END IF;
        
        -- Update existing key's expiry_date to extend subscription
        UPDATE keys
        SET 
            expiry_date = new_expiry_date,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = existing_key_record.id
        RETURNING 1 INTO affected_rows;
        
        IF affected_rows = 0 THEN
            RETURN jsonb_build_object(
                'success', false,
                'message', 'Failed to extend subscription'
            );
        END IF;
        
        -- Mark the new key as used (for audit trail)
        UPDATE keys
        SET 
            is_used = true,
            used_by = user_identifier,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = key_id
        RETURNING 1 INTO affected_rows;
        
        IF affected_rows = 0 THEN
            RETURN jsonb_build_object(
                'success', false,
                'message', 'Failed to mark renewal key as used'
            );
        END IF;
        
        -- =====================================================
        -- STEP 7: Log renewal to audit trail
        -- =====================================================
        INSERT INTO public.subscription_renewals (
            user_id,
            old_expiry_date,
            new_expiry_date,
            key_id,
            duration_added_days,
            was_capped,
            renewed_at
        )
        VALUES (
            user_identifier,
            current_expiry_date,
            new_expiry_date,
            key_id,
            duration_days_to_add,
            renewal_was_capped,
            CURRENT_TIMESTAMP
        );
        
        -- For renewals, we do NOT reset usage or create new usage_pro record
        -- User keeps their current usage and continues with extended subscription
        
        -- Return success with renewal information
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Subscription extended successfully',
            'is_renewal', true,
            'old_expiry_date', current_expiry_date,
            'new_expiry_date', new_expiry_date,
            'duration_added_days', duration_days_to_add,
            'was_capped', renewal_was_capped
        );
    ELSE
        -- =====================================================
        -- NEW ACTIVATION PATH
        -- =====================================================
        is_renewal := false;
        
        -- Activate the key
        UPDATE keys 
        SET 
            is_used = true,
            used_by = user_identifier,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = key_id
        RETURNING expiry_date INTO new_expiry_date;
        
        IF new_expiry_date IS NULL THEN
            RETURN jsonb_build_object(
                'success', false,
                'message', 'Failed to activate key'
            );
        END IF;
        
        -- Get current period - for pro users, period starts on activation date (not month start)
        current_period := CURRENT_DATE;
        
        -- Ensure pro usage record exists with 0 tokens and 0 OCR count (fresh start)
        INSERT INTO public.usage_pro (
            user_id,
            period_start,
            tokens_input_used,
            tokens_output_used,
            ocr_count,
            created_at,
            updated_at
        )
        VALUES (
            user_identifier,
            current_period,
            0,
            0,
            0,  -- Reset OCR count to 0
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        )
        ON CONFLICT (user_id, period_start) 
        DO UPDATE SET
            tokens_input_used = 0,
            tokens_output_used = 0,
            ocr_count = 0,  -- Reset OCR count to 0
            updated_at = CURRENT_TIMESTAMP;
        
        -- Delete any existing free usage record for current month
        DELETE FROM public.usage_free
        WHERE user_id = user_identifier
        AND period_start = date_trunc('month', CURRENT_DATE)::date;
        
        -- Return success with activation information
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Pro key activated successfully',
            'is_renewal', false,
            'expiry_date', new_expiry_date,
            'duration_days', duration_days_to_add
        );
    END IF;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.activate_pro_key(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.activate_pro_key(uuid, uuid) TO authenticated;

-- =====================================================
-- PART 4: Grant table permissions
-- =====================================================

-- Grant select to authenticated users (for their own renewals)
GRANT SELECT ON public.subscription_renewals TO authenticated;

-- Grant all to service_role (for admin operations)
GRANT ALL ON public.subscription_renewals TO service_role;

-- =====================================================
-- PART 5: Verification
-- =====================================================

-- Verify table was created successfully
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'subscription_renewals'
ORDER BY ordinal_position;

-- Verify function was updated successfully
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'activate_pro_key';

-- =====================================================
-- NOTES
-- =====================================================

/*
AUDIT TRAIL FEATURES:

1. Complete Renewal History:
   - Every renewal is logged with timestamp
   - Tracks old and new expiry dates
   - Records which key was used for renewal
   - Stores duration added and cap status

2. Query Examples:

   -- Get all renewals for a user
   SELECT * FROM subscription_renewals 
   WHERE user_id = 'user-uuid-here'
   ORDER BY renewed_at DESC;

   -- Get renewals in date range
   SELECT * FROM subscription_renewals 
   WHERE renewed_at BETWEEN '2025-01-01' AND '2025-12-31'
   ORDER BY renewed_at DESC;

   -- Count renewals per user
   SELECT user_id, COUNT(*) as renewal_count
   FROM subscription_renewals
   GROUP BY user_id
   ORDER BY renewal_count DESC;

   -- Find capped renewals
   SELECT * FROM subscription_renewals
   WHERE was_capped = true;

3. Analytics Use Cases:
   - Track renewal frequency
   - Identify users who renew frequently
   - Monitor cap enforcement
   - Support ticket resolution
   - Business intelligence

4. Support Use Cases:
   - Verify renewal history for users
   - Debug subscription issues
   - Audit subscription changes
   - Track key usage patterns
*/

