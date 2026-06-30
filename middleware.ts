import { NextResponse, type NextRequest } from "next/server";

/**
 * Arasya Rentcar middleware — Phases 1 (task 1.9) + 15.1 + 15.2.
 *
 * Responsibilities owned by this file per design §27 and §18:
 *   1. 301-redirect non-canonical URL forms to their canonical
 *      lowercase, no-trailing-slash form before any other processing,
 *      per R3.7 and design §27.
 *   2. Identify the active Locale from the URL path prefix (`/en` → "en",
 *      every other non-asset path → "id"). This is the scaffolding for R3.1.
 *   3. Propagate the detected locale to downstream Server Components via
 *      the `x-locale` request header so they can read it before the
 *      `lib/i18n/*` helpers exist.
 *   4. Apply baseline security response headers (HSTS, CSP,
 *      `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`)
 *      to every response per R19.3 / R19.4 and design §27. The same
 *      headers are also applied to 301 canonicalization redirects so
 *      crawlers see a consistent security posture even on the redirect
 *      hop.
 *
 * Intentionally NOT handled here yet:
 *   - TODO(task 2.8 follow-up): once `lib/i18n/slugMap.ts` is wired in,
 *     replace the inline locale detection with the centralized helper so
 *     static-segment normalization and slug-map lookups share one source
 *     of truth.
 *   - CSP nonces for `script-src` — deferred to a dedicated security
 *     hardening pass; `'unsafe-inline'` is allowed for now to keep the
 *     stack functional without rewriting every inline script/style site.
 */

/** Supported locales. Kept inline until `lib/i18n/*` is introduced in task 2.7+. */
type Locale = "id" | "en";

/**
 * Baseline security headers applied to every response that exits this
 * middleware. Lower-cased keys match the runtime `Headers` API casing
 * conventions; values are static strings so they can be cached.
 *
 * - HSTS: 2-year `max-age` (63072000 s) with `includeSubDomains` and
 *   `preload`. R19.3 requires at least 15552000 s; we exceed that to be
 *   eligible for the HSTS preload list.
 * - `Content-Security-Policy`: tight policy that allows the third-party
 *   origins our analytics + chat widgets need (Plausible, Crisp, Tawk),
 *   Supabase realtime websocket, WhatsApp click-to-chat embeds, plus
 *   `'unsafe-inline'` on `script-src`/`style-src` to support Next.js'
 *   inlined runtime + Tailwind v4 token styles. `frame-ancestors 'none'`
 *   prevents clickjacking; `upgrade-insecure-requests` upgrades any
 *   accidental HTTP subresources.
 * - `X-Content-Type-Options: nosniff`: prevents MIME-sniffing.
 * - `Referrer-Policy: strict-origin-when-cross-origin`: industry default.
 * - `Permissions-Policy`: denies camera/microphone/geolocation/
 *   browsing-topics, none of which the website uses.
 */
function buildSecurityHeaders(httpsRequest: boolean): Readonly<Record<string, string>> {
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://plausible.io https://*.crisp.chat https://embed.tawk.to",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://plausible.io https://*.supabase.co wss://*.supabase.co",
    "frame-src 'self' https://wa.me https://api.whatsapp.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];
  // `upgrade-insecure-requests` only on HTTPS (prod/edge); skip on HTTP (local dev)
  // so CSS and other subresources can load over plain HTTP.
  if (httpsRequest) {
    csp.push("upgrade-insecure-requests");
  }

  return Object.freeze({
    "strict-transport-security": "max-age=63072000; includeSubDomains; preload",
    "x-content-type-options": "nosniff",
    "referrer-policy": "strict-origin-when-cross-origin",
    "permissions-policy":
      "camera=(), microphone=(), geolocation=(), browsing-topics=()",
    "content-security-policy": csp.join("; "),
  });
}

/**
 * Mutate `response.headers` in place with the baseline security headers.
 * The response object is returned for ergonomic chaining.
 */
/** Detect HTTPS from the request URL (true for prod/edge, false for HTTP dev). */
function isHttpsRequest(request: NextRequest): boolean {
  const proto = request.headers.get("x-forwarded-proto") || request.nextUrl.protocol;
  return proto === "https";
}

function applySecurityHeaders(response: NextResponse, httpsRequest: boolean): NextResponse {
  const headers = buildSecurityHeaders(httpsRequest);
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }
  return response;
}

