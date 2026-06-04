#!/usr/bin/env node
/**
 * scripts/content-snapshot.ts
 *
 * Pre-build Structured_Content_Store snapshot. Pulls every row from each of
 * the 13 structured-content tables via the Supabase service-role key and
 * writes a single JSON blob to `.next/cache/content-snapshot.json`. The
 * structured loaders (Phase 4.2+) read from this file so the build does not
 * depend on Supabase being reachable every time.
 *
 * Satisfies:
 *   - R5.13 — snapshot is cached to `.next/cache/content-snapshot.json`;
 *             on Supabase failure the previously cached snapshot is reused
 *             and a warning is emitted.
 *
 * Design references:
 *   - §5.3 — snapshot strategy outline
 *   - §6   — build pipeline (runs directly after env validation)
 *
 * Behaviour:
 *   - Loads env from `.env`, `.env.local`, then `process.env`
 *     (later sources override earlier).
 *   - Reads `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
 *     This is a build-time script so the service-role key is safe here.
 *   - Fetches every row from the 13 Structured_Content_Store tables with
 *     no filters (build-time needs the full set, including `inactive`
 *     cities so loaders can render 404s for them, and `coverable` cities
 *     for the Coverage_Page).
 *   - Writes `{ cities, cityTranslations, …, generatedAt }` to
 *     `.next/cache/content-snapshot.json`.
 *   - On Supabase connection/fetch failure: if the cache file already
 *     exists, emits a warning and exits 0 without overwriting. If no
 *     cache is present, exits 1 with a clear error.
 *   - `--skip` flag no-ops (for CI environments without Supabase creds;
 *     mirrors validate-env's `--skip-format` safety valve).
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

// -----------------------------------------------------------------------------
// Paths
// -----------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..');
const ENV_PATH = resolve(PROJECT_ROOT, '.env');
const ENV_LOCAL_PATH = resolve(PROJECT_ROOT, '.env.local');
const CACHE_DIR = resolve(PROJECT_ROOT, '.next', 'cache');
const SNAPSHOT_PATH = resolve(CACHE_DIR, 'content-snapshot.json');

// -----------------------------------------------------------------------------
// CLI flags
// -----------------------------------------------------------------------------

const args = process.argv.slice(2);
const SKIP = args.includes('--skip');

// -----------------------------------------------------------------------------
// Minimal .env parser (mirrors scripts/validate-env.ts)
// -----------------------------------------------------------------------------

/**
 * Parse a `.env`-style file body into a plain key/value record.
 * Supports blank lines, `#` comments, `KEY=value` with optional single or
 * double quotes, and trailing inline comments on unquoted values.
 * Deliberately minimal: no multi-line values, no variable expansion.
 */
function parseDotenv(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  const lines = body.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line === '' || line.startsWith('#')) continue;

    const eq = line.indexOf('=');
    if (eq === -1) continue;

    const key = line.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;

    let value = line.slice(eq + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
      (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
    ) {
      value = value.slice(1, -1);
    } else {
      const hash = value.indexOf(' #');
      if (hash !== -1) value = value.slice(0, hash).trimEnd();
    }

    out[key] = value;
  }

  return out;
}

function loadDotenvFile(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  try {
    return parseDotenv(readFileSync(path, 'utf8'));
  } catch {
    return {};
  }
}

function loadEnv(): Record<string, string> {
  const merged: Record<string, string> = {
    ...loadDotenvFile(ENV_PATH),
    ...loadDotenvFile(ENV_LOCAL_PATH),
  };
  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === 'string' && value !== '') merged[key] = value;
  }
  return merged;
}

// -----------------------------------------------------------------------------
// Table inventory (13 Structured_Content_Store tables per design §3.1)
// -----------------------------------------------------------------------------

/**
 * Each entry maps the Supabase table name to the JSON output key.
 * Order matches design.md §3.1 and requirements.md R5.4 so the snapshot
 * file reads top-to-bottom in the same order as the DDL.
 */
