/**
 * Domain types — deliberately identical in shape and field name to the
 * design-handoff registries (`cities.js`, `posts.js`, `site.js`, `travel.js`).
 *
 * Supabase columns are snake_case; `src/lib/hydrate.ts` hydrates rows back into
 * exactly these shapes so `shared.ts` and every template read the same objects
 * the `.dc.html` prototypes did.
 */

/* ------------------------------------------------------------------ locale */

export type Locale = 'id' | 'en';

export const LOCALES: Locale[] = ['id', 'en'];
export const DEFAULT_LOCALE: Locale = 'id';

/* ------------------------------------------------------------------- enums */

export type PageType = 'city' | 'region' | 'country';
export type TemplateKind = 'city' | 'region' | 'country';

/** Layout variants, per template. Assigned per entry; rotate between neighbours. */
export type CityVariant = 'navy' | 'terang' | 'editorial';
export type RegionVariant = 'peta' | 'rute' | 'wisata';
export type CountryVariant = 'concierge' | 'direktori';
export type LayoutVariant = CityVariant | RegionVariant | CountryVariant;

export type TrustPresetName = 'shield' | 'car' | 'users' | 'phone' | 'check' | 'star';
export type ServiceIconName = 'car' | 'plane' | 'route' | 'heart' | 'building' | 'pin';

export type PublishStatus = 'draft' | 'published';

/* ------------------------------------------------------------------ location */

export interface Editorial {
  eyebrow: string;
  title: string;
  lead: string;
  paragraphs: string[];
}

/**
 * Attribution for a photo Arasya does not own.
 *
 * Present only on third-party licensed images. When set, the destination card
 * renders a visible credit — that is a licence obligation under CC BY / BY-SA,
 * not a design preference, so it must not be suppressed. Replacing the photo
 * with an Arasya-owned one means clearing this field too.
 */
export interface ImageCredit {
  author: string;
  /** Original work's title, as published by the author. */
  title?: string;
  /** Canonical page for the original, for the attribution link. */
  sourceUrl: string;
  /** Human-readable licence name, e.g. "CC BY-SA 2.0". */
  licence: string;
  licenceUrl: string;
  /** Describes any adaptation made, e.g. "dipotong 16:9". Required by BY-SA. */
  modified?: string;
}

export interface Destination {
  area: string;
  name: string;
  description: string;
  /** Site-root-relative path, or a Supabase Storage object path. */
  image?: string;
  imageCredit?: ImageCredit;
}

