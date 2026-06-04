/**
 * lib/supabase/client.ts
 *
 * Browser-facing Supabase factory. Produces a singleton `SupabaseAnonClient`
 * backed by the public anon key, suitable for Client Components and for any
 * code reachable from a Client Component boundary.
 *
 * This module MUST NEVER reference `SUPABASE_SERVICE_ROLE_KEY`, either
 * directly or indirectly. The `arasya/no-service-key-in-client` ESLint rule
 * (see `lib/eslint-rules/no-service-key-in-client.mjs`) will fail the build
 * if that invariant is broken. The service-role key lives behind
 * `supabaseService()` in `lib/supabase/server.ts` (design §22, R21.7/R21.8).
 *
 * Singleton behaviour:
 *   - On first call the factory constructs a `SupabaseClient` and caches it
 *     on `globalThis.__arasyaSupabaseBrowser__`. Using `globalThis` (rather
 *     than a plain module-level `let`) keeps a single instance across HMR
 *     boundaries in dev and across server / client module evaluations in
 *     edge runtimes.
 *   - Subsequent calls return the cached instance.
 *
 * Auth configuration:
 *   - The MVP does not use Supabase Auth sessions (design R2.5 / R24.5); the
 *     site is public-read with WhatsApp-first lead capture. We therefore
 *     disable session persistence and auto-refresh so the client does not
 *     touch `localStorage` or schedule timers the app has no use for.
 */

import { createClient } from "@supabase/supabase-js";

import type { Database, SupabaseAnonClient } from "./types";

const GLOBAL_KEY = "__arasyaSupabaseBrowser__" as const;

type GlobalWithSupabase = typeof globalThis & {
  [GLOBAL_KEY]?: SupabaseAnonClient;
};

function readPublicEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || url.length === 0) {
    throw new Error(
      "[supabase/client] NEXT_PUBLIC_SUPABASE_URL is not set. " +
        "Populate it in `.env.local` (see `.env.example`) before creating a browser client.",
    );
  }
  if (!anonKey || anonKey.length === 0) {
    throw new Error(
      "[supabase/client] NEXT_PUBLIC_SUPABASE_ANON_KEY is not set. " +
        "Populate it in `.env.local` (see `.env.example`) before creating a browser client.",
    );
  }

  return { url, anonKey };
}

/**
 * Returns the singleton browser-side Supabase anon client.
 *
 * Safe to call from Client Components, hooks, event handlers, and any module
 * that is reachable from the client bundle. Also safe to call from Server
 * Components for reads, though `supabaseServerAnon()` in `lib/supabase/server`
 * is the preferred server-side entry point (design §22).
 */
export function getSupabaseBrowserClient(): SupabaseAnonClient {
  const globalRef = globalThis as GlobalWithSupabase;
  const existing = globalRef[GLOBAL_KEY];
  if (existing) {
    return existing;
  }

  const { url, anonKey } = readPublicEnv();
  const client = createClient<Database>(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  globalRef[GLOBAL_KEY] = client;
  return client;
}
