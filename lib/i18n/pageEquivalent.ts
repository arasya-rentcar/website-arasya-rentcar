/**
 * Locale-switcher URL rewriter: resolves the equivalent path in the target
 * locale for a given current path, or signals that no structural equivalent
 * exists so the caller can fall back to the target-locale homepage.
 *
 * Pure, strict, no side effects, no React / Next.js / Content_Layer imports.
 * Consumers:
 *   - `components/nav/LocaleSwitcher.tsx` (task 7.4) — passes the current URL
 *     path plus the active and target {@link Locale} and navigates to the
 *     returned value when non-null, or to the target-locale homepage (R4.7)
 *     when the function returns `null`.
 *
 * Requirements satisfied:
 *   - R4.5 — every page exposes one selectable option per supported locale;
 *     this helper computes the `href` for the non-active option.
 *   - R4.6 — when an equivalent page exists in the target locale, the
 *     switcher navigates to the equivalent URL; this helper swaps the static
 *     segments via {@link STATIC_SEGMENTS} while preserving the
 *     locale-invariant dynamic slugs (city / country / vehicle / service /
 *     article) plus any trailing sub-segments (`airport-transfer`, combined
 *     city-and-vehicle) and any query string or hash.
 *   - R4.7 — when no equivalent exists the function returns `null`, letting
 *     the LocaleSwitcher redirect to `/` (id) or `/en` (en).
 *
 * Design reference: §18 (i18n). The `STATIC_SEGMENTS` table in
 * {@link ./slugMap} is the single source of truth for the ID↔EN segment
 * pairing (R17.3); this module is a thin, URL-shaped consumer of that table.
 *
 * Notes on the {@link Locale} import: this module imports {@link Locale}
 * from `./slugMap` instead of `./getDictionary` to avoid a cycle with the
 * dictionary loader. A future task will consolidate the type under
 * `getDictionary.ts` once the wiring is stable.
 */

import { STATIC_SEGMENTS, type Locale } from "./slugMap";

/**
 * Logical page types whose static segment can appear as the FIRST segment
 * after the locale root. `airportTransfer` is intentionally omitted: it only
 * appears as a trailing sub-segment under {@link STATIC_SEGMENTS.cityLanding}
 * and therefore must not be matched as a top-level page. Preserving it on
 * pass-through is handled by the "remaining segments" copy below and works
 * regardless because `STATIC_SEGMENTS.airportTransfer.id ===
 * STATIC_SEGMENTS.airportTransfer.en === "airport-transfer"`.
 *
 * Each value in this tuple is a valid key on {@link STATIC_SEGMENTS}. Listed
 * in the same order as the segment table so the matching loop walks a
 * predictable priority order. All first-segment values are pairwise distinct
 * across this subset within each locale (verified by the shape of
 * `STATIC_SEGMENTS`), so the first match is unambiguous.
 */
const TOP_LEVEL_PAGE_TYPES = [
  "cityLanding",
  "country",
  "vehicleListing",
  "service",
  "blog",
  "booking",
  "contact",
  "faq",
  "terms",
  "privacy",
] as const satisfies ReadonlyArray<keyof typeof STATIC_SEGMENTS>;

/**
 * The homepage path for a given locale. Mirrors R4.7's redirect target: `/`
 * for Bahasa Indonesia and `/en` for English.
 */
function homepagePath(locale: Locale): string {
  return locale === "id" ? "/" : "/en";
}

/**
 * Prefix a locale-stripped body (e.g. `"car-rental/bogor"`) with the locale
 * root. An empty body returns the locale homepage instead of producing a
 * trailing slash, matching the canonical form used across the product
 * (R3.7 / R4.7).
 */
function prefixWithLocaleRoot(locale: Locale, body: string): string {
  if (body.length === 0) {
    return homepagePath(locale);
  }
  return locale === "id" ? `/${body}` : `/en/${body}`;
}

/**
 * Split a path value into its URL pathname and the preserved suffix
 * (query + hash, if present). Matches the common `WHATWG URL` convention
 * that `?` delimits the start of the query and `#` delimits the start of
 * the hash; whichever appears first in the raw string ends the pathname.
 *
 * Behavior by example:
 *   - `"/foo"`           → `{ pathname: "/foo", suffix: "" }`
 *   - `"/foo?x=1"`       → `{ pathname: "/foo", suffix: "?x=1" }`
 *   - `"/foo#top"`       → `{ pathname: "/foo", suffix: "#top" }`
 *   - `"/foo?x=1#top"`   → `{ pathname: "/foo", suffix: "?x=1#top" }`
 *   - `"/foo#top?x=1"`   → `{ pathname: "/foo", suffix: "#top?x=1" }` (fragment-first; the
 *                         `?` is part of the fragment here, which we pass through opaquely)
 */
