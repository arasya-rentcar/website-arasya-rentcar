import type { Metadata } from "next";
import { notFound } from "next/navigation";

import BookingTemplate from "@/components/templates/BookingTemplate";
import { getDictionary, isLocale } from "@/lib/i18n/getDictionary";
import { staticPath } from "@/lib/i18n/slugMap";
import { buildMetadata } from "@/lib/seo/metadata";

/**
 * Booking page route (task 7.15).
 *
 * Serves `/booking` (id) and `/en/booking` with a server-rendered
 * `BookingTemplate`. The template renders the structural surface
 * (hero, placeholder card, trust signals, anti-fraud notice, CTA band);
 * Phase 8 (tasks 8.3 / 8.17) introduces the client `<BookingForm>` and
 * mounts it inside the placeholder card without changing the section
 * order.
 *
 * ISR (R5.10): `revalidate = 3600` keeps the booking page on the same
 * one-hour regeneration cadence as every other Phase 7 route. The
 * booking page is fully static today and `dynamicParams = true` is
 * preserved for uniformity with the rest of the locale-scoped pages.
 *
 * Metadata (R7.1): emitted via `buildMetadata` so the canonical URL,
 * hreflang alternates (`id` + `en`), Open Graph image, and robots
 * directives all share the same builder used by the homepage and the
 * programmatic city / vehicle / service pages.
 */

/** R5.10 ISR budget (1 hour). */
export const revalidate = 3600;

/** R5.10 allows unknown dynamic params to ISR at request time. */
export const dynamicParams = true;

/**
 * The booking page is locale-scoped and exists for every supported
 * locale. Returning the static set here lets Next.js pre-render both
 * variants at build time without falling back to on-demand rendering.
 */
export function generateStaticParams(): Array<{ locale: string }> {
  return [{ locale: "id" }, { locale: "en" }];
}

export default async function BookingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const dict = await getDictionary(locale);

  return <BookingTemplate locale={locale} dict={dict} />;
}

/**
 * Build Next.js `Metadata` for the booking page (R7.1).
 *
 * Both locales render a booking page so the alternates map carries both
 * entries; `hreflangAlternates` produces the full `id-ID` / `en` /
 * `x-default` triple required by R4.3. Title and description are
 * locale-aware booking-intent copy; OG `pageType` is `"article"`
 * because the booking page does not yet have a dedicated OG type slot.
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
    ? "Booking Sewa Mobil dengan Supir | Arasya Rentcar"
    : "Book a Chauffeur Car Rental | Arasya Rentcar";
  const seoDescription = isId
    ? "Pesan layanan sewa mobil dengan supir profesional di Arasya Rentcar. Konfirmasi reservasi via WhatsApp admin resmi dengan harga transparan."
    : "Book a chauffeur car rental with Arasya Rentcar. Reservations are confirmed via the official admin WhatsApp with transparent pricing.";

  return buildMetadata({
    locale,
    pathForLocale: staticPath(locale, "booking"),
    alternates: {
      id: staticPath("id", "booking"),
      en: staticPath("en", "booking"),
    },
    seoTitle,
    seoDescription,
    og: { pageType: "article" },
  });
}
