import type { Metadata } from "next";
import { notFound } from "next/navigation";

import HomeTemplate from "@/components/templates/HomeTemplate";
import { getCities } from "@/lib/content";
import { getDictionary, isLocale } from "@/lib/i18n/getDictionary";
import { buildMetadata } from "@/lib/seo/metadata";

/**
 * Locale-scoped homepage route (task 7.5).
 *
 * Serves `/` (id) and `/en` with a server-rendered `HomeTemplate`.
 * Structured + narrative data flows through the Content_Layer
 * (`getCities`, R17.4) and locale copy through `getDictionary` (R4.1).
 * The two fetches are independent so we run them in parallel to minimize
 * the critical path (R16.2).
 *
 * ISR (R5.10): `revalidate = 3600` keeps the homepage on a one-hour
 * regeneration cadence, matched across every programmatic route in
 * Phase 7. `dynamicParams = true` leaves room for runtime parameterized
 * variants without requiring a rebuild.
 */

/** R5.10 ISR budget (1 hour). */
export const revalidate = 3600;

/** R5.10 allows unknown dynamic params to ISR at request time. */
export const dynamicParams = true;

/**
 * Pre-generate both locale homepages at build time. The homepage exists
 * for every supported locale (`/` for id, `/en` for en); returning the
 * static set here lets Next.js pre-render both variants without falling
 * back to on-demand rendering.
 */
export function generateStaticParams(): { locale: string }[] {
  return [{ locale: "id" }, { locale: "en" }];
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const [dict, cities] = await Promise.all([getDictionary(locale), getCities(locale)]);

  return <HomeTemplate locale={locale} dict={dict} cities={cities} />;
}

/**
 * Build Next.js `Metadata` for the locale homepage (R7.1).
 *
 * Homepage alternates are always the two locale roots (`/` and `/en`), so
 * we emit both so `hreflangAlternates` produces the full three-way
 * `id-ID` / `en` / `x-default` triple required by R4.3. `seoTitle` and
 * `seoDescription` reuse the hero headline and subheadline from the
 * dictionary, which the Phase 12 content lints already validate for
 * forbidden phrases and for the R6.7 length budgets.
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

  const dict = await getDictionary(locale);

  return buildMetadata({
    locale,
    pathForLocale: locale === "id" ? "/" : "/en",
    alternates: { id: "/", en: "/en" },
    seoTitle: dict.home.hero.headline,
    seoDescription: dict.home.hero.subheadline,
    og: { pageType: "homepage" },
  });
}
