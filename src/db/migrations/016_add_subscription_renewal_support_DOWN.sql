-- =====================================================
-- Migration 016 DOWN: Revert Subscription Renewal Support
-- =====================================================
-- This migration REVERTS the changes made in migration 016
-- It restores the activate_pro_key function to its previous state (from migration 015)
-- This removes renewal/extension support and restores the blocking behavior
-- =====================================================

-- =====================================================
-- PART 1: Restore activate_pro_key to previous version (from migration 015)
-- =====================================================

-- Restore the function to its state before renewal support was added
-- This version does NOT support renewals and will need backend blocking logic
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
        used_by = user_identifier,
        updated_at = CURRENT_TIMESTAMP
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

-- Grant execute permissions (same as before)
GRANT EXECUTE ON FUNCTION public.activate_pro_key(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.activate_pro_key(uuid, uuid) TO authenticated;

-- =====================================================
-- PART 2: Verification
-- =====================================================

-- Verify function was restored successfully
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
ROLLBACK NOTES:

After running this migration:

1. The activate_pro_key function no longer supports renewals
2. Users with active subscriptions will be blocked by backend API
3. The function only handles new activations (no extension logic)
4. Maximum expiry cap logic is removed
5. Renewal detection logic is removed

IMPORTANT:

- If you have users who renewed subscriptions using migration 016,
  their extended expiry dates will remain in the database
- This rollback only reverts the function logic, not the data
- To fully revert, you would need to manually adjust expiry dates
  for users who renewed during the renewal period

BACKEND CHANGES NEEDED:

After rolling back this migration, you should also:
1. Restore the blocking logic in verify-key/route.ts (lines 135-141)
2. Remove renewal UI from frontend components
3. Remove renewal button from custom-apikey.tsx

DATA CONSIDERATIONS:

- Extended subscriptions will remain extended (expiry_date values)
- Renewal keys that were marked as used will remain marked
- No data is automatically reverted - only function behavior

TESTING ROLLBACK:

1. Verify function signature matches migration 015:
   SELECT routine_definition 
   FROM information_schema.routines 
   WHERE routine_name = 'activate_pro_key';

2. Test that renewals no longer work:
   - Try to activate key for user with active subscription
   - Should fail (if backend blocking is restored)

3. Test that new activations still work:
   - Activate key for user without subscription
   - Should succeed and create usage_pro record
*/

