#!/usr/bin/env node
/**
 * scripts/validate-env.ts
 *
 * Build-time guard that fails `pnpm build` when required environment
 * variables are missing or malformed. Wired as the `prebuild` npm
 * script so the Next.js build never starts with an incomplete env.
 *
 * Satisfies:
 *   - R11.3  (revalidate secret must be configured)
 *   - R13.7  (WhatsApp number must be set in E.164)
 *   - R17.10 (pin runtimes + block build on missing required vars)
 *
 * Design references:
 *   - §6  — build pipeline starts with env validation
 *   - §20 — canonical env var inventory
 *
 * Behaviour:
 *   - Reads `.env`, `.env.local`, and `process.env` (later overrides earlier).
 *   - Parses `.env.example` for the canonical required-vs-optional split,
 *     using a `# required` / `# optional` marker on the line immediately
 *     above each `KEY=` line.
 *   - Applies lightweight format checks (skippable with `--skip-format`
 *     for local dev convenience).
 *   - Emits a grouped, human-readable report and exits 1 on any failure.
 *
 * Zero third-party deps: hand-rolled minimal .env parser keeps the
 * prebuild hook dependency-free and fast.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

// -----------------------------------------------------------------------------
// Paths
// -----------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..');
const ENV_EXAMPLE_PATH = resolve(PROJECT_ROOT, '.env.example');
const ENV_PATH = resolve(PROJECT_ROOT, '.env');
const ENV_LOCAL_PATH = resolve(PROJECT_ROOT, '.env.local');

// -----------------------------------------------------------------------------
// CLI flags
// -----------------------------------------------------------------------------

const args = process.argv.slice(2);
const SKIP_FORMAT = args.includes('--skip-format');

// -----------------------------------------------------------------------------
// Minimal .env parser
// -----------------------------------------------------------------------------

/**
 * Parse a `.env`-style file body into a plain key/value record.
 * Supports:
 *   - Blank lines and `#` comment lines (skipped).
 *   - `KEY=value` with optional single or double quotes.
 *   - Trailing inline comments on unquoted values (` # ...`).
 * Deliberately tiny: no multi-line values, no variable expansion.
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
      // Strip trailing inline comment on unquoted values.
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

// -----------------------------------------------------------------------------
// .env.example required/optional extraction
// -----------------------------------------------------------------------------

interface VarSpec {
  readonly key: string;
  readonly required: boolean;
}

/**
 * Walks `.env.example` top-to-bottom. A `# required` or `# optional`
 * marker applies to the FIRST `KEY=` line that follows it (ignoring
 * other comment/blank lines in between). Any KEY without a marker is
 * treated as optional to match the spec's explicit "# required" rule.
 */
function parseEnvExample(body: string): VarSpec[] {
  const specs: VarSpec[] = [];
  const lines = body.split(/\r?\n/);
  let pendingRequired: boolean | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line === '') {
      // Blank line resets any pending marker.
      pendingRequired = null;
      continue;
    }

    if (line.startsWith('#')) {
      const comment = line.slice(1).trim().toLowerCase();
      if (comment === 'required') pendingRequired = true;
      else if (comment === 'optional') pendingRequired = false;
      // Other comments leave the pending marker alone so headers between
      // `# required` and the KEY line don't clobber the marker — but in
      // the canonical .env.example the marker sits directly above the
      // KEY, so this is merely defensive.
      continue;
    }

    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;

    specs.push({ key, required: pendingRequired === true });
    pendingRequired = null;
  }

  return specs;
}

// -----------------------------------------------------------------------------
// Format validators
// -----------------------------------------------------------------------------

interface FormatCheck {
  readonly validate: (value: string) => string | null; // null = OK, string = reason
  readonly example: string;
}

