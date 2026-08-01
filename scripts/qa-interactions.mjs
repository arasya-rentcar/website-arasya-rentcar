/**
 * Drives every interactive path the way a visitor would, on a touch viewport.
 *
 * The layout sweep proves nothing moved; this proves things still *work*. Both
 * matter because most of this page is server-rendered — a broken filter or a
 * dead tariff checker looks completely fine in a screenshot.
 *
 *   npx next start -p 3100
 *   npm run qa:interactions
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9227;
const BASE = process.env.QA_ORIGIN ?? 'http://localhost:3100';
const WA_NUMBER = process.env.QA_WA_NUMBER ?? '';

const profile = mkdtempSync(join(tmpdir(), 'cdp-int-'));
const chrome = spawn(CHROME, [
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profile}`,
  '--headless=new',
  '--disable-gpu',
  '--no-first-run',
  'about:blank',
]);
chrome.stderr.on('data', () => {});

async function waitForCdp() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (r.ok) return (await r.json()).webSocketDebuggerUrl;
    } catch {
      /* not up */
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error('CDP never came up');
}

const ws = new WebSocket(await waitForCdp());
await new Promise((res, rej) => {
  ws.onopen = res;
  ws.onerror = rej;
});
let id = 0;
const pending = new Map();
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) {
    const p = pending.get(m.id);
    pending.delete(m.id);
    if (m.error) p.reject(new Error(JSON.stringify(m.error)));
    else p.resolve(m.result);
  }
};
const send = (method, params = {}, sessionId) =>
  new Promise((resolve, reject) => {
    const i = ++id;
    pending.set(i, { resolve, reject });
    ws.send(JSON.stringify({ id: i, method, params, sessionId }));
  });

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
await send('Page.enable', {}, sessionId);
await send('Runtime.enable', {}, sessionId);
await send('Emulation.setDeviceMetricsOverride', { width: 393, height: 852, deviceScaleFactor: 2, mobile: true }, sessionId);

let failures = 0;
const ok = (label, cond, detail = '') => {
  if (cond) console.log(`  ✓ ${label}`);
  else {
    failures++;
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
  }
};

async function go(path) {
  await send('Page.navigate', { url: BASE + path }, sessionId);
  await new Promise((r) => setTimeout(r, 1900));
}
async function evalIn(expr) {
  const { result, exceptionDetails } = await send(
    'Runtime.evaluate',
    { expression: expr, returnByValue: true, awaitPromise: true },
    sessionId
  );
  if (exceptionDetails) throw new Error(JSON.stringify(exceptionDetails));
  return result.value;
}

/* --------------------------------------------------------- WhatsApp CTAs */

// Per-page routing: every CTA on a page must dial that page's number, and pages
// routed to different numbers must actually differ. A single wrong link sends a
// lead to the wrong inbox, and nothing on screen would reveal it.
// Derived from the data, never hardcoded. Hardcoded numbers turn a routing
// change into a spurious test failure, and — worse — would still pass if the
// data said one thing and the page rendered another. This asserts the page
// matches what the registry actually specifies, so it holds whether every entry
// shares one inbox or each city has its own.
const snapshot = JSON.parse(readFileSync(new URL('../src/data/registry-snapshot.json', import.meta.url), 'utf8'));
const waDigits = (s) => {
  const d = String(s ?? '').replace(/\D/g, '');
  if (!d) return '';
  return d.startsWith('0') ? '62' + d.replace(/^0+/, '') : d;
};
const GLOBAL_WA = waDigits(snapshot.site.settings.waPhone);
// Derived, not hardcoded: adding a seventh service area should extend the
// expectation automatically rather than fail a magic number.
const EXPECTED_CITIES = snapshot.locations.length;
const expectedFor = (path) => {
  const loc = snapshot.locations.find((l) => `/${l.slug}` === path);
  if (loc) return waDigits(loc.waPhone) || GLOBAL_WA;
  const post = snapshot.posts.find((p) => `/${p.slug}` === path);
  if (post) {
    const city = snapshot.locations.find((l) => l.key === post.cityKey);
    return waDigits(city?.waPhone) || GLOBAL_WA;
  }
  return GLOBAL_WA; // home, hub, travel, blog index
};

const seenNumbers = new Map();

