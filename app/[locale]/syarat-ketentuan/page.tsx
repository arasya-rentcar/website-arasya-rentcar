import type { Metadata } from "next";
import { notFound } from "next/navigation";

import StaticTemplate from "@/components/templates/StaticTemplate";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { staticPath } from "@/lib/i18n/slugMap";
import { buildMetadata } from "@/lib/seo/metadata";

/**
 * Bahasa Indonesia Terms route — `/syarat-ketentuan` (task 7.17,
 * design §9).
 *
 * R3.2 puts the Indonesian terms page at `syarat-ketentuan`, while R3.3
 * puts the English mirror at `/en/terms`. The two slugs are not
 * interchangeable, so this file is guarded to `id` and emits
 * `notFound()` for any other locale value — `/en/syarat-ketentuan` must
 * never resolve.
 *
 * Phase 15 task 15.4 will swap the inline placeholder body for a
 * compiled MDX module from `content/static/id/terms.mdx`.
 */

/** R5.10 — 1 hour ISR window. */
export const revalidate = 3600;

/** R5.10 — parity with sibling programmatic routes. */
export const dynamicParams = true;

/**
 * Pre-render the Indonesian locale only. The English mirror handles the
 * `en` segment from `app/[locale]/terms/page.tsx`.
 */
export function generateStaticParams(): { locale: string }[] {
  return [{ locale: "id" }];
}

export default async function SyaratKetentuanPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // R3.2 / R3.3: `/syarat-ketentuan` is the Indonesian-only slug.
  if (locale !== "id") {
    notFound();
  }

  const dict = await getDictionary("id");

  // Inline placeholder body. Phase 15 task 15.4 swaps this for the
  // compiled MDX from `content/static/id/terms.mdx`.
  const bodyMdx = (
    <>
      <p>
        Halaman syarat dan ketentuan resmi Arasya Rentcar sedang
        disiapkan. Sementara dokumen lengkap belum dipublikasikan,
        layanan tetap diatur oleh ketentuan dasar berikut.
      </p>
      <ul>
        <li>
          Layanan selalu mencakup supir profesional dengan armada yang
          dirawat berkala.
        </li>
        <li>
          Reservasi dikonfirmasi melalui nomor WhatsApp admin resmi yang
          tertera pada situs ini.
        </li>
        <li>
          Dokumen syarat dan ketentuan lengkap akan dipublikasikan pada
          fase konten berikutnya.
        </li>
      </ul>
    </>
  );

  return (
    <StaticTemplate
      locale="id"
      title="Syarat dan Ketentuan"
      description="Syarat dan ketentuan layanan sewa mobil dengan supir Arasya Rentcar."
      bodyMdx={bodyMdx}
      breadcrumbCurrentLabel="Syarat & Ketentuan"
      breadcrumbCurrentPath={staticPath("id", "terms")}
      dict={dict}
    />
  );
}

/**
 * Build Next.js `Metadata` for the Indonesian terms page (R7.1).
 *
 * Alternates emit both locale URLs (`/syarat-ketentuan` and `/en/terms`)
 * so `hreflangAlternates` produces the full `id-ID` / `en` / `x-default`
 * triple required by R4.3.
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
    pathForLocale: staticPath("id", "terms"),
    alternates: {
      id: staticPath("id", "terms"),
      en: staticPath("en", "terms"),
    },
    seoTitle: "Syarat dan Ketentuan | Arasya Rentcar",
    seoDescription:
      "Syarat dan ketentuan layanan sewa mobil dengan supir profesional Arasya Rentcar untuk reservasi melalui WhatsApp admin resmi.",
    og: { pageType: "article" },
  });
}
