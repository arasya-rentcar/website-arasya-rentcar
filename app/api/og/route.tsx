/**
 * Dynamic Open Graph image endpoint — `/api/og`.
 *
 * Requirements:
 * - R6.8 — every Indexable_Page's OG image URL is unique per page; callers
 *   (see `lib/seo/metadata.ts`) achieve this by varying the query string
 *   (`title`, `subtitle`, `locale`, `pageType`). This handler only needs to
 *   render what the query string asks for; uniqueness is the caller's job.
 * - R7.2 — render a 1200×630 Open Graph PNG and set
 *   `Cache-Control: public, max-age=604800, s-maxage=604800, immutable`.
 *   `ImageResponse` from `next/og` already sets `Content-Type: image/png`
 *   and a 200 status; we only need to layer on the cache header.
 * - R7.3 — accept query parameters:
 *     - `title`    (1–90 chars, required)
 *     - `subtitle` (0–120 chars, empty allowed)
 *     - `locale`   (`id` | `en`, default `id`)
 *     - `pageType` (`homepage` | `city` | `country` | `vehicle` | `airport`
 *                   | `service` | `article` | `static`, default `static`)
 * - R7.8 — missing or invalid required parameters MUST NOT produce a 5xx
 *   response. Instead the handler renders a branded fallback image that
 *   is still 1200×630, and sets `x-og-fallback: invalid-params` so the
 *   condition is detectable without inspecting the pixels.
 *
 * Design: §13 (Open Graph Endpoint). The layout uses the primary navy
 * palette from `lib/design/tokens.ts` (primary-600 → primary-800 gradient)
 * with white text and a small pageType pill in the top-right; system fonts
 * only, no font loading round-trips on the edge.
 *
 * Runtime: `edge`, so every request is rendered near the viewer. This is
 * the runtime Vercel uses for `ImageResponse` by default.
 */

import { ImageResponse } from "next/og";

import { colors } from "@/lib/design/tokens";

export const runtime = "edge";

/** R7.2 — every rendered image is exactly 1200×630. */
const DIMENSIONS = { width: 1200, height: 630 } as const;

/** R7.2 — 7-day public cache, immutable so CDNs don't revalidate. */
const CACHE_CONTROL = "public, max-age=604800, s-maxage=604800, immutable";

type OgLocale = "id" | "en";

type OgPageType =
  | "homepage"
  | "city"
  | "country"
  | "vehicle"
  | "airport"
  | "service"
  | "article"
  | "static";

const PAGE_TYPES: readonly OgPageType[] = [
  "homepage",
  "city",
  "country",
  "vehicle",
  "airport",
  "service",
  "article",
  "static",
] as const;

const LOCALES: readonly OgLocale[] = ["id", "en"] as const;

/** Locale-specific fallback tagline when `title` is missing/invalid (R7.8). */
const FALLBACK_TAGLINE: Record<OgLocale, string> = {
  id: "Sewa Mobil dengan Supir",
  en: "Chauffeur Car Rental",
};

/** Brand name for the secondary line on the fallback layout (R7.8). */
const SITE_NAME = "Arasya Rentcar";

/** Localized labels for the `pageType` pill in the top-right corner. */
const PAGE_TYPE_LABEL: Record<OgLocale, Record<OgPageType, string>> = {
  id: {
    homepage: "Beranda",
    city: "Kota",
    country: "Negara",
    vehicle: "Armada",
    airport: "Antar Jemput Bandara",
    service: "Layanan",
    article: "Artikel",
    static: "Arasya Rentcar",
  },
  en: {
    homepage: "Home",
    city: "City",
    country: "Country",
    vehicle: "Fleet",
    airport: "Airport Transfer",
    service: "Service",
    article: "Article",
    static: "Arasya Rentcar",
  },
};

/** Shared system font stack — no network fetch on the edge. */
const FONT_FAMILY =
  '"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

/**
 * Validate and normalize the incoming query parameters.
 *
 * The contract (R7.3 / R7.8):
 *   - `title` is the only parameter whose failure triggers the fallback
 *     layout. It must be present, be a non-empty string, and be ≤ 90 chars.
 *   - `subtitle` may be empty; anything longer than 120 chars is silently
 *     truncated. That still satisfies R7.3's 0–120 bound.
 *   - `locale` defaults to `id` on any invalid value (silent).
 *   - `pageType` defaults to `static` on any invalid value; when this
 *     happens we flag the fallback header so callers can detect drift.
 */
