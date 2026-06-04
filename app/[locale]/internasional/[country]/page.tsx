import type { Metadata } from "next";
import { notFound } from "next/navigation";

import CountryTemplate from "@/components/templates/CountryTemplate";
import { getCountries, getCountry } from "@/lib/content";
import { getDictionary, isLocale, type Locale } from "@/lib/i18n/getDictionary";
import { countrySlugPath } from "@/lib/i18n/slugMap";
import { resolveCountryPageData } from "@/lib/routing/countryRouteHelper";
import { buildMetadata } from "@/lib/seo/metadata";
import { isValidSlug, normalizeSlug } from "@/lib/validation/slug";

/**
 * Bahasa Indonesia Country_Page route (task 7.11).
 *
 * Serves `/internasional/{country}` (and in the `[locale]` tree, `/en`
 * paths are handled by the sibling `international/[country]` route). Data
 * resolution flows through {@link resolveCountryPageData} so this route
 * file stays a thin adapter — the English mirror (`international/[country]`)
 * calls the same helper and passes the result to the same template.
 *
 * ISR (R5.10): `revalidate = 3600` keeps country pages on a one-hour
 * regeneration cadence, matched across every programmatic route in
 * Phase 7. `dynamicParams = true` lets cities added after build ISR at
 * request time rather than forcing a redeploy.
 *
 * Requirements: R3.4 (slug validation), R3.5 (non-conforming slugs 404
 * in the active locale), R5.8 (a Country_Page per active Country), R7.1
 * (metadata fields), R9.3 (R9 section order — enforced by the template).
 */

/** R5.10 ISR budget (1 hour). */
export const revalidate = 3600;

/** R5.10 allows unknown dynamic params to ISR at request time. */
export const dynamicParams = true;

/**
 * Pre-generate the set of `{country}` slugs that have content in either
 * locale. Using the union keeps the static-params output locale-agnostic
 * — the `[locale]` segment is pinned by the parent layout's own
 * `generateStaticParams`, so the router-level cartesian product produces
 * one static entry per (locale, slug) pair. A slug present only in one
 * locale still serves in the other locale at request time via
 * `dynamicParams = true`, falling through to `notFound()` when the
 * translation is missing.
 */
export async function generateStaticParams(): Promise<{ country: string }[]> {
  const [idCountries, enCountries] = await Promise.all([
    getCountries("id"),
    getCountries("en"),
  ]);
  const slugs = new Set<string>([
    ...idCountries.map((c) => c.slug),
    ...enCountries.map((c) => c.slug),
  ]);
  return Array.from(slugs).map((country) => ({ country }));
}

/**
 * Render the Country_Page under the Bahasa Indonesia static segment.
 *
 * The handler normalises the slug before validation so `/INTERNASIONAL/Singapore`
 * flows to the same country record as `/internasional/singapore` (the
 * middleware 301-redirect rule for non-canonical segments lands in task
 * 15.2 — until then we normalise at the handler level so valid content
 * still renders). A slug that fails R3.4 after normalisation 404s per
 * R3.5.
 */
export default async function CountryPage({
  params,
}: {
  params: Promise<{ locale: string; country: string }>;
}) {
  const { locale, country: rawSlug } = await params;
  if (!isLocale(locale)) notFound();

  const slug = normalizeSlug(rawSlug);
  if (!isValidSlug(slug)) notFound();

  const data = await resolveCountryPageData(locale as Locale, slug);
  if (data === null) notFound();

  return (
    <CountryTemplate
      locale={locale as Locale}
      country={data.country}
      availableVehicles={data.vehicles}
      supportedCities={data.supportedCities}
      dict={data.dict}
    />
  );
}

/**
 * Build Next.js `Metadata` for the country landing (R7.1).
 *
 * Alternates span both locales so `hreflangAlternates` produces the full
 * `id-ID` / `en` / `x-default` triple required by R4.3. `seoTitle` and
 * `seoDescription` prefer the narrative frontmatter (validated by
 * `countryFm` for the R6.7 length budgets) and fall back to short
 * defaults built from the country display name so the page still has
 * metadata if the narrative is missing.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; country: string }>;
}): Promise<Metadata> {
  const { locale, country: rawSlug } = await params;
  if (!isLocale(locale)) notFound();

  const slug = normalizeSlug(rawSlug);
  if (!isValidSlug(slug)) notFound();

  // `generateMetadata` runs independently of the page body so we reload
  // the country here. `getCountry` returns the composed CountryWithNarrative
  // in a single call, and Next.js dedupes identical fetches within a
  // request so the concurrent page-body load shares the same cache entry
  // at the Content_Layer snapshot boundary.
  const [country, dict] = await Promise.all([
    getCountry(slug, locale),
    getDictionary(locale),
  ]);
  if (country === null) notFound();

  const siteName = dict.meta.siteName;
  const seoTitle =
    country.narrative?.frontmatter.seoTitle ??
    (locale === "id"
      ? `Sewa Mobil ${country.displayName} dengan Supir — ${siteName}`
      : `Chauffeur Car Rental to ${country.displayName} — ${siteName}`);
  const seoDescription =
    country.narrative?.frontmatter.seoDescription ??
    (locale === "id"
      ? `Layanan sewa mobil dengan supir untuk perjalanan ke ${country.displayName} dari berbagai kota keberangkatan.`
      : `Chauffeur car rental service for trips to ${country.displayName} from supported departure cities.`);

  return buildMetadata({
    locale,
    pathForLocale: countrySlugPath(locale, slug),
    alternates: {
      id: countrySlugPath("id", slug),
      en: countrySlugPath("en", slug),
    },
    seoTitle,
    seoDescription,
    og: {
      pageType: "country",
      title: country.narrative?.frontmatter.heroHeadline ?? country.displayName,
      subtitle: country.narrative?.frontmatter.heroSubheadline ?? "",
    },
  });
}
