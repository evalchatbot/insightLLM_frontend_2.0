-- =====================================================
-- Migration 014: Automatic Monthly Usage Reset (UPDATE approach)
-- =====================================================
-- This migration changes the system to:
-- 1. UPDATE existing free user rows instead of creating new ones
-- 2. Automatically reset all free users on the 1st of each month
-- 3. Keep only current month data (delete old months to save space)
-- 4. Use one row per user (not one per month)
-- =====================================================

-- =====================================================
-- PART 1: Immediate Fix for December 2025
-- =====================================================

-- First, let's clean up the old approach and migrate to new approach
-- Update all free users to have December 2025 as their period_start with 0 usage

DO $$
DECLARE
    free_user_record RECORD;
BEGIN
    -- For each free user (not pro), update or create December record
    FOR free_user_record IN (
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
    LOOP
        -- Delete all old month records for this user (keep only December)
        DELETE FROM public.usage_free
        WHERE user_id = free_user_record.user_id
        AND period_start < '2025-12-01'::date;
        
        -- Update or insert December record with 0 usage
        INSERT INTO public.usage_free (
            user_id,
            period_start,
            tokens_input_used,
            tokens_output_used,
            created_at,
            updated_at
        )
        VALUES (
            free_user_record.user_id,
            '2025-12-01'::date,
            0,
            0,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        )
        ON CONFLICT (user_id, period_start) 
        DO UPDATE SET
            tokens_input_used = 0,
            tokens_output_used = 0,
            period_start = '2025-12-01'::date,
            updated_at = CURRENT_TIMESTAMP;
    END LOOP;
    
    RAISE NOTICE 'December 2025 reset completed for all free users';
END $$;

-- =====================================================
-- PART 2: Create Monthly Reset Function
-- =====================================================

-- This function will be called on the 1st of each month to reset all free users
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
    
    -- Step 2: Update all free users' records to new month with 0 usage
    -- This updates existing records or creates new ones
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
        created_at,
        updated_at
    )
    SELECT 
        user_id,
        current_month_start,
        0,
        0,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    FROM free_users
    ON CONFLICT (user_id, period_start) 
    DO UPDATE SET
        tokens_input_used = 0,
        tokens_output_used = 0,
        period_start = current_month_start,
        updated_at = CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    RAISE NOTICE 'Monthly reset completed: % users updated to %', updated_count, current_month_start;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.reset_monthly_free_usage() TO service_role;
GRANT EXECUTE ON FUNCTION public.reset_monthly_free_usage() TO postgres;

-- =====================================================
-- PART 3: Setup Automatic Execution with pg_cron
-- =====================================================

-- NOTE: pg_cron extension must be enabled in Supabase Dashboard first
-- Go to: Database > Extensions > Enable "pg_cron"

-- Check if pg_cron is available
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
    ) THEN
        -- Remove existing job if it exists
        PERFORM cron.unschedule('monthly-free-usage-reset');
        
        -- Schedule monthly reset on the 1st of every month at 00:05 AM UTC
        PERFORM cron.schedule(
            'monthly-free-usage-reset',           -- job name
            '5 0 1 * *',                          -- cron: At 00:05 on day 1 of every month
            'SELECT public.reset_monthly_free_usage();'
        );
        
        RAISE NOTICE 'pg_cron job scheduled successfully!';
    ELSE
        RAISE NOTICE 'pg_cron extension not enabled. Please enable it in Supabase Dashboard.';
        RAISE NOTICE 'Go to: Database > Extensions > Enable "pg_cron"';
        RAISE NOTICE 'Then run: SELECT cron.schedule(''monthly-free-usage-reset'', ''5 0 1 * *'', ''SELECT public.reset_monthly_free_usage();'');';
    END IF;
END $$;

-- =====================================================
-- PART 4: Alternative - Supabase Edge Function Approach
-- =====================================================

-- If pg_cron is not available, create an HTTP endpoint that can be called by
-- an external cron service (like GitHub Actions, Vercel Cron, or cron-job.org)

