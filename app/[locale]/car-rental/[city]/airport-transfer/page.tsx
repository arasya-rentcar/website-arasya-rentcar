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
 * English Airport_Transfer_Page route (task 7.9).
 *
 * Serves `/en/car-rental/{city}/airport-transfer` — the English mirror
 * of the Bahasa Indonesia `/sewa-mobil/{city}/airport-transfer` route.
 * Both routes share identical dispatch logic via
 * `lib/routing/airportTransferRouteHelper.ts`, so the only meaningful
 * difference between the two page files is the static URL segment,
 * which is implied by the filesystem path.
 *
 * Next.js App Router does not provide a way for two routes under
 * different static segments to share a single module, so the page file
 * is duplicated here — both versions are thin wrappers over the shared
 * resolver, and the critical R5.8 launched-and-has-airports check lives
 * in one place.
 *
 * Dispatch logic, ISR cadence, and metadata construction match the
 * Bahasa Indonesia mirror exactly; see that file for rationale.
 */

/** R5.10 ISR budget (1 hour). */
export const revalidate = 3600;

/** R5.10 allows unknown dynamic params to ISR at request time. */
export const dynamicParams = true;

/**
 * Pre-build static params for every launched city that serves at least
 * one airport, across both locales (R5.8). Intentionally identical to
 * the Bahasa Indonesia mirror so the two routes pre-render the same
 * matrix of city slugs and stay in lockstep.
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
 * Build Next.js `Metadata` for the English Airport_Transfer_Page route
 * (R7.1, R4.3, R4.4). See the Bahasa Indonesia mirror's
 * `generateMetadata` for the full rationale — this function is the exact
 * duplicate so the two routes emit matching canonical / hreflang / title
 * / description directives for the same canonical city.
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
