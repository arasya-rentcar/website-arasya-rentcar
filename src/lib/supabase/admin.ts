import 'server-only';
import { createClient } from '@supabase/supabase-js';

/**
 * Service-role client. Bypasses RLS entirely — never import this from a client
 * component, a route that isn't admin-gated, or anything reachable by anon
 * traffic. Used by the seed scripts and by Content Studio mutations after the
 * caller has already been verified against the `admins` allowlist.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — see .env.example'
    );
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
