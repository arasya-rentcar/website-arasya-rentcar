/**
 * Asserts the static SEO output matches the prototypes' `applySeo()` contract.
 *
 * These are the invariants that are expensive to notice by eye and costly to
 * get wrong: FAQPage that doesn't mirror the visible FAQ is a structured-data
 * policy violation, a canonical pointing at a redirect wastes the tag, and an
 * hreflang alternate to a page that doesn't exist is a crawl error.
 *
 *   npm run verify:seo
 */
import { isDeepStrictEqual } from 'node:util';
import snapshot from '../src/data/registry-snapshot.json' with { type: 'json' };
import type { Location, Post, Site } from '../src/types';
import { landingSeo, hubSeo, blogIndexSeo, blogPostSeo } from '../src/lib/seo';
import { fullFaq, official, fleetPriceRange } from '../src/lib/shared';
import { hasEnLocation } from '../src/lib/localize';

const locations = snapshot.locations as unknown as Location[];
const posts = snapshot.posts as unknown as Post[];
const site = snapshot.site as unknown as Site;

let failures = 0;

function ok(label: string, cond: boolean, detail?: string) {
  if (cond) {
    console.log(`  ✓ ${label}`);
    return;
  }
  failures++;
  console.error(`  ✗ ${label}${detail ? `\n      ${detail}` : ''}`);
}

function node(graph: { '@graph': Record<string, unknown>[] }, type: string) {
  return graph['@graph'].find((n) => n['@type'] === type);
}

const off = official(site);
const base = off.siteUrl;

/* ------------------------------------------------------------- landings */

console.log('\nlanding pages');
for (const loc of locations) {
  const { metadata, jsonLd } = landingSeo(loc, site, 'id');

  ok(`${loc.slug}: title = metaTitle`, metadata.title === loc.metaTitle);
  ok(`${loc.slug}: description = metaDescription`, metadata.description === loc.metaDescription);

  // Canonical must be the URL actually served — no trailing slash.
  const canonical = String(metadata.alternates?.canonical ?? '');
  ok(
    `${loc.slug}: canonical is ${base}/${loc.slug}`,
    canonical === `${base}/${loc.slug}`,
    `got ${canonical}`
  );
  ok(`${loc.slug}: canonical has no trailing slash`, !canonical.endsWith('/'));

  // FAQPage must mirror the rendered accordion exactly.
  const visible = fullFaq(loc, off);
  const faq = node(jsonLd, 'FAQPage') as
    | { mainEntity: { name: string; acceptedAnswer: { text: string } }[] }
    | undefined;
  const emitted = (faq?.mainEntity ?? []).map((q) => ({
    question: q.name,
    answer: q.acceptedAnswer.text,
  }));
  ok(
    `${loc.slug}: FAQPage mirrors the visible FAQ (${visible.length} items)`,
    isDeepStrictEqual(visible, emitted)
  );

  const rental = node(jsonLd, 'AutoRental') as Record<string, unknown> | undefined;
  ok(`${loc.slug}: AutoRental legalName`, rental?.legalName === 'PT. Ayomi Raya');

  // `site.fleet` is the Jabodetabek rate card in IDR. Overseas availability and
  // pricing are settled over WhatsApp, so an overseas page must publish no
  // price — in markup least of all, since structured-data prices can surface in
  // the search result before the visitor ever reaches the page.
  if (loc.country === 'ID') {
    ok(`${loc.slug}: AutoRental priceRange from fleet`, rental?.priceRange === fleetPriceRange(site));
  } else {
    ok(`${loc.slug}: overseas — AutoRental emits no priceRange`, rental?.priceRange === undefined);
    ok(
      `${loc.slug}: overseas — no rupiah figure in the SERP entry`,
      !/Rp\s?[\d.]/.test(`${loc.metaTitle} ${loc.metaDescription}`)
    );

    // An overseas page must not assert the Jabodetabek tariff structure while
    // its fleet section says pricing is confirmed over WhatsApp. Bangkok did
    // exactly that: the FAQ and a trust card both named the two domestic tiers.
    const prose = [
      ...visible.map((f) => `${f.question} ${f.answer}`),
      ...(loc.trust ?? []).map((c) => `${c.title} ${c.description}`),
    ].join(' ');
    ok(
      `${loc.slug}: overseas — does not quote the domestic tariff tiers`,
      !/Dalam Kota 12 jam|melebihi 12 jam/.test(prose),
      prose.match(/.{0,60}(Dalam Kota 12 jam|melebihi 12 jam).{0,40}/)?.[0]
    );
  }
  ok(`${loc.slug}: AutoRental areaServed from registry`, isDeepStrictEqual(rental?.areaServed, loc.areaServed));
  ok(
    `${loc.slug}: AutoRental address is the Bogor HQ`,
    (rental?.address as { addressLocality?: string })?.addressLocality === off.addressLocality
  );

  const crumbs = node(jsonLd, 'BreadcrumbList') as
    | { itemListElement: { position: number; item: string }[] }
    | undefined;
  ok(`${loc.slug}: BreadcrumbList has 3 levels`, crumbs?.itemListElement.length === 3);
  ok(
    `${loc.slug}: breadcrumb terminates at the page`,
    crumbs?.itemListElement[2]?.item === `${base}/${loc.slug}`
  );

  // An untranslated entry must not advertise an /en/ alternate that 404s.
  const langs = (metadata.alternates?.languages ?? {}) as Record<string, string>;
  if (hasEnLocation(loc)) {
    ok(`${loc.slug}: advertises en alternate`, Boolean(langs.en));
  } else {
    ok(`${loc.slug}: no en alternate (untranslated)`, langs.en === undefined);
  }
  ok(`${loc.slug}: x-default points at Indonesian`, langs['x-default'] === `${base}/${loc.slug}`);
}