function splitPathnameAndSuffix(path: string): {
  readonly pathname: string;
  readonly suffix: string;
} {
  const queryIdx = path.indexOf("?");
  const hashIdx = path.indexOf("#");

  let delimiter: number;
  if (queryIdx >= 0 && hashIdx >= 0) {
    delimiter = Math.min(queryIdx, hashIdx);
  } else if (queryIdx >= 0) {
    delimiter = queryIdx;
  } else if (hashIdx >= 0) {
    delimiter = hashIdx;
  } else {
    delimiter = -1;
  }

  if (delimiter === -1) {
    return { pathname: path, suffix: "" };
  }
  return { pathname: path.slice(0, delimiter), suffix: path.slice(delimiter) };
}

/**
 * Remove the `from`-locale root from a pathname and return the body (the
 * portion after the locale root, without a leading slash). Returns `null`
 * when the pathname is inconsistent with the claimed `from` locale — e.g.
 * `from === "id"` but the pathname starts with `/en`, or vice versa — which
 * signals the caller to treat the input as having no equivalent (R4.7).
 *
 * Homepage inputs (`"/"` for id, `"/en"` / `"/en/"` for en) return an empty
 * string. Trailing slashes on non-homepage paths are normalized away.
 */
function stripFromLocaleRoot(
  pathname: string,
  from: Locale,
): string | null {
  if (from === "en") {
    if (pathname === "/en" || pathname === "/en/") {
      return "";
    }
    if (pathname.startsWith("/en/")) {
      return pathname.slice("/en/".length);
    }
    // pathname claims to be English but lacks the `/en` prefix — malformed
    // for this call. Signal no equivalent so the caller falls back per R4.7.
    return null;
  }

  // from === "id"
  if (pathname === "/en" || pathname === "/en/" || pathname.startsWith("/en/")) {
    // pathname is in the English tree but caller claimed id — malformed.
    return null;
  }
  if (pathname === "" || pathname === "/") {
    return "";
  }
  return pathname.startsWith("/") ? pathname.slice(1) : pathname;
}

/**
 * Resolve the URL path of the equivalent page in the target locale.
 *
 * The helper performs a purely structural rewrite: it swaps the first static
 * segment via {@link STATIC_SEGMENTS} (design §18, R17.3) and preserves the
 * remaining segments verbatim because dynamic slugs (city, country,
 * vehicle, service, article) are locale-invariant per R3.2 / R3.3. It does
 * NOT query the Content_Layer — existence of the target page is the
 * caller's responsibility; if the caller needs a stricter "only navigate
 * when the content actually exists" check it can additionally consult the
 * Content_Layer and fall back to {@link homepagePath} itself.
 *
 * Return value:
 *   - `string` — the rewritten path (always starts with `/`), including any
 *     query string and/or hash copied from the input. Callers can use it
 *     directly as a `<Link href>` or `router.push` target.
 *   - `null`   — no structural equivalent exists (the first segment doesn't
 *     match any known `from`-locale page type, or the pathname is
 *     inconsistent with `from`). Per R4.7 the LocaleSwitcher treats this as
 *     "redirect to the target-locale homepage".
 *
 * Reflexive identity: when `from === to` the input path is returned
 * unchanged — including its query string and hash — so the switcher can
 * safely call this helper for every option without special-casing the
 * active locale.
 *
 * Homepage handling: `/` and `/en` (with or without a trailing slash) both
 * resolve to {@link homepagePath}`(to)` plus the preserved suffix.
 *
 * @example Homepage
 * ```ts
 * getPageEquivalent("/", "id", "en");                    // "/en"
 * getPageEquivalent("/en", "en", "id");                  // "/"
 * getPageEquivalent("/en/", "en", "id");                 // "/"
 * ```
 *
 * @example City landing
 * ```ts
 * getPageEquivalent("/sewa-mobil/bogor", "id", "en");    // "/en/car-rental/bogor"
 * getPageEquivalent("/en/car-rental/bogor", "en", "id"); // "/sewa-mobil/bogor"
 * ```
 *
 * @example City airport-transfer sub-page
 * ```ts
 * getPageEquivalent("/sewa-mobil/bogor/airport-transfer", "id", "en");
 * // → "/en/car-rental/bogor/airport-transfer"
 * ```
 *
 * @example Combined city + vehicle
 * ```ts
 * getPageEquivalent("/sewa-mobil/bogor/innova-reborn", "id", "en");
 * // → "/en/car-rental/bogor/innova-reborn"
 * ```
 *
 * @example Country landing
 * ```ts
 * getPageEquivalent("/internasional/singapore", "id", "en"); // "/en/international/singapore"
 * ```
 *
 * @example Vehicle listing and detail
 * ```ts
 * getPageEquivalent("/armada", "id", "en");                 // "/en/fleet"
 * getPageEquivalent("/armada/innova-reborn", "id", "en");   // "/en/fleet/innova-reborn"
 * getPageEquivalent("/en/fleet/innova-reborn", "en", "id"); // "/armada/innova-reborn"
 * ```
 *
 * @example Service detail
 * ```ts
 * getPageEquivalent("/layanan/corporate", "id", "en");      // "/en/services/corporate"
 * ```
 *
 * @example Blog index and article
 * ```ts
 * getPageEquivalent("/blog", "id", "en");                   // "/en/blog"
 * getPageEquivalent("/blog/tips-sewa-mobil", "id", "en");   // "/en/blog/tips-sewa-mobil"
 * ```
 *
 * @example Booking, contact, FAQ, terms, privacy
 * ```ts
 * getPageEquivalent("/booking", "id", "en");                // "/en/booking"
 * getPageEquivalent("/kontak", "id", "en");                 // "/en/contact"
 * getPageEquivalent("/faq", "id", "en");                    // "/en/faq"
 * getPageEquivalent("/syarat-ketentuan", "id", "en");       // "/en/terms"
 * getPageEquivalent("/kebijakan-privasi", "id", "en");      // "/en/privacy"
 * ```
 *
 * @example Query string and hash preservation
 * ```ts
 * getPageEquivalent("/sewa-mobil/bogor?utm_source=x#pricing", "id", "en");
 * // → "/en/car-rental/bogor?utm_source=x#pricing"
 * ```
 *
 * @example Unknown / unmapped path — caller should redirect to locale homepage (R4.7)
 * ```ts
 * getPageEquivalent("/akun/profil", "id", "en");            // null
 * getPageEquivalent("/en/dashboard", "en", "id");           // null
 * ```
 *
 * @example Reflexive (same locale) — returned unchanged
 * ```ts
 * getPageEquivalent("/sewa-mobil/bogor", "id", "id");       // "/sewa-mobil/bogor"
 * getPageEquivalent("/en/fleet", "en", "en");               // "/en/fleet"
 * ```
 *
 * @param path - The current URL path, including any query string and hash.
 *               Expected to be an absolute pathname beginning with `/`
 *               (e.g. `/sewa-mobil/bogor` or `/en/car-rental/bogor`).
 * @param from - The locale the current path is expressed in. Used to
 *               identify which side of `STATIC_SEGMENTS` to match against.
 * @param to   - The locale to rewrite the path into.
 * @returns The rewritten path in the target locale, or `null` when no
 *          structural equivalent exists.
 */
