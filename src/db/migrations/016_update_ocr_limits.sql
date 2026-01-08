-- =====================================================
-- Migration 016: Update OCR Limits
-- =====================================================
-- This migration ONLY updates the OCR usage limits
-- Free: 2 → 5 PDFs per month
-- Pro: 20 → 40 PDFs per month
-- =====================================================

-- =====================================================
-- PART 1: Update check_ocr_limit function
-- =====================================================

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
    free_ocr_limit integer := 5;    -- Free: 5 PDFs per month (UPDATED from 2)
    pro_ocr_limit integer := 40;    -- Pro: 40 PDFs per month (UPDATED from 20)
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

-- =====================================================
-- PART 2: Update record_ocr_usage function
-- =====================================================

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
    free_ocr_limit integer := 5;    -- Free: 5 PDFs per month (UPDATED from 2)
    pro_ocr_limit integer := 40;    -- Pro: 40 PDFs per month (UPDATED from 20)
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
        
        -- ✅ AUTO-DOWNGRADE: If pro user reaches limit (40), downgrade to free tier
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

-- =====================================================
-- Verification
-- =====================================================

-- Verify functions were updated correctly
SELECT routine_name, routine_definition 
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('check_ocr_limit', 'record_ocr_usage')
LIMIT 1;
