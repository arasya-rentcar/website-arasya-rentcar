import type { Metadata } from "next";
import { notFound } from "next/navigation";

import ContactTemplate from "@/components/templates/ContactTemplate";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { staticPath } from "@/lib/i18n/slugMap";
import { buildMetadata } from "@/lib/seo/metadata";

/**
 * Bahasa Indonesia Contact route — `/kontak` (task 7.16, design §9).
 *
 * R3.2 puts the Indonesian contact page at the locale-specific slug
 * `kontak`, while R3.3 puts the English mirror at `/en/contact`. The two
 * slugs are not interchangeable: `/en/kontak` is not a valid URL in this
 * site's IA. Because the App Router resolves both routes through the
 * shared `app/[locale]/...` segment, we explicitly guard this file to
 * `id` and emit the same `notFound()` for any other locale value so the
 * `/en/kontak` URL is never served (the English locale uses
 * `app/[locale]/contact/page.tsx` instead).
 *
 * `ContactTemplate` is a Server Component (no client-side JavaScript) so
 * the R13.5 anti-fraud notice ships in the initial HTML without waiting
 * on hydration.
 *
 * ISR (R5.10): `revalidate = 3600` matches the cadence applied to every
 * programmatic route in Phase 7. `dynamicParams = true` is a no-op for
 * this static route but kept for parity with sibling pages.
 */

/** R5.10 — 1 hour ISR window. */
export const revalidate = 3600;

/** R5.10 — parity with sibling programmatic routes. */
export const dynamicParams = true;

/**
 * Restrict pre-rendering to the Indonesian locale only. The English
 * mirror lives at `app/[locale]/contact/page.tsx` and pre-renders the
 * `en` segment from there, so emitting `id` here keeps each route file
 * the single source of truth for its own slug.
 */
export function generateStaticParams(): { locale: string }[] {
  return [{ locale: "id" }];
}

export default async function KontakPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // R3.2 / R3.3: `/kontak` is the Indonesian-only slug. `/en/kontak`
  // must 404 so the canonical English URL `/en/contact` is the only
  // entry point for English users.
  if (locale !== "id") {
    notFound();
  }

  const dict = await getDictionary("id");

  return <ContactTemplate locale="id" dict={dict} />;
}

/**
 * Build Next.js `Metadata` for the Indonesian contact route (R7.1).
 *
 * Alternates emit both locale URLs (`/kontak` and `/en/contact`) so
 * `hreflangAlternates` produces the full `id-ID` / `en` / `x-default`
 * triple required by R4.3. `pathForLocale` is the active-locale URL
 * and becomes the canonical link (R6.8).
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (locale !== "id") {
    notFound();
  }

  return buildMetadata({
    locale: "id",
    pathForLocale: staticPath("id", "contact"),
    alternates: {
      id: staticPath("id", "contact"),
      en: staticPath("en", "contact"),
    },
    seoTitle: "Kontak Arasya Rentcar - Sewa Mobil dengan Supir",
    seoDescription:
      "Hubungi admin resmi Arasya Rentcar via WhatsApp untuk reservasi sewa mobil dengan supir profesional. Respons cepat, harga transparan.",
    og: { pageType: "article" },
  });
}
