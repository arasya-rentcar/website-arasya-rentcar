import type { Metadata } from "next";
import { notFound } from "next/navigation";

import VehicleCatalogGrid from "@/components/fleet/VehicleCatalogGrid";
import { isLocale } from "@/lib/i18n/getDictionary";
import { staticPath } from "@/lib/i18n/slugMap";
import { buildMetadata } from "@/lib/seo/metadata";

/**
 * Vehicle listing route for the English locale — `/en/fleet`
 * (task 7.12, design §9).
 *
 * Mirror of `app/[locale]/armada/page.tsx`. The two files duplicate their
 * bodies because Next.js routes them through distinct `[locale]` path
 * segments (`/armada` vs `/fleet`) that cannot be collapsed into a shared
 * dynamic route without losing the R3.2 / R3.3 URL contract. Every
 * non-trivial string flows from `isLocale`-checked `locale`, so the only
 * divergence between the two files is the route segment itself.
 */

/** R5.10 — 1 hour ISR window. */
export const revalidate = 3600;

/** R5.10 — let new vehicles render at request time. */
export const dynamicParams = true;

/**
 * Pre-render only the English locale here. The Bahasa Indonesia mirror
 * lives at `app/[locale]/armada/page.tsx` and pre-renders the `id`
 * segment from there per R3.2 — keeping each route file as the single
 * source of truth for its own static segment.
 */
export function generateStaticParams(): { locale: string }[] {
  return [{ locale: "en" }];
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

/** See `app/[locale]/armada/page.tsx#generateMetadata` for the full rationale. */
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
