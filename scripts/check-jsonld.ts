#!/usr/bin/env node
/**
 * scripts/check-jsonld.ts
 *
 * Post-build JSON-LD validity checker (task 6.12).
 *
 * Walks the rendered HTML produced by `next build`, extracts every
 * `<script type="application/ld+json">` block, and verifies:
 *
 *   1. The block parses as valid JSON (R8.8).
 *   2. `@context` equals `https://schema.org` (warning only when missing
 *      — R8.1 / R8.2 already require it for specific emitters, but the
 *      checker warns rather than hard-errors so unusual snippets from
 *      third-party embeds aren't accidentally blocking).
 *   3. `@type` is present and the minimum required fields per schema
 *      type are populated (design §11, requirement 8):
 *        - LocalBusiness / AutoRentalAgency: name, address, telephone
 *        - Service:                          name, provider
 *        - FAQPage:                          mainEntity is non-empty array
 *        - BreadcrumbList:                   itemListElement is non-empty array
 *        - Article:                          headline, author, datePublished, publisher
 *        - Product:                          name, offers (when offers is
 *                                            present, verify currency +
 *                                            low/high price are populated)
 *
 * R8.7 ("each schema block as a separate `<script type="application/ld+json">`
 * element") is already enforced at emit time by `components/seo/JsonLd.tsx`;
 * this checker complements that by verifying every block actually rendered
 * to HTML satisfies R8.8 and the per-type field contracts.
 *
 * Usage:
 *   pnpm check:jsonld
 *   pnpm exec tsx scripts/check-jsonld.ts --dir .next/server/app
 *
 * Flags:
 *   --dir <path>   Directory to scan for `*.html` files.
 *                  Defaults to `.next/server/app`.
 *
 * Exit codes:
 *   0 — all blocks valid, OR the scan target contained no `.html`
 *       files (the build step hasn't produced any rendered pages yet;
 *       this is expected until Phase 5 seed + Supabase creds land in
 *       CI, so the checker is non-fatal in that case).
 *   1 — one or more blocks failed validation.
 *   2 — invalid CLI invocation.
 *
 * Design references:
 *   - §6 (build-time script layout under `scripts/`).
 *   - §11 (JSON-LD generation + `<JsonLd>` + this post-build checker).
 *
 * Zero runtime dependencies beyond Node's standard library.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import type { Dirent } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

// -----------------------------------------------------------------------------
// Paths + constants
// -----------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..');

const DEFAULT_SCAN_DIR = '.next/server/app';

/**
 * Matches a `<script type="application/ld+json">…</script>` block.
 *
 * - Case-insensitive (`/i`).
 * - Global (`/g`) so we can walk every block in a file.
 * - `[^>]*` before and after `type=…` accommodates arbitrary other
 *   attributes React may emit (e.g. `data-next-hide-fouc`).
 * - The `type` attribute accepts either single or double quotes via
 *   the `(['"])…\1` backreference.
 * - The body is non-greedy (`[\s\S]*?`) so the regex stops at the first
 *   literal `</script>`. `<JsonLd>` already escapes any `</` inside the
 *   JSON payload to `<\/` (see `components/seo/JsonLd.tsx`), so the raw
 *   HTML stream cannot contain a stray `</script>` inside a block.
 */
const JSONLD_SCRIPT_RE =
  /<script\b[^>]*\btype\s*=\s*(['"])application\/ld\+json\1[^>]*>([\s\S]*?)<\/script>/gi;

const SCHEMA_ORG_CONTEXT = 'https://schema.org';

// -----------------------------------------------------------------------------
// CLI args
// -----------------------------------------------------------------------------

interface CliOptions {
  readonly scanDir: string;
}

function parseArgs(argv: readonly string[]): CliOptions {
  let scanDir = DEFAULT_SCAN_DIR;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === undefined) continue;
    if (arg === '--dir') {
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) {
        console.error('[jsonld] --dir requires a path argument.');
        process.exit(2);
      }
      scanDir = next;
      i += 1;
    } else if (arg.startsWith('--dir=')) {
      scanDir = arg.slice('--dir='.length);
    } else if (arg === '--help' || arg === '-h') {
      printHelpAndExit(0);
    } else {
      console.error(`[jsonld] Unknown argument: ${arg}`);
      printHelpAndExit(2);
    }
  }

  return { scanDir };
}

function printHelpAndExit(code: number): never {
  console.log('Usage: tsx scripts/check-jsonld.ts [--dir <path>]');
  console.log('');
  console.log('Scans every *.html file under <path> (default .next/server/app) and');
  console.log('validates every <script type="application/ld+json"> block it finds.');
  console.log('Exits 0 on success (including empty scan targets), 1 on validation');
  console.log('failure, 2 on invalid CLI.');
  process.exit(code);
}

// -----------------------------------------------------------------------------
// File discovery
// -----------------------------------------------------------------------------

