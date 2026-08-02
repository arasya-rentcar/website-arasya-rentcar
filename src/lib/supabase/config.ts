/**
 * Is Supabase configured on this deployment?
 *
 * Separate from `server.ts` and `admin.ts` because the middleware needs it too,
 * and those modules import `server-only`, which the edge runtime rejects.
 *
 * Exists because of a real failure. The site builds and runs perfectly without
 * these variables — `data.ts` falls back to `registry-snapshot.json`, so every
 * public page renders identical content — while Content Studio, which has no
 * such fallback and cannot have one, returned a bare 500. The site looking
 * completely healthy is exactly what makes that hard to diagnose: nothing on
 * the marketing pages reveals that the database was never connected.
 *
 * So the state is named and reported rather than thrown.
 */
export interface SupabaseEnv {
  url: string | undefined;
  key: string | undefined;
  configured: boolean;
  /** The variables that are actually missing, for the message. */
  missing: string[];
  /** Supabase project identifier, or null when the URL is absent or malformed. */
  ref: string | null;
}

export function supabaseEnv(): SupabaseEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  const missing: string[] = [];
  if (!url) missing.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!key) missing.push('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');

  return { url, key, configured: missing.length === 0, missing, ref: projectRef(url) };
}

/**
 * The project identifier out of a Supabase URL — `bsslonrvmnlzcadnolvz` from
 * `https://bsslonrvmnlzcadnolvz.supabase.co`.
 *
 * Surfaced on a failed sign-in, because "wrong password" and "right password,
 * wrong database" are the same sentence otherwise. Credentials that work
 * locally and fail on a deployment mean the two are pointed at different
 * projects, and nothing in the interface could previously say so — it cost a
 * full debugging round trip to establish.
 *
 * Not a secret. The URL is designed to ship in every browser bundle; RLS and
 * the allowlist are what protect the data, never the obscurity of the host.
 */
export function projectRef(url: string | undefined): string | null {
  if (!url) return null;
  const match = /^https:\/\/([a-z0-9-]+)\.supabase\.(co|in)/i.exec(url.trim());
  return match ? match[1] : null;
}
