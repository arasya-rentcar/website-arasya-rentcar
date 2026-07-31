/**
 * Locale resolution for registry content.
 *
 * Translation is partial by design: an entry stays Indonesian-only until its EN
 * fields are filled through Content Studio's language tab, at which point it
 * joins the /en/ sitemap and the hreflang set. These helpers overlay whatever
 * EN exists onto the ID base, so a half-translated entry never renders blank —
 * it falls back field by field.
 *
 * The URL is the source of truth for locale in production. The prototype's
 * localStorage toggle is a preview affordance and is deliberately not ported:
 * indexable pages must be statically rendered per locale.
 */
import type {
  Locale,
  Location,
  Post,
  Site,
  Service,
  TrustCard,
  FleetNotes,
  FleetUnit,
  UnitClass,
} from '@/types';

/** Drops undefined/empty values so a partial overlay can't blank out ID copy. */
function overlay<T extends object>(base: T, patch: Partial<T> | undefined): T {
  if (!patch) return base;
  const out = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined || v === null) continue;
    if (typeof v === 'string' && v.trim() === '') continue;
    if (Array.isArray(v) && v.length === 0) continue;
    (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

/**
 * Whether an entry has enough EN content to be worth publishing at /en/.
 * Slug plus the three fields that would otherwise produce an unusable page:
 * no URL, no H1, or an empty SERP entry.
 */
export function hasEnLocation(l: Location): boolean {
  return Boolean(l.slugEn && l.en?.h1 && l.en?.metaTitle && l.en?.metaDescription);
}

export function hasEnPost(p: Post): boolean {
  return Boolean(p.slugEn && p.en?.title && p.en?.metaTitle && p.en?.metaDescription);
}

export function localizeLocation(l: Location, locale: Locale): Location {
  if (locale !== 'en' || !l.en) return l;
  return overlay(l, l.en as Partial<Location>);
}

export function localizePost(p: Post, locale: Locale): Post {
  if (locale !== 'en' || !p.en) return p;
  return overlay(p, p.en as Partial<Post>);
}

/**
 * Global content overlays. Unlike locations these are keyed lookups, mirroring
 * i18n.js's `localServices` (by slug) and `localTrust` (by preset).
 */
export function localizeSite(site: Site, locale: Locale): Site {
  if (locale !== 'en' || !site.en) return site;
  const en = site.en;

  const services: Service[] = (site.services ?? []).map((s) =>
    overlay(s, en.services?.[s.slug] as Partial<Service> | undefined)
  );
  const trustDefaults: TrustCard[] = (site.trustDefaults ?? []).map((t) =>
    overlay(t, en.trustDefaults?.[t.preset] as Partial<TrustCard> | undefined)
  );
  const fleetNotes: FleetNotes = overlay(site.fleetNotes, en.fleetNotes as Partial<FleetNotes>);

  // Only the badge is translatable — model names are proper nouns.
  const fleet: FleetUnit[] = (site.fleet ?? []).map((f) =>
    overlay(f, en.fleet?.[f.name] as Partial<FleetUnit> | undefined)
  );

  // Keyed by the Indonesian name, which stays the key even when the overlay
  // translates `name` itself — so look up before overlaying, not after.
  const genericUnits: UnitClass[] = (site.genericUnits ?? []).map((u) =>
    overlay(u, en.genericUnits?.[u.name])
  );

  return {
    ...site,
    services,
    trustDefaults,
    fleetNotes,
    fleet,
    genericUnits,
    // Real customer quotes are never machine-translated — keep the original
    // language in both locales (handoff rule).
    testimonials: site.testimonials,
  };
}

/* --------------------------------------------------------------------- URLs */

/** The slug to use for an entry in a given locale, or null if untranslated. */
export function localeSlug(l: Location, locale: Locale): string | null {
  if (locale === 'id') return l.slug;
  return hasEnLocation(l) ? (l.slugEn as string) : null;
}

export function localePostSlug(p: Post, locale: Locale): string | null {
  if (locale === 'id') return p.slug;
  return hasEnPost(p) ? (p.slugEn as string) : null;
}

/** Builds a site-root-relative path, prefixing /en for the English locale. */
export function localeHref(locale: Locale, path = ''): string {
  const clean = path.replace(/^\/+/, '');
  if (locale === 'en') return clean ? `/en/${clean}` : '/en';
  return clean ? `/${clean}` : '/';
}

/**
 * Href for a city entry — the only correct way to link to one.
 *
 * `localeHref(locale, l.slug)` is the trap this replaces: it prefixes /en onto
 * the *Indonesian* slug, producing a URL that `generateStaticParams` never
 * emitted. Every English page shipped with its whole city grid 404ing that way,
 * while the sitemap and hreflang stayed clean — they went through
 * `hasEnLocation` — so nothing caught it.
 *
 * A null slug means the entry has no page in this locale, so the link falls back
 * to the Indonesian URL. That page exists and carries the same information; it
 * is simply not translated yet, which beats a 404 by a wide margin.
 *
 * This resolves itself. The moment Content Studio fills an entry's EN fields
 * `hasEnLocation` turns true, /en/{slugEn} gets generated, and every link here
 * switches over with no code change.
 */
export function cityHref(l: Location, locale: Locale): string {
  const slug = localeSlug(l, locale);
  return slug === null ? localeHref('id', l.slug) : localeHref(locale, slug);
}

/** Same rule for articles. */
export function postHref(p: Post, locale: Locale): string {
  const slug = localePostSlug(p, locale);
  return slug === null ? localeHref('id', p.slug) : localeHref(locale, slug);
}

/**
 * The blog is Indonesian-only. There is no /en/blog route at all — not an
 * untranslated one, none — so `localeHref('en', 'blog')` can never resolve.
 *
 * The nav item stays in both locales rather than being dropped from English: the
 * navbar is meant to be identical on every page, and a link that lands on
 * Indonesian copy is a smaller surprise than a nav that changes shape depending
 * on which locale you are in.
 */
export function blogHref(): string {
  return localeHref('id', 'blog');
}

/**
 * Absolute URL for canonical / OG / hreflang / JSON-LD.
 *
 * Only the site root keeps a trailing slash. The prototypes canonicalise the
 * English home to `/en/` and travel to `/travel/`, but Next serves those without
 * the slash and 308-redirects the slashed form — a canonical pointing at a
 * redirect is a wasted tag, so they are normalised here.
 */
export function localeUrl(siteUrl: string, locale: Locale, path = ''): string {
  const base = siteUrl.replace(/\/+$/, '');
  const rel = localeHref(locale, path);
  return rel === '/' ? `${base}/` : `${base}${rel}`;
}

export const OG_LOCALE: Record<Locale, string> = { id: 'id_ID', en: 'en_US' };
