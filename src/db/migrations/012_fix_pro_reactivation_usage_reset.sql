-- Migration: Fix pro reactivation usage reset
-- This migration fixes the issue where users who reactivate pro in the same month
-- would continue from their previous usage instead of getting a fresh start.
--
-- Issue: When a user's pro subscription ended and they reactivated pro later,
-- the usage_pro record would keep the old usage values due to ON CONFLICT DO NOTHING.
--
-- Fix: Change ON CONFLICT DO NOTHING to DO UPDATE SET to reset usage to 0
-- when a user reactivates pro in the same period.

-- Drop and recreate activate_pro_key function with usage reset on reactivation
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
GRANT EXECUTE ON FUNCTION public.activate_pro_key(uuid, uuid) TO service_role;

