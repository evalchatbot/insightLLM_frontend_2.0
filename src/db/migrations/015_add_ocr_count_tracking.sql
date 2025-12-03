-- =====================================================
-- Migration 015: Add OCR Count-Based Tracking
-- =====================================================
-- This migration:
-- 1. Adds ocr_count column to usage_free and usage_pro tables
-- 2. Creates check_ocr_limit function (pre-check before PDF generation)
-- 3. Creates record_ocr_usage function (increment count after PDF generation)
-- 4. Uses easily changeable limits: Free=5, Pro=20
-- 5. Updates monthly reset to include OCR count reset
-- =====================================================

-- =====================================================
-- PART 1: Add ocr_count column to existing tables
-- =====================================================

-- Add ocr_count to usage_free table
ALTER TABLE public.usage_free 
ADD COLUMN IF NOT EXISTS ocr_count INTEGER DEFAULT 0 NOT NULL;

-- Add ocr_count to usage_pro table  
ALTER TABLE public.usage_pro
ADD COLUMN IF NOT EXISTS ocr_count INTEGER DEFAULT 0 NOT NULL;

-- Update existing rows to have 0 OCR count
UPDATE public.usage_free SET ocr_count = 0 WHERE ocr_count IS NULL;
UPDATE public.usage_pro SET ocr_count = 0 WHERE ocr_count IS NULL;

-- =====================================================
-- PART 2: Create check_ocr_limit function
-- =====================================================

