/**
 * Port of the handoff's `city-landing/shared.js` — the derivation logic every
 * landing template shares.
 *
 * Kept ~1:1 with the original, including FAQ wording, which is mirrored into
 * FAQPage JSON-LD and must match the visible copy exactly. Two deliberate
 * departures, both because the original was written for a browser preview:
 *
 *   - `applySeo()` wrote into `document.head`. Production emits the same output
 *     statically — see `src/lib/seo.ts`.
 *   - `otherCities()` swapped previews in place via onClick. Production uses
 *     real `/{slug}` navigation, so it just returns hrefs.
 *
 * The module is a set of pure functions over a `Site` rather than a singleton,
 * because the registry now comes from the database per request/build.
 */
import type {
  BankAccount,
  FaqItem,
  FleetUnit,
  Locale,
  Location,
  Site,
  TrustCard,
} from '@/types';
import { cityHref } from './localize';

const digitsOf = (t: string | undefined | null): string => String(t || '').replace(/\D/g, '');

/**
 * Normalises an Indonesian number to the international form wa.me requires.
 *
 * The registry stores two notations for the same number: `officialPhones` are
 * authored for humans in local form ("0821-2402-4281") while `waPhone` is the
 * dial string ("6282124024281"). Comparing raw digits makes those look like
 * different numbers, which silently breaks per-page routing — the match fails
 * and the page falls back to the global inbox with no error anywhere.
 *
 * Indonesia-specific by design: a leading 0 is the national trunk prefix and
 * becomes 62. Numbers already in international form are left alone, so a foreign
 * number (66… for Thailand) passes through untouched.
 */
export function waDigits(input: string | undefined | null): string {
  const d = digitsOf(input);
  if (!d) return '';
  if (d.startsWith('0')) return '62' + d.replace(/^0+/, '');
  return d;
}

/* -------------------------------------------------------------- OFFICIAL */

export interface OfficialPhoneEntry {
  key: string;
  display: string;
  /** Local digits ("082124024281") — what CopyButton puts on the clipboard,
   *  because that is the form an Indonesian user dials. */
  value: string;
  /** International digits ("6282124024281") — the wa.me form. Used to match
   *  per-entry routing against this list. */
  wa: string;
}

export interface OfficialBankAccount extends BankAccount {
  key: string;
  digits: string;
}

export interface Official {
  waPrimary: string;
  phones: OfficialPhoneEntry[];
  phonesDisplay: string;
  bankAccounts: OfficialBankAccount[];
  /** Legacy single-account fields, derived from index 0. */
  bankName: string;
  bankNumber: string;
  bankOwner: string;
  bankDisplay: string;
  bankDigits: string;
  /** "BCA 095 484 0782 a.n. PT. Ayomi Raya" — used verbatim in FAQ + steps. */
  bank: string;
  addressLine: string;
  addressStreet: string;
  addressLocality: string;
  postalCode: string;
  instagram: string;
  /** Trailing slashes stripped — canonical/OG URLs are built from this. */
  siteUrl: string;
}

export function official(site: Site): Official {
  const S = site.settings;

  // Multi-account list with a fallback to the old single-account schema;
  // index 0 is the primary account (payment FAQ).
  const banks = (
    Array.isArray(S.bankAccounts) && S.bankAccounts.length
      ? S.bankAccounts
      : ([] as BankAccount[])
  ).filter((b) => b && (b.bank || b.number));
  const b0 = banks[0] ?? ({} as BankAccount);

  return {
    waPrimary: S.waPhone,
    phones: (S.officialPhones || []).map((p, i) => ({
      key: 'p' + (i + 1),
      display: p.display,
      value: digitsOf(p.display),
      wa: waDigits(p.display),
    })),
    phonesDisplay: (S.officialPhones || []).map((p) => p.display).join(' · '),
    bankAccounts: banks.map((b, i) => ({
      key: 'bank' + i,
      bank: b.bank || '',
      number: b.number || '',
      owner: b.owner || '',
      digits: digitsOf(b.number),
    })),
    bankName: b0.bank || '',
    bankNumber: b0.number || '',
    bankOwner: b0.owner || '',
    bankDisplay: ((b0.bank || '') + ' ' + (b0.number || '')).trim(),
    bankDigits: digitsOf(b0.number),
    bank: ((b0.bank || '') + ' ' + (b0.number || '') + ' ' + (b0.owner || '')).trim(),
    addressLine: S.addressLine,
    addressStreet: S.addressStreet,
    addressLocality: S.addressLocality,
    postalCode: S.postalCode,
    instagram: S.instagram,
    // The canonical host is a deployment concern, not content: the same rows
    // must render correctly on a staging domain, a preview URL, and production.
    // NEXT_PUBLIC_SITE_URL wins so the environment decides; `settings.siteUrl`
    // stays the default, matching shared.js.
    siteUrl: String(
      process.env.NEXT_PUBLIC_SITE_URL || S.siteUrl || 'https://arasyarentcar.com'
    ).replace(/\/+$/, ''),
  };
}