/**
 * Walk `root` recursively and collect every `*.html` file. Returns an
 * empty array when `root` does not exist or is not a directory — the
 * caller treats that case as "no build output yet" and exits 0.
 */
function walkHtmlFiles(root: string): string[] {
  const out: string[] = [];

  let rootStat: ReturnType<typeof statSync>;
  try {
    rootStat = statSync(root);
  } catch {
    return out;
  }
  if (!rootStat.isDirectory()) return out;

  function visit(dir: string): void {
    let entries: Dirent[];
    try {
      entries = readdirSync(dir, { withFileTypes: true, encoding: 'utf8' }) as Dirent[];
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        visit(full);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) {
        out.push(full);
      }
    }
  }

  visit(root);
  return out;
}

function relPath(abs: string): string {
  return relative(PROJECT_ROOT, abs).split(sep).join('/');
}

// -----------------------------------------------------------------------------
// Block extraction + validation
// -----------------------------------------------------------------------------

interface ExtractedBlock {
  readonly file: string;
  readonly index: number; // 1-based block index within the file
  readonly body: string;
}

function extractBlocks(file: string, html: string): ExtractedBlock[] {
  const blocks: ExtractedBlock[] = [];
  let match: RegExpExecArray | null;
  let blockIndex = 0;
  JSONLD_SCRIPT_RE.lastIndex = 0;
  while ((match = JSONLD_SCRIPT_RE.exec(html)) !== null) {
    blockIndex += 1;
    const body = match[2] ?? '';
    blocks.push({ file, index: blockIndex, body });
  }
  return blocks;
}

/** Minimal structural test — any JSON value that is a plain object. */
function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function isNonEmptyArray(v: unknown): v is unknown[] {
  return Array.isArray(v) && v.length > 0;
}

/** `@type` may be a string or an array of strings; return the first. */
function firstType(v: unknown): string | null {
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) {
    for (const t of v) {
      if (typeof t === 'string') return t;
    }
  }
  return null;
}

/**
 * Per-type minimum-field validation. Returns a list of human-readable
 * problems; an empty list means the block passed.
 *
 * A block is only subject to validation here if it has already parsed
 * as JSON and has a string `@type`. Unknown `@type` values are accepted
 * (there are many valid schema.org types the emitters don't use today),
 * so we only enforce the types the design spec calls out.
 */
function validateByType(obj: Record<string, unknown>, type: string): string[] {
  const problems: string[] = [];

  switch (type) {
    case 'LocalBusiness':
    case 'AutoRentalAgency': {
      if (!isNonEmptyString(obj['name'])) {
        problems.push(`${type} is missing required field "name"`);
      }
      const address = obj['address'];
      if (address === undefined || address === null || address === '') {
        problems.push(`${type} is missing required field "address"`);
      }
      if (!isNonEmptyString(obj['telephone'])) {
        problems.push(`${type} is missing required field "telephone"`);
      }
      break;
    }

    case 'Service': {
      if (!isNonEmptyString(obj['name'])) {
        problems.push('Service is missing required field "name"');
      }
      const provider = obj['provider'];
      if (provider === undefined || provider === null || provider === '') {
        problems.push('Service is missing required field "provider"');
      }
      break;
    }

    case 'FAQPage': {
      if (!isNonEmptyArray(obj['mainEntity'])) {
        problems.push('FAQPage requires a non-empty "mainEntity" array');
      }
      break;
    }

    case 'BreadcrumbList': {
      if (!isNonEmptyArray(obj['itemListElement'])) {
        problems.push('BreadcrumbList requires a non-empty "itemListElement" array');
      }
      break;
    }

    case 'Article':
    case 'NewsArticle':
    case 'BlogPosting': {
      if (!isNonEmptyString(obj['headline'])) {
        problems.push(`${type} is missing required field "headline"`);
      }
      const author = obj['author'];
      if (author === undefined || author === null || author === '') {
        problems.push(`${type} is missing required field "author"`);
      }
      if (!isNonEmptyString(obj['datePublished'])) {
        problems.push(`${type} is missing required field "datePublished"`);
      }
      const publisher = obj['publisher'];
      if (publisher === undefined || publisher === null || publisher === '') {
        problems.push(`${type} is missing required field "publisher"`);
      }
      break;
    }

    case 'Product': {
      if (!isNonEmptyString(obj['name'])) {
        problems.push('Product is missing required field "name"');
      }
      if (!('offers' in obj)) {
        problems.push('Product is missing required field "offers"');
        break;
      }
      const offers = obj['offers'];
      if (offers !== undefined && offers !== null) {
        problems.push(...validateOffers(offers));
      }
      break;
    }

    default:
      // Unknown types are not errors — schema.org has many valid types
      // the site may eventually use.
      break;
  }

  return problems;
}

/**
 * Offers validation for `Product`. Accepts either a single Offer object
 * or an AggregateOffer; verifies currency + price (or low/high price)
 * are populated. Arrays of Offers are also accepted — each item is
 * validated individually.
 */
