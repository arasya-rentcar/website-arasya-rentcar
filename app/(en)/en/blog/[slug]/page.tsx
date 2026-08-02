import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { BlogPost } from '@/screens/BlogPost';
import { getLocations, getPostBySlugEn, getPosts, getSite } from '@/lib/data';
import { blogPostSeo, jsonLdProps } from '@/lib/seo';
import { hasEnPost } from '@/lib/localize';

// Content comes from the database, but the HTML is prerendered — and Next reuses
// prerendered output from .next/cache (which Vercel restores between deploys)
// when the source has not changed. Without a revalidate window a content edit
// plus a redeploy can keep serving the previous build's copy indefinitely.
// Phase 3's publish hook revalidates on demand; this bounds the worst case.
export const revalidate = 3600;

interface Params {
  params: Promise<{ slug: string }>;
}

/**
 * Only articles that pass `hasEnPost()` get a page here — the same rule
 * `/en/[slug]` applies to locations. An article without English content has no
 * /en/ URL at all, rather than one that advertises itself as English and then
 * renders Indonesian.
 */
export async function generateStaticParams() {
  const posts = await getPosts();
  return posts
    .filter(hasEnPost)
    .map((p) => ({ slug: (p.slugEn as string).replace(/^blog\//, '') }));
}

export const dynamicParams = true;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const [post, site] = await Promise.all([getPostBySlugEn(slug), getSite()]);
  if (!post) return {};
  return blogPostSeo(post, site, 'en').metadata;
}

export default async function BlogPostPageEn({ params }: Params) {
  const { slug } = await params;
  const [post, posts, locations, site] = await Promise.all([
    getPostBySlugEn(slug),
    getPosts(),
    getLocations(),
    getSite(),
  ]);
  if (!post) notFound();

  const related = post.related
    .map((key) => posts.find((p) => p.key === key))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  const { jsonLd } = blogPostSeo(post, site, 'en');

  return (
    <>
      <script {...jsonLdProps(jsonLd)} />
      <BlogPost post={post} related={related} locations={locations} site={site} locale="en" />
    </>
  );
}
