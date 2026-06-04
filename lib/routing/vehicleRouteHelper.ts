/**
 * Shared data-resolver for the Vehicle_Page detail route (task 7.12).
 *
 * `app/[locale]/armada/[vehicle]/page.tsx` and its English mirror
 * `app/[locale]/fleet/[vehicle]/page.tsx` both render the same
 * `VehicleTemplate`; the twin routes keep the URL shape R3.2 / R3.3
 * demands while sharing a single Content_Layer call chain. This
 * helper encapsulates that call chain so both route files can stay thin.
 *
 * Requirements:
 * - R9.4   — template props alignment (serviceCities + relatedVehicles).
 * - R17.4  — pages depend only on the 17 Content_Layer exports.
 * - R17.7  — only the loader modules touch Supabase / MDX directly.
 *
 * Design: §9 (Vehicle_Page), §18 (i18n routing).
 *
 * Pure-ish module: it calls into the Content_Layer (which is itself pure
 * at runtime — backed by a pre-built JSON snapshot + MDX files) but does
 * no network I/O or Supabase access of its own.
 */

import {
  getCities,
  getVehicle,
  getVehicles,
  type CitySummary,
  type VehicleSummary,
  type VehicleWithNarrative,
} from "@/lib/content";
import {
  getDictionary,
  type Dictionary,
  type Locale,
} from "@/lib/i18n/getDictionary";

export interface VehiclePageData {
  readonly vehicle: VehicleWithNarrative;
  readonly serviceCities: CitySummary[];
  readonly relatedVehicles: VehicleSummary[];
  readonly dict: Dictionary;
}

/**
 * R9.4 upper bounds for the page's caller-prepared feeders. Matches the
 * caps applied by `VehicleTemplate` — enforcing them here as well means
 * the route can feed the template pre-capped slices without the template
 * ever seeing an oversized array in development builds.
 */
const SERVICE_CITIES_MAX = 12;
const RELATED_VEHICLES_MAX = 6;

/**
 * `getDictionary` is imported from `@/lib/i18n/getDictionary` above. The
 * compound loader (`@/lib/content`) deliberately does not re-export
 * dictionary access — keeping i18n concerns isolated from the content
 * surface matches the split established by the homepage route.
 */

/**
 * Resolve every feeder the Vehicle_Page template needs for `{slug}` in
 * `{locale}`.
 *
 * Returns `null` when the vehicle does not exist / has no translation
 * in `locale` / is inactive. Route handlers should surface that as a
 * `notFound()` response (R3.5 — 404 in the locale of the path prefix).
 *
 * Call ordering:
 *
 *   1. Resolve the canonical vehicle. If it's missing there's nothing
 *      else to fetch — short-circuit to `null` so we don't waste a
 *      `getCities` + `getVehicles` round-trip on a 404.
 *   2. Fan out `getCities(coverage: ["launched"])`, `getVehicles`, and
 *      `getDictionary` in parallel. The three calls are independent and
 *      the compound loader caches the underlying snapshot read.
 *   3. Filter the cities down to those whose `availableVehicles` list
 *      includes the current vehicle's slug (this is the `city_vehicles`
 *      join surfaced through the Content_Layer).
 *   4. Filter related vehicles to exclude the current vehicle and cap at
 *      the R9.4 upper bound.
 */
export async function resolveVehiclePageData(
  locale: Locale,
  slug: string,
): Promise<VehiclePageData | null> {
  const vehicle = await getVehicle(slug, locale);
  if (vehicle === null) {
    return null;
  }
  // R5.8: Vehicle_Page generation is limited to active vehicles. The
  // Content_Layer's `getVehicle` does not filter on `active` by itself
  // (it returns the composed object regardless), so we enforce it here
  // to keep `generateStaticParams` and this resolver consistent.
  if (!vehicle.active) {
    return null;
  }

  const [allCities, allVehicles, dict] = await Promise.all([
    getCities(locale, { coverage: ["launched"] }),
    getVehicles(locale),
    getDictionary(locale),
  ]);

  // R9.4 section 6 — service cities. The `CityWithNarrative.availableVehicles`
  // projection already filters to active + translated vehicles, so we only
  // need to probe for the current vehicle's slug.
  const serviceCities: CitySummary[] = allCities
    .filter((city) =>
      city.availableVehicles.some((v) => v.slug === vehicle.slug),
    )
    .slice(0, SERVICE_CITIES_MAX)
    .map((city) => ({
      id: city.id,
      slug: city.slug,
      parentRegion: city.parentRegion,
      countryCode: city.countryCode,
      lat: city.lat,
      lng: city.lng,
      coverageState: city.coverageState,
      allowIndex: city.allowIndex,
      featuredOrder: city.featuredOrder,
      launchPriority: city.launchPriority,
      pricingHint: city.pricingHint,
      displayName: city.displayName,
    }));

  // R9.4 section 7 — related vehicles. Exclude the current vehicle and
  // project each entry down to the `VehicleSummary` shape the template
  // consumes.
  const relatedVehicles: VehicleSummary[] = allVehicles
    .filter((v) => v.slug !== vehicle.slug)
    .slice(0, RELATED_VEHICLES_MAX)
    .map((v) => ({
      id: v.id,
      slug: v.slug,
      seats: v.seats,
      luggage: v.luggage,
      active: v.active,
      displayName: v.displayName,
    }));

  return { vehicle, serviceCities, relatedVehicles, dict };
}
