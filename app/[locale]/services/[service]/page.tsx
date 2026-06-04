import type { Metadata } from "next";
import { notFound } from "next/navigation";

import ServiceTemplate from "@/components/templates/ServiceTemplate";
import { getService, getServices } from "@/lib/content";
import { getDictionary, isLocale, type Locale } from "@/lib/i18n/getDictionary";
import { servicePath } from "@/lib/i18n/slugMap";
import { resolveServicePageData } from "@/lib/routing/serviceRouteHelper";
import { buildMetadata } from "@/lib/seo/metadata";
import { isValidSlug, normalizeSlug } from "@/lib/validation/slug";

/**
 * English Service_Page route (task 7.13).
 *
 * Mirror of `app/[locale]/layanan/[service]/page.tsx` served under the
 * English static segment `/services/` per R3.3. Data resolution flows
 * through the shared {@link resolveServicePageData} helper so both
 * routes render identical content for the same `{locale, slug}` pair —
 * keeping the helper as the single source of truth prevents drift
 * between the two files as the template evolves.
 *
 * The `[locale]` dynamic segment is validated at the parent layout; we
 * still run `isLocale` defensively here to narrow the type for
 * downstream helpers.
 *
 * ISR (R5.10): `revalidate = 3600` keeps service pages on a one-hour
 * regeneration cadence, matched across every programmatic route in
 * Phase 7.
 *
 * Requirements: R3.4, R3.5, R5.8, R7.1, design §9 (section order
 * enforced by `ServiceTemplate`).
 */

/** R5.10 ISR budget (1 hour). */
export const revalidate = 3600;

/** R5.10 allows unknown dynamic params to ISR at request time. */
export const dynamicParams = true;

/**
 * Pre-generate the union of active service slugs across both locales.
 * Mirrors the Bahasa Indonesia route so the two produce the same static
 * surface area — a slug present only in one locale still serves in the
 * other at request time via `dynamicParams = true`, falling through to
 * `notFound()` when the translation is missing.
 */
export async function generateStaticParams(): Promise<{ service: string }[]> {
  const [idServices, enServices] = await Promise.all([
    getServices("id"),
    getServices("en"),
  ]);
  const slugs = new Set<string>([
    ...idServices.map((s) => s.slug),
    ...enServices.map((s) => s.slug),
  ]);
  return Array.from(slugs).map((service) => ({ service }));
}

/**
 * Render the Service_Page under the English static segment.
 *
 * The slug is normalised before validation (`normalizeSlug` trims
 * whitespace and lowercases ASCII letters) so uppercase or padded
 * segments still flow to a valid record; the middleware 301 for those
 * forms is tracked under task 15.2. A slug that fails R3.4 after
 * normalisation 404s per R3.5.
 */
export default async function ServicePage({
  params,
}: {
  params: Promise<{ locale: string; service: string }>;
}) {
  const { locale, service: rawSlug } = await params;
  if (!isLocale(locale)) notFound();

  const slug = normalizeSlug(rawSlug);
  if (!isValidSlug(slug)) notFound();

  const data = await resolveServicePageData(locale as Locale, slug);
  if (data === null) notFound();

  return (
    <ServiceTemplate
      locale={locale as Locale}
      service={data.service}
      serviceCities={data.serviceCities}
      dict={data.dict}
    />
  );
}

/**
 * Build Next.js `Metadata` for the English service landing (R7.1).
 *
 * Alternates span both locales so `hreflangAlternates` produces the full
 * `id-ID` / `en` / `x-default` triple required by R4.3. `seoTitle` and
 * `seoDescription` prefer the narrative frontmatter (validated by
 * `serviceFm` for the R6.7 length budgets) and fall back to short
 * defaults built from the service display name.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; service: string }>;
}): Promise<Metadata> {
  const { locale, service: rawSlug } = await params;
  if (!isLocale(locale)) notFound();

  const slug = normalizeSlug(rawSlug);
  if (!isValidSlug(slug)) notFound();

  const [service, dict] = await Promise.all([
    getService(slug, locale),
    getDictionary(locale),
  ]);
  if (service === null || !service.active) notFound();

  const siteName = dict.meta.siteName;
  const seoTitle =
    service.narrative?.frontmatter.seoTitle ??
    (locale === "id"
      ? `${service.displayName} dengan Supir — ${siteName}`
      : `${service.displayName} with Chauffeur — ${siteName}`);
  const seoDescription =
    service.narrative?.frontmatter.seoDescription ??
    (locale === "id"
      ? `Layanan ${service.displayName} dengan supir profesional dari ${siteName}.`
      : `${service.displayName} service with a professional chauffeur from ${siteName}.`);

  return buildMetadata({
    locale,
    pathForLocale: servicePath(locale, slug),
    alternates: {
      id: servicePath("id", slug),
      en: servicePath("en", slug),
    },
    seoTitle,
    seoDescription,
    og: {
      pageType: "service",
      title: service.narrative?.frontmatter.heroHeadline ?? service.displayName,
      subtitle: service.narrative?.frontmatter.heroSubheadline ?? "",
    },
  });
}
