import type { Metadata } from "next";
import { notFound } from "next/navigation";

import VehicleTemplate from "@/components/templates/VehicleTemplate";
import { isLocale } from "@/lib/i18n/getDictionary";
import { vehicleSlugPath } from "@/lib/i18n/slugMap";
import { resolveVehiclePageData } from "@/lib/routing/vehicleRouteHelper";
import { buildMetadata } from "@/lib/seo/metadata";
import { isValidSlug, normalizeSlug } from "@/lib/validation/slug";

/**
 * Vehicle detail route for the English locale —
 * `/en/fleet/{vehicle-slug}` (task 7.12, design §9, R9.4).
 *
 * Mirror of `app/[locale]/armada/[vehicle]/page.tsx`. The two routes
 * share the same `VehicleTemplate` and the same `resolveVehiclePageData`
 * helper; they only differ in their static URL segment (`armada` vs
 * `fleet`). See the Bahasa route for the full rationale on slug
 * handling, ISR config, and metadata fallbacks.
 */

/** R5.10 — 1 hour ISR window. */
export const revalidate = 3600;

/** R5.10 — let new vehicles ISR without a rebuild. */
export const dynamicParams = true;

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

/** See `app/[locale]/armada/[vehicle]/page.tsx#generateMetadata` for rationale. */
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
