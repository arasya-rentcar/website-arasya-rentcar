import type { Metadata } from "next";
import { notFound } from "next/navigation";

import AirportTransferTemplate from "@/components/templates/AirportTransferTemplate";
import { getCities, getCity, type Locale } from "@/lib/content";
import { SUPPORTED_LOCALES, isLocale } from "@/lib/i18n/getDictionary";
import { citySlugPath } from "@/lib/i18n/slugMap";
import { resolveAirportTransferPageData } from "@/lib/routing/airportTransferRouteHelper";
import { buildMetadata } from "@/lib/seo/metadata";
import { isValidSlug, normalizeSlug } from "@/lib/validation/slug";

/**
 * Bahasa Indonesia Airport_Transfer_Page route (task 7.9).
 *
 * Serves `/sewa-mobil/{city}/airport-transfer` and, by Next.js's
 * locale-agnostic `app/[locale]/...` nesting, also
 * `/en/sewa-mobil/{city}/airport-transfer` — though the English mirror
 * actually lives under `app/[locale]/car-rental/[city]/airport-transfer/
 * page.tsx` so the static URL segment matches R3.3 without branching on
 * Locale inside the handler.
 *
 * Dispatch logic (R3.5, R5.8, R22.7):
 *
 *   1. Validate the `[locale]` segment against `SUPPORTED_LOCALES`; any
 *      other value `notFound()`s.
 *   2. Normalize + validate the city slug (R3.4). Non-conforming slugs
 *      `notFound()` per R3.5.
 *   3. Delegate resolution to
 *      {@link resolveAirportTransferPageData}. The helper owns the
 *      R5.8 preconditions (launched city + non-empty `city_airports`)
 *      and returns `null` when any are violated — we 404 on `null`.
 *   4. Render `<AirportTransferTemplate>` with the resolved payload.
 *
 * ISR (R5.10): `revalidate = 3600`, `dynamicParams = true` — one-hour
 * regeneration cadence that matches the sibling City route so launched
 * cohorts refresh in lockstep.
 */

/** R5.10 ISR budget (1 hour). */
export const revalidate = 3600;

/** R5.10 allows unknown dynamic params to ISR at request time. */
export const dynamicParams = true;

/**
 * Pre-build static params for every launched city that serves at least
 * one airport, across both locales (R5.8). The static `[locale]` +
 * `[city]` cross-join produced by Next.js is what actually determines
 * the matrix of pre-rendered URLs — this helper only contributes the
 * `[city]` axis.
 *
 * Slugs are unioned across locales via a `Set<string>` because a city
 * that exists in only one locale is still a valid static target for the
 * other locale; the page will resolve to the locale-specific
 * `resolveAirportTransferPageData` at render time and may 404 if the
 * translation is missing — acceptable behavior per R17.7.
 */
export async function generateStaticParams(): Promise<{ city: string }[]> {
  const locales: readonly Locale[] = SUPPORTED_LOCALES;
  const perLocale = await Promise.all(
    locales.map((loc) => getCities(loc, { coverage: ["launched"] })),
  );
  const slugs = new Set<string>();
  for (const cities of perLocale) {
    for (const city of cities) {
      if (city.airports.length > 0) {
        slugs.add(city.slug);
      }
    }
  }
  return Array.from(slugs).map((city) => ({ city }));
}

export default async function AirportTransferPage({
  params,
}: {
  params: Promise<{ locale: string; city: string }>;
}) {
  const { locale, city: rawSlug } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const slug = normalizeSlug(rawSlug);
  if (!isValidSlug(slug)) {
    notFound();
  }

  const data = await resolveAirportTransferPageData(locale, slug);
  if (data === null) {
    notFound();
  }

  return (
    <AirportTransferTemplate
      locale={locale}
      city={data.city}
      recommendedVehicles={data.recommendedVehicles}
      serviceCities={data.serviceCities}
      dict={data.dict}
    />
  );
}

/**
 * Build Next.js `Metadata` for the Airport_Transfer_Page route (R7.1,
 * R4.3, R4.4). Re-runs the city lookup so the canonical path, hreflang
 * alternates, and title / description match the page body. Re-running
 * `getCity` on the canonical slug is cheap — the structured half is an
 * in-memory snapshot, the MDX half is cached by content hash per R23.9.
 *
 * The `robots` directive is NOT overridden here: airport-transfer pages
 * are only generated for launched cities (R5.8), which inherit the
 * site default `index, follow`.
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

  const slug = normalizeSlug(rawSlug);
  if (!isValidSlug(slug)) {
    notFound();
  }

  const city = await getCity(slug, locale);
  if (
    city === null ||
    city.coverageState !== "launched" ||
    city.airports.length === 0
  ) {
    notFound();
  }

  const idPath = citySlugPath("id", slug, { subpath: "airport-transfer" });
  const enPath = citySlugPath("en", slug, { subpath: "airport-transfer" });

  const seoTitle =
    locale === "id"
      ? `Antar Jemput Bandara ${city.displayName} | Arasya`
      : `Airport Transfer in ${city.displayName} | Arasya`;
  const seoDescription =
    locale === "id"
      ? `Layanan antar jemput bandara di ${city.displayName} dengan sopir profesional dan pelacakan penerbangan real-time.`
      : `Airport transfer service in ${city.displayName} with professional chauffeurs and real-time flight tracking.`;

  return buildMetadata({
    locale,
    pathForLocale: locale === "id" ? idPath : enPath,
    alternates: { id: idPath, en: enPath },
    seoTitle,
    seoDescription,
    og: { pageType: "airport" },
  });
}
