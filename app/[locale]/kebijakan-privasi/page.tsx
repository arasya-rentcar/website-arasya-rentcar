import type { Metadata } from "next";
import { notFound } from "next/navigation";

import StaticTemplate from "@/components/templates/StaticTemplate";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { staticPath } from "@/lib/i18n/slugMap";
import { buildMetadata } from "@/lib/seo/metadata";

/**
 * Bahasa Indonesia Privacy Policy route — `/kebijakan-privasi`
 * (task 7.17, design §9).
 *
 * R3.2 puts the Indonesian privacy page at `kebijakan-privasi`, while
 * R3.3 puts the English mirror at `/en/privacy`. The two slugs are not
 * interchangeable, so this file is guarded to `id` and emits
 * `notFound()` for any other locale value.
 *
 * Phase 15 task 15.5 will swap the inline placeholder body for a
 * compiled MDX module from `content/static/id/privacy.mdx` that
 * documents the 180-day retention window and the deletion-request
 * channel required by R19.2.
 */

/** R5.10 — 1 hour ISR window. */
export const revalidate = 3600;

/** R5.10 — parity with sibling programmatic routes. */
export const dynamicParams = true;

/**
 * Pre-render the Indonesian locale only. The English mirror handles the
 * `en` segment from `app/[locale]/privacy/page.tsx`.
 */
export function generateStaticParams(): { locale: string }[] {
  return [{ locale: "id" }];
}

export default async function KebijakanPrivasiPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // R3.2 / R3.3: `/kebijakan-privasi` is the Indonesian-only slug.
  if (locale !== "id") {
    notFound();
  }

  const dict = await getDictionary("id");

  // Inline placeholder body. Phase 15 task 15.5 swaps this for the
  // compiled MDX from `content/static/id/privacy.mdx` (R19.2).
  const bodyMdx = (
    <>
      <p>
        Halaman kebijakan privasi resmi Arasya Rentcar sedang disiapkan.
        Sementara dokumen lengkap belum dipublikasikan, prinsip dasar
        pemrosesan data Anda adalah sebagai berikut.
      </p>
      <ul>
        <li>
          Data formulir reservasi (nama dan nomor WhatsApp) hanya
          digunakan untuk memproses permintaan Anda.
        </li>
        <li>
          Data pemesanan disimpan paling lama 180 hari, kemudian dihapus
          atau dianonimkan.
        </li>
        <li>
          Permintaan penghapusan data dapat dikirim ke admin resmi via
          WhatsApp menggunakan nomor yang tertera di situs ini.
        </li>
      </ul>
    </>
  );

  return (
    <StaticTemplate
      locale="id"
      title="Kebijakan Privasi"
      description="Kebijakan privasi pemrosesan data oleh Arasya Rentcar."
      bodyMdx={bodyMdx}
      breadcrumbCurrentLabel="Kebijakan Privasi"
      breadcrumbCurrentPath={staticPath("id", "privacy")}
      dict={dict}
    />
  );
}

/**
 * Build Next.js `Metadata` for the Indonesian privacy page (R7.1).
 *
 * Alternates emit both locale URLs (`/kebijakan-privasi` and
 * `/en/privacy`) so `hreflangAlternates` produces the full `id-ID` /
 * `en` / `x-default` triple required by R4.3.
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
    pathForLocale: staticPath("id", "privacy"),
    alternates: {
      id: staticPath("id", "privacy"),
      en: staticPath("en", "privacy"),
    },
    seoTitle: "Kebijakan Privasi | Arasya Rentcar",
    seoDescription:
      "Kebijakan privasi Arasya Rentcar yang mengatur pemrosesan data reservasi sewa mobil dengan supir, retensi data, dan saluran permintaan penghapusan.",
    og: { pageType: "article" },
  });
}
