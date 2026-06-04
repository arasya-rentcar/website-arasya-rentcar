/**
 * Content-hash cache for narrative MDX compilation.
 *
 * Backs the MDX loader (`./mdx.ts`, task 4.5) so that re-running the build
 * against hundreds of city / country / vehicle / service / article MDX files
 * only re-parses the ones whose file contents changed. Per design §4.5 /
 * R23.9 the cache key is `SHA-256(fileContent + SCHEMA_VERSION)` and each
 * entry lives at `.next/cache/mdx/{locale}/{entity}/{slug}.json`.
 *
 * Layout on disk
 *   .next/
 *     cache/
 *       mdx/
 *         id/
 *           cities/
 *             jakarta.json  ← one {@link CachedEntry} per MDX file
 *         en/
 *           cities/
 *             jakarta.json
 *
 * Why the `SCHEMA_VERSION` bump matters
 *   When the frontmatter schemas in `./schema.ts` change semantics (a new
 *   required field, a stricter regex, etc.) every pre-existing cache entry
 *   must be treated as stale because the previous `frontmatter` blob may no
 *   longer round-trip through the current zod parser. Bumping
 *   {@link SCHEMA_VERSION} invalidates every entry at once because the hash
 *   mixes the version string into the file-content digest.
 *
 * Path resolution
 *   Cache paths are resolved from `process.cwd()` rather than
 *   `import.meta.url`. `next build` and the `scripts/*.ts` tooling both run
 *   from the repo root, so `process.cwd()` is stable; bundlers map
 *   `import.meta.url` deep into `.next/server/**`, which cannot be walked
 *   back to the repo root reliably.
 *
 * Safety / atomicity
 *   Writes go to a sibling `*.tmp` file first and are then renamed over the
 *   final path. This prevents partially-written JSON from being picked up by
 *   a subsequent read if the build is interrupted (CI runner killed, etc.).
 *   Reads that encounter malformed JSON or a missing field simply return
 *   `null`, signalling a cache miss — the loader recomputes and rewrites.
 *
 * Pure-module contract
 *   - No side effects at import time.
 *   - Only `node:crypto`, `node:fs`, and `node:path` are imported.
 *   - No Next.js, React, or third-party runtime dependencies.
 *
 * Requirements satisfied:
 *   - R23.9 content-hash cache keeps rebuilds fast at hundreds of files.
 *
 * Design references: §4.3, §4.5.
 */

import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";

// ---------------------------------------------------------------------------
// Module-level constants
// ---------------------------------------------------------------------------

/**
 * Repo-relative root directory for cached MDX entries. Resolved against
 * `process.cwd()` inside {@link cachePathFor} to produce an absolute path.
 * Kept exported so tests and tooling (task 4.13 checkpoint) can reference the
 * same value without re-deriving it.
 */
export const CACHE_DIR_ROOT = join(".next", "cache", "mdx");

/**
 * Monotonic version string mixed into every content hash. Bump by one
 * whenever the frontmatter schemas in `./schema.ts` change semantics so that
 * every existing cache entry is invalidated on the next build.
 */
export const SCHEMA_VERSION = "1";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * One MDX file's cached compilation product.
 *
 * `frontmatter` is stored as `unknown` intentionally — the cache is
 * schema-agnostic so a single reader/writer handles every entity kind. The
 * loader re-validates `frontmatter` with the right zod schema on every hit,
 * which is fast enough (sub-millisecond) that we do not try to avoid it;
 * doing so also means a schema tightening that slips past the
 * {@link SCHEMA_VERSION} bump still gets caught on the next read.
 */
export interface CachedEntry {
  /** Hex SHA-256 of `fileContent + SCHEMA_VERSION`, from {@link contentHash}. */
  hash: string;
  /** Parsed frontmatter blob (zod-validated by the loader). */
  frontmatter: unknown;
  /** MDX body with frontmatter stripped (R23.4). */
  bodyText: string;
  /** Word count of `bodyText` per `./wordCount`. */
  wordCount: number;
}

// ---------------------------------------------------------------------------
// Hashing
// ---------------------------------------------------------------------------

/**
 * Compute the content hash for a single MDX file.
 *
 * Uses SHA-256 over the UTF-8 bytes of the file contents concatenated with
 * {@link SCHEMA_VERSION}. The version suffix is what lets us invalidate
 * every cached entry with a single-character bump when the frontmatter
 * schemas change semantics.
 *
 * @example
 * contentHash("---\ntitle: Jakarta\n---\nHello.") // 64-char hex string
 */
export function contentHash(fileContent: string): string {
  return createHash("sha256").update(fileContent).update(SCHEMA_VERSION).digest("hex");
}

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

/**
 * Absolute cache path for a given `(locale, entity, slug)` tuple.
 *
 * `entity` is the plural directory name (`"cities" | "countries" |
 * "vehicles" | "services" | "articles"`) to mirror the content tree layout
 * from R23.1. The loader in `./mdx.ts` maps the singular `EntityKind` to
 * the plural directory name before calling this function.
 */
export function cachePathFor(locale: "id" | "en", entity: string, slug: string): string {
  return resolve(process.cwd(), CACHE_DIR_ROOT, locale, entity, `${slug}.json`);
}

// ---------------------------------------------------------------------------
// Runtime-shape validation for cached entries
// ---------------------------------------------------------------------------

function isCachedEntry(value: unknown): value is CachedEntry {
  if (value === null || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.hash !== "string" || candidate.hash.length === 0) return false;
  if (typeof candidate.bodyText !== "string") return false;
  if (typeof candidate.wordCount !== "number" || !Number.isFinite(candidate.wordCount)) {
    return false;
  }
  // `frontmatter` is intentionally `unknown`; any JSON-serialisable value is
  // accepted here. The loader runs zod validation on it before use.
  if (!("frontmatter" in candidate)) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Read / write
// ---------------------------------------------------------------------------

/**
 * Read and parse a cache entry. Returns `null` on any of:
 *   - file missing
 *   - filesystem read error
 *   - JSON parse error
 *   - parsed JSON is not a well-formed {@link CachedEntry}
 *
 * The loader treats every `null` as a miss and recomputes + overwrites the
 * entry, so corrupt files self-heal on the next build.
 */
export function readCache(path: string): CachedEntry | null {
  if (!existsSync(path)) return null;

  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!isCachedEntry(parsed)) return null;
  return parsed;
}

/**
 * Write a cache entry atomically.
 *
 * Sequence:
 *   1. `mkdir -p` the parent directory.
 *   2. Serialize and write to a sibling `*.tmp` file (sharing the directory
 *      so the rename is a same-filesystem atomic move).
 *   3. `rename` the temp file over the destination.
 *
 * If the process dies between steps 2 and 3 the final file is either absent
 * (miss on next build, which is correct) or contains the previous valid
 * value; the partial `*.tmp` is left behind but does not affect correctness.
 * A best-effort `unlink` on the temp file runs if the rename itself throws.
 */
export function writeCache(path: string, entry: CachedEntry): void {
  const parent = dirname(path);
  mkdirSync(parent, { recursive: true });

  const tmpPath = `${path}.tmp`;
  const payload = JSON.stringify(entry);

  writeFileSync(tmpPath, payload, "utf8");
  try {
    renameSync(tmpPath, path);
  } catch (err) {
    // Best-effort cleanup — the temp file would otherwise linger in
    // `.next/cache/mdx` and confuse a future debugger.
    try {
      unlinkSync(tmpPath);
    } catch {
      /* ignore */
    }
    throw err;
  }
}