export interface RouteRow {
  to: string;
  duration: string;
  note: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface TrustCard {
  preset: TrustPresetName;
  title: string;
  description: string;
}

/** Country pages only — directory of cities within that country. */
export interface DirectoryEntry {
  name: string;
  /** null when the city has no landing page yet. */
  slug: string | null;
  status: 'Aktif' | 'Segera' | string;
  description: string;
}

/**
 * English overlay for a location, stored in a single `en` jsonb column.
 *
 * The handoff allows "`_en` columns (or a translations table)". A single jsonb
 * overlay is used instead of ~16 parallel `*_en` columns because translation is
 * partial by design — the CMS language tab fills fields incrementally and an
 * entry stays ID-only until enough EN exists — and nothing ever queries *by*
 * translated content. Same field names as the parent, so the CMS EN tab writes
 * the identical field paths.
 */
export interface LocationTranslation {
  h1?: string;
  heroSubtitle?: string;
  heroStat?: string;
  metaTitle?: string;
  metaDescription?: string;
  trustRouteDesc?: string;
  serviceLine?: string;
  editorial?: Editorial;
  destinationsSubtitle?: string;
  destinations?: Destination[];
  outOfTownExamples?: string;
  pickupPoints?: string;
  routes?: RouteRow[];
  faqExtra?: FaqItem[];
  trust?: TrustCard[];
  cityDirectory?: DirectoryEntry[];
}

/** One entry = one indexable landing page. */
export interface Location {
  /** Registry key, e.g. "bogor". Stable identity; the slug may change. */
  key: string;
  slug: string;
  /** English slug, e.g. "car-rental-bogor" → /en/car-rental-bogor. */
  slugEn?: string;
  name: string;
  code: string;
  pageType: PageType;
  template: TemplateKind;
  variant: LayoutVariant;
  /** ISO-3166 alpha-2. Drives the Indonesia / Luar Negeri split on the hub. */
  country: string;
  /**
   * WhatsApp number for every CTA on this page — digits only, country code
   * first ("6282124024281"). Undefined falls back to the global
   * `settings.waPhone`, so leads from all cities share one inbox until a page
   * is routed deliberately.
   *
   * Must be one of `settings.officialPhones`. `TrustSection` renders an
   * anti-fraud panel listing those numbers and telling visitors to ignore any
   * other number claiming to be Arasya; a CTA dialling something outside the
   * list would contradict the page's own warning. `verify:content` enforces it.
   */
  waPhone?: string;
  heroImage?: string;
  h1: string;
  heroSubtitle: string;
  heroStat: string;
  metaTitle: string;
  metaDescription: string;
  /** Overrides the first trust card's description when present. */
  trustRouteDesc?: string;
  serviceLine: string;
  editorial: Editorial;
  destinationsSubtitle: string;
  destinations: Destination[];
  /** Interpolated into the base FAQ. */
  outOfTownExamples: string;
  /** Interpolated into the base FAQ. */
  pickupPoints: string;
  areaServed: string[];
  routes: RouteRow[];
  faqExtra: FaqItem[];
  /** Replaces the global trust defaults entirely when present (country pages). */
  trust?: TrustCard[];
  cityDirectory?: DirectoryEntry[];
  en?: LocationTranslation;
  status: PublishStatus;
  updatedAt: string;
  sortOrder: number;
}

/* --------------------------------------------------------------------- post */

export interface PostSection {
  heading: string;
  paragraphs: string[];
  list?: string[];
}

export interface PostTranslation {
  title?: string;
  category?: string;
  metaTitle?: string;
  metaDescription?: string;
  excerpt?: string;
  sections?: PostSection[];
}

export interface Post {
  key: string;
  /** Stored with the `blog/` prefix, matching the prototype registry. */
  slug: string;
  slugEn?: string;
  title: string;
  category: string;
  /** Relation to Location.key — every article links to exactly one city page. */
  cityKey: string;
  cityName: string;
  citySlug: string;
  author: string;
  datePublished: string;
  dateModified: string;
  dateDisplay: string;
  updatedDisplay: string;
  readMinutes: number;
  metaTitle: string;
  metaDescription: string;
  excerpt: string;
  sections: PostSection[];
  /** Keys of exactly two related posts. */
  related: string[];
  en?: PostTranslation;
  status: PublishStatus;
  updatedAt: string;
}

/* -------------------------------------------------------------- site settings */

export interface OfficialPhone {
  display: string;
}

export interface BankAccount {
  bank: string;
  number: string;
  owner: string;
}

export interface SiteSettings {
  waPhone: string;
  officialPhones: OfficialPhone[];
  /** Index 0 is the primary account, used by the payment FAQ. */
  bankAccounts: BankAccount[];
  addressLine: string;
  addressStreet: string;
  addressLocality: string;
  postalCode: string;
  instagram: string;
  siteUrl: string;
  mapsEmbed: string;
}

export interface FleetUnit {
  name: string;
  /** null renders "Hubungi untuk harga terbaik". */
  dalamKota: number | null;
  allin: number | null;
  capacity: number;
  badge?: string;
  /** Bare filename under /assets/cars, or a Supabase Storage object path. */
  img?: string;
  /** Bare filename under /assets/cars-with-logo, or a Storage object path. */
  imgLogo?: string;
}

export interface FleetNotes {
  dalamKota: string;
  allin: string;
}

export interface Service {
  slug: string;
  icon: ServiceIconName;
  title: string;
  description: string;
}

export interface Testimonial {
  quote: string;
  name: string;
  context: string;
  /**
   * Optional Google review / share URL. When set, landing templates render a
   * "Lihat ulasan di Google ↗" link on the card. Review text stays verbatim.
   */
  link?: string;
}

/**
 * Galeri images. Not in the original registry — the prototype used the
 * `image-slot` drag-drop design affordance, which has no production data
 * behind it. The section is hidden entirely when this is empty.
 */
export interface GalleryImage {
  /** Storage object path or site-root-relative path. */
  src: string;
  alt: string;
}

/**
 * A car class offered where exact models are not published.
 *
 * Overseas pages replace the fleet grid with these: Arasya does not own the
 * cars abroad — a local partner supplies them — so naming a model, or showing a
 * photo of Arasya's own Indonesian unit, would imply a specific car is waiting.
 * A class describes what the customer actually needs to decide (how many people,
 * how much luggage, what kind of trip) without claiming a forecourt.
 *
 * `name` doubles as the quote form's option value, so it stays short.
 */
export interface UnitClass {
  name: string;
  /** "6 penumpang + driver" — stated this way because capacity counts the driver. */
  seats: string;
  luggage: string;
  useCase: string;
}

/**
 * EN overlays for global content. Mirrors `i18n.js`'s interim approach:
 * SERVICES_EN keyed by service slug, TRUST_EN keyed by preset.
 */
export interface SiteTranslation {
  /** Keyed by Service.slug. */
  services?: Record<string, { title?: string; description?: string }>;
  /** Keyed by TrustCard.preset. */
  trustDefaults?: Record<string, { title?: string; description?: string }>;
  fleetNotes?: Partial<FleetNotes>;
  /**
   * Keyed by FleetUnit.name. Only `badge` is translatable — model names are
   * proper nouns. `i18n.js` ships no equivalent, so this is empty until filled
   * through the CMS; until then an EN page shows the Indonesian badge.
   */
  fleet?: Record<string, { badge?: string }>;
  /**
   * Keyed by UnitClass.name — the Indonesian name, which is the stable key even
   * once `name` itself is translated.
   */
  genericUnits?: Record<string, Partial<UnitClass>>;
}

/** Singleton row — data shared by ALL pages. */
export interface Site {
  settings: SiteSettings;
  fleet: FleetUnit[];
  fleetNotes: FleetNotes;
  genericUnits: UnitClass[];
  services: Service[];
  /** PLACEHOLDER in the handoff — replace with real GBP reviews before launch. */
  testimonials: Testimonial[];
  trustDefaults: TrustCard[];
  gallery: GalleryImage[];
  en?: SiteTranslation;
  updatedAt: string;
}

/* ------------------------------------------------------------------- travel */

/** A bookable car class on the /travel charter page. */
export interface TravelUnit {
  key: string;
  name: string;
  capacity: number;
  /** Bare filename under /assets/cars-with-logo, or a Storage object path. */
  img?: string;
}

export interface TravelOrigin {
  key: string;
  /** Ref-code fragment, e.g. "BGR" → TRV-BGR-…. */
  code: string;
  name: string;
}

export interface TravelRoute {
  /** TravelOrigin.key */
  origin: string;
  /** Destination key, e.g. "cgk". Not necessarily a TravelOrigin. */
  dest: string;
  destName: string;
  /** Rupiah keyed by TravelUnit.key. A missing key means the unit isn't served. */
  prices: Record<string, number | null>;
}

/** Singleton — drives the /travel tariff checker. */
export interface Travel {
  units: TravelUnit[];
  origins: TravelOrigin[];
  routes: TravelRoute[];
  updatedAt: string;
}
