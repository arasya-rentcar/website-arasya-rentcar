import type { Metadata } from "next";
import { notFound } from "next/navigation";

import BlogArticleTemplate from "@/components/templates/BlogArticleTemplate";
import { getArticle, getArticles } from "@/lib/content";
import { getDictionary, isLocale } from "@/lib/i18n/getDictionary";
import { staticPath } from "@/lib/i18n/slugMap";
import { buildMetadata } from "@/lib/seo/metadata";
import { isValidSlug, normalizeSlug } from "@/lib/validation/slug";

/**
 * Blog_Article route (task 7.14).
 *
 * Serves `/blog/{slug}` (id) and `/en/blog/{slug}` (en) per R3.2 / R3.3
 * — the `blog` static segment is identical in both locales, so a single
 * `[locale]/blog/[article]` route handler covers both surfaces.
 *
 * Data flow (R17.4, R17.7): the route depends only on `getArticle` and
 * `getArticles` from the Content_Layer's public API; it never reaches
 * into the narrative or structured submodules directly. The composed
 * `ArticleWithNarrative` carries the pre-compiled MDX body so the
 * template can render without any further data access.
 *
 * Related-article selection (R9.6): pull the locale's full article list,
 * drop the current article by slug, and pass up to 4 summaries to the
 * template. The template enforces the 2–4 floor/cap (R9.10) — it omits
 * the section entirely when fewer than 2 reach it.
 *
 * ISR (R5.10): `revalidate = 3600` keeps every article on a one-hour
 * regeneration cadence, matched across every programmatic route in
 * Phase 7. `dynamicParams = true` lets newly-published articles ISR at
 * request time without forcing a redeploy.
 *
 * Requirements: R3.4, R3.5, R5.10, R7.1, R8.5, R9.6.
 */

/** R5.10 ISR budget (1 hour). */
export const revalidate = 3600;

/** R5.10 allows unknown dynamic params to ISR at request time. */
export const dynamicParams = true;

/** R9.6 related-articles upper bound (the template caps to the same value). */
const RELATED_MAX = 4;

/**
 * Pre-generate the union of published article slugs across both
 * locales. Slugs that exist in only one locale still get pre-rendered
 * for the other locale; the page falls through to `notFound()` at
 * render time when the translation is missing, which is the correct
 * behaviour per R3.5 (404 in the locale of the path prefix).
 */
export async function generateStaticParams(): Promise<
  { locale: string; article: string }[]
> {
  const [idArticles, enArticles] = await Promise.all([
    getArticles("id"),
    getArticles("en"),
  ]);
  return [
    ...idArticles.map((a) => ({ locale: "id", article: a.slug })),
    ...enArticles.map((a) => ({ locale: "en", article: a.slug })),
  ];
}

/**
 * Render the Blog_Article page.
 *
 * The slug is normalised (whitespace-trimmed, ASCII-lowercased) before
 * validation so uppercase or padded segments still resolve to a valid
 * record; the middleware 301 for those forms is tracked separately
 * under task 15.2. A slug that fails R3.4 after normalisation 404s per
 * R3.5.
 */
export default async function BlogArticlePage({
  params,
}: {
  params: Promise<{ locale: string; article: string }>;
}) {
  const { locale, article: rawSlug } = await params;
  if (!isLocale(locale)) notFound();

  const slug = normalizeSlug(rawSlug);
  if (!isValidSlug(slug)) notFound();

  const [article, allArticles, dict] = await Promise.all([
    getArticle(slug, locale),
    getArticles(locale),
    getDictionary(locale),
  ]);
  if (article === null) notFound();

  const relatedArticles = allArticles
    .filter((a) => a.slug !== article.slug)
    .slice(0, RELATED_MAX);

  return (
    <BlogArticleTemplate
      locale={locale}
      article={article}
      relatedArticles={relatedArticles}
      dict={dict}
    />
  );
}

/**
 * Build Next.js `Metadata` for the Blog_Article route (R7.1, R8.5).
 *
 * `seoTitle` and `seoDescription` come from the article's frontmatter
 * (already exposed as `title` / `description` on `ArticleSummary`) so
 * the Phase 12 content-lints — which validate the same frontmatter for
 * R6.7 length budgets and forbidden phrases — are the single source of
 * truth.
 *
 * Alternates (R4.3, R4.4): we look up the slug in BOTH locales and only
 * emit an alternate for a locale where the article actually exists.
 * When the article is single-locale (the common case for an editorial
 * MVP), the missing-locale entry is omitted and `hreflangAlternates`
 * collapses `x-default` onto the existing URL per R4.4.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; article: string }>;
}): Promise<Metadata> {
  const { locale, article: rawSlug } = await params;
  if (!isLocale(locale)) notFound();

  const slug = normalizeSlug(rawSlug);
  if (!isValidSlug(slug)) notFound();

  // Probe both locales so we know which alternates to emit. The active
  // locale's lookup is also what drives `seoTitle` / `seoDescription`
  // below — we re-use the result instead of fetching twice.
  const [idArticle, enArticle] = await Promise.all([
    getArticle(slug, "id"),
    getArticle(slug, "en"),
  ]);
  const article = locale === "id" ? idArticle : enArticle;
  if (article === null) notFound();

  // R4.4: emit each language entry only when that locale has the slug.
  // `buildMetadata` forwards undefined entries to `hreflangAlternates`,
  // which then drops the corresponding `<link>` element entirely.
  const alternates: { id?: string; en?: string } = {};
  if (idArticle !== null) {
    alternates.id = `${staticPath("id", "blog")}/${slug}`;
  }
  if (enArticle !== null) {
    alternates.en = `${staticPath("en", "blog")}/${slug}`;
  }

  return buildMetadata({
    locale,
    pathForLocale: `${staticPath(locale, "blog")}/${slug}`,
    alternates,
    seoTitle: article.title,
    seoDescription: article.description,
    og: { pageType: "article" },
  });
}
