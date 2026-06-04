/**
 * Shared data-resolver for the combined City+Vehicle page route (task 7.10).
 *
 * Both locale entries — `app/[locale]/sewa-mobil/[city]/[vehicle]/page.tsx`
 * (Bahasa Indonesia) and `app/[locale]/car-rental/[city]/[vehicle]/page.tsx`
 * (English) — share identical data resolution logic. This helper
 * centralizes that logic so the two page files stay thin and can never
 * drift in their launched-city + active-vehicle + `city_vehicles`-join
 * gating.
 *
 * Requirements:
 * - R5.9   Combined City+Vehicle page generated when the city is
 *          `launched`, the `city_vehicles` join lists the vehicle, and
 *          the vehicle row exists and is active.
 * - R17.4  Routes depend only on the compound Content_Layer exports.
 * - R17.7  Only loader modules touch Supabase / MDX directly.
 *
 * Design: §8 (Routing Rules), §9 (Template Catalogue).
 *
 * Pure-ish module: calls into the Content_Layer (itself backed by a
 * pre-built JSON snapshot + MDX files) but does no network I/O or
 * Supabase access of its own.
 */

import {
  getCity,
  getVehicle,
  type CityWithNarrative,
  type VehicleWithNarrative,
} from "@/lib/content";
import {
  getDictionary,
  type Dictionary,
  type Locale,
} from "@/lib/i18n/getDictionary";

/**
 * The feeder bundle the combined City+Vehicle page template consumes.
 *
 * `city` is always in `coverageState === "launched"` — the resolver
 * returns `null` for any other state so the route can surface a 404.
 * `vehicle` is always `active`. The `city_vehicles` join is verified
 * before the bundle is returned, so the caller never has to branch on
 * availability inside the template.
 */
export interface CityVehiclePageData {
  readonly city: CityWithNarrative;
  readonly vehicle: VehicleWithNarrative;
  readonly dict: Dictionary;
}

/**
 * Resolve every feeder the combined City+Vehicle page needs for
 * `{citySlug}` / `{vehicleSlug}` in `{locale}`.
 *
 * Returns `null` for any of the following conditions (route handlers
 * surface these as `notFound()` per R3.5):
 *
 *   1. City row missing, untranslated, or with `coverageState !== "launched"`.
 *   2. Vehicle row missing, untranslated, or with `active === false`.
 *   3. `city_vehicles` join does NOT list this vehicle under this city —
 *      the R5.9 gate that prevents fan-out pages for combinations the
 *      ops team hasn't explicitly opted into.
 *
 * Fan-out is intentional: the three reads (`getCity`, `getVehicle`,
 * `getDictionary`) are issued in parallel via `Promise.all` because
 * none of them depend on each other. The compound loader caches the
 * underlying snapshot and MDX reads, so re-resolving the same slug in
 * `generateMetadata` and the page handler is cheap.
 */
export async function resolveCityVehiclePageData(
  locale: Locale,
  citySlug: string,
  vehicleSlug: string,
): Promise<CityVehiclePageData | null> {
  const [city, vehicle, dict] = await Promise.all([
    getCity(citySlug, locale),
    getVehicle(vehicleSlug, locale),
    getDictionary(locale),
  ]);

  // R5.9: launched cities only. Coverable + inactive + missing → 404.
  if (city === null || city.coverageState !== "launched") {
    return null;
  }

  // R5.8 / R5.9: active vehicle rows only. Missing + inactive → 404.
  if (vehicle === null || !vehicle.active) {
    return null;
  }

  // R5.9: the `city_vehicles` join must list this vehicle under this
  // city for the combined page to render. `city.availableVehicles` is
  // the Content_Layer projection of that join, already filtered to
  // active + translated vehicles, so a slug match is an exact proxy.
  const cityOffersVehicle = city.availableVehicles.some(
    (v) => v.slug === vehicle.slug,
  );
  if (!cityOffersVehicle) {
    return null;
  }

  return { city, vehicle, dict };
}
