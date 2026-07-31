/**
 * Loads the three design-handoff registries as data.
 *
 * The registry files are ES modules that end with a Content Studio draft
 * overlay reading `localStorage`. That reference sits inside a try/catch, so
 * importing them under Node is safe — the ReferenceError is swallowed and the
 * pristine `*Base` exports are what we read. Importing the real files (rather
 * than re-typing the data) is what makes the seed provably lossless.
 */
import { existsSync, readFileSync } from 'node:fs';
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
  /**
   * Absent from the handoff registries; present when loading from the snapshot,
   * which is exported from the database and therefore carries whatever the CMS
   * has filled in. Preserved on re-seed rather than reset — see cityToRow.
   */
  slugEn?: string;
  en?: Location['en'];
  waPhone?: string;
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
  /** Snapshot-only, preserved on re-seed. See RawCity. */
  slugEn?: string;
  en?: Post['en'];
}

/* ----------------------------------------------------------------- loaders */

/**
 * The handoff is no longer committed — it was ~5.7 MB of design artefacts whose
 * job ended once the content reached Supabase. `src/data/registry-snapshot.json`
 * is committed instead, and these loaders fall back to it so the repo can still
 * rebuild the database from scratch without it.
 *
 * The fallback is lossless because the snapshot is exported from the database,
 * which `db:verify` deep-equals against the registries. The seed's transforms
 * are all idempotent — `normalizeAssetPath` on an already-normalised path,
 * `withDestinationMedia` on already-merged destinations, and the overseas trust
 * default on entries that already carry it — so re-seeding from the snapshot
 * produces byte-identical rows.
 *
 * One guarantee is genuinely weaker: with the handoff present, `verify:mapping`
 * proves fidelity to the signed-off design. Reading the snapshot it can only
 * prove the row mapping round-trips. That check has already served its purpose
 * (the migration is done and verified), and Supabase is the source of truth now.
 */
const HAS_HANDOFF = existsSync(HANDOFF);

interface SnapshotShape {
  locations: (RawCity & { key: string })[];
  posts: (RawPost & { key: string })[];
  site: Site;
  travel: Omit<Travel, 'updatedAt'>;
}

let snapshotCache: SnapshotShape | null = null;
function snapshot(): SnapshotShape {
  if (!snapshotCache) {
    const p = resolve(process.cwd(), 'src/data/registry-snapshot.json');
    if (!existsSync(p)) {
      throw new Error(
        `Neither arasya-handoff/ nor ${p} is present — there is no content to seed from.`
      );
    }
    snapshotCache = JSON.parse(readFileSync(p, 'utf8')) as SnapshotShape;
  }
  return snapshotCache;
}

const byKey = <T extends { key: string }>(rows: T[]): Record<string, T> =>
  Object.fromEntries(rows.map((r) => [r.key, r]));

/**
 * Applies the post-handoff edits. Idempotent, and applied to both sources: once
 * the snapshot has been regenerated it already contains Singapore and no longer
 * contains Bangkok, so re-running these is a no-op rather than a double edit.
 */
function applyCityEdits(cities: Record<string, RawCity>): Record<string, RawCity> {
  const out: Record<string, RawCity> = {};
  for (const [k, c] of Object.entries(cities)) {
    if (RETIRED_CITY_KEYS.includes(k)) continue;
    out[k] = CITY_PATCHES[k] ? CITY_PATCHES[k](c) : c;
  }
  for (const [k, c] of Object.entries(ADDED_CITIES)) out[k] = c;
  return out;
}

function applyPostEdits(posts: Record<string, RawPost>): Record<string, RawPost> {
  return Object.fromEntries(
    Object.entries(posts).map(([k, p]) => [k, POST_PATCHES[k] ? POST_PATCHES[k](p) : p])
  );
}

export async function loadCities(): Promise<Record<string, RawCity>> {
  if (!HAS_HANDOFF) return applyCityEdits(byKey(snapshot().locations));
  const m = await importRegistry<{ citiesBase: Record<string, RawCity> }>('city-landing/cities.js');
  return applyCityEdits(m.citiesBase);
}

export async function loadPosts(): Promise<Record<string, RawPost>> {
  if (!HAS_HANDOFF) return applyPostEdits(byKey(snapshot().posts));
  const m = await importRegistry<{ postsBase: Record<string, RawPost> }>('blog-post/posts.js');
  return applyPostEdits(m.postsBase);
}

export async function loadSite(): Promise<Omit<Site, 'gallery' | 'en' | 'updatedAt'>> {
  if (!HAS_HANDOFF) return snapshot().site;
  const m = await importRegistry<{ siteBase: Omit<Site, 'gallery' | 'en' | 'updatedAt'> }>(
    'city-landing/site.js'
  );
  return m.siteBase;
}

