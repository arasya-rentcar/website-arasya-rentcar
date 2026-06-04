import Link from "next/link";

import Breadcrumb from "@/components/seo/Breadcrumb";
import JsonLd from "@/components/seo/JsonLd";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  ArticleSummary,
  ArticleWithNarrative,
  Locale,
} from "@/lib/content";
import type { Dictionary } from "@/lib/i18n/getDictionary";
import { staticPath } from "@/lib/i18n/slugMap";
import { absoluteUrl } from "@/lib/seo/canonical";
import { articleJsonLd } from "@/lib/seo/jsonld";

/**
 * Blog_Article template (R9.6, R8.5, design §9).
 *
 * Server Component — rendered under `app/[locale]/blog/[article]/page.tsx`
 * (task 7.14). The blog surface shares a single URL namespace across both
 * locales per R3.2 / R3.3 (`/blog/{slug}` in Bahasa Indonesia and
 * `/en/blog/{slug}` in English both resolve through the same locale-scoped
 * route handler); this template renders either locale's content without
 * ever reaching back into the Content_Layer — all article data arrives via
 * props (R17.7).
 *
 * Section order (R9.6, verbatim):
 *
 *   1. breadcrumb
 *   2. articleHeader (title + published date + author)
 *   3. coverImage
 *   4. articleBody (MDX-compiled, supports headings + callouts)
 *   5. authorBlock
 *   6. relatedArticles (2 to 4 items)
 *   7. chauffeurOnlyCtaBand (contextual)
 *   8. ctaBand (final)
 *
 * JSON-LD (R8.5): emits a single `Article` block via `<JsonLd>`. The
 * visible breadcrumb already owns its matching `BreadcrumbList` block
 * (R8.4), so we do not emit that here — R8.7 forbids duplicates.
 *
 * Accessibility (R9.10, R15.1):
 *   - Exactly one `<h1>` (the article title).
 *   - Every `<section>` carries `aria-labelledby` pointing at its own
 *     heading.
 *
 * Pure presentation: no data access, no environment reads, no hooks.
 */

export interface BlogArticleTemplateProps {
  readonly locale: Locale;
  readonly article: ArticleWithNarrative;
  /**
   * 2 to 4 related article summaries. The route handler is responsible
   * for filtering, deduplication, and cap enforcement — the template
   * renders whatever it receives (and the R9.10 "omit rather than render
   * a partial section" rule applies when the list is empty).
   */
  readonly relatedArticles: readonly ArticleSummary[];
  readonly dict: Pick<Dictionary, "cta" | "common" | "meta">;
}

/**
 * Placeholder WhatsApp target used by the two CTA bands. The real
 * `ARASYA_WHATSAPP_NUMBER` is wired in via the WhatsApp_Handler helper
 * in a later phase (design §20); the placeholder keeps the template
 * renderable today without masquerading as a live number.
 *
 * TODO(phase 13): replace with the shared WhatsApp_Handler invocation.
 */
const WHATSAPP_PLACEHOLDER_HREF = "https://wa.me/628123456789";

/** R9.6 related-articles upper bound. */
const RELATED_MAX = 4;

/** R9.6 related-articles lower bound. */
const RELATED_MIN = 2;

/**
 * Render the Blog_Article template.
 */
