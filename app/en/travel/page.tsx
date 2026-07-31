import type { Metadata } from 'next';
import { Travel } from '@/screens/Travel';
import { getLocations, getSite, getTravel } from '@/lib/data';
import { jsonLdProps, travelSeo } from '@/lib/seo';
import { fillBank, tTravel } from '@/lib/i18n';
import { travelAreaServed, travelOffers } from '@/lib/travel';
import { official } from '@/lib/shared';

// Content comes from the database, but the HTML is prerendered — and Next reuses
// prerendered output from .next/cache (which Vercel restores between deploys)
// when the source has not changed. Without a revalidate window a content edit
// plus a redeploy can keep serving the previous build's copy indefinitely.
// Phase 3's publish hook revalidates on demand; this bounds the worst case.
export const revalidate = 3600;


async function seo() {
  const [site, travel] = await Promise.all([getSite(), getTravel()]);
  const T = tTravel('en');
  const bank = official(site).bank;
  return travelSeo(
    site,
    'en',
    {
      seoTitle: T.seoTitle,
      seoDesc: T.seoDesc,
      faqs: T.faqs.map((f) => ({ question: f.question, answer: fillBank(f.answer, bank) })),
    },
    travelOffers(travel),
    travelAreaServed(travel)
  );
}

export async function generateMetadata(): Promise<Metadata> {
  return (await seo()).metadata;
}

export default async function TravelPageEn() {
  const [site, travel, locations] = await Promise.all([getSite(), getTravel(), getLocations()]);
  const { jsonLd } = await seo();
  return (
    <>
      <script {...jsonLdProps(jsonLd)} />
      <Travel travel={travel} site={site} locations={locations} locale="en" />
    </>
  );
}
