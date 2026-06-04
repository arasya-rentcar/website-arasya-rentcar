/**
 * Next.js `Metadata` builder for Arasya Rentcar pages.
 *
 * Requirements:
 * - R4.3 — every Indexable_Page emits `<link rel="alternate" hreflang="…">`
 *   for `id-ID`, `en`, and `x-default`.
 * - R4.4 — when a page exists in only one Locale, the missing Locale's link
 *   is omitted and `x-default` points to the existing URL.
 * - R4.8 — `<html lang>` matches the hreflang identity emitted for the
 *   active Locale. This module maps `Locale` → Open Graph locale strings
 *   (`id_ID` / `en_US`) consistently with the hreflang emitted by
 *   {@link hreflangAlternates}; the `<html lang>` attribute itself is set by
 *   the route-level layout using the same Locale value, so the identities
 *   stay in lockstep.
 * - R6.7 — caller supplies a unique `seoTitle` + `seoDescription` per page /
 *   locale. Length budgets (30–65 chars for title, 70–160 for description)
 *   are the caller's responsibility; this module does not enforce them.
 * - R6.8 — exactly one `<link rel="canonical">` per page via
 *   `alternates.canonical`.
 * - R7.1 — output includes `title`, `description`, `alternates.canonical`,
 *   `alternates.languages`, `openGraph`, `twitter`, `robots`.
 * - R7.7 / R22.5 / R22.6 — coverage pages with `allow_index === false` emit
 *   `noindex, follow`; launched pages inherit the site default (`index,
 *   follow`).
 *
 * Design: §10 (Metadata Generator).
 *
 * Pure module: no React, no Next.js runtime imports — only the `Metadata`
 * type. Safe to call from Server Components, route handlers, and tests.
 */

import type { Metadata } from "next";

import type { Locale } from "@/lib/i18n/getDictionary";

import { absoluteUrl, canonicalFor, hreflangAlternates, type HreflangInput } from "./canonical";

/** Open Graph page types understood by the `/api/og` endpoint (task 6.11). */
export type OgPageType =
  | "homepage"
  | "city"
  | "country"
  | "vehicle"
  | "airport"
  | "service"
  | "article"
  | "static";

/**
 * Input to {@link buildMetadata}.
 *
 * Paths are always locale-prefixed (e.g. `/sewa-mobil/bogor`, `/en/car-rental/bogor`).
 * This module never performs slug mapping — that belongs to
 * `lib/i18n/pageEquivalent.ts` (task 3.4). Callers pass the already-mapped
 * paths in {@link BuildMetadataInput.alternates}.
 */
export interface BuildMetadataInput {
  /** Active Locale. Drives Open Graph locale (`id_ID` / `en_US`). */
  locale: Locale;

  /**
   * Locale-prefixed path for the active Locale. Becomes the canonical URL
   * (R6.8) and the base for Open Graph / Twitter URLs.
   */
  pathForLocale: string;

  /**
   * Locale-prefixed paths in each supported Locale. Use `null`/`undefined`
   * for a Locale where the page does not exist — R4.4 requires that entry
   * to be omitted rather than pointed at a fallback.
   *
   * When omitted entirely, only the active Locale's URL is emitted along
   * with `x-default` pointing at the same URL.
   */
  alternates?: { id?: string | null; en?: string | null };

  /** Unique `<title>` for this page/locale (R6.7). Emitted verbatim. */
  seoTitle: string;

  /** Unique `<meta name="description">` for this page/locale (R6.7). */
  seoDescription: string;

  /**
   * Open Graph overrides. `title` / `subtitle` drive the `/api/og` image
   * query parameters; `pageType` controls both the OG image variant and
   * `openGraph.type` (`"article"` for articles, `"website"` otherwise).
   */
  og?: {
    title?: string;
    subtitle?: string;
    pageType?: OgPageType;
  };

  /**
   * Robots policy input. When `allowIndex === false`, emits
   * `noindex, follow` per R7.7 / R22.5 / R22.6. Any other value — including
   * omitted — falls through to the site default `index, follow`.
   */
  robots?: { allowIndex?: boolean };

  /** Twitter overrides. `handle` maps to `twitter.creator`. */
  twitter?: {
    card?: "summary" | "summary_large_image";
    handle?: string;
  };
}

/**
 * Map a {@link Locale} to the Open Graph locale identifier expected by
 * consumers like Facebook / LinkedIn. Kept in sync with the hreflang
 * identities emitted by {@link hreflangAlternates} to satisfy R4.8.
 */
function ogLocaleFor(locale: Locale): "id_ID" | "en_US" {
  return locale === "id" ? "id_ID" : "en_US";
}

/**
 * Build the absolute `/api/og` image URL for this page. Query parameters
 * match the OG endpoint contract from task 6.11:
 *   - `title`    → heading drawn on the image
 *   - `subtitle` → secondary line (omitted when empty)
 *   - `locale`   → drives font selection and copy tweaks
 *   - `pageType` → drives layout variant
 */
function buildOgImageUrl(
  locale: Locale,
  seoTitle: string,
  og: BuildMetadataInput["og"],
): string {
  const ogBase = new URL(absoluteUrl("/api/og"));
  ogBase.searchParams.set("title", og?.title ?? seoTitle);
  ogBase.searchParams.set("subtitle", og?.subtitle ?? "");
  ogBase.searchParams.set("locale", locale);
  ogBase.searchParams.set("pageType", og?.pageType ?? "static");
  return ogBase.toString();
}

/**
 * Produce the Next.js {@link Metadata} object for a page.
 *
 * See {@link BuildMetadataInput} for parameter semantics. Returns a plain
 * object — the caller is expected to forward it from `generateMetadata`.
 */
export function buildMetadata(input: BuildMetadataInput): Metadata {
  const canonical = canonicalFor(input.pathForLocale);

  // R4.4: when the caller supplies alternates, honour them verbatim so
  // missing-locale entries stay omitted. Otherwise emit only the active
  // Locale's URL (plus `x-default` pointing to it).
  const hreflangInput: HreflangInput =
    input.alternates ??
    (input.locale === "id"
      ? { id: input.pathForLocale }
      : { en: input.pathForLocale });
  const languages = hreflangAlternates(hreflangInput);

  // R7.7 / R22.5 / R22.6: honour explicit `allowIndex === false`; any other
  // value (including omitted) inherits the site default `index, follow`.
  const robots: Metadata["robots"] =
    input.robots?.allowIndex === false
      ? { index: false, follow: true }
      : { index: true, follow: true };

  const ogImageUrl = buildOgImageUrl(input.locale, input.seoTitle, input.og);
  const ogType: "article" | "website" =
    input.og?.pageType === "article" ? "article" : "website";

  const twitterCard = input.twitter?.card ?? "summary_large_image";
  const twitterHandle = input.twitter?.handle;

  const twitter: NonNullable<Metadata["twitter"]> = {
    card: twitterCard,
    title: input.seoTitle,
    description: input.seoDescription,
    images: [ogImageUrl],
    ...(typeof twitterHandle === "string" && twitterHandle !== ""
      ? { creator: twitterHandle }
      : {}),
  };

  return {
    title: input.seoTitle,
    description: input.seoDescription,
    alternates: {
      canonical,
      languages,
    },
    openGraph: {
      type: ogType,
      url: canonical,
      siteName: "Arasya Rentcar",
      title: input.og?.title ?? input.seoTitle,
      description: input.seoDescription,
      locale: ogLocaleFor(input.locale),
      images: [{ url: ogImageUrl, width: 1200, height: 630 }],
    },
    twitter,
    robots,
  };
}
