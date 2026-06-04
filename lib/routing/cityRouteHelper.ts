/**
 * Shared dispatch + "nearest launched city" helpers for the City route.
 *
 * Both locale entries into the City route — `app/[locale]/sewa-mobil/[city]/page.tsx`
 * (Bahasa Indonesia) and `app/[locale]/car-rental/[city]/page.tsx` (English) —
 * execute identical routing logic, differing only in the static URL segment
 * (which is owned by the filesystem, not by code). This module centralizes
 * that logic so the two page files stay thin and can never drift in their
 * alias → coverable → inactive dispatch.
 *
 * Requirements:
 * - R3.4 / R3.5 — dynamic-segment slug format validation; non-conforming
 *   slugs produce an HTTP 404 in the current Locale's not-found page.
 * - R3.6 / R22.3 — launched City entries render the full `CityTemplate`;
 *   coverable City entries render the `CoverageTemplate`; inactive and
 *   missing City entries produce an HTTP 404.
 * - R22.4 — the Coverage_Page's "nearest launched cities" section lists 3
 *   to 6 launched cities nearest to the coverable city, ordered by
 *   latitude/longitude proximity with `parent_region` as a fallback when
 *   coordinates are missing.
 * - R22.7 — HTTP 404 for inactive City entries and for slugs with no
 *   corresponding `cities` row.
 * - R22.8 — HTTP 301 permanent redirect to the canonical city URL in the
 *   active Locale whenever the requested slug matches an entry in the
 *   `city_aliases` table whose target is not inactive.
 *
 * Design reference: §8 (Routing Rules).
 *
 * Pure server module: no React, no client-side navigation, no environment
 * reads. The only side effect is a call to `notFound()` or
 * `permanentRedirect()` from `next/navigation`, both of which short-circuit
 * the React render by throwing a framework-recognized sentinel.
 */

import { notFound, permanentRedirect } from "next/navigation";

import type {
  CitySummary,
  CityWithNarrative,
  Locale,
} from "@/lib/content";
import { getCity, getCityAlias } from "@/lib/content";
import { citySlugPath } from "@/lib/i18n/slugMap";
import { isValidSlug } from "@/lib/validation/slug";

/**
 * Resolve the raw `[city]` URL segment into a concrete {@link CityWithNarrative}
 * record for rendering, or short-circuit the response via `notFound()` /
 * `permanentRedirect()` per the routing rules in §8.
 *
 * The three terminal behaviors are:
 *   - 404 (via `notFound()`) when the slug fails format validation (R3.4 /
 *     R3.5), when no City row exists for the slug, or when the City row's
 *     `coverageState` is `"inactive"` (R22.7).
 *   - 301 (via `permanentRedirect()`) when the slug matches a row in
 *     `city_aliases` whose canonical slug differs from the requested slug
 *     (R22.8). Aliases targeting an inactive City are pre-filtered by the
 *     Content_Layer (`getCityAlias` returns `null` in that case), so a
 *     non-null alias result is always safe to redirect.
 *   - Return a {@link CityWithNarrative} when the City is `"launched"` or
 *     `"coverable"` and the caller can continue rendering.
 *
 * The raw slug is lower-cased before validation to align with the canonical
 * form enforced by R3.7 (the 301-to-lowercase redirect performed in middleware
 * — task 15.2); this helper is idempotent for already-canonical slugs and
 * resilient to uppercase leaks that might slip past the middleware during
 * local development.
 *
 * @param locale  Active Locale, already validated by the caller.
 * @param rawSlug Raw `[city]` URL segment as received from Next.js.
 * @returns A non-null {@link CityWithNarrative} for `"launched"` or
 *          `"coverable"` cities. Never returns for the 404 / 301 cases
 *          (those throw framework sentinels).
 */
export async function resolveCityRoute(
  locale: Locale,
  rawSlug: string,
): Promise<CityWithNarrative> {
  const slug = rawSlug.toLowerCase();
  if (!isValidSlug(slug)) {
    notFound();
  }

  // R22.8: when the requested slug is an alias whose canonical target is
  // active, emit a 301 permanent redirect to the canonical city URL in the
  // active Locale. The `canonicalSlug !== slug` guard prevents an infinite
  // redirect loop in the edge case where an alias row shares its own
  // canonical slug (defensive — the DB constraint forbids this, but a
  // redirect to self is a disaster worth hardening against cheaply).
  const alias = await getCityAlias(slug);
  if (alias !== null && alias.canonicalSlug !== slug) {
    permanentRedirect(citySlugPath(locale, alias.canonicalSlug));
  }

  // R3.6 / R22.7: missing City entry or `inactive` coverage state → 404.
  const city = await getCity(slug, locale);
  if (city === null || city.coverageState === "inactive") {
    notFound();
  }
  return city;
}

