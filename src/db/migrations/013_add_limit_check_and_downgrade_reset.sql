-- Migration: Add limit check function and reset free usage on downgrade
-- This migration:
-- 1. Creates check_usage_limit function to check limits BEFORE processing
-- 2. Updates record_usage to reset free usage to 0 when pro user downgrades
-- 3. Ensures proper downgrade handling

-- Create function to check usage limits BEFORE processing (for blocking chat/OCR)
CREATE OR REPLACE FUNCTION public.check_usage_limit(
    p_user_id uuid,
    p_input_tokens integer DEFAULT 0,
    p_output_tokens integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_period date;
    is_pro boolean;
    usage_record record;
    free_usage_record record;
    free_input_limit integer := 250000;   -- 0.25M tokens for Free
    free_output_limit integer := 500000;  -- 0.5M tokens for Free
    pro_input_limit integer := 1000000;   -- 1M tokens for Pro
    pro_output_limit integer := 3000000;  -- 3M tokens for Pro
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
    
    -- If user has active pro key, check if they've already exceeded pro limits
    -- If exceeded, treat them as free user immediately
    IF is_pro THEN
        -- Get current pro usage
        SELECT * FROM usage_pro 
        WHERE user_id = p_user_id 
        AND period_start = current_period 
        INTO usage_record;
        
        -- If pro usage record exists and limits are exceeded, treat as free user
        IF usage_record IS NOT NULL AND (
           (usage_record.tokens_input_used >= pro_input_limit) OR
           (usage_record.tokens_output_used >= pro_output_limit)
        ) THEN
            -- Pro user has already exceeded limit - treat as free user
            is_pro := false;
            
            -- CRITICAL: Do NOT reset free usage to 0 when checking limits
            -- Only ensure free usage record exists without resetting existing usage
            -- This preserves the actual free usage so limits can be checked correctly
            INSERT INTO public.usage_free (
                user_id,
                period_start,
                tokens_input_used,
                tokens_output_used,
                created_at,
                updated_at
            )
            VALUES (
                p_user_id,
                current_period,
                0,
                0,
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            )
            ON CONFLICT (user_id, period_start) DO NOTHING;
        END IF;
        -- NOTE: If pro user hasn't exceeded pro limits, we should ONLY check pro usage
        -- We should NOT check free usage - if they have an active pro key, they are pro
        -- Free usage table is only for free users or downgraded pro users
    END IF;
    
    -- Now check limits based on actual status (pro or free)
    IF is_pro THEN
        -- Get current pro usage (if not already fetched)
        IF usage_record IS NULL THEN
            SELECT * FROM usage_pro 
            WHERE user_id = p_user_id 
            AND period_start = current_period 
            INTO usage_record;
        END IF;
        
        -- If no record exists, usage is 0
        IF usage_record IS NULL THEN
            RETURN jsonb_build_object(
                'success', true,
                'is_pro', true,
                'can_proceed', true,
                'message', 'Usage within limits'
            );
        END IF;
        
        -- Check if would exceed limits (block if EITHER input OR output limit is exceeded)
        IF (usage_record.tokens_input_used + p_input_tokens > pro_input_limit) OR
           (usage_record.tokens_output_used + p_output_tokens > pro_output_limit) THEN
            -- Pro user exceeded limit - downgrade to free and reset free usage to 0
            -- Reset free usage to 0 for this user (fresh start as free user)
            INSERT INTO public.usage_free (
                user_id,
                period_start,
                tokens_input_used,
                tokens_output_used,
                created_at,
                updated_at
            )
            VALUES (
                p_user_id,
                current_period,
                0,
                0,
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            )
            ON CONFLICT (user_id, period_start) 
            DO UPDATE SET
                tokens_input_used = 0,
                tokens_output_used = 0,
                updated_at = CURRENT_TIMESTAMP;
            
            -- Return with is_pro = false (downgraded to free)
            RETURN jsonb_build_object(
                'success', false,
                'is_pro', false,  -- Downgraded to free
                'can_proceed', false,
                'downgraded', true,
                'message', CASE 
                    WHEN (usage_record.tokens_input_used + p_input_tokens > pro_input_limit) AND 
                         (usage_record.tokens_output_used + p_output_tokens > pro_output_limit) 
                    THEN 'Pro plan input and output token limits exceeded. Downgraded to free user.'
                    WHEN usage_record.tokens_input_used + p_input_tokens > pro_input_limit 
                    THEN 'Pro plan input token limit exceeded. Downgraded to free user.'
                    ELSE 'Pro plan output token limit exceeded. Downgraded to free user.'
                END,
                'usage', jsonb_build_object(
                    'tokens_input_used', 0,  -- Reset to 0 for free user
                    'tokens_output_used', 0,  -- Reset to 0 for free user
                    'period_start', current_period
                )
            );
        END IF;
        
        RETURN jsonb_build_object(
            'success', true,
            'is_pro', true,
            'can_proceed', true,
            'message', 'Usage within limits'
        );
    ELSE
        -- Free user - check free limits
        -- Get current free usage
        SELECT * FROM usage_free 
        WHERE user_id = p_user_id 
        AND period_start = current_period 
        INTO usage_record;
        
        -- Ensure free usage record exists
        IF usage_record IS NULL THEN
            INSERT INTO public.usage_free (
                user_id,
                period_start,
                tokens_input_used,
                tokens_output_used,
                created_at,
                updated_at
            )
            VALUES (
                p_user_id,
                current_period,
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
        
        -- First check if limit is already reached (even with 0 tokens)
        IF (usage_record.tokens_input_used >= free_input_limit) OR
           (usage_record.tokens_output_used >= free_output_limit) THEN
            -- Calculate next month's first day for renewal message
            next_month_date := (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month')::date;
            renewal_message := 'Your usage will reset on the 1st of next month (' || 
                              to_char(next_month_date, 'Month DD, YYYY') || '). Please upgrade to Pro to continue using the service.';
            
            RETURN jsonb_build_object(
                'success', false,
                'is_pro', false,
                'can_proceed', false,
                'message', CASE 
                    WHEN (usage_record.tokens_input_used >= free_input_limit) AND 
                         (usage_record.tokens_output_used >= free_output_limit) 
                    THEN 'Free plan input and output token limits reached. ' || renewal_message
                    WHEN usage_record.tokens_input_used >= free_input_limit 
                    THEN 'Free plan input token limit reached. ' || renewal_message
                    ELSE 'Free plan output token limit reached. ' || renewal_message
                END,
                'usage', jsonb_build_object(
                    'tokens_input_used', usage_record.tokens_input_used,
                    'tokens_output_used', usage_record.tokens_output_used,
                    'period_start', usage_record.period_start
                )
            );
        END IF;
        
        -- Check if would exceed limits (block if EITHER input OR output limit is exceeded or reached)
        IF (usage_record.tokens_input_used + p_input_tokens >= free_input_limit) OR
           (usage_record.tokens_output_used + p_output_tokens >= free_output_limit) THEN
            -- Calculate next month's first day for renewal message
            next_month_date := (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month')::date;
            renewal_message := 'Your usage will reset on the 1st of next month (' || 
                              to_char(next_month_date, 'Month DD, YYYY') || '). Please upgrade to Pro to continue using the service.';
            
            RETURN jsonb_build_object(
                'success', false,
                'is_pro', false,
                'can_proceed', false,
                'message', CASE 
                    WHEN (usage_record.tokens_input_used + p_input_tokens >= free_input_limit) AND 
                         (usage_record.tokens_output_used + p_output_tokens >= free_output_limit) 
                    THEN 'Free plan input and output token limits reached. ' || renewal_message
                    WHEN usage_record.tokens_input_used + p_input_tokens >= free_input_limit 
                    THEN 'Free plan input token limit reached. ' || renewal_message
                    ELSE 'Free plan output token limit reached. ' || renewal_message
                END,
                'usage', jsonb_build_object(
                    'tokens_input_used', usage_record.tokens_input_used,
                    'tokens_output_used', usage_record.tokens_output_used,
                    'period_start', usage_record.period_start
                )
            );
        END IF;
        
        RETURN jsonb_build_object(
            'success', true,
            'is_pro', false,
            'can_proceed', true,
            'message', 'Usage within limits'
        );
    END IF;
END;
$$;

-- Update record_usage to reset free usage to 0 when pro user downgrades
DROP FUNCTION IF EXISTS public.record_usage(uuid, integer, integer);

CREATE OR REPLACE FUNCTION public.record_usage(
    p_user_id uuid,
    p_input_tokens integer DEFAULT 0,
    p_output_tokens integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_period date;
    is_pro boolean;
    was_pro boolean;
    usage_record record;
    pro_usage_for_display record;
    display_usage record;
    free_input_limit integer := 250000;   -- 0.25M tokens for Free
    free_output_limit integer := 500000;  -- 0.5M tokens for Free
    pro_input_limit integer := 1000000;   -- 1M tokens for Pro
    pro_output_limit integer := 3000000;  -- 3M tokens for Pro
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
    
    -- Check if user was previously pro (has pro usage record)
    SELECT EXISTS (
        SELECT 1 FROM usage_pro 
        WHERE user_id = p_user_id 
        AND period_start = current_period
    ) INTO was_pro;
    
    -- If user downgraded from pro to free, reset free usage to 0
    -- But only if this is NOT a status check (0 tokens) - we don't want to reset on every status check
    -- Only reset when actual usage is being recorded OR when user first downgrades
    IF was_pro AND NOT is_pro AND (p_input_tokens > 0 OR p_output_tokens > 0) THEN
        -- Reset free usage record to 0 only when recording actual usage after downgrade
        INSERT INTO public.usage_free (
            user_id,
            period_start,
            tokens_input_used,
            tokens_output_used,
            created_at,
            updated_at
        )
        VALUES (
            p_user_id,
            current_period,
            0,
            0,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        )
        ON CONFLICT (user_id, period_start) 
        DO UPDATE SET
            tokens_input_used = 0,
            tokens_output_used = 0,
            updated_at = CURRENT_TIMESTAMP;
    END IF;
    
    -- If user has active pro key, check if they've already exceeded pro limits
    -- If exceeded, treat them as free user immediately
    IF is_pro THEN
        -- Get current pro usage
        SELECT * FROM usage_pro 
        WHERE user_id = p_user_id 
        AND period_start = current_period 
        INTO usage_record;
        
        -- If pro usage record exists and limits are exceeded, treat as free user
        IF usage_record IS NOT NULL AND (
           (usage_record.tokens_input_used >= pro_input_limit) OR
           (usage_record.tokens_output_used >= pro_output_limit)
        ) THEN
            -- Pro user has already exceeded limit - treat as free user
            is_pro := false;
            
            -- Clear the pro usage record variable so we fetch free record instead
            usage_record := NULL;
            
            -- Ensure free usage record exists
            -- Only reset to 0 if this is actual usage recording (not status check)
            -- For status checks, just ensure the record exists without resetting
            IF p_input_tokens > 0 OR p_output_tokens > 0 THEN
                -- Actual usage being recorded: reset free usage to 0 (fresh start as free user)
                INSERT INTO public.usage_free (
                    user_id,
                    period_start,
                    tokens_input_used,
                    tokens_output_used,
                    created_at,
                    updated_at
                )
                VALUES (
                    p_user_id,
                    current_period,
                    0,
                    0,
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP
                )
                ON CONFLICT (user_id, period_start) 
                DO UPDATE SET
                    tokens_input_used = 0,
                    tokens_output_used = 0,
                    updated_at = CURRENT_TIMESTAMP;
            ELSE
                -- Status check: just ensure free usage record exists without resetting
                INSERT INTO public.usage_free (
                    user_id,
                    period_start,
                    tokens_input_used,
                    tokens_output_used,
                    created_at,
                    updated_at
                )
                VALUES (
                    p_user_id,
                    current_period,
                    0,
                    0,
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP
                )
                ON CONFLICT (user_id, period_start) DO NOTHING;
            END IF;
        END IF;
    END IF;
    
    -- Now record usage based on actual status (pro or free)
    IF is_pro THEN
        -- Ensure pro usage record exists
        INSERT INTO public.usage_pro (
            user_id,
            period_start,
            tokens_input_used,
            tokens_output_used,
            created_at,
            updated_at
        )
        VALUES (
            p_user_id,
            current_period,
            0,
            0,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        )
        ON CONFLICT (user_id, period_start) DO NOTHING;
        
        -- Get current usage (if not already fetched)
        IF usage_record IS NULL THEN
            SELECT * FROM usage_pro 
            WHERE user_id = p_user_id 
            AND period_start = current_period 
            INTO usage_record;
        END IF;
        
        -- If still no record, create one
        IF usage_record IS NULL THEN
            INSERT INTO public.usage_pro (
                user_id,
                period_start,
                tokens_input_used,
                tokens_output_used,
                created_at,
                updated_at
            )
            VALUES (
                p_user_id,
                current_period,
                0,
                0,
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            )
            ON CONFLICT (user_id, period_start) DO NOTHING
            RETURNING * INTO usage_record;
            
            -- If still null after insert, fetch it
            IF usage_record IS NULL THEN
                SELECT * FROM usage_pro 
                WHERE user_id = p_user_id 
                AND period_start = current_period 
                INTO usage_record;
            END IF;
        END IF;
        
        -- Check if would exceed limits (block if EITHER input OR output limit is exceeded)
        IF usage_record IS NOT NULL AND (
           (usage_record.tokens_input_used + p_input_tokens > pro_input_limit) OR
           (usage_record.tokens_output_used + p_output_tokens > pro_output_limit)
        ) THEN
            -- Pro user exceeded limit - downgrade to free and reset free usage to 0
            -- Reset free usage to 0 for this user (fresh start as free user)
            INSERT INTO public.usage_free (
                user_id,
                period_start,
                tokens_input_used,
                tokens_output_used,
                created_at,
                updated_at
            )
            VALUES (
                p_user_id,
                current_period,
                0,
                0,
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            )
            ON CONFLICT (user_id, period_start) 
            DO UPDATE SET
                tokens_input_used = 0,
                tokens_output_used = 0,
                updated_at = CURRENT_TIMESTAMP;
            
            -- Return with is_pro = false (downgraded to free)
            RETURN jsonb_build_object(
                'success', false,
                'message', CASE 
                    WHEN (usage_record.tokens_input_used + p_input_tokens > pro_input_limit) AND 
                         (usage_record.tokens_output_used + p_output_tokens > pro_output_limit) 
                    THEN 'Pro plan input and output token limits exceeded. Downgraded to free user.'
                    WHEN usage_record.tokens_input_used + p_input_tokens > pro_input_limit 
                    THEN 'Pro plan input token limit exceeded. Downgraded to free user.'
                    ELSE 'Pro plan output token limit exceeded. Downgraded to free user.'
                END,
                'is_pro', false,  -- Downgraded to free
                'downgraded', true,
                'usage', jsonb_build_object(
                    'tokens_input_used', 0,  -- Reset to 0 for free user
                    'tokens_output_used', 0,  -- Reset to 0 for free user
                    'period_start', current_period
                )
            );
        END IF;
        
        -- Update usage (always record usage - we've already checked limits)
        UPDATE usage_pro SET
            tokens_input_used = tokens_input_used + GREATEST(p_input_tokens, 0),
            tokens_output_used = tokens_output_used + GREATEST(p_output_tokens, 0),
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = p_user_id 
        AND period_start = current_period;
        
        -- Fetch the updated record
        SELECT * FROM usage_pro 
        WHERE user_id = p_user_id 
        AND period_start = current_period 
        INTO usage_record;
    ELSE
        -- Free user (or downgraded pro user) - FIRST get current usage BEFORE any operations
        -- Get current free usage (always fetch fresh)
        SELECT * FROM usage_free 
        WHERE user_id = p_user_id 
        AND period_start = current_period 
        INTO usage_record;
        
        -- If no record exists, create one (but don't reset existing usage)
        IF usage_record IS NULL THEN
            INSERT INTO public.usage_free (
                user_id,
                period_start,
                tokens_input_used,
                tokens_output_used,
                created_at,
                updated_at
            )
            VALUES (
                p_user_id,
                current_period,
                0,
                0,
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            )
            ON CONFLICT (user_id, period_start) DO NOTHING
            RETURNING * INTO usage_record;
            
            -- If still null after insert, fetch it
            IF usage_record IS NULL THEN
                SELECT * FROM usage_free 
                WHERE user_id = p_user_id 
                AND period_start = current_period 
                INTO usage_record;
            END IF;
        END IF;
        
        -- CRITICAL: Check if limit is already reached BEFORE any updates
        -- This must happen FIRST to prevent resetting usage to 0
        IF usage_record IS NOT NULL AND (
           (usage_record.tokens_input_used >= free_input_limit) OR
           (usage_record.tokens_output_used >= free_output_limit)
        ) THEN
            -- Calculate next month's first day for renewal message
            next_month_date := (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month')::date;
            renewal_message := 'Your usage will reset on the 1st of next month (' || 
                              to_char(next_month_date, 'Month DD, YYYY') || '). Please upgrade to Pro to continue using the service.';
            
            RETURN jsonb_build_object(
                'success', false,
                'message', CASE 
                    WHEN (usage_record.tokens_input_used >= free_input_limit) AND 
                         (usage_record.tokens_output_used >= free_output_limit) 
                    THEN 'Free plan input and output token limits reached. ' || renewal_message
                    WHEN usage_record.tokens_input_used >= free_input_limit 
                    THEN 'Free plan input token limit reached. ' || renewal_message
                    ELSE 'Free plan output token limit reached. ' || renewal_message
                END,
                'is_pro', false,
                'usage', jsonb_build_object(
                    'tokens_input_used', usage_record.tokens_input_used,
                    'tokens_output_used', usage_record.tokens_output_used,
                    'period_start', usage_record.period_start
                )
            );
        END IF;
        
        -- Check if would exceed limits (block if EITHER input OR output limit is exceeded or reached)
        IF usage_record IS NOT NULL AND (
           (usage_record.tokens_input_used + p_input_tokens >= free_input_limit) OR
           (usage_record.tokens_output_used + p_output_tokens >= free_output_limit)
        ) THEN
            -- Calculate next month's first day for renewal message
            next_month_date := (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month')::date;
            renewal_message := 'Your usage will reset on the 1st of next month (' || 
                              to_char(next_month_date, 'Month DD, YYYY') || '). Please upgrade to Pro to continue using the service.';
            
            RETURN jsonb_build_object(
                'success', false,
                'message', CASE 
                    WHEN (usage_record.tokens_input_used + p_input_tokens >= free_input_limit) AND 
                         (usage_record.tokens_output_used + p_output_tokens >= free_output_limit) 
                    THEN 'Free plan input and output token limits reached. ' || renewal_message
                    WHEN usage_record.tokens_input_used + p_input_tokens >= free_input_limit 
                    THEN 'Free plan input token limit reached. ' || renewal_message
                    ELSE 'Free plan output token limit reached. ' || renewal_message
                END,
                'is_pro', false,
                'usage', jsonb_build_object(
                    'tokens_input_used', usage_record.tokens_input_used,
                    'tokens_output_used', usage_record.tokens_output_used,
                    'period_start', usage_record.period_start
                )
            );
        END IF;
        
        -- Update usage only if actual tokens are being recorded (not status check)
        -- For status checks (0 tokens), just return the current usage without updating
        IF p_input_tokens > 0 OR p_output_tokens > 0 THEN
            -- Actual usage being recorded: update the usage
            UPDATE usage_free SET
                tokens_input_used = tokens_input_used + GREATEST(p_input_tokens, 0),
                tokens_output_used = tokens_output_used + GREATEST(p_output_tokens, 0),
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = p_user_id 
            AND period_start = current_period
            RETURNING * INTO usage_record;
            
            -- If update didn't return a record, fetch it
            IF usage_record IS NULL THEN
                SELECT * FROM usage_free 
                WHERE user_id = p_user_id 
                AND period_start = current_period 
                INTO usage_record;
            END IF;
        ELSE
            -- Status check (0 tokens): just fetch current usage without updating
            -- usage_record is already fetched above, so we don't need to do anything
            -- But ensure we have the latest data
            SELECT * FROM usage_free 
            WHERE user_id = p_user_id 
            AND period_start = current_period 
            INTO usage_record;
        END IF;
    END IF;
    
    -- Return success with usage info
    -- Ensure we have a usage record before returning
    IF usage_record IS NULL THEN
        -- This shouldn't happen, but handle it gracefully
        IF is_pro THEN
            SELECT * FROM usage_pro 
            WHERE user_id = p_user_id 
            AND period_start = current_period 
            INTO usage_record;
        ELSE
            SELECT * FROM usage_free 
            WHERE user_id = p_user_id 
            AND period_start = current_period 
            INTO usage_record;
        END IF;
    END IF;
    
    -- Always return the current usage based on actual status (pro or free)
    -- If user is downgraded (is_pro = false), show free usage, not pro usage
    display_usage := usage_record;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Usage recorded successfully',
        'is_pro', is_pro,
        'usage', jsonb_build_object(
            'tokens_input_used', COALESCE(display_usage.tokens_input_used, 0),
            'tokens_output_used', COALESCE(display_usage.tokens_output_used, 0),
            'period_start', COALESCE(display_usage.period_start, current_period)
        )
    );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.check_usage_limit(uuid, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_usage(uuid, integer, integer) TO service_role;

