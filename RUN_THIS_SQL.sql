-- =====================================================
-- COMPLETE SQL MIGRATION - Run this in Supabase SQL Editor
-- =====================================================
-- This migration includes all fixes:
-- 1. check_usage_limit function (blocks free users when limit reached)
-- 2. record_usage function (properly records usage and handles downgrades)
-- 3. activate_pro_key function (clears free usage when pro key is activated)
-- 4. Monthly reset: Free usage automatically resets to 0 on the 1st of every month
--    (period_start changes to new month, creating new record with 0 usage)
-- =====================================================

-- =====================================================
-- PART 1: Update activate_pro_key to clear free usage
-- =====================================================
DROP FUNCTION IF EXISTS public.activate_pro_key(uuid, uuid);

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
    -- This allows 30-day periods from activation date
    current_period := CURRENT_DATE;
    
    -- Ensure pro usage record exists for this user with activation date as period_start
    -- If record exists (user was previously pro), reset usage to 0
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
-- PART 2: Create check_usage_limit function
-- =====================================================
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
    -- Also check if key has expired - if expired, treat as free user
    SELECT EXISTS (
        SELECT 1 FROM keys 
        WHERE used_by = p_user_id 
        AND is_used = true 
        AND expiry_date > CURRENT_TIMESTAMP
    ) INTO is_pro;
    
    -- If user has a key but it's expired, treat as free user
    -- Also delete the expired pro usage row if it exists
    -- CRITICAL: Only touch pro rows if user actually has an expired key
    -- Pure free users (never had pro) should NEVER touch pro rows
    IF NOT is_pro THEN
        -- Check if user has an expired key (only delete pro row if they had a pro key before)
        IF EXISTS (
            SELECT 1 FROM keys 
            WHERE used_by = p_user_id 
            AND is_used = true 
            AND expiry_date <= CURRENT_TIMESTAMP
        ) THEN
            -- User has expired pro key - delete the pro usage row
            DELETE FROM public.usage_pro
            WHERE user_id = p_user_id
            AND period_start = current_period;
            
            -- CRITICAL: Delete expired keys for this user
            -- Delete all expired keys associated with this user
            DELETE FROM keys
            WHERE used_by = p_user_id
            AND expiry_date <= CURRENT_TIMESTAMP;
            
            -- CRITICAL: Reset free usage to 0 only if it doesn't exist (first time downgrading)
            IF NOT EXISTS (
                SELECT 1 FROM usage_free
                WHERE user_id = p_user_id
                AND period_start = current_period
            ) THEN
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
        -- CRITICAL: If user is a pure free user (never had pro), we don't touch pro rows at all
        -- Free users should only work with usage_free table
    END IF;
    
    -- If user has active pro key, find their current pro period (within last 30 days)
    -- For pro users, period starts on activation date and lasts 30 days
    IF is_pro THEN
        -- Find the most recent period_start that's within 30 days from today
        SELECT * FROM usage_pro 
        WHERE user_id = p_user_id 
        AND CURRENT_DATE - period_start < 30
        ORDER BY period_start DESC
        LIMIT 1
        INTO usage_record;
        
        -- If pro usage record exists and limits are exceeded, treat as free user
        IF usage_record IS NOT NULL AND (
           (usage_record.tokens_input_used >= pro_input_limit) OR
           (usage_record.tokens_output_used >= pro_output_limit)
        ) THEN
            -- Pro user has already exceeded limit - treat as free user
            is_pro := false;
            
            -- CRITICAL: Delete the pro usage row that exceeded limit (don't reset to 0)
            DELETE FROM public.usage_pro
            WHERE user_id = p_user_id
            AND period_start = usage_record.period_start;
            
            -- CRITICAL: Delete keys for this user (downgrade to free)
            -- Delete all keys associated with this user
            DELETE FROM keys
            WHERE used_by = p_user_id;
            
            -- CRITICAL: Reset free usage to 0 only if it doesn't exist (first time downgrading)
            -- This ensures a fresh start as a free user, but only once
            IF NOT EXISTS (
                SELECT 1 FROM usage_free
                WHERE user_id = p_user_id
                AND period_start = current_period
            ) THEN
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
        -- NOTE: If pro user hasn't exceeded pro limits, we should ONLY check pro usage
        -- We should NOT check free usage - if they have an active pro key, they are pro
        -- Free usage table is only for free users or downgraded pro users
    END IF;
    
    -- Now check limits based on actual status (pro or free)
    IF is_pro THEN
        -- Get current pro usage (if not already fetched)
        -- Find the most recent period_start that's within 30 days from today
        IF usage_record IS NULL THEN
            SELECT * FROM usage_pro 
            WHERE user_id = p_user_id 
            AND CURRENT_DATE - period_start < 30
            ORDER BY period_start DESC
            LIMIT 1
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
            -- Pro user exceeded limit - downgrade to free
            -- CRITICAL: Delete the pro usage row that exceeded limit (don't reset to 0)
            DELETE FROM public.usage_pro
            WHERE user_id = p_user_id
            AND period_start = current_period;
            
            -- CRITICAL: Delete keys for this user (downgrade to free)
            -- Delete all keys associated with this user
            DELETE FROM keys
            WHERE used_by = p_user_id;
            
            -- CRITICAL: Reset free usage to 0 only if it doesn't exist (first time downgrading)
            -- This ensures a fresh start as a free user, but only once
            IF NOT EXISTS (
                SELECT 1 FROM usage_free
                WHERE user_id = p_user_id
                AND period_start = current_period
            ) THEN
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
            
            -- Fetch the free usage record to return correct values
            SELECT * FROM usage_free 
            WHERE user_id = p_user_id 
            AND period_start = current_period 
            INTO usage_record;
            
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
                    'tokens_input_used', COALESCE(usage_record.tokens_input_used, 0),
                    'tokens_output_used', COALESCE(usage_record.tokens_output_used, 0),
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
        -- NOTE: On the 1st of every month, free usage automatically resets to 0
        -- because period_start changes to the new month, creating a new record with 0 usage
        -- Get current free usage for the current month
        SELECT * FROM usage_free 
        WHERE user_id = p_user_id 
        AND period_start = current_period 
        INTO usage_record;
        
        -- Ensure free usage record exists for current month (starts at 0 on 1st of month)
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
            renewal_message := 'You will be able to reuse the free version on the 1st of next month (' || 
                              to_char(next_month_date, 'Month DD, YYYY') || ') when it will be renewed. To continue using, upgrade to Pro.';
            
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
            renewal_message := 'You will be able to reuse the free version on the 1st of next month (' || 
                              to_char(next_month_date, 'Month DD, YYYY') || ') when it will be renewed. To continue using, upgrade to Pro.';
            
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
        
        -- CRITICAL: Always return usage data so API can enforce limits
        RETURN jsonb_build_object(
            'success', true,
            'is_pro', false,
            'can_proceed', true,
            'message', 'Usage within limits',
            'usage', jsonb_build_object(
                'tokens_input_used', usage_record.tokens_input_used,
                'tokens_output_used', usage_record.tokens_output_used,
                'period_start', usage_record.period_start
            )
        );
    END IF;
END;
$$;

-- =====================================================
-- PART 3: Update record_usage function
-- =====================================================
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
    -- Also check if key has expired - if expired, treat as free user
    SELECT EXISTS (
        SELECT 1 FROM keys 
        WHERE used_by = p_user_id 
        AND is_used = true 
        AND expiry_date > CURRENT_TIMESTAMP
    ) INTO is_pro;
    
    -- If user has a key but it's expired, treat as free user
    -- Also delete the expired pro usage row if it exists
    -- CRITICAL: Only touch pro rows if user actually has an expired key
    -- Pure free users (never had pro) should NEVER touch pro rows
    IF NOT is_pro THEN
        -- Check if user has an expired key (only delete pro row if they had a pro key before)
        IF EXISTS (
            SELECT 1 FROM keys 
            WHERE used_by = p_user_id 
            AND is_used = true 
            AND expiry_date <= CURRENT_TIMESTAMP
        ) THEN
            -- User has expired pro key - delete the pro usage row
            DELETE FROM public.usage_pro
            WHERE user_id = p_user_id
            AND period_start = current_period;
            
            -- CRITICAL: Delete expired keys for this user
            -- Delete all expired keys associated with this user
            DELETE FROM keys
            WHERE used_by = p_user_id
            AND expiry_date <= CURRENT_TIMESTAMP;
            
            -- CRITICAL: Reset free usage to 0 only if it doesn't exist (first time downgrading)
            IF NOT EXISTS (
                SELECT 1 FROM usage_free
                WHERE user_id = p_user_id
                AND period_start = current_period
            ) THEN
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
        -- CRITICAL: If user is a pure free user (never had pro), we don't touch pro rows at all
        -- Free users should only work with usage_free table
    END IF;
    
    -- Note: Downgrade logic is handled above when checking for expired keys
    -- No need to reset free usage here - it's already handled above
    
    -- If user has active pro key, find their current pro period (within last 30 days)
    -- For pro users, period starts on activation date and lasts 30 days
    IF is_pro THEN
        -- Find the most recent period_start that's within 30 days from today
        SELECT * FROM usage_pro 
        WHERE user_id = p_user_id 
        AND CURRENT_DATE - period_start < 30
        ORDER BY period_start DESC
        LIMIT 1
        INTO usage_record;
        
        -- If pro usage record exists and limits are exceeded, treat as free user
        IF usage_record IS NOT NULL AND (
           (usage_record.tokens_input_used >= pro_input_limit) OR
           (usage_record.tokens_output_used >= pro_output_limit)
        ) THEN
            -- Pro user has already exceeded limit - treat as free user
            is_pro := false;
            
            -- CRITICAL: Delete the pro usage row whose limit exceeded (don't reset to 0)
            DELETE FROM public.usage_pro
            WHERE user_id = p_user_id
            AND period_start = usage_record.period_start;
            
            -- CRITICAL: Delete keys for this user (downgrade to free)
            -- Delete all keys associated with this user
            DELETE FROM keys
            WHERE used_by = p_user_id;
            
            -- CRITICAL: Reset free usage to 0 only if it doesn't exist (first time downgrading)
            -- Don't reset it every time - only reset if free usage doesn't exist
            IF NOT EXISTS (
                SELECT 1 FROM usage_free
                WHERE user_id = p_user_id
                AND period_start = current_period
            ) THEN
                -- First time downgrading - reset free usage to 0
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
            
            -- Fetch the free usage record (either newly created or existing)
            SELECT * FROM usage_free 
            WHERE user_id = p_user_id 
            AND period_start = current_period 
            INTO usage_record;
            
            -- Clear usage_record so the free user section can fetch it fresh
            usage_record := NULL;
        END IF;
    END IF;
    
    -- Now record usage based on actual status (pro or free)
    IF is_pro THEN
        -- usage_record should already be fetched above with the correct period_start (within last 30 days)
        -- If somehow it's not, fetch it again
        IF usage_record IS NULL THEN
            SELECT * FROM usage_pro 
            WHERE user_id = p_user_id 
            AND CURRENT_DATE - period_start < 30
            ORDER BY period_start DESC
            LIMIT 1
            INTO usage_record;
        END IF;
        
        -- If still no record exists, it means the period expired (> 30 days old)
        -- But if they have an active key, this shouldn't happen (key should expire after 30 days too)
        -- However, to be safe, if no period exists and they have an active key, we can't record usage
        -- This case should be rare and indicates a data inconsistency
        
        -- Check if would exceed limits (block if EITHER input OR output limit is exceeded)
        IF usage_record IS NOT NULL AND (
           (usage_record.tokens_input_used + p_input_tokens > pro_input_limit) OR
           (usage_record.tokens_output_used + p_output_tokens > pro_output_limit)
        ) THEN
            -- Pro user exceeded limit - downgrade to free
            -- CRITICAL: Delete the pro usage row that exceeded limit (don't reset to 0)
            DELETE FROM public.usage_pro
            WHERE user_id = p_user_id
            AND period_start = usage_record.period_start;
            
            -- CRITICAL: Delete keys for this user (downgrade to free)
            -- Delete all keys associated with this user
            DELETE FROM keys
            WHERE used_by = p_user_id;
            
            -- CRITICAL: Reset free usage to 0 only if it doesn't exist (first time downgrading)
            -- This ensures a fresh start as a free user, but only once
            IF NOT EXISTS (
                SELECT 1 FROM usage_free
                WHERE user_id = p_user_id
                AND period_start = current_period
            ) THEN
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
            
            -- Fetch the free usage record to return correct values
            SELECT * FROM usage_free 
            WHERE user_id = p_user_id 
            AND period_start = current_period 
            INTO usage_record;
            
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
                    'tokens_input_used', COALESCE(usage_record.tokens_input_used, 0),
                    'tokens_output_used', COALESCE(usage_record.tokens_output_used, 0),
                    'period_start', current_period
                )
            );
        END IF;
        
        -- Update usage (always record usage - we've already checked limits)
        -- Only update if we have actual tokens to record (not status check)
        -- usage_record should already have the correct period_start (within last 30 days)
        IF p_input_tokens > 0 OR p_output_tokens > 0 THEN
            -- CRITICAL: Use INSERT ... ON CONFLICT DO UPDATE to ensure record exists and is updated atomically
            -- This is more reliable than separate INSERT and UPDATE
            -- Use the period_start from usage_record (within last 30 days)
            -- If usage_record is NULL, we can't record usage (shouldn't happen if key is active)
            IF usage_record IS NOT NULL THEN
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
                    usage_record.period_start,
                    GREATEST(p_input_tokens, 0),
                    GREATEST(p_output_tokens, 0),
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP
                )
                ON CONFLICT (user_id, period_start) 
                DO UPDATE SET
                    tokens_input_used = usage_pro.tokens_input_used + GREATEST(p_input_tokens, 0),
                    tokens_output_used = usage_pro.tokens_output_used + GREATEST(p_output_tokens, 0),
                    updated_at = CURRENT_TIMESTAMP
                RETURNING * INTO usage_record;
                
                -- If RETURNING didn't work, fetch the record
                IF usage_record IS NULL THEN
                    SELECT * FROM usage_pro 
                    WHERE user_id = p_user_id 
                    AND CURRENT_DATE - period_start < 30
                    ORDER BY period_start DESC
                    LIMIT 1
                    INTO usage_record;
                END IF;
            END IF;
        ELSE
            -- Status check (0 tokens): just fetch current usage without updating
            -- usage_record is already fetched above
            IF usage_record IS NULL THEN
                SELECT * FROM usage_pro 
                WHERE user_id = p_user_id 
                AND CURRENT_DATE - period_start < 30
                ORDER BY period_start DESC
                LIMIT 1
                INTO usage_record;
            END IF;
        END IF;
    ELSE
        -- Free user (or downgraded pro user) - FIRST get current usage BEFORE any operations
        -- NOTE: On the 1st of every month, free usage automatically resets to 0
        -- because period_start changes to the new month, creating a new record with 0 usage
        -- Get current free usage for the current month (always fetch fresh)
        SELECT * FROM usage_free 
        WHERE user_id = p_user_id 
        AND period_start = current_period 
        INTO usage_record;
        
        -- If no record exists for current month, create one with 0 usage (automatic reset on 1st of month)
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
            renewal_message := 'You will be able to reuse the free version on the 1st of next month (' || 
                              to_char(next_month_date, 'Month DD, YYYY') || ') when it will be renewed. To continue using, upgrade to Pro.';
            
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
            renewal_message := 'You will be able to reuse the free version on the 1st of next month (' || 
                              to_char(next_month_date, 'Month DD, YYYY') || ') when it will be renewed. To continue using, upgrade to Pro.';
            
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
            -- Use INSERT ... ON CONFLICT DO UPDATE to atomically create or update the record
            -- This ensures the update always happens and persists to the database
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
                GREATEST(p_input_tokens, 0),
                GREATEST(p_output_tokens, 0),
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            )
            ON CONFLICT (user_id, period_start) 
            DO UPDATE SET
                tokens_input_used = usage_free.tokens_input_used + GREATEST(p_input_tokens, 0),
                tokens_output_used = usage_free.tokens_output_used + GREATEST(p_output_tokens, 0),
                updated_at = CURRENT_TIMESTAMP
            RETURNING * INTO usage_record;
            
            -- If RETURNING didn't populate usage_record, fetch it
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

-- =====================================================
-- PART 4: Grant permissions
-- =====================================================
GRANT EXECUTE ON FUNCTION public.activate_pro_key(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.check_usage_limit(uuid, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_usage(uuid, integer, integer) TO service_role;