export async function loadTravel(): Promise<Omit<Travel, 'updatedAt'>> {
  if (!HAS_HANDOFF) return snapshot().travel;
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
  if (!HAS_HANDOFF) return snapshot().site.en ?? {};
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

/* ------------------------------------------- entries added / retired later */

/**
 * Bangkok is retired. The handoff shipped both a Thailand country page and a
 * Bangkok city page, but Bangkok is the only Thai city Arasya serves — so the
 * two pages covered one market, competing for the same queries with near-identical
 * content. Thailand keeps the market; its directory already lists Bangkok.
 *
 * `db:seed` deletes these rows explicitly. It cannot simply drop anything absent
 * from the registry, because once Content Studio is live the database will
 * legitimately hold entries the registry has never seen.
 */
export const RETIRED_CITY_KEYS = ['bangkok'];

/**
 * Singapore, added after the handoff. Same commercial model as Thailand and
 * Malaysia — `country !== 'ID'` makes the templates drop the price grid on its
 * own, so fleet and tariffs are settled over WhatsApp with no prices anywhere on
 * the page or in its structured data.
 *
 * Written from scratch rather than adapted from Bangkok. `verify:content` fails
 * the build on editorial or destination copy shared between entries, which is
 * the doorway-page rule the handoff is emphatic about — and two overseas pages
 * with the same sentences reworded is exactly what that rule exists to stop.
 */
export const ADDED_CITIES: Record<string, RawCity> = {
  singapura: {
    slug: 'sewa-mobil-singapura',
    name: 'Singapura',
    code: 'SIN',
    pageType: 'city',
    template: 'city',
    variant: 'terang',
    country: 'SG',
    h1: 'Sewa Mobil Singapura dengan Supir',
    heroSubtitle:
      'Mobil pribadi dengan supir untuk wisatawan Indonesia di Singapura — penjemputan Bandara Changi, perjalanan dalam kota, hingga rute lintas batas, dengan pendampingan admin dalam Bahasa Indonesia.',
    heroStat: 'Penjemputan Changi · Admin berbahasa Indonesia · Support 24/7',
    metaTitle: 'Sewa Mobil Singapura dengan Supir — Arasya Rent Car',
    metaDescription:
      'Sewa mobil dengan supir di Singapura untuk wisatawan Indonesia. Penjemputan Bandara Changi, city tour, dan rute lintas batas ke Johor. Konsultasi via WhatsApp.',
    trustRouteDesc: 'Memahami sistem ERP, zona parkir, dan jam padat Singapura.',
    serviceLine: 'Singapura dan rute lintas batas ke Malaysia',
    editorial: {
      eyebrow: 'Mengenal Singapura',
      title: 'Kota-negara yang rapi, padat aturan, dan cepat dijelajahi',
      lead: 'Luasnya hanya sekitar 730 kilometer persegi, tetapi Singapura menuntut perencanaan: biaya jalan elektronik berubah menurut jam, dan ruang parkir di pusat kota sangat terbatas.',
      paragraphs: [
        'Sistem ERP menaikkan biaya masuk kawasan tertentu pada jam sibuk, sementara gedung-gedung di Orchard dan Marina menerapkan tarif parkir progresif. Bagi Anda yang membawa keluarga atau mengejar jadwal rapat, perhitungan seperti itu mudah mengganggu ritme perjalanan.',
        'Supir yang mendampingi Anda memahami peta tarif dan pola lalu lintas kota ini, sehingga seluruh perhitungan tersebut tidak lagi menjadi urusan Anda — cukup sebutkan tujuan berikutnya, termasuk bila perjalanan berlanjut menyeberang ke Johor.',
      ],
    },
    destinationsSubtitle:
      'Sebutkan tujuan Anda — kami susun urutan kunjungan beserta titik penjemputannya.',
    destinations: [
      {
        area: 'Marina Bay',
        name: 'Marina Bay Sands & Gardens by the Bay',
        description:
          'Kawasan tepi teluk dengan taman futuristik, dek observasi, dan pertunjukan cahaya setiap malam.',
      },
      {
        area: 'Sentosa',
        name: 'Pulau Sentosa',
        description:
          'Universal Studios, akuarium, dan pantai buatan dalam satu pulau resor yang mudah dijangkau berkendara.',
      },
      {
        area: 'Orchard',
        name: 'Orchard Road',
        description:
          'Koridor belanja sepanjang dua kilometer dengan pusat perbelanjaan yang saling terhubung di bawah tanah.',
      },
      {
        area: 'Changi',
        name: 'Jewel Changi Airport',
        description:
          'Air terjun dalam ruangan tertinggi di dunia dan taman berlapis yang menyatu dengan terminal bandara.',
      },
      {
        area: 'Pusat Kota',
        name: 'Chinatown & Kampong Glam',
        description:
          'Dua kawasan warisan dengan kuil, masjid bersejarah, dan deretan rumah toko berwarna.',
      },
      {
        area: 'Mandai',
        name: 'Singapore Zoo & Night Safari',
        description:
          'Kompleks satwa terbuka di utara pulau, sekitar 40 menit berkendara dari pusat kota.',
      },
    ],
    outOfTownExamples: 'Johor Bahru, Legoland, atau Malaka',
    pickupPoints: 'Bandara Changi, Terminal Feri HarbourFront, dan hotel tempat Anda menginap',
    areaServed: ['Singapura', 'Marina Bay', 'Sentosa', 'Orchard', 'Changi'],
    routes: [
      {
        to: 'Johor Bahru',
        duration: '±1–2 jam',
        note: 'Melalui Woodlands atau Tuas — waktu tempuh bergantung antrean imigrasi.',
      },
      {
        to: 'Legoland Malaysia',
        duration: '±1,5 jam',
        note: 'Tujuan keluarga di Nusajaya, tidak jauh setelah perbatasan Tuas.',
      },
      {
        to: 'Malaka',
        duration: '±3,5 jam',
        note: 'Kota warisan dunia — paling nyaman ditempuh sebagai perjalanan menginap.',
      },
      {
        to: 'Kuala Lumpur',
        duration: '±5 jam',
        note: 'Melalui Lebuhraya Utara–Selatan, dapat dirangkai dengan layanan kami di Malaysia.',
      },
    ],
    faqExtra: [
      {
        question: 'Apakah mobil dapat menyeberang ke Malaysia?',
        answer:
          'Perjalanan lintas batas ke Johor Bahru maupun kota lain di Malaysia dapat kami atur beserta kelengkapan dokumen kendaraannya. Sampaikan tanggal dan tujuan Anda melalui WhatsApp agar ketersediaannya kami konfirmasikan lebih dahulu.',
      },
      {
        question: 'Apakah biaya ERP dan parkir sudah termasuk?',
        answer:
          'Rincian biaya jalan elektronik dan parkir kami cantumkan dalam penawaran tertulis sebelum perjalanan dimulai, sehingga tidak ada tambahan yang muncul di tengah perjalanan.',
      },
    ],
  },
};

/**
 * Field-level corrections to handoff entries, applied at seed time.
 *
 * Retiring Bangkok leaves Thailand's directory pointing at `/sewa-mobil-bangkok`,
 * a URL that will no longer exist. A directory entry whose `slug` is null still
 * renders — it just stops being a link — which is exactly the right outcome:
 * Thailand does serve Bangkok, it simply no longer has its own page.
 */
export const CITY_PATCHES: Record<string, (c: RawCity) => RawCity> = {
  thailand: (c) => ({
    ...c,
    cityDirectory: (c.cityDirectory ?? []).map((d) =>
      d.name === 'Bangkok' ? { ...d, slug: null } : d
    ),
  }),
};

/**
 * The Bangkok article outlives the Bangkok page. Every article must link to
 * exactly one city page (the handoff's editorial rule, and the relation the
 * `posts.city_key` foreign key enforces), so it moves to Thailand — still the
 * correct destination for a reader planning transport in Bangkok.
 */
export const POST_PATCHES: Record<string, (p: RawPost) => RawPost> = {
  'transportasi-bangkok-keluarga': (p) => ({
    ...p,
    cityKey: 'thailand',
    cityName: 'Thailand',
    citySlug: 'sewa-mobil-thailand',
  }),
};

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
    // The handoff carries no EN copy for landing templates — i18n.js only has
    // home strings — so these are normally null. They are read from the input
    // rather than hardcoded because the snapshot fallback re-seeds from content
    // that HAS been translated: hardcoding null here would silently wipe every
    // translation the CMS had filled in. Same reasoning for wa_phone below.
    slug_en: c.slugEn ?? null,
    en: c.en ?? null,
    name: c.name,
    code: c.code,
    page_type: c.pageType,
    template: c.template,
    variant: c.variant,
    country: c.country,
    // WA_ROUTING is the seed-time assignment; `c.waPhone` preserves routing
    // already set through the CMS when re-seeding from a snapshot.
    wa_phone: WA_ROUTING[key] ?? c.waPhone ?? null,
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
    // Read from the input, not hardcoded — see cityToRow: a snapshot re-seed
    // must not wipe translations the CMS has filled in.
    slug_en: p.slugEn ?? null,
    en: p.en ?? null,
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
