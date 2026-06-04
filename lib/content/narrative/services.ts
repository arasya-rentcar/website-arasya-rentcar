/**
 * Service narrative loader.
 *
 * Mirrors `./cities.ts`. Service frontmatter is validated by `serviceFm`
 * (R6.4 — ≥3 `benefits`, ≥3 `faqs`); the MDX body is compiled through the
 * allowlisted component registry and returned as a `React.ReactElement`.
 *
 * Returns `null` when the MDX file is missing. The compound loader
 * (task 4.8) excludes a missing Service with a warning per R23.7 — only
 * Cities auto-demote.
 *
 * Requirements: R23.1, R23.4. Design reference: §4.1.
 */

import type { ReactElement } from "react";

import { compileMdxToReact } from "./compile";
import { loadNarrative } from "./mdx";
import type { FrontmatterFor } from "./schema";

/**
 * Narrative loader return shape for a Service. See `CityNarrative` for the
 * rationale behind exposing both `bodyText` and the compiled `body`.
 */
export interface ServiceNarrative {
  frontmatter: FrontmatterFor<"service">;
  bodyText: string;
  wordCount: number;
  body: ReactElement;
}

/**
 * Load, validate, and render a Service narrative MDX file for the given
 * locale. Returns `null` when
 * `content/services/{locale}/{slug}.mdx` does not exist.
 */
export async function loadServiceNarrative(
  locale: "id" | "en",
  slug: string,
): Promise<ServiceNarrative | null> {
  const loaded = await loadNarrative("service", locale, slug);
  if (loaded === null) return null;

  const body = await compileMdxToReact(loaded.bodyText);
  return {
    frontmatter: loaded.frontmatter,
    bodyText: loaded.bodyText,
    wordCount: loaded.wordCount,
    body,
  };
}
