/**
 * lib/supabase/server.ts
 *
 * Server-only Supabase factories. Exposes two roles:
 *
 *   - `supabaseServerAnon()` — anon key, used for public reads from Server
 *     Components and Route Handlers (cities, vehicles, countries, etc.).
 *     Subject to Postgres RLS under the `anon` role.
 *   - `supabaseService()`    — service-role key, bypasses RLS. Used ONLY by
 *     Route Handlers that write (bookings, admin notifications) and by
 *     Node scripts. Never ship this through a Client Component boundary.
 *
 * Import of `server-only` at the top of the file causes any accidental
 * inclusion of this module in the client bundle to fail the Next.js build
 * with a clear error message. The "server.ts" file-name convention is
 * additionally carved out as a server-only surface by the ESLint rule in
 * `lib/eslint-rules/no-service-key-in-client.mjs`, which also matches the
 * literal export name `supabaseService` — do not rename that export without
 * updating the rule.
 *
 * Satisfies:
 *   - R21.7 — separate anon vs service-role client factories with singleton
 *             caching per role.
 *   - R21.8 — service-role key only read from server-only modules; ESLint
 *             rule `arasya/no-service-key-in-client` enforces this.
 *
 * Design reference: §22 "Supabase Client Factory".
 */

import "server-only";

import { createClient } from "@supabase/supabase-js";

import type {
  Database,
  SupabaseAnonClient,
  SupabaseServiceClient,
} from "./types";

let cachedAnonServer: SupabaseAnonClient | undefined;
let cachedService: SupabaseServiceClient | undefined;

function readSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url || url.length === 0) {
    throw new Error(
      "[supabase/server] NEXT_PUBLIC_SUPABASE_URL is not set. " +
        "Populate it in `.env.local` (see `.env.example`) before creating a server client.",
    );
  }
  return url;
}

function readAnonKey(): string {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!anonKey || anonKey.length === 0) {
    throw new Error(
      "[supabase/server] NEXT_PUBLIC_SUPABASE_ANON_KEY is not set. " +
        "Populate it in `.env.local` (see `.env.example`) before creating a server anon client.",
    );
  }
  return anonKey;
}

function readServiceKey(): string {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey || serviceKey.length === 0) {
    throw new Error(
      "[supabase/server] SUPABASE_SERVICE_ROLE_KEY is not set. " +
        "Populate it in `.env.local` (see `.env.example`) before calling supabaseService().",
    );
  }
  return serviceKey;
}

/**
 * Returns the singleton server-side Supabase anon client.
 *
 * Safe for public reads executed on the server (Server Components, Route
 * Handlers, middleware-adjacent code). Operates under Postgres RLS as the
 * `anon` role — it has exactly the privileges granted to the anon key.
 */
export function supabaseServerAnon(): SupabaseAnonClient {
  if (cachedAnonServer) {
    return cachedAnonServer;
  }

  const url = readSupabaseUrl();
  const anonKey = readAnonKey();

  cachedAnonServer = createClient<Database>(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return cachedAnonServer;
}

/**
 * Returns the singleton service-role Supabase client.
 *
 * Bypasses RLS. MUST only be called from Route Handlers (`app/api/**`) and
 * Node scripts (`scripts/**`). The ESLint rule
 * `arasya/no-service-key-in-client` blocks imports of this symbol from any
 * client-reachable module, and the `server-only` import at the top of this
 * file guarantees a build failure if the module ever ends up in the client
 * bundle.
 */
export function supabaseService(): SupabaseServiceClient {
  if (cachedService) {
    return cachedService;
  }

  const url = readSupabaseUrl();
  const serviceKey = readServiceKey();

  cachedService = createClient<Database>(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return cachedService;
}
