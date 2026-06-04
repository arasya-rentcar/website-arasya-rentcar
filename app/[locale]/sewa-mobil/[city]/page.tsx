import type { Metadata } from "next";
import { notFound } from "next/navigation";

import CityTemplate from "@/components/templates/CityTemplate";
import CoverageTemplate from "@/components/templates/CoverageTemplate";
import { getCities, getCity, getCityAlias } from "@/lib/content";
import {
  SUPPORTED_LOCALES,
  getDictionary,
  isLocale,
  type Locale,
} from "@/lib/i18n/getDictionary";
import { citySlugPath } from "@/lib/i18n/slugMap";
import {
  nearestLaunched,
  resolveCityRoute,
} from "@/lib/routing/cityRouteHelper";
import { isValidSlug } from "@/lib/validation/slug";
import { buildMetadata } from "@/lib/seo/metadata";

/**
 * Bahasa Indonesia City route (task 7.6).
 *
 * Serves `/sewa-mobil/{city}` and `/en/sewa-mobil/{city}` via Next.js's
 * locale-agnostic `app/[locale]/...` nesting — the English mirror lives
 * under `app/[locale]/car-rental/[city]/page.tsx` so the static URL
 * segment matches R3.3 without having to branch on Locale inside the
 * handler.
 *
 * Dispatch logic (R3.6, R22.3, R22.7, R22.8):
 *
 *   1. Validate the `[locale]` segment against `SUPPORTED_LOCALES`; any
 *      other value `notFound()`s.
 *   2. Delegate the alias → coverable → inactive triage to
 *      {@link resolveCityRoute}. That helper is the single source of
 *      truth for R22.8 (301 permanent redirect to the canonical slug
 *      when the requested slug is an alias) and R22.7 (404 for
 *      `inactive` or missing cities). It returns either a launched or
 *      coverable {@link CityWithNarrative}.
 *   3. Render `<CityTemplate>` for launched cities (R22.3) or
 *      `<CoverageTemplate>` for coverable cities (R22.4), after
 *      computing the 3–6 nearest launched cities via
 *      {@link nearestLaunched}.
 *
 * ISR (R5.10): `revalidate = 3600` keeps every city page on a one-hour
 * regeneration cadence; `dynamicParams = true` lets newly-seeded cities
 * ISR at request time without requiring a rebuild.
 */

/** R5.10 ISR budget (1 hour). */
export const revalidate = 3600;

/** R5.10 allows unknown dynamic params to ISR at request time. */
export const dynamicParams = true;

/**
 * Pre-build static params for every launched + coverable city across
 * both locales. `generateStaticParams` only returns the `[city]` segment
 * here — Next.js cross-joins this output with the parent `[locale]`
 * segment's static params to produce the full matrix of pre-rendered
 * routes (two locales × every city slug).
 *
 * Slugs are unioned across locales via a `Set<string>` because a city
 * that exists in only one locale is still a valid static target for the
 * other locale (the page will resolve to the locale-specific `getCity`
 * result at render time and may 404 if the translation is missing —
 * acceptable behavior per R17.7).
 */
export async function generateStaticParams(): Promise<{ city: string }[]> {
  const locales: readonly Locale[] = SUPPORTED_LOCALES;
  const all = await Promise.all(
    locales.map((loc) =>
      getCities(loc, { coverage: ["launched", "coverable"] }),
    ),
  );
  const slugs = new Set<string>();
  for (const cities of all) {
    for (const city of cities) slugs.add(city.slug);
  }
  return Array.from(slugs).map((city) => ({ city }));
}

export default async function CityPage({
  params,
}: {
  params: Promise<{ locale: string; city: string }>;
}) {
  const { locale, city: rawSlug } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const city = await resolveCityRoute(locale, rawSlug);
  const dict = await getDictionary(locale);

  if (city.coverageState === "launched") {
    return <CityTemplate locale={locale} city={city} dict={dict} />;
  }

  // coverable → compute 3–6 nearest launched cities (R22.4) and render
  // the CoverageTemplate. We fetch launched cities separately from the
  // resolved city so the list reflects the current build's full cohort
  // rather than a partial snapshot cached inside the resolver.
  const launched = await getCities(locale, { coverage: ["launched"] });
  const nearestLaunchedCities = nearestLaunched(city, launched);
  return (
    <CoverageTemplate
      locale={locale}
      city={city}
      nearestLaunchedCities={nearestLaunchedCities}
      dict={dict}
    />
  );
}

/**
 * Build Next.js `Metadata` for the City route (R7.1, R22.5, R22.6).
 *
 * We re-run the alias lookup here so the canonical path, hreflang
 * alternates, and robots directive match whatever the page body
 * actually renders. Re-running `getCity` on the canonical slug is
 * cheap (the structured half is an in-memory snapshot, the MDX half
 * is cached by content hash per R23.9).
 *
 * Robots handling:
 *   - `launched` cities → inherit the site default `index, follow`.
 *   - `coverable` cities with `allow_index === false` → emit
 *     `noindex, follow` per R7.7 / R22.5.
 *   - `coverable` cities with `allow_index === true` → Indexable per
 *     R22.6 (the build gate that this flag requires ≥150 words of
 *     narrative body is enforced elsewhere, not here).
 *
 * SEO title / description (R6.7): prefer the MDX frontmatter values
 * when present; fall back to a Locale-appropriate default built from
 * the city's display name and short blurb so coverage pages with no
 * narrative still emit a unique `<title>` and `<meta description>`
 * per R6.8.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; city: string }>;
}): Promise<Metadata> {
  const { locale, city: rawSlug } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const slug = rawSlug.toLowerCase();
  if (!isValidSlug(slug)) {
    notFound();
  }

  const alias = await getCityAlias(slug);
  const canonicalSlug = alias?.canonicalSlug ?? slug;
  const city = await getCity(canonicalSlug, locale);
  if (city === null || city.coverageState === "inactive") {
    notFound();
  }

  const narrativeFm = city.narrative?.frontmatter ?? null;
  const seoTitle =
    narrativeFm?.seoTitle ??
    (locale === "id"
      ? `Sewa Mobil dengan Supir ${city.displayName}`
      : `Chauffeur Car Rental in ${city.displayName}`);
  const seoDescription =
    narrativeFm?.seoDescription ??
    city.shortBlurb ??
    (locale === "id"
      ? `Sewa mobil dengan supir profesional di ${city.displayName} bersama Arasya Rentcar.`
      : `Chauffeur car rental with professional drivers in ${city.displayName} by Arasya Rentcar.`);

  const idPath = citySlugPath("id", canonicalSlug);
  const enPath = citySlugPath("en", canonicalSlug);

  return buildMetadata({
    locale,
    pathForLocale: locale === "id" ? idPath : enPath,
    alternates: { id: idPath, en: enPath },
    seoTitle,
    seoDescription,
    og: { pageType: "city" },
    // R7.7 / R22.5 / R22.6: coverage pages with `allow_index=false` emit
    // noindex; launched pages pass through the site default.
    robots: { allowIndex: city.allowIndex },
  });
}
