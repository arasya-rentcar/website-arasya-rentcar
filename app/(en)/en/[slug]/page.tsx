import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Landing } from '@/screens/Landing';
import { getLocationBySlugEn, getLocations, getSite } from '@/lib/data';
import { jsonLdProps, landingSeo } from '@/lib/seo';
import { hasEnLocation } from '@/lib/localize';

// Content comes from the database, but the HTML is prerendered — and Next reuses
// prerendered output from .next/cache (which Vercel restores between deploys)
// when the source has not changed. Without a revalidate window a content edit
// plus a redeploy can keep serving the previous build's copy indefinitely.
// Phase 3's publish hook revalidates on demand; this bounds the worst case.
export const revalidate = 3600;


/**
 * English landing pages.
 *
 * `generateStaticParams` only emits entries that pass `hasEnLocation()`, so an
 * untranslated entry has no /en/ page at all — rather than a page that falls
 * back to Indonesian while advertising itself as English. That also keeps the
 * hreflang set honest: alternates are only emitted where both sides exist.
 */

interface Params {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const locations = await getLocations();
  return locations.filter(hasEnLocation).map((l) => ({ slug: l.slugEn as string }));
}

export const dynamicParams = true;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const [location, site] = await Promise.all([getLocationBySlugEn(slug), getSite()]);
  if (!location) return {};
  return landingSeo(location, site, 'en').metadata;
}

export default async function LandingPageEn({ params }: Params) {
  const { slug } = await params;
  const [location, site, allLocations] = await Promise.all([
    getLocationBySlugEn(slug),
    getSite(),
    getLocations(),
  ]);
  if (!location) notFound();

  const { jsonLd } = landingSeo(location, site, 'en');

  return (
    <>
      <script {...jsonLdProps(jsonLd)} />
      <Landing location={location} site={site} allLocations={allLocations} locale="en" />
    </>
  );
}
