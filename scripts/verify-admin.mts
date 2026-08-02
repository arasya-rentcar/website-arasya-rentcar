/**
 * Proves the Content Studio gate is closed, from the outside.
 *
 * `verify:rls` asserts what the publishable key may reach in the database.
 * This asserts the layer above it: that an unauthenticated *browser* cannot get
 * an admin page, that a signed-in-but-not-allowlisted account cannot either,
 * and that neither /admin nor its login form is indexable.
 *
 * Runs against a running server — local by default, or a deployment:
 *
 *   npm run verify:admin
 *   npm run verify:admin -- https://arasya-rentcar.vercel.app
 *
 * The auth half is skipped unless SUPABASE_SERVICE_ROLE_KEY is available, since
 * it has to mint a throwaway user to have a non-admin session to test with.
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });
config({ path: '.env' });

const BASE = (process.argv[2] ?? 'http://localhost:3000').replace(/\/$/, '');

let failures = 0;

/**
 * Set when the deployment has no Supabase credentials at all.
 *
 * Everything below then reports as skipped rather than failed. Fourteen red
 * crosses caused by one missing environment variable describe a broken gate,
 * which is not what happened — and that misreading is exactly what this run
 * cost the first time.
 */
let configBroken = false;

const ok = (label: string, cond: boolean, detail = '') => {
  if (configBroken) {
    console.log(`  · ${label} — skipped`);
    return;
  }
  if (cond) console.log(`  ✓ ${label}`);
  else {
    failures++;
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
  }
};
const skip = (label: string, why: string) => console.log(`  · ${label} — skipped (${why})`);

console.log(`\nContent Studio gate — ${BASE}`);

/* ------------------------------------------------------ anonymous access */

/* ------------------------------------------------------- configuration first */

// Checked before anything else, because an unconfigured deployment fails four
// gate assertions in ways that read like a broken gate rather than a missing
// environment variable — which is exactly how the first live check of this was
// misread.
{
  const loginProbe = await (await fetch(`${BASE}/admin/login`)).text();
  if (/belum terhubung ke database/i.test(loginProbe)) {
    const names = [...loginProbe.matchAll(/<code>(NEXT_PUBLIC_[A-Z_]+)<\/code>/g)].map((m) => m[1]);
    configBroken = true;
    failures++;
    console.error(
      `\n  ✗ this deployment has no Supabase credentials` +
        `\n      missing: ${names.join(', ') || '(see /admin/login)'}` +
        `\n      Set them in the hosting project and redeploy.` +
        `\n      Every check below would fail for that one reason, so they are skipped.`
    );
  }
}

console.log('\nanonymous browser');

// `redirect: 'manual'` so the redirect itself is the assertion. Following it
// would report 200 for the login page and hide whether the gate ever fired.
const bare = await fetch(`${BASE}/admin`, { redirect: 'manual' });
ok(
  '/admin redirects an anonymous request',
  bare.status >= 300 && bare.status < 400,
  `got ${bare.status}`
);

const location = bare.headers.get('location') ?? '';
ok(
  '…and sends it to the login form',
  location.includes('/admin/login'),
  `Location: ${location || '(none)'}`
);

ok(
  '…preserving where it was headed',
  location.includes('next=%2Fadmin') || location.includes('next=/admin'),
  `Location: ${location}`
);

// A nested path must be gated too — a matcher that only covered the index would
// leave every editor route open.
const nested = await fetch(`${BASE}/admin/lokasi/bogor`, { redirect: 'manual' });
ok(
  'nested admin paths redirect as well',
  nested.status >= 300 && nested.status < 400 && (nested.headers.get('location') ?? '').includes('/admin/login'),
  `got ${nested.status} → ${nested.headers.get('location') ?? '(none)'}`
);

// No fragment of the dashboard may appear in an anonymous response body.
const bareBody = await (await fetch(`${BASE}/admin`)).text();
ok(
  'no dashboard content leaks into the anonymous response',
  !bareBody.includes('cs-stat-value') && !bareBody.includes('Editan tertunda'),
  'the redirect target rendered admin data'
);

/* ------------------------------------------------------------- indexability */

console.log('\nindexability');

const loginRes = await fetch(`${BASE}/admin/login`);
const loginBody = await loginRes.text();

ok('login form is reachable', loginRes.ok, `got ${loginRes.status}`);

// robots.txt cannot keep a URL out of the index — it only stops the crawl, and
// a URL discovered elsewhere can still be listed. The meta tag is what removes
// it, so it must be present on every deployment regardless of ALLOW_INDEXING.
const robotsMeta = /<meta[^>]+name="robots"[^>]+content="([^"]+)"/i.exec(loginBody)?.[1] ?? '';
ok(
  'login page sends noindex, nofollow',
  /noindex/i.test(robotsMeta) && /nofollow/i.test(robotsMeta),
  `robots meta: "${robotsMeta || '(none)'}"`
);

