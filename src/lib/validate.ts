import type { Location, Post, Site } from '@/types';
import { waDigits } from './shared';

/**
 * Content rules, in one place, for both the CMS and CI.
 *
 * `verify:content` and `verify:seo` already encoded every rule Content Studio's
 * pre-publish validation is specified to apply — meta lengths, slug format and
 * uniqueness, WhatsApp numbers that must appear in the anti-fraud panel,
 * placeholder reviews, the positioning rules. Writing them a second time inside
 * the editor would guarantee the two drift: the CMS would happily publish
 * something the build then rejects, and whichever copy was edited last would be
 * the only correct one.
 *
 * So the rules live here and both sides import them. The practical consequence
 * is the useful one — **Content Studio cannot publish what CI would fail.**
 *
 * Deliberately has no Supabase or Node dependency: it runs in the browser for
 * live field validation, in a server action before a write, and in a script.
 */

/* --------------------------------------------------------------- severities */

/**
 * `error` blocks publication. `warning` does not.
 *
 * The split matters and is not cosmetic. Google truncates SERP entries by pixel
 * width rather than character count, so 60/160 are targets — a title two
 * characters over usually still renders whole, and shortening it is an
 * editorial decision about which words to lose. Blocking on that would train
 * the owner to see validation as an obstacle to work around. Blocking on a
 * duplicate slug, which silently breaks a URL, is what earns the interruption.
 */
export type IssueLevel = 'error' | 'warning';

export interface Issue {
  /** Field path, matching the form's input name: `metaTitle`, `en.h1`. */
  field: string;
  level: IssueLevel;
  message: string;
}

const err = (field: string, message: string): Issue => ({ field, level: 'error', message });
const warn = (field: string, message: string): Issue => ({ field, level: 'warning', message });

/* ------------------------------------------------------------------- limits */

/** Google's practical SERP budget. Targets, not hard limits — see IssueLevel. */
export const META_TITLE_TARGET = 60;
export const META_DESC_TARGET = 160;

/** Below this, a description is too thin to earn a click even if it fits. */
const META_DESC_MIN = 70;

/** Matches the CHECK constraint on `locations.slug` in migration 0001. */
export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
/** Post slugs carry the `blog/` prefix, so they may contain one slash. */
export const POST_SLUG_RE = /^[a-z0-9]+([/-][a-z0-9]+)*$/;

/* ------------------------------------------------------- positioning rules */

export interface CopyRule {
  name: string;
  re: RegExp;
  why: string;
}

/**
 * Indonesian positioning rules. Shared verbatim with `verify:content`, which is
 * where the reasoning for each is written out at length.
 *
 * Testimonials are exempt from the register rule and are never passed through
 * these — they are other people's words quoted verbatim, and real Indonesian
 * reviews are informal. Normalising them would be falsification.
 */
