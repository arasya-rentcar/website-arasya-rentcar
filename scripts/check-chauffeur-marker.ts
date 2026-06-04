#!/usr/bin/env node
/**
 * scripts/check-chauffeur-marker.ts
 *
 * Build-time validator for the `chauffeurOnly` brand marker (R20.3, R20.5).
 *
 * Every entity in the Structured_Content_Store and every MDX file in the
 * Narrative_Content_Store must explicitly assert that it scopes to
 * chauffeur-only service. The DB enforces this at the column level via a
 * CHECK constraint (`chauffeur_only = true`) on the `cities`, `countries`,
 * `vehicles`, and `services` tables (migration 0002). The MDX schema
 * enforces it via `z.literal(true)` on every entity's frontmatter (see
 * `lib/content/narrative/schema.ts`). This script is the third belt-and-
 * braces layer: it walks both stores after they have been written/cached
 * and confirms the marker is present + true on every row and every file.
 *
 * Two parallel passes:
 *
 *   1. MDX frontmatter (`content/**\/*.mdx`):
 *        - Parse the YAML frontmatter via `gray-matter`.
 *        - Reject any file that omits `chauffeurOnly` or sets it to
 *          anything other than literal `true`.
 *
 *   2. Structured_Content_Store snapshot
 *      (`.next/cache/content-snapshot.json`):
 *        - Read the build-time JSON snapshot produced by
 *          `scripts/content-snapshot.ts` (task 4.1).
 *        - For each entity table that carries a `chauffeur_only` column —
 *          `cities`, `countries`, `vehicles`, `services` — confirm every
 *          row has `chauffeur_only === true`.
 *        - `airports` (and the join/translation tables) do not carry the
 *          column; the marker is implicit (every airport in the snapshot
 *          is a chauffeur transfer destination because it joins back to a
 *          chauffeur-only city). The first encounter of such a table is
 *          logged once for visibility, then skipped.
 *        - If the snapshot file is absent (e.g. CI without Supabase
 *          credentials, or running before `pnpm prebuild`), the
 *          structured pass is skipped with a warning. The MDX pass
 *          remains authoritative on its own; missing snapshot is not a
 *          hard failure here because `scripts/content-snapshot.ts`
 *          already owns that error path (R5.13).
 *
 * Satisfies:
 *   - R20.3 — every City, Country, Vehicle, Service, and Blog_Article
 *             entry must declare `chauffeurOnly: true` in its content
 *             schema; this checker is the build-time enforcement layer.
 *   - R20.5 — equivalent enforcement across every declared Locale of
 *             every MDX entry.
 *
 * Design references:
 *   - §4.2 — frontmatter schema with `chauffeurOnly: z.literal(true)`.
 *   - §17  — Forbidden-Phrase / chauffeur-only build-time lints.
 *
 * Usage:
 *   pnpm check:chauffeur-marker
 *   pnpm exec tsx scripts/check-chauffeur-marker.ts
 *
 * Exit codes:
 *   0 — every MDX file and every snapshot row carries the marker
 *       (or, for tables without a column, the marker is implicit).
 *   1 — one or more MDX files or snapshot rows are missing/non-true.
 *
 * Zero runtime dependencies beyond Node's standard library and
 * `gray-matter` (already a devDependency for the MDX pipeline).
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import type { Dirent } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

import matter from "gray-matter";

// -----------------------------------------------------------------------------
// Paths + constants
// -----------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, "..");

const CONTENT_DIR = resolve(PROJECT_ROOT, "content");
const SNAPSHOT_PATH = resolve(PROJECT_ROOT, ".next", "cache", "content-snapshot.json");

/**
 * Snapshot keys (camelCase, mirroring `scripts/content-snapshot.ts` and
 * `lib/content/structured/snapshot.ts`) whose rows MUST carry
 * `chauffeur_only === true`. Migration 0002 declares the column on
 * `cities`, `countries`, `vehicles`, and `services` with a CHECK
 * constraint pinning the value to `true`; this set is the JSON-side
 * mirror.
 */
const REQUIRED_SNAPSHOT_KEYS = ["cities", "countries", "vehicles", "services"] as const;