-- This function checks if user can generate one more PDF
CREATE OR REPLACE FUNCTION public.check_ocr_limit(
    p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_period date;
    is_pro boolean;
    usage_record record;
    free_ocr_limit integer := 2;    -- Free: 2 PDFs per month (EASILY CHANGEABLE)
    pro_ocr_limit integer := 20;    -- Pro: 20 PDFs per month (EASILY CHANGEABLE)
    next_month_date date;
    renewal_message text;
BEGIN
    -- Get current period (monthly reset)
    current_period := date_trunc('month', CURRENT_DATE)::date;
    
    -- Check if user has an active pro key (not expired)
    SELECT EXISTS (
        SELECT 1 FROM keys 
        WHERE used_by = p_user_id 
        AND is_used = true 
        AND expiry_date > CURRENT_TIMESTAMP
    ) INTO is_pro;
    
    IF is_pro THEN
        -- Pro user - check pro OCR limit
        -- For pro users, period starts on activation date and lasts 30 days
        SELECT * FROM usage_pro 
        WHERE user_id = p_user_id 
        AND CURRENT_DATE - period_start < 30
        ORDER BY period_start DESC
        LIMIT 1
        INTO usage_record;
        
        -- If no record exists, usage is 0 - allow
        IF usage_record IS NULL THEN
            RETURN jsonb_build_object(
                'success', true,
                'is_pro', true,
                'can_proceed', true,
                'message', 'OCR usage within limits',
                'ocr_count', 0,
                'ocr_limit', pro_ocr_limit
            );
        END IF;
        
        -- Check if would exceed limit
        IF usage_record.ocr_count >= pro_ocr_limit THEN
            RETURN jsonb_build_object(
                'success', false,
                'is_pro', true,
                'can_proceed', false,
                'message', 'Pro OCR limit reached (' || usage_record.ocr_count || '/' || pro_ocr_limit || ' PDFs used). Contact support to increase limit.',
                'ocr_count', usage_record.ocr_count,
                'ocr_limit', pro_ocr_limit
            );
        END IF;
        
        -- Within limits - allow
        RETURN jsonb_build_object(
            'success', true,
            'is_pro', true,
            'can_proceed', true,
            'message', 'OCR usage within limits',
            'ocr_count', usage_record.ocr_count,
            'ocr_limit', pro_ocr_limit
        );
    ELSE
        -- Free user - check free OCR limit
        SELECT * FROM usage_free 
        WHERE user_id = p_user_id 
        AND period_start = current_period 
        INTO usage_record;
        
        -- Ensure free usage record exists for current month
        IF usage_record IS NULL THEN
            INSERT INTO public.usage_free (
                user_id,
                period_start,
                tokens_input_used,
                tokens_output_used,
                ocr_count,
                created_at,
                updated_at
            )
            VALUES (
                p_user_id,
                current_period,
                0,
                0,
                0,
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            )
            ON CONFLICT (user_id, period_start) DO NOTHING;
            
            -- Get the newly created record
            SELECT * FROM usage_free 
            WHERE user_id = p_user_id 
            AND period_start = current_period 
            INTO usage_record;
        END IF;
        
        -- Check if already at or over limit
        IF usage_record.ocr_count >= free_ocr_limit THEN
            -- Calculate next month's first day for renewal message
            next_month_date := (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month')::date;
            renewal_message := 'Your OCR usage will reset on the 1st of next month (' || 
                              to_char(next_month_date, 'Month DD, YYYY') || '). Upgrade to Pro for more PDFs.';
            
            RETURN jsonb_build_object(
                'success', false,
                'is_pro', false,
                'can_proceed', false,
                'message', 'Free OCR limit reached (' || usage_record.ocr_count || '/' || free_ocr_limit || ' PDFs used). ' || renewal_message,
                'ocr_count', usage_record.ocr_count,
                'ocr_limit', free_ocr_limit
            );
        END IF;
        
        -- Within limits - allow
        RETURN jsonb_build_object(
            'success', true,
            'is_pro', false,
            'can_proceed', true,
            'message', 'OCR usage within limits',
            'ocr_count', usage_record.ocr_count,
            'ocr_limit', free_ocr_limit
        );
    END IF;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.check_ocr_limit(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.check_ocr_limit(uuid) TO authenticated;

-- =====================================================
-- PART 3: Create record_ocr_usage function
-- =====================================================

-- This function increments OCR count by 1 after successful PDF generation
CREATE OR REPLACE FUNCTION public.record_ocr_usage(
    p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_period date;
    is_pro boolean;
    usage_record record;
    free_ocr_limit integer := 2;    -- Free: 2 PDFs per month (EASILY CHANGEABLE)
    pro_ocr_limit integer := 20;    -- Pro: 20 PDFs per month (EASILY CHANGEABLE)
    pro_key_id uuid;
BEGIN
    -- Get current period (monthly reset)
    current_period := date_trunc('month', CURRENT_DATE)::date;
    
    -- Check if user has an active pro key (not expired)
    SELECT EXISTS (
        SELECT 1 FROM keys 
        WHERE used_by = p_user_id 
        AND is_used = true 
        AND expiry_date > CURRENT_TIMESTAMP
    ) INTO is_pro;
    
    IF is_pro THEN
        -- Pro user - increment pro OCR count
        -- For pro users, period starts on activation date and lasts 30 days
        -- Find the most recent period_start that's within 30 days from today
        SELECT * FROM usage_pro 
        WHERE user_id = p_user_id 
        AND CURRENT_DATE - period_start < 30
        ORDER BY period_start DESC
        LIMIT 1
        INTO usage_record;
        
        -- If no record exists, this shouldn't happen (should be created on key activation)
        -- But create one just in case
        IF usage_record IS NULL THEN
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
                p_user_id,
                CURRENT_DATE,
                0,
                0,
                1,  -- Increment to 1
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            )
            ON CONFLICT (user_id, period_start) 
            DO UPDATE SET
                ocr_count = usage_pro.ocr_count + 1,
                updated_at = CURRENT_TIMESTAMP
            RETURNING * INTO usage_record;
        ELSE
            -- Increment OCR count
            UPDATE usage_pro 
            SET 
                ocr_count = ocr_count + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = p_user_id 
            AND period_start = usage_record.period_start
            RETURNING * INTO usage_record;
        END IF;
        
        -- ✅ AUTO-DOWNGRADE: If pro user reaches limit (20), downgrade to free tier
        IF usage_record.ocr_count >= pro_ocr_limit THEN
            -- Get the pro key ID to deactivate it
            SELECT id INTO pro_key_id
            FROM keys 
            WHERE used_by = p_user_id 
            AND is_used = true 
            AND expiry_date > CURRENT_TIMESTAMP
            LIMIT 1;
            
            -- Step 1: Deactivate the pro key (set expiry to now)
            IF pro_key_id IS NOT NULL THEN
                UPDATE keys
                SET expiry_date = CURRENT_TIMESTAMP
                WHERE id = pro_key_id;
            END IF;
            
            -- Step 2: Remove user from usage_pro table (they're now free tier)
            DELETE FROM usage_pro
            WHERE user_id = p_user_id;
            
            -- Return with downgraded flag
            RETURN jsonb_build_object(
                'success', true,
                'message', 'OCR limit reached. Your Pro subscription has ended. You are now on the Free tier.',
                'is_pro', false,
                'was_pro', true,
                'downgraded', true,
                'ocr_count', usage_record.ocr_count,
                'ocr_limit', pro_ocr_limit
            );
        END IF;
        
        RETURN jsonb_build_object(
            'success', true,
            'message', 'OCR usage recorded successfully',
            'is_pro', true,
            'ocr_count', usage_record.ocr_count,
            'ocr_limit', pro_ocr_limit
        );
    ELSE
        -- Free user - increment free OCR count
        SELECT * FROM usage_free 
        WHERE user_id = p_user_id 
        AND period_start = current_period 
        INTO usage_record;
        
        -- If no record exists, create one
        IF usage_record IS NULL THEN
            INSERT INTO public.usage_free (
                user_id,
                period_start,
                tokens_input_used,
                tokens_output_used,
                ocr_count,
                created_at,
                updated_at
            )
            VALUES (
                p_user_id,
                current_period,
                0,
                0,
                1,  -- Increment to 1
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            )
            ON CONFLICT (user_id, period_start) 
            DO UPDATE SET
                ocr_count = usage_free.ocr_count + 1,
                updated_at = CURRENT_TIMESTAMP
            RETURNING * INTO usage_record;
        ELSE
            -- Increment OCR count
            UPDATE usage_free 
            SET 
                ocr_count = ocr_count + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = p_user_id 
            AND period_start = current_period
            RETURNING * INTO usage_record;
        END IF;
        
        RETURN jsonb_build_object(
            'success', true,
            'message', 'OCR usage recorded successfully',
            'is_pro', false,
            'ocr_count', usage_record.ocr_count,
            'ocr_limit', free_ocr_limit
        );
    END IF;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.record_ocr_usage(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_ocr_usage(uuid) TO authenticated;

-- =====================================================
-- PART 4: Update monthly reset to include OCR count
-- =====================================================

-- Update the reset_monthly_free_usage function to also reset OCR count
CREATE OR REPLACE FUNCTION public.reset_monthly_free_usage()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_month_start date;
    updated_count integer := 0;
    deleted_count integer := 0;
BEGIN
    -- Get the first day of current month
    current_month_start := date_trunc('month', CURRENT_DATE)::date;
    
    RAISE NOTICE 'Starting monthly reset for %', current_month_start;
    
    -- Step 1: Delete all old month records (keep database clean)
    DELETE FROM public.usage_free
    WHERE period_start < current_month_start;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % old usage records', deleted_count;
    
    -- Step 2: Update all free users' records to new month with 0 usage (including OCR count)
    WITH free_users AS (
        SELECT DISTINCT u.id as user_id
        FROM auth.users u
        WHERE NOT EXISTS (
            -- Exclude users who currently have active pro keys
            SELECT 1 FROM public.keys
            WHERE used_by = u.id
            AND is_used = true
            AND expiry_date > CURRENT_TIMESTAMP
        )
    )
    INSERT INTO public.usage_free (
        user_id,
        period_start,
        tokens_input_used,
        tokens_output_used,
        ocr_count,
        created_at,
        updated_at
    )
    SELECT 
        user_id,
        current_month_start,
        0,
        0,
        0,  -- Reset OCR count to 0
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    FROM free_users
    ON CONFLICT (user_id, period_start) 
    DO UPDATE SET
        tokens_input_used = 0,
        tokens_output_used = 0,
        ocr_count = 0,  -- Reset OCR count to 0
        period_start = current_month_start,
        updated_at = CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    RAISE NOTICE 'Monthly reset completed: % users updated to %', updated_count, current_month_start;
END;
$$;

-- =====================================================
-- PART 5: Update activate_pro_key to reset OCR count
-- =====================================================

-- Update activate_pro_key to also reset OCR count when activating
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
    
    -- Activate the key
    UPDATE keys 
    SET 
        is_used = true,
        used_by = user_identifier
    WHERE id = key_id
    RETURNING 1 INTO affected_rows;
    
    IF affected_rows = 0 THEN
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
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Pro key activated successfully'
    );
END;
$$;

-- =====================================================
-- PART 6: Verification & Testing
-- =====================================================

-- Check that columns were added
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN ('usage_free', 'usage_pro')
AND column_name = 'ocr_count';

-- Test check_ocr_limit function (use a real user_id from your database)
/*
SELECT public.check_ocr_limit('YOUR_USER_ID_HERE'::uuid);
*/

-- Test record_ocr_usage function (use a real user_id from your database)
/*
SELECT public.record_ocr_usage('YOUR_USER_ID_HERE'::uuid);
*/

-- View usage with OCR counts
SELECT 
    user_id,
    period_start,
    tokens_input_used,
    tokens_output_used,
    ocr_count,
    created_at,
    updated_at
FROM public.usage_free
ORDER BY period_start DESC, user_id
LIMIT 10;

-- =====================================================
-- NOTES
-- =====================================================

/*
HOW TO CHANGE LIMITS:

1. Free OCR Limit: Change line 26 and line 191
   free_ocr_limit integer := 5;    -- Change 5 to your desired limit

2. Pro OCR Limit: Change line 27 and line 192
   pro_ocr_limit integer := 20;    -- Change 20 to your desired limit

3. After changing, re-run the migration to update the functions

USAGE:

1. Before PDF generation:
   - Call check_ocr_limit(user_id)
   - If can_proceed = false, block the request

2. After successful PDF generation:
   - Call record_ocr_usage(user_id)
   - This increments the counter by 1

3. Monthly reset:
   - Automatic via pg_cron (from migration 014)
   - OCR count resets to 0 on 1st of each month
*/
