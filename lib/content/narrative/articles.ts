/**
 * Article narrative loader.
 *
 * Mirrors `./cities.ts`. Article frontmatter is validated by `articleFm`
 * (R8.5 — `author`, `publishedAt`); the MDX body is compiled through the
 * allowlisted component registry and returned as a `React.ReactElement`.
 *
 * This module also exports `listArticleSlugs`, the slug enumerator used by
 * the Blog_Index + `/sitemap.xml` generators to discover every article MDX
 * file on disk for a given locale. The listing operates purely on
 * filenames; nothing is parsed here, so invalid frontmatter only surfaces
 * when an individual article is loaded via `loadArticleNarrative`.
 *
 * Returns `null` when the MDX file is missing. The compound loader
 * (task 4.8) treats `null` as "no such article" — Articles are enumerated
 * from disk rather than Supabase, so there is no coverage state to demote.
 *
 * Requirements: R23.1, R23.4. Design reference: §4.1.
 */

import { existsSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";

import type { ReactElement } from "react";

import { compileMdxToReact } from "./compile";
import { loadNarrative } from "./mdx";
import type { FrontmatterFor } from "./schema";

/**
 * Narrative loader return shape for an Article. See `CityNarrative` for the
 * rationale behind exposing both `bodyText` and the compiled `body`.
 */
export interface ArticleNarrative {
  frontmatter: FrontmatterFor<"article">;
  bodyText: string;
  wordCount: number;
  body: ReactElement;
}

/**
 * Load, validate, and render an Article narrative MDX file for the given
 * locale. Returns `null` when
 * `content/articles/{locale}/{slug}.mdx` does not exist.
 */
export async function loadArticleNarrative(
  locale: "id" | "en",
  slug: string,
): Promise<ArticleNarrative | null> {
  const loaded = await loadNarrative("article", locale, slug);
  if (loaded === null) return null;

  const body = await compileMdxToReact(loaded.bodyText);
  return {
    frontmatter: loaded.frontmatter,
    bodyText: loaded.bodyText,
    wordCount: loaded.wordCount,
    body,
  };
}

// ---------------------------------------------------------------------------
// Slug enumeration
// ---------------------------------------------------------------------------

/**
 * MDX file extension applied to article slugs on disk. Kept as a module
 * constant so the `listArticleSlugs` stripper stays consistent with
 * `resolveMdxPath` in `./mdx.ts`.
 */
const MDX_EXT = ".mdx";

/**
 * Return every article slug found under
 * `content/articles/{locale}/` (file extension stripped, case-preserving),
 * sorted ascending by slug.
 *
 * Behavior:
 *   - Missing directory → empty array. This matches the convention used by
 *     the narrative pipeline (task 4.5): absent content files are not an
 *     error, they just mean nothing is indexed for that locale yet.
 *   - Non-`.mdx` entries (for example, stray `.md` or a README) are
 *     ignored. Sub-directories are skipped — article slugs live as leaf
 *     `.mdx` files per R23.1.
 *   - Slug ordering is `localeCompare`-free (simple lexicographic sort) to
 *     match the ordering the sitemap and blog index want: deterministic,
 *     byte-wise, and stable across Node versions.
 *
 * @param locale Content locale to enumerate.
 * @returns Sorted list of article slugs. Never throws on a missing dir.
 */
export async function listArticleSlugs(locale: "id" | "en"): Promise<string[]> {
  const dir = resolve(process.cwd(), "content", "articles", locale);
  if (!existsSync(dir)) return [];

  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return [];
  }

  const slugs: string[] = [];
  for (const entry of entries) {
    if (!entry.endsWith(MDX_EXT)) continue;
    // Guard against a directory named `something.mdx`. Using `statSync`
    // here keeps the module dependency-free; the list is short so the
    // extra syscall per entry is not worth a `withFileTypes` readdir.
    const absolute = resolve(dir, entry);
    let isFile: boolean;
    try {
      isFile = statSync(absolute).isFile();
    } catch {
      continue;
    }
    if (!isFile) continue;
    slugs.push(entry.slice(0, entry.length - MDX_EXT.length));
  }

  slugs.sort();
  return slugs;
}