console.log('\nWhatsApp links');
for (const path of [
  '/',
  '/sewa-mobil-bogor',
  '/sewa-mobil-yogyakarta',
  '/sewa-mobil-singapura',
  '/travel',
  '/blog',
  '/blog/itinerari-puncak-satu-hari',
  '/blog/borobudur-sunrise-dari-jogja',
]) {
  await go(path);
  const info = await evalIn(`(() => {
    const as = [...document.querySelectorAll('a[href*="wa.me"]')];
    const bad = as.filter(a => {
      const u = new URL(a.href);
      return !/^\\/\\d{8,}$/.test(u.pathname) || !u.searchParams.get('text');
    });
    const refs = as.map(a => (new URL(a.href).searchParams.get('text')||'').match(/Ref:\\s*([A-Z0-9-]+)/i)?.[1]).filter(Boolean);
    return JSON.stringify({
      total: as.length,
      bad: bad.length,
      numbers: [...new Set(as.map(a => new URL(a.href).pathname.slice(1)))],
      refs: [...new Set(refs)].slice(0, 6),
    });
  })()`);
  const o = JSON.parse(info);
  ok(`${path}: ${o.total} wa.me links, all well-formed`, o.total > 0 && o.bad === 0, `${o.bad} malformed`);
  // Every CTA on the page shares one number — a mixed page means some link
  // escaped the routing.
  ok(`${path}: all CTAs dial one number (${o.numbers.join(', ')})`, o.numbers.length === 1);
  const want = expectedFor(path);
  ok(`${path}: dials the number the registry specifies (${want})`, o.numbers[0] === want, `got ${o.numbers[0]}`);
  if (WA_NUMBER) ok(`${path}: number is ${WA_NUMBER}`, o.numbers[0] === WA_NUMBER, o.numbers[0]);
  ok(`${path}: ref codes present (${o.refs.slice(0, 3).join(', ')}…)`, o.refs.length > 0);
  seenNumbers.set(path, o.numbers[0]);
}

// When entries ARE routed apart, prove the pages really differ. Skipped while
// everything shares one inbox, because then there is nothing to distinguish —
// the mechanism itself is unit-tested offline by `verify:content`, which does not
// depend on how the numbers happen to be assigned today.
{
  const routed = snapshot.locations.filter((l) => l.waPhone);
  const distinct = new Set(routed.map((l) => waDigits(l.waPhone)));
  if (distinct.size > 1) {
    const rendered = new Set([...seenNumbers.entries()].filter(([p]) => p.startsWith('/sewa-mobil-')).map(([, n]) => n));
    ok('pages routed apart render different numbers', rendered.size > 1, [...rendered].join(', '));
  } else {
    console.log(`  · all entries share ${GLOBAL_WA} — no per-page split to verify`);
  }
}

console.log('\nthe dialled number agrees with the anti-fraud panel');
{
  await go('/sewa-mobil-yogyakarta');
  const res = await evalIn(`(() => {
    const wa = new URL(document.querySelector('a[href*="wa.me"]').href).pathname.slice(1);
    const shown = (document.body.innerText.match(/0\\d{3}-\\d{3,4}-\\d{3,4}/g) || []);
    return JSON.stringify({ wa, shown: [...new Set(shown)] });
  })()`);
  const o = JSON.parse(res);
  const asLocal = '0' + o.wa.slice(2);
  const shownDigits = o.shown.map((d) => d.replace(/\D/g, ''));
  ok(
    `the dialled number is displayed on the page (${o.shown.join(', ')})`,
    shownDigits.includes(asLocal),
    `dials ${o.wa} (= ${asLocal}) but the page shows ${o.shown.join(', ')}`
  );
  ok('all official numbers still listed', o.shown.length >= 3, `only ${o.shown.length} shown`);
}

/* ------------------------------------------------------- native disclosure */

