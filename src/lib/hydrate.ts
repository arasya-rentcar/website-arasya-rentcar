/**
 * Row shapes and row -> domain hydrators.
 *
 * Deliberately free of `server-only` and of any Next import: the seed
 * verification script reuses these so it checks the *production* mapping
 * rather than a parallel implementation of it.
 */
import type {
  Destination,
  DirectoryEntry,
  Editorial,
  FaqItem,
  FleetNotes,
  FleetUnit,
  GalleryImage,
  Location,
  LocationTranslation,
  Post,
  PostSection,
  PostTranslation,
  RouteRow,
  Service,
  Site,
  SiteSettings,
  SiteTranslation,
  Testimonial,
  Travel,
  TravelOrigin,
  TravelRoute,
  TravelUnit,
  TrustCard,
} from '@/types';

/* --------------------------------------------------------------- row types */

export interface LocationRow {
  key: string;
  slug: string;
  slug_en: string | null;
  en: LocationTranslation | null;
  name: string;
  code: string;
  page_type: Location['pageType'];
  template: Location['template'];
  variant: Location['variant'];
  country: string;
  wa_phone: string | null;
  hero_image: string | null;
  h1: string;
  hero_subtitle: string;
  hero_stat: string;
  meta_title: string;
  meta_description: string;
  trust_route_desc: string | null;
  service_line: string;
  editorial: Editorial;
  destinations_subtitle: string;
  destinations: Destination[];
  out_of_town_examples: string;
  pickup_points: string;
  area_served: string[];
  routes: RouteRow[];
  faq_extra: FaqItem[];
  trust: TrustCard[] | null;
  city_directory: DirectoryEntry[] | null;
  status: Location['status'];
  updated_at: string;
  sort_order: number;
}

export interface PostRow {
  key: string;
  slug: string;
  slug_en: string | null;
  en: PostTranslation | null;
  title: string;
  category: string;
  city_key: string | null;
  city_name: string;
  city_slug: string;
  author: string;
  date_published: string | null;
  date_modified: string | null;
  date_display: string;
  updated_display: string;
  read_minutes: number;
  meta_title: string;
  meta_description: string;
  excerpt: string;
  sections: PostSection[];
  related: string[];
  status: Post['status'];
  updated_at: string;
}

export interface SiteRow {
  settings: SiteSettings;
  fleet: FleetUnit[];
  fleet_notes: FleetNotes;
  generic_units: string[];
  services: Service[];
  testimonials: Testimonial[];
  trust_defaults: TrustCard[];
  gallery: GalleryImage[];
  en: SiteTranslation | null;
  updated_at: string;
}

export interface TravelRow {
  units: TravelUnit[];
  origins: TravelOrigin[];
  routes: TravelRoute[];
  updated_at: string;
}

/* ---------------------------------------------------------------- hydrators */

// Optional fields are spread conditionally rather than set to `undefined`, so
// a hydrated object deep-equals the original registry entry exactly.

export function toLocation(r: LocationRow): Location {
  return {
    key: r.key,
    slug: r.slug,
    ...(r.slug_en ? { slugEn: r.slug_en } : {}),
    ...(r.en ? { en: r.en } : {}),
    name: r.name,
    code: r.code,
    pageType: r.page_type,
    template: r.template,
    variant: r.variant,
    country: r.country,
    ...(r.wa_phone ? { waPhone: r.wa_phone } : {}),
    ...(r.hero_image ? { heroImage: r.hero_image } : {}),
    h1: r.h1,
    heroSubtitle: r.hero_subtitle,
    heroStat: r.hero_stat,
    metaTitle: r.meta_title,
    metaDescription: r.meta_description,
    ...(r.trust_route_desc ? { trustRouteDesc: r.trust_route_desc } : {}),
    serviceLine: r.service_line,
    editorial: r.editorial,
    destinationsSubtitle: r.destinations_subtitle,
    destinations: r.destinations ?? [],
    outOfTownExamples: r.out_of_town_examples,
    pickupPoints: r.pickup_points,
    areaServed: r.area_served ?? [],
    routes: r.routes ?? [],
    faqExtra: r.faq_extra ?? [],
    ...(r.trust ? { trust: r.trust } : {}),
    ...(r.city_directory ? { cityDirectory: r.city_directory } : {}),
    status: r.status,
    updatedAt: r.updated_at,
    sortOrder: r.sort_order,
  };
}

export function toPost(r: PostRow): Post {
  return {
    key: r.key,
    slug: r.slug,
    ...(r.slug_en ? { slugEn: r.slug_en } : {}),
    ...(r.en ? { en: r.en } : {}),
    title: r.title,
    category: r.category,
    cityKey: r.city_key ?? '',
    cityName: r.city_name,
    citySlug: r.city_slug,
    author: r.author,
    datePublished: r.date_published ?? '',
    dateModified: r.date_modified ?? '',
    dateDisplay: r.date_display,
    updatedDisplay: r.updated_display,
    readMinutes: r.read_minutes,
    metaTitle: r.meta_title,
    metaDescription: r.meta_description,
    excerpt: r.excerpt,
    sections: r.sections ?? [],
    related: r.related ?? [],
    status: r.status,
    updatedAt: r.updated_at,
  };
}

export function toSite(r: SiteRow): Site {
  return {
    settings: r.settings,
    fleet: r.fleet ?? [],
    fleetNotes: r.fleet_notes,
    genericUnits: r.generic_units ?? [],
    services: r.services ?? [],
    testimonials: r.testimonials ?? [],
    trustDefaults: r.trust_defaults ?? [],
    gallery: r.gallery ?? [],
    ...(r.en ? { en: r.en } : {}),
    updatedAt: r.updated_at,
  };
}

export function toTravel(r: TravelRow): Travel {
  return {
    units: r.units ?? [],
    origins: r.origins ?? [],
    routes: r.routes ?? [],
    updatedAt: r.updated_at,
  };
}

/* ----------------------------------------------------------- column lists */

export const LOCATION_COLUMNS =
  'key,slug,slug_en,en,name,code,page_type,template,variant,country,wa_phone,hero_image,h1,hero_subtitle,' +
  'hero_stat,meta_title,meta_description,trust_route_desc,service_line,editorial,' +
  'destinations_subtitle,destinations,out_of_town_examples,pickup_points,area_served,routes,' +
  'faq_extra,trust,city_directory,status,updated_at,sort_order';

export const POST_COLUMNS =
  'key,slug,slug_en,en,title,category,city_key,city_name,city_slug,author,date_published,' +
  'date_modified,date_display,updated_display,read_minutes,meta_title,meta_description,excerpt,' +
  'sections,related,status,updated_at';

export const SITE_COLUMNS =
  'settings,fleet,fleet_notes,generic_units,services,testimonials,trust_defaults,gallery,en,updated_at';

export const TRAVEL_COLUMNS = 'units,origins,routes,updated_at';
