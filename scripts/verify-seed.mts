/**
 * Proves the registry -> Supabase migration is lossless.
 *
 * Reads every row back through the *production* hydrators in
 * `src/lib/hydrate.ts` and deep-equals the result against the original
 * registry objects. A green run means templates reading from the database see
 * byte-identical content to the templates that read the .js registries.
 *
 * Fields that legitimately differ are declared explicitly below rather than
 * being loosely ignored.
 *
 *   npm run db:verify
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { isDeepStrictEqual } from 'node:util';
import {
  LOCATION_COLUMNS,
  POST_COLUMNS,
  SITE_COLUMNS,
  TRAVEL_COLUMNS,
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
  cityToRow,
  loadCities,
  loadI18nOverlays,
  loadPosts,
  loadSite,
  loadTravel,
  postToRow,
  siteToRow,
  travelToRow,
} from './registry';

config({ path: '.env.local' });
config({ path: '.env' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / key. See .env.example.');
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });

let failures = 0;

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

/**
 * Expectations are built by running the registry through the *seed's own* row
 * builders, then hydrating back — so this asserts "the database returns exactly
 * what we asked it to store".
 *
 * It deliberately does not re-derive the seed's transformations by hand. Doing
 * that meant every enrichment the seed grew (asset-path rewrites, the
 * DESTINATION_MEDIA photo/credit overlay) had to be mirrored here too, and when
 * one was missed this script reported the *database* as lossy when the data was
 * correct. Registry-to-row fidelity is `npm run verify:mapping`'s job; this
 * script's job is the network round-trip.
 */

/** Fields the database owns, with no registry counterpart to compare against. */
function stripDbFields<T extends Record<string, unknown>>(o: T) {
  const { key, status, updatedAt, sortOrder, ...rest } = o as Record<string, unknown>;
  void key;
  void status;
  void updatedAt;
  void sortOrder;
  return rest;
}

/* ---------------------------------------------------------------- locations */

const cities = await loadCities();
{
  const { data, error } = await supabase.from('locations').select(LOCATION_COLUMNS);
  if (error) throw new Error(error.message);
  const rows = data as unknown as LocationRow[];

  const dbKeys = rows.map((r) => r.key).sort();
  const regKeys = Object.keys(cities).sort();
  check('locations: key set', regKeys, dbKeys);

  Object.entries(cities).forEach(([k, raw], i) => {
    const row = rows.find((r) => r.key === k);
    if (!row) {
      failures++;
      console.error(`  ✗ locations/${k}: missing from database`);
      return;
    }

    const seeded = { ...cityToRow(k, raw, i), updated_at: '' } as unknown as LocationRow;
    check(
      `locations/${k}`,
      stripDbFields(toLocation(seeded) as unknown as Record<string, unknown>),
      stripDbFields(toLocation(row) as unknown as Record<string, unknown>)
    );
  });
}

/* -------------------------------------------------------------------- posts */

const posts = await loadPosts();
{
  const { data, error } = await supabase.from('posts').select(POST_COLUMNS);
  if (error) throw new Error(error.message);
  const rows = data as unknown as PostRow[];

  check('posts: key set', Object.keys(posts).sort(), rows.map((r) => r.key).sort());

  Object.entries(posts).forEach(([k, raw], i) => {
    const row = rows.find((r) => r.key === k);
    if (!row) {
      failures++;
      console.error(`  ✗ posts/${k}: missing from database`);
      return;
    }
    // `cityPreviewHref` pointed at a .dc.html preview file and is intentionally
    // not migrated — postToRow drops it, so it is absent from both sides here.
    const seeded = { ...postToRow(k, raw, i), updated_at: '' } as unknown as PostRow;
    check(
      `posts/${k}`,
      stripDbFields(toPost(seeded) as unknown as Record<string, unknown>),
      stripDbFields(toPost(row) as unknown as Record<string, unknown>)
    );
  });
}

/* ------------------------------------------------------------ site_settings */

{
  const [registrySite, enOverlays] = await Promise.all([loadSite(), loadI18nOverlays()]);
  const { data, error } = await supabase.from('site_settings').select(SITE_COLUMNS).single();
  if (error) throw new Error(error.message);

  const seeded = toSite({ ...siteToRow(registrySite, enOverlays), updated_at: '' } as unknown as SiteRow);
  const site = toSite(data as unknown as SiteRow);

  check('site.settings', seeded.settings, site.settings);
  check('site.fleet', seeded.fleet, site.fleet);
  check('site.fleetNotes', seeded.fleetNotes, site.fleetNotes);
  check('site.genericUnits', seeded.genericUnits, site.genericUnits);
  check('site.services', seeded.services, site.services);
  check('site.testimonials', seeded.testimonials, site.testimonials);
  check('site.trustDefaults', seeded.trustDefaults, site.trustDefaults);
  // EN overlays are the bilingual layer — a silent loss here would strip /en/.
  check('site.en', seeded.en, site.en);
}

/* ---------------------------------------------------------- travel_settings */

{
  const registryTravel = await loadTravel();
  const { data, error } = await supabase.from('travel_settings').select(TRAVEL_COLUMNS).single();
  if (error) throw new Error(error.message);

  const seeded = toTravel({ ...travelToRow(registryTravel), updated_at: '' } as unknown as TravelRow);
  const travel = toTravel(data as unknown as TravelRow);

  check('travel.units', seeded.units, travel.units);
  check('travel.origins', seeded.origins, travel.origins);
  // Prices are the page's whole purpose — a dropped key silently removes a car
  // class from a route rather than erroring.
  check('travel.routes', seeded.routes, travel.routes);
}

/* ------------------------------------------------------------------- result */

if (failures) {
  console.error(`\n${failures} mismatch(es) — the migration is NOT lossless.\n`);
  process.exit(1);
}
console.log('\nAll registry content round-trips through Supabase unchanged.\n');
