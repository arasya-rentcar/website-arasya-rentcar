import type { Metadata } from "next";
import { notFound } from "next/navigation";

import VehicleCatalogGrid from "@/components/fleet/VehicleCatalogGrid";
import { isLocale } from "@/lib/i18n/getDictionary";
import { staticPath } from "@/lib/i18n/slugMap";
import { buildMetadata } from "@/lib/seo/metadata";

/**
 * Vehicle listing route for the Bahasa Indonesia locale — `/armada`
 * (task 7.12, design §9).
 *
 * Renders the full static {@link VEHICLE_CATALOG} grouped by category
 * (MPV, Premium, Van). The English mirror is `/en/fleet` — kept
 * byte-for-byte equivalent aside from the route segment and metadata.
 *
 * The previous implementation pulled vehicle rows from the structured
 * loader and only rendered the two seeded entries (`innova`, `hiace`).
 * The catalog is decoupled from the DB so every car the operator owns is
 * visible immediately; cards whose catalog entry maps to a real DB slug
 * link to the detail page, the rest open a WhatsApp inquiry CTA.
 *
 * ISR (R5.10): `revalidate = 3600` matches the cadence applied to every
 * programmatic route in Phase 7. `dynamicParams = true` leaves room for
 * runtime-added vehicles to render without a rebuild.
 */

/** R5.10 — 1 hour ISR window. */
export const revalidate = 3600;

/** R5.10 — let new vehicles render at request time. */
export const dynamicParams = true;

/**
 * Pre-render only the Bahasa Indonesia locale here. The English mirror
 * lives at `app/[locale]/fleet/page.tsx` and pre-renders the `en`
 * segment from there per R3.3 — keeping each route file as the single
 * source of truth for its own static segment.
 */
export function generateStaticParams(): { locale: string }[] {
  return [{ locale: "id" }];
}

export default async function VehicleListingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const isId = locale === "id";
  const heading = isId ? "Armada" : "Fleet";
  const subheading = isId
    ? "Pilihan kendaraan dengan supir profesional. Setiap mobil termasuk supir, BBM, dan perawatan."
    : "Chauffeur-driven vehicle options. Every car includes the driver, fuel, and maintenance.";

  return (
    <main>
      <section className="container mx-auto px-4 py-12 md:py-16">
        <div className="mx-auto mb-10 max-w-3xl text-center md:text-left">
          <h1 className="mb-3 text-3xl font-bold tracking-tight md:text-4xl">
            {heading}
          </h1>
          <p className="text-base text-[var(--muted-foreground)] md:text-lg">
            {subheading}
          </p>
        </div>
        <VehicleCatalogGrid locale={locale} />
      </section>
    </main>
  );
}

/**
 * Build Next.js `Metadata` for the locale vehicle listing (R7.1).
 *
 * Alternates are the two locale listing URLs (`/armada` and `/en/fleet`),
 * so we emit both so `hreflangAlternates` produces the full `id-ID` / `en`
 * / `x-default` triple required by R4.3.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const isId = locale === "id";
  return buildMetadata({
    locale,
    pathForLocale: staticPath(locale, "vehicleListing"),
    alternates: {
      id: staticPath("id", "vehicleListing"),
      en: staticPath("en", "vehicleListing"),
    },
    seoTitle: isId
      ? "Armada - Sewa Mobil dengan Supir | Arasya"
      : "Fleet - Chauffeur Car Rental | Arasya",
    seoDescription: isId
      ? "Armada kendaraan Arasya dengan supir profesional untuk perjalanan bisnis, keluarga, dan transfer bandara."
      : "Arasya fleet with professional chauffeurs for business, family, and airport transfers.",
    og: { pageType: "vehicle" },
  });
}
