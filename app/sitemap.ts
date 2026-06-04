import type { MetadataRoute } from "next";

import {
  getArticles,
  getCities,
  getCityAirports,
  getCountries,
  getServices,
  getVehicles,
} from "@/lib/content";
import {
  citySlugPath,
  countrySlugPath,
  servicePath,
  staticPath,
  vehicleSlugPath,
  type StaticPageKey,
} from "@/lib/i18n/slugMap";
import { absoluteUrl, hreflangAlternates } from "@/lib/seo/canonical";

/**
 * `/sitemap.xml` generator.
 *
 * Requirements:
 * - R7.4 — emit `sitemap.xml` covering every Indexable_Page in both
 *   Locales with `lastmod`, `changefreq`, and per-URL
 *   `<xhtml:link rel="alternate" hreflang="…">` entries (Next.js renders
 *   the `alternates.languages` map as those `<xhtml:link>` elements).
 * - R7.5 — when the total URL count exceeds 40,000, split into a sitemap
 *   index with per-type sub-sitemaps at `/sitemap/<type>.xml` capped at
 *   40,000 URLs each. See the "40k pagination" note below — the MVP
 *   catalog (a few dozen cities, a handful of vehicles/services/articles)
 *   is two orders of magnitude below that ceiling, so the split route
 *   (`app/sitemap/[type]/route.ts`) is intentionally deferred until the
 *   catalog approaches the threshold.
 * - R7.7 / R22.5 — Coverage_Pages with `allow_index === false` are
 *   excluded; we do not advertise noindex URLs in the sitemap and we do
 *   not emit hreflang alternates that would point at them.
 *
 * Design: §12 (Sitemap and Robots).
 *
 * Shape of each entry:
 *   - `url`: absolute URL in Bahasa Indonesia (the site's default Locale
 *     per R4.1). The English equivalent is attached via
 *     `alternates.languages` so the same page appears once per canonical
 *     URL in the feed instead of once per Locale.
 *   - `lastModified`: `new Date()` as a placeholder. Per-row `updated_at`
 *     is not threaded through the Content_Layer yet; revisit once the
 *     structured loaders expose `updatedAt` on the composed shapes. R7.4
 *     only mandates ISO 8601 UTC — `Date.toISOString()` (applied by Next
 *     when it serializes the entry) satisfies the format requirement.
 *   - `changeFrequency`: `"weekly"` for dynamic pages, `"monthly"` for
 *     static pages — static pages change on release cycles, not daily.
 *   - `priority`: `1.0` homepage, `0.8` city/country/vehicle/service,
 *     `0.6` blog articles, `0.5` static.
 *   - `alternates.languages`: `{ "id-ID", "en", "x-default" }` built by
 *     {@link hreflangAlternates} from the dual-locale path pair. All
 *     programmatically generated pages in this codebase exist in both
 *     locales (the slug is locale-invariant per R3.2 / R3.3), so every
 *     entry emits a full three-key map. If a future page type exists in
 *     only one Locale, `hreflangAlternates` omits the missing key
 *     automatically (R4.4) — which also means we do NOT emit an
 *     alternate pointing at a noindex URL (R7.7) as long as the
 *     excluded-page filter is applied on both the `id` and `en` arms.
 *
 * ---
 * 40k pagination (R7.5) — future extension
 *
 * When `entries.length` would cross 40,000, the sitemap MUST be split
 * per-type under `/sitemap/<type>.xml` and this file MUST emit a sitemap
 * index referencing them. The scaffold for that split route lives at
 * `app/sitemap/[type]/route.ts` and is intentionally not created yet:
 * the MVP catalog is well below the cap and shipping an unused route
 * would just carry maintenance risk. Trigger point: when a combined
 * city + vehicle catalog (`launched cities × available vehicles`) starts
 * trending toward 5,000 URLs, stage the split before it becomes urgent.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Both locales in parallel — each call reads the pre-built snapshot
  // and composes narrative, so they're independent and cheap.
  const [
    idCities,
    enCities,
    idCountries,
    enCountries,
    idVehicles,
    enVehicles,
    idServices,
    enServices,
    idArticles,
    enArticles,
  ] = await Promise.all([
    getCities("id"),
    getCities("en"),
    getCountries("id"),
    getCountries("en"),
    getVehicles("id"),
    getVehicles("en"),
    getServices("id"),
    getServices("en"),
    getArticles("id"),
    getArticles("en"),
  ]);

  const entries: MetadataRoute.Sitemap = [];

  // --- Homepage -----------------------------------------------------------
  entries.push(
    makeEntry({
      idPath: "/",
      enPath: "/en",
      changeFrequency: "weekly",
      priority: 1.0,
    }),
  );

  // --- Static pages -------------------------------------------------------
  // `blog` is listed here for the index page itself; individual articles are
  // appended below from `getArticles`.
  const staticPages: StaticPageKey[] = [
    "vehicleListing",
    "blog",
    "booking",
    "contact",
    "faq",
    "terms",
    "privacy",
  ];
  for (const page of staticPages) {
    entries.push(
      makeEntry({
        idPath: staticPath("id", page),
        enPath: staticPath("en", page),
        changeFrequency: "monthly",
        priority: 0.5,
      }),
    );
  }

  // --- City pages ---------------------------------------------------------
  // R7.7 / R22.5: exclude cities whose allow_index flag is false.
  // Same filter applies to the en cohort so we never emit an alternate
  // pointing at a noindex URL.
  const idIndexableCities = idCities.filter((city) => city.allowIndex);
  const enIndexableCitiesBySlug = new Map(
    enCities.filter((city) => city.allowIndex).map((city) => [city.slug, city]),
  );

  for (const city of idIndexableCities) {
    const hasEn = enIndexableCitiesBySlug.has(city.slug);
    entries.push(
      makeEntry({
        idPath: citySlugPath("id", city.slug),
        enPath: hasEn ? citySlugPath("en", city.slug) : null,
        changeFrequency: "weekly",
        priority: 0.8,
      }),
    );

    // Airport-transfer sub-page only appears for launched cities that have
    // at least one airport. `getCityAirports` is locale-agnostic so a single
    // lookup per city covers both Locales.
    if (city.coverageState === "launched") {
      const airports = await getCityAirports(city.slug);
      if (airports.length > 0) {
        entries.push(
          makeEntry({
            idPath: citySlugPath("id", city.slug, {
              subpath: "airport-transfer",
            }),
            enPath: hasEn
              ? citySlugPath("en", city.slug, { subpath: "airport-transfer" })
              : null,
            changeFrequency: "weekly",
            priority: 0.8,
          }),
        );
      }
    }
  }

  // --- Country pages ------------------------------------------------------
  const enCountrySlugs = new Set(enCountries.map((c) => c.slug));
  for (const country of idCountries) {
    entries.push(
      makeEntry({
        idPath: countrySlugPath("id", country.slug),
        enPath: enCountrySlugs.has(country.slug)
          ? countrySlugPath("en", country.slug)
          : null,
        changeFrequency: "weekly",
        priority: 0.8,
      }),
    );
  }

  // --- Vehicle detail pages ----------------------------------------------
  const enVehicleSlugs = new Set(enVehicles.map((v) => v.slug));
  for (const vehicle of idVehicles) {
    entries.push(
      makeEntry({
        idPath: vehicleSlugPath("id", vehicle.slug),
        enPath: enVehicleSlugs.has(vehicle.slug)
          ? vehicleSlugPath("en", vehicle.slug)
          : null,
        changeFrequency: "weekly",
        priority: 0.8,
      }),
    );
  }

  // --- Service pages ------------------------------------------------------
  const enServiceSlugs = new Set(enServices.map((s) => s.slug));
  for (const service of idServices) {
    entries.push(
      makeEntry({
        idPath: servicePath("id", service.slug),
        enPath: enServiceSlugs.has(service.slug)
          ? servicePath("en", service.slug)
          : null,
        changeFrequency: "weekly",
        priority: 0.8,
      }),
    );
  }

  // --- Blog articles ------------------------------------------------------
  const enArticleSlugs = new Set(enArticles.map((a) => a.slug));
  for (const article of idArticles) {
    entries.push(
      makeEntry({
        idPath: `${staticPath("id", "blog")}/${article.slug}`,
        enPath: enArticleSlugs.has(article.slug)
          ? `${staticPath("en", "blog")}/${article.slug}`
          : null,
        changeFrequency: "weekly",
        priority: 0.6,
      }),
    );
  }

  // --- R7.5 guard --------------------------------------------------------
  // The MVP catalog is ~two orders of magnitude below the 40k cap. If a
  // future data migration pushes us over, this warning is the first signal
  // that the deferred per-type split at `app/sitemap/[type]/route.ts` needs
  // to land. Not a build failure — a single oversized sitemap is still
  // indexable, the split is an optimization, not a correctness fix.
  if (entries.length > 40000) {
    console.warn(
      `[sitemap] ${entries.length} URLs exceeds the 40k per-file cap (R7.5). ` +
        "Implement app/sitemap/[type]/route.ts and emit a sitemap index.",
    );
  }

  return entries;
}

/**
 * Arguments for {@link makeEntry}. Kept as a small interface so the call
 * sites above read as named parameters without re-stating the same five
 * fields at each callsite.
 */
