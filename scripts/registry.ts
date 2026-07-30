/**
 * Loads the three design-handoff registries as data.
 *
 * The registry files are ES modules that end with a Content Studio draft
 * overlay reading `localStorage`. That reference sits inside a try/catch, so
 * importing them under Node is safe — the ReferenceError is swallowed and the
 * pristine `*Base` exports are what we read. Importing the real files (rather
 * than re-typing the data) is what makes the seed provably lossless.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type {
  Destination,
  ImageCredit,
  Location,
  Post,
  Site,
  SiteTranslation,
  Travel,
  TrustCard,
  DirectoryEntry,
} from '../src/types';

const HANDOFF = resolve(process.cwd(), 'arasya-handoff');

/**
 * Imported via a base64 `data:` URL rather than a file path. The handoff folder
 * has no package.json, so Node would resolve those `.js` files against ours —
 * which has no `"type": "module"` — and choke on their `export` statements. A
 * data: URL is always treated as ESM. Safe here because all three registry
 * files are self-contained (no imports of their own).
 */
function importRegistry<T>(relPath: string): Promise<T> {
  const source = readFileSync(resolve(HANDOFF, relPath), 'utf8');
  const url = 'data:text/javascript;base64,' + Buffer.from(source, 'utf8').toString('base64');
  return import(/* webpackIgnore: true */ url) as Promise<T>;
}

/**
 * The registries store preview-relative asset paths
 * ("../city-landing/assets/images/bogor/hero-bogor.webp"). Production serves
 * the same files from /public, so rewrite to a site-root-relative path.
 */
export function normalizeAssetPath(p: string | undefined): string | undefined {
  if (!p) return undefined;
  const marker = '/assets/';
  const i = p.indexOf(marker);
  return i === -1 ? p : p.slice(i);
}

/* ------------------------------------------------------------- raw shapes */

interface RawCity {
  slug: string;
  name: string;
  code: string;
  pageType: Location['pageType'];
  template: Location['template'];
  variant: Location['variant'];
  country: string;
  heroImage?: string;
  h1: string;
  heroSubtitle: string;
  heroStat: string;
  metaTitle: string;
  metaDescription: string;
  trustRouteDesc?: string;
  serviceLine: string;
  editorial: Location['editorial'];
  destinationsSubtitle: string;
  destinations: Destination[];
  outOfTownExamples: string;
  pickupPoints: string;
  areaServed: string[];
  routes: Location['routes'];
  faqExtra: Location['faqExtra'];
  trust?: TrustCard[];
  cityDirectory?: DirectoryEntry[];
}

interface RawPost {
  slug: string;
  title: string;
  category: string;
  cityKey: string;
  cityName: string;
  citySlug: string;
  /** Preview-only: points at a .dc.html file. Dropped in production. */
  cityPreviewHref?: string;
  author: string;
  datePublished: string;
  dateModified: string;
  dateDisplay: string;
  updatedDisplay: string;
  readMinutes: number;
  metaTitle: string;
  metaDescription: string;
  excerpt: string;
  sections: Post['sections'];
  related: string[];
}

/* ----------------------------------------------------------------- loaders */

export async function loadCities(): Promise<Record<string, RawCity>> {
  const m = await importRegistry<{ citiesBase: Record<string, RawCity> }>('city-landing/cities.js');
  return m.citiesBase;
}

export async function loadPosts(): Promise<Record<string, RawPost>> {
  const m = await importRegistry<{ postsBase: Record<string, RawPost> }>('blog-post/posts.js');
  return m.postsBase;
}

export async function loadSite(): Promise<Omit<Site, 'gallery' | 'en' | 'updatedAt'>> {
  const m = await importRegistry<{ siteBase: Omit<Site, 'gallery' | 'en' | 'updatedAt'> }>(
    'city-landing/site.js'
  );
  return m.siteBase;
}

export async function loadTravel(): Promise<Omit<Travel, 'updatedAt'>> {
  const m = await importRegistry<{ travelBase: Omit<Travel, 'updatedAt'> }>('city-landing/travel.js');
  return m.travelBase;
}

