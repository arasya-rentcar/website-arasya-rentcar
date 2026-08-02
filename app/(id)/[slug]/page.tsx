import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Landing } from '@/screens/Landing';
import { getLocationBySlug, getLocations, getSite } from '@/lib/data';
import { jsonLdProps, landingSeo } from '@/lib/seo';

// Content comes from the database, but the HTML is prerendered — and Next reuses
// prerendered output from .next/cache (which Vercel restores between deploys)
// when the source has not changed. Without a revalidate window a content edit
// plus a redeploy can keep serving the previous build's copy indefinitely.
// Phase 3's publish hook revalidates on demand; this bounds the worst case.
export const revalidate = 3600;


/**
 * Indonesian landing pages — city, region, and country templates share this
 * route and dispatch on `template`.
 *
 * Statically generated per registry entry. Ads Quality Score and indexing both
 * depend on server-rendered HTML, so nothing here may become dynamic.
 */

interface Params {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const locations = await getLocations();
  return locations.map((l) => ({ slug: l.slug }));
}

export const dynamicParams = true;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const [location, site] = await Promise.all([getLocationBySlug(slug), getSite()]);
  if (!location) return {};
  return landingSeo(location, site, 'id').metadata;
}

export default async function LandingPage({ params }: Params) {
  const { slug } = await params;
  const [location, site, allLocations] = await Promise.all([
    getLocationBySlug(slug),
    getSite(),
    getLocations(),
  ]);
  if (!location) notFound();

  const { jsonLd } = landingSeo(location, site, 'id');

  return (
    <>
      <script {...jsonLdProps(jsonLd)} />
      <Landing location={location} site={site} allLocations={allLocations} locale="id" />
    </>
  );
}
