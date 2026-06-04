import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getArticles } from "@/lib/content";
import { isLocale } from "@/lib/i18n/getDictionary";
import { staticPath } from "@/lib/i18n/slugMap";
import { buildMetadata } from "@/lib/seo/metadata";

/**
 * Blog index route (task 7.14).
 *
 * Serves `/blog` for Bahasa Indonesia and `/en/blog` for English — both
 * locales share the same static segment per R3.2 / R3.3 (the `blog`
 * entry in `STATIC_SEGMENTS` uses the same literal across locales), so
 * this single `[locale]` route handler renders both surfaces without an
 * English mirror directory.
 *
 * ISR (R5.10): `revalidate = 3600` keeps the index on a one-hour
 * regeneration cadence, matched across every programmatic route in
 * Phase 7. `dynamicParams = true` allows newly-added articles to render
 * at request time rather than forcing a redeploy.
 *
 * The index pulls from `getArticles(locale)`, which already sorts by
 * `publishedAt` descending and silently drops articles whose MDX fails
 * frontmatter validation — one malformed draft does not take down the
 * listing (see `lib/content/index.ts`).
 */

/** R5.10 — 1 hour ISR window. */
export const revalidate = 3600;

/** R5.10 — let new articles render at request time. */
export const dynamicParams = true;

/**
 * Pre-generate both locale blog indices at build time. The `/blog`
 * static segment is identical in both locales, but the index itself
 * exists for each locale (`/blog` and `/en/blog`).
 */
export function generateStaticParams(): { locale: string }[] {
  return [{ locale: "id" }, { locale: "en" }];
}

export default async function BlogIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const articles = await getArticles(locale);

  const isId = locale === "id";
  const heading = "Blog";
  const subheading = isId
    ? "Panduan, tips, dan cerita perjalanan dengan supir dari tim Arasya."
    : "Chauffeur travel guides, tips, and field stories from the Arasya team.";
  const emptyState = isId
    ? "Artikel baru akan segera hadir."
    : "New articles are on the way.";

  const blogBasePath = staticPath(locale, "blog");

  return (
    <main>
      <section className="container mx-auto px-4 py-16">
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-[var(--foreground)]">
          {heading}
        </h1>
        <p className="mb-8 text-lg text-[var(--muted-foreground)]">
          {subheading}
        </p>

        {articles.length === 0 ? (
          <p className="text-[var(--muted-foreground)]">{emptyState}</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => {
              const publishedDisplay = new Date(
                article.publishedAt,
              ).toLocaleDateString(isId ? "id-ID" : "en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              });
              return (
                <Link
                  key={article.slug}
                  href={`${blogBasePath}/${article.slug}`}
                  className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
                >
                  <Card className="h-full transition-colors hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]">
                    <CardHeader>
                      <CardTitle className="text-xl">{article.title}</CardTitle>
                      <CardDescription>{publishedDisplay}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-[var(--muted-foreground)]">
                        {article.description}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

/**
 * Build Next.js `Metadata` for the blog index (R7.1).
 *
 * Alternates are the two locale index URLs (`/blog` and `/en/blog`), so
 * we emit both so `hreflangAlternates` produces the full `id-ID` / `en`
 * / `x-default` triple required by R4.3.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const isId = locale === "id";
  return buildMetadata({
    locale,
    pathForLocale: staticPath(locale, "blog"),
    alternates: {
      id: staticPath("id", "blog"),
      en: staticPath("en", "blog"),
    },
    seoTitle: isId
      ? "Blog Arasya - Panduan & Tips Sewa Mobil dengan Supir"
      : "Arasya Blog - Chauffeur Rental Guides & Tips",
    seoDescription: isId
      ? "Panduan sewa mobil dengan supir, tips perjalanan, dan cerita lapangan dari tim Arasya Rentcar."
      : "Chauffeur rental guides, travel tips, and field stories from the Arasya Rentcar team.",
    og: { pageType: "article" },
  });
}
