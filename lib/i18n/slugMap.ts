/**
 * Centralized ID↔EN static-segment mapping for URL construction.
 *
 * This module is the single source of truth for the static URL segments that
 * differ between the Bahasa Indonesia (`id`) locale served under `/` and the
 * English (`en`) locale served under `/en`. Page components MUST compose URLs
 * through the builders exported here instead of hardcoding literal paths so
 * that adding or renaming a locale segment is a one-file change (design §18,
 * R17.3).
 *
 * Requirements satisfied by this module:
 *   - R3.2 — Bahasa Indonesia URL patterns (`/sewa-mobil/{city}`,
 *     `/internasional/{country}`, `/armada`, `/layanan/{service}`, `/blog`,
 *     `/booking`, `/kontak`, `/faq`, `/syarat-ketentuan`,
 *     `/kebijakan-privasi`).
 *   - R3.3 — English mirror under `/en/` with `car-rental`, `international`,
 *     `fleet`, `services`, `contact`, `terms`, `privacy` (`blog`, `booking`,
 *     `faq` are identical to the Bahasa Indonesia segments).
 *   - R17.3 — slug translation between locales is centralized in a single
 *     mapping module so page components resolve routes via this mapping
 *     rather than via hardcoded paths.
 *
 * Dynamic-segment conventions (R3.2 / R3.3):
 *
 *   | Page type                | Bahasa Indonesia                          | English                                      |
 *   | ------------------------ | ----------------------------------------- | -------------------------------------------- |
 *   | City landing             | `/sewa-mobil/{city-slug}`                 | `/en/car-rental/{city-slug}`                 |
 *   | City airport transfer    | `/sewa-mobil/{city-slug}/airport-transfer`| `/en/car-rental/{city-slug}/airport-transfer`|
 *   | City + vehicle           | `/sewa-mobil/{city-slug}/{vehicle-slug}`  | `/en/car-rental/{city-slug}/{vehicle-slug}`  |
 *   | Country landing          | `/internasional/{country-slug}`           | `/en/international/{country-slug}`           |
 *   | Vehicle listing          | `/armada`                                 | `/en/fleet`                                  |
 *   | Vehicle detail           | `/armada/{vehicle-slug}`                  | `/en/fleet/{vehicle-slug}`                   |
 *   | Service page             | `/layanan/{service-slug}`                 | `/en/services/{service-slug}`                |
 *   | Blog index               | `/blog`                                   | `/en/blog`                                   |
 *   | Blog article             | `/blog/{article-slug}`                    | `/en/blog/{article-slug}`                    |
 *   | Booking                  | `/booking`                                | `/en/booking`                                |
 *   | Contact                  | `/kontak`                                 | `/en/contact`                                |
 *   | FAQ                      | `/faq`                                    | `/en/faq`                                    |
 *   | Terms                    | `/syarat-ketentuan`                       | `/en/terms`                                  |
 *   | Privacy                  | `/kebijakan-privasi`                      | `/en/privacy`                                |
 *
 * Dynamic slugs (`{city-slug}`, `{country-slug}`, `{vehicle-slug}`,
 * `{service-slug}`, `{article-slug}`) are locale-invariant: the same slug
 * value is used in both locales. Only the static segments differ.
 *
 * Pure module with no external dependencies, no side effects, and no access
 * to the Content_Layer. Slug validity (R3.4) is the caller's responsibility
 * via `lib/validation/slug.ts`.
 */

/**
 * Supported locale tags.
 *
 * TODO(task 2.7): the canonical `Locale` type is owned by
 * `lib/i18n/getDictionary.ts` (introduced in task 2.7, running in parallel
 * with this task). Once both modules land, the two declarations SHALL be
 * reconciled — most likely by re-exporting from `getDictionary.ts` — so there
 * is a single source of truth for the locale union.
 */
export type Locale = "id" | "en";

/**
 * Logical page types that have distinct static URL segments between locales.
 *
 * Keys are intentionally English and domain-oriented so they read naturally
 * at the call site regardless of the active locale. The `airportTransfer`
 * entry represents the trailing `/airport-transfer` sub-segment appended
 * under a city landing — it is NOT a top-level page.
 */
export type PageSegmentType =
  | "cityLanding"
  | "airportTransfer"
  | "country"
  | "vehicleListing"
  | "service"
  | "blog"
  | "booking"
  | "contact"
  | "faq"
  | "terms"
  | "privacy";