export function getPageEquivalent(
  path: string,
  from: Locale,
  to: Locale,
): string | null {
  // Reflexive identity — preserve the input verbatim including suffix (R4.5:
  // the active-locale option is marked selected and non-actionable, but the
  // caller may still compute an href for it defensively).
  if (from === to) {
    return path;
  }

  const { pathname, suffix } = splitPathnameAndSuffix(path);

  const rawBody = stripFromLocaleRoot(pathname, from);
  if (rawBody === null) {
    // Pathname is inconsistent with the declared `from` locale.
    return null;
  }

  // Collapse trailing slashes so `"/sewa-mobil/"` and `"/sewa-mobil"` behave
  // identically while still distinguishing the homepage (empty body).
  const body = rawBody.replace(/\/+$/, "");
  if (body.length === 0) {
    // Homepage input → homepage output in the target locale (R4.7's
    // structural analogue: root ↔ root is always a valid equivalent).
    return `${homepagePath(to)}${suffix}`;
  }

  const segments = body.split("/");
  const firstSegment = segments[0];
  if (firstSegment === undefined || firstSegment.length === 0) {
    // Shouldn't happen after the empty-body guard above, but keep the
    // function total under `noUncheckedIndexedAccess`.
    return null;
  }

  // Identify the page type by matching the first segment against the
  // `from`-locale column of `STATIC_SEGMENTS`. All top-level segment values
  // are distinct within each locale, so the first match is unambiguous.
  let matchedType: (typeof TOP_LEVEL_PAGE_TYPES)[number] | null = null;
  for (const type of TOP_LEVEL_PAGE_TYPES) {
    if (STATIC_SEGMENTS[type][from] === firstSegment) {
      matchedType = type;
      break;
    }
  }

  if (matchedType === null) {
    // Unknown top-level segment — e.g. `/akun`, `/admin`, `/studio` — has no
    // locale equivalent. Caller falls back to the target-locale homepage.
    return null;
  }

  const targetFirstSegment = STATIC_SEGMENTS[matchedType][to];
  const remainingSegments = segments.slice(1);
  const targetBody =
    remainingSegments.length === 0
      ? targetFirstSegment
      : `${targetFirstSegment}/${remainingSegments.join("/")}`;

  return `${prefixWithLocaleRoot(to, targetBody)}${suffix}`;
}
