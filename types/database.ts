/**
 * types/database.ts
 *
 * DO NOT HAND-EDIT.
 *
 * This file is overwritten by `pnpm db:types`, which invokes
 * `scripts/gen-db-types.ts` and pipes `supabase gen types typescript` output
 * into this module (design §3.3). Hand-written changes will be lost on the
 * next regeneration.
 *
 * Until the generator has been run against a real Supabase project, this
 * module exposes a minimal stub so that loader code can import the
 * `Database` type without a build-time module-not-found error. The stub is
 * intentionally empty — consumers will see no table rows, views, functions,
 * or enums, which forces any code that genuinely needs schema-shaped types
 * to regenerate this file first.
 *
 * Satisfies:
 *   - R17.7  — Supabase loader code is type-safe against the schema.
 *   - R21.12 — generated types are the source of truth for loader return
 *              shapes.
 *
 * Regenerate with:
 *   pnpm db:types              # remote project (requires SUPABASE_PROJECT_ID)
 *   pnpm db:types -- --local   # local Supabase Docker stack
 */

export type Database = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