/**
 * Snapshot keys whose rows do NOT carry a `chauffeur_only` column because
 * the marker is implicit:
 *   - `airports`: every airport row joins back to a chauffeur-only city.
 *   - `*_translations`: locale-scoped strings; the marker lives on the
 *     parent entity row.
 *   - join tables (`city_vehicles`, `city_airports`, `city_related`,
 *     `city_aliases`): pure join rows with no entity payload.
 *
 * Listed explicitly so the structured pass can log a single informational
 * line per implicit table rather than silently skipping unknown keys.
 */
const IMPLICIT_SNAPSHOT_KEYS = [
  "cityTranslations",
  "countryTranslations",
  "vehicleTranslations",
  "serviceTranslations",
  "airports",
  "cityVehicles",
  "cityAirports",
  "cityRelated",
  "cityAliases",
] as const;

// -----------------------------------------------------------------------------
// Diagnostics
// -----------------------------------------------------------------------------

interface MdxViolation {
  readonly file: string;
  readonly message: string;
}

interface StructuredViolation {
  readonly entity: string;
  readonly id: string;
  readonly message: string;
}

function relPath(abs: string): string {
  return relative(PROJECT_ROOT, abs).split(sep).join("/");
}

// -----------------------------------------------------------------------------
// Pass 1: MDX frontmatter
// -----------------------------------------------------------------------------

/**
 * Walk `root` recursively and collect every `*.mdx` file. Returns an
 * empty array when `root` does not exist — the caller treats that case as
 * "no MDX content yet" and reports zero violations.
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
      entries = readdirSync(dir, { withFileTypes: true, encoding: "utf8" }) as Dirent[];
    } catch {
      return;
    }
    for (const entry of entries) {
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

function checkMdxFrontmatter(): { files: number; violations: MdxViolation[] } {
  const files = walkMdxFiles(CONTENT_DIR);
  const violations: MdxViolation[] = [];

  for (const file of files) {
    let raw: string;
    try {
      raw = readFileSync(file, "utf8");
    } catch (err) {
      violations.push({
        file,
        message: `failed to read MDX file: ${formatError(err)}`,
      });
      continue;
    }

    let data: Record<string, unknown>;
    try {
      ({ data } = matter(raw) as unknown as { data: Record<string, unknown> });
    } catch (err) {
      violations.push({
        file,
        message: `failed to parse YAML frontmatter: ${formatError(err)}`,
      });
      continue;
    }

    const value = data["chauffeurOnly"];
    if (value === undefined) {
      violations.push({
        file,
        message: "missing required `chauffeurOnly: true` frontmatter (R20.3)",
      });
    } else if (value !== true) {
      violations.push({
        file,
        message: `\`chauffeurOnly\` must be the literal boolean true (got ${formatValue(value)}) (R20.3)`,
      });
    }
  }

  return { files: files.length, violations };
}

// -----------------------------------------------------------------------------
// Pass 2: Structured_Content_Store snapshot
// -----------------------------------------------------------------------------

interface SnapshotPassResult {
  readonly skipped: boolean;
  readonly tablesChecked: number;
  readonly rowsChecked: number;
  readonly implicitTables: readonly string[];
  readonly violations: readonly StructuredViolation[];
}

function checkSnapshot(): SnapshotPassResult {
  if (!existsSync(SNAPSHOT_PATH)) {
    console.warn(
      `[chauffeur-marker] snapshot not found at ${relPath(SNAPSHOT_PATH)} — ` +
        "skipping structured pass (run `pnpm prebuild` to generate it).",
    );
    return {
      skipped: true,
      tablesChecked: 0,
      rowsChecked: 0,
      implicitTables: [],
      violations: [],
    };
  }

  let raw: string;
  try {
    raw = readFileSync(SNAPSHOT_PATH, "utf8");
  } catch (err) {
    return {
      skipped: false,
      tablesChecked: 0,
      rowsChecked: 0,
      implicitTables: [],
      violations: [
        {
          entity: "(snapshot)",
          id: relPath(SNAPSHOT_PATH),
          message: `failed to read snapshot: ${formatError(err)}`,
        },
      ],
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    return {
      skipped: false,
      tablesChecked: 0,
      rowsChecked: 0,
      implicitTables: [],
      violations: [
        {
          entity: "(snapshot)",
          id: relPath(SNAPSHOT_PATH),
          message: `failed to JSON.parse snapshot: ${formatError(err)}`,
        },
      ],
    };
  }

  if (!isPlainObject(parsed)) {
    return {
      skipped: false,
      tablesChecked: 0,
      rowsChecked: 0,
      implicitTables: [],
      violations: [
        {
          entity: "(snapshot)",
          id: relPath(SNAPSHOT_PATH),
          message: "top-level snapshot value must be a JSON object",
        },
      ],
    };
  }

  const violations: StructuredViolation[] = [];
  let tablesChecked = 0;
  let rowsChecked = 0;
  const implicitTables: string[] = [];

  for (const key of REQUIRED_SNAPSHOT_KEYS) {
    const rows = parsed[key];
    if (!Array.isArray(rows)) {
      violations.push({
        entity: key,
        id: "(table)",
        message: `snapshot is missing required array field "${key}"`,
      });
      continue;
    }
    tablesChecked += 1;

    for (const [index, row] of rows.entries()) {
      rowsChecked += 1;
      if (!isPlainObject(row)) {
        violations.push({
          entity: key,
          id: `[${index}]`,
          message: `row is not an object (got ${formatValue(row)})`,
        });
        continue;
      }

      const id = identifierFor(row, index);
      const value = row["chauffeur_only"];

      if (value === undefined) {
        violations.push({
          entity: key,
          id,
          message: "row is missing required column `chauffeur_only` (R20.3)",
        });
        continue;
      }

      if (value !== true) {
        violations.push({
          entity: key,
          id,
          message: `\`chauffeur_only\` must be true (got ${formatValue(value)}) (R20.3)`,
        });
      }
    }
  }

  for (const key of IMPLICIT_SNAPSHOT_KEYS) {
    if (Array.isArray(parsed[key])) {
      implicitTables.push(key);
    }
  }

  return {
    skipped: false,
    tablesChecked,
    rowsChecked,
    implicitTables,
    violations,
  };
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Pick a stable, human-readable identifier for a row in a violation
 * message. Prefers slug, then code (airports use IATA code), then id, and
 * finally falls back to the row's positional index in the table.
 */
