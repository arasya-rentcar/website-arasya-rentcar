/**
 * Absolute URL + canonical helpers.
 *
 * Requirements:
 * - R6.9 — exactly one `<link rel="canonical">` per Indexable_Page pointing
 *   to the absolute URL of that page in its own Locale. Noindexed
 *   Coverage_Pages still emit a canonical pointing to their own URL.
 * - R7.1 — `generateMetadata` output includes `alternates.canonical` as an
 *   absolute URL in the page's own Locale.
 * - R4.3 — hreflang values are `id-ID`, `en`, and `x-default`.
 * - R4.4 — when a page exists in only one Locale, `x-default` points to the
 *   existing Locale; the other hreflang entry is omitted.
 *
 * Design: §10 (Metadata Generator).
 *
 * Pure module: no React, no Next.js imports. The site origin is read from
 * `process.env.NEXT_PUBLIC_SITE_URL` on every call — server contexts may see
 * env changes across invocations (e.g. between tests), so module-level
 * caching is intentionally avoided.
 *
 * Env contract (enforced by `scripts/validate-env.ts`, task 1.7):
 *   `NEXT_PUBLIC_SITE_URL` is an https origin with no trailing slash,
 *   e.g. `https://arasyarentcar.com`.
 */

/** Matches one or more trailing forward slashes. */
const TRAILING_SLASH_RE = /\/+$/;

/** Matches one or more leading forward slashes. */
const LEADING_SLASH_RE = /^\/+/;

/**
 * Remove one or more trailing slashes from `s`.
 *
 * Exported for unit testing (task 6.2). Idempotent: running it twice
 * produces the same result as running it once.
 */
export function stripTrailingSlash(s: string): string {
  return s.replace(TRAILING_SLASH_RE, "");
}

/**
 * Return the validated site origin from `NEXT_PUBLIC_SITE_URL`.
 *
 * Throws a descriptive `Error` when the variable is:
 *   - unset or empty
 *   - parseable but not using the `https:` protocol
 *   - present with a trailing slash (must be a bare origin)
 *
 * Callers get a fresh read on every call — server contexts (route handlers,
 * metadata generators running during ISR) may observe env mutations between
 * invocations and a module-level cache would mask that.
 */
export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL;

  if (typeof raw !== "string" || raw === "") {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL is not set. Expected an absolute https origin " +
        'like "https://arasyarentcar.com" (no trailing slash, no path).',
    );
  }

  if (raw.endsWith("/")) {
    throw new Error(
      `NEXT_PUBLIC_SITE_URL must not include a trailing slash (received "${raw}"). ` +
        'Use a bare origin like "https://arasyarentcar.com".',
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(
      `NEXT_PUBLIC_SITE_URL is not a valid URL (received "${raw}"). ` +
        'Expected an absolute https origin like "https://arasyarentcar.com".',
    );
  }

  if (parsed.protocol !== "https:") {
    throw new Error(
      `NEXT_PUBLIC_SITE_URL must use the https: protocol (received "${raw}"). ` +
        'Use a bare origin like "https://arasyarentcar.com".',
    );
  }

  return raw;
}

/**
 * Join the site origin with `pathname` and return the normalized absolute URL.
 *
 * Normalization rules:
 *   - Accepts `pathname` with or without a leading slash.
 *   - Collapses multiple leading slashes into exactly one.
 *   - Strips any trailing slashes from the path.
 *   - The root path (`""` or `"/"` or a string that reduces to `""` after
 *     slash normalization) returns the bare site origin with no trailing
 *     slash.
 *
 * Does not encode or otherwise mutate path segments beyond slash
 * normalization; callers are responsible for producing URL-safe slugs.
 */
export function absoluteUrl(pathname: string): string {
  const siteUrl = getSiteUrl();

  // Fast path for the root: return the bare origin.
  if (pathname === "" || pathname === "/") {
    return siteUrl;
  }

  // Ensure exactly one leading slash, then strip any trailing slashes.
  const withLeadingSlash = "/" + pathname.replace(LEADING_SLASH_RE, "");
  const normalized = stripTrailingSlash(withLeadingSlash);

  // If the input was something like `"///"` the normalized path collapses to
  // `""` — treat that as the root per the contract above.
  if (normalized === "") {
    return siteUrl;
  }

  return siteUrl + normalized;
}

/**
 * Canonical URL for a locale-prefixed path.
 *
 * Thin alias over {@link absoluteUrl} so call sites read as
 * `canonicalFor(currentPath)` at the point where R6.9 / R7.1 are satisfied.
 */
export function canonicalFor(localePath: string): string {
  return absoluteUrl(localePath);
}

/**
 * Input to {@link hreflangAlternates}.
 *
 * Each property holds the locale-prefixed path for the page in that Locale,
 * or `null`/`undefined` when the page does not exist in that Locale.
 */
export interface HreflangInput {
  id?: string | null;
  en?: string | null;
}

/**
 * Hreflang URL map. Keys match the hreflang tokens required by R4.3.
 *
 * Only keys for Locales that actually exist appear in the returned object —
 * R4.4 requires omitting the `<link rel="alternate">` tag for the missing
 * Locale rather than pointing it at a fallback URL.
 */
export type HreflangAlternates = Partial<Record<"id-ID" | "en" | "x-default", string>>;

/**
 * Build the `<link rel="alternate" hreflang="…">` URL map required by
 * R4.3 and R4.4.
 *
 * Behaviour:
 *   - When both `id` and `en` paths are provided, emits `id-ID`, `en`, and
 *     `x-default`, with `x-default` pointing to the `id-ID` URL because
 *     Bahasa Indonesia is the default Locale per R4.1.
 *   - When only one Locale's path is provided, emits that Locale's entry
 *     plus `x-default` pointing to the same URL. The missing Locale key is
 *     omitted entirely (R4.4).
 *   - Values that are `null`, `undefined`, or empty strings are treated as
 *     "Locale does not exist" and their keys are omitted.
 *   - Returns an empty object when neither Locale path is provided; the
 *     caller decides whether that represents a no-op or a content error.
 */
export function hreflangAlternates(paths: HreflangInput): HreflangAlternates {
  const idPath = paths.id;
  const enPath = paths.en;

  const idUrl =
    typeof idPath === "string" && idPath !== "" ? absoluteUrl(idPath) : undefined;
  const enUrl =
    typeof enPath === "string" && enPath !== "" ? absoluteUrl(enPath) : undefined;

  const out: HreflangAlternates = {};

  if (idUrl !== undefined) {
    out["id-ID"] = idUrl;
  }
  if (enUrl !== undefined) {
    out["en"] = enUrl;
  }

  // x-default prefers the default Locale (id-ID); falls back to the English
  // URL only when the page exists in English alone.
  if (idUrl !== undefined) {
    out["x-default"] = idUrl;
  } else if (enUrl !== undefined) {
    out["x-default"] = enUrl;
  }

  return out;
}
