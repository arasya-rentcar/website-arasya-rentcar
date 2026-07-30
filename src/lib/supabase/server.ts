import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

function requireEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY — see .env.example'
    );
  }
  return { url, publishableKey };
}

/**
 * Cookie-free public client for statically generated pages.
 *
 * Landing pages are built with `generateStaticParams`, so they must not touch
 * `cookies()` — doing so would opt the route into dynamic rendering and defeat
 * the whole point (Ads Quality Score and indexing depend on static HTML).
 * RLS still restricts this client to `status = 'published'`.
 */
export function createPublicClient() {
  const { url, publishableKey } = requireEnv();
  return createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Session-aware client for /admin routes and server actions. Reads and writes
 * the auth cookies, so any route using it renders dynamically.
 */
export async function createServerSupabase() {
  const { url, publishableKey } = requireEnv();
  const cookieStore = await cookies();
  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component — the middleware refreshes the
          // session instead, so this is safe to ignore.
        }
      },
    },
  });
}