const FORMAT_CHECKS: Readonly<Record<string, FormatCheck>> = {
  NEXT_PUBLIC_SITE_URL: {
    validate: (value) => {
      let url: URL;
      try {
        url = new URL(value);
      } catch {
        return 'must be a valid absolute URL';
      }
      if (url.protocol !== 'https:') return 'must use the https:// protocol';
      if (value.endsWith('/')) return 'must not include a trailing slash';
      if (url.pathname !== '/' && url.pathname !== '') {
        return 'must be an origin (no path component)';
      }
      return null;
    },
    example: 'https://arasyarentcar.com',
  },
  ARASYA_WHATSAPP_NUMBER: {
    validate: (value) =>
      /^\+[1-9]\d{7,14}$/.test(value)
        ? null
        : 'must be E.164 format: a leading "+" followed by 8–15 digits',
    example: '+628123456789',
  },
  NEXT_PUBLIC_SUPABASE_URL: {
    validate: (value) =>
      /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(value)
        ? null
        : 'must match https://<project-ref>.supabase.co',
    example: 'https://abcd1234.supabase.co',
  },
  LEAD_IP_HASH_SALT: {
    validate: (value) =>
      value.length >= 32 ? null : `must be at least 32 characters (got ${value.length})`,
    example: '<32+ char random string>',
  },
  REVALIDATE_SECRET: {
    validate: (value) =>
      value.length >= 32 ? null : `must be at least 32 characters (got ${value.length})`,
    example: '<32+ char random string>',
  },
};

// -----------------------------------------------------------------------------
// Reporting
// -----------------------------------------------------------------------------

interface Issue {
  readonly key: string;
  readonly kind: 'missing' | 'format';
  readonly reason: string;
  readonly example?: string;
}

function printReport(issues: readonly Issue[], examplePath: string): void {
  const missing = issues.filter((i) => i.kind === 'missing');
  const badFormat = issues.filter((i) => i.kind === 'format');

  console.error('');
  console.error('✖ Environment validation failed');
  console.error(`  Source of truth: ${examplePath}`);
  console.error('');

  if (missing.length > 0) {
    console.error(`  Missing required variables (${missing.length}):`);
    for (const issue of missing) {
      console.error(`    - ${issue.key}`);
      console.error(`        issue:   ${issue.reason}`);
      if (issue.example) {
        console.error(`        example: ${issue.example}`);
      }
    }
    console.error('');
  }

  if (badFormat.length > 0) {
    console.error(`  Invalid format (${badFormat.length}):`);
    for (const issue of badFormat) {
      console.error(`    - ${issue.key}`);
      console.error(`        issue:   ${issue.reason}`);
      if (issue.example) {
        console.error(`        example: ${issue.example}`);
      }
    }
    console.error('');
  }

  console.error('  Fix: copy `.env.example` to `.env.local` and fill in the values above,');
  console.error('       or export them in your shell / deployment platform before building.');
  console.error('');
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------

function main(): void {
  if (!existsSync(ENV_EXAMPLE_PATH)) {
    console.error(`✖ Cannot validate env: ${ENV_EXAMPLE_PATH} is missing.`);
    process.exit(1);
  }

  const specs = parseEnvExample(readFileSync(ENV_EXAMPLE_PATH, 'utf8'));
  const requiredKeys = specs.filter((s) => s.required).map((s) => s.key);

  // Precedence: process.env wins over .env.local, which wins over .env.
  const fromEnvFile = loadDotenvFile(ENV_PATH);
  const fromEnvLocal = loadDotenvFile(ENV_LOCAL_PATH);
  const merged: Record<string, string> = { ...fromEnvFile, ...fromEnvLocal };
  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === 'string' && value !== '') merged[key] = value;
  }

  const issues: Issue[] = [];

  // Presence checks
  for (const key of requiredKeys) {
    const value = merged[key];
    if (value === undefined || value === '') {
      const example = FORMAT_CHECKS[key]?.example;
      issues.push({
        key,
        kind: 'missing',
        reason: 'required variable is unset or empty',
        ...(example !== undefined ? { example } : {}),
      });
    }
  }

  // Format checks (skipped entirely when --skip-format is passed)
  if (!SKIP_FORMAT) {
    for (const key of requiredKeys) {
      const value = merged[key];
      if (value === undefined || value === '') continue; // already reported
      const check = FORMAT_CHECKS[key];
      if (!check) continue;
      const reason = check.validate(value);
      if (reason !== null) {
        issues.push({ key, kind: 'format', reason, example: check.example });
      }
    }
  }

  if (issues.length > 0) {
    printReport(issues, ENV_EXAMPLE_PATH);
    process.exit(1);
  }

  const suffix = SKIP_FORMAT ? ' (format checks skipped)' : '';
  console.log(
    `✓ Environment OK — ${requiredKeys.length} required variable${
      requiredKeys.length === 1 ? '' : 's'
    } present${suffix}.`,
  );
}

main();
