/**
 * Layout QA across the devices the site is actually reviewed and used on.
 *
 * Indonesian traffic is overwhelmingly mobile, and the narrowest real viewport
 * is not an iPhone — a folded Galaxy Z Fold is ~344px, well below the 375px
 * most "mobile" testing stops at. Price tables and image grids break there
 * first, so it leads the list.
 *
 * Drives Chrome over CDP directly (no puppeteer dependency).
 *
 *   npx next start -p 3100
 *   npm run qa:devices
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9225;
const BASE = process.env.QA_ORIGIN ?? 'http://localhost:3100';
const SHOTS = join(process.cwd(), '.qa-shots');

const PAGES = [
  '/',
  '/en',
  '/sewa-mobil',
  '/sewa-mobil-bogor',
  '/sewa-mobil-yogyakarta',
  '/sewa-mobil-bali',
  '/sewa-mobil-singapura',
  '/sewa-mobil-thailand',
  '/sewa-mobil-malaysia',
  '/travel',
  '/blog',
  '/blog/itinerari-puncak-satu-hari',
];

// CSS pixel sizes, not physical. The Fold's cover display is the tightest
// mainstream viewport in circulation.
const DEVICES = [
  { name: 'Fold cover', w: 344, h: 882, mobile: true },
  { name: 'iPhone 15', w: 393, h: 852, mobile: true },
  { name: 'Fold open', w: 884, h: 1104, mobile: true },
  // Exactly the breakpoint where the burger gives way to the full desktop nav.
  // The bar has to fit logo + links + ID|EN pill + CTA in 768px, so this is
  // where an extra nav item overflows first — and nothing else in this list
  // covers 768–819.
  { name: 'Nav breakpoint', w: 768, h: 1024, mobile: true },
  { name: 'iPad portrait', w: 820, h: 1180, mobile: true },
  { name: 'iPad landscape', w: 1180, h: 820, mobile: true },
  { name: 'Desktop', w: 1440, h: 900, mobile: false },
];

mkdirSync(SHOTS, { recursive: true });

const profile = mkdtempSync(join(tmpdir(), 'cdp-qa-'));
const chrome = spawn(CHROME, [
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profile}`,
  '--headless=new',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  'about:blank',
]);
chrome.stderr.on('data', () => {});

async function waitForCdp() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (r.ok) return (await r.json()).webSocketDebuggerUrl;
    } catch {
      /* not up yet */
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
    const { resolve, reject } = pending.get(m.id);
    pending.delete(m.id);
    if (m.error) reject(new Error(JSON.stringify(m.error)));
    else resolve(m.result);
  }
};
const send = (method, params = {}, sessionId) =>
  new Promise((resolve, reject) => {
    const msgId = ++id;
    pending.set(msgId, { resolve, reject });
    ws.send(JSON.stringify({ id: msgId, method, params, sessionId }));
  });

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
await send('Page.enable', {}, sessionId);
await send('Runtime.enable', {}, sessionId);

/**
 * Runs in the page. Reports the culprit element for an overflow rather than
 * just the fact of it — "scrollWidth is 12px too wide" is not actionable.
 */
