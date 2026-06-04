/**
 * Static vehicle catalog (display-only).
 *
 * The MVP database in `supabase/seed.sql` only registers two vehicle slugs
 * (`innova`, `hiace`) but the operator's actual fleet contains 14 distinct
 * model/variant combinations. Until the structured store is expanded with
 * variant-level rows + per-variant `hero_image_url`, this static catalog
 * lets the listing surfaces (`/armada`, `/en/fleet`, and the homepage
 * `featuredVehicles` section) render every car with a real photo.
 *
 * Convention:
 *
 * - `slug`            kebab-case identifier matching the folder under
 *                     `public/vehicles/`. Folders that hold multiple
 *                     variants (innova, hiace) reuse the same `slug` and
 *                     differ via `variant`.
 * - `variant`         optional model variant (e.g. "Reborn", "Premio").
 * - `dbSlug`          when set, the catalog entry maps onto a live
 *                     Structured_Content_Store vehicle and a vehicle-
 *                     detail link is rendered. When `null`, the listing
 *                     surface renders a "WhatsApp inquiry" CTA instead so
 *                     visitors can reach the admin without hitting a 404.
 * - `image`           absolute, root-relative path under `public/`. Files
 *                     follow the SEO-friendly `{brand}-{model}[-variant].png`
 *                     pattern.
 * - `aspectRatio`     intrinsic ratio of the image asset; used by the
 *                     listing card to reserve layout space and avoid CLS.
 *
 * No runtime imports — pure data so this module can be tree-shaken into
 * any Server Component without dragging in the structured loaders.
 */

/** Top-level grouping used for filters, headings, and CTAs. */
export type VehicleCategory =
  /** 6-8 seat MPVs (Innova, Avanza, Xpander, Ertiga, Rush, Terios). */
  | "mpv"
  /** 14+ seat passenger vans (HiAce, ELF). */
  | "van"
  /** Premium / executive (Alphard, Fortuner). */
  | "premium";

/** Catalog entry for a single fleet vehicle. */
export interface CatalogVehicle {
  /** kebab-case identifier, matches the folder under `public/vehicles/`. */
  readonly slug: string;
  /** Optional variant name, used for grouped slugs (innova, hiace, elf). */
  readonly variant: string | null;
  /** Brand for SEO + display ("Toyota", "Mitsubishi", …). */
  readonly brand: string;
  /** Model name, brand-stripped ("Alphard", "Innova Reborn"). */
  readonly model: string;
  /** Indonesian display name (full brand + model). */
  readonly displayNameId: string;
  /** English display name (full brand + model). */
  readonly displayNameEn: string;
  /** Passenger capacity. */
  readonly seats: number;
  /** Luggage capacity in standard pieces (0 means "TBD" — none rendered). */
  readonly luggage: number;
  /** Photo path under `public/`. */
  readonly image: string;
  /** Intrinsic image dimensions for the listing card. */
  readonly imageWidth: number;
  readonly imageHeight: number;
  /** Top-level filter group. */
  readonly category: VehicleCategory;
  /**
   * Slug in the Structured_Content_Store, when this catalog entry has a
   * matching DB row. `null` when the entry is display-only.
   */
  readonly dbSlug: string | null;
}

/**
 * Standard image dimensions for the supplied PNGs. The PNGs are 4:3
 * studio shots; declaring the dimensions here keeps the listing cards
 * CLS-stable per R16.5.
 */
const W = 1024;
const H = 768;

/**
 * The catalog. Order is the default render order on listing surfaces —
 * MPVs first (most popular), then premium, then vans. Within each group
 * the ordering follows brand alphabetical → model alphabetical so the
 * grid stays predictable as new entries are added.
 */