console.log('\nFAQ accordion + burger (native <details>)');
await go('/sewa-mobil-bogor');
{
  // The first item ships open, so clicking it would *close* one. Target a
  // closed item to prove opening works.
  const before = await evalIn(`document.querySelectorAll('#faq details[open]').length`);
  await evalIn(`document.querySelector('#faq details:not([open]) summary')?.click(), true`);
  await new Promise((r) => setTimeout(r, 350));
  const after = await evalIn(`document.querySelectorAll('#faq details[open]').length`);
  ok(`FAQ item opens on click (${before} → ${after})`, after === before + 1);

  await evalIn(`document.querySelector('#faq details[open] summary')?.click(), true`);
  await new Promise((r) => setTimeout(r, 350));
  const closed = await evalIn(`document.querySelectorAll('#faq details[open]').length`);
  ok(`FAQ item closes again (${after} → ${closed})`, closed === after - 1);

  // Target `.site-nav-burger` explicitly. The header now holds two <details> —
  // the burger and the desktop "Area Layanan" dropdown — and a bare
  // `header details` selector matches whichever comes first in the DOM, which
  // is not the one this is about.
  const navBefore = await evalIn(`!!document.querySelector('.site-nav-burger[open]')`);
  await evalIn(`document.querySelector('.site-nav-burger > summary')?.click(), true`);
  await new Promise((r) => setTimeout(r, 350));
  const navAfter = await evalIn(`!!document.querySelector('.site-nav-burger[open]')`);
  ok('burger menu opens', navAfter && !navBefore);

  const linksVisible = await evalIn(
    `[...document.querySelectorAll('.site-nav-burger a')].filter(a => a.getBoundingClientRect().height > 0).length`
  );
  ok(`burger reveals nav links (${linksVisible})`, linksVisible > 0);

  // Every service area must be reachable from the menu, on every page. That is
  // the whole point of moving them into the nav: a city used to be two clicks
  // and two page loads away via the hub, and unreachable from a city page
  // except through the footer.
  const areas = JSON.parse(
    await evalIn(
      `JSON.stringify([...document.querySelectorAll('.site-nav-burger a')]
        .map(a => a.getAttribute('href'))
        .filter(h => h && h !== '/' && !h.startsWith('#')))`
    )
  );
  const cityLinks = areas.filter((h) => /sewa-mobil-/.test(h));
  ok(`menu links every service area (${cityLinks.length})`, cityLinks.length === EXPECTED_CITIES);
  ok('menu links the hub', areas.some((h) => /\/sewa-mobil$/.test(h)));
  ok('menu links travel and blog', areas.some((h) => /travel$/.test(h)) && areas.some((h) => /blog$/.test(h)));
}

/* ---------------------------------------------------------- menu dismissal */

/*
 * Native <details> opens and closes from its summary and does nothing else: it
 * stays open when you click the page, and when you press Escape. Both were
 * reported as "sangat tidak nyaman" and both are real — a menu that only closes
 * from the control that opened it is not a menu.
 */
console.log('\nmenu dismissal');
await go('/sewa-mobil-bogor');
{
  const open = () => evalIn(`document.querySelector('.site-nav-burger > summary').click(), true`);
  const isOpen = () => evalIn(`!!document.querySelector('.site-nav-burger[open]')`);

  await open();
  await new Promise((r) => setTimeout(r, 250));
  ok('opens from the summary', await isOpen());

  // A press on the page, not on a link inside the menu.
  await evalIn(`document.querySelector('h1').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })), true`);
  await new Promise((r) => setTimeout(r, 250));
  ok('closes on a press outside', (await isOpen()) === false);

  await open();
  await new Promise((r) => setTimeout(r, 250));
  await evalIn(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })), true`);
  await new Promise((r) => setTimeout(r, 250));
  ok('closes on Escape', (await isOpen()) === false);
  ok(
    'Escape returns focus to the summary',
    await evalIn(`document.activeElement === document.querySelector('.site-nav-burger > summary')`)
  );

  // Scoped: Escape must not collapse an FAQ item the reader is part-way through.
  await evalIn(`document.querySelector('#faq details:not([open]) summary')?.click(), true`);
  await new Promise((r) => setTimeout(r, 250));
  const faqBefore = await evalIn(`document.querySelectorAll('#faq details[open]').length`);
  await evalIn(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })), true`);
  await new Promise((r) => setTimeout(r, 250));
  const faqAfter = await evalIn(`document.querySelectorAll('#faq details[open]').length`);
  ok(`Escape leaves the FAQ alone (${faqBefore} → ${faqAfter})`, faqAfter === faqBefore);
}

/* ----------------------------------------------------- current page marker */

console.log('\ncurrent page is marked');
{
  for (const [path, expected] of [
    ['/', 'Beranda'],
    ['/travel', 'Travel'],
    ['/blog', 'Blog'],
    ['/blog/itinerari-puncak-satu-hari', 'Blog'],
    ['/sewa-mobil', 'Area Layanan'],
    ['/sewa-mobil-bogor', 'Area Layanan'],
  ]) {
    await go(path);
    const marked = JSON.parse(
      await evalIn(
        `JSON.stringify([...document.querySelectorAll('header [aria-current="page"], header .is-current')]
          .map(el => el.textContent.replace(/[▼▲]/g,'').trim()))`
      )
    );
    ok(`${path} marks "${expected}" (${marked.join(', ') || 'nothing'})`, marked.includes(expected));
  }

  // A city page marks both the dropdown and the city inside it.
  await go('/sewa-mobil-bogor');
  const inPanel = await evalIn(
    `!!document.querySelector('.site-nav-drop-panel a[aria-current="page"]')`
  );
  ok('the city itself is marked inside the dropdown', inPanel);
}

