# Testing Guide: Migration 016 - Subscription Renewal Support

This guide explains how to safely test the subscription renewal migration before applying it to production.

---

## Prerequisites

1. **Access to Supabase Dashboard**
   - Development/staging Supabase project
   - SQL Editor access
   - Ability to create test data

2. **Test Data Setup**
   - Test users in the database
   - Test subscription keys (both unused and used)
   - Active subscriptions for testing renewals

---

## Step 1: Prepare Test Environment

### Option A: Use Supabase Local Development (Recommended)

If you have Supabase CLI set up locally:

```bash
# Start local Supabase
supabase start

# This gives you a local PostgreSQL instance
# Connect to it and test migrations there
```

### Option B: Use Staging/Development Supabase Project

1. Go to your Supabase Dashboard
2. Select your **development/staging project** (NOT production)
3. Navigate to **SQL Editor**

---

## Step 2: Create Test Data

Before testing, create test scenarios:

```sql
-- 1. Create a test user (or use existing)
-- Note: Replace with actual user UUID from your database
DO $$
DECLARE
    test_user_id uuid := 'YOUR_TEST_USER_UUID_HERE';
    active_key_id uuid;
    renewal_key_id uuid;
BEGIN
    -- 2. Create an active subscription key for the user
    INSERT INTO public.keys (
        id,
        key,
        is_used,
        used_by,
        expiry_date,
        duration_days,
        created_at
    )
    VALUES (
        gen_random_uuid(),
        'TEST-ACTIVE-KEY-001',
        true,
        test_user_id,
        CURRENT_TIMESTAMP + INTERVAL '10 days',  -- Expires in 10 days
        30,
        CURRENT_TIMESTAMP
    )
    RETURNING id INTO active_key_id;
    
    -- 3. Create a renewal key (unused)
    INSERT INTO public.keys (
        id,
        key,
        is_used,
        used_by,
        expiry_date,
        duration_days,
        created_at
    )
    VALUES (
        gen_random_uuid(),
        'TEST-RENEWAL-KEY-001',
        false,
        NULL,
        CURRENT_TIMESTAMP + INTERVAL '365 days',  -- Key valid for 1 year
        30,  -- Adds 30 days
        CURRENT_TIMESTAMP
    )
    RETURNING id INTO renewal_key_id;
    
    RAISE NOTICE 'Test data created:';
    RAISE NOTICE '  Active key ID: %', active_key_id;
    RAISE NOTICE '  Renewal key ID: %', renewal_key_id;
    RAISE NOTICE '  Test user ID: %', test_user_id;
END $$;
```

**Save the key IDs** - you'll need them for testing.

---

## Step 3: Test the Migration

### Test 1: Verify Function Exists (Before Migration)

```sql
-- Check current function signature
SELECT 
    routine_name,
    routine_type,
    data_type,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'activate_pro_key';
```

### Test 2: Apply Migration

1. Open **Supabase SQL Editor**
2. Copy the entire content of `016_add_subscription_renewal_support.sql`
3. Paste into SQL Editor
4. Click **Run** (or press F5)

**Expected Result:** 
- ✅ Function created successfully
- ✅ No errors

### Test 3: Verify Function Was Updated

```sql
-- Check function was updated
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'activate_pro_key';

-- Should return the function
```

---

## Step 4: Test Scenarios

### Scenario 1: New Activation (No Active Subscription)

**Setup:**
- User has NO active subscription
- User has an unused key

**Test:**
```sql
-- Replace with your test values
SELECT public.activate_pro_key(
    'RENEWAL-KEY-UUID-HERE'::uuid,  -- Unused key ID
    'TEST-USER-UUID-HERE'::uuid     -- User with no active subscription
);
```

**Expected Result:**
```json
{
    "success": true,
    "message": "Pro key activated successfully",
    "is_renewal": false,
    "expiry_date": "2025-01-25T...",
    "duration_days": 30
}
```

