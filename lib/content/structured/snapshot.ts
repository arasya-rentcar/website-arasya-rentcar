/**
 * lib/content/structured/snapshot.ts
 *
 * Structured_Content_Store snapshot loader.
 *
 * Reads `.next/cache/content-snapshot.json` — the JSON blob produced by
 * `scripts/content-snapshot.ts` during the `prebuild` hook (task 4.1). The
 * snapshot is the single read-path the structured loaders (tasks 4.3, 4.7,
 * 4.8) use at build time so the build itself never has to talk to Supabase
 * directly.
 *
 * Behaviour:
 *   - First call to {@link getSnapshot} or {@link loadSnapshot} reads and
 *     parses the JSON file. The parsed object is memoised in a module-level
 *     singleton for the life of the Node process; subsequent calls are
 *     O(1) synchronous reads of the cached value.
 *   - If the cache file is missing we throw a descriptive error. The
 *     `prebuild` hook is responsible for creating it; reaching this branch
 *     means a build ran without running `scripts/content-snapshot.ts`.
 *   - If the cache file is present but unreadable or not valid JSON, we
 *     throw an error that includes the underlying reason so operators can
 *     triage quickly (e.g. partial write, manual edit corruption).
 *
 * Path resolution:
 *   The cache path is resolved from `process.cwd()` rather than
 *   `import.meta.url`. When Next.js / bundlers resolve this module at
 *   runtime the `import.meta.url` points deep into `.next/server/**` (or
 *   into a traced node_modules path), which cannot be mapped back to the
 *   project root. `process.cwd()` is stable: both `next build` and the
 *   Node scripts under `scripts/` run from the repo root.
 *
 * Satisfies:
 *   - R5.1  — Content_Layer sources structured entities from Supabase via
 *             this build-time snapshot.
 *   - R17.4 — foundation for the 17 public loader functions exposed by
 *             `lib/content/index.ts` (wired up in task 4.8).
 *
 * Design references: §5.2, §5.3.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { promises as fsPromises } from "node:fs";

import type { Database } from "@/types/database";

// -----------------------------------------------------------------------------
// Row type helpers
// -----------------------------------------------------------------------------

// The generated `Database` type stub (`types/database.ts`, task 3.9) currently
// exposes `Tables: Record<string, never>`, so indexing it by table name yields
// `never`. We therefore cannot derive per-table row types from the stub yet.
// Until the Supabase type generator has been run against a real project we
// model each table row as an opaque `Record<string, unknown>` (which, combined
// with `noUncheckedIndexedAccess`, forces every consumer to narrow before
// touching a field). Swap each `SnapshotRow` alias for the real
// `Database['public']['Tables']['<table>']['Row']` once the stub is replaced.
//
// TODO(task 3.9 regeneration): once `pnpm db:types` produces concrete Tables
// definitions, replace the `SnapshotRow` aliases below with
// `Database['public']['Tables']['<table>']['Row']` so loader code is fully
// type-safe against the schema (R17.7, R21.12).
type SnapshotRow = Record<string, unknown>;

// Re-exported purely so tooling that inspects this module can see the
// database-type dependency; this also keeps the import from being pruned as
// unused if the TODO above is resolved in a future task.
export type SnapshotDatabase = Database;

// -----------------------------------------------------------------------------
// Snapshot shape (mirrors scripts/content-snapshot.ts writer, task 4.1)
// -----------------------------------------------------------------------------

/**
 * Parsed shape of `.next/cache/content-snapshot.json`.
 *
 * Keys and ordering mirror the writer in `scripts/content-snapshot.ts` and
 * the 13 Structured_Content_Store tables enumerated in design §3.1 /
 * requirements §5.4. `generatedAt` is an ISO-8601 UTC timestamp recorded
 * at write time.
 */
export interface Snapshot {
  cities: SnapshotRow[];
  cityTranslations: SnapshotRow[];
  countries: SnapshotRow[];
  countryTranslations: SnapshotRow[];
  vehicles: SnapshotRow[];
  vehicleTranslations: SnapshotRow[];
  services: SnapshotRow[];
  serviceTranslations: SnapshotRow[];
  airports: SnapshotRow[];
  cityVehicles: SnapshotRow[];
  cityAirports: SnapshotRow[];
  cityRelated: SnapshotRow[];
  cityAliases: SnapshotRow[];
  generatedAt: string;
}

/**
 * Keys of {@link Snapshot} that hold table rows (i.e. every key except
 * `generatedAt`). Exported so downstream loaders can iterate them without
 * having to re-declare the list.
 */
export const SNAPSHOT_TABLE_KEYS = [
  "cities",
  "cityTranslations",
  "countries",
  "countryTranslations",
  "vehicles",
  "vehicleTranslations",
  "services",
  "serviceTranslations",
  "airports",
  "cityVehicles",
  "cityAirports",
  "cityRelated",
  "cityAliases",
] as const satisfies readonly (keyof Snapshot)[];

/** Union of table-row-bearing keys on {@link Snapshot}. */
export type SnapshotTableKey = (typeof SNAPSHOT_TABLE_KEYS)[number];

// -----------------------------------------------------------------------------
// Paths
// -----------------------------------------------------------------------------

/**
 * Relative path (from the project root) of the snapshot JSON. Exported as a
 * constant so tests and tooling can point at the same location without
 * having to re-derive it.
 */