interface EntryInput {
  /** Bahasa Indonesia path (always present; this is the canonical URL). */
  idPath: string;
  /** English path, or `null` when the page does not exist in English. */
  enPath: string | null;
  changeFrequency: NonNullable<
    MetadataRoute.Sitemap[number]["changeFrequency"]
  >;
  priority: number;
}

/**
 * Build one sitemap entry with its hreflang alternates attached.
 *
 * The Bahasa Indonesia URL is always the primary `url` because R4.1 fixes
 * `id` as the site's default Locale — `x-default` from
 * {@link hreflangAlternates} points here too. When the page exists in
 * English, the `en` alternate is included so crawlers can discover both
 * Locales from a single entry (R7.4).
 *
 * Copies the `Record<string, string>` produced by `hreflangAlternates`
 * into a fresh `Record<Locale | "x-default", string>` typed object — the
 * upstream builder intentionally returns a `Partial` so we filter out the
 * `undefined` values here to satisfy Next's sitemap types.
 */
function makeEntry({
  idPath,
  enPath,
  changeFrequency,
  priority,
}: EntryInput): MetadataRoute.Sitemap[number] {
  const alternates = hreflangAlternates({ id: idPath, en: enPath });
  const languages: Record<string, string> = {};
  for (const [key, value] of Object.entries(alternates)) {
    if (typeof value === "string" && value !== "") {
      languages[key] = value;
    }
  }

  // `lastModified` is `new Date()` as a placeholder. Once `updatedAt` is
  // threaded through the composed Content_Layer shapes (Structured store
  // rows already carry `updated_at`; the narrative loader tracks MDX
  // mtimes), swap in the max of those two per entity so crawlers see a
  // stable `lastmod` that only moves when the page actually changes.
  return {
    url: absoluteUrl(idPath),
    lastModified: new Date(),
    changeFrequency,
    priority,
    alternates: { languages },
  };
}

// TODO(R7.5): when the catalog approaches 40k URLs, split into per-type
// sub-sitemaps under `app/sitemap/[type]/route.ts` and emit a sitemap index
// from this file. Extract the per-type builders out of the loop above and
// have the split route call them directly.
