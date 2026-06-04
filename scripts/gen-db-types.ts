#!/usr/bin/env node
/**
 * scripts/gen-db-types.ts
 *
 * Regenerates `types/database.ts` from the live Supabase schema so that all
 * Supabase loader code is statically type-safe against the actual database
 * (R17.7, R21.12). The generated file is the source of truth for loader
 * return shapes; nothing in this repo should hand-edit `types/database.ts`.
 *
 * Design references:
 *   - §3.3 — `scripts/gen-db-types.ts` shells out to
 *            `supabase gen types typescript --project-id $PROJECT`.
 *
 * Usage:
 *   pnpm db:types              # remote project; reads $SUPABASE_PROJECT_ID
 *   pnpm db:types -- --local   # local Supabase Docker stack (supabase start)
 *
 * Environment:
 *   SUPABASE_PROJECT_ID        # required for remote mode (e.g. "abcd1234")
 *
 * Exit codes:
 *   0  success, types written
 *   1  misconfiguration (missing env, missing CLI, or generator failure)
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

// -----------------------------------------------------------------------------
// Paths
// -----------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..');
const OUTPUT_PATH = resolve(PROJECT_ROOT, 'types/database.ts');
const ENV_LOCAL_PATH = resolve(PROJECT_ROOT, '.env.local');
const ENV_PATH = resolve(PROJECT_ROOT, '.env');

// -----------------------------------------------------------------------------
// CLI flags
// -----------------------------------------------------------------------------

const args = process.argv.slice(2);
const USE_LOCAL = args.includes('--local');

// -----------------------------------------------------------------------------
// Minimal .env loader (mirrors scripts/validate-env.ts)
// -----------------------------------------------------------------------------

/**
 * Parse a `.env`-style file body. Intentionally tiny: no multi-line values,
 * no variable expansion. Kept in sync with `scripts/validate-env.ts` so both
 * scripts agree on what the local env files contain.
 */
function parseDotenv(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const rawLine of body.split(/\r?\n/)) {
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

/**
 * Precedence: process.env wins over .env.local, which wins over .env.
 * Matches the validator's merge order so `db:types` sees the same project id
 * as the build.
 */
function readProjectId(): string | undefined {
  const fromEnvFile = loadDotenvFile(ENV_PATH);
  const fromEnvLocal = loadDotenvFile(ENV_LOCAL_PATH);
  const fromProcess = process.env.SUPABASE_PROJECT_ID;

  const resolved =
    (typeof fromProcess === 'string' && fromProcess !== '' ? fromProcess : undefined) ??
    fromEnvLocal.SUPABASE_PROJECT_ID ??
    fromEnvFile.SUPABASE_PROJECT_ID;

  return resolved !== undefined && resolved !== '' ? resolved : undefined;
}

// -----------------------------------------------------------------------------
// CLI helpers
// -----------------------------------------------------------------------------

function printInstallHelp(): void {
  console.error('');
  console.error('  The Supabase CLI is required to regenerate database types.');
  console.error('  Install it with one of:');
  console.error('    npm i -g supabase');
  console.error('    brew install supabase/tap/supabase');
  console.error('  Docs: https://supabase.com/docs/guides/cli');
  console.error('');
}

/**
 * Detect whether `supabase` resolves on PATH by running `supabase --version`.
 * `spawnSync` is used with `shell: true` so Windows picks up `.cmd` shims.
 */
function supabaseCliAvailable(): boolean {
  const probe = spawnSync('supabase', ['--version'], {
    stdio: 'ignore',
    shell: true,
  });
  return probe.status === 0;
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------

function main(): void {
  if (!supabaseCliAvailable()) {
    console.error('✖ `supabase` CLI not found on PATH.');
    printInstallHelp();
    process.exit(1);
  }

  const cliArgs: string[] = ['gen', 'types', 'typescript'];

  if (USE_LOCAL) {
    cliArgs.push('--local');
    console.log('→ Generating types from local Supabase stack (--local)…');
  } else {
    const projectId = readProjectId();
    if (projectId === undefined) {
      console.error('✖ SUPABASE_PROJECT_ID is not set.');
      console.error('  Set it in `.env.local` or your shell, e.g.');
      console.error('    SUPABASE_PROJECT_ID=abcd1234');
      console.error('  Or pass --local to target the running Supabase Docker stack.');
      process.exit(1);
    }
    cliArgs.push('--project-id', projectId, '--schema', 'public,auth');
    console.log(`→ Generating types from Supabase project "${projectId}"…`);
  }

  const result = spawnSync('supabase', cliArgs, {
    encoding: 'utf8',
    shell: true,
    maxBuffer: 64 * 1024 * 1024,
  });

  if (result.error !== undefined) {
    console.error(`✖ Failed to invoke supabase CLI: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(`✖ supabase gen types exited with status ${result.status ?? 'unknown'}.`);
    if (typeof result.stderr === 'string' && result.stderr.trim() !== '') {
      console.error(result.stderr.trimEnd());
    }
    process.exit(1);
  }

  const stdout = typeof result.stdout === 'string' ? result.stdout : '';
  if (stdout.trim() === '') {
    console.error('✖ supabase gen types produced no output; refusing to overwrite types/database.ts.');
    process.exit(1);
  }

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, stdout, 'utf8');

  console.log(`✓ Wrote ${OUTPUT_PATH}`);
}

main();
