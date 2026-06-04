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
 * Bahasa Indonesia combined City+Vehicle route (task 7.10).
 *
 * Serves `/sewa-mobil/{city}/{vehicle}` for every combination where the
 * city is `launched`, the `city_vehicles` join lists the vehicle, and
 * the vehicle row exists and is active (R5.9). The English mirror lives
 * under `app/[locale]/car-rental/[city]/[vehicle]/page.tsx` so the
 * static URL segment matches R3.3 without branching on Locale here.
 *
 * Route conflict with task 7.9 (`/sewa-mobil/{city}/airport-transfer`):
 * Next.js's file-system router treats `airport-transfer` under this
 * dynamic segment as a valid `[vehicle]` candidate, but the static
 * sibling route under `[city]/airport-transfer/page.tsx` always wins
 * the match for that literal segment. Even so, this handler defends
 * against the case by explicitly returning 404 when `vehicleSlug ===
 * "airport-transfer"` — no vehicle row should ever use that slug, but
 * rejecting it up front makes the route's contract self-evident and
 * protects against a future vehicle seed that accidentally reuses the
 * reserved segment.
 *
 * ISR (R5.10): `revalidate = 3600` keeps the 1-hour regeneration
 * cadence; `dynamicParams = true` lets newly-joined (city, vehicle)
 * pairs ISR at request time without requiring a rebuild.
 */

/** R5.10 ISR budget (1 hour). */
export const revalidate = 3600;

/** R5.10 — allow runtime-added (city, vehicle) pairs to ISR. */
export const dynamicParams = true;

/**
 * Reserved trailing segment owned by the sibling static route
 * (`[city]/airport-transfer`). Rejected up front so the combined route
 * never accidentally matches the airport-transfer URL shape.
 */
const RESERVED_VEHICLE_SLUG = "airport-transfer";

/**
 * Pre-build every (city, vehicle) pair from the `city_vehicles` join in
 * both locales. The map de-duplicates pairs across locales since the
 * static params are locale-agnostic (the `[locale]` segment is handled
 * by its own `generateStaticParams` in the parent layout). Only
 * launched cities participate (R5.9).
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

  // Defensive guard against the sibling `[city]/airport-transfer`
  // static route leaking into this handler's matcher. Next.js's
  // router should route `airport-transfer` to the static sibling
  // before reaching this file, but we reject the slug here so the
  // combined route never masquerades as the airport-transfer page
  // even if the routing precedence changes.
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
 * Build Next.js `Metadata` for the combined City+Vehicle route (R7.1).
 *
 * Re-runs the city + vehicle lookups here so the canonical path,
 * hreflang alternates, and robots directive match whatever the page
 * body actually renders. Re-resolving is cheap because the compound
 * loader caches the underlying snapshot + MDX reads.
 *
 * SEO title / description is composed per task contract — narrative
 * frontmatter is not the canonical source for this URL shape (the
 * MDX files author per-entity copy, not per-combination copy), so we
 * always emit the composed phrase.
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
  // Gate on the `city_vehicles` join too so a direct `generateMetadata`
  // call for a non-offered pair returns 404 metadata rather than
  // synthesising a canonical URL for a page that will 404 at render.
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
