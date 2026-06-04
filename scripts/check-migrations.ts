#!/usr/bin/env node
/**
 * scripts/check-migrations.ts
 *
 * CI guard that verifies the repo's `supabase/migrations/*.sql` files are
 * in sync with the schema that has actually been applied to the target
 * Supabase project. Detects drift introduced by hand-edits in Supabase
 * Studio or by migrations committed without being pushed upstream.
 *
 * Satisfies:
 *   - R21.5  — the build pipeline executes a Supabase migration verification
 *              step that fails when the repo's migration files diverge from
 *              the target Supabase_Project schema, emitting a diff report.
 *   - R21.17 — the same verification step blocks schema changes that would
 *              break existing Content_Layer loader contracts (surfaced as a
 *              non-empty diff against the public schema).
 *
 * Design references:
 *   - §3  — Supabase schema is the source of truth; migrations live under
 *           `supabase/migrations/`.
 *   - §6  — build pipeline; this check sits alongside the other Supabase
 *           guards (snapshot pull, type generation).
 *
 * Behaviour:
 *   1. Locate `supabase/migrations/` and list every `*.sql` file sorted
 *      lexicographically. A missing or empty directory is logged and
 *      treated as a successful skip (nothing to compare yet).
 *   2. Read `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_URL`, and
 *      `SUPABASE_PROJECT_REF` from the environment. If ANY of the three
 *      is absent (e.g. a fork/PR without secrets), emit a clear skip
 *      notice and `process.exit(0)` so the job stays green.
 *   3. Probe for the Supabase CLI on PATH. If missing → log error and
 *      exit with status 1 so CI fails.
 *   4. Link the project non-interactively
 *      (`supabase link --project-ref <ref>`) and shell out to
 *      `supabase db diff --schema public --linked` to capture the SQL
 *      diff between the repo migrations and the remote project schema.
 *   5. Empty diff → print "✓ migrations in sync" and exit 0.
 *      Non-empty diff → print the diff (R21.5 report) and exit 1.
 *
 * Usage:
 *   pnpm db:check-migrations
 *
 * Zero non-stdlib dependencies — the check runs in any CI environment
 * that already has the Supabase CLI installed (see
 * `supabase/setup-cli@v1` in `.github/workflows/ci.yml`).
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

// -----------------------------------------------------------------------------
// Paths
// -----------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..');
const MIGRATIONS_DIR = resolve(PROJECT_ROOT, 'supabase', 'migrations');

// -----------------------------------------------------------------------------
// Migration file discovery
// -----------------------------------------------------------------------------

/**
 * List every `*.sql` file directly inside `supabase/migrations/`, sorted
 * lexicographically (which matches the Supabase CLI's own ordering —
 * migration filenames start with a monotonic timestamp/sequence prefix).
 * Returns an empty list when the directory does not exist yet.
 */
function listMigrationFiles(): string[] {
  if (!existsSync(MIGRATIONS_DIR)) return [];
  try {
    const st = statSync(MIGRATIONS_DIR);
    if (!st.isDirectory()) return [];
  } catch {
    return [];
  }

  let entries: string[];
  try {
    entries = readdirSync(MIGRATIONS_DIR, { encoding: 'utf8' });
  } catch {
    return [];
  }

  return entries.filter((name) => name.toLowerCase().endsWith('.sql')).sort((a, b) => a.localeCompare(b));
}

// -----------------------------------------------------------------------------
// Environment handling
// -----------------------------------------------------------------------------

interface RequiredEnv {
  readonly accessToken: string;
  readonly dbUrl: string;
  readonly projectRef: string;
}

/**
 * Pull the three env vars that make this check meaningful. Missing any
 * one is a skip (not a failure): forks and external PRs routinely run
 * CI without access to the project secrets, and the guard is intended
 * to be advisory in that mode.
 */
function loadRequiredEnv(): RequiredEnv | null {
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
  const dbUrl = process.env.SUPABASE_DB_URL;
  const projectRef = process.env.SUPABASE_PROJECT_REF;

  const missing: string[] = [];
  if (accessToken === undefined || accessToken === '') missing.push('SUPABASE_ACCESS_TOKEN');
  if (dbUrl === undefined || dbUrl === '') missing.push('SUPABASE_DB_URL');
  if (projectRef === undefined || projectRef === '') missing.push('SUPABASE_PROJECT_REF');

  if (missing.length > 0) {
    console.log('[check-migrations] skipping — missing env var(s):');
    for (const name of missing) console.log(`[check-migrations]   · ${name}`);
    console.log('[check-migrations] this is expected on forks / PRs without project secrets.');
    return null;
  }

  return {
    accessToken: accessToken as string,
    dbUrl: dbUrl as string,
    projectRef: projectRef as string,
  };
}

/**
 * Extract the database password from a Postgres connection URL so the
 * Supabase CLI's non-interactive link/diff commands can authenticate
 * without prompting. Returns `undefined` if the URL has no password
 * component, in which case we fall through to `SUPABASE_DB_PASSWORD`.
 */
function extractDbPassword(dbUrl: string): string | undefined {
  try {
    const parsed = new URL(dbUrl);
    const pw = parsed.password;
    if (typeof pw === 'string' && pw !== '') {
      return decodeURIComponent(pw);
    }
  } catch {
    /* not a URL — fall through */
  }
  return undefined;
}