interface I18nModule {
  SERVICES_EN: Record<string, { title: string; description: string }>;
  TRUST_EN: Record<string, { title: string; description: string }>;
  FLEET_NOTES_EN: { dalamKota: string; allin: string };
}

/**
 * EN overlays for global registry content. `i18n.js` also exports the STR
 * dictionaries, but those are interface copy — they belong in the message
 * files (src/lib/i18n.ts), not the CMS-editable database.
 */
export async function loadI18nOverlays(): Promise<SiteTranslation> {
  const m = await importRegistry<I18nModule>('city-landing/i18n.js');
  return {
    services: m.SERVICES_EN,
    trustDefaults: m.TRUST_EN,
    fleetNotes: m.FLEET_NOTES_EN,
  };
}

/* -------------------------------------------------------------- row mapping */

/**
 * Photos sourced after the design handoff, keyed by city → destination name.
 *
 * `cities.js` ships no image for these entries. Anything here is third-party
 * licensed and carries a credit that the card renders — dropping the credit
 * would breach the licence. Once Supabase is live this becomes ordinary CMS
 * content and this map can go away; it exists so the seed is reproducible.
 */
export const DESTINATION_MEDIA: Record<
  string,
  Record<string, { image: string; imageCredit: ImageCredit }>
> = {
  bogor: {
    'Situ Gede': {
      image: '/assets/images/bogor/situ-gede.webp',
      imageCredit: {
        author: 'Pebi Yudha Krisnapati',
        title: 'Langit Biru Situ Gede',
        sourceUrl: 'https://www.flickr.com/photos/77566046@N04/14986182212',
        licence: 'CC BY-SA 2.0',
        licenceUrl: 'https://creativecommons.org/licenses/by-sa/2.0/',
        modified: 'dipotong 16:9 dan dikompres ulang',
      },
    },
  },
};

/**
 * Real Google reviews, replacing the placeholder testimonials in `site.js`.
 *
 * Supplied by the owner with source links. Three rules govern this list:
 *
 *  - **Verbatim.** Not even typo or grammar fixes — an edited review is no
 *    longer the review, and these are other people's words.
 *  - **`context` is derived only from what the reviewer actually wrote.** Where
 *    they mention the trip or the car it is summarised; where they do not, the
 *    field says only that it came from Google. Inventing "Perjalanan bisnis ·
 *    Alphard" for someone who never said so is fabrication, which is precisely
 *    what replacing the placeholders is meant to end.
 *  - **`link` points at that reviewer's own review**, so a sceptical visitor can
 *    verify it. The card renders "Lihat ulasan di Google ↗".
 *
 * These must NOT be marked up as Review/AggregateRating JSON-LD: Google's
 * structured-data policy prohibits self-serving markup for reviews collected on
 * a third-party site, and it can draw a manual action. They are visible content
 * only — `src/lib/seo.ts` emits no review types.
 */
export const REAL_TESTIMONIALS: Site['testimonials'] = [
  {
    quote:
      'Saya sekeluarga sedang liburan di Bandung sewa mobil Innova Reborn 2024 dengan driver Iwan. Perjalanan ke Kawah Putih dan Tangkuban Perahu sangat nyaman, seru, dan menyenangkan. Drivernya ramah banget, tanpa diminta memberikan informasi yang jelas dan jadi fotografer kami. Sukses buat Mas Iwan dan Arasya. Kalau bisa saya kasih bintang 10. Rekomen banget!',
    name: 'Rifdania Paramita',
    context: 'Liburan keluarga · Innova Reborn',
    link: 'https://share.google/eFifACIh2IOP6peu3',
  },
  {
    quote:
      'Ngerental 2 mobil untuk urusan kerjaan dan dua-duanya kendaraannya bersih banget. Nyetirnya aman banget. Drivernya juga ramah, sopan, dan ngebantu banget. Kebetulan ada salah satu tamu yang hapenya jatuh di mobil dan baru sadar pas udah pergi. Untung langsung dihubungi sama pihak Arasya. Recommended banget!',
    name: 'Zhany ザニ',
    context: 'Perjalanan kerja · 2 unit',
    link: 'https://share.google/OdUaHhFB08TJUxId0',
  },
  {
    quote:
      'Mobilnya terasa seperti mobil baru, nyaman, bersih, rapi, dan pelayanannya juga ramah. Recommended untuk yang akan menggunakan mobil rental dengan pelayanan driver yang ramah dan berpengalaman.',
    name: 'Handy Sofyan',
    context: 'Ulasan Google',
    link: 'https://share.google/Bl0H3vYIFbYSrLjwE',
  },
  {
    quote:
      'Alhamdulillah kami sangat puas atas pelayanannya dan kami mendapatkan driver terbaik, ramah, serta kendaraannya sangat bersih. Sukses selalu untuk Arasya Rental Mobil Bogor.',
    name: 'Juliana July',
    context: 'Bogor',
    link: 'https://share.google/zF6sIwssKlIOmkZwW',
  },
];

