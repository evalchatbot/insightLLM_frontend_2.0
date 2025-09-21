-- This SQL function needs to be created in your Supabase SQL editor
-- Go to Supabase Dashboard -> SQL Editor and run this:

CREATE OR REPLACE FUNCTION get_genre_enum_values()
RETURNS TEXT[]
LANGUAGE sql
STABLE
AS $$
  SELECT ARRAY(
    SELECT enumlabel
    FROM pg_enum
    WHERE enumtypid = (
      SELECT oid 
      FROM pg_type 
      WHERE typname = 'genre_type'
    )
    ORDER BY enumsortorder
  );
$$;

-- Alternative simpler version if the above doesn't work:
CREATE OR REPLACE FUNCTION get_genre_enum_values_simple()
RETURNS SETOF TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT unnest(enum_range(NULL::genre_type));
$$;