-- Create a function that can be called via Supabase Edge Function
CREATE OR REPLACE FUNCTION public.trigger_monthly_reset(
    secret_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    expected_secret text;
    result_message text;
BEGIN
    -- Security: Check secret key (set this in your environment variables)
    -- You should set this to a strong random value in production
    expected_secret := current_setting('app.settings.reset_secret', true);
    
    -- If no secret is configured, allow it (for development)
    -- In production, ALWAYS set app.settings.reset_secret
    IF expected_secret IS NOT NULL AND expected_secret != '' THEN
        IF secret_key IS NULL OR secret_key != expected_secret THEN
            RETURN jsonb_build_object(
                'success', false,
                'message', 'Unauthorized: Invalid secret key'
            );
        END IF;
    END IF;
    
    -- Execute the reset
    PERFORM public.reset_monthly_free_usage();
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Monthly reset executed successfully',
        'timestamp', CURRENT_TIMESTAMP
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Error: ' || SQLERRM
        );
END;
$$;

GRANT EXECUTE ON FUNCTION public.trigger_monthly_reset(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.trigger_monthly_reset(text) TO anon;
GRANT EXECUTE ON FUNCTION public.trigger_monthly_reset(text) TO authenticated;

-- =====================================================
-- PART 5: Verification & Testing
-- =====================================================

-- Verify December 2025 reset
SELECT 
    'Free users with December 2025 records' as description,
    COUNT(*) as count
FROM public.usage_free
WHERE period_start = '2025-12-01'::date;

-- Check for old records (should be 0 after migration)
SELECT 
    'Old records (before December 2025)' as description,
    COUNT(*) as count
FROM public.usage_free
WHERE period_start < '2025-12-01'::date;

-- View all usage records
SELECT 
    user_id,
    period_start,
    tokens_input_used,
    tokens_output_used,
    created_at,
    updated_at
FROM public.usage_free
ORDER BY period_start DESC, user_id
LIMIT 10;

-- View scheduled cron jobs (if pg_cron is enabled)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        RAISE NOTICE 'Scheduled cron jobs:';
        PERFORM * FROM cron.job WHERE jobname = 'monthly-free-usage-reset';
    ELSE
        RAISE NOTICE 'pg_cron is not enabled. Cron job scheduling skipped.';
        RAISE NOTICE 'To enable automatic resets, enable pg_cron in Supabase Dashboard or use Edge Function approach.';
    END IF;
END $$;

-- =====================================================
-- PART 6: Manual Reset Command (for testing)
-- =====================================================

-- To manually trigger a reset at any time, run:
-- SELECT public.reset_monthly_free_usage();

-- To test the HTTP endpoint (if using Edge Function approach):
-- SELECT public.trigger_monthly_reset('your-secret-key-here');

-- =====================================================
-- NOTES FOR DEPLOYMENT
-- =====================================================

/*
OPTION 1: Using pg_cron (Recommended if available)
1. Enable pg_cron extension in Supabase Dashboard
2. Run this migration
3. Verify with: SELECT * FROM cron.job WHERE jobname = 'monthly-free-usage-reset';
4. Done! Automatic reset happens on the 1st of each month at 00:05 UTC

OPTION 2: Using External Cron Service (if pg_cron not available)
1. Create a Supabase Edge Function that calls trigger_monthly_reset()
2. Set up a secret key in Supabase settings: app.settings.reset_secret
3. Use a service like GitHub Actions, Vercel Cron, or cron-job.org to call the endpoint
4. Schedule it to run on the 1st of each month at 00:05 UTC

Example Edge Function (save as supabase/functions/monthly-reset/index.ts):

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )
  
  const { data, error } = await supabase.rpc('trigger_monthly_reset', {
    secret_key: Deno.env.get('RESET_SECRET_KEY') ?? ''
  })
  
  return new Response(
    JSON.stringify(data),
    { headers: { "Content-Type": "application/json" } }
  )
})

Example GitHub Actions (save as .github/workflows/monthly-reset.yml):

name: Monthly Usage Reset
on:
  schedule:
    - cron: '5 0 1 * *'  # At 00:05 on day 1 of every month
  workflow_dispatch:  # Allow manual trigger

jobs:
  reset:
    runs-on: ubuntu-latest
    steps:
      - name: Call Supabase Edge Function
        run: |
          curl -X POST https://your-project.supabase.co/functions/v1/monthly-reset \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}"
*/
