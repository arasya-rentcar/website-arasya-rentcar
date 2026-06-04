/**
 * Structured City loader.
 *
 * Reads `cities`, `city_translations`, and `city_vehicles` out of the
 * build-time content snapshot (`./snapshot`) and maps them into the
 * camelCase domain shapes declared in `./types`. Page components import
 * these functions through `lib/content/index.ts` (task 4.8, not yet
 * written) to render listings and individual City pages.
 *
 * Requirements:
 * - R17.4 public loader surface
 * - R17.5 pure, Server-Component-safe, typed return shapes
 *
 * Design: §5.1, §5.2.
 *
 * Error-handling contract: malformed snapshot rows are skipped with a single
 * `console.warn("[content] malformed {table} row: <reason>")`. Missing
 * translations are logged once per row and filtered out of the returned
 * listing. Loaders never throw — page components decide what null means.
 */

import { getSnapshot } from "./snapshot";
import {
  isRecord,
  readBool,
  readEnum,
  readFloatOrNull,
  readInt,
  readIntOr,
  readStr,
} from "./row-readers";
import type {
  City,
  CityCoverageState,
  CitySummary,
  CityTranslation,
  Locale,
} from "./types";

const COVERAGE_STATES: readonly CityCoverageState[] = [
  "launched",
  "coverable",
  "inactive",
];

const LOCALES: readonly Locale[] = ["id", "en"];

const DEFAULT_LIST_COVERAGE: readonly CityCoverageState[] = ["launched", "coverable"];

/**
 * Map one snapshot row into a {@link City}, or return `null` when required
 * columns are missing. Emits a single `console.warn` describing the first
 * missing field so operators can spot schema drift without noise.
 */
function mapCityRow(row: unknown): City | null {
  const id = readStr(row, "id");
  const slug = readStr(row, "slug");
  const coverageState = readEnum<CityCoverageState>(row, "coverage_state", COVERAGE_STATES);
  if (id === null) {
    console.warn("[content] malformed cities row: missing id");
    return null;
  }
  if (slug === null) {
    console.warn(`[content] malformed cities row ${id}: missing slug`);
    return null;
  }
  if (coverageState === null) {
    console.warn(`[content] malformed cities row ${slug}: invalid coverage_state`);
    return null;
  }

  const pricingFrom = readInt(row, "pricing_hint_from");
  const pricingTo = readInt(row, "pricing_hint_to");
  const pricingHint =
    pricingFrom !== null && pricingTo !== null
      ? { fromIdr: pricingFrom, toIdr: pricingTo }
      : null;

  return {
    id,
    slug,
    parentRegion: readStr(row, "parent_region"),
    countryCode: readStr(row, "country_code") ?? "ID",
    lat: readFloatOrNull(row, "latitude"),
    lng: readFloatOrNull(row, "longitude"),
    coverageState,
    allowIndex: readBool(row, "allow_index", false),
    featuredOrder: readInt(row, "featured_order"),
    launchPriority: readIntOr(row, "launch_priority", 0),
    pricingHint,
  };
}

/** Map one `city_translations` row into a {@link CityTranslation}. */
function mapCityTranslationRow(row: unknown): (CityTranslation & { cityId: string }) | null {
  const cityId = readStr(row, "city_id");
  const locale = readEnum<Locale>(row, "locale", LOCALES);
  const displayName = readStr(row, "display_name");
  if (cityId === null) {
    console.warn("[content] malformed city_translations row: missing city_id");
    return null;
  }
  if (locale === null) {
    console.warn(`[content] malformed city_translations row ${cityId}: invalid locale`);
    return null;
  }
  if (displayName === null) {
    console.warn(
      `[content] malformed city_translations row ${cityId}/${locale}: missing display_name`,
    );
    return null;
  }
  return {
    cityId,
    locale,
    displayName,
    shortBlurb: readStr(row, "short_blurb"),
  };
}

/**
 * Build a `(cityId + locale) → CityTranslation` lookup from the snapshot so
 * listing + detail queries run in O(n) rather than re-scanning the full
 * translations array per city.
 */
