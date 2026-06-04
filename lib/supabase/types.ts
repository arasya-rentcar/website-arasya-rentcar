/**
 * lib/supabase/types.ts
 *
 * Shared type aliases for the Supabase client factories.
 *
 * - Re-exports the generated `Database` type from `types/database` so loader
 *   code can import it from a single, stable path (`@/lib/supabase/types`)
 *   without having to know where the generator writes its output.
 * - Exposes distinct type aliases for the two roles we expose — anon
 *   (read-only, safe for the browser and for Server Component public reads)
 *   and service-role (privileged, server-only writes). Both aliases are
 *   structurally the same `SupabaseClient<Database>` at runtime; the split
 *   is purely for authoring clarity at call sites so reviewers can see at a
 *   glance which key is powering a given call.
 * - Exports a narrow `SupabaseClientRole` union used by the factory modules
 *   for diagnostic logging and for the "which factory am I?" checks performed
 *   in tests.
 *
 * Satisfies:
 *   - R21.7 — separate anon vs service-role client factories.
 *   - R21.8 — service-role key never imported from client-reachable modules
 *             (this file contains types only; safe to import from anywhere).
 *
 * Design reference: §22 "Supabase Client Factory".
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

export type { Database };

/**
 * Client constructed with the public anon key. Safe to ship to the browser
 * and to use for public reads from Server Components. Subject to Postgres
 * RLS as the anon role.
 */
export type SupabaseAnonClient = SupabaseClient<Database>;

/**
 * Client constructed with the service-role key. Bypasses RLS and must only
 * ever be instantiated inside server-only modules (Route Handlers, scripts,
 * server-side utilities). See design §22 and R21.8.
 */
export type SupabaseServiceClient = SupabaseClient<Database>;

/**
 * Identifies which factory produced a given Supabase client. Useful for
 * structured logs and diagnostics; not intended as a runtime security check
 * (the key in use is the real authority).
 */
export type SupabaseClientRole =
  | "anon-browser"
  | "anon-server"
  | "service-role";
