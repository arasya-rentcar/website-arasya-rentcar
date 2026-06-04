/**
 * Narrative MDX loader.
 *
 * Reads an MDX file under `content/{entity}/{locale}/{slug}.mdx` (R23.1),
 * splits frontmatter from body via `gray-matter`, validates the frontmatter
 * through the zod schemas in `./schema.ts` (R23.4), scans the body for any
 * JSX custom-component tag that is not in `components/mdx/index.ts`'s
 * `mdxAllowlist` (R23.6 — surface check only; the real JSX→React renderer
 * wiring lands in task 4.7), and returns a shape that downstream narrative
 * loaders (task 4.7) can consume directly.
 *
 * A content-hash cache in `./cache.ts` (R23.9) keeps this fast at scale:
 *   1. Read the raw MDX bytes and hash them with the schema version mixed in.
 *   2. If the cache entry at `.next/cache/mdx/{locale}/{entity}/{slug}.json`
 *      exists AND its hash matches, return the cached {@link LoadedNarrative}
 *      (frontmatter included).
 *   3. On a miss, parse frontmatter + body, re-validate via zod, count words,
 *      scan for disallowed custom components, write a fresh cache entry, and
 *      return the computed {@link LoadedNarrative}.
 *
 * Scope for task 4.5 (intentional deferrals):
 *   - This module does not compile MDX to React; it only extracts and
 *     validates frontmatter + body text. The `@next/mdx` wiring in
 *     `next.config.mjs` and the real component mapping happen in task 4.7.
 *   - The allowlist enforcement here is a cheap textual scan over custom
 *     (PascalCase) JSX tag names. That catches the common failure mode
 *     (`<Foo>` referenced without an import entry) before we even reach the
 *     compiler. Lowercase HTML tags and standard markdown are ignored.
 *
 * Path resolution — same rule as `lib/content/structured/snapshot.ts`: every
 * absolute path is derived from `process.cwd()` so the loader behaves
 * identically whether invoked from `next build`, `next dev`, or a standalone
 * `tsx scripts/*.ts` tool.
 *
 * Requirements satisfied:
 *   - R23.1 content located under `content/{cities|countries|vehicles|services|articles}/{locale}/{slug}.mdx`
 *   - R23.4 frontmatter parsed and stripped from the body before word-count checks
 *   - R23.6 allowlist enforcement for JSX tags (surface scan; renderer-level
 *           enforcement is completed in task 4.7)
 *   - R23.9 content-hash cache keeps rebuilds fast at hundreds of files
 *
 * Design references: §4.3, §4.5.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import matter from "gray-matter";

import { mdxAllowlist } from "@/components/mdx";

import { cachePathFor, contentHash, readCache, writeCache, type CachedEntry } from "./cache";
import { parseFrontmatter, type EntityKind, type FrontmatterFor } from "./schema";
import { countWords } from "./wordCount";

// ---------------------------------------------------------------------------
// EntityKind → plural directory mapping (R23.1)
// ---------------------------------------------------------------------------

/**
 * Map from the singular {@link EntityKind} used throughout the content layer
 * to the plural directory name used on disk. Declared `as const` so the
 * type system sees a fixed `Record<EntityKind, "cities" | "countries" | ...>`
 * and callers can't pass an unmapped kind.
 */
const ENTITY_DIR: Readonly<Record<EntityKind, string>> = {
  city: "cities",
  country: "countries",
  vehicle: "vehicles",
  service: "services",
  article: "articles",
} as const;

// ---------------------------------------------------------------------------
// Allowlist scan
// ---------------------------------------------------------------------------

/**
 * Matches a JSX opening-tag name that starts with a capital letter. Per MDX
 * convention lowercase names are treated as plain HTML, so we only need to
 * look at PascalCase identifiers to decide whether they resolve to a
 * user-defined component. The regex is intentionally tolerant of self-close
 * (`<Foo />`) and attributes (`<Foo bar="baz">`) because we only care about
 * the tag name that follows the opening `<`.
 */
const JSX_OPEN_TAG_RE = /<([A-Z][A-Za-z0-9]*)/g;

/**
 * Set of allowed JSX tag names (keys of `mdxAllowlist`). Computed once at
 * module load so the hot-path (every MDX load) is a `Set.has` lookup.
 */
const ALLOWED_TAGS: ReadonlySet<string> = new Set(Object.keys(mdxAllowlist));

/**
 * Throw a build-time error when an MDX body references a PascalCase JSX tag
 * that is not a key in `mdxAllowlist`. Lowercase tags are deliberately
 * ignored — MDX treats them as plain HTML. The thrown error format mirrors
 * the convention used elsewhere in this module so CI log scrapers only have
 * to recognise one prefix.
 */
