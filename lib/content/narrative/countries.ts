/**
 * Country narrative loader.
 *
 * Mirrors `./cities.ts`. Country frontmatter is validated by `countryFm`
 * (R6.2 — ≥3 `useCases`, ≥3 `faqs`); the MDX body is compiled through the
 * allowlisted component registry and returned as a `React.ReactElement`.
 *
 * Returns `null` when the MDX file is missing. Callers (task 4.8) interpret
 * `null` per R23.7 (exclude a missing Country with a warning rather than
 * attempting to auto-demote — only Cities demote).
 *
 * Requirements: R23.1, R23.4. Design reference: §4.1.
 */

import type { ReactElement } from "react";

import { compileMdxToReact } from "./compile";
import { loadNarrative } from "./mdx";
import type { FrontmatterFor } from "./schema";

/**
 * Narrative loader return shape for a Country. See `CityNarrative` for the
 * rationale behind exposing both `bodyText` and the compiled `body`.
 */
export interface CountryNarrative {
  frontmatter: FrontmatterFor<"country">;
  bodyText: string;
  wordCount: number;
  body: ReactElement;
}

/**
 * Load, validate, and render a Country narrative MDX file for the given
 * locale. Returns `null` when
 * `content/countries/{locale}/{slug}.mdx` does not exist.
 */
export async function loadCountryNarrative(
  locale: "id" | "en",
  slug: string,
): Promise<CountryNarrative | null> {
  const loaded = await loadNarrative("country", locale, slug);
  if (loaded === null) return null;

  const body = await compileMdxToReact(loaded.bodyText);
  return {
    frontmatter: loaded.frontmatter,
    bodyText: loaded.bodyText,
    wordCount: loaded.wordCount,
    body,
  };
}
