/**
 * Seeds Supabase from the three design-handoff registries.
 *
 * Reads the real registry files rather than a hand-copied fixture, so the
 * seeded content is provably the content the design was signed off against.
 * Idempotent — upserts on the natural key, so re-running is safe.
 *
 *   npm run db:seed
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
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
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. See .env.example.');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function fail(step: string, message: string): never {
  console.error(`\n  ✗ ${step}: ${message}\n`);
  process.exit(1);
}

/* ------------------------------------------------------- wrong-project guard */

// This script writes with the secret key, which bypasses RLS entirely. Pointing
// it at the operations database (orders/invoices/customers) instead of the
// marketing project is a one-character mistake in a URL, so check first.
//
// The marketing project must contain nothing but content. If tables belonging
// to another application are present, stop — the site's publishable key is
// public by definition, and it must not unlock a database holding business
// records. Override with `npm run db:seed -- --force` if you know better.
{
  const foreign: string[] = [];
  for (const t of ['orders', 'invoices', 'customers', 'drivers', 'payables']) {
    // NOT `head: true`. A HEAD response carries no body, so supabase-js has
    // nothing to parse PostgREST's "table not found" out of and reports success
    // for tables that do not exist — which made this guard trip on every
    // database, empty ones included.
    const { error } = await supabase.from(t).select('*').limit(1);
    if (!error) foreign.push(t);
  }
  if (foreign.length && !process.argv.includes('--force')) {
    fail(
      'target project',
      `found unrelated tables (${foreign.join(', ')}) — this looks like the operations ` +
        `database, not the marketing project.\n    The site ships NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ` +
        `to every visitor's browser, so it must point at a project containing only content.\n` +
        `    Re-run with --force only if this really is the right database.`
    );
  }
}

/* ------------------------------------------------------------------ content */

const [cities, posts, site, travel, enOverlays] = await Promise.all([
  loadCities(),
  loadPosts(),
  loadSite(),
  loadTravel(),
  loadI18nOverlays(),
]);

// site_settings first — it is the singleton every page reads.
{
  const { error } = await supabase
    .from('site_settings')
    .upsert(siteToRow(site, enOverlays), { onConflict: 'id' });
  if (error) fail('site_settings', error.message);
  console.log(
    `  ✓ site_settings — ${site.fleet.length} fleet units, ${site.services.length} services, EN overlays`
  );
}

{
  const { error } = await supabase
    .from('travel_settings')
    .upsert(travelToRow(travel), { onConflict: 'id' });
  if (error) fail('travel_settings', error.message);
  console.log(
    `  ✓ travel_settings — ${travel.units.length} units, ${travel.origins.length} origins, ${travel.routes.length} routes`
  );
}

// locations before posts: posts.city_key is a FK onto locations.key.
{
  const rows = Object.entries(cities).map(([key, c], i) => cityToRow(key, c, i));
  const { error } = await supabase.from('locations').upsert(rows, { onConflict: 'key' });
  if (error) fail('locations', error.message);
  console.log(`  ✓ locations — ${rows.length} rows: ${rows.map((r) => r.slug).join(', ')}`);
}

{
  const rows = Object.entries(posts).map(([key, p], i) => postToRow(key, p, i));
  const { error } = await supabase.from('posts').upsert(rows, { onConflict: 'key' });
  if (error) fail('posts', error.message);
  console.log(`  ✓ posts — ${rows.length} rows`);
}

/* -------------------------------------------------------------------- admin */

// Sign-up is disabled in Supabase Auth, so the first Content Studio login has
// to be created here. Both the auth user and the allowlist row are required —
// RLS checks the allowlist, not merely "is authenticated".
const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;

// Half-configured is a mistake, not a choice to skip. The usual cause is an
// unquoted '#' in the password: dotenv reads it as a comment and the value
// arrives empty, which used to skip the bootstrap silently and only surface at
// the login screen.
if (Boolean(adminEmail) !== Boolean(adminPassword)) {
  fail(
    'admin bootstrap',
    `ADMIN_EMAIL is ${adminEmail ? 'set' : 'empty'} but ADMIN_PASSWORD is ${adminPassword ? 'set' : 'empty'}. ` +
      `If the password contains '#', quote it: ADMIN_PASSWORD='#example'`
  );
}

if (adminEmail && adminPassword) {
  const { data: existing } = await supabase.auth.admin.listUsers();
  const already = existing?.users.find((u) => u.email?.toLowerCase() === adminEmail.toLowerCase());

  let userId = already?.id;
  if (!userId) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
    });
    if (error) fail('admin user', error.message);
    userId = data.user.id;
    console.log(`  ✓ admin user created — ${adminEmail}`);
  } else {
    console.log(`  · admin user already exists — ${adminEmail}`);
  }

  const { error } = await supabase
    .from('admins')
    .upsert({ user_id: userId, email: adminEmail }, { onConflict: 'user_id' });
  if (error) fail('admins allowlist', error.message);
  console.log('  ✓ admins allowlist');
} else {
  console.log('  · ADMIN_EMAIL / ADMIN_PASSWORD not set — skipping admin bootstrap');
}

console.log('\nSeed complete. Run `npm run db:verify` to confirm it round-trips.\n');
