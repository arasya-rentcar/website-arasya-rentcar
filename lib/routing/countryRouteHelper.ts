/**
 * Shared data loader for the Country_Page route (task 7.11).
 *
 * Two routes render the same Country_Page content under different static
 * segments per R3.2 / R3.3:
 *
 *   - `app/[locale]/internasional/[country]/page.tsx`   (id)
 *   - `app/[locale]/international/[country]/page.tsx`   (en)
 *
 * Both route files must resolve the same `CountryWithNarrative`,
 * `VehicleSummary[]`, `CitySummary[]`, and `Dictionary` triple for a given
 * `{locale, slug}`. Duplicating the Promise.all across two files is
 * error-prone — any drift between them (different filters, different
 * ordering, different defaults) would surface as a locale-specific bug
 * that is painful to notice. Centralising the resolution in this helper
 * mirrors the pattern Phase 7 uses for the city dispatcher (task 7.6) and
 * keeps both route files thin.
 *
 * Design reference: §8 (Router Dispatcher), §9 (Country_Page).
 *
 * Pure server-side module. Safe to import from Server Components and
 * route-handler `generateMetadata` implementations. No React imports, no
 * side effects at module load time.
 */

import {
  getCities,
  getCountry,
  getVehicles,
  type CitySummary,
  type CountryWithNarrative,
  type Locale,
  type VehicleSummary,
} from "@/lib/content";
import { getDictionary, type Dictionary } from "@/lib/i18n/getDictionary";

/**
 * Resolved data required to render a Country_Page.
 *
 * Kept deliberately narrow (exactly the four shapes the template needs)
 * so the helper can be swapped for a remote-CMS loader later without
 * re-threading call sites through a new fields list.
 */
export interface CountryPageData {
  readonly country: CountryWithNarrative;
  readonly vehicles: readonly VehicleSummary[];
  readonly supportedCities: readonly CitySummary[];
  readonly dict: Dictionary;
}

/**
 * Project a `CityWithNarrative` down to the `CitySummary` the
 * CountryTemplate consumes. Mirrors the projection in
 * `lib/content/index.ts` so callers that receive a summary from elsewhere
 * (e.g. `getRelatedCities`) and here see identical shapes.
 */
function toSummary(city: Awaited<ReturnType<typeof getCities>>[number]): CitySummary {
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
 * Resolve every piece of data the CountryTemplate needs for a given
 * `{locale, slug}` request, or `null` when the country does not exist /
 * has no translation in that locale.
 *
 * The three independent fetches (`getCountry`, `getVehicles`,
 * `getDictionary`) run in parallel because they do not depend on each
 * other. `getCities` is kicked off alongside them so the supported-cities
 * derivation can start as soon as all four settle — this keeps the
 * critical path at max-of-four-fetches rather than a chain of four.
 *
 * Supported-cities rule (R9.3 + design §9):
 *   - Start from launched cities only (coverable / inactive cities never
 *     appear in the supported list — they do not render a City_Page that
 *     a country hero can link to).
 *   - Include a city when EITHER:
 *       a) its `countryCode` matches the country's `countryCode`
 *          (case-insensitive — the MVP seeds use upper-case but MDX may
 *          author either case), OR
 *       b) the country's narrative frontmatter explicitly lists the
 *          city's slug in `supportedCities`.
 *   - The MDX hint (b) lets operators bring in cross-border cities a
 *     naive country-code join would miss (for example pairing a
 *     Singapore country page with Indonesian origin cities used as
 *     cross-border departure points).
 */
export async function resolveCountryPageData(
  locale: Locale,
  slug: string,
): Promise<CountryPageData | null> {
  const [country, vehiclesFull, cities, dict] = await Promise.all([
    getCountry(slug, locale),
    getVehicles(locale),
    getCities(locale, { coverage: ["launched"] }),
    getDictionary(locale),
  ]);

  if (country === null) return null;

  // Vehicle projection: the template only needs the compact `VehicleSummary`
  // shape — active flag, seat/luggage counts, display name. Upstream
  // `getVehicles` already filters to active rows with a translation in the
  // active locale, so no additional gating is required here.
  const vehicles: VehicleSummary[] = vehiclesFull.map((v) => ({
    id: v.id,
    slug: v.slug,
    seats: v.seats,
    luggage: v.luggage,
    active: v.active,
    displayName: v.displayName,
  }));

  const countryCode = country.countryCode?.toUpperCase() ?? "";
  const explicitSlugs = new Set<string>(
    country.narrative?.frontmatter.supportedCities ?? [],
  );

  const supportedCities: CitySummary[] = cities
    .filter((city) => {
      const cityCountry = city.countryCode?.toUpperCase() ?? "";
      if (countryCode.length > 0 && cityCountry === countryCode) return true;
      return explicitSlugs.has(city.slug);
    })
    .map(toSummary);

  return { country, vehicles, supportedCities, dict };
}
