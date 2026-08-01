import type { Metadata } from 'next';
import { Home } from '@/screens/Home';
import { getLocations, getSite } from '@/lib/data';
import { homeSeo, jsonLdProps } from '@/lib/seo';
import { t } from '@/lib/i18n';

// Content comes from the database, but the HTML is prerendered — and Next reuses
// prerendered output from .next/cache (which Vercel restores between deploys)
// when the source has not changed. Without a revalidate window a content edit
// plus a redeploy can keep serving the previous build's copy indefinitely.
// Phase 3's publish hook revalidates on demand; this bounds the worst case.
export const revalidate = 3600;


export async function generateMetadata(): Promise<Metadata> {
  const [locations, site] = await Promise.all([getLocations(), getSite()]);
  return homeSeo(locations, site, 'id', t('id')).metadata;
}

export default async function HomePage() {
  const [locations, site] = await Promise.all([getLocations(), getSite()]);
  const { jsonLd } = homeSeo(locations, site, 'id', t('id'));
  return (
    <>
      <script {...jsonLdProps(jsonLd)} />
      <Home locations={locations} site={site} locale="id" />
    </>
  );
}
