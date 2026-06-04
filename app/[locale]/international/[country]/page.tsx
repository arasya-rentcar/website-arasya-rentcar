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
 * English Country_Page route (task 7.11).
 *
 * Mirror of `app/[locale]/internasional/[country]/page.tsx` served under
 * the English static segment `/international/` per R3.3. Data resolution
 * flows through the shared {@link resolveCountryPageData} helper so both
 * routes render identical content for the same `{locale, slug}` pair —
 * keeping the helper as the single source of truth prevents drift between
 * the two files as the template evolves.
 *
 * The `[locale]` dynamic segment is validated against the supported
 * locales at the parent layout via `generateStaticParams` +
 * `dynamicParams = false`, so a visitor who lands here with
 * `locale === "en"` is the only expected case; we still run `isLocale`
 * defensively to narrow the type for downstream helpers.
 *
 * ISR (R5.10): `revalidate = 3600` keeps country pages on a one-hour
 * regeneration cadence, matched across every programmatic route in
 * Phase 7.
 *
 * Requirements: R3.4, R3.5, R5.8, R7.1, R9.3 (the R9 section order is
 * enforced by `CountryTemplate`).
 */

/** R5.10 ISR budget (1 hour). */
export const revalidate = 3600;

/** R5.10 allows unknown dynamic params to ISR at request time. */
export const dynamicParams = true;

/**
 * Pre-generate the set of `{country}` slugs that have content in either
 * locale. Mirrors the Bahasa Indonesia route so the two produce the same
 * static surface area — a slug present only in one locale still serves
 * in the other at request time via `dynamicParams = true`, falling
 * through to `notFound()` when the translation is missing.
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
 * Render the Country_Page under the English static segment.
 *
 * The slug is normalised before validation (`normalizeSlug` trims
 * whitespace and lowercases ASCII letters) so uppercase or padded
 * segments still flow to a valid record; the middleware 301 for those
 * forms is tracked under task 15.2. A slug that fails R3.4 after
 * normalisation 404s per R3.5.
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
 * Build Next.js `Metadata` for the English country landing (R7.1).
 *
 * Alternates span both locales so `hreflangAlternates` produces the full
 * `id-ID` / `en` / `x-default` triple required by R4.3. `seoTitle` and
 * `seoDescription` prefer the narrative frontmatter (validated by
 * `countryFm` for the R6.7 length budgets) and fall back to short
 * defaults built from the country display name.
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
