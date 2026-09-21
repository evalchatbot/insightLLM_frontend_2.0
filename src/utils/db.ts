import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';
import { lazyClient } from '../lib/lazy-client';

// Read at first use (not import) so `next build` works without Supabase settings.
function supabaseEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }
  return { supabaseUrl, supabaseAnonKey, supabaseServiceKey };
}

// Client for browser/client-side operations (with RLS)
export const supabase = lazyClient(() => {
  const { supabaseUrl, supabaseAnonKey } = supabaseEnv();
  return createClient<Database>(supabaseUrl, supabaseAnonKey);
});

// Admin client for server-side operations (bypasses RLS)
export const supabaseAdmin = lazyClient(() => {
  const { supabaseUrl, supabaseServiceKey } = supabaseEnv();
  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
});

// Export admin client as default for server actions
export default supabaseAdmin;
