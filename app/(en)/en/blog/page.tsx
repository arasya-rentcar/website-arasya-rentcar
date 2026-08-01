import type { Metadata } from 'next';
import { BlogIndex } from '@/screens/BlogIndex';
import { getLocations, getPosts, getSite } from '@/lib/data';
import { blogIndexSeo, jsonLdProps } from '@/lib/seo';

// Content comes from the database, but the HTML is prerendered — and Next reuses
// prerendered output from .next/cache (which Vercel restores between deploys)
// when the source has not changed. Without a revalidate window a content edit
// plus a redeploy can keep serving the previous build's copy indefinitely.
// Phase 3's publish hook revalidates on demand; this bounds the worst case.
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const [posts, site] = await Promise.all([getPosts(), getSite()]);
  return blogIndexSeo(posts, site, 'en').metadata;
}

export default async function BlogIndexPageEn() {
  const [posts, locations, site] = await Promise.all([getPosts(), getLocations(), getSite()]);
  const { jsonLd } = blogIndexSeo(posts, site, 'en');
  return (
    <>
      <script {...jsonLdProps(jsonLd)} />
      <BlogIndex posts={posts} locations={locations} site={site} locale="en" />
    </>
  );
}