/**
 * `official()` with this entry's WhatsApp routing applied.
 *
 * Overriding at this boundary rather than threading a phone argument through
 * every component means one change covers all of it: CTA hrefs, the anti-fraud
 * panel, the quote form's displayed number, the footer, and `AutoRental.telephone`
 * in JSON-LD. Anything reading `Official` follows automatically, so a CTA can't
 * drift away from the number shown beside it.
 *
 * The page's number is moved to the front of `phones` rather than replacing the
 * list — the other official numbers stay visible, because the anti-fraud panel's
 * job is to enumerate every legitimate number, not just this page's.
 *
 * Falls back to the global number when the entry has no routing, or when its
 * routing is not one of the official numbers. Failing closed matters here: an
 * unrecognised number is either a typo or stale after someone edited
 * `officialPhones`, and dialling it would contradict the fraud warning. The
 * mismatch is reported by `npm run verify:content`.
 */
export function officialFor(site: Site, location: Pick<Location, 'waPhone'>): Official {
  const base = official(site);
  // Normalised on both sides: officialPhones are local ("0821-…"), waPhone is
  // international ("6282124…"). Raw digits would never match.
  const wanted = waDigits(location.waPhone);
  if (!wanted) return base;

  const idx = base.phones.findIndex((p) => p.wa === wanted);
  if (idx === -1) return base;

  const chosen = base.phones[idx];
  const rest = base.phones.filter((_, i) => i !== idx);
  const phones = [chosen, ...rest];

  return {
    ...base,
    waPrimary: wanted,
    phones,
    phonesDisplay: phones.map((p) => p.display).join(' · '),
  };
}

/** Whether an entry's routing resolves to a listed official number. */
export function waRoutingIsOfficial(site: Site, location: Pick<Location, 'waPhone'>): boolean {
  const wanted = waDigits(location.waPhone);
  if (!wanted) return true; // no routing set — uses the global default
  return official(site).phones.some((p) => p.wa === wanted);
}

/* ----------------------------------------------------------------- fleet */

export interface FleetEntry {
  name: string;
  dalamKota: number | null;
  allin: number | null;
  capacity: number;
  badge?: string;
  image?: string;
  imageLogo?: string;
}

export interface FleetCard {
  name: string;
  capacity: number;
  badge?: string;
  image?: string;
  imageLogo?: string;
  priceFrom: number | null;
}

/**
 * Resolves a fleet photo reference to a URL. Bare filenames are repo assets
 * under /public; anything with a slash is a Supabase Storage object path
 * uploaded through Content Studio.
 */