/**
 * Return the canonical form of `pathname` if the input is non-canonical,
 * or `null` if the input is already canonical and no redirect is needed.
 *
 * Canonicalization rules (R3.7, design §27):
 *   - Uppercase ASCII letters anywhere in the path are lowered to their
 *     lowercase form. `toLowerCase()` only touches ASCII letters in
 *     practice for the slug formats we accept (R3.4); accented and
 *     other non-ASCII characters fall through unchanged.
 *   - A single trailing slash is stripped from any path that is more
 *     than one character long. The root path `/` is preserved as-is.
 *
 * The two transformations compose: a request like `/Sewa-Mobil/Bogor/`
 * lowers to `/sewa-mobil/bogor/` and then has its trailing slash
 * stripped, yielding `/sewa-mobil/bogor`. The caller emits a single 301
 * to that final form rather than chaining two hops.
 *
 * Returning `null` for already-canonical paths lets the caller skip the
 * redirect path entirely without allocating a `URL`.
 */
function getCanonicalPathname(pathname: string): string | null {
  if (pathname === "/") return null;

  let canonical = pathname;

  // Lowercase ASCII letters; non-ASCII characters pass through unchanged.
  const lower = canonical.toLowerCase();
  if (lower !== canonical) {
    canonical = lower;
  }

  // Strip a single trailing slash, but never reduce the path below "/".
  if (canonical.length > 1 && canonical.endsWith("/")) {
    canonical = canonical.slice(0, -1);
  }

  return canonical !== pathname ? canonical : null;
}

/**
 * Derive the active locale from the request pathname.
 *
 * Rules (design §18, R3.1):
 *   - Paths that equal `/en` or begin with `/en/` resolve to the English locale.
 *   - Every other non-asset path resolves to the Bahasa Indonesia locale.
 *
 * This helper is intentionally local to the middleware stub; the canonical
 * implementation will live in `lib/i18n/` after task 2.7.
 */
function getLocaleFromPath(pathname: string): Locale {
  if (pathname === "/en" || pathname.startsWith("/en/")) {
    return "en";
  }
  return "id";
}

export function middleware(request: NextRequest) {
  const https = isHttpsRequest(request);

  // R3.7: redirect any non-canonical URL form to its canonical equivalent
  // before doing anything else. This runs ahead of locale detection so a
  // request like `/EN/CAR-RENTAL/` hits the 301 once and lands on
  // `/en/car-rental` for the next request, rather than being processed
  // with an uppercase-locale prefix.
  const canonicalPath = getCanonicalPathname(request.nextUrl.pathname);
  if (canonicalPath !== null) {
    const url = request.nextUrl.clone();
    url.pathname = canonicalPath;
    return applySecurityHeaders(NextResponse.redirect(url, 301), https);
  }

  const pathname = request.nextUrl.pathname;
  const locale = getLocaleFromPath(pathname);

  // Forward a mutable copy of the incoming headers with `x-locale` attached so
  // Server Components can read the active locale without re-parsing the URL.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-locale", locale);

  // Path rewrite (R3.1, R4.1):
  //   - Bahasa Indonesia URLs are bare (no `/id` prefix) per R3.1, but the
  //     App Router routes are nested under `app/[locale]/...`. We therefore
  //     rewrite every Indonesian request to inject the `/id` locale segment
  //     internally so `[locale]` gets filled. The public URL stays bare.
  //   - English URLs already carry `/en/...` in the public form, so they
  //     match `[locale] = en` directly with no rewrite needed.
  //   - The bare root `/` becomes `/id` internally; `/en` stays as-is.
  //   - Asset paths and `/api/*` are excluded by the matcher and never
  //     reach this code path.
  if (locale === "id") {
    const url = request.nextUrl.clone();
    if (pathname === "/") {
      url.pathname = "/id";
    } else {
      url.pathname = `/id${pathname}`;
    }
    const response = NextResponse.rewrite(url, {
      request: {
        headers: requestHeaders,
      },
    });
    return applySecurityHeaders(response, https);
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  return applySecurityHeaders(response, https);
}

/**
 * Matcher excludes asset and API paths so the middleware only runs on
 * user-facing routes. Anything with a file extension (for example
 * `favicon.ico`, `robots.txt`, `sitemap.xml`, images, fonts) is skipped.
 */
export const config = {
  matcher: [
    /*
     * Match every request path except:
     *   - `_next/static`  (build assets)
     *   - `_next/image`   (image optimizer)
     *   - `api/*`         (route handlers manage their own locale)
     *   - any path containing a `.` (static files with extensions)
     */
    "/((?!_next/static|_next/image|api/|.*\\.).*)",
  ],
};
