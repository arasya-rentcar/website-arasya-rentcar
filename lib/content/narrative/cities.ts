/**
 * City narrative loader.
 *
 * Thin composition over the generic `loadNarrative("city", ...)` returned by
 * `./mdx.ts` and `compileMdxToReact` from `./compile.ts` (task 4.7). The
 * `city` variant of the frontmatter is validated by the shared
 * `cityFm` schema in `./schema.ts` (R5.3); this module just exposes the
 * per-entity return shape used by the compound loader (`lib/content/index.ts`
 * — task 4.8) and the `CityTemplate` (design §7).
 *
 * Returns `null` when the MDX file is missing. Callers (task 4.8) interpret
 * `null` per R23.7 (auto-demote a `launched` City to `coverable` for that
 * locale when its MDX file is missing).
 *
 * Requirements: R23.1 (file layout), R23.4 (frontmatter strip + validation).
 * Design reference: §4.1.
 */

import type { ReactElement } from "react";

import { compileMdxToReact } from "./compile";
import { loadNarrative } from "./mdx";
import type { FrontmatterFor } from "./schema";

/**
 * Narrative loader return shape for a City.
 *
 * `body` is the compiled MDX rendered through the allowlisted component
 * registry (`components/mdx/index.ts`) and is embedded directly in the
 * `CityTemplate`. `bodyText` is retained so the uniqueness analyzer
 * (task 12.2) and word-count extractor (`./wordCount`) can run against the
 * stripped MDX source.
 */
export interface CityNarrative {
  frontmatter: FrontmatterFor<"city">;
  bodyText: string;
  wordCount: number;
  body: ReactElement;
}

/**
 * Load, validate, and render a City narrative MDX file for the given locale.
 *
 * Returns `null` when `content/cities/{locale}/{slug}.mdx` does not exist.
 * Any other failure (corrupt frontmatter, unknown JSX tag, IO error) is
 * surfaced as a `[mdx] ...` error from the upstream loader or
 * `[mdx-compile] ...` from the compiler.
 */
export async function loadCityNarrative(
  locale: "id" | "en",
  slug: string,
): Promise<CityNarrative | null> {
  const loaded = await loadNarrative("city", locale, slug);
  if (loaded === null) return null;

  const body = await compileMdxToReact(loaded.bodyText);
  return {
    frontmatter: loaded.frontmatter,
    bodyText: loaded.bodyText,
    wordCount: loaded.wordCount,
    body,
  };
}
