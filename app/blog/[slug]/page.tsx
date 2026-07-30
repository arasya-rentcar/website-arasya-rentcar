import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { BlogPost } from '@/screens/BlogPost';
import { getLocations, getPostBySlug, getPosts, getSite } from '@/lib/data';
import { blogPostSeo, jsonLdProps } from '@/lib/seo';

// Content comes from the database, but the HTML is prerendered — and Next reuses
// prerendered output from .next/cache (which Vercel restores between deploys)
// when the source has not changed. Without a revalidate window a content edit
// plus a redeploy can keep serving the previous build's copy indefinitely.
// Phase 3's publish hook revalidates on demand; this bounds the worst case.
export const revalidate = 3600;


interface Params {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const posts = await getPosts();
  // Stored slugs carry a "blog/" prefix; the route param is the bare segment.
  return posts.map((p) => ({ slug: p.slug.replace(/^blog\//, '') }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const [post, site] = await Promise.all([getPostBySlug(slug), getSite()]);
  if (!post) return {};
  return blogPostSeo(post, site, 'id').metadata;
}

export default async function BlogPostPage({ params }: Params) {
  const { slug } = await params;
  const [post, posts, locations, site] = await Promise.all([
    getPostBySlug(slug),
    getPosts(),
    getLocations(),
    getSite(),
  ]);
  if (!post) notFound();

  const related = post.related
    .map((key) => posts.find((p) => p.key === key))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  const { jsonLd } = blogPostSeo(post, site, 'id');

  return (
    <>
      <script {...jsonLdProps(jsonLd)} />
      <BlogPost post={post} related={related} locations={locations} site={site} locale="id" />
    </>
  );
}