export const VEHICLE_CATALOG: readonly CatalogVehicle[] = [
  // -------------------------------------------------------------------
  // MPV — 6-8 seats
  // -------------------------------------------------------------------
  {
    slug: "innova",
    variant: "Zenix",
    brand: "Toyota",
    model: "Innova Zenix",
    displayNameId: "Toyota Innova Zenix",
    displayNameEn: "Toyota Innova Zenix",
    seats: 7,
    luggage: 4,
    image: "/vehicles/innova/toyota-innova-zenix.png",
    imageWidth: W,
    imageHeight: H,
    category: "mpv",
    dbSlug: "innova",
  },
  {
    slug: "innova",
    variant: "Zenix Q Hybrid Modellista",
    brand: "Toyota",
    model: "Innova Zenix Q Hybrid Modellista",
    displayNameId: "Toyota Innova Zenix Q Hybrid Modellista",
    displayNameEn: "Toyota Innova Zenix Q Hybrid Modellista",
    seats: 7,
    luggage: 4,
    image: "/vehicles/innova/toyota-innova-zenix-q-hybrid-modellista.png",
    imageWidth: W,
    imageHeight: H,
    category: "mpv",
    dbSlug: "innova",
  },
  {
    slug: "innova",
    variant: "Reborn",
    brand: "Toyota",
    model: "Innova Reborn",
    displayNameId: "Toyota Innova Reborn",
    displayNameEn: "Toyota Innova Reborn",
    seats: 7,
    luggage: 4,
    image: "/vehicles/innova/toyota-innova-reborn.png",
    imageWidth: W,
    imageHeight: H,
    category: "mpv",
    dbSlug: "innova",
  },
  {
    slug: "innova",
    variant: "Venturer",
    brand: "Toyota",
    model: "Innova Venturer",
    displayNameId: "Toyota Innova Venturer",
    displayNameEn: "Toyota Innova Venturer",
    seats: 7,
    luggage: 4,
    image: "/vehicles/innova/toyota-innova-venturer.png",
    imageWidth: W,
    imageHeight: H,
    category: "mpv",
    dbSlug: "innova",
  },
  {
    slug: "avanza",
    variant: null,
    brand: "Toyota",
    model: "New Avanza",
    displayNameId: "Toyota New Avanza",
    displayNameEn: "Toyota New Avanza",
    seats: 7,
    luggage: 3,
    image: "/vehicles/avanza/toyota-avanza.png",
    imageWidth: W,
    imageHeight: H,
    category: "mpv",
    dbSlug: null,
  },
  {
    slug: "rush",
    variant: null,
    brand: "Toyota",
    model: "Rush",
    displayNameId: "Toyota Rush",
    displayNameEn: "Toyota Rush",
    seats: 7,
    luggage: 3,
    image: "/vehicles/rush/toyota-rush.png",
    imageWidth: W,
    imageHeight: H,
    category: "mpv",
    dbSlug: null,
  },
  {
    slug: "xpander",
    variant: null,
    brand: "Mitsubishi",
    model: "Xpander",
    displayNameId: "Mitsubishi Xpander",
    displayNameEn: "Mitsubishi Xpander",
    seats: 7,
    luggage: 3,
    image: "/vehicles/xpander/mitsubishi-xpander.png",
    imageWidth: W,
    imageHeight: H,
    category: "mpv",
    dbSlug: null,
  },
  {
    slug: "ertiga",
    variant: null,
    brand: "Suzuki",
    model: "Ertiga",
    displayNameId: "Suzuki Ertiga",
    displayNameEn: "Suzuki Ertiga",
    seats: 7,
    luggage: 3,
    image: "/vehicles/ertiga/suzuki-ertiga.png",
    imageWidth: W,
    imageHeight: H,
    category: "mpv",
    dbSlug: null,
  },
  {
    slug: "terios",
    variant: null,
    brand: "Daihatsu",
    model: "Terios",
    displayNameId: "Daihatsu Terios",
    displayNameEn: "Daihatsu Terios",
    seats: 7,
    luggage: 3,
    image: "/vehicles/terios/daihatsu-terios.png",
    imageWidth: W,
    imageHeight: H,
    category: "mpv",
    dbSlug: null,
  },

  // -------------------------------------------------------------------
  // Premium — executive comfort
  // -------------------------------------------------------------------
  {
    slug: "alphard",
    variant: null,
    brand: "Toyota",
    model: "Alphard",
    displayNameId: "Toyota Alphard",
    displayNameEn: "Toyota Alphard",
    seats: 6,
    luggage: 4,
    image: "/vehicles/alphard/toyota-alphard.png",
    imageWidth: W,
    imageHeight: H,
    category: "premium",
    dbSlug: null,
  },
  {
    slug: "fortuner",
    variant: null,
    brand: "Toyota",
    model: "Fortuner",
    displayNameId: "Toyota Fortuner",
    displayNameEn: "Toyota Fortuner",
    seats: 7,
    luggage: 4,
    image: "/vehicles/fortuner/toyota-fortuner.png",
    imageWidth: W,
    imageHeight: H,
    category: "premium",
    dbSlug: null,
  },

  // -------------------------------------------------------------------
  // Van — group transport
  // -------------------------------------------------------------------
  {
    slug: "hiace",
    variant: "Premio",
    brand: "Toyota",
    model: "HiAce Premio",
    displayNameId: "Toyota HiAce Premio",
    displayNameEn: "Toyota HiAce Premio",
    seats: 14,
    luggage: 8,
    image: "/vehicles/hiace/toyota-hiace-premio.png",
    imageWidth: W,
    imageHeight: H,
    category: "van",
    dbSlug: "hiace",
  },
  {
    slug: "hiace",
    variant: "Commuter",
    brand: "Toyota",
    model: "HiAce Commuter",
    displayNameId: "Toyota HiAce Commuter",
    displayNameEn: "Toyota HiAce Commuter",
    seats: 16,
    luggage: 8,
    image: "/vehicles/hiace/toyota-hiace-commuter.png",
    imageWidth: W,
    imageHeight: H,
    category: "van",
    dbSlug: "hiace",
  },
  {
    slug: "elf",
    variant: "Long",
    brand: "Isuzu",
    model: "ELF Long",
    displayNameId: "Isuzu ELF Long",
    displayNameEn: "Isuzu ELF Long",
    seats: 19,
    luggage: 10,
    image: "/vehicles/elf/isuzu-elf-long.png",
    imageWidth: W,
    imageHeight: H,
    category: "van",
    dbSlug: null,
  },
];

/** Resolve the locale-correct display name. */
export function catalogDisplayName(
  vehicle: CatalogVehicle,
  locale: "id" | "en",
): string {
  return locale === "id" ? vehicle.displayNameId : vehicle.displayNameEn;
}

/** Locale-correct category label for headings and chips. */
export function catalogCategoryLabel(
  category: VehicleCategory,
  locale: "id" | "en",
): string {
  if (locale === "id") {
    if (category === "mpv") return "MPV Keluarga";
    if (category === "premium") return "Premium";
    return "Van Penumpang";
  }
  if (category === "mpv") return "Family MPV";
  if (category === "premium") return "Premium";
  return "Passenger Van";
}

/** Stable React key combining slug + optional variant. */
export function catalogKey(vehicle: CatalogVehicle): string {
  return vehicle.variant === null
    ? vehicle.slug
    : `${vehicle.slug}-${vehicle.variant.toLowerCase().replace(/\s+/g, "-")}`;
}
