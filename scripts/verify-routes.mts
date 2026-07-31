/**
 * Live check against a running server: every URL we advertise must resolve.
 *
 * Catches the failure mode that static analysis misses — a sitemap entry or an
 * hreflang alternate pointing at a route that was never built. Both are worse
 * than omission: they send crawlers to 404s and waste crawl budget.
 *
 *   npx next start -p 3100
 *   npx tsx scripts/verify-routes.mts
 *
 * Point it at a deployment with VERIFY_ORIGIN=https://… to check the real thing
 * — which is the only way to confirm a staging deploy is genuinely closed to
 * crawlers, rather than closed in a local build of the same code.
 */
import { config } from 'dotenv';

config({ path: '.env.local' });
config({ path: '.env' });

const ORIGIN = process.env.VERIFY_ORIGIN ?? 'http://localhost:3100';

/**
 * Must match the deployment under test. Both the build and this script read the
 * same .env.local, so they agree locally; when checking a remote origin, pass
 * NEXT_PUBLIC_ALLOW_INDEXING to match what that deployment was built with.
 */
const ALLOW_INDEXING = process.env.NEXT_PUBLIC_ALLOW_INDEXING === 'true';

let failures = 0;
const ok = (label: string, cond: boolean, detail = '') => {
  if (cond) console.log(`  ✓ ${label}`);
  else {
    failures++;
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
  }
};

/** Sitemap URLs are absolute against the production domain; test them locally. */
function local(url: string): string {
  const u = new URL(url);
  return ORIGIN + u.pathname + u.search;
}

async function status(url: string): Promise<number> {
  try {
    const r = await fetch(url, { redirect: 'manual' });
    return r.status;
  } catch {
    return 0;
  }
}

console.log('\nsitemap');
const sitemapXml = await (await fetch(`${ORIGIN}/sitemap.xml`)).text();
const locs = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
ok(`sitemap parses and lists URLs (${locs.length})`, locs.length > 0);

for (const loc of locs) {
  const s = await status(local(loc));
  ok(`${new URL(loc).pathname} → ${s}`, s === 200, s === 200 ? '' : `expected 200`);
}

/*
 * Every internal link the pages actually render.
 *
 * The sitemap and the hreflang set are generated from `hasEnLocation` /
 * `hasEnPost`, so they were always honest — and that is exactly why checking
 * only those two passed while every English page shipped with its whole city
 * grid 404ing. The rendering layer built hrefs with `localeHref(locale, l.slug)`,
 * prefixing /en onto Indonesian slugs to reach pages that were never generated.
 *
 * Nothing short of following the rendered anchors catches that class of bug, so
 * this crawls them. Sitemap pages are the seeds; any internal href found on one
 * is checked once, wherever it points.
 */
console.log('\ninternal links');
{
  const checked = new Map<string, number>();
  const brokenBy = new Map<string, string[]>();

  for (const loc of locs) {
    const page = new URL(loc).pathname;
    const html = await (await fetch(local(loc))).text();

    const hrefs = new Set(
      [...html.matchAll(/href="(\/[^"#?]*)/g)]
        .map((m) => m[1])
        .filter((h) => !h.startsWith('/_next/') && !h.startsWith('//'))
    );

    for (const href of hrefs) {
      let s = checked.get(href);
      if (s === undefined) {
        s = await status(ORIGIN + href);
        checked.set(href, s);
      }
      if (s !== 200) brokenBy.set(href, [...(brokenBy.get(href) ?? []), page]);
    }
  }

  for (const [href, pages] of brokenBy) {
    // Report where it was found, not just what broke — a dead href in shared
    // chrome is one fix, the same href in one template is a different one.
    ok(`${href} → ${checked.get(href)}`, false, `linked from ${pages.join(', ')}`);
  }
  ok(
    `${checked.size} distinct internal links resolve`,
    brokenBy.size === 0,
    `${brokenBy.size} dead`
  );
}

console.log('\nhreflang alternates');
const seen = new Set<string>();
for (const loc of locs) {
  const html = await (await fetch(local(loc))).text();
  const alts = [...html.matchAll(/<link[^>]+rel="alternate"[^>]*hrefLang="([^"]+)"[^>]*href="([^"]+)"/gi)];
  for (const [, lang, href] of alts) {
    const key = `${lang} ${href}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const s = await status(local(href));
    ok(`${lang} → ${new URL(href).pathname} (${s})`, s === 200);
  }
}

console.log(`\nrobots (${ALLOW_INDEXING ? 'indexable' : 'noindex'} build)`);
{
  const txt = await (await fetch(`${ORIGIN}/robots.txt`)).text();
  const blanket = /Disallow:\s*\/\s*$/m.test(txt);

  if (ALLOW_INDEXING) {
    ok('references the sitemap', /Sitemap:\s*https?:\/\/\S+\/sitemap\.xml/.test(txt));
    ok('disallows /admin', /Disallow:\s*\/admin/.test(txt));
    ok('does not disallow the whole site', !blanket);
  } else {
    // A staging deployment that is only *mostly* closed is not closed. Assert
    // the blanket disallow, and that no sitemap is advertised — handing a
    // crawler a list of URLs we are trying to keep out of the index defeats it.
    ok('disallows the whole site', blanket, txt.trim());
    ok('advertises no sitemap', !/Sitemap:/i.test(txt));
  }
}

console.log('\nmeta robots');
{
  // robots.txt governs crawling, not indexing: a page linked from elsewhere can
  // still be indexed without ever being fetched. The meta tag is what actually
  // keeps a staging deployment out of results, so it is checked separately.
  const sample = locs.slice(0, 5);
  for (const loc of sample) {
    const html = await (await fetch(local(loc))).text();
    const noindex = /<meta name="robots" content="[^"]*noindex/i.test(html);
    ok(
      `${new URL(loc).pathname} ${ALLOW_INDEXING ? 'is indexable' : 'sends noindex'}`,
      ALLOW_INDEXING ? !noindex : noindex
    );
  }
}

/*
 * Link previews. Eleven of twelve pages once had no og:image at all, which is
 * invisible from inside the site and only shows up when someone pastes the link
 * into WhatsApp — the channel this business actually runs on.
 */
console.log('\nog:image');
{
  const seenImg = new Map<string, number>();
  for (const loc of locs) {
    const html = await (await fetch(local(loc))).text();
    const m = html.match(/<meta property="og:image" content="([^"]+)"/);
    if (!m) {
      ok(`${new URL(loc).pathname} has og:image`, false, 'none emitted');
      continue;
    }
    const href = m[1];
    let s = seenImg.get(href);
    if (s === undefined) {
      s = await status(local(href));
      seenImg.set(href, s);
    }
    // A card that 404s is worse than none: the crawler caches the miss.
    ok(`${new URL(loc).pathname} og:image resolves`, s === 200, `${href} → ${s}`);
  }
}

console.log('\ncanonical self-reference');
for (const loc of locs) {
  const html = await (await fetch(local(loc))).text();
  const m = html.match(/<link rel="canonical" href="([^"]+)"/);
  const canonical = m?.[1];
  // Every indexable page must canonicalise to itself, or it de-indexes itself.
  ok(`${new URL(loc).pathname} canonical = self`, canonical === loc, `got ${canonical ?? 'none'}`);
}

if (failures) {
  console.error(`\n${failures} route assertion(s) failed.\n`);
  process.exit(1);
}
console.log('\nEvery advertised URL resolves.\n');
