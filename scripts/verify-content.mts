/**
 * Editorial rules from the handoff, enforced mechanically.
 *
 * These are positioning and compliance rules, not style preferences, and every
 * one of them is easy to violate in a single careless sentence months from now:
 *
 *  - Arasya is **never** self-drive. "Lepas kunci" on one page contradicts the
 *    entire service and the JSON-LD.
 *  - Fulfilment partners are never named. Overseas and out-of-area work is
 *    delivered through partners; the customer contracts with Arasya, and the
 *    copy must not introduce a third party.
 *  - Copy addresses the reader as "Anda". Informal address breaks the premium
 *    register the design was built around.
 *  - Landing copy must be unique per entry. Cloned paragraphs across cities are
 *    the signal that triggers doorway-page filters — the exact failure mode a
 *    programmatic-SEO site is most exposed to.
 *
 * Testimonials are deliberately exempt from the register rules: they are other
 * people's words, quoted verbatim, and real Indonesian reviews are informal
 * ("bersih banget", "ngerental"). Normalising them would be falsification.
 *
 *   npm run verify:content
 */
import snapshot from '../src/data/registry-snapshot.json' with { type: 'json' };
import type { Location, Post, Site } from '../src/types';
import { LANDING_STR } from '../src/lib/i18n';
import { officialFor, waDigits } from '../src/lib/shared';

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

/**
 * Findings that need a human, not a build failure.
 *
 * Kept separate on purpose. A check that fails on editorial judgement gets
 * muted, and then it is no longer guarding the rules that are genuinely
 * non-negotiable. These are collected and printed for the copy review instead.
 */
const findings: string[] = [];
const note = (label: string, detail: string) => findings.push(`${label}\n      ${detail}`);

/* ------------------------------------------------- collect authored strings */

interface Field {
  where: string;
  text: string;
}
const fields: Field[] = [];
const add = (where: string, text: string | undefined) => {
  if (typeof text === 'string' && text.trim()) fields.push({ where, text });
};

for (const l of locations) {
  const p = `${l.slug}`;
  add(`${p}.h1`, l.h1);
  add(`${p}.heroSubtitle`, l.heroSubtitle);
  add(`${p}.heroStat`, l.heroStat);
  add(`${p}.metaTitle`, l.metaTitle);
  add(`${p}.metaDescription`, l.metaDescription);
  add(`${p}.serviceLine`, l.serviceLine);
  add(`${p}.destinationsSubtitle`, l.destinationsSubtitle);
  add(`${p}.outOfTownExamples`, l.outOfTownExamples);
  add(`${p}.pickupPoints`, l.pickupPoints);
  add(`${p}.trustRouteDesc`, l.trustRouteDesc);
  add(`${p}.editorial.eyebrow`, l.editorial?.eyebrow);
  add(`${p}.editorial.title`, l.editorial?.title);
  add(`${p}.editorial.lead`, l.editorial?.lead);
  (l.editorial?.paragraphs ?? []).forEach((x, i) => add(`${p}.editorial.p${i}`, x));
  (l.destinations ?? []).forEach((x) => add(`${p}.dest[${x.name}]`, x.description));
  (l.routes ?? []).forEach((x) => add(`${p}.route[${x.to}]`, x.note));
  (l.faqExtra ?? []).forEach((x, i) => {
    add(`${p}.faq[${i}].q`, x.question);
    add(`${p}.faq[${i}].a`, x.answer);
  });
  (l.trust ?? []).forEach((x) => add(`${p}.trust[${x.title}]`, x.description));
  (l.cityDirectory ?? []).forEach((x) => add(`${p}.dir[${x.name}]`, x.description));
}
(site.services ?? []).forEach((s) => add(`site.service[${s.slug}]`, `${s.title} — ${s.description}`));
(site.trustDefaults ?? []).forEach((s) => add(`site.trust[${s.title}]`, s.description));
add('site.fleetNotes.dalamKota', site.fleetNotes?.dalamKota);
add('site.fleetNotes.allin', site.fleetNotes?.allin);
for (const po of posts) {
  const p = po.slug;
  add(`${p}.title`, po.title);
  add(`${p}.metaTitle`, po.metaTitle);
  add(`${p}.metaDescription`, po.metaDescription);
  add(`${p}.excerpt`, po.excerpt);
  (po.sections ?? []).forEach((s, i) => {
    add(`${p}.s${i}.heading`, s.heading);
    (s.paragraphs ?? []).forEach((x, j) => add(`${p}.s${i}.p${j}`, x));
    (s.list ?? []).forEach((x, j) => add(`${p}.s${i}.l${j}`, x));
  });
}