function fleetImage(dir: 'cars' | 'cars-with-logo', ref: string | undefined): string | undefined {
  if (!ref) return undefined;
  if (/^(https?:)?\/\//.test(ref) || ref.startsWith('/')) return ref;
  if (ref.includes('/')) {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return base ? `${base}/storage/v1/object/public/${ref}` : ref;
  }
  return `/assets/${dir}/${ref}.webp`;
}

export function fleet(site: Site): FleetEntry[] {
  return (site.fleet || []).map((f: FleetUnit) => ({
    name: f.name,
    dalamKota: f.dalamKota,
    allin: f.allin,
    capacity: f.capacity,
    badge: f.badge || undefined,
    image: fleetImage('cars', f.img),
    imageLogo: fleetImage('cars-with-logo', f.imgLogo),
  }));
}

/** `allin` picks which tier feeds `priceFrom`. */
export function fleetCars(site: Site, allin: boolean): FleetCard[] {
  return fleet(site).map((f) => ({
    name: f.name,
    capacity: f.capacity,
    badge: f.badge,
    image: f.image,
    imageLogo: f.imageLogo,
    priceFrom: allin ? f.allin : f.dalamKota,
  }));
}

/** Note: `Rp 700.000` with a space — the landing templates' own format, which
 *  differs from the design system's `formatIDR` (`Rp700.000`). Both are in use. */
export function formatIdr(n: number | null | undefined): string | null {
  if (n == null) return null;
  return 'Rp ' + n.toLocaleString('id-ID');
}

export function fleetPriceRange(site: Site): string | undefined {
  const lo = (site.fleet || []).map((f) => f.dalamKota).filter((n): n is number => typeof n === 'number');
  const hi = (site.fleet || []).map((f) => f.allin).filter((n): n is number => typeof n === 'number');
  if (!lo.length) return undefined;
  return formatIdr(Math.min(...lo)) + ' – ' + formatIdr(Math.max(...(hi.length ? hi : lo)));
}

/* ------------------------------------------------------------------- FAQ */

/**
 * The shared FAQ, interpolated per entry. Quote-based entries drop the 12-hour
 * overage question and soften the driver answer, because tariffs there are
 * confirmed in writing rather than taken from the global fleet table.
 *
 * `shared.js` keys this off `template === 'country'`. That was right when every
 * overseas entry happened to be a country page, but an overseas *city* (Bangkok)
 * inherited the domestic answers and ended up asserting "tarif Dalam Kota 12 jam
 * atau All-in" on a page whose fleet section says pricing is confirmed over
 * WhatsApp — the page contradicted itself. Keyed off `country` as well, so the
 * two can't disagree.
 */
export function baseFaq(c: Location, off: Official): FaqItem[] {
  const quoteBased = c.template === 'country' || c.country !== 'ID';
  const items: FaqItem[] = [];

  items.push(
    quoteBased
      ? {
          question: 'Apakah tarif sudah termasuk supir?',
          answer:
            'Ya, seluruh penawaran sudah termasuk jasa driver lokal terverifikasi. Rincian tarif per kota dan itinerari dikonfirmasi secara tertulis oleh admin kami.',
        }
      : {
          question: 'Apakah tarif sudah termasuk supir?',
          answer:
            'Ya, seluruh tarif sudah termasuk jasa driver profesional. Tersedia dua pilihan: tarif Dalam Kota 12 jam (belum termasuk BBM, tol, parkir, dan makan driver) atau tarif All-in (sudah termasuk BBM, tol, dan makan driver).',
        }
  );
  items.push({
    question: 'Bagaimana prosedur pemesanannya?',
    answer:
      'Lengkapi formulir penawaran atau hubungi kami melalui WhatsApp. Tim kami mengonfirmasi ketersediaan unit, rincian tarif, dan titik penjemputan sebelum pemesanan dipastikan.',
  });
  items.push({
    question: 'Apakah melayani rute luar kota seperti ' + c.outOfTownExamples + '?',
    answer:
      'Ya. Kami melayani perjalanan luar kota dengan penyesuaian tarif sesuai jarak dan durasi. Sampaikan rencana rute Anda saat meminta penawaran.',
  });
  // The overage question only makes sense where a 12-hour tier is published.
  if (!quoteBased) {
    items.push({
      question: 'Bagaimana jika pemakaian melebihi 12 jam?',
      answer:
        'Kelebihan durasi dikenakan biaya tambahan per jam yang diinformasikan secara tertulis di awal, sehingga tidak ada biaya yang mengejutkan.',
    });
  }
  items.push({
    question: 'Di mana saja titik penjemputannya?',
    answer:
      'Supir kami menjemput di titik mana pun di wilayah ' +
      c.name +
      ' dan sekitarnya, termasuk ' +
      c.pickupPoints +
      '.',
  });
  items.push({
    question: 'Bagaimana ketentuan pembayarannya?',
    answer:
      'Setelah invoice diterbitkan, Anda mentransfer DP 20% ke rekening resmi ' +
      off.bank +
      '. Pelunasan dilakukan saat driver bertemu Anda sebelum keberangkatan, secara tunai atau transfer.',
  });
  items.push({
    question: 'Bagaimana kebijakan pembatalannya?',
    answer:
      'Pembatalan hingga H-1: DP 20% tidak dapat dikembalikan. Pembatalan pada hari H sebelum driver tiba atau sebelum pukul 10.00: biaya 50% dari nilai invoice. Setelah driver tiba atau setelah pukul 10.00: biaya 100%.',
  });
  return items;
}

/** Visible FAQ. Must stay identical to the FAQPage JSON-LD. */
export function fullFaq(c: Location | null | undefined, off: Official): FaqItem[] {
  if (!c || !c.name) return [];
  return baseFaq(c, off).concat(c.faqExtra || []);
}

/* ----------------------------------------------------------------- trust */

/** Per-entry `trust` replaces the defaults wholesale; otherwise the first
 *  default card's description is swapped for `trustRouteDesc`. */
export function trustItems(site: Site, c: Location | null | undefined): TrustCard[] {
  if (c && c.trust) return c.trust;
  return (site.trustDefaults || []).map((t, i) =>
    i === 0 && c && c.trustRouteDesc ? { ...t, description: c.trustRouteDesc } : t
  );
}

/* ------------------------------------------------------------- WhatsApp */

/**
 * Ref codes let the ops team attribute an inbound chat to a page and CTA.
 * Naming: `HOME-*`, `HUB-*`, `TRV-*`, `{CITYCODE}-*`.
 *
 * The campaign `[Src: …]` suffix is NOT added here. It depends on
 * `location.search` and `sessionStorage`, which don't exist at build time, so
 * it is layered on in the browser by `useWaHref` in `src/lib/campaign.ts`.
 * Keeping it out of here is what lets these hrefs be baked into static HTML.
 */
export function waHref(phone: string, message: string, ref?: string): string {
  const text = message + (ref ? ' [Ref: ' + ref + ']' : '');
  const digits = String(phone).replace(/\D/g, '');
  return 'https://wa.me/' + digits + '?text=' + encodeURIComponent(text);
}

/* --------------------------------------------------------- cross-linking */

export interface OtherCityLink {
  key: string;
  name: string;
  slug: string;
  href: string;
}

/**
 * Footer "Kota Layanan Lain". Without these cross-links deep city pages never
 * get crawled — see PSEO-HANDOFF "Internal linking (required for pSEO)".
 *
 * `href` is authoritative: it comes from `cityHref`, which is the only thing
 * that knows whether an entry has a page in this locale. It used to be built
 * here as '/' + slug and then thrown away and rebuilt by SiteFooter, so the rule
 * lived in two places and the footer's copy of it was the wrong one.
 */
export function otherCities(
  locations: Location[],
  currentKey: string,
  locale: Locale = 'id'
): OtherCityLink[] {
  return locations
    .filter((l) => l.key !== currentKey)
    .map((l) => ({ key: l.key, name: l.name, slug: l.slug, href: cityHref(l, locale) }));
}

/* --------------------------------------------------------------- booking */

/** The seven booking steps, identical across every landing template. */
export function bookingSteps(off: Official) {
  return [
    { n: 1, title: 'Hubungi admin', description: 'Melalui WhatsApp atau formulir penawaran di halaman ini.' },
    {
      n: 2,
      title: 'Sampaikan kebutuhan',
      description: 'Tanggal pemakaian, rute atau tujuan, jumlah penumpang, dan pilihan unit.',
    },
    {
      n: 3,
      title: 'Terima penawaran',
      description: 'Admin mengecek ketersediaan unit dan mengirim rincian tarif secara tertulis.',
    },
    {
      n: 4,
      title: 'Invoice diterbitkan',
      description: 'Seluruh biaya dan ketentuan tercantum jelas — tanpa biaya tersembunyi.',
    },
    { n: 5, title: 'Transfer DP 20%', description: 'Hanya ke rekening resmi ' + off.bank + '.' },
    {
      n: 6,
      title: 'Pelunasan',
      description: 'Saat bertemu driver sebelum keberangkatan, secara tunai atau transfer.',
    },
    {
      n: 7,
      title: 'Perjalanan dimulai',
      description: 'Driver menjemput tepat waktu di titik yang telah disepakati.',
    },
  ];
}

/** Slugify for per-car analytics attributes and ref codes. */
export function slugify(name: string): string {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