function identifierFor(row: Record<string, unknown>, index: number): string {
  const slug = row["slug"];
  if (typeof slug === "string" && slug.length > 0) return slug;
  const code = row["code"];
  if (typeof code === "string" && code.length > 0) return code;
  const id = row["id"];
  if (typeof id === "string" && id.length > 0) return id;
  return `[${index}]`;
}

function formatError(err: unknown): string {
  if (err instanceof Error) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

/** Compact, single-line representation of an arbitrary value for messages. */
function formatValue(v: unknown): string {
  if (typeof v === "string") return JSON.stringify(v);
  if (typeof v === "number" || typeof v === "boolean" || v === null) return String(v);
  if (v === undefined) return "undefined";
  try {
    const j = JSON.stringify(v);
    return j.length > 60 ? `${j.slice(0, 57)}...` : j;
  } catch {
    return String(v);
  }
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------

function main(): void {
  const mdx = checkMdxFrontmatter();
  const structured = checkSnapshot();

  for (const v of mdx.violations) {
    console.error(`[chauffeur-marker] [mdx] ${relPath(v.file)}: ${v.message}`);
  }
  for (const v of structured.violations) {
    console.error(`[chauffeur-marker] [structured] ${v.entity}/${v.id}: ${v.message}`);
  }

  for (const table of structured.implicitTables) {
    console.log(
      `[chauffeur-marker] [structured] ${table}: marker is implicit (no \`chauffeur_only\` column) — skipped`,
    );
  }

  const total = mdx.violations.length + structured.violations.length;

  console.log(
    `[chauffeur-marker] mdx: scanned ${mdx.files} files, ${mdx.violations.length} violations`,
  );
  if (structured.skipped) {
    console.log(`[chauffeur-marker] structured: skipped (no snapshot on disk)`);
  } else {
    console.log(
      `[chauffeur-marker] structured: scanned ${structured.tablesChecked} tables, ` +
        `${structured.rowsChecked} rows, ${structured.violations.length} violations`,
    );
  }

  if (total > 0) {
    console.error(`[chauffeur-marker] FAILED with ${total} violation(s)`);
    process.exit(1);
  }

  console.log("[chauffeur-marker] ok — every entity carries chauffeurOnly: true");
  process.exit(0);
}

main();
