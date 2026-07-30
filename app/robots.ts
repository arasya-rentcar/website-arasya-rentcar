import type { MetadataRoute } from 'next';
import { getSite } from '@/lib/data';
import { ALLOW_INDEXING, logIndexingMode } from '@/lib/indexing';
import { official } from '@/lib/shared';

// Content comes from the database, but the HTML is prerendered — and Next reuses
// prerendered output from .next/cache (which Vercel restores between deploys)
// when the source has not changed. Without a revalidate window a content edit
// plus a redeploy can keep serving the previous build's copy indefinitely.
// Phase 3's publish hook revalidates on demand; this bounds the worst case.
export const revalidate = 3600;


export default async function robots(): Promise<MetadataRoute.Robots> {
  const base = official(await getSite()).siteUrl;
  logIndexingMode(base);

  // Staging / preview: refuse everything, and advertise no sitemap — pointing
  // crawlers at a list of URLs we do not want indexed defeats the purpose.
  if (!ALLOW_INDEXING) {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Content Studio is behind auth; keep it out of the index regardless.
        disallow: ['/admin', '/admin/'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
