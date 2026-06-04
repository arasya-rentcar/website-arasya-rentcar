import type { Metadata } from "next";
import { notFound } from "next/navigation";

import StaticTemplate from "@/components/templates/StaticTemplate";
import { getDictionary, isLocale } from "@/lib/i18n/getDictionary";
import { staticPath } from "@/lib/i18n/slugMap";
import { buildMetadata } from "@/lib/seo/metadata";

/**
 * FAQ page route — `/faq` (id) and `/en/faq` (en) (task 7.17, design §9).
 *
 * Locale-shared slug: `faq` is identical in both locales per
 * `STATIC_SEGMENTS.faq` in `lib/i18n/slugMap.ts`. A single route file
 * accepts both locales and renders the matching translation, mirroring
 * the booking page (task 7.15).
 *
 * The MDX body is a small inline placeholder for now — Phase 15 task
 * 15.3 populates the real content under
 * `content/static/{locale}/faq.mdx` and this route then loads it via
 * the Content_Layer. Until then, the placeholder gives visitors a
 * sensible page that still routes them to the official WhatsApp admin
 * via the CTA band.
 *
 * ISR (R5.10): `revalidate = 3600` matches every other Phase 7 route.
 */

/** R5.10 — 1 hour ISR window. */
export const revalidate = 3600;

/** R5.10 — parity with sibling programmatic routes. */
export const dynamicParams = true;

/**
 * Pre-render both locale variants at build time.
 */
export function generateStaticParams(): { locale: string }[] {
  return [{ locale: "id" }, { locale: "en" }];
}

export default async function FaqPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const dict = await getDictionary(locale);
  const isId = locale === "id";

  const title = isId
    ? "Pertanyaan yang Sering Diajukan"
    : "Frequently Asked Questions";
  const description = isId
    ? "Jawaban atas pertanyaan umum tentang layanan sewa mobil dengan supir di Arasya Rentcar."
    : "Answers to common questions about Arasya Rentcar's chauffeur car rental service.";
  const breadcrumbCurrentLabel = "FAQ";

  // Inline placeholder body. Phase 15 task 15.3 swaps this for a
  // compiled MDX module from `content/static/{locale}/faq.mdx`.
  const bodyMdx = isId ? (
    <>
      <p>
        Halaman ini sedang disiapkan. Untuk pertanyaan, silakan hubungi
        admin resmi Arasya Rentcar via WhatsApp.
      </p>
      <ul>
        <li>Konten lengkap akan tersedia segera.</li>
        <li>
          Sementara itu, tim admin siap membantu reservasi dan menjawab
          pertanyaan langsung melalui WhatsApp.
        </li>
      </ul>
    </>
  ) : (
    <>
      <p>
        This page is being prepared. For questions, please contact the
        official Arasya Rentcar admin via WhatsApp.
      </p>
      <ul>
        <li>Full content will be available soon.</li>
        <li>
          In the meantime, our admin team is ready to help with bookings
          and answer questions directly on WhatsApp.
        </li>
      </ul>
    </>
  );

  return (
    <StaticTemplate
      locale={locale}
      title={title}
      description={description}
      bodyMdx={bodyMdx}
      breadcrumbCurrentLabel={breadcrumbCurrentLabel}
      breadcrumbCurrentPath={staticPath(locale, "faq")}
      dict={dict}
    />
  );
}

/**
 * Build Next.js `Metadata` for the FAQ page (R7.1).
 *
 * Both locales render an FAQ page so the alternates map carries both
 * entries; `hreflangAlternates` produces the full `id-ID` / `en` /
 * `x-default` triple required by R4.3.
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
  const seoTitle = isId
    ? "FAQ Sewa Mobil dengan Supir | Arasya Rentcar"
    : "Chauffeur Car Rental FAQ | Arasya Rentcar";
  const seoDescription = isId
    ? "Pertanyaan yang sering diajukan tentang layanan sewa mobil dengan supir Arasya Rentcar, mulai dari reservasi hingga konfirmasi via WhatsApp admin resmi."
    : "Frequently asked questions about Arasya Rentcar's chauffeur car rental service, from booking to confirmation via the official admin WhatsApp.";

  return buildMetadata({
    locale,
    pathForLocale: staticPath(locale, "faq"),
    alternates: {
      id: staticPath("id", "faq"),
      en: staticPath("en", "faq"),
    },
    seoTitle,
    seoDescription,
    og: { pageType: "article" },
  });
}
