import type { Metadata } from "next";
import { notFound } from "next/navigation";

import StaticTemplate from "@/components/templates/StaticTemplate";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { staticPath } from "@/lib/i18n/slugMap";
import { buildMetadata } from "@/lib/seo/metadata";

/**
 * English Privacy Policy route — `/en/privacy` (task 7.17, design §9).
 *
 * Mirror of `app/[locale]/kebijakan-privasi/page.tsx`. R3.2 / R3.3 put
 * the privacy page at locale-specific slugs (`kebijakan-privasi` for
 * id, `privacy` for en) so each locale has its own route file. This
 * file is guarded to `en` and emits `notFound()` for any other locale
 * value so the bare `/privacy` URL never serves the English template.
 *
 * Phase 15 task 15.5 will swap the inline placeholder body for a
 * compiled MDX module from `content/static/en/privacy.mdx` that
 * documents the 180-day retention window and the deletion-request
 * channel required by R19.2.
 */

/** R5.10 — 1 hour ISR window. */
export const revalidate = 3600;

/** R5.10 — parity with sibling programmatic routes. */
export const dynamicParams = true;

/**
 * Pre-render the English locale only. The Indonesian mirror handles the
 * `id` segment from `app/[locale]/kebijakan-privasi/page.tsx`.
 */
export function generateStaticParams(): { locale: string }[] {
  return [{ locale: "en" }];
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // R3.2 / R3.3: `/en/privacy` is the English-only canonical URL.
  if (locale !== "en") {
    notFound();
  }

  const dict = await getDictionary("en");

  // Inline placeholder body. Phase 15 task 15.5 swaps this for the
  // compiled MDX from `content/static/en/privacy.mdx` (R19.2).
  const bodyMdx = (
    <>
      <p>
        The full Arasya Rentcar privacy policy is being prepared. While
        the long-form document is being finalised, the baseline
        principles governing how your data is handled are listed below.
      </p>
      <ul>
        <li>
          Booking form data (name and WhatsApp number) is used only to
          process your request.
        </li>
        <li>
          Booking data is retained for at most 180 days, after which it
          is deleted or anonymised.
        </li>
        <li>
          Deletion requests can be sent to the official admin via the
          WhatsApp number listed on this site.
        </li>
      </ul>
    </>
  );

  return (
    <StaticTemplate
      locale="en"
      title="Privacy Policy"
      description="Privacy policy for data processing at Arasya Rentcar."
      bodyMdx={bodyMdx}
      breadcrumbCurrentLabel="Privacy"
      breadcrumbCurrentPath={staticPath("en", "privacy")}
      dict={dict}
    />
  );
}

/**
 * Build Next.js `Metadata` for the English privacy page (R7.1).
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
    pathForLocale: staticPath("en", "privacy"),
    alternates: {
      id: staticPath("id", "privacy"),
      en: staticPath("en", "privacy"),
    },
    seoTitle: "Privacy Policy | Arasya Rentcar",
    seoDescription:
      "Arasya Rentcar privacy policy covering chauffeur car rental booking data processing, retention, and deletion request channels.",
    og: { pageType: "article" },
  });
}