/**
 * Per-locale static segment pairs, leading-slash-free.
 *
 * Each value is the literal path segment used inside the URL. For example
 * `STATIC_SEGMENTS.cityLanding.id === "sewa-mobil"` and
 * `STATIC_SEGMENTS.cityLanding.en === "car-rental"` combine with a dynamic
 * city slug to produce `/sewa-mobil/bogor` and `/en/car-rental/bogor`
 * respectively.
 *
 * Shared segments (`blog`, `booking`, `faq`) intentionally repeat the same
 * literal for both locales so the mapping stays homogeneous and the builders
 * do not need a special case.
 *
 * Declared `as const` so each value narrows to its string literal type and
 * the whole record is readonly — callers cannot mutate the map at runtime.
 */
export const STATIC_SEGMENTS = {
  cityLanding: { id: "sewa-mobil", en: "car-rental" },
  airportTransfer: { id: "airport-transfer", en: "airport-transfer" },
  country: { id: "internasional", en: "international" },
  vehicleListing: { id: "armada", en: "fleet" },
  service: { id: "layanan", en: "services" },
  blog: { id: "blog", en: "blog" },
  booking: { id: "booking", en: "booking" },
  contact: { id: "kontak", en: "contact" },
  faq: { id: "faq", en: "faq" },
  terms: { id: "syarat-ketentuan", en: "terms" },
  privacy: { id: "kebijakan-privasi", en: "privacy" },
} as const satisfies Record<PageSegmentType, Readonly<Record<Locale, string>>>;

/**
 * Keys accepted by {@link staticPath}: the subset of {@link PageSegmentType}
 * values that correspond to a top-level static page (no dynamic slug).
 *
 * `cityLanding`, `airportTransfer`, `country`, and `service` are excluded
 * because those page types require a dynamic segment and are exposed via
 * dedicated builders ({@link citySlugPath}, {@link countrySlugPath},
 * {@link servicePath}). `vehicleListing` IS a top-level static page
 * (`/armada`, `/en/fleet`) and is therefore included here; `vehicleSlugPath`
 * covers the vehicle-detail case with a dynamic slug.
 */
export type StaticPageKey =
  | "contact"
  | "faq"
  | "terms"
  | "privacy"
  | "booking"
  | "blog"
  | "vehicleListing";

/**
 * Resolve the `[locale]` App Router segment to a {@link Locale}.
 *
 * Matches the router behavior fixed by R3.1: the Bahasa Indonesia locale is
 * served under the root prefix `/` (so the `[locale]` segment is absent and
 * Next.js passes `undefined` for `params.locale`), and the English locale is
 * served under `/en` (so `params.locale === "en"`). Any other value is a
 * malformed URL and the caller is expected to respond with HTTP 404 per R3.1
 * criterion "only the values `id` and `en`" and R4.9.
 *
 * Returns:
 *   - `"en"` when `seg === "en"`.
 *   - `"id"` when `seg === undefined` (root path, no locale prefix).
 *   - `null` for every other input, including `"id"` itself, so callers can
 *     distinguish a valid locale from an unsupported segment and trigger a
 *     localized not-found response.
 *
 * Pure: no side effects, no allocations.
 */
export function resolveLocale(seg: string | undefined): Locale | null {
  if (seg === undefined) {
    return "id";
  }
  if (seg === "en") {
    return "en";
  }
  return null;
}

/**
 * Internal helper that prefixes a path body (e.g. `"sewa-mobil/bogor"`) with
 * the locale-specific root: `/` for `id`, `/en/` for `en`.
 *
 * When `body` is empty the function returns the locale homepage (`/` or
 * `/en`) rather than a path with a trailing slash, matching the canonical
 * form enforced by R3.7.
 */
function withLocaleRoot(locale: Locale, body: string): string {
  if (locale === "id") {
    return body.length === 0 ? "/" : `/${body}`;
  }
  return body.length === 0 ? "/en" : `/en/${body}`;
}

/**
 * Options accepted by {@link citySlugPath}.
 *
 * `subpath`, when provided, is appended after the city slug. The two
 * expected shapes per R3.2 / R3.3 are:
 *   - `"airport-transfer"` — produces `/sewa-mobil/{city}/airport-transfer`
 *     (or `/en/car-rental/{city}/airport-transfer`). Callers are encouraged
 *     to reference `STATIC_SEGMENTS.airportTransfer` for this literal to
 *     keep the mapping co-located.
 *   - A vehicle slug (any R3.4-conformant slug string) — produces
 *     `/sewa-mobil/{city}/{vehicle}` (or `/en/car-rental/{city}/{vehicle}`).
 *
 * The type is deliberately `string` rather than a discriminated union: this
 * module does not validate slugs (R3.4 is enforced by
 * `lib/validation/slug.ts`) and treating vehicle slugs as opaque strings
 * lets the builder stay decoupled from the Content_Layer.
 */