/* ------------------------------------------------- nav identical everywhere */

// The owner's complaint was that the navbar changed from page to page. It is
// now derived from one function, so this asserts the outcome rather than
// trusting that nothing re-forks it later.
//
// Scoped to `[data-nav="items"]`, which is the navigation proper. The CTA and
// the ID|EN pill sit outside it and legitimately differ: the blog's WhatsApp
// button is always visible so it never enters the menu, and the language pill
// only appears where the page exists in both locales — which today means the
// home, hub and travel pages, and will mean all of them once the English city
// content lands.
console.log('\nnav is identical on every page type');
{
  const sig = async (path) => {
    await go(path);
    return evalIn(
      `JSON.stringify([...document.querySelectorAll('.site-nav-burger [data-nav="items"] a')].map(a => a.textContent.trim()))`
    );
  };
  const home = await sig('/');
  for (const path of ['/sewa-mobil', '/sewa-mobil-bogor', '/sewa-mobil-thailand', '/travel', '/blog', '/blog/itinerari-puncak-satu-hari']) {
    const other = await sig(path);
    ok(`${path} matches the home nav`, other === home, `got ${other}`);
  }
}

/* ----------------------------------------------------------- hub filter */

console.log('\nhub region filter');
await go('/sewa-mobil');
{
  // Scoped to the directory section. The footer's "Kota Layanan Lain" mesh also
  // links every city and is deliberately never filtered — counting those made
  // this look broken when it was not.
  const CARDS = `[...document.querySelectorAll('#kota a[data-cta="hub-card"]')]`;
  const all = await evalIn(`${CARDS}.length`);
  ok(`directory shows city cards (${all})`, all > 0);

  const labels = JSON.parse(await evalIn(`JSON.stringify([...document.querySelectorAll('#kota button')].map(b=>b.textContent.trim()))`));
  const target = labels.find((l) => /Luar Negeri/i.test(l));
  ok(`has a "Luar Negeri" filter (${labels.join(', ')})`, Boolean(target));
  if (target) {
    await evalIn(`[...document.querySelectorAll('#kota button')].find(b=>/Luar Negeri/i.test(b.textContent))?.click(), true`);
    await new Promise((r) => setTimeout(r, 500));
    const shown = JSON.parse(await evalIn(`JSON.stringify(
      ${CARDS}.filter(a => a.getBoundingClientRect().height > 0).map(a => a.getAttribute('href')))`));
    const domestic = shown.filter((h) => /(bogor|yogyakarta|bali)/.test(h));
    ok(
      `filter hides domestic cities (${shown.length} card(s) shown)`,
      shown.length > 0 && domestic.length === 0,
      `still visible: ${domestic.join(', ')}`
    );
    ok(
      'remaining cards are the overseas ones',
      shown.every((h) => /(singapura|thailand|malaysia)/.test(h)),
      shown.join(', ')
    );
  }
}

/* ------------------------------------------------------ blog category filter */

console.log('\nblog category filter');
await go('/blog');
{
  const labels = JSON.parse(await evalIn(`JSON.stringify([...document.querySelectorAll('button')].map(b=>b.textContent.trim()))`));
  ok(`category buttons present (${labels.join(', ')})`, labels.length > 1);
  // Cards are links to /blog/{slug}; the filter re-renders the list rather than
  // hiding nodes, so count post links inside the list section.
  const POSTS = `[...new Set([...document.querySelectorAll('a[href^="/blog/"]')].map(a=>a.getAttribute('href')))]`;
  const before = JSON.parse(await evalIn(`JSON.stringify(${POSTS})`));
  ok(`lists all posts unfiltered (${before.length})`, before.length === 3);

  await evalIn(`[...document.querySelectorAll('button')].find(b=>/^Itinerari$/i.test(b.textContent.trim()))?.click(), true`);
  await new Promise((r) => setTimeout(r, 500));
  const after = JSON.parse(await evalIn(`JSON.stringify(${POSTS})`));
  ok(
    `"Itinerari" narrows the list (${before.length} → ${after.length})`,
    after.length > 0 && after.length < before.length,
    after.join(', ')
  );

  await evalIn(`[...document.querySelectorAll('button')].find(b=>/^Semua$/i.test(b.textContent.trim()))?.click(), true`);
  await new Promise((r) => setTimeout(r, 500));
  const restored = JSON.parse(await evalIn(`JSON.stringify(${POSTS})`));
  ok(`"Semua" restores the full list (${restored.length})`, restored.length === before.length);
}

/* --------------------------------------------------------- tariff checker */

