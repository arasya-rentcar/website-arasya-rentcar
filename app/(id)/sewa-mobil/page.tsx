import type { Metadata } from 'next';
import { Hub } from '@/screens/Hub';
import { getLocations, getSite } from '@/lib/data';
import { hubSeo, jsonLdProps } from '@/lib/seo';

// Content comes from the database, but the HTML is prerendered — and Next reuses
// prerendered output from .next/cache (which Vercel restores between deploys)
// when the source has not changed. Without a revalidate window a content edit
// plus a redeploy can keep serving the previous build's copy indefinitely.
// Phase 3's publish hook revalidates on demand; this bounds the worst case.
export const revalidate = 3600;


/**
 * The required crawl node. Every published landing page is linked from here, so
 * this route must never be omitted from the sitemap or blocked from indexing.
 */
export async function generateMetadata(): Promise<Metadata> {
  const [locations, site] = await Promise.all([getLocations(), getSite()]);
  return hubSeo(locations, site, 'id').metadata;
}

export default async function HubPage() {
  const [locations, site] = await Promise.all([getLocations(), getSite()]);
  const { jsonLd } = hubSeo(locations, site, 'id');
  return (
    <>
      <script {...jsonLdProps(jsonLd)} />
      <Hub locations={locations} site={site} locale="id" />
    </>
  );
}