const TABLES = [
  { table: 'cities', key: 'cities' },
  { table: 'city_translations', key: 'cityTranslations' },
  { table: 'countries', key: 'countries' },
  { table: 'country_translations', key: 'countryTranslations' },
  { table: 'vehicles', key: 'vehicles' },
  { table: 'vehicle_translations', key: 'vehicleTranslations' },
  { table: 'services', key: 'services' },
  { table: 'service_translations', key: 'serviceTranslations' },
  { table: 'airports', key: 'airports' },
  { table: 'city_vehicles', key: 'cityVehicles' },
  { table: 'city_airports', key: 'cityAirports' },
  { table: 'city_related', key: 'cityRelated' },
  { table: 'city_aliases', key: 'cityAliases' },
] as const;

type TableRow = Record<string, unknown>;
type Snapshot = Record<string, TableRow[] | string>;

// -----------------------------------------------------------------------------
// Supabase fetch
// -----------------------------------------------------------------------------

async function fetchAll(
  client: SupabaseClient,
  table: string,
): Promise<TableRow[]> {
  const { data, error } = await client.from(table).select('*');
  if (error) {
    throw new Error(`[content-snapshot] failed to read "${table}": ${error.message}`);
  }
  return (data ?? []) as TableRow[];
}

async function buildSnapshot(client: SupabaseClient): Promise<{
  snapshot: Snapshot;
  counts: Record<string, number>;
}> {
  const results = await Promise.all(TABLES.map((t) => fetchAll(client, t.table)));

  const snapshot: Snapshot = {};
  const counts: Record<string, number> = {};
  results.forEach((rows, i) => {
    const { table, key } = TABLES[i]!;
    snapshot[key] = rows;
    counts[table] = rows.length;
  });
  snapshot.generatedAt = new Date().toISOString();
  return { snapshot, counts };
}

// -----------------------------------------------------------------------------
// Fallback handling
// -----------------------------------------------------------------------------

/**
 * Called when the Supabase pull fails. Implements R5.13: reuse the previous
 * cache if it exists; otherwise fail the build with a clear error.
 */
function fallbackOrFail(reason: unknown): never {
  if (existsSync(SNAPSHOT_PATH)) {
    console.warn(
      '[content-snapshot] Supabase unreachable; falling back to cached snapshot',
    );
    console.warn(`[content-snapshot]   cache: ${SNAPSHOT_PATH}`);
    console.warn(`[content-snapshot]   reason: ${formatError(reason)}`);
    process.exit(0);
  }

  console.error('[content-snapshot] Supabase unreachable and no cached snapshot found.');
  console.error(`[content-snapshot]   expected cache path: ${SNAPSHOT_PATH}`);
  console.error(`[content-snapshot]   reason: ${formatError(reason)}`);
  console.error(
    '[content-snapshot] Fix: set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY,',
  );
  console.error(
    '[content-snapshot]      or re-run with `--skip` in CI environments without Supabase.',
  );
  process.exit(1);
}

function formatError(err: unknown): string {
  if (err instanceof Error) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------

async function main(): Promise<void> {
  if (SKIP) {
    console.log('[content-snapshot] --skip flag set; skipped Supabase pull.');
    return;
  }

  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    // Treat missing creds the same as a Supabase failure so CI without creds
    // can still benefit from a previously committed cache. Note: the earlier
    // validate-env.ts step will already have failed the build when these
    // vars are required and missing, so reaching this branch implies the
    // operator deliberately bypassed env validation (or is running this
    // script standalone).
    fallbackOrFail(
      new Error(
        'NEXT_PUBLIC_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY is unset',
      ),
    );
  }

  const client = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let snapshot: Snapshot;
  let counts: Record<string, number>;
  try {
    ({ snapshot, counts } = await buildSnapshot(client));
  } catch (err) {
    fallbackOrFail(err);
  }

  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true });
  }

  writeFileSync(SNAPSHOT_PATH, `${JSON.stringify(snapshot)}\n`, 'utf8');

  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
  console.log(`[content-snapshot] wrote ${SNAPSHOT_PATH}`);
  console.log(`[content-snapshot] generatedAt ${snapshot.generatedAt as string}`);
  console.log(`[content-snapshot] rows (total ${total}):`);
  for (const { table } of TABLES) {
    const count = counts[table] ?? 0;
    console.log(`  - ${table.padEnd(22)} ${count}`);
  }
}

main().catch((err) => {
  // Any unexpected error that escaped buildSnapshot's fallback path
  // (e.g. a filesystem write error) — surface it and fail the build.
  console.error('[content-snapshot] unexpected error:', formatError(err));
  process.exit(1);
});