// -----------------------------------------------------------------------------
// Supabase CLI helpers
// -----------------------------------------------------------------------------

function supabaseCliAvailable(): boolean {
  const probe = spawnSync('supabase', ['--version'], {
    stdio: 'ignore',
    shell: true,
  });
  return probe.status === 0;
}

interface CliResult {
  readonly status: number;
  readonly stdout: string;
  readonly stderr: string;
}

function runSupabase(args: readonly string[], env: NodeJS.ProcessEnv): CliResult {
  const result = spawnSync('supabase', [...args], {
    encoding: 'utf8',
    shell: true,
    env,
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error !== undefined) {
    return {
      status: 1,
      stdout: typeof result.stdout === 'string' ? result.stdout : '',
      stderr: `failed to invoke supabase CLI: ${result.error.message}`,
    };
  }
  return {
    status: result.status ?? 1,
    stdout: typeof result.stdout === 'string' ? result.stdout : '',
    stderr: typeof result.stderr === 'string' ? result.stderr : '',
  };
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------

function main(): void {
  const migrations = listMigrationFiles();
  if (migrations.length === 0) {
    console.log('[check-migrations] skipping — no migration files found under supabase/migrations/.');
    console.log('[check-migrations]   (nothing to diff against the remote project yet)');
    process.exit(0);
  }

  console.log(`[check-migrations] found ${migrations.length} migration file(s):`);
  for (const name of migrations) console.log(`[check-migrations]   · ${name}`);

  const envVars = loadRequiredEnv();
  if (envVars === null) {
    // Already logged the skip reason in loadRequiredEnv().
    process.exit(0);
  }

  if (!supabaseCliAvailable()) {
    console.error('[check-migrations] ✖ supabase CLI not found on PATH.');
    console.error('[check-migrations]   install locally with `npm i -g supabase`,');
    console.error('[check-migrations]   or add `supabase/setup-cli@v1` in CI.');
    process.exit(1);
  }

  // Build the child-process env. We forward the parent env and inject
  // `SUPABASE_DB_PASSWORD` so `supabase link`/`db diff --linked` run
  // non-interactively — the Supabase CLI reads that variable when a
  // password is required and no `--password` flag is present.
  const dbPassword = extractDbPassword(envVars.dbUrl) ?? process.env.SUPABASE_DB_PASSWORD;
  const childEnv: NodeJS.ProcessEnv = {
    ...process.env,
    SUPABASE_ACCESS_TOKEN: envVars.accessToken,
    ...(dbPassword !== undefined ? { SUPABASE_DB_PASSWORD: dbPassword } : {}),
  };

  // 1. Link the project. Safe to re-run; the CLI is idempotent.
  console.log(`[check-migrations] linking project ${envVars.projectRef}…`);
  const linkResult = runSupabase(
    ['link', '--project-ref', envVars.projectRef],
    childEnv,
  );
  if (linkResult.status !== 0) {
    console.error(`[check-migrations] ✖ supabase link exited with status ${linkResult.status}.`);
    if (linkResult.stderr.trim() !== '') console.error(linkResult.stderr.trimEnd());
    if (linkResult.stdout.trim() !== '') console.error(linkResult.stdout.trimEnd());
    process.exit(1);
  }

  // 2. Diff the repo migrations against the linked project schema.
  console.log('[check-migrations] running `supabase db diff --schema public --linked`…');
  const diffResult = runSupabase(
    ['db', 'diff', '--schema', 'public', '--linked'],
    childEnv,
  );
  if (diffResult.status !== 0) {
    console.error(`[check-migrations] ✖ supabase db diff exited with status ${diffResult.status}.`);
    if (diffResult.stderr.trim() !== '') console.error(diffResult.stderr.trimEnd());
    if (diffResult.stdout.trim() !== '') console.error(diffResult.stdout.trimEnd());
    process.exit(1);
  }

  // 3. Interpret the diff. An empty / whitespace-only stdout means the
  //    repo migrations already describe the remote schema. Any SQL in
  //    stdout is a divergence we must surface (R21.5 diff report).
  const diff = diffResult.stdout.trim();
  if (diff === '') {
    console.log('[check-migrations] ✓ migrations in sync — no drift detected against the remote schema.');
    process.exit(0);
  }

  console.error('[check-migrations] ✖ schema drift detected (R21.5).');
  console.error('[check-migrations]   The repo migrations under supabase/migrations/ do NOT match');
  console.error(`[check-migrations]   the schema of the target project "${envVars.projectRef}".`);
  console.error('[check-migrations]   Diff (remote → repo):');
  console.error('');
  console.error(diffResult.stdout.trimEnd());
  if (diffResult.stderr.trim() !== '') {
    console.error('');
    console.error('[check-migrations]   stderr from `supabase db diff`:');
    console.error(diffResult.stderr.trimEnd());
  }
  console.error('');
  console.error('[check-migrations] Fix: commit a new migration that reconciles the diff,');
  console.error('[check-migrations]      or revert any out-of-band changes made in Supabase Studio.');
  process.exit(1);
}

main();
