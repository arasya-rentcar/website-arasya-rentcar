/**
 * Compound Content_Layer loader contract.
 *
 * This module is the SINGLE public import path for every page component
 * and shared template under `app/` or `components/`. Page components
 * depend only on the 17 functions and the composed shapes exported from
 * here (R17.4, R17.7). They SHALL NOT reach into `lib/content/structured/*`
 * or `lib/content/narrative/*` directly — doing so would couple templates
 * to the Structured_Content_Store and MDX-file storage choices, defeating
 * the Content_Layer abstraction (R17.12).
 *
 * Requirements:
 * - R17.4  17 typed loader functions.
 * - R17.5  Content_Layer fuses Structured_Content_Store rows with MDX
 *          narrative fields into a single typed object per entity.
 * - R17.7  Pages/components depend only on loader types; only the loader
 *          modules touch Supabase clients or the MDX filesystem.
 * - R23.7  `launched` City with a missing locale MDX file is auto-demoted
 *          to `coverable` for that locale, with a build warning.
 *
 * Design reference: §5.1 (types), §5.2 (loader signatures).
 *
 * All 17 functions are `async` even when their underlying implementation
 * is synchronous (the Structured_Content_Store loaders are synchronous —
 * they read a build-time JSON snapshot). This keeps the public contract
 * uniform and leaves the door open to swapping the Narrative_Content_Store
 * for a remote CMS without rewriting call sites (R17.12).
 */

import {
  getCityBySlug,
  listCities,
  listCityVehicleSlugs,
} from "./structured/cities";
import {
  getCountryBySlug,
  listCountries,
} from "./structured/countries";
import {
  getVehicleBySlug,
  listVehicles,
} from "./structured/vehicles";
import {
  getServiceBySlug,
  listServices,
} from "./structured/services";
import { listAirports, listAirportsForCity } from "./structured/airports";
import { getCityAlias as getCityAliasImpl } from "./structured/aliases";
import { listRelatedCitySlugs } from "./structured/relations";
import type {
  Airport,
  AirportSummary,
  City,
  CityCoverageState,
  CitySummary,
  CityTranslation,
  Country,
  CountryTranslation,
  Locale,
  Service,
  ServiceTranslation,
  Vehicle,
  VehicleSummary,
  VehicleTranslation,
} from "./structured/types";

import { loadCityNarrative, type CityNarrative } from "./narrative/cities";
import {
  loadCountryNarrative,
  type CountryNarrative,
} from "./narrative/countries";
import {
  loadVehicleNarrative,
  type VehicleNarrative,
} from "./narrative/vehicles";
import {
  loadServiceNarrative,
  type ServiceNarrative,
} from "./narrative/services";
import {
  listArticleSlugs,
  loadArticleNarrative,
  type ArticleNarrative,
} from "./narrative/articles";

// ---------------------------------------------------------------------------
// Composed shapes
// ---------------------------------------------------------------------------

/**
 * Full City object delivered to the CityTemplate / CoverageTemplate.
 *
 * Structured + translation fields are flattened in from `City` and
 * `CityTranslation`. `narrative` is `null` when no MDX file exists for
 * `{slug}/{locale}` — this is the normal case for `coverable` cities and
 * for `launched` cities that have been auto-demoted per R23.7.
 *
 * `availableVehicles`, `airports`, and `relatedCities` are pre-joined
 * here so a page component can render the full City page from a single
 * `getCity()` call without chaining extra loader calls.
 */
export interface CityWithNarrative extends City, CityTranslation {
  narrative: CityNarrative | null;
  availableVehicles: VehicleSummary[];
  airports: AirportSummary[];
  relatedCities: CitySummary[];
}

/**
 * Full Country object delivered to the CountryTemplate.
 *
 * Per R23.7 a Country missing its narrative MDX file is excluded from
 * generation with a build warning rather than demoted (only Cities
 * auto-demote). The type still allows `null` so the loader can return
 * the composed object for diagnostic / coverage-analysis callers without
 * forcing them to branch on a separate "missing narrative" signal.
 */
