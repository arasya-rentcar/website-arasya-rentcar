/**
 * Proves the public-facing surface is actually closed.
 *
 * NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ships in the browser bundle of every
 * page, so anyone can issue arbitrary PostgREST queries with it. RLS is the
 * only thing standing between that key and the data — this asserts what it
 * must reach and, more importantly, what it must not.
 *
 * Run after any migration that touches policies.
 *
 *   npm run verify:rls
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });
config({ path: '.env' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !publishable || !secret) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / PUBLISHABLE_KEY / SERVICE_ROLE_KEY.');
  process.exit(1);
}

const pub = createClient(url, publishable, { auth: { persistSession: false } });
const admin = createClient(url, secret, { auth: { persistSession: false } });

let failures = 0;
const ok = (label: string, cond: boolean, detail = '') => {
  if (cond) console.log(`  ✓ ${label}`);
  else {
    failures++;
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
  }
};

/** Rows the public key can actually retrieve. Never uses `head`: a HEAD reply
 *  has no body, so the client cannot surface PostgREST's error and every table
 *  looks readable. */
async function publicRows(table: string): Promise<number | null> {
  const { data, error } = await pub.from(table).select('*').limit(1000);
  if (error) return null;
  return data.length;
}

console.log('\npublic reads that must work');
ok('locations readable', (await publicRows('locations')) === 6);
ok('posts readable', (await publicRows('posts')) === 3);
ok('site_settings readable', (await publicRows('site_settings')) === 1);
ok('travel_settings readable', (await publicRows('travel_settings')) === 1);

console.log('\nreads that must be denied');
{
  const drafts = await publicRows('content_drafts');
  ok('content_drafts not readable', drafts === null || drafts === 0, `got ${drafts} row(s)`);

  const admins = await publicRows('admins');
  ok('admins not readable', admins === null || admins === 0, `got ${admins} row(s)`);
}

console.log('\nunpublished content must not leak');
{
  // Park a draft row, confirm the public key cannot see it, then remove it.
  const probeKey = '__rls_probe__';
  await admin.from('locations').delete().eq('key', probeKey);
  const { error: insErr } = await admin.from('locations').insert({
    key: probeKey,
    slug: 'rls-probe-unpublished',
    name: 'Probe',
    code: 'PRB',
    page_type: 'city',
    template: 'city',
    variant: 'navy',
    country: 'ID',
    h1: 'Probe',
    status: 'draft',
  });
  if (insErr) {
    failures++;
    console.error(`  ✗ could not create probe row — ${insErr.message}`);
  } else {
    const { data } = await pub.from('locations').select('key').eq('key', probeKey);
    ok('draft location invisible to the public key', (data?.length ?? 0) === 0);
    await admin.from('locations').delete().eq('key', probeKey);
    const { data: after } = await admin.from('locations').select('key').eq('key', probeKey);
    ok('probe row cleaned up', (after?.length ?? 0) === 0);
  }
}

console.log('\nwrites must be denied');
{
  const { error } = await pub.from('locations').update({ h1: 'hijacked' }).eq('key', 'bogor');
  const { data: check } = await admin.from('locations').select('h1').eq('key', 'bogor').single();
  ok(
    'public key cannot update a published row',
    check?.h1 !== 'hijacked',
    error ? '' : 'update returned no error AND changed the row'
  );
}

console.log('\nstorage');
{
  const { data, error } = await admin.storage.listBuckets();
  const ids = (data ?? []).map((b) => b.id).sort();
  ok(
    'fleet / fleet-logo / gallery buckets exist',
    !error && ['fleet', 'fleet-logo', 'gallery'].every((b) => ids.includes(b)),
    ids.join(', ') || error?.message
  );
  const { error: upErr } = await pub.storage.from('fleet').upload(`probe-${Date.now()}.txt`, 'x');
  ok('public key cannot upload to fleet', Boolean(upErr), upErr ? '' : 'upload succeeded');
}

if (failures) {
  console.error(`\n${failures} RLS assertion(s) failed — the public surface is not safe.\n`);
  process.exit(1);
}
console.log('\nPublic key reaches published content and nothing else.\n');
