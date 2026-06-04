/**
 * Shared domain types for the Structured_Content_Store loaders.
 *
 * These interfaces are the public face of the structured half of the
 * Content_Layer (task 4.3). The per-entity loader modules (cities, countries,
 * vehicles, services, airports, aliases, relations) map snake_case snapshot
 * rows into these camelCase shapes and return them to page components and
 * the compound loader (task 4.8).
 *
 * Kept separate from the individual loader files so consumers (and the
 * compound loader) can import shapes without pulling in every loader
 * module's `getSnapshot` call chain.
 *
 * Pure types module: no runtime imports, no side effects.
 */

/** Supported locales (mirrors `lib/i18n/getDictionary.ts`). */
export type Locale = "id" | "en";

/** Publication state of a City entry. */
export type CityCoverageState = "launched" | "coverable" | "inactive";

/**
 * Structured City row, mapped from `public.cities` (task 3.3 migration
 * columns):
 *   id, slug, parent_region, country_code, latitude, longitude,
 *   coverage_state, allow_index, featured_order, launch_priority,
 *   pricing_hint_from, pricing_hint_to, chauffeur_only, created_at,
 *   updated_at.
 *
 * The `chauffeur_only` flag is enforced true at the DB level (check
 * constraint) so we do not expose it here — consumers never need to
 * branch on it.
 */
export interface City {
  id: string;
  slug: string;
  parentRegion: string | null;
  countryCode: string;
  lat: number | null;
  lng: number | null;
  coverageState: CityCoverageState;
  allowIndex: boolean;
  featuredOrder: number | null;
  launchPriority: number;
  pricingHint: { fromIdr: number; toIdr: number } | null;
}

/** Locale-scoped City translation, mapped from `public.city_translations`. */
export interface CityTranslation {
  locale: Locale;
  displayName: string;
  shortBlurb: string | null;
}

/** City + its translation `displayName`, for listings that don't need the full translation. */
export interface CitySummary extends City {
  displayName: string;
}

/** Structured Country row, mapped from `public.countries`. */
export interface Country {
  id: string;
  slug: string;
  countryCode: string;
  active: boolean;
}

/** Locale-scoped Country translation, mapped from `public.country_translations`. */
export interface CountryTranslation {
  locale: Locale;
  displayName: string;
}

/** Structured Vehicle row, mapped from `public.vehicles`. */
export interface Vehicle {
  id: string;
  slug: string;
  seats: number;
  luggage: number;
  active: boolean;
}

/** Locale-scoped Vehicle translation, mapped from `public.vehicle_translations`. */
export interface VehicleTranslation {
  locale: Locale;
  displayName: string;
}

/** Vehicle + translation `displayName`. */
export interface VehicleSummary extends Vehicle {
  displayName: string;
}

/** Structured Service row, mapped from `public.services`. */
export interface Service {
  id: string;
  slug: string;
  active: boolean;
}

/** Locale-scoped Service translation, mapped from `public.service_translations`. */
export interface ServiceTranslation {
  locale: Locale;
  displayName: string;
}

/** Airport row, mapped from `public.airports`. */
export interface Airport {
  id: string;
  code: string;
  cityId: string;
  name: string;
}

/** Airport + the slug of its parent city (null if the city row is missing). */
export interface AirportSummary extends Airport {
  citySlug: string | null;
}
