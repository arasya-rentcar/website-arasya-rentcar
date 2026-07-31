/**
 * Offline half of the seed verification: registry -> row -> domain, with no
 * database involved.
 *
 * Postgres only stores what we hand it, so every realistic way for the
 * migration to lose or mangle content lives in the mapping functions. This
 * runs that round-trip in memory and deep-equals the result, which means the
 * mapping is provably lossless before a project even exists.
 *
 * `npm run db:verify` then confirms the same thing end-to-end through a real
 * database once credentials are configured.
 *
 *   npm run verify:mapping
 */
import { isDeepStrictEqual } from 'node:util';
import {
  toLocation,
  toPost,
  toSite,
  toTravel,
  type LocationRow,
  type PostRow,
  type SiteRow,
  type TravelRow,
} from '../src/lib/hydrate';
import {
  DESTINATION_MEDIA,
  OVERSEAS_TRUST,
  REAL_TESTIMONIALS,
  WA_ROUTING,
  cityToRow,
  loadCities,
  loadI18nOverlays,
  loadPosts,
  loadSite,
  loadTravel,
  normalizeAssetPath,
  postToRow,
  siteToRow,
  travelToRow,
} from './registry';

let failures = 0;
const STAMP = '2026-01-01T00:00:00.000Z';

function check(label: string, expected: unknown, actual: unknown) {
  if (isDeepStrictEqual(expected, actual)) {
    console.log(`  ✓ ${label}`);
    return;
  }
  failures++;
  console.error(`  ✗ ${label}`);
  console.error(`      expected: ${JSON.stringify(expected)}`);
  console.error(`      actual:   ${JSON.stringify(actual)}`);
}

/** Drop the fields the database owns, which have no registry counterpart. */
function stripDbFields(o: Record<string, unknown>) {
  const { key, status, updatedAt, sortOrder, ...rest } = o;
  void key;
  void status;
  void updatedAt;
  void sortOrder;
  return rest;
}

/* ---------------------------------------------------------------- locations */

console.log('\nlocations');
const cities = await loadCities();
for (const [k, raw] of Object.entries(cities)) {
  // Round-trip through the row shape the seed writes.
  const row = { ...cityToRow(k, raw, 0), updated_at: STAMP } as unknown as LocationRow;
  const actual = stripDbFields(toLocation(row) as unknown as Record<string, unknown>);

  // The seed rewrites preview-relative asset paths to site-root-relative ones,
  // merges in photos sourced after the handoff, and gives overseas entries the
  // quote-based trust cards instead of the domestic defaults. All three are
  // intended transforms, so apply them to the expectation too.
  // Stripped on both sides. With the handoff present these fields are absent
  // from `raw` and this is a no-op; loading from the snapshot they are present,
  // because the snapshot is exported from the database.
  const expected: Record<string, unknown> = stripDbFields({ ...raw } as Record<string, unknown>);
  if (raw.heroImage) expected.heroImage = normalizeAssetPath(raw.heroImage);
  const media = DESTINATION_MEDIA[k] ?? {};
  expected.destinations = (raw.destinations ?? []).map((d) => {
    const base = d.image ? { ...d, image: normalizeAssetPath(d.image) } : d;
    return media[d.name] ? { ...base, ...media[d.name] } : base;
  });
  if (!raw.trust && raw.country !== 'ID') expected.trust = OVERSEAS_TRUST;
  // WhatsApp routing is a post-handoff field: `cities.js` has no counterpart, so
  // it can only be asserted against the map the seed reads from.
  if (WA_ROUTING[k]) expected.waPhone = WA_ROUTING[k];

  check(k, expected, actual);
}

/* -------------------------------------------------------------------- posts */

console.log('\nposts');
const posts = await loadPosts();
for (const [k, raw] of Object.entries(posts)) {
  const row = { ...postToRow(k, raw, 0), updated_at: STAMP } as unknown as PostRow;
  const actual = stripDbFields(toPost(row) as unknown as Record<string, unknown>);

  // cityPreviewHref pointed at a .dc.html preview file — deliberately dropped.
  const { cityPreviewHref, ...rest } = raw;
  void cityPreviewHref;
  // Same strip as locations: no-op against the handoff, required against the
  // snapshot, which carries the database-owned fields.
  const expected = stripDbFields(rest as unknown as Record<string, unknown>);

  check(k, expected, actual);
}

/* ------------------------------------------------------------ site_settings */

console.log('\nsite_settings');
const registrySite = await loadSite();
const enOverlays = await loadI18nOverlays();
{
  const row = { ...siteToRow(registrySite, enOverlays), updated_at: STAMP } as unknown as SiteRow;
  const site = toSite(row);
  check('settings', registrySite.settings, site.settings);
  check('fleet', registrySite.fleet, site.fleet);
  check('fleetNotes', registrySite.fleetNotes, site.fleetNotes);
  check('genericUnits', registrySite.genericUnits, site.genericUnits);
  check('services', registrySite.services, site.services);
  // Testimonials are deliberately NOT the registry's: `site.js` ships
  // placeholder reviews with invented names, replaced by REAL_TESTIMONIALS.
  check('testimonials are the real reviews', REAL_TESTIMONIALS, site.testimonials);
  // Named explicitly rather than derived from `registrySite`: when the loaders
  // fall back to the snapshot, `registrySite` IS the live content, so deriving
  // the placeholder list from it would compare the real reviews against
  // themselves and fail every one. These three names are what site.js shipped.
  const HANDOFF_PLACEHOLDER_REVIEWERS = ['Rina W.', 'Budi S.', 'Maya A.'];
  check(
    'no placeholder testimonial survives',
    [],
    site.testimonials.filter((t) => HANDOFF_PLACEHOLDER_REVIEWERS.includes(t.name))
  );
  // Every displayed review must be verifiable — the card links to its source.
  check(
    'every testimonial links to its source',
    [],
    site.testimonials.filter((t) => !t.link)
  );
  check('trustDefaults', registrySite.trustDefaults, site.trustDefaults);
  check('en overlays', enOverlays, site.en);
}