function parseParams(searchParams: URLSearchParams): {
  title: string;
  subtitle: string;
  locale: OgLocale;
  pageType: OgPageType;
  /** `true` ⇒ render the branded fallback layout (title missing/invalid). */
  fallback: boolean;
  /** `true` ⇒ some non-title param was invalid; surface via header. */
  anyInvalid: boolean;
} {
  const rawTitle = searchParams.get("title");
  const rawSubtitle = searchParams.get("subtitle");
  const rawLocale = searchParams.get("locale");
  const rawPageType = searchParams.get("pageType");

  const titleIsValid =
    typeof rawTitle === "string" && rawTitle.length >= 1 && rawTitle.length <= 90;

  // Subtitle: null/undefined → "", too long → truncated to 120 (silent).
  const subtitle = typeof rawSubtitle === "string" ? rawSubtitle.slice(0, 120) : "";

  const locale: OgLocale =
    rawLocale !== null && (LOCALES as readonly string[]).includes(rawLocale)
      ? (rawLocale as OgLocale)
      : "id";
  const localeWasInvalid = rawLocale !== null && !(LOCALES as readonly string[]).includes(rawLocale);

  const pageType: OgPageType =
    rawPageType !== null && (PAGE_TYPES as readonly string[]).includes(rawPageType)
      ? (rawPageType as OgPageType)
      : "static";
  const pageTypeWasInvalid =
    rawPageType !== null && !(PAGE_TYPES as readonly string[]).includes(rawPageType);

  const anyInvalid = !titleIsValid || localeWasInvalid || pageTypeWasInvalid;

  return {
    title: titleIsValid ? rawTitle : SITE_NAME,
    subtitle,
    locale,
    pageType,
    fallback: !titleIsValid,
    anyInvalid,
  };
}

/**
 * Build the JSX element rendered by `ImageResponse`.
 *
 * `next/og`'s Satori-backed renderer only supports a subset of CSS, so
 * every visual tweak uses inline flex layout + solid colors + a CSS
 * `linear-gradient` background (the one supported gradient function).
 */
function renderImage(params: {
  title: string;
  subtitle: string;
  locale: OgLocale;
  pageType: OgPageType;
  fallback: boolean;
}): React.ReactElement {
  const { title, subtitle, locale, pageType, fallback } = params;
  const pill = PAGE_TYPE_LABEL[locale][pageType];
  const tagline = FALLBACK_TAGLINE[locale];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "100%",
        height: "100%",
        padding: "80px",
        color: "#ffffff",
        fontFamily: FONT_FAMILY,
        // Navy gradient: primary-600 → primary-800 (tokens.colors.primary).
        backgroundImage: `linear-gradient(135deg, ${colors.primary[600]} 0%, ${colors.primary[800]} 100%)`,
        backgroundColor: colors.primary[700],
      }}
    >
      {/* Top row: brand mark (left) + pageType pill (right). */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 28,
            fontWeight: 600,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: "rgba(255, 255, 255, 0.85)",
          }}
        >
          {SITE_NAME}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "10px 24px",
            borderRadius: 9999,
            backgroundColor: "rgba(255, 255, 255, 0.14)",
            border: "1px solid rgba(255, 255, 255, 0.28)",
            fontSize: 24,
            fontWeight: 500,
            color: "#ffffff",
          }}
        >
          {pill}
        </div>
      </div>

      {/* Middle block: the page-specific title (or fallback), plus subtitle. */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          maxWidth: "1040px",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 72,
            fontWeight: 700,
            lineHeight: 1.08,
            letterSpacing: "-0.02em",
            color: "#ffffff",
          }}
        >
          {fallback ? SITE_NAME : title}
        </div>
        {(fallback || subtitle.length > 0) && (
          <div
            style={{
              display: "flex",
              marginTop: 24,
              fontSize: 36,
              fontWeight: 400,
              lineHeight: 1.3,
              color: "rgba(255, 255, 255, 0.82)",
            }}
          >
            {fallback ? tagline : subtitle}
          </div>
        )}
      </div>

      {/* Bottom row: small wordmark anchored to the bottom-left corner. */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          fontSize: 24,
          fontWeight: 500,
          color: "rgba(255, 255, 255, 0.72)",
        }}
      >
        {locale === "id" ? "arasyarentcar.com · Sewa Mobil dengan Supir" : "arasyarentcar.com · Chauffeur Car Rental"}
      </div>
    </div>
  );
}

/**
 * Next.js App Router route handler. Always responds with a 1200×630 PNG,
 * never a 5xx, per R7.8. Validation failures degrade to a branded fallback
 * layout and surface via the `x-og-fallback` response header.
 */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const params = parseParams(url.searchParams);

  const headers = new Headers({ "Cache-Control": CACHE_CONTROL });
  if (params.anyInvalid) {
    // R7.8 — detectable fallback signal for observability / tests. The
    // image itself is still a well-formed 1200×630 PNG.
    headers.set("x-og-fallback", "invalid-params");
  }

  return new ImageResponse(renderImage(params), {
    width: DIMENSIONS.width,
    height: DIMENSIONS.height,
    headers,
  });
}