const robotsTxt = await (await fetch(`${BASE}/robots.txt`)).text();
ok(
  'robots.txt keeps crawlers out of /admin',
  /Disallow: \/$/m.test(robotsTxt) || /Disallow: \/admin/m.test(robotsTxt),
  robotsTxt.slice(0, 200)
);

const sitemap = await (await fetch(`${BASE}/sitemap.xml`)).text();
ok('sitemap never lists an admin URL', !sitemap.includes('/admin'));

/* -------------------------------------------------- signed in, not an admin */

console.log('\nsigned in, not allowlisted');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !publishable || !secret) {
  skip('non-admin session is rejected', 'Supabase credentials not set');
} else {
  const service = createClient(url, secret, { auth: { persistSession: false } });
  const email = `verify-admin-${Date.now()}@example.invalid`;
  const password = `pw-${Math.random().toString(36).slice(2)}-${Date.now()}`;

  const { data: created, error: createErr } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createErr || !created.user) {
    skip('non-admin session is rejected', createErr?.message ?? 'user creation failed');
  } else {
    try {
      const anon = createClient(url, publishable, { auth: { persistSession: false } });
      const { data: session, error: signInErr } = await anon.auth.signInWithPassword({
        email,
        password,
      });

      ok('a non-admin account can still authenticate', !signInErr && Boolean(session.session));

      // This is the assertion that matters: a valid JWT is not authorisation.
      // The account exists and is signed in; the allowlist is what stops it.
      const asUser = createClient(url, publishable, {
        auth: { persistSession: false },
        global: { headers: { Authorization: `Bearer ${session.session?.access_token}` } },
      });

      const { data: allow } = await asUser.from('admins').select('user_id');
      ok('…but sees no rows in the allowlist', (allow ?? []).length === 0, `got ${(allow ?? []).length}`);

      // An UPDATE blocked by RLS is not an error. `using (is_admin())` makes
      // zero rows visible to the statement, so it updates nothing and PostgREST
      // reports success — asserting on `error` here would pass against a policy
      // that had been dropped entirely. What has to be checked is the row.
      const CANARY = 'verify-admin should never land';
      const before = await service.from('locations').select('h1').eq('key', 'bogor').single();

      const { data: updated } = await asUser
        .from('locations')
        .update({ h1: CANARY })
        .eq('key', 'bogor')
        .select('key');
      ok(
        '…and its update to locations touches no rows',
        (updated ?? []).length === 0,
        `${(updated ?? []).length} row(s) came back`
      );

      const after = await service.from('locations').select('h1').eq('key', 'bogor').single();
      ok(
        '…leaving the row exactly as it was',
        after.data?.h1 === before.data?.h1 && after.data?.h1 !== CANARY,
        `h1 is now "${after.data?.h1}"`
      );

      // An INSERT has no existing row to filter away, so `with check` has to
      // reject it outright. This is the half that does surface as an error, and
      // it is what proves the policy is evaluated on writes at all.
      const { error: insertErr } = await asUser.from('locations').insert({
        key: `verify-admin-${Date.now()}`,
        slug: `verify-admin-${Date.now()}`,
        name: 'Verify Admin',
        code: 'VFY',
        page_type: 'city',
        template: 'city',
        variant: 'navy',
        country: 'ID',
        h1: CANARY,
      });
      ok('…and cannot insert a new location', Boolean(insertErr), 'the insert was accepted');

      const { data: drafts, error: draftErr } = await asUser.from('content_drafts').select('entity');
      ok(
        '…and cannot read staged drafts',
        Boolean(draftErr) || (drafts ?? []).length === 0,
        `got ${(drafts ?? []).length} row(s)`
      );
    } finally {
      await service.auth.admin.deleteUser(created.user.id);
      console.log('  · throwaway account removed');
    }
  }
}

/* -------------------------------------------------------------------- done */

// `process.exitCode` rather than `process.exit()`. Exiting while undici still
// holds keep-alive sockets aborts the process on Windows with a libuv assertion,
// which replaced the real exit code with 127 and printed what looked like a
// crash underneath the diagnosis. Setting the code and letting the event loop
// drain gives a clean 1.
if (failures) {
  console.error(
    configBroken
      ? '\nNothing could be checked — set the credentials and run this again.\n'
      : `\n${failures} check(s) failed.\n`
  );
  process.exitCode = 1;
} else {
  console.log('\nGate is closed.\n');
}
