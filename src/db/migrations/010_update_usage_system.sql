-- Migration: Update usage system to use keys table only and update limits
-- This migration:
-- 1. Updates usage limits (Free: 0.25M input, 0.5M output; Pro: 1M input, 3M output)
-- 2. Creates activate_pro_key function to activate keys and create usage_pro row
-- 3. Updates record_usage function to use correct limits and handle expiry
-- 4. Ensures all free users have usage_free rows

-- Drop old record_usage function with p_pages parameter to avoid function overloading conflicts
DROP FUNCTION IF EXISTS public.record_usage(uuid, integer, integer, integer);

-- Create new record_usage function with correct limits (tokens only, no pages)
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
    usage_record record;
    free_input_limit integer := 250000;   -- 0.25M tokens for Free
    free_output_limit integer := 500000;  -- 0.5M tokens for Free
    pro_input_limit integer := 1000000;   -- 1M tokens for Pro
    pro_output_limit integer := 3000000;  -- 3M tokens for Pro
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
        
        -- Get current usage
        SELECT * FROM usage_pro 
        WHERE user_id = p_user_id 
        AND period_start = current_period 
        INTO usage_record;
        
        -- Check if would exceed limits
        IF (usage_record.tokens_input_used + p_input_tokens > pro_input_limit) OR
           (usage_record.tokens_output_used + p_output_tokens > pro_output_limit) THEN
            RETURN jsonb_build_object(
                'success', false,
                'message', 'Pro plan usage limit exceeded',
                'is_pro', true,
                'usage', jsonb_build_object(
                    'tokens_input_used', usage_record.tokens_input_used,
                    'tokens_output_used', usage_record.tokens_output_used,
                    'period_start', usage_record.period_start
                )
            );
        END IF;
        
        -- Update usage
        UPDATE usage_pro SET
            tokens_input_used = tokens_input_used + GREATEST(p_input_tokens, 0),
            tokens_output_used = tokens_output_used + GREATEST(p_output_tokens, 0),
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = p_user_id 
        AND period_start = current_period
        RETURNING * INTO usage_record;
    ELSE
        -- Ensure free usage record exists
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
        
        -- Get current usage
        SELECT * FROM usage_free 
        WHERE user_id = p_user_id 
        AND period_start = current_period 
        INTO usage_record;
        
        -- Check if would exceed limits
        IF (usage_record.tokens_input_used + p_input_tokens > free_input_limit) OR
           (usage_record.tokens_output_used + p_output_tokens > free_output_limit) THEN
            RETURN jsonb_build_object(
                'success', false,
                'message', 'Free plan usage limit exceeded',
                'is_pro', false,
                'usage', jsonb_build_object(
                    'tokens_input_used', usage_record.tokens_input_used,
                    'tokens_output_used', usage_record.tokens_output_used,
                    'period_start', usage_record.period_start
                )
            );
        END IF;
        
        -- Update usage
        UPDATE usage_free SET
            tokens_input_used = tokens_input_used + GREATEST(p_input_tokens, 0),
            tokens_output_used = tokens_output_used + GREATEST(p_output_tokens, 0),
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = p_user_id 
        AND period_start = current_period
        RETURNING * INTO usage_record;
    END IF;
    
    -- Return success with usage info
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Usage recorded successfully',
        'is_pro', is_pro,
        'usage', jsonb_build_object(
            'tokens_input_used', usage_record.tokens_input_used,
            'tokens_output_used', usage_record.tokens_output_used,
            'period_start', usage_record.period_start
        )
    );
END;
$$;

-- Drop old activate_pro_key function to avoid function overloading conflicts
DROP FUNCTION IF EXISTS public.activate_pro_key(uuid, uuid, timestamp with time zone);
DROP FUNCTION IF EXISTS public.activate_pro_key(timestamp with time zone, uuid, uuid);
DROP FUNCTION IF EXISTS public.activate_pro_key(uuid, uuid);

-- Create function to activate pro key and create usage_pro row
-- Simplified: doesn't need key_expiry parameter since it can get it from the keys table
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
    
    -- Get current period
    current_period := date_trunc('month', CURRENT_DATE)::date;
    
    -- Ensure pro usage record exists for this user
    -- If record exists (user was previously pro this month), reset usage to 0
    -- This gives users a fresh start when they reactivate pro
    INSERT INTO public.usage_pro (
        user_id,
        period_start,
        tokens_input_used,
        tokens_output_used,
        created_at,
        updated_at
    )
    VALUES (
        user_identifier,
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
    
    -- CRITICAL: Clear free usage when user activates pro key
    -- This ensures that if user was previously free and had usage in free table,
    -- they get a fresh start as a pro user
    -- Delete any existing free usage record for this period
    DELETE FROM public.usage_free
    WHERE user_id = user_identifier
    AND period_start = current_period;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Pro key activated successfully'
    );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.record_usage(uuid, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.activate_pro_key(uuid, uuid) TO service_role;

-- Ensure all existing users have free usage records
INSERT INTO usage_free (user_id, period_start, tokens_input_used, tokens_output_used, created_at, updated_at)
SELECT 
    u.id,
    date_trunc('month', CURRENT_DATE)::date,
    0,
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM usage_free 
    WHERE user_id = u.id 
    AND period_start = date_trunc('month', CURRENT_DATE)::date
)
ON CONFLICT (user_id, period_start) DO NOTHING;
