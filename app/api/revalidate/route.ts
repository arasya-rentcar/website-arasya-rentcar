/**
 * app/api/revalidate/route.ts
 *
 * On-demand revalidation Route Handler — POST `/api/revalidate`.
 *
 * Receives notifications from the Supabase `pg_net` triggers defined in
 * `supabase/migrations/0004_triggers_revalidate.sql` whenever a row in
 * any page-backing table is inserted, updated, or deleted. The trigger
 * payload is `{ entityType, slug }`; the handler maps that pair to the
 * affected URLs in both locales (Bahasa Indonesia at `/`, English at
 * `/en`) and calls `revalidatePath()` for each.
 *
 * Requirements:
 * - R17.11 — On-demand revalidation endpoint protected by a shared
 *            `REVALIDATE_SECRET` header check; mismatch returns 401.
 * - R22.10 — Content publish to public surface within 5 minutes via
 *            ISR plus on-demand revalidation. This handler is the
 *            on-demand half; ISR fallback is configured per-page.
 * - R24.2  — Supabase database trigger invokes this endpoint with the
 *            `x-revalidate-secret` header when structured-content rows
 *            change. The handler must accept `{ entityType, slug }`
 *            and revalidate the matching paths.
 *
 * Design reference: §7.1, §26.
 *
 * Pipeline order (each step is a return-on-fail gate before the next):
 *   1. Secret presence/match check     → 401 `unauthorized`
 *   2. Server-side env validation      → 500 `config_error`
 *   3. JSON body parse                 → 400 `invalid_json`
 *   4. Payload shape validation        → 400 `invalid_payload`
 *   5. Allowed entityType check        → 400 `unknown_entity_type`
 *   6. Slug shape check                → 400 `invalid_slug`
 *   7. Per-entity fan-out + revalidate → 200 `{ ok: true, revalidated }`
 *
 * Per-entity fan-out (matches design §7.1 / §26):
 *
 *   | entityType | Paths revalidated                                                |
 *   | ---------- | ---------------------------------------------------------------- |
 *   | city       | `/`, `/en`, `/sewa-mobil/{slug}`, `/en/car-rental/{slug}`,       |
 *   |            | `/sewa-mobil/{slug}/airport-transfer`,                           |
 *   |            | `/en/car-rental/{slug}/airport-transfer`                         |
 *   | country    | `/internasional/{slug}`, `/en/international/{slug}`              |
 *   | vehicle    | `/armada`, `/en/fleet`, `/armada/{slug}`, `/en/fleet/{slug}`     |
 *   | service    | `/layanan/{slug}`, `/en/services/{slug}`                         |
 *   | airport    | (no path fan-out — see note below)                               |
 *   | article    | `/blog`, `/en/blog`, `/blog/{slug}`, `/en/blog/{slug}`           |
 *
 * Airport rows: airports are children of cities and the airport landing
 * URL is `/sewa-mobil/{citySlug}/airport-transfer`. The trigger payload
 * carries the airport `code` (not a city slug), so this handler has no
 * city context to fan out from. The migration 0004 join-table trigger
 * on `city_airports` already fires `entityType: 'city'` per parent
 * city, which covers the real revalidation. We therefore accept the
 * `airport` payload to avoid 400-ing the trigger but produce an empty
 * fan-out.
 *
 * Path-builder choices: `staticPath(locale, key)` from `lib/i18n/slugMap`
 * is used for the static listing pages (`/armada`, `/blog`). Dynamic
 * paths (`/sewa-mobil/{slug}` etc.) are built via the dedicated
 * `citySlugPath` / `countrySlugPath` / `vehicleSlugPath` / `servicePath`
 * builders so the locale-segment mapping stays centralized in one
 * module.
 */

import "server-only";

import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

import {
  citySlugPath,
  countrySlugPath,
  servicePath,
  STATIC_SEGMENTS,
  staticPath,
  vehicleSlugPath,
} from "@/lib/i18n/slugMap";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Closed set of `entityType` values the Supabase triggers may emit.
 * Anything outside this set is rejected with `unknown_entity_type` so a
 * misconfigured trigger surfaces as a clean 400 in the logs rather
 * than silently revalidating nothing.
 */
const ALLOWED_ENTITY_TYPES: ReadonlySet<EntityType> = new Set<EntityType>([
  "city",
  "country",
  "vehicle",
  "service",
  "airport",
  "article",
]);

type EntityType =
  | "city"
  | "country"
  | "vehicle"
  | "service"
  | "airport"
  | "article";

// ---------------------------------------------------------------------------
// Response helpers
// ---------------------------------------------------------------------------

/**
 * Return a JSON error response with the canonical `{ ok: false, code }`
 * envelope. Mirrors the shape used by `app/api/booking/route.ts` so all
 * Route Handlers in this project speak the same error vocabulary.
 */
function jsonError(code: string, status: number): NextResponse {
  return NextResponse.json({ ok: false, code }, { status });
}

// ---------------------------------------------------------------------------
// Per-entity fan-out
// ---------------------------------------------------------------------------

/**
 * Resolve the list of absolute paths that should be revalidated for a
 * given `(entityType, slug)` pair, covering both the Bahasa Indonesia
 * locale (`/`) and the English locale (`/en`).
 *
 * The function is pure: it allocates a fresh array on each call and
 * never reads or mutates global state. Path duplicates (which would
 * otherwise cause `revalidatePath` to be called twice for the same
 * route) are not produced by any of the branches below — every
 * combination yields a distinct path string.
 */