**Verify:**
```sql
-- Check key was activated
SELECT * FROM keys WHERE id = 'RENEWAL-KEY-UUID-HERE'::uuid;
-- Should show: is_used = true, used_by = test_user_id

-- Check usage_pro record was created
SELECT * FROM usage_pro WHERE user_id = 'TEST-USER-UUID-HERE'::uuid;
-- Should show: tokens_input_used = 0, tokens_output_used = 0, ocr_count = 0
```

---

### Scenario 2: Simple Renewal (Active Subscription)

**Setup:**
- User has active subscription (expires in 10 days)
- User has an unused renewal key (30 days)

**Test:**
```sql
-- Get the active key ID and renewal key ID from Step 2
-- Replace with your actual IDs
SELECT public.activate_pro_key(
    'RENEWAL-KEY-UUID-HERE'::uuid,  -- New unused key
    'TEST-USER-UUID-HERE'::uuid     -- User with active subscription
);
```

**Expected Result:**
```json
{
    "success": true,
    "message": "Subscription extended successfully",
    "is_renewal": true,
    "old_expiry_date": "2025-01-05T...",  -- Original expiry (10 days from now)
    "new_expiry_date": "2025-02-04T...",  -- Extended by 30 days
    "duration_added_days": 30,
    "was_capped": false
}
```

**Verify:**
```sql
-- Check active key was extended (not the renewal key)
SELECT 
    id,
    key,
    is_used,
    expiry_date,
    used_by
FROM keys 
WHERE used_by = 'TEST-USER-UUID-HERE'::uuid
AND is_used = true
AND expiry_date > CURRENT_TIMESTAMP
ORDER BY expiry_date DESC
LIMIT 1;
-- Should show: expiry_date extended by 30 days

-- Check renewal key was marked as used
SELECT * FROM keys WHERE id = 'RENEWAL-KEY-UUID-HERE'::uuid;
-- Should show: is_used = true, used_by = test_user_id

-- Check usage was NOT reset
SELECT * FROM usage_pro WHERE user_id = 'TEST-USER-UUID-HERE'::uuid;
-- Should show: usage counters remain unchanged (not reset to 0)
```

---

### Scenario 3: Renewal with Expiry Cap (Would Exceed 12 Months)

**Setup:**
- User has active subscription expiring in 11 months
- User tries to add 30 days (would exceed 12 months)

**Test:**
```sql
-- First, create a key with 11 months expiry
DO $$
DECLARE
    test_user_id uuid := 'TEST-USER-UUID-HERE'::uuid;
    active_key_id uuid;
    renewal_key_id uuid;
BEGIN
    -- Create active key expiring in 11 months
    INSERT INTO public.keys (
        id, key, is_used, used_by, expiry_date, duration_days
    )
    VALUES (
        gen_random_uuid(),
        'TEST-ACTIVE-11MONTHS',
        true,
        test_user_id,
        CURRENT_TIMESTAMP + INTERVAL '11 months',
        30
    )
    RETURNING id INTO active_key_id;
    
    -- Create renewal key
    INSERT INTO public.keys (
        id, key, is_used, used_by, expiry_date, duration_days
    )
    VALUES (
        gen_random_uuid(),
        'TEST-RENEWAL-CAP',
        false,
        NULL,
        CURRENT_TIMESTAMP + INTERVAL '365 days',
        30
    )
    RETURNING id INTO renewal_key_id;
    
    -- Test renewal
    PERFORM public.activate_pro_key(renewal_key_id, test_user_id);
    
    -- Check result
    SELECT expiry_date FROM keys WHERE id = active_key_id;
    -- Should be capped at 12 months from today, not 11 months + 30 days
END $$;
```

**Expected Result:**
- `new_expiry_date` should be exactly 12 months from today
- `was_capped: true` in response
- Warning logged (check Supabase logs)

---

### Scenario 4: Multiple Renewals