/* -------------------------------------------------------- hub & blog */

console.log('\nhub');
{
  const { metadata, jsonLd } = hubSeo(locations, site, 'id');
  const canonical = String(metadata.alternates?.canonical ?? '');
  ok('canonical is /sewa-mobil', canonical === `${base}/sewa-mobil`);
  const list = node(jsonLd, 'ItemList') as { itemListElement: unknown[] } | undefined;
  ok(
    `ItemList covers every location (${locations.length})`,
    list?.itemListElement.length === locations.length
  );
}

console.log('\nblog');
{
  const { metadata, jsonLd } = blogIndexSeo(posts, site, 'id');
  ok('index canonical is /blog', String(metadata.alternates?.canonical) === `${base}/blog`);
  const list = node(jsonLd, 'ItemList') as { itemListElement: unknown[] } | undefined;
  ok(`index ItemList covers every post (${posts.length})`, list?.itemListElement.length === posts.length);

  for (const p of posts) {
    const { metadata: m, jsonLd: g } = blogPostSeo(p, site, 'id');
    // Stored slugs keep the blog/ prefix, so the canonical is /blog/{slug}.
    ok(`${p.key}: canonical is ${base}/${p.slug}`, String(m.alternates?.canonical) === `${base}/${p.slug}`);
    ok(`${p.key}: og:type is article`, (m.openGraph as { type?: string })?.type === 'article');
    const posting = node(g, 'BlogPosting') as Record<string, unknown> | undefined;
    ok(`${p.key}: BlogPosting dates present`, Boolean(posting?.datePublished && posting?.dateModified));
    ok(`${p.key}: links to exactly one city`, Boolean(p.cityKey));
    ok(`${p.key}: links to exactly two related posts`, p.related.length === 2);
  }
}

/* ------------------------------------------------- cross-page invariants */

console.log('\ncross-page');
{
  // Every post's cityKey must resolve, or the internal-link mesh has a hole.
  const keys = new Set(locations.map((l) => l.key));
  const orphans = posts.filter((p) => !keys.has(p.cityKey));
  ok('every post resolves to a location', orphans.length === 0, orphans.map((p) => p.key).join(', '));

  // Related-post keys must resolve too.
  const postKeys = new Set(posts.map((p) => p.key));
  const badRelated = posts.flatMap((p) => p.related.filter((r) => !postKeys.has(r)));
  ok('every related-post key resolves', badRelated.length === 0, badRelated.join(', '));

  // Slugs are the URL space — duplicates would collide at build time.
  const allSlugs = [...locations.map((l) => l.slug), ...posts.map((p) => p.slug)];
  ok('no duplicate slugs across locations + posts', new Set(allSlugs).size === allSlugs.length);

  // Doorway-page defence: editorial copy must be unique per entry.
  const leads = locations.map((l) => l.editorial.lead);
  ok('editorial lead is unique per entry', new Set(leads).size === leads.length);
  const h1s = locations.map((l) => l.h1);
  ok('h1 is unique per entry', new Set(h1s).size === h1s.length);
}

if (failures) {
  console.error(`\n${failures} SEO assertion(s) failed.\n`);
  process.exit(1);
}
console.log('\nAll SEO assertions passed.\n');