function pathsForEntity(entityType: EntityType, slug: string): string[] {
  switch (entityType) {
    case "city":
      // Homepage featured cities, the city landing in both locales,
      // and the airport-transfer sub-path. The airport-transfer URL
      // 404s when no airports are configured for this city, which is
      // acceptable: revalidating a 404 path is a no-op.
      return [
        "/",
        "/en",
        citySlugPath("id", slug),
        citySlugPath("en", slug),
        citySlugPath("id", slug, {
          subpath: STATIC_SEGMENTS.airportTransfer.id,
        }),
        citySlugPath("en", slug, {
          subpath: STATIC_SEGMENTS.airportTransfer.en,
        }),
      ];
    case "country":
      return [countrySlugPath("id", slug), countrySlugPath("en", slug)];
    case "vehicle":
      // Both the listing page (so the new vehicle appears in the
      // grid) and the detail page in each locale.
      return [
        staticPath("id", "vehicleListing"),
        staticPath("en", "vehicleListing"),
        vehicleSlugPath("id", slug),
        vehicleSlugPath("en", slug),
      ];
    case "service":
      return [servicePath("id", slug), servicePath("en", slug)];
    case "airport":
      // Airport rows trigger via the parent city's `city_airports`
      // join trigger (see migration 0004). The Website has no city
      // context here, so no path fan-out — accept the payload but
      // return an empty list so the response is still 200.
      return [];
    case "article":
      return [
        staticPath("id", "blog"),
        staticPath("en", "blog"),
        `${staticPath("id", "blog")}/${slug}`,
        `${staticPath("en", "blog")}/${slug}`,
      ];
    default:
      // Exhaustiveness sentinel — `entityType` is already narrowed to
      // the `EntityType` union by the caller's `ALLOWED_ENTITY_TYPES`
      // gate, so this branch is unreachable in practice.
      return [];
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Type-guard: narrow an unknown payload to the expected
 * `{ entityType, slug }` shape. Returns the narrowed value on success
 * or null on any structural mismatch.
 */
function parsePayload(
  body: unknown,
): { entityType: string; slug: string } | null {
  if (typeof body !== "object" || body === null) return null;
  const candidate = body as Record<string, unknown>;
  const { entityType, slug } = candidate;
  if (typeof entityType !== "string" || typeof slug !== "string") return null;
  return { entityType, slug };
}

/**
 * Type-guard: narrow an arbitrary string to the closed
 * {@link EntityType} union by membership in {@link ALLOWED_ENTITY_TYPES}.
 */
function isAllowedEntityType(value: string): value is EntityType {
  return ALLOWED_ENTITY_TYPES.has(value as EntityType);
}

// ---------------------------------------------------------------------------
// Route Handler — POST `/api/revalidate`
// ---------------------------------------------------------------------------

/**
 * On-demand revalidation handler.
 *
 * Other HTTP methods (GET, PUT, DELETE, …) are not exported and
 * therefore answered with HTTP 405 by Next.js's App Router by default,
 * matching the design §7.1 contract that this endpoint is POST-only.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  // ── 1. Secret check (R17.11 / R24.2) ───────────────────────────────
  const expected = process.env.REVALIDATE_SECRET;
  if (typeof expected !== "string" || expected.length === 0) {
    // Build-time env validator should have prevented this; if it
    // didn't, surface a 500 to ops without leaking the env var name.
    console.error("[revalidate] REVALIDATE_SECRET missing or empty at runtime");
    return jsonError("config_error", 500);
  }
  const provided = req.headers.get("x-revalidate-secret");
  if (provided !== expected) {
    // Generic 401 for every secret-mismatch sub-case (missing header,
    // wrong value, etc.). Probes get the same response in every case.
    return jsonError("unauthorized", 401);
  }

  // ── 2. JSON body parse ─────────────────────────────────────────────
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return jsonError("invalid_json", 400);
  }

  // ── 3. Payload shape validation ────────────────────────────────────
  const payload = parsePayload(raw);
  if (payload === null) {
    return jsonError("invalid_payload", 400);
  }

  // ── 4. Allowed entityType check ────────────────────────────────────
  if (!isAllowedEntityType(payload.entityType)) {
    return jsonError("unknown_entity_type", 400);
  }

  // ── 5. Slug shape check ────────────────────────────────────────────
  // The slug ends up interpolated into a URL path, so reject empty
  // strings (would produce `/sewa-mobil/`) and strings carrying path
  // separators or whitespace that could break the route segment.
  // R3.4-grade slug validation is the Content_Layer's concern; here we
  // only enforce the minimum needed for safe `revalidatePath()`.
  const slug = payload.slug;
  if (slug.length === 0 || slug.includes("/") || /\s/.test(slug)) {
    return jsonError("invalid_slug", 400);
  }

  // ── 6. Fan out to all affected paths ───────────────────────────────
  // `revalidatePath` is synchronous in Next.js but throws on invalid
  // input. Wrap each call so a single bad path can't drop the rest of
  // the fan-out — we still want the country page to revalidate even if
  // some future code emits a malformed city path.
  const paths = pathsForEntity(payload.entityType, slug);
  const revalidated: string[] = [];
  for (const path of paths) {
    try {
      revalidatePath(path);
      revalidated.push(path);
    } catch (err) {
      console.error("[revalidate] failed to revalidate path", {
        path,
        entityType: payload.entityType,
        slug,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // ── 7. Success response ────────────────────────────────────────────
  return NextResponse.json({
    ok: true,
    revalidated,
    entityType: payload.entityType,
    slug,
  });
}