/**
 * Also genuine, but held back from the landing pages: at two and five words
 * they read as filler beside the reviews above, on a page positioned as
 * premium. Kept here so they are not lost — they can be promoted through
 * Content Studio at any time.
 *
 *   Luthfia Widyasari Fadhila — "Pelayanan oke."
 *     https://share.google/XptA66Lf0AlmYfS0B
 *   Bayu Purwo — "Sangat membantu dan sukses selalu."
 *     https://share.google/jVd8aZUavqGVaclm1
 */

/**
 * Trust cards for overseas entries that ship none of their own.
 *
 * The global defaults in `site.js` describe the Jabodetabek operation — one of
 * them reads "Harga Transparan · Dua pilihan tarif jelas: Dalam Kota 12 jam atau
 * All-in", which is the domestic rate card asserted as fact. On an overseas page
 * that directly contradicts the fleet section, which says availability and
 * pricing are confirmed over WhatsApp.
 *
 * `cities.js` already solved this for the country pages (Thailand, Malaysia) via
 * their per-entry `trust`. This is that same signed-off copy, verbatim, applied
 * to any overseas entry lacking its own — today only Bangkok, a city page that
 * fell through the gap because the handoff's overseas handling keyed off the
 * template rather than the country.
 */
export const OVERSEAS_TRUST: TrustCard[] = [
  {
    preset: 'shield',
    title: 'Driver Lokal Terverifikasi',
    description: 'Diseleksi dengan standar layanan Arasya.',
  },
  {
    preset: 'phone',
    title: 'Admin Berbahasa Indonesia',
    description: 'Pendampingan penuh sejak pemesanan hingga perjalanan selesai.',
  },
  {
    preset: 'check',
    title: 'Harga Transparan',
    description: 'Penawaran tertulis dalam Rupiah, tanpa biaya tersembunyi.',
  },
  {
    preset: 'car',
    title: 'Unit Sesuai Pesanan',
    description: 'Kapasitas dan kelas unit sesuai konfirmasi tertulis.',
  },
];

/**
 * WhatsApp routing per landing page, keyed by registry key.
 *
 * Every CTA on a page dials one number; this decides which. Omit an entry and
 * it uses the global `settings.waPhone`, which is what all six did before.
 *
 * The value MUST be one of `settings.officialPhones` — the anti-fraud panel on
 * every page lists those numbers and tells visitors to ignore anything else, so
 * a CTA dialling an unlisted number would contradict the page's own warning.
 * `npm run verify:content` fails if that ever stops being true.
 *
 * Digits only, country code first. Currently available:
 *   6282124024281  (0821-2402-4281)  — global default
 *   6282298854855  (0822-9885-4855)
 *   6281399909602  (0813-9990-9602)
 *
 * Seed-time defaults only. Once Content Studio ships this becomes an ordinary
 * CMS field per entry and this map can go away.
 */
export const WA_ROUTING: Record<string, string> = {
  // Intentionally empty: every page currently uses the global default,
  // 0821-2402-4281. An absent entry means NULL in the database, which resolves
  // to `settings.waPhone` — so "one admin number everywhere" needs no rows here
  // rather than six identical ones, and `verify:content` can still report which
  // pages share an inbox.
  //
  // To split leads by city later, add e.g.  yogyakarta: '6282298854855'.
};