/* ---------------------------------------------------------------- positioning */

console.log(`\npositioning (${fields.length} authored strings)`);

const RULES: { name: string; re: RegExp; why: string }[] = [
  {
    name: 'never positions as self-drive',
    re: /lepas kunci|self[- ]drive|tanpa supir|tanpa sopir|setir sendiri/i,
    why: 'Arasya is with-driver only; this contradicts the service and the JSON-LD.',
  },
  {
    name: 'never names a fulfilment partner',
    re: /\bmitra\b|\bpartner\b|\bvendor\b|\brekanan\b|pihak ketiga|penyedia lain/i,
    why: 'The customer contracts with Arasya; copy must not introduce a third party.',
  },
  {
    name: 'addresses the reader formally',
    re: /\bkamu\b|\bgue\b|\bkalian\b|\blu\b/i,
    why: 'Copy uses "Anda" throughout.',
  },
];

for (const rule of RULES) {
  const hits = fields.filter((f) => rule.re.test(f.text));
  ok(
    rule.name,
    hits.length === 0,
    hits.length ? `${rule.why}\n      ` + hits.map((h) => `${h.where}: ${h.text.slice(0, 120)}`).join('\n      ') : undefined
  );
}

// The primary CTA wording is contractual with the brand, not incidental.
ok('primary CTA is "Pesan Sekarang"', LANDING_STR.id.cta === 'Pesan Sekarang', `got "${LANDING_STR.id.cta}"`);

/* --------------------------------------------------------------- SERP limits */

// Google truncates by pixel width, not character count, so 60/160 are the
// targets the Content Studio counters show rather than hard limits — a couple
// of characters over usually still renders. Reported for the copy review, not
// failed, because shortening a title is an editorial decision about which words
// to lose.
console.log('\nSERP entry lengths (target: 60 / 160)');
{
  const entries = [
    ...locations.map((l) => ({ k: l.slug, t: l.metaTitle, d: l.metaDescription })),
    ...posts.map((p) => ({ k: p.slug, t: p.metaTitle, d: p.metaDescription })),
  ];
  const longTitles = entries.filter((e) => e.t.length > 60);
  const longDescs = entries.filter((e) => e.d.length > 160);

  console.log(`  · ${entries.length - longTitles.length}/${entries.length} titles within target`);
  console.log(`  · ${entries.length - longDescs.length}/${entries.length} descriptions within target`);

  if (longTitles.length) {
    note(
      `${longTitles.length} meta title(s) over 60 chars — the tail will be cut in results`,
      longTitles.map((e) => `${e.k} (${e.t.length}): "${e.t}"`).join('\n      ')
    );
  }
  if (longDescs.length) {
    note(
      `${longDescs.length} meta description(s) over 160 chars`,
      longDescs.map((e) => `${e.k} (${e.d.length})`).join('\n      ')
    );
  }
}

/* ------------------------------------------------------------- duplicate copy */

