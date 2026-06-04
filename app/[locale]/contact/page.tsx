import type { Metadata } from "next";
import { notFound } from "next/navigation";

import ContactTemplate from "@/components/templates/ContactTemplate";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { staticPath } from "@/lib/i18n/slugMap";
import { buildMetadata } from "@/lib/seo/metadata";

/**
 * English Contact route — `/en/contact` (task 7.16, design §9).
 *
 * Mirror of `app/[locale]/kontak/page.tsx`. R3.2 / R3.3 put the contact
 * page at locale-specific slugs (`kontak` for id, `contact` for en) so
 * each locale has its own route file. This file is guarded to `en` and
 * emits `notFound()` for any other locale value so the `/contact` URL
 * (without the `/en` prefix) never resolves to the English template.
 *
 * `ContactTemplate` is a Server Component (no client-side JavaScript)
 * so the R13.5 anti-fraud notice is part of the initial HTML payload.
 *
 * ISR (R5.10): `revalidate = 3600`, matching Phase 7 sibling routes.
 */

/** R5.10 — 1 hour ISR window. */
export const revalidate = 3600;

/** R5.10 — parity with sibling programmatic routes. */
export const dynamicParams = true;

/**
 * Pre-render the English locale only. The Indonesian mirror handles the
 * `id` segment from `app/[locale]/kontak/page.tsx`.
 */
export function generateStaticParams(): { locale: string }[] {
  return [{ locale: "en" }];
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // R3.2 / R3.3: `/en/contact` is the English-only canonical URL. The
  // `/contact` URL (resolved as locale `id` here) must 404 so the
  // Indonesian audience reaches the page exclusively via `/kontak`.
  if (locale !== "en") {
    notFound();
  }

  const dict = await getDictionary("en");

  return <ContactTemplate locale="en" dict={dict} />;
}

/**
 * Build Next.js `Metadata` for the English contact route (R7.1).
 *
 * Alternates emit both locale URLs so `hreflangAlternates` produces the
 * full `id-ID` / `en` / `x-default` triple (R4.3). `pathForLocale`
 * becomes the canonical link (R6.8).
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (locale !== "en") {
    notFound();
  }

  return buildMetadata({
    locale: "en",
    pathForLocale: staticPath("en", "contact"),
    alternates: {
      id: staticPath("id", "contact"),
      en: staticPath("en", "contact"),
    },
    seoTitle: "Contact Arasya Rentcar - Chauffeur Car Rental",
    seoDescription:
      "Reach the official Arasya Rentcar admin on WhatsApp to book a chauffeur car rental. Fast response, transparent pricing, professional drivers.",
    og: { pageType: "article" },
  });
}