/* ---------------------------------------------------------- travel_settings */

console.log('\ntravel_settings');
const registryTravel = await loadTravel();
{
  const row = { ...travelToRow(registryTravel), updated_at: STAMP } as unknown as TravelRow;
  const travel = toTravel(row);
  check('units', registryTravel.units, travel.units);
  check('origins', registryTravel.origins, travel.origins);
  check('routes', registryTravel.routes, travel.routes);
}

/* --------------------------------------------------- i18n / EN localization */

// A partial EN overlay must never blank out Indonesian copy — verify the
// field-by-field fallback rather than trusting the spread.
console.log('\nlocalization');
{
  const { localizeSite, localizeLocation, hasEnLocation } = await import('../src/lib/localize');
  const siteRow = { ...siteToRow(registrySite, enOverlays), updated_at: STAMP } as unknown as SiteRow;
  const site = toSite(siteRow);

  const en = localizeSite(site, 'en');
  const mobilDriver = en.services.find((s) => s.slug === 'mobil-driver');
  check('services[mobil-driver].title -> EN', 'Car + Driver', mobilDriver?.title);
  check('services keep their slug', 'mobil-driver', mobilDriver?.slug);
  check('services keep their icon', 'car', mobilDriver?.icon);
  check(
    'trustDefaults[shield].title -> EN',
    'Experienced Drivers',
    en.trustDefaults.find((t) => t.preset === 'shield')?.title
  );
  check('testimonials stay in the original language', site.testimonials, en.testimonials);
  check('id locale is a passthrough', site, localizeSite(site, 'id'));

  // Untranslated locations must report no EN content and pass through unchanged.
  const bogorRow = { ...cityToRow('bogor', cities.bogor, 0), updated_at: STAMP } as unknown as LocationRow;
  const bogor = toLocation(bogorRow);
  check('untranslated location has no EN', false, hasEnLocation(bogor));
  check('untranslated location passes through', bogor, localizeLocation(bogor, 'en'));

  // A half-filled overlay fills only what it supplies.
  const partial = toLocation({
    ...bogorRow,
    slug_en: 'car-rental-bogor',
    en: { h1: 'Car Rental Bogor with Driver', metaTitle: 'T', metaDescription: 'D' },
  } as unknown as LocationRow);
  const partialEn = localizeLocation(partial, 'en');
  check('overlaid field uses EN', 'Car Rental Bogor with Driver', partialEn.h1);
  check('un-overlaid field keeps ID', bogor.heroSubtitle, partialEn.heroSubtitle);
  check('partial overlay counts as EN-ready', true, hasEnLocation(partial));
}

/* ------------------------------------------------- asset-reference coverage */

// Every image the registries reference must exist under /public, or pages
// render broken photos in production while looking fine in the preview.
console.log('\nassets');
const { existsSync } = await import('node:fs');
const { resolve } = await import('node:path');

const referenced = new Set<string>();
for (const c of Object.values(cities)) {
  const hero = normalizeAssetPath(c.heroImage);
  if (hero) referenced.add(hero);
  for (const d of c.destinations ?? []) {
    const img = normalizeAssetPath(d.image);
    if (img) referenced.add(img);
  }
}
// Photos sourced after the handoff.
for (const byName of Object.values(DESTINATION_MEDIA)) {
  for (const m of Object.values(byName)) referenced.add(m.image);
}
for (const f of registrySite.fleet) {
  if (f.img) referenced.add(`/assets/cars/${f.img}.webp`);
  if (f.imgLogo) referenced.add(`/assets/cars-with-logo/${f.imgLogo}.webp`);
}
// /travel unit cards reuse the with-logo photos.
for (const u of registryTravel.units) {
  if (u.img) referenced.add(`/assets/cars-with-logo/${u.img}.webp`);
}
referenced.add('/assets/brand/logo-arasya.png');

const missing = [...referenced].filter((p) => !existsSync(resolve(process.cwd(), 'public', p.slice(1))));
if (missing.length) {
  failures++;
  console.error(`  ✗ ${missing.length} referenced asset(s) missing from /public:`);
  for (const m of missing) console.error(`      ${m}`);
} else {
  console.log(`  ✓ all ${referenced.size} referenced assets present in /public`);
}

// Third-party photos must carry complete attribution — an incomplete credit is
// a licence breach, so fail the build rather than render a partial one.
for (const [cityKey, byName] of Object.entries(DESTINATION_MEDIA)) {
  for (const [name, m] of Object.entries(byName)) {
    const c = m.imageCredit;
    const complete = Boolean(c?.author && c?.sourceUrl && c?.licence && c?.licenceUrl);
    if (!complete) {
      failures++;
      console.error(`  ✗ ${cityKey}/${name}: incomplete image credit`);
    } else {
      console.log(`  ✓ ${cityKey}/${name}: credited — ${c.author}, ${c.licence}`);
    }
  }
}

/* ------------------------------------------------------------------- result */

if (failures) {
  console.error(`\n${failures} mismatch(es).\n`);
  process.exit(1);
}
console.log('\nRegistry -> row -> domain round-trips unchanged, and all assets resolve.\n');