export interface CountryWithNarrative extends Country, CountryTranslation {
  narrative: CountryNarrative | null;
}

/** Full Vehicle object delivered to the VehicleTemplate. See {@link CountryWithNarrative} for the null-narrative rationale. */
export interface VehicleWithNarrative extends Vehicle, VehicleTranslation {
  narrative: VehicleNarrative | null;
}

/** Full Service object delivered to the ServiceTemplate. See {@link CountryWithNarrative} for the null-narrative rationale. */
export interface ServiceWithNarrative extends Service, ServiceTranslation {
  narrative: ServiceNarrative | null;
}

/**
 * Lightweight shape used by the Blog_Index listing. Derived from the
 * article's frontmatter — `seoTitle` and `seoDescription` double as the
 * index-card title/description, and `publishedAt` drives the sort.
 */
export interface ArticleSummary {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
}

/** Full Article object delivered to the Blog_Article template. */
export interface ArticleWithNarrative extends ArticleSummary {
  narrative: ArticleNarrative;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Project a `Vehicle & VehicleTranslation` down to a {@link VehicleSummary}.
 *
 * The full `getVehicleBySlug` return carries the translation's `locale`
 * field; `VehicleSummary` omits it because summaries are already
 * locale-scoped by the caller.
 */
function toVehicleSummary(
  vehicle: Vehicle & VehicleTranslation,
): VehicleSummary {
  return {
    id: vehicle.id,
    slug: vehicle.slug,
    seats: vehicle.seats,
    luggage: vehicle.luggage,
    active: vehicle.active,
    displayName: vehicle.displayName,
  };
}

/**
 * Project a `City & CityTranslation` down to a {@link CitySummary}. Same
 * rationale as {@link toVehicleSummary}: drop the translation's `locale`
 * and `shortBlurb`, keep everything else.
 */
function toCitySummary(city: City & CityTranslation): CitySummary {
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
 * Project an `ArticleNarrative` down to an {@link ArticleSummary}.
 */
function toArticleSummary(
  slug: string,
  narrative: ArticleNarrative,
): ArticleSummary {
  return {
    slug,
    title: narrative.frontmatter.seoTitle,
    description: narrative.frontmatter.seoDescription,
    publishedAt: narrative.frontmatter.publishedAt,
  };
}

/**
 * Compose a full {@link CityWithNarrative} for `{slug}/{locale}`.
 *
 * Returns `null` when the city does not exist or has no translation in
 * `locale`. When the city exists but its `coverage_state` is `launched`
 * and the matching MDX file is missing, R23.7 applies: the returned
 * object's `coverageState` is set to `"coverable"` (without mutating any
 * underlying data) and `narrative` is `null`. A single `console.warn` is
 * emitted per demotion so operators can pick it up in the build log.
 */
async function buildCityWithNarrative(
  slug: string,
  locale: Locale,
): Promise<CityWithNarrative | null> {
  const base = getCityBySlug(slug, locale);
  if (base === null) return null;

  const narrative = await loadCityNarrative(locale, slug);

  let effectiveCoverage: CityCoverageState = base.coverageState;
  if (base.coverageState === "launched" && narrative === null) {
    console.warn(
      `[content] cities/${slug}/${locale} is launched but missing MDX; auto-demoting to coverable`,
    );
    effectiveCoverage = "coverable";
  }

  // Available vehicles: ordered by the `city_vehicles` join (insertion order),
  // filtered to vehicles that are active AND have a translation in `locale`.
  const vehicleSlugs = listCityVehicleSlugs(slug);
  const availableVehicles: VehicleSummary[] = [];
  for (const vehicleSlug of vehicleSlugs) {
    const vehicle = getVehicleBySlug(vehicleSlug, locale);
    if (vehicle === null) continue;
    availableVehicles.push(toVehicleSummary(vehicle));
  }

  // Airports: the structured `listAirportsForCity` gives us the direct rows;
  // we cross-reference with `listAirports()` so every element carries its
  // parent-city slug (`AirportSummary.citySlug`).
  const cityAirports = listAirportsForCity(slug);
  const cityAirportIds = new Set(cityAirports.map((a) => a.id));
  const airports: AirportSummary[] = listAirports().filter((a) =>
    cityAirportIds.has(a.id),
  );

  // Related cities: ranked list from `city_related`, each projected to a
  // `CitySummary`. Related rows whose target city is missing or lacks a
  // translation are dropped by `listRelatedCitySlugs`; `getCityBySlug` null
  // results are a belt-and-suspenders check for dangling references.
  const relatedRefs = listRelatedCitySlugs(slug, locale);
  const relatedCities: CitySummary[] = [];
  for (const ref of relatedRefs) {
    const related = getCityBySlug(ref.slug, locale);
    if (related === null) continue;
    relatedCities.push(toCitySummary(related));
  }

  return {
    id: base.id,
    slug: base.slug,
    parentRegion: base.parentRegion,
    countryCode: base.countryCode,
    lat: base.lat,
    lng: base.lng,
    coverageState: effectiveCoverage,
    allowIndex: base.allowIndex,
    featuredOrder: base.featuredOrder,
    launchPriority: base.launchPriority,
    pricingHint: base.pricingHint,
    locale: base.locale,
    displayName: base.displayName,
    shortBlurb: base.shortBlurb,
    narrative,
    availableVehicles,
    airports,
    relatedCities,
  };
}

/**
 * Compose a full {@link CountryWithNarrative}. Missing-narrative handling
 * follows R23.7: emit a warning, return the object with `narrative: null`
 * so the caller (typically the CountryTemplate) can decide whether to
 * render a reduced fallback or 404.
 */
async function buildCountryWithNarrative(
  slug: string,
  locale: Locale,
): Promise<CountryWithNarrative | null> {
  const base = getCountryBySlug(slug, locale);
  if (base === null) return null;

  const narrative = await loadCountryNarrative(locale, slug);
  if (narrative === null) {
    console.warn(
      `[content] countries/${slug}/${locale} missing narrative MDX; narrative will be null`,
    );
  }
  return { ...base, narrative };
}

/** Compose a full {@link VehicleWithNarrative}. See {@link buildCountryWithNarrative}. */
async function buildVehicleWithNarrative(
  slug: string,
  locale: Locale,
): Promise<VehicleWithNarrative | null> {
  const base = getVehicleBySlug(slug, locale);
  if (base === null) return null;

  const narrative = await loadVehicleNarrative(locale, slug);
  if (narrative === null) {
    console.warn(
      `[content] vehicles/${slug}/${locale} missing narrative MDX; narrative will be null`,
    );
  }
  return { ...base, narrative };
}

/** Compose a full {@link ServiceWithNarrative}. See {@link buildCountryWithNarrative}. */
async function buildServiceWithNarrative(
  slug: string,
  locale: Locale,
): Promise<ServiceWithNarrative | null> {
  const base = getServiceBySlug(slug, locale);
  if (base === null) return null;

  const narrative = await loadServiceNarrative(locale, slug);
  if (narrative === null) {
    console.warn(
      `[content] services/${slug}/${locale} missing narrative MDX; narrative will be null`,
    );
  }
  return { ...base, narrative };
}

// ---------------------------------------------------------------------------
// Public API — the 17 functions (R17.4)
// ---------------------------------------------------------------------------

/**
 * Return every City in `locale` matching the coverage filter, joined to
 * narrative + available vehicles + airports + related cities.
 *
 * Default filter is `["launched", "coverable"]` — the set of cities that
 * produce Visitor-facing pages. Pass `{ coverage: ["coverable"] }` to get
 * only the Coverage_Page cohort (see also {@link getCoverageCities}).
 *
 * R23.7 auto-demotion is applied per-row: a `launched` city whose MDX is
 * missing for the current locale is returned with
 * `coverageState: "coverable"`. Ordering mirrors `listCities` —
 * `launchPriority` descending, `slug` ascending — so `generateStaticParams`
 * output stays deterministic across builds.
 */
export async function getCities(
  locale: Locale,
  filter?: { coverage?: CityCoverageState[] },
): Promise<CityWithNarrative[]> {
  const requested = new Set<CityCoverageState>(
    filter?.coverage ?? ["launched", "coverable"],
  );

  // Pull launched + coverable at minimum so R23.7 demotion is correctly
  // applied; include `inactive` only when the caller asks for it so we do
  // not pay the cost of iterating inactive rows on the common path.
  const pullStates = new Set<CityCoverageState>(["launched", "coverable"]);
  if (requested.has("inactive")) pullStates.add("inactive");

  const bases = listCities(locale, { coverage: Array.from(pullStates) });
  const composed = await Promise.all(
    bases.map((city) => buildCityWithNarrative(city.slug, locale)),
  );

  return composed.filter(
    (city): city is CityWithNarrative =>
      city !== null && requested.has(city.coverageState),
  );
}

/**
 * Return one City by slug in `locale`, or `null` if the city does not
 * exist / has no translation / has been auto-demoted to `inactive` by
 * upstream ops. Applies R23.7 auto-demotion. Does NOT filter by coverage
 * state — callers that only want coverable pages should use
 * {@link getCoverageCity}.
 */
export async function getCity(
  slug: string,
  locale: Locale,
): Promise<CityWithNarrative | null> {
  return buildCityWithNarrative(slug, locale);
}

/**
 * Return one City by slug only if its effective coverage state is
 * `coverable` (either originally coverable, or auto-demoted per R23.7).
 * Used by the CoverageTemplate route handler to 404 when a visitor hits
 * a coverage URL for a launched city.
 */
export async function getCoverageCity(
  slug: string,
  locale: Locale,
): Promise<CityWithNarrative | null> {
  const city = await buildCityWithNarrative(slug, locale);
  if (city === null) return null;
  if (city.coverageState !== "coverable") return null;
  return city;
}

/**
 * Return every city whose effective coverage state is `coverable` in
 * `locale`. Preserves the `listCities` ordering
 * (`launchPriority` desc, `slug` asc). This is the feeder list for the
 * CoverageTemplate index and for sitemap generation of coverage URLs.
 */
export async function getCoverageCities(
  locale: Locale,
): Promise<CityWithNarrative[]> {
  const all = await getCities(locale, { coverage: ["launched", "coverable"] });
  return all.filter((city) => city.coverageState === "coverable");
}

/** Return every active Country in `locale`, joined to narrative. */
export async function getCountries(
  locale: Locale,
): Promise<CountryWithNarrative[]> {
  const bases = listCountries(locale);
  const composed = await Promise.all(
    bases.map((country) => buildCountryWithNarrative(country.slug, locale)),
  );
  return composed.filter(
    (country): country is CountryWithNarrative => country !== null,
  );
}

/** Return one Country by slug in `locale`, or `null` on miss. */
export async function getCountry(
  slug: string,
  locale: Locale,
): Promise<CountryWithNarrative | null> {
  return buildCountryWithNarrative(slug, locale);
}

/** Return every active Vehicle in `locale`, joined to narrative. */
export async function getVehicles(
  locale: Locale,
): Promise<VehicleWithNarrative[]> {
  const bases = listVehicles(locale);
  const composed = await Promise.all(
    bases.map((vehicle) => buildVehicleWithNarrative(vehicle.slug, locale)),
  );
  return composed.filter(
    (vehicle): vehicle is VehicleWithNarrative => vehicle !== null,
  );
}

/** Return one Vehicle by slug in `locale`, or `null` on miss. */
export async function getVehicle(
  slug: string,
  locale: Locale,
): Promise<VehicleWithNarrative | null> {
  return buildVehicleWithNarrative(slug, locale);
}

/** Return every active Service in `locale`, joined to narrative. */
export async function getServices(
  locale: Locale,
): Promise<ServiceWithNarrative[]> {
  const bases = listServices(locale);
  const composed = await Promise.all(
    bases.map((service) => buildServiceWithNarrative(service.slug, locale)),
  );
  return composed.filter(
    (service): service is ServiceWithNarrative => service !== null,
  );
}

/** Return one Service by slug in `locale`, or `null` on miss. */
export async function getService(
  slug: string,
  locale: Locale,
): Promise<ServiceWithNarrative | null> {
  return buildServiceWithNarrative(slug, locale);
}

/**
 * Return every airport with its parent city slug. Airports are
 * locale-agnostic — the `name` column on `airports` is the official
 * ICAO/IATA name, rendered the same in every locale.
 */
export async function getAirports(): Promise<Airport[]> {
  return listAirports();
}

/** Return the airports served from `citySlug`, ordered by IATA code. */
export async function getCityAirports(citySlug: string): Promise<Airport[]> {
  return listAirportsForCity(citySlug);
}

/**
 * Return the vehicles available for chauffeur service from `citySlug` in
 * `locale`. Only active vehicles with a translation in `locale` are
 * included; inactive vehicles and untranslated rows are skipped silently.
 */
export async function getCityVehicles(
  citySlug: string,
  locale: Locale,
): Promise<VehicleSummary[]> {
  const vehicleSlugs = listCityVehicleSlugs(citySlug);
  const out: VehicleSummary[] = [];
  for (const slug of vehicleSlugs) {
    const vehicle = getVehicleBySlug(slug, locale);
    if (vehicle === null) continue;
    out.push(toVehicleSummary(vehicle));
  }
  return out;
}

/**
 * Return the ranked related cities for `citySlug` in `locale`. Rows whose
 * target city is inactive / missing / untranslated are dropped.
 */
export async function getRelatedCities(
  citySlug: string,
  locale: Locale,
): Promise<CitySummary[]> {
  const refs = listRelatedCitySlugs(citySlug, locale);
  const out: CitySummary[] = [];
  for (const ref of refs) {
    const city = getCityBySlug(ref.slug, locale);
    if (city === null) continue;
    out.push(toCitySummary(city));
  }
  return out;
}

/**
 * Resolve an alias slug to its canonical city slug. Returns `null` when
 * the alias is unknown or the canonical city is `inactive` — a null
 * result should be treated as "404, do not redirect".
 */
export async function getCityAlias(
  slug: string,
): Promise<{ canonicalSlug: string } | null> {
  return getCityAliasImpl(slug);
}

/**
 * Return every published Article in `locale` as an index-card summary,
 * sorted by `publishedAt` descending (newest first). Articles whose MDX
 * fails to load or fails frontmatter validation are skipped with a
 * warning — the blog index simply drops them rather than failing the
 * build, so one malformed draft does not take down the whole listing.
 */
export async function getArticles(locale: Locale): Promise<ArticleSummary[]> {
  const slugs = await listArticleSlugs(locale);
  const results = await Promise.all(
    slugs.map(async (slug) => {
      try {
        const narrative = await loadArticleNarrative(locale, slug);
        if (narrative === null) return null;
        return toArticleSummary(slug, narrative);
      } catch (err) {
        console.warn(
          `[content] articles/${slug}/${locale} failed to load; skipped: ${String(err)}`,
        );
        return null;
      }
    }),
  );
  const summaries = results.filter(
    (summary): summary is ArticleSummary => summary !== null,
  );
  summaries.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  return summaries;
}

/**
 * Return one published Article in `locale`, or `null` when the MDX file
 * is missing.
 */
export async function getArticle(
  slug: string,
  locale: Locale,
): Promise<ArticleWithNarrative | null> {
  const narrative = await loadArticleNarrative(locale, slug);
  if (narrative === null) return null;
  return { ...toArticleSummary(slug, narrative), narrative };
}

// ---------------------------------------------------------------------------
// Re-exported domain types (the minimum surface callers need)
// ---------------------------------------------------------------------------

export type {
  Airport,
  AirportSummary,
  CityCoverageState,
  CitySummary,
  Locale,
  VehicleSummary,
} from "./structured/types";
export type { CityNarrative } from "./narrative/cities";
export type { CountryNarrative } from "./narrative/countries";
export type { VehicleNarrative } from "./narrative/vehicles";
export type { ServiceNarrative } from "./narrative/services";
export type { ArticleNarrative } from "./narrative/articles";