export const COPY_RULES: CopyRule[] = [
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

/** English equivalents. Same rules, different language, same reasoning. */
export const COPY_RULES_EN: CopyRule[] = [
  {
    name: 'never positions as self-drive',
    re: /self[- ]drive|without a driver|drive yourself|rent a car and drive/i,
    why: 'Arasya is with-driver only; this contradicts the service and the JSON-LD.',
  },
  {
    name: 'never names a fulfilment party',
    re: /\bpartner\b|\bvendor\b|\bthird[- ]party\b|\bsupplier\b|\bagency\b/i,
    why: 'The customer contracts with Arasya; the landing copy must not introduce anyone else.',
  },
  {
    name: 'no placeholder or machine-translation residue',
    re: /\blorem\b|\bTBD\b|\bXXX\b|\btranslate\b|\{[a-z]+\}/i,
    why: 'A field that still holds a token was never actually written.',
  },
];

/** The placeholder reviews shipped in the handoff's `site.js`. */
export const PLACEHOLDER_REVIEWERS = ['Rina W.', 'Budi S.', 'Maya A.'];

/** Applies a rule set to one field, returning an issue per violation. */
export function checkCopy(field: string, text: string | undefined, rules = COPY_RULES): Issue[] {
  if (!text) return [];
  return rules
    .filter((r) => r.re.test(text))
    .map((r) => err(field, `${r.name.replace(/^never/, 'Tidak boleh')} — ${r.why}`));
}

/* ------------------------------------------------------------ shared checks */

function checkMeta(prefix: string, title: string, description: string): Issue[] {
  const issues: Issue[] = [];
  const t = `${prefix}metaTitle`;
  const d = `${prefix}metaDescription`;

  if (!title.trim()) issues.push(err(t, 'Meta title wajib diisi — ini judul yang muncul di Google.'));
  else if (title.length > META_TITLE_TARGET)
    issues.push(warn(t, `${title.length} karakter. Di atas ${META_TITLE_TARGET}, ekornya terpotong di hasil pencarian.`));

  if (!description.trim())
    issues.push(err(d, 'Meta description wajib diisi — tanpa ini Google mengarang cuplikannya sendiri.'));
  else if (description.length > META_DESC_TARGET)
    issues.push(warn(d, `${description.length} karakter. Di atas ${META_DESC_TARGET}, sisanya terpotong.`));
  else if (description.length < META_DESC_MIN)
    issues.push(warn(d, `${description.length} karakter. Terlalu pendek untuk menjelaskan halaman ini.`));

  return issues;
}

/* ---------------------------------------------------------------- location */

export interface LocationContext {
  /** Every other entry's slug, for the uniqueness check. Excludes this one. */
  otherSlugs: string[];
  /** Every other entry's EN slug. */
  otherSlugsEn: string[];
  site: Site;
}

/**
 * Validates one landing page as the CMS would submit it.
 *
 * `en` fields are only checked when the overlay exists at all: translation is
 * partial by design, and an entry that is deliberately Indonesian-only must not
 * be reported as incomplete. Once a translation exists, it is held to the same
 * standard as the original — a half-translated page is worse than none, because
 * it is the one that gets an English URL and an hreflang tag.
 */
export function validateLocation(loc: Location, ctx: LocationContext): Issue[] {
  const issues: Issue[] = [];

  /* identity */
  if (!loc.slug.trim()) issues.push(err('slug', 'Slug wajib diisi — ini alamat halamannya.'));
  else if (!SLUG_RE.test(loc.slug))
    issues.push(err('slug', 'Hanya huruf kecil, angka, dan tanda hubung. Contoh: sewa-mobil-bogor'));
  else if (ctx.otherSlugs.includes(loc.slug))
    issues.push(err('slug', 'Slug ini sudah dipakai entri lain. Dua halaman tidak bisa berbagi satu alamat.'));

  if (loc.slugEn) {
    if (!SLUG_RE.test(loc.slugEn))
      issues.push(err('slugEn', 'Hanya huruf kecil, angka, dan tanda hubung.'));
    else if (ctx.otherSlugsEn.includes(loc.slugEn))
      issues.push(err('slugEn', 'Slug Inggris ini sudah dipakai entri lain.'));
  }

  /* the page itself */
  if (!loc.h1.trim()) issues.push(err('h1', 'H1 wajib diisi — judul utama halaman.'));
  if (!loc.name.trim()) issues.push(err('name', 'Nama entri wajib diisi.'));
  issues.push(...checkMeta('', loc.metaTitle, loc.metaDescription));

  /* WhatsApp routing — the anti-fraud rule from types.ts */
  if (loc.waPhone) {
    const official = (ctx.site.settings.officialPhones ?? []).map((p) => waDigits(p.display));
    const wanted = waDigits(loc.waPhone);
    if (!/^62\d{7,}$/.test(wanted))
      issues.push(err('waPhone', 'Format nomor harus diawali 62, contoh: 6282124024281.'));
    else if (!official.includes(wanted))
      issues.push(
        err(
          'waPhone',
          'Nomor ini tidak ada di daftar Nomor Resmi. Halaman memuat peringatan agar pengunjung ' +
            'mengabaikan nomor di luar daftar itu — memakai nomor lain membuat halaman membantah dirinya sendiri.'
        )
      );
  }

  /* positioning */
  const prose: [string, string | undefined][] = [
    ['h1', loc.h1],
    ['heroSubtitle', loc.heroSubtitle],
    ['heroStat', loc.heroStat],
    ['metaTitle', loc.metaTitle],
    ['metaDescription', loc.metaDescription],
    ['serviceLine', loc.serviceLine],
    ['editorial.lead', loc.editorial?.lead],
    ['destinationsSubtitle', loc.destinationsSubtitle],
  ];
  for (const [field, text] of prose) issues.push(...checkCopy(field, text));
  (loc.editorial?.paragraphs ?? []).forEach((p, i) =>
    issues.push(...checkCopy(`editorial.paragraphs.${i}`, p))
  );

  /* English overlay, only once one exists */
  const en = loc.en;
  if (en) {
    if (!loc.slugEn)
      issues.push(
        err(
          'slugEn',
          'Terjemahan sudah diisi tetapi slug Inggris kosong — halaman /en/ tidak akan dibuat.'
        )
      );
    if (en.metaTitle !== undefined || en.metaDescription !== undefined)
      issues.push(...checkMeta('en.', en.metaTitle ?? '', en.metaDescription ?? ''));
    for (const [field, text] of [
      ['en.h1', en.h1],
      ['en.heroSubtitle', en.heroSubtitle],
      ['en.metaTitle', en.metaTitle],
      ['en.metaDescription', en.metaDescription],
      ['en.editorial.lead', en.editorial?.lead],
    ] as [string, string | undefined][]) {
      issues.push(...checkCopy(field, text, COPY_RULES_EN));
    }
  }

  return issues;
}

/* -------------------------------------------------------------------- post */

export interface PostContext {
  otherSlugs: string[];
  otherSlugsEn: string[];
  /** Valid `cityKey` targets. */
  locationKeys: string[];
}

export function validatePost(post: Post, ctx: PostContext): Issue[] {
  const issues: Issue[] = [];

  if (!post.slug.trim()) issues.push(err('slug', 'Slug wajib diisi.'));
  else if (!POST_SLUG_RE.test(post.slug))
    issues.push(err('slug', 'Hanya huruf kecil, angka, tanda hubung, dan garis miring.'));
  else if (!post.slug.startsWith('blog/'))
    issues.push(err('slug', 'Slug artikel harus diawali "blog/" agar URL-nya cocok dengan canonical.'));
  else if (ctx.otherSlugs.includes(post.slug))
    issues.push(err('slug', 'Slug ini sudah dipakai entri lain.'));

  if (post.slugEn && ctx.otherSlugsEn.includes(post.slugEn))
    issues.push(err('slugEn', 'Slug Inggris ini sudah dipakai entri lain.'));

  if (!post.title.trim()) issues.push(err('title', 'Judul wajib diisi.'));
  issues.push(...checkMeta('', post.metaTitle, post.metaDescription));

  // The handoff's editorial rule: every article links to exactly one city page
  // and two related articles. That is what keeps the blog structurally
  // supporting the landing pages rather than sitting beside them.
  if (!post.cityKey) issues.push(err('cityKey', 'Artikel harus menaut ke tepat satu halaman kota.'));
  else if (!ctx.locationKeys.includes(post.cityKey))
    issues.push(err('cityKey', `Halaman kota "${post.cityKey}" tidak ada.`));

  if ((post.related ?? []).length !== 2)
    issues.push(warn('related', `Aturan redaksi: tepat 2 artikel terkait (sekarang ${(post.related ?? []).length}).`));

  if ((post.sections ?? []).length < 3)
    issues.push(warn('sections', `Aturan redaksi: minimal 3 bagian (sekarang ${(post.sections ?? []).length}).`));

  for (const [field, text] of [
    ['title', post.title],
    ['excerpt', post.excerpt],
    ['metaTitle', post.metaTitle],
    ['metaDescription', post.metaDescription],
  ] as [string, string][]) {
    issues.push(...checkCopy(field, text));
  }

  return issues;
}

/* ------------------------------------------------------------------- site */

export function validateSite(site: Site): Issue[] {
  const issues: Issue[] = [];
  const s = site.settings;

  const official = (s.officialPhones ?? []).map((p) => waDigits(p.display));
  if (!official.length) issues.push(err('officialPhones', 'Minimal satu nomor resmi.'));

  if (!/^62\d{7,}$/.test(waDigits(s.waPhone)))
    issues.push(err('waPhone', 'Nomor WhatsApp utama harus diawali 62.'));
  else if (!official.includes(waDigits(s.waPhone)))
    issues.push(err('waPhone', 'Nomor utama harus termasuk dalam daftar Nomor Resmi.'));

  (s.bankAccounts ?? []).forEach((b, i) => {
    if (!b.bank?.trim() || !b.number?.trim() || !b.owner?.trim())
      issues.push(err(`bankAccounts.${i}`, 'Baris rekening belum lengkap — bank, nomor, dan nama pemilik wajib diisi.'));
  });

  const placeholders = (site.testimonials ?? []).filter((t) =>
    PLACEHOLDER_REVIEWERS.includes(t.name)
  );
  if (placeholders.length)
    issues.push(
      warn(
        'testimonials',
        `${placeholders.length} testimoni contoh dari handoff masih tayang (${placeholders
          .map((t) => t.name)
          .join(', ')}). Ganti dengan ulasan Google asli sebelum peluncuran.`
      )
    );

  return issues;
}

/* ------------------------------------------------------------------ helper */

/** True when nothing blocks publication. Warnings are allowed through. */
export function canPublish(issues: Issue[]): boolean {
  return !issues.some((i) => i.level === 'error');
}
