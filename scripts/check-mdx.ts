#!/usr/bin/env node
/**
 * scripts/check-mdx.ts
 *
 * MDX frontmatter + allowlist validator (task 12.5, R23.2 / R23.3 / R23.4).
 *
 * Walks every `*.mdx` file under `content/`, validates the frontmatter
 * block against the entity-specific Zod schema declared in
 * `lib/content/narrative/schema.ts`, and verifies the body uses only
 * the JSX components listed in `components/mdx/index.ts`'s
 * `mdxAllowlist` map.
 *
 * This script is intentionally redundant with the build-time guard in
 * `lib/content/narrative/mdx.ts`: it runs as a standalone CI step on
 * pull requests that touch `content/` (see `.github/workflows/content-checks.yml`)
 * so an MDX violation is caught BEFORE `next build` ever runs. That
 * keeps PR feedback fast and lets us detect regressions even when the
 * affected file is not referenced by any loader call during the build.
 *
 * What it checks
 *   - R23.2  Every MDX file declares the required base frontmatter
 *            keys plus the entity-specific keys validated by the
 *            corresponding Zod schema in
 *            `lib/content/narrative/schema.ts`.
 *   - R23.3  Every PascalCase JSX tag in an MDX body is a key of
 *            `mdxAllowlist` (the published allowlist).
 *   - R23.4  Surfaces every offending file path + field with a clear
 *            error message so the build can be repaired in one pass.
 *
 * What it does NOT check (out of scope for task 12.5; handled
 * elsewhere)
 *   - Body word-count thresholds (R5.3, R6.1-R6.4) — task 12.2.
 *   - Forbidden-phrase / chauffeur-only checks (R20) — tasks 12.1 / 12.3 / 12.6.
 *   - Uniqueness / token-overlap analysis (R6) — task 12.2.
 *
 * Usage
 *   pnpm check:mdx                             # default (scans `content/`)
 *   pnpm exec tsx scripts/check-mdx.ts --dir content/cities
 *
 * Flags
 *   --dir <path>   Root directory to scan. Defaults to `content`.
 *
 * Exit codes
 *   0 — every MDX file passed both validations, OR the scan target
 *       contained no `.mdx` files (a brand-new repo state).
 *   1 — at least one violation; full list dumped to stderr first.
 *   2 — invalid CLI invocation.
 *
 * Design references
 *   - §4 (Narrative_Content_Store).
 *   - §6 (build-time script layout under `scripts/`).
 *
 * Implementation notes
 *   - Schemas are imported from `lib/content/narrative/schema.ts` so
 *     this script and the runtime loader share a single source of
 *     truth (R17.12).
 *   - The allowlist is imported from `components/mdx` so the same set
 *     of strings authoritatively governs both renderer and CI guard.
 *   - JSX-tag scanning is a textual surface check (PascalCase opening
 *     tags only). Fenced code blocks are stripped first so an example
 *     `<Foo />` inside ```mdx``` does not produce a false positive.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import type { Dirent } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

import matter from "gray-matter";
import type { ZodIssue } from "zod";

import { mdxAllowlist } from "@/components/mdx";
import {
  entityFrontmatterSchemas,
  type EntityKind,
} from "@/lib/content/narrative/schema";

// ---------------------------------------------------------------------------
// Paths + constants
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, "..");

const DEFAULT_SCAN_DIR = "content";

/**
 * Map from on-disk plural directory name to the {@link EntityKind} used
 * by `lib/content/narrative/schema.ts`. Mirrors the `ENTITY_DIR` map in
 * `lib/content/narrative/mdx.ts` (inverted) — kept here as well so a
 * standalone Node run does not have to import that runtime module just
 * to look up a string.
 */
const DIR_TO_KIND: Readonly<Record<string, EntityKind>> = {
  cities: "city",
  countries: "country",
  vehicles: "vehicle",
  services: "service",
  articles: "article",
};

/** Supported authoring locales (matches `baseFm.locale` in schema.ts). */
const SUPPORTED_LOCALES: ReadonlySet<string> = new Set(["id", "en"]);

/**
 * Set of allowed JSX tag names (keys of `mdxAllowlist`). Computed once
 * so the per-file scan is a `Set.has` lookup. Frozen here so a future
 * refactor cannot accidentally mutate the runtime registry from this
 * script.
 */
const ALLOWED_TAGS: ReadonlySet<string> = new Set(Object.keys(mdxAllowlist));

/**
 * Matches a JSX opening-tag name that starts with a capital letter.
 * Mirrors the regex in `lib/content/narrative/mdx.ts` so the two scans
 * agree on what counts as a custom-component reference. Matches names
 * after `<` and stops at the first non-identifier character (whitespace,
 * `>`, `/`).
 */
const JSX_OPEN_TAG_RE = /<([A-Z][A-Za-z0-9]*)/g;

/**
 * Matches fenced code blocks (``` … ```) so they can be stripped before
 * the JSX-tag scan. Without this, an example `<Foo />` snippet inside
 * documentation would be flagged.
 */
const FENCED_CODE_RE = /```[\s\S]*?```/g;