console.log('\ntravel tariff checker');
await go('/travel');
{
  const selects = await evalIn(`document.querySelectorAll('select').length`);
  ok(`has selects (${selects})`, selects >= 2);

  const res = await evalIn(`(() => {
    const sels = [...document.querySelectorAll('select')];
    for (const s of sels) {
      if (s.options.length > 1) { s.selectedIndex = 1; s.dispatchEvent(new Event('change', { bubbles: true })); }
    }
    return 'set';
  })()`);
  ok('selects accept a change event', res === 'set');
  await new Promise((r) => setTimeout(r, 600));

  const priced = await evalIn(`/Rp\\s?[\\d.]+/.test(document.body.innerText)`);
  ok('a rupiah price is displayed after choosing a route', priced === true);

  const waAfter = await evalIn(`document.querySelectorAll('a[href*="wa.me"]').length`);
  ok(`WhatsApp CTA available with the quote (${waAfter})`, waAfter > 0);
}

/* ------------------------------------------------------ campaign attribution */

console.log('\ncampaign attribution');
{
  await go('/sewa-mobil-bogor?utm_source=google&utm_medium=cpc&utm_campaign=qa-test&gclid=QA123');
  await new Promise((r) => setTimeout(r, 900));
  const tagged = await evalIn(`(() => {
    const a = document.querySelector('a[href*="wa.me"]');
    if (!a) return 'no-wa-link';
    return decodeURIComponent(new URL(a.href).searchParams.get('text') || '');
  })()`);
  ok('WhatsApp message carries the [Src: …] suffix', /\[Src:/.test(tagged), tagged.slice(-90));
  ok('suffix includes source/medium', /google\/cpc/.test(tagged));
  ok('suffix includes the campaign', /qa-test/.test(tagged));
  // shared.js pushes the literal "gclid", not its value — the id is a 90-char
  // opaque string and would bloat every message. The flag tells ops the chat
  // came from a paid click; the value stays in sessionStorage.
  ok('suffix flags the paid click without inlining the gclid', /·\s*gclid/.test(tagged) && !/QA123/.test(tagged), tagged.slice(-90));

  const stored = await evalIn(`sessionStorage.getItem('arasya-campaign')`);
  ok('campaign persisted to sessionStorage', Boolean(stored), String(stored).slice(0, 80));
}

/* --------------------------------------------------------------- language */

/*
 * The pill appears exactly where the other locale exists — no more, no less.
 *
 * Derived from the snapshot rather than asserted page by page. This check used
 * to say "an untranslated city page offers no EN pill" and named a city that has
 * since been translated, so it failed on a change that was the whole point. What
 * it was really protecting is the rule: offering a pill that leads to a 404 is
 * worse than offering none, and hiding one that exists strands the reader in a
 * language they did not choose.
 */
console.log('\nlanguage toggle');
{
  const href = async () =>
    evalIn(`document.querySelector('header a[hreflang]')?.getAttribute('href') || ''`);

  await go('/');
  ok('home offers the EN pill', (await href()).startsWith('/en'));

  for (const l of snapshot.locations) {
    const translated = Boolean(l.slugEn && l.en?.h1 && l.en?.metaTitle && l.en?.metaDescription);
    await go(`/${l.slug}`);
    const got = await href();
    ok(
      `/${l.slug} ${translated ? 'offers' : 'hides'} the EN pill`,
      translated ? got === `/en/${l.slugEn}` : got === '',
      `got "${got}"`
    );
    if (!translated) continue;
    // And back again, from the English side.
    await go(`/en/${l.slugEn}`);
    const back = await href();
    ok(`/en/${l.slugEn} points back at the Indonesian page`, back === `/${l.slug}`, `got "${back}"`);
  }

  // Articles follow the same rule. The blog header carried no pill at all until
  // it had somewhere to point, which made an English article a dead end.
  for (const po of snapshot.posts) {
    const translated = Boolean(po.slugEn && po.en?.title && po.en?.metaTitle && po.en?.metaDescription);
    await go(`/${po.slug}`);
    const got = await href();
    ok(
      `/${po.slug} ${translated ? 'offers' : 'hides'} the EN pill`,
      translated ? got === `/en/${po.slugEn}` : got === '',
      `got "${got}"`
    );
    if (!translated) continue;
    await go(`/en/${po.slugEn}`);
    ok(`/en/${po.slugEn} points back`, (await href()) === `/${po.slug}`);
  }
}

console.log(`\n${'─'.repeat(60)}`);
if (failures) console.error(`${failures} interaction check(s) failed.\n`);
else console.log('Every interactive path works.\n');

ws.close();
chrome.kill();
process.exit(failures ? 1 : 0);
