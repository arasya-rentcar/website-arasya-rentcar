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
import type { Locale, Location, Post, Site, Service, TrustCard, FleetNotes, FleetUnit } from '@/types';

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

  return {
    ...site,
    services,
    trustDefaults,
    fleetNotes,
    fleet,
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
