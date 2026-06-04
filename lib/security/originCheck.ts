/**
 * Origin-check helper for the Booking_Form Route Handler (design §16).
 *
 * Requirements:
 * - R19.5: THE Route Handler accepting Booking_Form submissions SHALL validate
 *   the request `Origin` or `Referer` against the configured site origin, SHALL
 *   reject submissions from mismatched origins with an HTTP 403 response, and
 *   SHALL NOT persist rejected submissions to the Lead_Store.
 *
 * Design:
 * - §16 (Booking Route Handler): `app/api/booking/route.ts` calls this helper
 *   at the very top of `POST` and returns a 403 `{ code: "origin_rejected" }`
 *   response whenever {@link originCheckResult} reports `ok: false`.
 *
 * Pure module: no React, no Next.js, no Supabase, no side effects besides a
 * single read of `process.env.NEXT_PUBLIC_SITE_URL` when callers rely on the
 * default site URL. Safe to import from Route Handlers, scripts, and unit
 * tests alike. All URL parsing goes through the WHATWG `URL` class — we
 * compare only `protocol` and `host` (host = hostname + optional port) and
 * never look at paths, query strings, fragments, or credentials.
 */

/** Hostnames considered "the developer's machine" during local development. */
const LOCALHOST_HOSTNAMES: ReadonlySet<string> = new Set([
  "localhost",
  "127.0.0.1",
  "[::1]",
  "0.0.0.0",
]);

/**
 * Parse an input string with the WHATWG `URL` constructor, returning `null`
 * on any failure. Callers want a total function so they can express origin
 * comparison as pure boolean logic.
 */
function safeParseUrl(input: string | null | undefined): URL | null {
  if (typeof input !== "string" || input.length === 0) {
    return null;
  }
  try {
    return new URL(input);
  } catch {
    return null;
  }
}

/** True iff `url.hostname` is one of the recognized loopback addresses. */
function isLocalhostUrl(url: URL): boolean {
  return LOCALHOST_HOSTNAMES.has(url.hostname);
}

/**
 * Compare two parsed URLs by protocol + host. `host` already folds in the
 * port (empty string when the URL uses the protocol default), so this is the
 * canonical "same origin" check without the user-info or path noise the raw
 * `URL.origin` property happens to carry.
 */
function sameProtocolAndHost(a: URL, b: URL): boolean {
  return a.protocol === b.protocol && a.host === b.host;
}

/**
 * Returns `true` iff `origin` parses to the same protocol+host as `siteUrl`.
 *
 * When `siteUrl` is omitted it falls back to `process.env.NEXT_PUBLIC_SITE_URL`
 * (R19.9, design §20). If either the site URL or the request origin cannot be
 * parsed by the WHATWG `URL` constructor, the function returns `false` — a
 * missing or malformed config is treated as "no same-origin claim can be
 * proven", which the caller converts into a 403.
 *
 * Localhost accommodation: when the configured site URL resolves to a
 * loopback hostname (`localhost`, `127.0.0.1`, `[::1]`, `0.0.0.0`) the
 * comparison is relaxed so that `http://localhost:3000` and
 * `http://127.0.0.1:3000` are treated as the same origin during local dev.
 * In that mode we require matching protocol + port, and we require the
 * request origin to also be a loopback hostname. Production site URLs never
 * enter this branch.
 *
 * @example Exact match
 * ```ts
 * isSameOrigin("https://arasya.id", "https://arasya.id"); // true
 * ```
 *
 * @example Mismatched protocol or port
 * ```ts
 * isSameOrigin("http://arasya.id", "https://arasya.id");  // false
 * isSameOrigin("https://arasya.id:8443", "https://arasya.id"); // false
 * ```
 *
 * @example Localhost cross-aliasing during dev
 * ```ts
 * isSameOrigin("http://127.0.0.1:3000", "http://localhost:3000"); // true
 * isSameOrigin("http://localhost:3000", "http://127.0.0.1:3000"); // true
 * isSameOrigin("http://localhost:3001", "http://localhost:3000"); // false (port)
 * ```
 *
 * @example Nullish or malformed input
 * ```ts
 * isSameOrigin(undefined, "https://arasya.id"); // false
 * isSameOrigin("not a url", "https://arasya.id"); // false
 * isSameOrigin("https://arasya.id");            // false when NEXT_PUBLIC_SITE_URL is unset
 * ```
 */
export function isSameOrigin(
  origin: string | null | undefined,
  siteUrl: string | undefined = process.env.NEXT_PUBLIC_SITE_URL,
): boolean {
  const siteParsed = safeParseUrl(siteUrl);
  if (siteParsed === null) {
    return false;
  }
  const originParsed = safeParseUrl(origin);
  if (originParsed === null) {
    return false;
  }

  if (isLocalhostUrl(siteParsed)) {
    // Dev mode: allow any loopback hostname as long as protocol + port match.
    // This keeps `http://localhost:3000` and `http://127.0.0.1:3000`
    // interchangeable, which is the common case when running `next dev` and
    // opening the site via a different alias than the one baked into
    // `NEXT_PUBLIC_SITE_URL`.
    return (
      isLocalhostUrl(originParsed) &&
      originParsed.protocol === siteParsed.protocol &&
      originParsed.port === siteParsed.port
    );
  }

  return sameProtocolAndHost(siteParsed, originParsed);
}