function validateOffers(offers: unknown): string[] {
  const problems: string[] = [];

  const toCheck: unknown[] = Array.isArray(offers) ? offers : [offers];

  toCheck.forEach((entry, idx) => {
    const label = toCheck.length === 1 ? 'offers' : `offers[${idx}]`;
    if (!isPlainObject(entry)) {
      problems.push(`Product "${label}" must be an object or array of objects`);
      return;
    }

    const offerType = firstType(entry['@type']);
    const currency = entry['priceCurrency'];
    if (!isNonEmptyString(currency)) {
      problems.push(`Product "${label}" is missing "priceCurrency"`);
    }

    if (offerType === 'AggregateOffer') {
      const low = entry['lowPrice'];
      const high = entry['highPrice'];
      if (low === undefined || low === null || low === '') {
        problems.push(`Product "${label}" (AggregateOffer) is missing "lowPrice"`);
      }
      if (high === undefined || high === null || high === '') {
        problems.push(`Product "${label}" (AggregateOffer) is missing "highPrice"`);
      }
    } else {
      // Single Offer / unspecified: must carry either a flat price or
      // a low/high range.
      const price = entry['price'];
      const low = entry['lowPrice'];
      const high = entry['highPrice'];
      const hasFlat = price !== undefined && price !== null && price !== '';
      const hasRange =
        low !== undefined && low !== null && low !== '' &&
        high !== undefined && high !== null && high !== '';
      if (!hasFlat && !hasRange) {
        problems.push(
          `Product "${label}" must carry "price" or both "lowPrice" + "highPrice"`,
        );
      }
    }
  });

  return problems;
}

// -----------------------------------------------------------------------------
// Reporting
// -----------------------------------------------------------------------------

interface Diagnostic {
  readonly kind: 'error' | 'warning';
  readonly file: string;
  readonly blockIndex: number;
  readonly message: string;
}

function logDiagnostic(d: Diagnostic): void {
  const loc = `${relPath(d.file)} (block #${d.blockIndex})`;
  const out = d.kind === 'error' ? console.error : console.warn;
  out.call(console, `[jsonld] ${loc}: ${d.message}`);
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------

function main(): void {
  const { scanDir } = parseArgs(process.argv.slice(2));

  const absDir = resolve(PROJECT_ROOT, scanDir);
  const files = walkHtmlFiles(absDir);

  if (files.length === 0) {
    console.log(
      `[jsonld] scan target "${scanDir}" contains no .html files — skipping ` +
        '(this is expected until `next build` produces rendered pages).',
    );
    process.exit(0);
  }

  let totalBlocks = 0;
  let errorCount = 0;

  for (const file of files) {
    let html: string;
    try {
      html = readFileSync(file, 'utf8');
    } catch (err) {
      errorCount += 1;
      logDiagnostic({
        kind: 'error',
        file,
        blockIndex: 0,
        message: `failed to read file: ${(err as Error).message}`,
      });
      continue;
    }

    const blocks = extractBlocks(file, html);
    totalBlocks += blocks.length;

    for (const block of blocks) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(block.body);
      } catch (err) {
        errorCount += 1;
        logDiagnostic({
          kind: 'error',
          file: block.file,
          blockIndex: block.index,
          message: `invalid JSON: ${(err as Error).message}`,
        });
        continue;
      }

      if (!isPlainObject(parsed)) {
        errorCount += 1;
        logDiagnostic({
          kind: 'error',
          file: block.file,
          blockIndex: block.index,
          message: 'top-level JSON-LD value must be an object',
        });
        continue;
      }

      const context = parsed['@context'];
      if (context === undefined) {
        logDiagnostic({
          kind: 'warning',
          file: block.file,
          blockIndex: block.index,
          message: `missing "@context" (expected "${SCHEMA_ORG_CONTEXT}")`,
        });
      } else if (typeof context === 'string' && context !== SCHEMA_ORG_CONTEXT) {
        logDiagnostic({
          kind: 'warning',
          file: block.file,
          blockIndex: block.index,
          message: `unexpected "@context": "${context}" (expected "${SCHEMA_ORG_CONTEXT}")`,
        });
      }

      const type = firstType(parsed['@type']);
      if (type === null) {
        errorCount += 1;
        logDiagnostic({
          kind: 'error',
          file: block.file,
          blockIndex: block.index,
          message: 'missing or invalid "@type"',
        });
        continue;
      }

      const problems = validateByType(parsed, type);
      for (const problem of problems) {
        errorCount += 1;
        logDiagnostic({
          kind: 'error',
          file: block.file,
          blockIndex: block.index,
          message: problem,
        });
      }
    }
  }

  console.log(
    `[jsonld] scanned ${files.length} files, ${totalBlocks} blocks, ${errorCount} errors`,
  );

  process.exit(errorCount > 0 ? 1 : 0);
}

main();
