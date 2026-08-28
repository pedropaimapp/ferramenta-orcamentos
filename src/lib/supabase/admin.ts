import { createClient } from '@supabase/supabase-js';

// Server-only: uses the service role key, which bypasses RLS.
// Never import this file from a Client Component.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