/** Merges post-handoff media into a destination list. */
function withDestinationMedia(cityKey: string, destinations: Destination[]): Destination[] {
  const media = DESTINATION_MEDIA[cityKey];
  if (!media) return destinations;
  return destinations.map((d) => (media[d.name] ? { ...d, ...media[d.name] } : d));
}

/** Registry entry -> `locations` row. Field names are preserved; only asset
 *  paths are rewritten. */
export function cityToRow(key: string, c: RawCity, sortOrder: number) {
  return {
    key,
    slug: c.slug,
    // No EN copy exists for landing templates yet — i18n.js only carries home
    // strings. Entries join /en/ once these are filled via the CMS language tab.
    slug_en: null,
    en: null,
    name: c.name,
    code: c.code,
    page_type: c.pageType,
    template: c.template,
    variant: c.variant,
    country: c.country,
    wa_phone: WA_ROUTING[key] ?? null,
    hero_image: normalizeAssetPath(c.heroImage) ?? null,
    h1: c.h1,
    hero_subtitle: c.heroSubtitle,
    hero_stat: c.heroStat,
    meta_title: c.metaTitle,
    meta_description: c.metaDescription,
    trust_route_desc: c.trustRouteDesc ?? null,
    service_line: c.serviceLine,
    editorial: c.editorial,
    destinations_subtitle: c.destinationsSubtitle,
    destinations: withDestinationMedia(
      key,
      (c.destinations ?? []).map((d) => {
        const image = normalizeAssetPath(d.image);
        return image ? { ...d, image } : { area: d.area, name: d.name, description: d.description };
      })
    ),
    out_of_town_examples: c.outOfTownExamples,
    pickup_points: c.pickupPoints,
    area_served: c.areaServed ?? [],
    routes: c.routes ?? [],
    faq_extra: c.faqExtra ?? [],
    // Overseas entries never fall back to the domestic trust defaults — see
    // OVERSEAS_TRUST for why that fallback is wrong rather than merely generic.
    trust: c.trust ?? (c.country !== 'ID' ? OVERSEAS_TRUST : null),
    city_directory: c.cityDirectory ?? null,
    status: 'published' as const,
    sort_order: sortOrder,
  };
}

/** Registry entry -> `posts` row. `cityPreviewHref` is preview-only and dropped;
 *  production derives the link from `citySlug`. */
export function postToRow(key: string, p: RawPost, sortOrder: number) {
  return {
    key,
    slug: p.slug,
    slug_en: null,
    en: null,
    title: p.title,
    category: p.category,
    city_key: p.cityKey,
    city_name: p.cityName,
    city_slug: p.citySlug,
    author: p.author,
    date_published: p.datePublished,
    date_modified: p.dateModified,
    date_display: p.dateDisplay,
    updated_display: p.updatedDisplay,
    read_minutes: p.readMinutes,
    meta_title: p.metaTitle,
    meta_description: p.metaDescription,
    excerpt: p.excerpt,
    sections: p.sections ?? [],
    related: p.related ?? [],
    status: 'published' as const,
    sort_order: sortOrder,
  };
}

export function siteToRow(
  s: Omit<Site, 'gallery' | 'en' | 'updatedAt'>,
  en: SiteTranslation | null = null
) {
  return {
    id: true,
    settings: s.settings,
    fleet: s.fleet,
    fleet_notes: s.fleetNotes,
    generic_units: s.genericUnits,
    services: s.services,
    // The handoff's `site.js` testimonials are placeholder copy with invented
    // names. Overridden here rather than in the database so that re-running the
    // seed can never silently restore fabricated reviews over real ones.
    testimonials: REAL_TESTIMONIALS,
    trust_defaults: s.trustDefaults,
    // Not in the handoff registry — the prototype used image-slot placeholders.
    gallery: [],
    // From i18n.js's SERVICES_EN / TRUST_EN / FLEET_NOTES_EN overlays.
    en,
  };
}

/** travel.js -> `travel_settings` row. UI strings (TRAVEL_STR) stay in code. */
export function travelToRow(t: Omit<Travel, 'updatedAt'>) {
  return {
    id: true,
    units: t.units,
    origins: t.origins,
    routes: t.routes,
  };
}
