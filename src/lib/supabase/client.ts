'use client';

import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser client for Content Studio (auth + Storage uploads).
 *
 * Publishable key only — it is in the bundle every visitor downloads, so RLS
 * and the `admins` allowlist are what actually protect the data, never this key.
 */
export function createBrowserSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY — see .env.example'
    );
  }
  return createBrowserClient(url, publishableKey);
}