function buildTranslationIndex(): Map<string, CityTranslation> {
  const snapshot = getSnapshot();
  const index = new Map<string, CityTranslation>();
  for (const row of snapshot.cityTranslations) {
    const mapped = mapCityTranslationRow(row);
    if (mapped === null) continue;
    index.set(`${mapped.cityId}\u0000${mapped.locale}`, {
      locale: mapped.locale,
      displayName: mapped.displayName,
      shortBlurb: mapped.shortBlurb,
    });
  }
  return index;
}

/** Options accepted by {@link listCities}. */
export interface ListCitiesOptions {
  /** Coverage states to include. Defaults to `["launched","coverable"]`. */
  readonly coverage?: readonly CityCoverageState[];
}

/**
 * Return every City that passes the coverage filter, joined to its
 * translation for `locale`. Cities without a matching translation are
 * skipped (a single `console.warn` is emitted per miss).
 *
 * Sort order: `launchPriority` descending, then `slug` ascending — stable
 * across builds so `generateStaticParams` output stays deterministic.
 */
export function listCities(
  locale: Locale,
  opts?: ListCitiesOptions,
): CitySummary[] {
  const coverage = opts?.coverage ?? DEFAULT_LIST_COVERAGE;
  const coverageSet = new Set<CityCoverageState>(coverage);
  const snapshot = getSnapshot();
  const translations = buildTranslationIndex();

  const out: CitySummary[] = [];
  for (const row of snapshot.cities) {
    const city = mapCityRow(row);
    if (city === null) continue;
    if (!coverageSet.has(city.coverageState)) continue;

    const translation = translations.get(`${city.id}\u0000${locale}`);
    if (translation === undefined) {
      console.warn(
        `[content] cities/${city.slug} missing ${locale} translation; skipped in listCities`,
      );
      continue;
    }
    out.push({ ...city, displayName: translation.displayName });
  }

  out.sort((a, b) => {
    if (a.launchPriority !== b.launchPriority) {
      return b.launchPriority - a.launchPriority;
    }
    return a.slug.localeCompare(b.slug);
  });
  return out;
}

/**
 * Return the City + translation for `slug` in `locale`, or `null` when the
 * city is missing / inactive / has no translation in the requested locale.
 * Pages call this to decide whether to render the full CityTemplate, the
 * Coverage fallback template, or a 404.
 */
export function getCityBySlug(
  slug: string,
  locale: Locale,
): (City & CityTranslation) | null {
  const snapshot = getSnapshot();
  for (const row of snapshot.cities) {
    if (!isRecord(row)) continue;
    if (row["slug"] !== slug) continue;
    const city = mapCityRow(row);
    if (city === null) return null;

    const translations = buildTranslationIndex();
    const translation = translations.get(`${city.id}\u0000${locale}`);
    if (translation === undefined) return null;
    return { ...city, ...translation };
  }
  return null;
}

/**
 * Return the vehicle slugs linked to `citySlug` via the `city_vehicles`
 * join table. Empty array when the city is unknown or the join table has
 * no rows for it. Vehicle slugs are resolved against the `vehicles`
 * snapshot so an orphaned join row (dangling vehicle_id) is filtered out
 * silently.
 *
 * Order: preserves the snapshot order of `city_vehicles`, which Supabase
 * emits in insertion order.
 */
export function listCityVehicleSlugs(citySlug: string): string[] {
  const snapshot = getSnapshot();

  // Resolve the city id.
  let cityId: string | null = null;
  for (const row of snapshot.cities) {
    if (readStr(row, "slug") === citySlug) {
      cityId = readStr(row, "id");
      break;
    }
  }
  if (cityId === null) return [];

  // Build vehicleId → slug once.
  const vehicleSlugById = new Map<string, string>();
  for (const row of snapshot.vehicles) {
    const id = readStr(row, "id");
    const slug = readStr(row, "slug");
    if (id === null || slug === null) continue;
    vehicleSlugById.set(id, slug);
  }

  const slugs: string[] = [];
  const seen = new Set<string>();
  for (const row of snapshot.cityVehicles) {
    if (readStr(row, "city_id") !== cityId) continue;
    const vehicleId = readStr(row, "vehicle_id");
    if (vehicleId === null) continue;
    const slug = vehicleSlugById.get(vehicleId);
    if (slug === undefined) continue;
    if (seen.has(slug)) continue;
    seen.add(slug);
    slugs.push(slug);
  }
  return slugs;
}
