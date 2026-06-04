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
 * English City route (task 7.6).
 *
 * Serves `/en/car-rental/{city}` — the English mirror of the Bahasa
 * Indonesia `/sewa-mobil/{city}` route. Both routes share identical
 * dispatch logic via `lib/routing/cityRouteHelper.ts`, so the only
 * meaningful difference between the two page files is the static URL
 * segment, which is implied by the filesystem path (`sewa-mobil/` vs
 * `car-rental/`).
 *
 * Next.js App Router does not provide a way for two routes under
 * different static segments to share a single module, so the page
 * file is duplicated here — both versions are thin wrappers over the
 * shared helper, and the critical alias → coverable → inactive
 * triage lives in one place.
 *
 * Dispatch logic (R3.6, R22.3, R22.7, R22.8):
 *
 *   1. Validate the `[locale]` segment against `SUPPORTED_LOCALES`; any
 *      other value `notFound()`s.
 *   2. Delegate to {@link resolveCityRoute}, which owns:
 *      - slug format validation (R3.4 / R3.5);
 *      - the 301 permanent redirect when the slug is an alias (R22.8);
 *      - the 404 for `inactive` or missing cities (R22.7).
 *   3. Render `<CityTemplate>` for launched cities (R22.3) or
 *      `<CoverageTemplate>` for coverable cities (R22.4), after
 *      computing the 3–6 nearest launched cities via
 *      {@link nearestLaunched}.
 *
 * ISR (R5.10): `revalidate = 3600`, `dynamicParams = true` — identical
 * cadence to the Bahasa Indonesia mirror so the two locales revalidate
 * in lockstep.
 */

/** R5.10 ISR budget (1 hour). */
export const revalidate = 3600;

/** R5.10 allows unknown dynamic params to ISR at request time. */
export const dynamicParams = true;

/**
 * Pre-build static params for every launched + coverable city across
 * both locales. See the Bahasa Indonesia mirror's `generateStaticParams`
 * for the full rationale; this function is intentionally identical so
 * the two routes pre-render the same matrix of city slugs.
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
  // the CoverageTemplate. Same sequencing as the Bahasa Indonesia
  // mirror so the two routes render byte-identical HTML for a given
  // slug modulo Locale-specific copy.
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
 * Build Next.js `Metadata` for the English City route (R7.1, R22.5,
 * R22.6). See the Bahasa Indonesia mirror's `generateMetadata` for the
 * full rationale; this function is the exact duplicate so the two
 * routes emit matching canonical / hreflang / robots directives for
 * the same canonical city.
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
