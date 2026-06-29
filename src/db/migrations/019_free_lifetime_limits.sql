-- =====================================================
-- Migration 019: Free-tier LIFETIME limits
-- =====================================================
-- Goal:
--   * Free tier = 1 evaluation TOTAL for all time (rubric + essay + precis + outline combined)
--   * Free tier = 1 MCQ test TOTAL for all time
--   * Pro tier behavior is UNCHANGED (40 PDFs / 30-day rolling, auto-downgrade; MCQ unlimited)
--   * Lifetime counters do NOT reset monthly. They are reset to 0 when a user activates a
--     Pro key (handled in the app layer: src/app/api/pro/verify-key/route.ts), so a user who
--     upgrades and later lapses back to Free receives a fresh allowance.
--
-- This migration:
--   1. Creates public.free_lifetime_usage (per-user lifetime counters)
--   2. Replaces check_ocr_limit / record_ocr_usage  -> Pro branch unchanged, Free branch lifetime
--   3. Adds check_mcq_limit / record_mcq_attempt
--
-- NOTE: The token functions (check_usage_limit / record_usage) and the monthly reset
-- (reset_monthly_free_usage) are intentionally left untouched.
-- =====================================================

-- =====================================================
-- PART 1: Lifetime usage table
-- =====================================================

-- user_id holds the same id used everywhere else for usage (the value passed as
-- p_user_id, i.e. public.users.id). No FK constraint is declared so this works
-- regardless of whether that id lives in auth.users or public.users; all access is
-- via the SECURITY DEFINER functions below.
CREATE TABLE IF NOT EXISTS public.free_lifetime_usage (
    user_id    uuid PRIMARY KEY,
    eval_count integer NOT NULL DEFAULT 0,
    mcq_count  integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Access is only ever via SECURITY DEFINER functions (called with the service role).
-- Enable RLS with no policies so direct client access is denied.
ALTER TABLE public.free_lifetime_usage ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PART 2: check_ocr_limit  (Pro branch UNCHANGED; Free branch = lifetime)
-- =====================================================

CREATE OR REPLACE FUNCTION public.check_ocr_limit(
    p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    is_pro boolean;
    usage_record record;
    pro_ocr_limit integer := 40;    -- Pro: 40 PDFs per 30-day period (UNCHANGED)
    free_eval_limit integer := 1;   -- Free: 1 evaluation for all time
    v_eval_count integer;
BEGIN
    -- Check if user has an active pro key (not expired)
    SELECT EXISTS (
        SELECT 1 FROM keys
        WHERE used_by = p_user_id
        AND is_used = true
        AND expiry_date > CURRENT_TIMESTAMP
    ) INTO is_pro;

    IF is_pro THEN
        -- ===== PRO BRANCH (unchanged from migration 016) =====
        SELECT * FROM usage_pro
        WHERE user_id = p_user_id
        AND CURRENT_DATE - period_start < 30
        ORDER BY period_start DESC
        LIMIT 1
        INTO usage_record;

        IF usage_record IS NULL THEN
            RETURN jsonb_build_object(
                'success', true, 'is_pro', true, 'can_proceed', true,
                'message', 'OCR usage within limits',
                'ocr_count', 0, 'ocr_limit', pro_ocr_limit
            );
        END IF;

        IF usage_record.ocr_count >= pro_ocr_limit THEN
            RETURN jsonb_build_object(
                'success', false, 'is_pro', true, 'can_proceed', false,
                'message', 'Pro OCR limit reached (' || usage_record.ocr_count || '/' || pro_ocr_limit || ' PDFs used). Contact support to increase limit.',
                'ocr_count', usage_record.ocr_count, 'ocr_limit', pro_ocr_limit
            );
        END IF;

        RETURN jsonb_build_object(
            'success', true, 'is_pro', true, 'can_proceed', true,
            'message', 'OCR usage within limits',
            'ocr_count', usage_record.ocr_count, 'ocr_limit', pro_ocr_limit
        );
    ELSE
        -- ===== FREE BRANCH: lifetime evaluation limit (does NOT reset monthly) =====
        SELECT eval_count INTO v_eval_count
        FROM public.free_lifetime_usage
        WHERE user_id = p_user_id;

        IF v_eval_count IS NULL THEN
            v_eval_count := 0;
        END IF;

        IF v_eval_count >= free_eval_limit THEN
            RETURN jsonb_build_object(
                'success', false, 'is_pro', false, 'can_proceed', false,
                'message', 'You have used your ' || free_eval_limit || ' free evaluation. Upgrade to Pro for unlimited evaluations.',
                'ocr_count', v_eval_count, 'ocr_limit', free_eval_limit
            );
        END IF;

        RETURN jsonb_build_object(
            'success', true, 'is_pro', false, 'can_proceed', true,
            'message', 'OCR usage within limits',
            'ocr_count', v_eval_count, 'ocr_limit', free_eval_limit
        );
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_ocr_limit(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.check_ocr_limit(uuid) TO authenticated;

-- =====================================================
-- PART 3: record_ocr_usage  (Pro branch UNCHANGED; Free branch = lifetime)
-- =====================================================

CREATE OR REPLACE FUNCTION public.record_ocr_usage(
    p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    is_pro boolean;
    usage_record record;
    pro_ocr_limit integer := 40;    -- Pro: 40 PDFs per 30-day period (UNCHANGED)
    free_eval_limit integer := 1;   -- Free: 1 evaluation for all time
    pro_key_id uuid;
    v_eval_count integer;
BEGIN
    -- Check if user has an active pro key (not expired)
    SELECT EXISTS (
        SELECT 1 FROM keys
        WHERE used_by = p_user_id
        AND is_used = true
        AND expiry_date > CURRENT_TIMESTAMP
    ) INTO is_pro;

    IF is_pro THEN
        -- ===== PRO BRANCH (unchanged from migration 016, incl. auto-downgrade) =====
        SELECT * FROM usage_pro
        WHERE user_id = p_user_id
        AND CURRENT_DATE - period_start < 30
        ORDER BY period_start DESC
        LIMIT 1
        INTO usage_record;

        IF usage_record IS NULL THEN
            INSERT INTO public.usage_pro (
                user_id, period_start, tokens_input_used, tokens_output_used, ocr_count, created_at, updated_at
            )
            VALUES (p_user_id, CURRENT_DATE, 0, 0, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id, period_start)
            DO UPDATE SET ocr_count = usage_pro.ocr_count + 1, updated_at = CURRENT_TIMESTAMP
            RETURNING * INTO usage_record;
        ELSE
            UPDATE usage_pro
            SET ocr_count = ocr_count + 1, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = p_user_id AND period_start = usage_record.period_start
            RETURNING * INTO usage_record;
        END IF;

        -- AUTO-DOWNGRADE: If pro user reaches limit, downgrade to free tier
        IF usage_record.ocr_count >= pro_ocr_limit THEN
            SELECT id INTO pro_key_id
            FROM keys
            WHERE used_by = p_user_id AND is_used = true AND expiry_date > CURRENT_TIMESTAMP
            LIMIT 1;

            IF pro_key_id IS NOT NULL THEN
                UPDATE keys SET expiry_date = CURRENT_TIMESTAMP WHERE id = pro_key_id;
            END IF;

            DELETE FROM usage_pro WHERE user_id = p_user_id;

            RETURN jsonb_build_object(
                'success', true,
                'message', 'OCR limit reached. Your Pro subscription has ended. You are now on the Free tier.',
                'is_pro', false, 'was_pro', true, 'downgraded', true,
                'ocr_count', usage_record.ocr_count, 'ocr_limit', pro_ocr_limit
            );
        END IF;

        RETURN jsonb_build_object(
            'success', true, 'message', 'OCR usage recorded successfully',
            'is_pro', true, 'ocr_count', usage_record.ocr_count, 'ocr_limit', pro_ocr_limit
        );
    ELSE
        -- ===== FREE BRANCH: increment lifetime evaluation counter =====
        INSERT INTO public.free_lifetime_usage (user_id, eval_count, mcq_count, created_at, updated_at)
        VALUES (p_user_id, 1, 0, now(), now())
        ON CONFLICT (user_id)
        DO UPDATE SET eval_count = public.free_lifetime_usage.eval_count + 1, updated_at = now()
        RETURNING eval_count INTO v_eval_count;

        RETURN jsonb_build_object(
            'success', true, 'message', 'OCR usage recorded successfully',
            'is_pro', false, 'ocr_count', v_eval_count, 'ocr_limit', free_eval_limit
        );
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_ocr_usage(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_ocr_usage(uuid) TO authenticated;

-- =====================================================
-- PART 4: check_mcq_limit  (Free = 1 lifetime; Pro = unlimited)
-- =====================================================

CREATE OR REPLACE FUNCTION public.check_mcq_limit(
    p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    is_pro boolean;
    free_mcq_limit integer := 1;   -- Free: 1 MCQ test for all time
    v_mcq_count integer;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM keys
        WHERE used_by = p_user_id AND is_used = true AND expiry_date > CURRENT_TIMESTAMP
    ) INTO is_pro;

    IF is_pro THEN
        -- Pro = unlimited MCQ tests
        RETURN jsonb_build_object(
            'success', true, 'is_pro', true, 'can_proceed', true,
            'message', 'MCQ usage within limits',
            'mcq_count', 0, 'mcq_limit', -1
        );
    END IF;

    SELECT mcq_count INTO v_mcq_count
    FROM public.free_lifetime_usage
    WHERE user_id = p_user_id;

    IF v_mcq_count IS NULL THEN
        v_mcq_count := 0;
    END IF;

    IF v_mcq_count >= free_mcq_limit THEN
        RETURN jsonb_build_object(
            'success', false, 'is_pro', false, 'can_proceed', false,
            'message', 'You have used your ' || free_mcq_limit || ' free MCQ test. Upgrade to Pro for unlimited tests.',
            'mcq_count', v_mcq_count, 'mcq_limit', free_mcq_limit
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true, 'is_pro', false, 'can_proceed', true,
        'message', 'MCQ usage within limits',
        'mcq_count', v_mcq_count, 'mcq_limit', free_mcq_limit
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_mcq_limit(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.check_mcq_limit(uuid) TO authenticated;

-- =====================================================
-- PART 5: record_mcq_attempt  (Free increments lifetime; Pro = no-op)
-- =====================================================

CREATE OR REPLACE FUNCTION public.record_mcq_attempt(
    p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    is_pro boolean;
    free_mcq_limit integer := 1;
    v_mcq_count integer;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM keys
        WHERE used_by = p_user_id AND is_used = true AND expiry_date > CURRENT_TIMESTAMP
    ) INTO is_pro;

    IF is_pro THEN
        -- Pro = unlimited, nothing to record
        RETURN jsonb_build_object(
            'success', true, 'message', 'Pro user - unlimited MCQ tests',
            'is_pro', true, 'mcq_count', 0, 'mcq_limit', -1
        );
    END IF;

    INSERT INTO public.free_lifetime_usage (user_id, eval_count, mcq_count, created_at, updated_at)
    VALUES (p_user_id, 0, 1, now(), now())
    ON CONFLICT (user_id)
    DO UPDATE SET mcq_count = public.free_lifetime_usage.mcq_count + 1, updated_at = now()
    RETURNING mcq_count INTO v_mcq_count;

    RETURN jsonb_build_object(
        'success', true, 'message', 'MCQ attempt recorded',
        'is_pro', false, 'mcq_count', v_mcq_count, 'mcq_limit', free_mcq_limit
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_mcq_attempt(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_mcq_attempt(uuid) TO authenticated;

-- =====================================================
-- PART 6: Verification helpers (manual)
-- =====================================================
/*
-- Free user: first eval allowed, second blocked
SELECT public.check_ocr_limit('USER_ID'::uuid);   -- can_proceed = true
SELECT public.record_ocr_usage('USER_ID'::uuid);  -- eval_count -> 1
SELECT public.check_ocr_limit('USER_ID'::uuid);   -- can_proceed = false

-- MCQ
SELECT public.check_mcq_limit('USER_ID'::uuid);
SELECT public.record_mcq_attempt('USER_ID'::uuid);
SELECT public.check_mcq_limit('USER_ID'::uuid);   -- blocked

-- Fresh allowance after upgrade is handled in verify-key route by resetting:
-- UPDATE public.free_lifetime_usage SET eval_count = 0, mcq_count = 0 WHERE user_id = 'USER_ID';
*/
