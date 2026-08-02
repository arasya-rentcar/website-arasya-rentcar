import 'server-only';
import { redirect } from 'next/navigation';
import { createServerSupabase } from './supabase/server';
import { supabaseEnv } from './supabase/config';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * The actual /admin gate. Every admin route and every mutation calls this
 * first, and uses the client it returns.
 *
 * Two properties are deliberate:
 *
 *  1. IT RE-CHECKS, rather than trusting the middleware redirect. Authorisation
 *     that only exists in middleware is authorisation that disappears the
 *     moment a route is reached another way — a rewrite, a future matcher edit,
 *     or a header-spoofing bypass of the middleware itself. The cost here is
 *     one indexed lookup on a table with a handful of rows.
 *
 *  2. IT HANDS BACK THE SESSION CLIENT, not the service-role client. Every
 *     Content Studio write therefore passes through RLS, where the same
 *     `is_admin()` predicate is evaluated by Postgres against the caller's own
 *     JWT. That makes the database the last word on who may write, so a bug in
 *     this file cannot by itself turn into a data breach. `createAdminClient()`
 *     bypasses RLS entirely and is reserved for the seed scripts.
 */

export interface AdminSession {
  supabase: SupabaseClient;
  user: { id: string; email: string | null };
  admin: { user_id: string; email: string };
}

/**
 * Resolves the signed-in admin, or redirects to the login form.
 *
 * Never returns for a non-admin, so callers can treat a return value as proof.
 */
export async function requireAdmin(): Promise<AdminSession> {
  // Checked before constructing the client, which would otherwise throw and
  // turn a configuration mistake into an unexplained 500.
  if (!supabaseEnv().configured) redirect('/admin/login?error=unconfigured');

  const supabase = await createServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/admin/login');

  // Authenticated is not authorised: sign-up is disabled, but a user can exist
  // in `auth.users` without being on the allowlist. The `admins self read`
  // policy is itself `using (is_admin())`, so a non-admin simply gets no rows
  // back rather than an error — absence here IS the negative answer.
  const { data, error } = await supabase
    .from('admins')
    .select('user_id, email')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error || !data) redirect('/admin/login?error=forbidden');

  return {
    supabase,
    user: { id: user.id, email: user.email ?? null },
    admin: data as { user_id: string; email: string },
  };
}

/**
 * Where to send the browser after a successful sign-in.
 *
 * The middleware puts the requested path in `?next=`, which means an attacker
 * can put anything there. Only in-app admin paths are honoured; everything else
 * — absolute URLs, protocol-relative `//evil.com`, paths outside /admin —
 * collapses to the dashboard. Without this the login form is an open redirect
 * wearing the site's own domain, which is exactly what makes one convincing.
 */
export function safeNext(next: string | undefined): string {
  if (!next) return '/admin';
  // Exact-segment match, not a prefix test: `startsWith('/admin')` would also
  // accept `//admin.evil.com`, which browsers read as protocol-relative and
  // follow off-site.
  if (next !== '/admin' && !next.startsWith('/admin/')) return '/admin';
  return next;
}
