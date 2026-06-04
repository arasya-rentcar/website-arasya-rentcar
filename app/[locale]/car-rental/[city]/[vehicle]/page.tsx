import type { Metadata } from "next";
import { notFound } from "next/navigation";

import CityVehicleTemplate from "@/components/templates/CityVehicleTemplate";
import { getCities, getCity, getVehicle } from "@/lib/content";
import {
  SUPPORTED_LOCALES,
  isLocale,
  type Locale,
} from "@/lib/i18n/getDictionary";
import { citySlugPath } from "@/lib/i18n/slugMap";
import { resolveCityVehiclePageData } from "@/lib/routing/cityVehicleRouteHelper";
import { buildMetadata } from "@/lib/seo/metadata";
import { isValidSlug, normalizeSlug } from "@/lib/validation/slug";

/**
 * English combined City+Vehicle route (task 7.10).
 *
 * Serves `/en/car-rental/{city}/{vehicle}` — the English mirror of the
 * Bahasa Indonesia `/sewa-mobil/{city}/{vehicle}` route. Both routes
 * share identical data resolution through
 * `lib/routing/cityVehicleRouteHelper.ts`, so the only meaningful
 * difference between the two page files is the static URL segment
 * (`sewa-mobil/` vs `car-rental/`), which is implied by the filesystem
 * path.
 *
 * Next.js App Router does not provide a way for two routes under
 * different static segments to share a single module, so this file is
 * a deliberate duplicate of the Bahasa Indonesia mirror. Both versions
 * are thin wrappers over the shared helper, and the critical R5.9 gate
 * lives in exactly one place.
 *
 * ISR (R5.10): `revalidate = 3600`, `dynamicParams = true` — identical
 * cadence to the Bahasa Indonesia mirror so the two locales revalidate
 * in lockstep.
 */

/** R5.10 ISR budget (1 hour). */
export const revalidate = 3600;

/** R5.10 — allow runtime-added (city, vehicle) pairs to ISR. */
export const dynamicParams = true;

/**
 * Reserved trailing segment owned by the sibling static route
 * (`[city]/airport-transfer`). See the Bahasa Indonesia mirror for the
 * full rationale.
 */
const RESERVED_VEHICLE_SLUG = "airport-transfer";

/**
 * Pre-build every (city, vehicle) pair from the `city_vehicles` join
 * across both locales. Identical to the Bahasa Indonesia mirror so the
 * two routes pre-render the same matrix of pairs.
 */
export async function generateStaticParams(): Promise<
  { city: string; vehicle: string }[]
> {
  const locales: readonly Locale[] = SUPPORTED_LOCALES;
  const sets = await Promise.all(
    locales.map((loc) => getCities(loc, { coverage: ["launched"] })),
  );
  const pairs = new Map<string, { city: string; vehicle: string }>();
  for (const cities of sets) {
    for (const city of cities) {
      for (const vehicle of city.availableVehicles) {
        const key = `${city.slug}|${vehicle.slug}`;
        if (!pairs.has(key)) {
          pairs.set(key, { city: city.slug, vehicle: vehicle.slug });
        }
      }
    }
  }
  return Array.from(pairs.values());
}

export default async function CityVehiclePage({
  params,
}: {
  params: Promise<{ locale: string; city: string; vehicle: string }>;
}) {
  const { locale, city: rawCity, vehicle: rawVehicle } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const citySlug = normalizeSlug(rawCity);
  const vehicleSlug = normalizeSlug(rawVehicle);
  if (!isValidSlug(citySlug) || !isValidSlug(vehicleSlug)) {
    notFound();
  }
  if (vehicleSlug === RESERVED_VEHICLE_SLUG) {
    notFound();
  }

  const data = await resolveCityVehiclePageData(locale, citySlug, vehicleSlug);
  if (data === null) {
    notFound();
  }

  return (
    <CityVehicleTemplate
      locale={locale}
      city={data.city}
      vehicle={data.vehicle}
      dict={data.dict}
    />
  );
}

/**
 * Build Next.js `Metadata` for the English combined City+Vehicle route
 * (R7.1). Duplicate of the Bahasa Indonesia mirror's `generateMetadata`
 * so the two routes emit matching canonical / hreflang / robots
 * directives for the same (city, vehicle) pair.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; city: string; vehicle: string }>;
}): Promise<Metadata> {
  const { locale, city: rawCity, vehicle: rawVehicle } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const citySlug = normalizeSlug(rawCity);
  const vehicleSlug = normalizeSlug(rawVehicle);
  if (!isValidSlug(citySlug) || !isValidSlug(vehicleSlug)) {
    notFound();
  }
  if (vehicleSlug === RESERVED_VEHICLE_SLUG) {
    notFound();
  }

  const [city, vehicle] = await Promise.all([
    getCity(citySlug, locale),
    getVehicle(vehicleSlug, locale),
  ]);
  if (city === null || city.coverageState !== "launched") {
    notFound();
  }
  if (vehicle === null || !vehicle.active) {
    notFound();
  }
  const cityOffersVehicle = city.availableVehicles.some(
    (v) => v.slug === vehicle.slug,
  );
  if (!cityOffersVehicle) {
    notFound();
  }

  const idPath = citySlugPath("id", citySlug, { subpath: vehicleSlug });
  const enPath = citySlugPath("en", citySlug, { subpath: vehicleSlug });
  const seoTitle =
    locale === "id"
      ? `Sewa ${vehicle.displayName} di ${city.displayName} dengan Supir | Arasya`
      : `${vehicle.displayName} Chauffeur Rental in ${city.displayName} | Arasya`;
  const seoDescription =
    locale === "id"
      ? `Sewa ${vehicle.displayName} (${vehicle.seats} kursi) dengan sopir profesional di ${city.displayName}.`
      : `Rent a ${vehicle.displayName} (${vehicle.seats} seats) with a professional chauffeur in ${city.displayName}.`;

  return buildMetadata({
    locale,
    pathForLocale: locale === "id" ? idPath : enPath,
    alternates: { id: idPath, en: enPath },
    seoTitle,
    seoDescription,
    og: { pageType: "city" },
  });
}
