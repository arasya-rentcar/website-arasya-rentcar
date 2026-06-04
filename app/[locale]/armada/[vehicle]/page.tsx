import type { Metadata } from "next";
import { notFound } from "next/navigation";

import VehicleTemplate from "@/components/templates/VehicleTemplate";
import { isLocale } from "@/lib/i18n/getDictionary";
import { vehicleSlugPath } from "@/lib/i18n/slugMap";
import { resolveVehiclePageData } from "@/lib/routing/vehicleRouteHelper";
import { buildMetadata } from "@/lib/seo/metadata";
import { isValidSlug, normalizeSlug } from "@/lib/validation/slug";

/**
 * Vehicle detail route for the Bahasa Indonesia locale —
 * `/armada/{vehicle-slug}` (task 7.12, design §9, R9.4).
 *
 * The heavy lifting lives in `resolveVehiclePageData` (task 7.12 shared
 * helper) so the English mirror `/en/fleet/[vehicle]` can reuse the same
 * call chain without duplicating the data-access logic.
 *
 * Slug handling:
 *   - `params.vehicle` is normalized (trim + lowercase) before validation
 *     so upstream canonicalization can be added later without changing
 *     this file (R3.4 / R15.2 normalization hook).
 *   - Invalid slugs return 404 in the active locale (R3.5 / R4.9).
 */

/** R5.10 — 1 hour ISR window. */
export const revalidate = 3600;

/**
 * R5.10 — allow runtime-added vehicle slugs to ISR without a rebuild.
 * `generateStaticParams` below pre-renders every slug present at build
 * time; new rows arriving via Supabase revalidation (R24.2) flow through
 * the `dynamicParams = true` path.
 */
export const dynamicParams = true;

/**
 * Build-time slug list. Both locales' slug sets are merged so an active
 * vehicle that only has a translation in one locale still pre-renders for
 * the current locale route — the runtime page resolver (`resolveVehiclePageData`)
 * will 404 if the vehicle is missing a translation in `locale`, matching
 * R3.5's "return 404 in the locale of the path prefix".
 */
export async function generateStaticParams() {
  const { getVehicles } = await import("@/lib/content");
  const [id, en] = await Promise.all([getVehicles("id"), getVehicles("en")]);
  const slugs = new Set<string>([
    ...id.map((v) => v.slug),
    ...en.map((v) => v.slug),
  ]);
  return Array.from(slugs).map((vehicle) => ({ vehicle }));
}

export default async function VehicleDetailPage({
  params,
}: {
  params: Promise<{ locale: string; vehicle: string }>;
}) {
  const { locale, vehicle: rawSlug } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const slug = normalizeSlug(rawSlug);
  if (!isValidSlug(slug)) {
    notFound();
  }

  const data = await resolveVehiclePageData(locale, slug);
  if (data === null) {
    notFound();
  }

  return (
    <VehicleTemplate
      locale={locale}
      vehicle={data.vehicle}
      serviceCities={data.serviceCities}
      relatedVehicles={data.relatedVehicles}
      dict={data.dict}
    />
  );
}

/**
 * Build Next.js `Metadata` for the vehicle detail page (R7.1).
 *
 * - `canonical` points at the locale-specific self URL (R6.8).
 * - `alternates.id` / `alternates.en` are emitted unconditionally: both
 *   locales share the same vehicle slug per R3.2 / R3.3, and if the
 *   target locale has no translation the page resolver 404s and metadata
 *   is ignored.
 * - `seoTitle` / `seoDescription` come from the narrative frontmatter when
 *   available, falling back to a concise generated phrase so the metadata
 *   still satisfies R6.7 length budgets when narrative is missing.
 * - `og.pageType = "vehicle"` drives the OG image variant.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; vehicle: string }>;
}): Promise<Metadata> {
  const { locale, vehicle: rawSlug } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const slug = normalizeSlug(rawSlug);
  if (!isValidSlug(slug)) {
    notFound();
  }

  const { getVehicle } = await import("@/lib/content");
  const vehicle = await getVehicle(slug, locale);
  if (vehicle === null || !vehicle.active) {
    notFound();
  }

  const isId = locale === "id";
  const fallbackTitle = isId
    ? `Sewa ${vehicle.displayName} dengan Supir | Arasya`
    : `${vehicle.displayName} Chauffeur Rental | Arasya`;
  const fallbackDescription = isId
    ? `Sewa ${vehicle.displayName} dengan supir profesional. ${vehicle.seats} kursi, ${vehicle.luggage} bagasi. Hubungi Arasya untuk penawaran.`
    : `Rent a ${vehicle.displayName} with a professional chauffeur. ${vehicle.seats} seats, ${vehicle.luggage} bags. Contact Arasya for a quote.`;

  const seoTitle =
    vehicle.narrative?.frontmatter.seoTitle ?? fallbackTitle;
  const seoDescription =
    vehicle.narrative?.frontmatter.seoDescription ?? fallbackDescription;

  return buildMetadata({
    locale,
    pathForLocale: vehicleSlugPath(locale, vehicle.slug),
    alternates: {
      id: vehicleSlugPath("id", vehicle.slug),
      en: vehicleSlugPath("en", vehicle.slug),
    },
    seoTitle,
    seoDescription,
    og: {
      pageType: "vehicle",
      title: vehicle.displayName,
      subtitle:
        vehicle.narrative?.frontmatter.heroSubheadline ?? fallbackDescription,
    },
  });
}

// `staticPath` is intentionally not used here — the vehicle detail page
// always canonicalizes to its own `vehicleSlugPath` URL. The listing-path
// helper is referenced by the listing route (`page.tsx`) and by
// `VehicleTemplate` for the breadcrumb ancestor link.
