-- =====================================================
-- Migration 016: Add Subscription Renewal Support
-- =====================================================
-- This migration:
-- 1. Modifies activate_pro_key to support subscription renewals/extensions
-- 2. Allows users to extend active subscriptions by adding duration to current expiry
-- 3. Adds maximum expiry cap (12 months from today) to prevent unlimited stacking
-- 4. Maintains audit trail by marking renewal keys as used
-- 5. Returns renewal information in response
-- =====================================================

-- =====================================================
-- PART 1: Update activate_pro_key to support renewals
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
    existing_key_record record;              -- Stores existing active subscription key (if any)
    new_key_record record;
    current_expiry_date timestamp with time zone;  -- Current subscription expiry (for renewals)
    new_expiry_date timestamp with time zone;       -- Calculated new expiry after renewal
    max_allowed_expiry timestamp with time zone;   -- Maximum allowed expiry (12 months cap)
    duration_days_to_add integer;                   -- Duration from the new key being activated
    is_renewal boolean := false;                    -- Flag: true if renewal, false if new activation
    max_future_expiry_months integer := 12;  -- Maximum 12 months from today (safety cap)
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
    
    -- =====================================================
    -- STEP 1: Get the new key's duration
    -- =====================================================
    -- This tells us how many days to add if this is a renewal
    SELECT duration_days INTO duration_days_to_add
    FROM keys
    WHERE id = key_id;
    
    IF duration_days_to_add IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Key duration not found'
        );
    END IF;
    
    -- =====================================================
    -- STEP 2: Check if user has an active subscription
    -- =====================================================
    -- This determines if this is a renewal (has active subscription)
    -- or new activation (no active subscription)
    -- We get the key with the latest expiry_date in case user has multiple keys
    SELECT 
        id,
        expiry_date
    INTO existing_key_record
    FROM keys
    WHERE used_by = user_identifier
    AND is_used = true
    AND expiry_date > CURRENT_TIMESTAMP  -- Only active (not expired) subscriptions
    ORDER BY expiry_date DESC            -- Get the latest expiry (in case of multiple)
    LIMIT 1;
    
    -- =====================================================
    -- STEP 3: Handle Renewal (user has active subscription)
    -- =====================================================
    IF existing_key_record IS NOT NULL THEN
        -- This is a renewal - user has active subscription
        is_renewal := true;
        current_expiry_date := existing_key_record.expiry_date;
        
        -- =====================================================
        -- STEP 3a: Calculate new expiry date
        -- =====================================================
        -- Add the new key's duration to the current expiry
        -- Example: If current expiry is Jan 15 and new key adds 30 days,
        --          new expiry will be Feb 14
        new_expiry_date := current_expiry_date + (duration_days_to_add || ' days')::interval;
        
        -- =====================================================
        -- STEP 3b: Apply maximum expiry cap (safety guardrail)
        -- =====================================================
        -- Prevents users from stacking subscriptions indefinitely
        -- Maximum allowed: 12 months from today
        max_allowed_expiry := CURRENT_TIMESTAMP + (max_future_expiry_months || ' months')::interval;
        
        -- If calculated expiry exceeds cap, cap it at maximum
        -- Example: User has 11 months left, tries to add 30 days
        --          Result: Capped at 12 months from today (not 11 months + 30 days)
        IF new_expiry_date > max_allowed_expiry THEN
            new_expiry_date := max_allowed_expiry;
            -- Log warning for visibility (appears in Supabase logs)
            RAISE NOTICE 'Subscription renewal capped at maximum: user_id=%, old_expiry=%, calculated_expiry=%, capped_expiry=%',
                user_identifier, current_expiry_date, 
                current_expiry_date + (duration_days_to_add || ' days')::interval,
                new_expiry_date;
        END IF;
        
        -- =====================================================
        -- STEP 3c: Update existing key's expiry_date
        -- =====================================================
        -- IMPORTANT: We update the EXISTING key's expiry_date,
        --            not create a new record. This maintains one active
        --            subscription per user and preserves subscription history.
        UPDATE keys
        SET 
            expiry_date = new_expiry_date,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = existing_key_record.id  -- Update the existing active key
        RETURNING 1 INTO affected_rows;
        
        IF affected_rows = 0 THEN
            RETURN jsonb_build_object(
                'success', false,
                'message', 'Failed to extend subscription'
            );
        END IF;
        
        -- =====================================================
        -- STEP 3d: Mark renewal key as used (audit trail)
        -- =====================================================
        -- The new key is marked as used so we can track which key
        -- was used for renewal. This provides audit trail for support.
        UPDATE keys
        SET 
            is_used = true,
            used_by = user_identifier,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = key_id  -- The renewal key being activated
        RETURNING 1 INTO affected_rows;
        
        IF affected_rows = 0 THEN
            RETURN jsonb_build_object(
                'success', false,
                'message', 'Failed to mark renewal key as used'
            );
        END IF;
        
        -- =====================================================
        -- STEP 3e: Preserve usage (do NOT reset)
        -- =====================================================
        -- For renewals, we do NOT reset usage or create new usage_pro record.
        -- User keeps their current usage and continues with extended subscription.
        -- Only new activations reset usage to 0.
        
        -- =====================================================
        -- STEP 3f: Return renewal information
        -- =====================================================
        -- Return detailed information about the renewal for frontend display
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Subscription extended successfully',
            'is_renewal', true,                              -- Flag for frontend
            'old_expiry_date', current_expiry_date,          -- Original expiry
            'new_expiry_date', new_expiry_date,              -- Extended expiry
            'duration_added_days', duration_days_to_add,     -- Days added
            'was_capped', new_expiry_date = max_allowed_expiry  -- Whether capped
        );
    ELSE
        -- =====================================================
        -- STEP 4: Handle New Activation (no active subscription)
        -- =====================================================
        -- User has no active subscription - this is a new activation
        -- Behavior is the same as before (backward compatible)
        is_renewal := false;
        
        -- =====================================================
        -- STEP 4a: Activate the key
        -- =====================================================
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
        
        -- =====================================================
        -- STEP 4b: Create usage_pro record (fresh start)
        -- =====================================================
        -- For new activations, we create a new usage_pro record
        -- with all counters reset to 0. Period starts on activation date.
        current_period := CURRENT_DATE;
        
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
            0,  -- Reset to 0 for new activation
            0,  -- Reset to 0 for new activation
            0,  -- Reset OCR count to 0
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        )
        ON CONFLICT (user_id, period_start) 
        DO UPDATE SET
            tokens_input_used = 0,
            tokens_output_used = 0,
            ocr_count = 0,
            updated_at = CURRENT_TIMESTAMP;
        
        -- =====================================================
        -- STEP 4c: Clear free usage (upgrade from free to pro)
        -- =====================================================
        -- Delete any existing free usage record for current month
        -- User is upgrading from free to pro, so free usage is cleared
        DELETE FROM public.usage_free
        WHERE user_id = user_identifier
        AND period_start = date_trunc('month', CURRENT_DATE)::date;
        
        -- =====================================================
        -- STEP 4d: Return activation information
        -- =====================================================
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Pro key activated successfully',
            'is_renewal', false,                    -- Flag for frontend
            'expiry_date', new_expiry_date,          -- Key's expiry date
            'duration_days', duration_days_to_add   -- Key's duration
        );
    END IF;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.activate_pro_key(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.activate_pro_key(uuid, uuid) TO authenticated;

-- =====================================================
-- PART 2: Verification & Testing
-- =====================================================

-- Verify function was created successfully
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
HOW RENEWAL WORKS:

1. User has active subscription (key with expiry_date > CURRENT_TIMESTAMP)
2. User activates a new key
3. Function detects existing active subscription
4. Calculates: new_expiry = current_expiry + new_key_duration_days
5. Applies maximum cap: max(new_expiry, CURRENT_DATE + 12 months)
6. Updates existing key's expiry_date (extends subscription)
7. Marks new key as used (for audit trail)
8. Does NOT reset usage (user keeps current usage)
9. Returns renewal information

HOW NEW ACTIVATION WORKS:

1. User has no active subscription
2. User activates a key
3. Function activates key normally
4. Creates usage_pro record with 0 usage
5. Resets all counters
6. Returns activation information

MAXIMUM EXPIRY CAP:

- Prevents users from stacking subscriptions indefinitely
- Maximum: 12 months from today (configurable via max_future_expiry_months)
- If renewal would exceed cap, it's capped at maximum
- Warning logged when capping occurs

TESTING:

1. Test new activation (no existing subscription):
   SELECT public.activate_pro_key('key-uuid', 'user-uuid');

2. Test renewal (existing active subscription):
   SELECT public.activate_pro_key('new-key-uuid', 'user-with-active-sub-uuid');

3. Test renewal with cap (would exceed 12 months):
   - User has 11 months remaining
   - Adds 30 days
   - Should cap at 12 months from today

4. Test multiple renewals:
   - User renews multiple times
   - Each renewal extends from latest expiry
   - Cap applies to final expiry
*/