const probeFor = (touch) => `(() => {
  const TOUCH = ${touch};
  const vw = document.documentElement.clientWidth;
  const out = { vw, overflowX: document.documentElement.scrollWidth - vw, culprits: [], ratios: [], taps: [], clipped: [], anchors: [], order: null };

  // Document order. These pages lay their sections out with flex \`order\`, which
  // silently reshuffles them if one sibling forgets to set it — the header shipped
  // at the BOTTOM of /, /en and /travel that way, because those screens compose
  // sections inline with the default order:0 while the header asked for 10.
  // Nothing else here would catch that: no overflow, correct ratios, every link
  // still clickable.
  {
    const header = document.querySelector('header');
    const footer = document.querySelector('footer');
    const main = document.querySelector('section, main');
    if (header) {
      const h = header.getBoundingClientRect().top + window.scrollY;
      const firstSection = [...document.querySelectorAll('section')]
        .map((s) => s.getBoundingClientRect().top + window.scrollY)
        .sort((a, b) => a - b)[0];
      const f = footer ? footer.getBoundingClientRect().top + window.scrollY : Infinity;
      out.order = {
        headerTop: Math.round(h),
        firstSectionTop: firstSection === undefined ? null : Math.round(firstSection),
        footerTop: f === Infinity ? null : Math.round(f),
        headerFirst: firstSection === undefined ? true : h <= firstSection,
        footerLast: f === Infinity ? true : f >= (firstSection ?? 0),
      };
    }
    void main;
  }

  // Every in-page anchor must land BELOW the sticky header, not behind it.
  //
  // Without \`scroll-padding-top\` all eleven of them arrived at y=0 with 59px of
  // header on top, so the heading you jumped to was the one thing you could not
  // see. Invisible to every other check here — no overflow, nothing clipped, the
  // link works — and only findable by performing the jump and measuring.
  {
    const header = document.querySelector('header');
    const headerH = header ? Math.round(header.getBoundingClientRect().height) : 0;
    const anchors = [...document.querySelectorAll('a[href^="#"]')]
      .map((a) => a.getAttribute('href').slice(1))
      .filter((id) => id && document.getElementById(id));
    const before = window.scrollY;

    // \`scroll-behavior: smooth\` makes scrollIntoView() animate, so measuring
    // straight after it reads a position part-way through the scroll rather than
    // where the jump lands. The first version of this check did exactly that and
    // passed against a build with no scroll-padding-top at all.
    const prev = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'auto';

    for (const id of [...new Set(anchors)]) {
      const el = document.getElementById(id);
      window.scrollTo(0, 0);
      el.scrollIntoView();
      const top = Math.round(el.getBoundingClientRect().top);
      if (top < headerH) out.anchors.push({ id, top, headerH, hidden: headerH - top });
    }

    window.scrollTo(0, before);
    document.documentElement.style.scrollBehavior = prev;
  }

  if (out.overflowX > 0) {
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.right > vw + 1 || r.left < -1) {
        out.culprits.push({
          tag: el.tagName.toLowerCase(),
          cls: (typeof el.className === 'string' ? el.className : '').slice(0, 50),
          txt: (el.textContent || '').trim().slice(0, 45),
          left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width),
        });
      }
    }
    // Deepest elements first: the innermost overflowing node is the real cause.
    out.culprits = out.culprits.slice(-6);
  }

  for (const img of document.querySelectorAll('img')) {
    const cs = getComputedStyle(img);
    const m = (cs.aspectRatio || '').match(/^([\\d.]+)\\s*\\/\\s*([\\d.]+)$/);
    if (!m) continue;
    const want = +m[1] / +m[2];
    const r = img.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    const got = r.width / r.height;
    if (Math.abs(got - want) / want > 0.02) {
      out.ratios.push({ alt: (img.alt || '').slice(0, 40), want: +want.toFixed(3), got: +got.toFixed(3), w: Math.round(r.width), h: Math.round(r.height) });
    }
  }

  // Touch targets. Only meaningful on touch devices — a 22px nav link is
  // correct for a mouse — so the caller gates this by device.
  //
  // What actually causes a mis-tap is a small target with a CLOSE NEIGHBOUR, not
  // a small target as such: an isolated 40px button has whitespace round it and
  // is easy to hit. So the effective target is the element plus the gap to its
  // nearest interactive neighbour, which is also what Google's "clickable
  // elements too close together" check measures. Reporting raw height instead
  // flagged a whole footer that was already comfortably tappable.
  if (TOUCH) {
    const cands = [];
    for (const el of document.querySelectorAll('a[href], button, summary, select, input')) {
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'inline') continue;
      if (cs.visibility === 'hidden' || cs.opacity === '0') continue;
      const det = el.closest('details:not([open])');
      if (det && el.tagName !== 'SUMMARY' && !el.contains(det.querySelector('summary'))) continue;
      cands.push({ el, r });
    }

    for (const { el, r } of cands) {
      if (r.height >= 44) continue;
      // Nearest interactive neighbour that overlaps horizontally.
      let gap = Infinity;
      let near = null;
      for (const o of cands) {
        if (o.el === el) continue;
        // Fixed elements (the WhatsApp FAB) float over whatever happens to be
        // beneath them as the page scrolls. They are not layout neighbours, and
        // counting them turns "this link is in a dense stack" into a false
        // positive that changes with scroll position.
        if (getComputedStyle(o.el).position === 'fixed') continue;
        const overlapsX = o.r.right > r.left + 1 && o.r.left < r.right - 1;
        if (!overlapsX) continue;
        const d = o.r.top >= r.bottom ? o.r.top - r.bottom : r.top >= o.r.bottom ? r.top - o.r.bottom : 0;
        if (d < gap) {
          gap = d;
          near = (o.el.getAttribute('aria-label') || (o.el.textContent || '').trim() || o.el.tagName).slice(0, 28);
        }
      }
      // Half-pixel tolerance: sub-pixel layout makes an exactly-44px target
      // measure 43.98 and report as a failure at 44px.
      const effective = r.height + (gap === Infinity ? 44 : gap);
      if (effective >= 43.5) continue;

      const img = el.querySelector('img');
      const name =
        el.getAttribute('aria-label') ||
        (el.textContent || '').trim() ||
        (img && img.alt) ||
        el.getAttribute('title') ||
        '(no accessible name)';
      out.taps.push({
        tag: el.tagName.toLowerCase(),
        txt: name.slice(0, 36),
        h: Math.round(r.height),
        w: Math.round(r.width),
        gap: gap === Infinity ? '∞' : Math.round(gap),
        eff: Math.round(effective),
        near: near ?? '(isolated)',
      });
    }
    const seen = new Set();
    out.taps = out.taps.filter((t) => {
      const k = t.tag + t.txt + t.h;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  // Text wider than its own box: a price or model name being visually cut.
  for (const el of document.querySelectorAll('h1,h2,h3,p,span,td,th,li,strong')) {
    if (el.children.length) continue;
    if (el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0) {
      const cs = getComputedStyle(el);
      if (cs.overflow === 'visible' && cs.textOverflow !== 'ellipsis') continue;
      out.clipped.push({ tag: el.tagName.toLowerCase(), txt: (el.textContent || '').trim().slice(0, 40), sw: el.scrollWidth, cw: el.clientWidth });
    }
  }
  out.clipped = out.clipped.slice(0, 5);

  return JSON.stringify(out);
})()`;

