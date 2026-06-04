/**
 * Shared data-resolver for the Airport_Transfer_Page route (task 7.9).
 *
 * `app/[locale]/sewa-mobil/[city]/airport-transfer/page.tsx` and its English
 * mirror `app/[locale]/car-rental/[city]/airport-transfer/page.tsx` both
 * render the same `AirportTransferTemplate`; the twin routes keep the URL
 * shape R3.2 / R3.3 demands while sharing a single Content_Layer call chain.
 * This helper encapsulates that call chain so both route files can stay
 * thin wrappers around a single resolver.
 *
 * Requirements:
 * - R3.4 / R3.5 — the caller is responsible for slug format validation
 *   before handing the slug off to this resolver; failing slugs 404.
 * - R5.8       — Airport_Transfer_Pages are only generated for cities
 *   whose `coverage_state` is `launched` AND whose `city_airports`
 *   reference is non-empty.
 * - R9.5       — template props alignment (recommendedVehicles +
 *   serviceCities).
 * - R17.4 / R17.7 — the resolver depends only on the 17 Content_Layer
 *   exports; only the loader modules touch Supabase / MDX directly.
 *
 * Design: §9 (Airport_Transfer_Page), §18 (i18n routing).
 *
 * Pure-ish server module: it calls into the Content_Layer (which is
 * itself deterministic — backed by a pre-built JSON snapshot + MDX
 * files) but performs no network I/O or Supabase access of its own.
 */

import {
  getCities,
  getCity,
  type CitySummary,
  type CityWithNarrative,
  type Locale,
  type VehicleSummary,
} from "@/lib/content";
import {
  getDictionary,
  type Dictionary,
} from "@/lib/i18n/getDictionary";

/**
 * The resolved payload handed to {@link AirportTransferTemplate}. Matches
 * the `AirportTransferTemplateProps` surface minus `locale` — route
 * handlers add the locale at render time from `params`.
 */
export interface AirportTransferPageData {
  readonly city: CityWithNarrative;
  readonly recommendedVehicles: VehicleSummary[];
  readonly serviceCities: CitySummary[];
  readonly dict: Dictionary;
}

/**
 * R9.5 upper bounds for the page's caller-prepared feeders. Matches the
 * caps applied by `AirportTransferTemplate` — enforcing them here as well
 * means the route feeds the template pre-capped slices so the template
 * never needs to defensively truncate in development builds.
 */
const RECOMMENDED_VEHICLES_MAX = 6;
const SERVICE_CITIES_MAX = 12;

/**
 * Project a {@link CityWithNarrative} into a {@link CitySummary} for the
 * template's "service cities availability" section. We drop `narrative`,
 * `availableVehicles`, `airports`, and `relatedCities` because the
 * template only reads slug + display name + parent region on those
 * entries, and keeping the payload lean avoids transporting unused
 * joined data through the Server Component boundary.
 */
function toCitySummary(city: CityWithNarrative): CitySummary {
  return {
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
  };
}

/**
 * Resolve every feeder the Airport_Transfer_Page template needs for
 * `{citySlug}` in `{locale}`.
 *
 * Returns `null` in any of the following "do not generate" situations per
 * R5.8 — route handlers should surface a null result as a `notFound()`
 * response (R3.5):
 *
 *   1. The city slug has no matching row.
 *   2. The city's effective `coverageState` is not `"launched"`.
 *   3. The city serves zero airports (empty `city_airports`).
 *
 * Call ordering:
 *
 *   1. Resolve the canonical city. If any of the three guards above
 *      trip, short-circuit to `null` so we don't waste a second
 *      `getCities` round-trip on a 404 case.
 *   2. Fan out `getCities(coverage: ["launched"])` and `getDictionary`
 *      in parallel. Both calls are independent and the compound loader
 *      caches the underlying snapshot read.
 *   3. Filter + cap the launched cohort into the "service cities"
 *      section (excluding the current city and any cities without
 *      airports). R9.5 caps this at 12 items.
 *   4. Cap the city's own `availableVehicles` list at R9.5's 6-item
 *      bound to feed the "recommended vehicles" section.
 */
export async function resolveAirportTransferPageData(
  locale: Locale,
  citySlug: string,
): Promise<AirportTransferPageData | null> {
  const city = await getCity(citySlug, locale);
  if (city === null) {
    return null;
  }
  // R5.8: Airport_Transfer_Page generation is limited to launched cities
  // with at least one airport. The Content_Layer auto-demotes launched
  // cities with missing MDX to `coverable` (R23.7), so checking
  // `coverageState === "launched"` here correctly excludes them too.
  if (city.coverageState !== "launched") {
    return null;
  }
  if (city.airports.length === 0) {
    return null;
  }

  const [allCities, dict] = await Promise.all([
    getCities(locale, { coverage: ["launched"] }),
    getDictionary(locale),
  ]);

  // R9.5 section 6 — service cities availability. Other launched cities
  // that also serve at least one airport; capped at 12 per R9.5.
  const serviceCities: CitySummary[] = allCities
    .filter((candidate) => candidate.slug !== citySlug)
    .filter((candidate) => candidate.airports.length > 0)
    .slice(0, SERVICE_CITIES_MAX)
    .map(toCitySummary);

  // R9.5 section 5 — recommended vehicles. The current city's available
  // vehicles list is already projected to `VehicleSummary[]` by the
  // compound loader (active + translated only), so we just cap it.
  const recommendedVehicles: VehicleSummary[] = city.availableVehicles.slice(
    0,
    RECOMMENDED_VEHICLES_MAX,
  );

  return { city, recommendedVehicles, serviceCities, dict };
}