/**
 * Matches inline code spans (`…`). Same rationale as
 * {@link FENCED_CODE_RE} — strip them so an inline `<Foo />` example
 * inside prose is not mistaken for a real JSX tag.
 */
const INLINE_CODE_RE = /`[^`\n]*`/g;

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

interface CliOptions {
  readonly scanDir: string;
}

function parseArgs(argv: readonly string[]): CliOptions {
  let scanDir = DEFAULT_SCAN_DIR;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === undefined) continue;
    if (arg === "--dir") {
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) {
        console.error("[check-mdx] --dir requires a path argument.");
        process.exit(2);
      }
      scanDir = next;
      i += 1;
    } else if (arg.startsWith("--dir=")) {
      scanDir = arg.slice("--dir=".length);
    } else if (arg === "--help" || arg === "-h") {
      printHelpAndExit(0);
    } else {
      console.error(`[check-mdx] Unknown argument: ${arg}`);
      printHelpAndExit(2);
    }
  }

  return { scanDir };
}

function printHelpAndExit(code: number): never {
  console.log("Usage: tsx scripts/check-mdx.ts [--dir <path>]");
  console.log("");
  console.log(
    "Walks every *.mdx file under <path> (default `content`), validates",
  );
  console.log(
    "frontmatter against the per-entity zod schema, and verifies the body",
  );
  console.log("uses only allowlisted JSX components.");
  console.log("");
  console.log(
    "Exits 0 on success (or empty scan target), 1 on validation failure,",
  );
  console.log("2 on invalid CLI.");
  process.exit(code);
}

// ---------------------------------------------------------------------------
// File discovery
// ---------------------------------------------------------------------------

/**
 * Walk `root` recursively and collect every `*.mdx` file. Returns an
 * empty array when `root` does not exist or is not a directory — the
 * caller treats that case as "no content yet" and exits 0. Hidden
 * directories (names beginning with `.`) and `node_modules` are
 * skipped to avoid traversing into vendor trees if `--dir` is pointed
 * at a parent of the repo root.
 */
function walkMdxFiles(root: string): string[] {
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
      entries = readdirSync(dir, {
        withFileTypes: true,
        encoding: "utf8",
      }) as Dirent[];
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      if (entry.name === "node_modules") continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        visit(full);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".mdx")) {
        out.push(full);
      }
    }
  }

  visit(root);
  return out;
}

function relPath(abs: string): string {
  return relative(PROJECT_ROOT, abs).split(sep).join("/");
}

// ---------------------------------------------------------------------------
// Path → entity classification
// ---------------------------------------------------------------------------

interface FileClassification {
  readonly kind: EntityKind;
  readonly locale: "id" | "en";
  readonly slug: string;
}

/**
 * Classify `absPath` by walking its path segments to find the
 * `cities|countries|vehicles|services|articles` folder, then the
 * locale folder beneath it, then the `*.mdx` filename.
 *
 * Returns `null` when the path does not match the
 * `content/{entity}/{locale}/{slug}.mdx` shape from R23.1; the caller
 * treats that as a "non-narrative MDX file" and skips it (frontmatter
 * is still validated through the static-page schema if/when that lands;
 * for now an unmatched file is silently skipped because no schema
 * applies, but a stub allowlist scan still runs in {@link validateFile}).
 */
function classifyPath(absPath: string): FileClassification | null {
  const rel = relative(PROJECT_ROOT, absPath).split(sep);
  // We expect the segments to look like:
  //   [..., "content", "<entity>", "<locale>", "<slug>.mdx"]
  // The ".." prefix is allowed so `--dir` can point outside the
  // standard `content/` root for ad-hoc lint runs.
  for (let i = 0; i < rel.length - 3; i += 1) {
    if (rel[i] !== "content") continue;
    const dir = rel[i + 1];
    const locale = rel[i + 2];
    const file = rel[i + 3];
    if (dir === undefined || locale === undefined || file === undefined) {
      continue;
    }
    const kind = DIR_TO_KIND[dir];
    if (kind === undefined) return null;
    if (!SUPPORTED_LOCALES.has(locale)) return null;
    if (!file.toLowerCase().endsWith(".mdx")) return null;
    const slug = file.slice(0, -".mdx".length);
    return { kind, locale: locale as "id" | "en", slug };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Body scanning
// ---------------------------------------------------------------------------

/** Strip fenced code blocks and inline code so the JSX scan ignores them. */
function stripCodeSpans(body: string): string {
  return body.replace(FENCED_CODE_RE, "").replace(INLINE_CODE_RE, "");
}

/**
 * Return every PascalCase JSX tag referenced in `body` that is not in
 * `mdxAllowlist`. Runs against a copy of the body with code spans
 * stripped so example snippets in documentation MDX don't false-positive.
 * Each disallowed tag is reported once per file.
 */
function findDisallowedTags(body: string): string[] {
  const stripped = stripCodeSpans(body);
  const disallowed = new Set<string>();
  for (const match of stripped.matchAll(JSX_OPEN_TAG_RE)) {
    const tag = match[1];
    if (tag === undefined) continue;
    if (ALLOWED_TAGS.has(tag)) continue;
    disallowed.add(tag);
  }
  return Array.from(disallowed).sort();
}

// ---------------------------------------------------------------------------
// Per-file validation
// ---------------------------------------------------------------------------

interface ValidationError {
  readonly file: string;
  readonly kind: "frontmatter" | "allowlist" | "io" | "classify";
  readonly message: string;
}

function formatZodIssue(issue: ZodIssue): string {
  const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
  return `${path}: ${issue.message}`;
}

function validateFile(absPath: string): ValidationError[] {
  const errors: ValidationError[] = [];
  const file = relPath(absPath);

  let raw: string;
  try {
    raw = readFileSync(absPath, "utf8");
  } catch (err) {
    errors.push({
      file,
      kind: "io",
      message: `failed to read file: ${(err as Error).message}`,
    });
    return errors;
  }

  let frontmatterData: unknown;
  let body: string;
  try {
    const parsed = matter(raw);
    frontmatterData = parsed.data;
    body = parsed.content;
  } catch (err) {
    errors.push({
      file,
      kind: "frontmatter",
      message: `gray-matter parse failed: ${(err as Error).message}`,
    });
    return errors;
  }

  // 1. Frontmatter — only when the path matches the
  //    `content/<entity>/<locale>/<slug>.mdx` convention. Files outside
  //    that shape (e.g. an unrelated `.mdx` doc parked under
  //    `content/`) still get the allowlist scan but no frontmatter
  //    validation, because no schema applies.
  const classification = classifyPath(absPath);
  if (classification !== null) {
    const schema = entityFrontmatterSchemas[classification.kind];
    const result = schema.safeParse(frontmatterData);
    if (!result.success) {
      for (const issue of result.error.issues) {
        errors.push({
          file,
          kind: "frontmatter",
          message: formatZodIssue(issue),
        });
      }
    } else {
      // Cross-check: filename slug and frontmatter `slug` must match,
      // and the directory locale must match `frontmatter.locale`. The
      // zod schema validates the shape of each field independently;
      // these two cross-field invariants tie the file's location on
      // disk to its declared identity (R23.1).
      const fmSlug = (frontmatterData as Record<string, unknown>)["slug"];
      const fmLocale = (frontmatterData as Record<string, unknown>)["locale"];
      if (fmSlug !== classification.slug) {
        errors.push({
          file,
          kind: "frontmatter",
          message: `slug ("${String(
            fmSlug,
          )}") does not match filename ("${classification.slug}")`,
        });
      }
      if (fmLocale !== classification.locale) {
        errors.push({
          file,
          kind: "frontmatter",
          message: `locale ("${String(
            fmLocale,
          )}") does not match directory ("${classification.locale}")`,
        });
      }
    }
  } else {
    // We still surface a soft "classify" diagnostic to stdout so a
    // misplaced MDX file (e.g. `content/cities/jakarta.mdx` without the
    // locale folder) is visible in the run summary even if it does not
    // become a hard error.
    errors.push({
      file,
      kind: "classify",
      message:
        "file is not under content/<entity>/<locale>/<slug>.mdx; frontmatter not validated",
    });
  }

  // 2. Allowlist — applies to every MDX file, including ones we could
  //    not classify, because R23.3 forbids unallowlisted JSX components
  //    everywhere under `content/`.
  const disallowed = findDisallowedTags(body);
  for (const tag of disallowed) {
    errors.push({
      file,
      kind: "allowlist",
      message: `<${tag}> is not in mdxAllowlist`,
    });
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

/**
 * `classify` diagnostics are warnings, not failures. Everything else
 * (frontmatter, allowlist, io) is a hard error and contributes to the
 * non-zero exit code.
 */
function isFatal(err: ValidationError): boolean {
  return err.kind !== "classify";
}

function logError(err: ValidationError): void {
  const tag = `[${err.kind}]`;
  const message = `[check-mdx] ${err.file} ${tag} ${err.message}`;
  if (isFatal(err)) {
    console.error(message);
  } else {
    console.warn(message);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  const { scanDir } = parseArgs(process.argv.slice(2));

  const absDir = resolve(PROJECT_ROOT, scanDir);
  if (!existsSync(absDir)) {
    console.log(
      `[check-mdx] scan target "${scanDir}" does not exist — skipping ` +
        "(no MDX content to validate yet).",
    );
    process.exit(0);
  }

  const files = walkMdxFiles(absDir).sort();

  if (files.length === 0) {
    console.log(
      `[check-mdx] scan target "${scanDir}" contains no .mdx files — skipping.`,
    );
    process.exit(0);
  }

  let fatalCount = 0;
  let warnCount = 0;

  for (const file of files) {
    const errors = validateFile(file);
    for (const err of errors) {
      logError(err);
      if (isFatal(err)) fatalCount += 1;
      else warnCount += 1;
    }
  }

  console.log(
    `[check-mdx] scanned ${files.length} files, ` +
      `${fatalCount} ${fatalCount === 1 ? "error" : "errors"}, ` +
      `${warnCount} ${warnCount === 1 ? "warning" : "warnings"}`,
  );

  process.exit(fatalCount > 0 ? 1 : 0);
}

main();