/**
 * Haversine-style 2D squared distance between two points, gated on both
 * points having non-null coordinates.
 *
 * Uses plain Euclidean distance on (lat, lng) rather than the full
 * Haversine formula because every City in scope for the launch is within
 * Java (≈1,000 km span), where the small-angle approximation error is
 * well under the grid spacing of adjacent launched cities and has no
 * practical effect on the top-6 ordering.
 *
 * Returns `Number.POSITIVE_INFINITY` when either point is missing a
 * coordinate — callers use that sentinel to fall through to the
 * `parent_region` fallback path (R22.4).
 */
function coordinateDistance(
  current: { lat: number | null; lng: number | null },
  candidate: { lat: number | null; lng: number | null },
): number {
  if (
    current.lat === null ||
    current.lng === null ||
    candidate.lat === null ||
    candidate.lng === null
  ) {
    return Number.POSITIVE_INFINITY;
  }
  const dLat = current.lat - candidate.lat;
  const dLng = current.lng - candidate.lng;
  // The square-root is order-preserving over non-negative inputs, but we
  // keep it here anyway so callers reading logs see a familiar "distance"
  // scale rather than a squared-distance value.
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

/**
 * Project a {@link CityWithNarrative} into a {@link CitySummary} for use
 * in the CoverageTemplate's "nearest launched cities" section.
 *
 * Drops `narrative`, `availableVehicles`, `airports`, `relatedCities`,
 * `locale`, and `shortBlurb` — the CoverageTemplate does not read those
 * fields on nearest-city entries, and keeping the payload lean avoids
 * transporting unused joined data through the Server Component boundary.
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
 * Top-6 launched cities nearest to `current`, ordered ascending by
 * proximity, projected to {@link CitySummary}. Used by the route handlers
 * to feed `CoverageTemplate.nearestLaunchedCities` per R22.4.
 *
 * Ordering rules:
 *   1. When both `current` and the candidate have `(lat, lng)`, order by
 *      2D Euclidean distance (see {@link coordinateDistance}).
 *   2. When either side is missing coordinates, fall back to a boolean
 *      "same `parent_region`" check: candidates whose `parent_region`
 *      matches `current.parent_region` (and both are non-null) rank after
 *      all coordinate-based candidates but ahead of the "no relation"
 *      tail.
 *   3. Candidates with neither coordinates nor a matching
 *      `parent_region` rank last (distance = `Number.POSITIVE_INFINITY`).
 *
 * The returned array is capped at the R22.4 upper bound of 6 entries. When
 * fewer than 3 candidates exist the caller (CoverageTemplate) handles the
 * degraded state with a `TODO` marker; this helper does not pad or throw.
 *
 * Stable sorting: `Array.prototype.sort` on V8 / JavaScriptCore is
 * guaranteed stable, so candidates tied on distance retain their input
 * order — which for the typical caller is `launchPriority` desc, `slug`
 * asc as produced by `getCities(...)`.
 *
 * @param current  The coverable City currently being rendered.
 * @param launched Full set of launched-state cities in the same Locale.
 * @returns Up to 6 {@link CitySummary} entries, excluding `current` itself.
 */
export function nearestLaunched(
  current: CityWithNarrative,
  launched: readonly CityWithNarrative[],
): CitySummary[] {
  // Exclude `current` in case the caller includes self in the candidate
  // set; the Content_Layer's `getCities` does not filter by slug.
  const candidates = launched.filter((c) => c.slug !== current.slug);

  const scored = candidates.map((candidate) => {
    const coordinateDist = coordinateDistance(current, candidate);
    if (coordinateDist !== Number.POSITIVE_INFINITY) {
      return { city: candidate, dist: coordinateDist };
    }
    // Fallback: same `parent_region` ranks ahead of totally unrelated
    // candidates. Use a large sentinel so any coordinate-based candidate
    // (even a pathologically distant one) still comes first.
    if (
      current.parentRegion !== null &&
      candidate.parentRegion === current.parentRegion
    ) {
      return { city: candidate, dist: Number.MAX_SAFE_INTEGER };
    }
    return { city: candidate, dist: Number.POSITIVE_INFINITY };
  });

  scored.sort((a, b) => a.dist - b.dist);
  return scored.slice(0, 6).map(({ city }) => toCitySummary(city));
}