export default function BlogArticleTemplate({
  locale,
  article,
  relatedArticles,
  dict,
}: BlogArticleTemplateProps): React.JSX.Element {
  const isId = locale === "id";

  // Locale-scoped labels. Not part of the `Pick<Dictionary, ...>` surface
  // the template accepts, so inlined here. A future `blog.*` dictionary
  // namespace would be the natural migration target.
  const homeLabel = isId ? "Beranda" : "Home";
  const homePath = isId ? "/" : "/en";
  const blogLabel = "Blog";
  const authorHeading = isId ? "Tentang penulis" : "About the author";
  const relatedHeading = isId ? "Artikel terkait" : "Related articles";
  const chauffeurCtaHeading = isId
    ? `Butuh layanan ${dict.common.chauffeurOnlyPhrase}?`
    : `Need ${dict.common.chauffeurOnlyPhrase}?`;
  const chauffeurCtaBody = isId
    ? "Reservasi cepat lewat WhatsApp admin resmi kami dengan tarif transparan dan supir profesional."
    : "Quick bookings via our official admin WhatsApp with transparent rates and professional chauffeurs.";
  const finalCtaHeading = isId ? "Siap memesan?" : "Ready to book?";

  // Self-path for JSON-LD `@id` and breadcrumb `currentPath`. Centralized
  // so the two cannot drift.
  const blogIndexPath = staticPath(locale, "blog");
  const articleSelfPath = `${blogIndexPath}/${article.slug}`;

  // Primary booking CTA target — locale-aware booking surface.
  const bookingHref = staticPath(locale, "booking");

  // Narrative-derived fields. `narrative` is non-null on this shape per
  // `ArticleWithNarrative`; we still access through the object to keep
  // the MDX body rendering honest.
  const narrative = article.narrative;
  const authorName = narrative.frontmatter.author;
  const datePublishedIso = narrative.frontmatter.publishedAt;
  const dateModifiedIso = narrative.frontmatter.updatedAt;

  // Published-date rendering (R9.6 criterion: "article header with title
  // and published date"). The date is already an ISO-8601 string by
  // `articleFm`; rendering through `Date` → `toLocaleDateString` is safe
  // because the server and Vercel edge runtimes both support the `id-ID`
  // and `en-US` Intl data by default.
  const publishedAtDisplay = new Date(datePublishedIso).toLocaleDateString(
    isId ? "id-ID" : "en-US",
    { year: "numeric", month: "long", day: "numeric" },
  );

  // Cover image. TODO: swap for a real hero image once the article-asset
  // pipeline lands; using `/api/og` keeps every article showing a branded
  // 1200×630 placeholder so the template stays visually complete.
  const coverImageQuery = new URLSearchParams({
    pageType: "article",
    title: article.title,
    subtitle: "",
    locale,
  }).toString();
  const coverImageUrl = `/api/og?${coverImageQuery}`;

  // R9.6 related-articles: cap to 4 and omit the section when fewer than
  // 2 are available (R9.10).
  const relatedRendered = relatedArticles.slice(0, RELATED_MAX);
  const showRelated = relatedRendered.length >= RELATED_MIN;

  // R8.5 Article JSON-LD. `publisherLogoUrl` is a TODO placeholder — the
  // real brand logo lands with the asset pipeline in a later phase.
  const articleBlock = articleJsonLd({
    articleSlug: article.slug,
    title: article.title,
    description: article.description,
    image: absoluteUrl(coverImageUrl),
    authorName,
    publisherName: "Arasya Rentcar",
    // TODO(assets): replace with the final hosted logo URL.
    publisherLogoUrl: absoluteUrl("/logo.png"),
    datePublished: datePublishedIso,
    dateModified: dateModifiedIso,
    sourcePath: articleSelfPath,
    locale,
  });

  return (
    <div className="flex flex-col">
      {/*
       * 1. Breadcrumb (R9.6, R8.4). The visible trail is
       *    `Home › Blog › {title}`; `<Breadcrumb>` emits the matching
       *    `BreadcrumbList` JSON-LD so the two stay in lock-step.
       */}
      <div className="container mx-auto px-4 pt-6">
        <Breadcrumb
          items={[
            { name: homeLabel, path: homePath },
            { name: blogLabel, path: blogIndexPath },
          ]}
          currentLabel={article.title}
          currentPath={articleSelfPath}
        />
      </div>

      {/*
       * 2. Article header — title + published date + author byline.
       *    The `<time>` element carries the raw ISO string so crawlers
       *    and assistive tech get the machine-readable form even while
       *    the visible text uses the locale-formatted date.
       */}
      <section
        aria-labelledby="article-header-heading"
        className="container mx-auto px-4 py-12 md:py-16"
      >
        <div className="mx-auto max-w-3xl">
          <h1
            id="article-header-heading"
            className="text-4xl font-bold tracking-tight text-[var(--foreground)] md:text-5xl"
          >
            {article.title}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--muted-foreground)]">
            <time dateTime={datePublishedIso}>{publishedAtDisplay}</time>
            <span aria-hidden="true">·</span>
            <span>{authorName}</span>
          </div>
        </div>
      </section>

      {/*
       * 3. Cover image. Rendered with a plain `<img>` because the OG
       *    endpoint returns a fully-pre-sized 1200×630 PNG and we want
       *    the image up in the HTML stream without Next/Image's client
       *    hydration tax on a Server Component template.
       *
       *    TODO(assets): swap the `/api/og` placeholder for the real
       *    editorial image once the article-asset pipeline ships.
       */}
      <section
        aria-labelledby="article-cover-heading"
        className="container mx-auto px-4"
      >
        <h2 id="article-cover-heading" className="sr-only">
          {article.title}
        </h2>
        <div className="mx-auto max-w-4xl overflow-hidden rounded-xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverImageUrl}
            alt=""
            width={1200}
            height={630}
            className="h-auto w-full"
          />
        </div>
      </section>

      {/*
       * 4. Article body. `narrative.body` is a pre-compiled React element
       *    produced by `compileMdxToReact` — the MDX allowlist already
       *    restricts the tag set to the approved components (Callout,
       *    Tip, etc.), so we can drop the rendered tree straight into a
       *    `prose` container and let typography styles take over.
       */}
      <section
        aria-labelledby="article-body-heading"
        className="container mx-auto px-4 py-12"
      >
        <h2 id="article-body-heading" className="sr-only">
          {isId ? "Isi artikel" : "Article body"}
        </h2>
        <div className="mx-auto max-w-3xl">
          <div className="prose prose-neutral dark:prose-invert max-w-none">
            {narrative.body}
          </div>
        </div>
      </section>

      {/*
       * 5. Author block. The MVP runs a single editorial voice ("Tim
       *    Arasya" / "The Arasya Team") so the card is deliberately
       *    minimal — no avatar, no bio paragraph yet. The name comes
       *    from frontmatter so a future per-author byline swap-in
       *    requires no template change.
       */}
      <section
        aria-labelledby="article-author-heading"
        className="container mx-auto px-4 py-12"
      >
        <div className="mx-auto max-w-3xl">
          <Card>
            <CardHeader>
              <CardTitle id="article-author-heading" className="text-xl">
                {authorHeading}
              </CardTitle>
              <CardDescription>{authorName}</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/*
       * 6. Related articles (2 to 4). Cards link through the locale's
       *    blog index so the slug map stays the single source of truth
       *    for URL construction. Omitted entirely when fewer than 2
       *    related articles reach the template (R9.10).
       */}
      {showRelated ? (
        <section
          aria-labelledby="article-related-heading"
          className="container mx-auto px-4 py-12"
        >
          <div className="mx-auto max-w-5xl">
            <h2
              id="article-related-heading"
              className="mb-6 text-2xl font-bold tracking-tight text-[var(--foreground)] md:text-3xl"
            >
              {relatedHeading}
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedRendered.map((related) => {
                const relatedDate = new Date(
                  related.publishedAt,
                ).toLocaleDateString(isId ? "id-ID" : "en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                });
                return (
                  <Link
                    key={related.slug}
                    href={`${blogIndexPath}/${related.slug}`}
                    className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
                  >
                    <Card className="h-full transition-colors hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]">
                      <CardHeader>
                        <CardTitle className="text-lg">
                          {related.title}
                        </CardTitle>
                        <CardDescription>{relatedDate}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-[var(--muted-foreground)]">
                          {related.description}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      {/*
       * 7. Contextual chauffeur-only CTA band (R9.6 row 7, R1.6). The
       *    heading interpolates the dictionary `chauffeurOnlyPhrase` so
       *    the Phase 12 forbidden-phrase lint lands on the exact string
       *    it checks for, and the CTA pair mirrors the site-wide
       *    booking/WhatsApp action pair.
       */}
      <section
        aria-labelledby="article-chauffeur-cta-heading"
        className="container mx-auto px-4 py-12"
      >
        <div className="mx-auto max-w-3xl rounded-xl border border-[var(--border)] bg-[var(--muted)] p-8 text-center">
          <h2
            id="article-chauffeur-cta-heading"
            className="text-2xl font-bold tracking-tight text-[var(--foreground)] md:text-3xl"
          >
            {chauffeurCtaHeading}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-[var(--muted-foreground)]">
            {chauffeurCtaBody}
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href={bookingHref}>{dict.cta.primaryBooking}</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a
                href={WHATSAPP_PLACEHOLDER_HREF}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={dict.meta.whatsappAriaLabel}
              >
                {dict.cta.secondaryWhatsapp}
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/*
       * 8. Final CTA band (R9.6 row 8, R9.9). Mirrors the home-template
       *    closing band so a visitor who reaches the end of the article
       *    lands on the same action pair the rest of the site uses.
       */}
      <section
        aria-labelledby="article-final-cta-heading"
        className="bg-[var(--secondary)] py-16 text-[var(--secondary-foreground)]"
      >
        <div className="container mx-auto px-4 text-center">
          <h2
            id="article-final-cta-heading"
            className="text-3xl font-bold tracking-tight"
          >
            {finalCtaHeading}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-[var(--muted-foreground)]">
            {article.description}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href={bookingHref}>{dict.cta.primaryBooking}</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a
                href={WHATSAPP_PLACEHOLDER_HREF}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={dict.meta.whatsappAriaLabel}
              >
                {dict.cta.secondaryWhatsapp}
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/*
       * JSON-LD (R8.5). One `Article` block emitted at the end of the
       * tree so the structured-data script sits after the visible
       * sections without affecting their order. `BreadcrumbList` (R8.4)
       * is owned by `<Breadcrumb>` above — emitting it twice would
       * violate R8.7.
       */}
      <JsonLd blocks={[articleBlock]} />
    </div>
  );
}