export const SNAPSHOT_RELATIVE_PATH = ".next/cache/content-snapshot.json";

/**
 * Resolve the absolute on-disk path to the snapshot. Uses `process.cwd()`
 * rather than `import.meta.url` — see the path-resolution note in the file
 * header for the rationale.
 */
export function getSnapshotPath(): string {
  return resolve(process.cwd(), SNAPSHOT_RELATIVE_PATH);
}

// -----------------------------------------------------------------------------
// Module-level singleton cache
// -----------------------------------------------------------------------------

let cachedSnapshot: Snapshot | undefined;

/**
 * Reset the memoised snapshot. Exposed for tests and for tooling that needs
 * to force a re-read after the cache file has been rewritten; production
 * code should never need to call this.
 */
export function __resetSnapshotCacheForTests(): void {
  cachedSnapshot = undefined;
}

// -----------------------------------------------------------------------------
// Validation
// -----------------------------------------------------------------------------

function isRowArray(value: unknown): value is SnapshotRow[] {
  return Array.isArray(value);
}

/**
 * Narrow an arbitrary `unknown` (typically the result of `JSON.parse`) to a
 * well-formed {@link Snapshot}. This is a structural shape check, not a
 * deep schema validation — per-row schemas land with the per-entity loaders
 * in task 4.3 and onwards.
 */
function assertIsSnapshot(value: unknown, sourcePath: string): asserts value is Snapshot {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(
      `[content/snapshot] ${sourcePath} did not parse to an object ` +
        `(got ${Array.isArray(value) ? "array" : typeof value}). ` +
        "Rerun `pnpm prebuild` to regenerate the snapshot.",
    );
  }

  const candidate = value as Record<string, unknown>;

  for (const key of SNAPSHOT_TABLE_KEYS) {
    const rows = candidate[key];
    if (!isRowArray(rows)) {
      throw new Error(
        `[content/snapshot] ${sourcePath} is missing array field "${key}". ` +
          "The snapshot file is out of sync with scripts/content-snapshot.ts; " +
          "rerun `pnpm prebuild` to regenerate it.",
      );
    }
  }

  if (typeof candidate.generatedAt !== "string" || candidate.generatedAt.length === 0) {
    throw new Error(
      `[content/snapshot] ${sourcePath} is missing the "generatedAt" ISO timestamp. ` +
        "Rerun `pnpm prebuild` to regenerate the snapshot.",
    );
  }
}

function formatReadError(err: unknown): string {
  if (err instanceof Error) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

function parseSnapshot(raw: string, sourcePath: string): Snapshot {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(
      `[content/snapshot] Failed to JSON.parse ${sourcePath}: ${formatReadError(err)}. ` +
        "The file may be partially written or manually edited; " +
        "rerun `pnpm prebuild` to regenerate it.",
    );
  }

  assertIsSnapshot(parsed, sourcePath);
  return parsed;
}

function missingSnapshotError(snapshotPath: string): Error {
  return new Error(
    `[content/snapshot] Snapshot not found at ${snapshotPath}. ` +
      "The `prebuild` hook (scripts/content-snapshot.ts) is responsible for " +
      "creating it; run `pnpm prebuild` before `pnpm build`, or invoke " +
      "`tsx scripts/content-snapshot.ts` directly with Supabase credentials in your env.",
  );
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

/**
 * Synchronously return the cached structured-content snapshot.
 *
 * On the first call per process the snapshot JSON is read from disk,
 * parsed, validated, and memoised. Subsequent calls return the cached
 * object. Throws a descriptive error if the file is missing or malformed —
 * see {@link loadSnapshot} for the awaitable variant preferred by callers
 * that want to surface "not yet generated" as an async rejection.
 */
export function getSnapshot(): Snapshot {
  if (cachedSnapshot !== undefined) {
    return cachedSnapshot;
  }

  const snapshotPath = getSnapshotPath();
  if (!existsSync(snapshotPath)) {
    throw missingSnapshotError(snapshotPath);
  }

  let raw: string;
  try {
    raw = readFileSync(snapshotPath, "utf8");
  } catch (err) {
    throw new Error(
      `[content/snapshot] Failed to read ${snapshotPath}: ${formatReadError(err)}.`,
    );
  }

  cachedSnapshot = parseSnapshot(raw, snapshotPath);
  return cachedSnapshot;
}

/**
 * Asynchronously return the cached structured-content snapshot. Uses
 * `fs.promises.readFile` so callers that are already in an async context
 * (Route Handlers, MDX pipeline, tests) do not have to jump onto the
 * synchronous I/O path. Semantics are otherwise identical to
 * {@link getSnapshot}: first call reads and memoises; subsequent calls
 * resolve to the cached object.
 */
export async function loadSnapshot(): Promise<Snapshot> {
  if (cachedSnapshot !== undefined) {
    return cachedSnapshot;
  }

  const snapshotPath = getSnapshotPath();
  if (!existsSync(snapshotPath)) {
    throw missingSnapshotError(snapshotPath);
  }

  let raw: string;
  try {
    raw = await fsPromises.readFile(snapshotPath, "utf8");
  } catch (err) {
    throw new Error(
      `[content/snapshot] Failed to read ${snapshotPath}: ${formatReadError(err)}.`,
    );
  }

  cachedSnapshot = parseSnapshot(raw, snapshotPath);
  return cachedSnapshot;
}
