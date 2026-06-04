import type { Metadata } from "next";
import { notFound } from "next/navigation";

import StaticTemplate from "@/components/templates/StaticTemplate";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { staticPath } from "@/lib/i18n/slugMap";
import { buildMetadata } from "@/lib/seo/metadata";

/**
 * English Terms route — `/en/terms` (task 7.17, design §9).
 *
 * Mirror of `app/[locale]/syarat-ketentuan/page.tsx`. R3.2 / R3.3 put
 * the terms page at locale-specific slugs (`syarat-ketentuan` for id,
 * `terms` for en) so each locale has its own route file. This file is
 * guarded to `en` and emits `notFound()` for any other locale value so
 * the bare `/terms` URL (resolved as locale `id` here) never serves the
 * English template.
 *
 * Phase 15 task 15.4 will swap the inline placeholder body for a
 * compiled MDX module from `content/static/en/terms.mdx`.
 */

/** R5.10 — 1 hour ISR window. */
export const revalidate = 3600;

/** R5.10 — parity with sibling programmatic routes. */
export const dynamicParams = true;

/**
 * Pre-render the English locale only. The Indonesian mirror handles the
 * `id` segment from `app/[locale]/syarat-ketentuan/page.tsx`.
 */
export function generateStaticParams(): { locale: string }[] {
  return [{ locale: "en" }];
}

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // R3.2 / R3.3: `/en/terms` is the English-only canonical URL.
  if (locale !== "en") {
    notFound();
  }

  const dict = await getDictionary("en");

  // Inline placeholder body. Phase 15 task 15.4 swaps this for the
  // compiled MDX from `content/static/en/terms.mdx`.
  const bodyMdx = (
    <>
      <p>
        The full Arasya Rentcar terms and conditions document is being
        prepared. While the long-form policy is being finalised, service
        is governed by the baseline conditions below.
      </p>
      <ul>
        <li>
          Service always includes a professional chauffeur paired with a
          maintained vehicle.
        </li>
        <li>
          Bookings are confirmed via the official admin WhatsApp number
          listed on this site.
        </li>
        <li>
          The complete terms and conditions document will be published
          in the next content phase.
        </li>
      </ul>
    </>
  );

  return (
    <StaticTemplate
      locale="en"
      title="Terms and Conditions"
      description="Terms and conditions for Arasya Rentcar's chauffeur car rental service."
      bodyMdx={bodyMdx}
      breadcrumbCurrentLabel="Terms"
      breadcrumbCurrentPath={staticPath("en", "terms")}
      dict={dict}
    />
  );
}

/**
 * Build Next.js `Metadata` for the English terms page (R7.1).
 *
 * Alternates emit both locale URLs so `hreflangAlternates` produces the
 * full `id-ID` / `en` / `x-default` triple (R4.3).
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
    pathForLocale: staticPath("en", "terms"),
    alternates: {
      id: staticPath("id", "terms"),
      en: staticPath("en", "terms"),
    },
    seoTitle: "Terms and Conditions | Arasya Rentcar",
    seoDescription:
      "Terms and conditions for Arasya Rentcar's professional chauffeur car rental service, with bookings confirmed via the official admin WhatsApp.",
    og: { pageType: "article" },
  });
}