function assertOnlyAllowedTags(bodyText: string, fileLabel: string): void {
  const seen = new Set<string>();
  for (const match of bodyText.matchAll(JSX_OPEN_TAG_RE)) {
    const tag = match[1];
    if (tag === undefined) continue;
    if (seen.has(tag)) continue;
    seen.add(tag);
    if (!ALLOWED_TAGS.has(tag)) {
      throw new Error(`[mdx] ${fileLabel} — unknown component <${tag}>`);
    }
  }
}

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

/**
 * Absolute path to an MDX file, derived from `process.cwd()`. The directory
 * name is looked up via {@link ENTITY_DIR} so callers pass the singular
 * {@link EntityKind} and never have to remember the plural directory names.
 */
export function resolveMdxPath(kind: EntityKind, locale: "id" | "en", slug: string): string {
  const entity = ENTITY_DIR[kind];
  return resolve(process.cwd(), "content", entity, locale, `${slug}.mdx`);
}

/**
 * Cheap existence probe. Narrative entity loaders (task 4.7) use this
 * together with `coverage_state` to decide whether a `launched` City should
 * be demoted to `coverable` per R23.7.
 */
export function mdxExists(kind: EntityKind, locale: "id" | "en", slug: string): boolean {
  return existsSync(resolveMdxPath(kind, locale, slug));
}

// ---------------------------------------------------------------------------
// Public loader API
// ---------------------------------------------------------------------------

/**
 * Result of {@link loadNarrative}. `frontmatter` is typed to the concrete
 * per-kind zod-inferred shape via {@link FrontmatterFor}, `bodyText` is the
 * MDX body with frontmatter stripped (R23.4), `wordCount` is the count
 * produced by `./wordCount#countWords`, and `path` is the absolute file path
 * the loader read from.
 */
export interface LoadedNarrative<K extends EntityKind> {
  frontmatter: FrontmatterFor<K>;
  bodyText: string;
  wordCount: number;
  path: string;
}

/**
 * Load, validate, and cache a single MDX narrative file.
 *
 * Returns `null` when the MDX file does not exist. What `null` means is up
 * to the caller — narrative entity loaders (task 4.7) interpret it per
 * R23.7 (e.g. a missing `launched` City MDX triggers demotion to
 * `coverable` in that locale).
 *
 * On any other failure (corrupt frontmatter, unknown JSX component, IO
 * error) this function throws a `[mdx] ...` error whose message identifies
 * the file so CI logs point straight at the offending path.
 */
export async function loadNarrative<K extends EntityKind>(
  kind: K,
  locale: "id" | "en",
  slug: string,
): Promise<LoadedNarrative<K> | null> {
  const path = resolveMdxPath(kind, locale, slug);
  if (!existsSync(path)) return null;

  const entityDir = ENTITY_DIR[kind];
  const fileLabel = `${entityDir}/${locale}/${slug}.mdx`;

  let fileContent: string;
  try {
    fileContent = readFileSync(path, "utf8");
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(`[mdx] ${fileLabel} — failed to read file: ${reason}`);
  }

  const hash = contentHash(fileContent);
  const cachePath = cachePathFor(locale, entityDir, slug);

  // Fast path — cache hit.
  const cached = readCache(cachePath);
  if (cached !== null && cached.hash === hash) {
    // Re-validate frontmatter through zod on every hit. This is cheap and
    // catches the edge case where a schema tightening lands without a
    // `SCHEMA_VERSION` bump. The parsed value is also structurally cloned
    // through zod, so callers never receive a reference to the cache blob.
    let frontmatter: FrontmatterFor<K>;
    try {
      frontmatter = parseFrontmatter(kind, cached.frontmatter);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      throw new Error(`[mdx] ${fileLabel} — ${reason}`);
    }
    return {
      frontmatter,
      bodyText: cached.bodyText,
      wordCount: cached.wordCount,
      path,
    };
  }

  // Slow path — parse, validate, scan, cache, return.
  const parsed = matter(fileContent);
  const bodyText = parsed.content;

  let frontmatter: FrontmatterFor<K>;
  try {
    frontmatter = parseFrontmatter(kind, parsed.data);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(`[mdx] ${fileLabel} — ${reason}`);
  }

  // R23.6 surface check. Rendering-level enforcement comes in task 4.7.
  assertOnlyAllowedTags(bodyText, fileLabel);

  const wordCount = countWords(bodyText);

  const entry: CachedEntry = {
    hash,
    frontmatter,
    bodyText,
    wordCount,
  };
  writeCache(cachePath, entry);

  return {
    frontmatter,
    bodyText,
    wordCount,
    path,
  };
}