**Test:**
```sql
-- Renew multiple times
SELECT public.activate_pro_key('KEY-1-UUID'::uuid, 'TEST-USER-UUID'::uuid);
SELECT public.activate_pro_key('KEY-2-UUID'::uuid, 'TEST-USER-UUID'::uuid);
SELECT public.activate_pro_key('KEY-3-UUID'::uuid, 'TEST-USER-UUID'::uuid);

-- Check final expiry
SELECT expiry_date 
FROM keys 
WHERE used_by = 'TEST-USER-UUID'::uuid
AND is_used = true
ORDER BY expiry_date DESC
LIMIT 1;
-- Should be: original_expiry + 30 + 30 + 30 days (or capped at 12 months)
```

---

### Scenario 5: Error Cases

**Test Invalid Key:**
```sql
SELECT public.activate_pro_key(
    '00000000-0000-0000-0000-000000000000'::uuid,  -- Non-existent key
    'TEST-USER-UUID'::uuid
);
-- Expected: success = false, message = "Key is invalid, already used, or expired"
```

**Test Already Used Key:**
```sql
-- Use a key that's already marked as used
SELECT public.activate_pro_key(
    'ALREADY-USED-KEY-UUID'::uuid,
    'TEST-USER-UUID'::uuid
);
-- Expected: success = false, message = "Key is invalid, already used, or expired"
```

**Test Expired Key:**
```sql
-- Use a key with expiry_date in the past
SELECT public.activate_pro_key(
    'EXPIRED-KEY-UUID'::uuid,
    'TEST-USER-UUID'::uuid
);
-- Expected: success = false, message = "Key is invalid, already used, or expired"
```

---

## Step 5: Clean Up Test Data

After testing, clean up:

```sql
-- Delete test keys
DELETE FROM keys WHERE key LIKE 'TEST-%';

-- Delete test usage records (if needed)
DELETE FROM usage_pro WHERE user_id = 'TEST-USER-UUID-HERE'::uuid;
DELETE FROM usage_free WHERE user_id = 'TEST-USER-UUID-HERE'::uuid;
```

---

## Step 6: Rollback Plan (If Needed)

If something goes wrong, you can rollback:

```sql
-- Restore previous function from migration 015
-- Copy the function definition from 015_add_ocr_count_tracking.sql
-- And run CREATE OR REPLACE FUNCTION...
```

Or restore from backup if you have one.

---

## Verification Checklist

Before applying to production, verify:

- [ ] ✅ New activation works (creates usage_pro, resets counters)
- [ ] ✅ Simple renewal works (extends expiry, keeps usage)
- [ ] ✅ Expiry cap works (caps at 12 months)
- [ ] ✅ Multiple renewals work (each extends from latest)
- [ ] ✅ Error cases handled (invalid key, used key, expired key)
- [ ] ✅ Audit trail maintained (renewal keys marked as used)
- [ ] ✅ Usage not reset on renewal (preserves current usage)
- [ ] ✅ No errors in Supabase logs

---

## Production Deployment

Once all tests pass:

1. **Backup Production Database** (if possible)
2. Copy migration SQL to **Production Supabase SQL Editor**
3. Run the migration
4. Verify function was updated:
   ```sql
   SELECT routine_name FROM information_schema.routines 
   WHERE routine_name = 'activate_pro_key';
   ```
5. Test with a real user (optional, but recommended)

---

## Troubleshooting

### Error: "Function already exists"
- This is normal - `CREATE OR REPLACE` will update it
- Just run the migration

### Error: "Permission denied"
- Ensure you're using service role or have proper permissions
- Check function grants in migration

### Error: "Column does not exist"
- Verify you're running on the correct database
- Check that previous migrations (010-015) were applied

### Function works but returns wrong data
- Check that test data is set up correctly
- Verify user has active subscription (for renewal tests)
- Check Supabase logs for warnings

---

**End of Testing Guide**