console.log('\nuniqueness across entries');
{
  const collect = (pick: (f: Field) => boolean) => {
    const seen = new Map<string, string[]>();
    for (const f of fields) {
      if (!pick(f)) continue;
      const key = f.text.trim().toLowerCase();
      if (key.length < 40) continue;
      if (!seen.has(key)) seen.set(key, []);
      seen.get(key)!.push(f.where);
    }
    return [...seen.entries()].filter(([, where]) => where.length > 1);
  };

  // The handoff's rule, verbatim: "Every entry needs unique `editorial` +
  // `destinations` copy — cloned paragraphs across cities are what triggers
  // doorway-page filters." That is the body copy Google weighs when deciding
  // whether two city pages are really one page, so it is a hard failure.
  const bodyDups = collect((f) => /\.editorial\.|\.dest\[/.test(f.where));
  ok(
    'editorial and destination copy is unique per entry',
    bodyDups.length === 0,
    bodyDups.map(([t, w]) => `${w.join(' | ')}\n        "${t.slice(0, 100)}…"`).join('\n      ')
  );

  // Everything else. Trust cards are excluded entirely: they are a fixed brand
  // promise, deliberately identical across pages — the domestic pages already
  // share `site.trustDefaults`, so flagging the overseas set for matching each
  // other would be penalising consistency.
  const otherDups = collect((f) => !/\.editorial\.|\.dest\[|\.trust\[/.test(f.where));
  console.log(`  · ${otherDups.length} shared line(s) outside editorial/destinations`);
  if (otherDups.length) {
    note(
      `${otherDups.length} line(s) repeated across entries — check they read as intentional`,
      otherDups.map(([t, w]) => `${w.join(' | ')}\n        "${t.slice(0, 90)}…"`).join('\n      ')
    );
  }
}

/* ------------------------------------------------------ WhatsApp routing */

console.log('\nWhatsApp routing');
{
  // waDigits, not raw digits: officialPhones are authored in local form
  // ("0821-2402-4281") and waPhone is the international dial string
  // ("6282124024281"). Comparing raw digits treats one number as two.
  const officialNumbers = (site.settings.officialPhones ?? []).map((p) => waDigits(p.display));

  // A page's CTA number must be one the anti-fraud panel lists. TrustSection
  // enumerates `officialPhones` and tells visitors that any other number
  // claiming to be Arasya should be ignored — so a CTA dialling an unlisted
  // number makes the page contradict its own warning, which is far worse than
  // the routing simply not being set.
  const routed = locations.filter((l) => l.waPhone);
  const unlisted = routed.filter((l) => !officialNumbers.includes(waDigits(l.waPhone)));
  ok(
    `every routed page dials a listed official number (${routed.length} routed)`,
    unlisted.length === 0,
    unlisted.map((l) => `${l.slug} → ${l.waPhone} is not in officialPhones`).join('\n      ')
  );

  // The global default must itself be listed, for the same reason.
  ok(
    'the global default number is listed too',
    officialNumbers.includes(waDigits(site.settings.waPhone)),
    `${site.settings.waPhone} vs [${officialNumbers.join(', ')}]`
  );

  // Exercise the resolver directly, not just today's configuration. While every
  // entry shares one inbox nothing on the site would reveal that routing had
  // stopped working — which is exactly the state the local-vs-international
  // notation bug survived in. These assertions hold regardless of assignment.
  {
    const second = site.settings.officialPhones?.[1];
    if (second) {
      const target = waDigits(second.display);
      const routed = officialFor(site, { waPhone: target });
      ok('officialFor switches to a routed official number', routed.waPrimary === target, routed.waPrimary);
      ok(
        'the routed number is listed first, and none are dropped',
        routed.phones[0]?.wa === target &&
          routed.phones.length === (site.settings.officialPhones ?? []).length,
        `${routed.phones.map((p) => p.display).join(', ')}`
      );
      // Local notation must resolve identically — this is the bug that shipped.
      ok(
        'local notation resolves the same as international',
        officialFor(site, { waPhone: second.display }).waPrimary === target
      );
    }
    // Fails closed: an unlisted number must not reach a CTA, or the page would
    // contradict its own fraud warning.
    const bogus = officialFor(site, { waPhone: '6299999999999' });
    ok(
      'an unlisted number falls back to the global default',
      bogus.waPrimary === waDigits(site.settings.waPhone),
      bogus.waPrimary
    );
  }

  const unrouted = locations.filter((l) => !l.waPhone);
  if (unrouted.length) {
    note(
      `${unrouted.length} page(s) still share the global inbox`,
      `${unrouted.map((l) => l.slug).join(', ')}\n      ` +
        `Set WA_ROUTING in scripts/registry.ts (or the CMS field once it exists) to split leads by city.`
    );
  }
}

/* ----------------------------------------------------------------- reviews */

console.log('\ntestimonials');
{
  const t = site.testimonials ?? [];
  ok('at least one review is published', t.length > 0);
  ok(
    'every review links to its source',
    t.every((x) => Boolean(x.link)),
    t.filter((x) => !x.link).map((x) => x.name).join(', ')
  );
  // The placeholder set shipped in the handoff's site.js. If any of these names
  // reappear, fabricated reviews are live.
  const placeholders = ['Rina W.', 'Budi S.', 'Maya A.'];
  const found = t.filter((x) => placeholders.includes(x.name));
  ok('no handoff placeholder review is live', found.length === 0, found.map((x) => x.name).join(', '));
}

/* ----------------------------------------------------------------- report */

if (findings.length) {
  console.log(`\n${'─'.repeat(70)}\nFOR THE COPY REVIEW — ${findings.length} item(s), none blocking:\n`);
  findings.forEach((f, i) => console.log(`  ${i + 1}. ${f}\n`));
}

if (failures) {
  console.error(`\n${failures} content rule(s) violated.\n`);
  process.exit(1);
}
console.log('All content rules hold.\n');
