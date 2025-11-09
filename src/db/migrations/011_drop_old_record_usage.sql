-- Quick fix: Drop old functions to resolve function overloading conflicts

-- Drop the old 4-parameter version of record_usage (with p_pages)
DROP FUNCTION IF EXISTS public.record_usage(uuid, integer, integer, integer);

-- Drop old versions of activate_pro_key with different parameter orders
DROP FUNCTION IF EXISTS public.activate_pro_key(uuid, uuid, timestamp with time zone);
DROP FUNCTION IF EXISTS public.activate_pro_key(timestamp with time zone, uuid, uuid);
DROP FUNCTION IF EXISTS public.activate_pro_key(uuid, uuid);

-- The new versions should already exist from migration 010
-- If not, they will be created by running migration 010_update_usage_system.sql

