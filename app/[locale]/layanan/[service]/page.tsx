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
 * Bahasa Indonesia Service_Page route (task 7.13).
 *
 * Serves `/layanan/{service}`. Data resolution flows through the shared
 * {@link resolveServicePageData} helper so the English mirror
 * (`/en/services/{service}`) renders identical content for the same
 * `{locale, slug}` pair.
 *
 * ISR (R5.10): `revalidate = 3600` keeps service pages on a one-hour
 * regeneration cadence, matched across every programmatic route in
 * Phase 7. `dynamicParams = true` lets services added after build ISR
 * at request time rather than forcing a redeploy.
 *
 * Requirements: R3.4 (slug validation), R3.5 (non-conforming slugs 404
 * in the active locale), R5.8 (a Service_Page per active Service), R7.1
 * (metadata fields), design §9 (section order — enforced by the
 * template).
 */

/** R5.10 ISR budget (1 hour). */
export const revalidate = 3600;

/** R5.10 allows unknown dynamic params to ISR at request time. */
export const dynamicParams = true;

/**
 * Pre-generate the union of active service slugs across both locales so
 * a service that only has a translation in one locale still pre-renders
 * for the current locale route. The runtime page resolver 404s when the
 * translation is missing, matching R3.5's "return 404 in the locale of
 * the path prefix".
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
 * Render the Service_Page under the Bahasa Indonesia static segment.
 *
 * The handler normalises the slug before validation so `/LAYANAN/Transfer`
 * flows to the same service record as `/layanan/transfer` (the middleware
 * 301-redirect rule for non-canonical segments lands in task 15.2 — until
 * then we normalise at the handler level so valid content still renders).
 * A slug that fails R3.4 after normalisation 404s per R3.5.
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
 * Build Next.js `Metadata` for the service landing (R7.1).
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

  // `generateMetadata` runs independently of the page body so we reload
  // the service here. Next.js dedupes identical fetches within a request
  // so the concurrent page-body load shares the same cache entry at the
  // Content_Layer snapshot boundary.
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