let problems = 0;
const summary = [];

for (const dev of DEVICES) {
  console.log(`\n${dev.name} — ${dev.w}×${dev.h}`);
  await send(
    'Emulation.setDeviceMetricsOverride',
    { width: dev.w, height: dev.h, deviceScaleFactor: 1, mobile: dev.mobile },
    sessionId
  );
  // setDeviceMetricsOverride resizes the viewport but does NOT set the pointer
  // media feature, so `@media (pointer: coarse)` rules stay inactive and any
  // touch-specific CSS is invisible to this sweep. Emulate it explicitly.
  await send(
    'Emulation.setEmulatedMedia',
    {
      features: dev.mobile
        ? [
            { name: 'pointer', value: 'coarse' },
            { name: 'any-pointer', value: 'coarse' },
            { name: 'hover', value: 'none' },
          ]
        : [
            { name: 'pointer', value: 'fine' },
            { name: 'any-pointer', value: 'fine' },
            { name: 'hover', value: 'hover' },
          ],
    },
    sessionId
  );
  await send('Emulation.setTouchEmulationEnabled', { enabled: dev.mobile }, sessionId);

  for (const page of PAGES) {
    await send('Page.navigate', { url: BASE + page }, sessionId);
    // Long enough for the GSAP entrance animations to settle. Measuring during
    // them reports transient sizes — the WhatsApp FAB reads 42px mid-scale when
    // its resting size is 58px.
    await new Promise((r) => setTimeout(r, 2600));
    const { result } = await send(
      'Runtime.evaluate',
      { expression: probeFor(dev.mobile), returnByValue: true },
      sessionId
    );
    const o = JSON.parse(result.value);

    const issues = [];
    if (o.overflowX > 0) issues.push(`overflow-x ${o.overflowX}px`);
    if (o.ratios.length) issues.push(`${o.ratios.length} image ratio`);
    if (o.taps.length) issues.push(`${o.taps.length} small tap target`);
    if (o.clipped.length) issues.push(`${o.clipped.length} clipped text`);
    if (o.anchors.length) issues.push(`${o.anchors.length} anchor behind header`);
    if (o.order && !o.order.headerFirst) issues.push('HEADER NOT AT TOP');
    if (o.order && !o.order.footerLast) issues.push('FOOTER NOT AT BOTTOM');

    const label = page.padEnd(34);
    if (issues.length) {
      problems++;
      summary.push(`${dev.name} ${page}: ${issues.join(', ')}`);
      console.log(`  ✗ ${label} ${issues.join(', ')}`);
      if (o.order && (!o.order.headerFirst || !o.order.footerLast))
        console.log(
          `       order: header@${o.order.headerTop} firstSection@${o.order.firstSectionTop} footer@${o.order.footerTop}`
        );
      for (const a of o.anchors)
        console.log(`       anchor: #${a.id} lands at ${a.top}px, ${a.hidden}px under a ${a.headerH}px header`);
      for (const c of o.culprits) console.log(`       overflow: <${c.tag} class="${c.cls}"> right=${c.right} vw=${o.vw} "${c.txt}"`);
      for (const r of o.ratios) console.log(`       ratio: "${r.alt}" want ${r.want} got ${r.got} (${r.w}×${r.h})`);
      for (const t of o.taps)
        console.log(
          `       tap: <${t.tag}> ${t.w}×${t.h}px, gap ${t.gap} to "${t.near}" → effective ${t.eff}px  "${t.txt}"`
        );
      for (const c of o.clipped) console.log(`       clipped: <${c.tag}> ${c.sw}>${c.cw} "${c.txt}"`);

      const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }, sessionId);
      const file = join(SHOTS, `${dev.name.replace(/\s+/g, '-')}${page.replace(/\//g, '_') || '_home'}.png`);
      writeFileSync(file, Buffer.from(shot.data, 'base64'));
      console.log(`       → ${file}`);
    } else {
      console.log(`  ✓ ${label} clean`);
    }
  }
}

console.log(`\n${'─'.repeat(70)}`);
if (problems) {
  console.log(`${problems} page/device combination(s) with problems:\n`);
  summary.forEach((s) => console.log(`  · ${s}`));
  console.log(`\nScreenshots in ${SHOTS}\n`);
} else {
  console.log(`All ${PAGES.length} pages clean across ${DEVICES.length} devices.\n`);
}

ws.close();
chrome.kill();
process.exit(problems ? 1 : 0);