export interface CitySlugPathOptions {
  /**
   * Optional trailing segment: `"airport-transfer"` for the airport-transfer
   * page, or a vehicle slug for the combined city-and-vehicle page. Omit for
   * the city landing itself.
   */
  readonly subpath?: string;
}

/**
 * Build the absolute path for a city landing, airport-transfer page, or
 * combined city-and-vehicle page.
 *
 * @example
 * citySlugPath("id", "bogor");                                         // "/sewa-mobil/bogor"
 * citySlugPath("en", "bogor");                                         // "/en/car-rental/bogor"
 * citySlugPath("id", "bogor", { subpath: "airport-transfer" });        // "/sewa-mobil/bogor/airport-transfer"
 * citySlugPath("en", "bogor", { subpath: STATIC_SEGMENTS.airportTransfer.en }); // "/en/car-rental/bogor/airport-transfer"
 * citySlugPath("id", "bogor", { subpath: "innova-reborn" });           // "/sewa-mobil/bogor/innova-reborn"
 *
 * Dynamic slugs are locale-invariant (R3.2 / R3.3) so `citySlug` is the same
 * value in both locales. No validation is performed on the inputs; pair this
 * builder with `lib/validation/slug.ts` when the slug originates from an
 * untrusted source.
 */
export function citySlugPath(
  locale: Locale,
  citySlug: string,
  options?: CitySlugPathOptions,
): string {
  const base = STATIC_SEGMENTS.cityLanding[locale];
  const subpath = options?.subpath;
  const body =
    subpath === undefined || subpath.length === 0
      ? `${base}/${citySlug}`
      : `${base}/${citySlug}/${subpath}`;
  return withLocaleRoot(locale, body);
}

/**
 * Build the absolute path for a country landing page.
 *
 * @example
 * countrySlugPath("id", "singapore"); // "/internasional/singapore"
 * countrySlugPath("en", "singapore"); // "/en/international/singapore"
 */
export function countrySlugPath(locale: Locale, countrySlug: string): string {
  const base = STATIC_SEGMENTS.country[locale];
  return withLocaleRoot(locale, `${base}/${countrySlug}`);
}

/**
 * Build the absolute path for a vehicle detail page.
 *
 * The vehicle listing page (no dynamic slug) is reachable through
 * {@link staticPath} with key `"vehicleListing"`.
 *
 * @example
 * vehicleSlugPath("id", "innova-reborn"); // "/armada/innova-reborn"
 * vehicleSlugPath("en", "innova-reborn"); // "/en/fleet/innova-reborn"
 */
export function vehicleSlugPath(locale: Locale, vehicleSlug: string): string {
  const base = STATIC_SEGMENTS.vehicleListing[locale];
  return withLocaleRoot(locale, `${base}/${vehicleSlug}`);
}

/**
 * Build the absolute path for a service detail page.
 *
 * @example
 * servicePath("id", "corporate"); // "/layanan/corporate"
 * servicePath("en", "corporate"); // "/en/services/corporate"
 */
export function servicePath(locale: Locale, serviceSlug: string): string {
  const base = STATIC_SEGMENTS.service[locale];
  return withLocaleRoot(locale, `${base}/${serviceSlug}`);
}

/**
 * Build the absolute path for a top-level static page.
 *
 * Accepts one of:
 *   - `"contact"`       → `/kontak` or `/en/contact`
 *   - `"faq"`           → `/faq` or `/en/faq`
 *   - `"terms"`         → `/syarat-ketentuan` or `/en/terms`
 *   - `"privacy"`       → `/kebijakan-privasi` or `/en/privacy`
 *   - `"booking"`       → `/booking` or `/en/booking`
 *   - `"blog"`          → `/blog` or `/en/blog` (blog index)
 *   - `"vehicleListing"`→ `/armada` or `/en/fleet` (full fleet listing)
 *
 * Use the dedicated dynamic-slug builders for page types that require a
 * slug: {@link citySlugPath}, {@link countrySlugPath}, {@link vehicleSlugPath},
 * {@link servicePath}. A blog-article path uses `${staticPath(locale, "blog")}/${articleSlug}`.
 */
export function staticPath(locale: Locale, page: StaticPageKey): string {
  const segment = STATIC_SEGMENTS[page][locale];
  return withLocaleRoot(locale, segment);
}