/**
 * Shape of the `req` argument consumed by {@link originCheckResult}. We
 * accept either a live WHATWG `Headers` instance (what Next.js Route
 * Handlers pass in via `Request.headers`) or a plain header bag (what unit
 * tests typically supply). The plain-bag form matches the `IncomingMessage`
 * `headers` shape used elsewhere in the Node ecosystem.
 */
export interface OriginCheckRequestLike {
  readonly headers: Headers | Record<string, string | string[] | undefined>;
}

/**
 * Structured result returned by {@link originCheckResult}. `reason` is only
 * present on rejection and is a short human-readable string aimed at server
 * logs — the Route Handler discards the reason and emits a generic
 * `{ code: "origin_rejected" }` body to the client (design §16).
 */
export interface OriginCheckResult {
  readonly ok: boolean;
  readonly reason?: string;
}

/**
 * Look up a header case-insensitively across both accepted input shapes.
 * Returns the first value when the header appears multiple times, mirroring
 * browser behavior for `Origin` and `Referer` (which are single-valued by
 * spec). Returns `null` when the header is absent or empty.
 */
function readHeader(
  headers: Headers | Record<string, string | string[] | undefined>,
  name: string,
): string | null {
  if (typeof Headers !== "undefined" && headers instanceof Headers) {
    const value = headers.get(name);
    return value !== null && value.length > 0 ? value : null;
  }

  // Plain object path: iterate keys so we can match case-insensitively
  // without assuming the caller lower-cased them.
  const target = name.toLowerCase();
  const bag = headers as Record<string, string | string[] | undefined>;
  for (const key of Object.keys(bag)) {
    if (key.toLowerCase() !== target) continue;
    const raw = bag[key];
    if (typeof raw === "string") {
      return raw.length > 0 ? raw : null;
    }
    if (Array.isArray(raw) && raw.length > 0) {
      const first = raw[0];
      return typeof first === "string" && first.length > 0 ? first : null;
    }
  }
  return null;
}

/**
 * Normalize a `Referer` header into an origin string (`<protocol>//<host>`)
 * or `null` when it is absent or unparseable. Some browsers omit the
 * `Origin` header for same-origin `GET`/`POST` requests (indicated by
 * `Sec-Fetch-Site: same-origin`), so the Route Handler falls back to
 * `Referer` per R19.5.
 */
function refererToOrigin(referer: string | null): string | null {
  const parsed = safeParseUrl(referer);
  if (parsed === null) return null;
  // `URL.origin` is exactly `protocol//host` for HTTP(S) URLs, which is what
  // `isSameOrigin` expects as input.
  return parsed.origin === "null" ? null : parsed.origin;
}

/**
 * Pure predicate that inspects a request's `Origin` (with `Referer`
 * fallback) and reports whether the request was issued from the configured
 * site origin. The Route Handler turns `{ ok: false }` into an HTTP 403
 * response with `{ code: "origin_rejected" }` (design §16, R19.5).
 *
 * Behavior:
 * 1. If the `Origin` header is present and parses to the same protocol+host
 *    as `NEXT_PUBLIC_SITE_URL`, return `{ ok: true }`.
 * 2. Else, if `Origin` is absent but `Referer` is present, parse `Referer`
 *    as an absolute URL, reduce it to its origin, and apply the same check.
 * 3. Otherwise, return `{ ok: false, reason: "…" }`.
 *
 * The `reason` string is stable enough for log greps (`origin_header_missing`,
 * `origin_header_mismatch`, `referer_fallback_mismatch`,
 * `referer_fallback_unparseable`, `site_url_unconfigured`) but is not part of
 * the public HTTP contract.
 *
 * @example Happy path — valid `Origin`
 * ```ts
 * originCheckResult({
 *   headers: new Headers({ origin: "https://arasya.id" }),
 * });
 * // → { ok: true }
 * ```
 *
 * @example Fallback to `Referer` when `Origin` is absent
 * ```ts
 * originCheckResult({
 *   headers: { referer: "https://arasya.id/id/kota/bogor" },
 * });
 * // → { ok: true }
 * ```
 *
 * @example Rejected cross-origin request
 * ```ts
 * originCheckResult({
 *   headers: new Headers({ origin: "https://evil.example.com" }),
 * });
 * // → { ok: false, reason: "origin_header_mismatch" }
 * ```
 */
export function originCheckResult(req: OriginCheckRequestLike): OriginCheckResult {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (safeParseUrl(siteUrl) === null) {
    return { ok: false, reason: "site_url_unconfigured" };
  }

  const originHeader = readHeader(req.headers, "origin");
  if (originHeader !== null) {
    return isSameOrigin(originHeader, siteUrl)
      ? { ok: true }
      : { ok: false, reason: "origin_header_mismatch" };
  }

  const refererHeader = readHeader(req.headers, "referer");
  if (refererHeader !== null) {
    const refererOrigin = refererToOrigin(refererHeader);
    if (refererOrigin === null) {
      return { ok: false, reason: "referer_fallback_unparseable" };
    }
    return isSameOrigin(refererOrigin, siteUrl)
      ? { ok: true }
      : { ok: false, reason: "referer_fallback_mismatch" };
  }

  return { ok: false, reason: "origin_header_missing" };
}
