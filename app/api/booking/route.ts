/**
 * app/api/booking/route.ts
 *
 * Booking_Form Route Handler — POST `/api/booking`.
 *
 * Requirements:
 * - R12.1  Persist Booking_Form submissions to Supabase Lead_Store on
 *          successful validation, before initiating WhatsApp redirect.
 * - R12.3  RLS-protected `leads` table writes via service-role only.
 * - R12.4  Server-side write path uses the Supabase_Service_Role_Key,
 *          never exposed to the browser. The `import "server-only"`
 *          directive plus the `lib/eslint-rules/no-service-key-in-client`
 *          ignore-glob (`app/api/**`) enforces this.
 * - R12.5  Server-side schema validation re-runs the same `bookingSchema`
 *          the client uses; on failure, no DB write and no WA redirect.
 * - R12.6  Admin notification webhook fires after persistence within 5s
 *          (handled by task 8.15 — see TODO below).
 * - R12.7  Honeypot field; silent success so bots cannot detect rejection.
 * - R12.8  IP-based rate limit (10/60min) via `checkBookingRateLimit`.
 * - R12.9  Lead persistence wraps the Supabase insert in a try and emits
 *          `db_error` on failure.
 * - R12.10 Successful response includes the prefilled `wa.me` URL and the
 *          new `leadId`.
 * - R12.11 IP stored as SHA-256 of `salt + ip` via `hashIp`; raw IP never
 *          written to Supabase.
 * - R19.5  Origin/Referer check rejects cross-origin POSTs with HTTP 403.
 * - R19.7  Spam blocklist check; on match, silent success (no DB write,
 *          no admin notification) with the matched phone redacted in the
 *          server log to first-4/last-2 digits per the requirement text.
 *
 * Design reference: §16 (Booking Route Handler).
 *
 * Pipeline order (each step is a return-on-fail gate before the next):
 *   1. Method check (POST-only, enforced by Next.js when only POST is exported)
 *   2. Origin/Referer check         → 403 `forbidden_origin`
 *   3. Content-Type check           → 400 `invalid_content_type`
 *   4. JSON body parse              → 400 `invalid_json`
 *   5. Honeypot field check         → 200 silent success
 *   6. Zod schema validation        → 400 `validation_failed` + fieldErrors
 *   7. Phone-blocklist check (R19.7)→ 200 silent success
 *   8. Rate limit (R12.8)           → 429 `rate_limited`
 *   9. Defense-in-depth E.164 check → 400 `validation_failed`
 *  10. Admin number env check       → 500 `config_error`
 *  11. Build prefilled wa.me URL
 *  12. Supabase insert (R12.9/.11)  → 500 `db_error`
 *  13. Fire-and-forget notification (TODO(8.15))
 *  14. 200 `ok` with `whatsappUrl` + `leadId`
 *
 * The handler treats every external input as untrusted: header values,
 * the JSON body, and even the parsed payload's `whatsappNumber` are
 * re-validated at the boundary even when an upstream layer already
 * checked them. R19.7 logging redacts PII (phone middle digits, notes
 * blocklist hits) before any `console.warn` or `console.error` writes.
 */

import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

import { isValidE164 } from "@/lib/booking/normalizePhone";
import { bookingSchema } from "@/lib/booking/schema";
import { extractClientIp, hashIp } from "@/lib/security/hashIp";
import { notifyAdmin } from "@/lib/security/notify";
import { originCheckResult } from "@/lib/security/originCheck";
import { checkBookingRateLimit } from "@/lib/security/rateLimit";
import { looksSpammy, redact } from "@/lib/security/spamBlocklist";
import { supabaseService } from "@/lib/supabase/server";
import { buildWhatsAppUrl } from "@/lib/whatsapp/handler";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Honeypot field names. Real users never fill these because they are
 * rendered with `display: none` / `visibility: hidden` in the form. Any
 * non-empty value is a strong bot signal (R12.7 / R19.7).
 *
 * Lives as a module-level constant so adding a new honeypot is a single
 * line edit in this file plus the matching hidden input in
 * `components/booking/BookingForm.tsx`.
 */
const HONEYPOT_FIELDS: readonly string[] = ["website"];

/**
 * Acceptable values for the `Content-Type` request header. The client
 * sends `application/json` — possibly with a `charset=utf-8` parameter —
 * and anything else is treated as a hostile request from a non-browser
 * client (curl with the wrong flags, a misconfigured form, etc.). We do
 * not parse XML or url-encoded bodies; those are clear bot signals.
 */
const JSON_CONTENT_TYPE_REGEX: RegExp = /^application\/json(\s*;.*)?$/i;

// ---------------------------------------------------------------------------
// Response helpers
// ---------------------------------------------------------------------------

/**
 * Return a JSON error response with the canonical `{ ok: false, code }`
 * envelope (design §16 error matrix). Accepts an optional `extra`
 * object so the validation-failure path can attach `fieldErrors`.
 */
function jsonError(
  code: string,
  status: number,
  extra?: Record<string, unknown>,
): NextResponse {
  return NextResponse.json(
    { ok: false, code, ...(extra ?? {}) },
    { status },
  );
}

/**
 * Return a JSON success response with the canonical
 * `{ ok: true, code: "ok", whatsappUrl, leadId? }` envelope.
 *
 * The honeypot and spam-blocklist branches reuse this same shape so that
 * bots cannot distinguish a silent block from a legitimate success — the
 * server response looks identical from the client's perspective.
 */
function jsonOk(
  payload: { whatsappUrl: string; leadId?: string },
  status = 200,
): NextResponse {
  return NextResponse.json(
    { ok: true, code: "ok", ...payload },
    { status },
  );
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Returns true iff the supplied content-type header is a JSON variant. */
function isJsonContentType(value: string | null): boolean {
  if (typeof value !== "string" || value.length === 0) return false;
  return JSON_CONTENT_TYPE_REGEX.test(value.trim());
}

/**
 * Resolve the official Admin WhatsApp number from env (R11.2).
 *
 * Returns the validated `+62…` E.164 string, or `null` when the env var
 * is unset, empty, or malformed. The build-time env validator
 * (`scripts/validate-env.ts`) already blocks deployment when the value
 * is invalid (R11.3 / R17.10), so this branch is purely defensive — it
 * exists to convert a runtime misconfiguration into a clean
 * `config_error` 500 instead of an uncaught exception.
 */
function getAdminE164(): string | null {
  const raw = process.env.ARASYA_WHATSAPP_NUMBER;
  if (typeof raw !== "string" || raw.length === 0) return null;
  return isValidE164(raw) ? raw : null;
}

/**
 * Build a minimal `wa.me/<digits>` URL for the silent-block response
 * paths (honeypot / spam-blocklist). We don't bother with a prefilled
 * message here — bots never read it — but the URL must look real
 * enough that it cannot be cheaply distinguished from
 * `buildWhatsAppUrl`'s output without parsing the query string.
 *
 * Falls back to `https://wa.me/` when `adminE164` is null so the
 * response shape is still well-formed during a misconfigured runtime.
 */
function buildSilentBlockWaUrl(adminE164: string | null): string {
  if (adminE164 === null) return "https://wa.me/";
  return `https://wa.me/${adminE164.replace(/^\+/, "")}`;
}

/**
 * Redact a WhatsApp number for log emission per R19.7: keep the first 4
 * and last 2 digits, replace the middle with `…`. Operates on the raw
 * string regardless of whether `+` is present, so the helper is stable
 * across schema-validated and pre-validation log sites.
 */
function redactPhoneForLog(phone: string): string {
  if (typeof phone !== "string" || phone.length <= 6) return "***";
  return `${phone.slice(0, 4)}…${phone.slice(-2)}`;
}

/**
 * Convert the schema's `flatten().fieldErrors` into a stable
 * `Record<string, string[]>` shape. The zod helper returns
 * `Partial<Record<…, string[] | undefined>>`; the client contract
 * (design §16) needs concrete arrays.
 */
function normalizeFieldErrors(
  raw: Record<string, string[] | undefined>,
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (Array.isArray(value) && value.length > 0) {
      out[key] = value;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Route Handler — POST `/api/booking`
// ---------------------------------------------------------------------------

/**
 * Booking_Form submission handler.
 *
 * Other HTTP methods (GET, PUT, DELETE, …) are not exported and
 * therefore answered with HTTP 405 by Next.js's App Router by default,
 * which satisfies the "method check" gate from design §16.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  // ── 2. Origin / Referer check (R19.5) ──────────────────────────────
  const origin = originCheckResult(req);
  if (!origin.ok) {
    // Reason is logged but never returned to the client (design §16 —
    // generic 403 keeps the response identical for every rejection
    // sub-case, denying probe attempts useful signal).
    console.warn("[booking] origin rejected", { reason: origin.reason });
    return jsonError("forbidden_origin", 403);
  }

  // ── 3. Content-Type check ──────────────────────────────────────────
  const contentType = req.headers.get("content-type");
  if (!isJsonContentType(contentType)) {
    return jsonError("invalid_content_type", 400);
  }

  // ── 4. JSON body parse ─────────────────────────────────────────────
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return jsonError("invalid_json", 400);
  }

  // Coerce to a plain object before honeypot inspection. Anything else
  // (array, primitive, null) cannot satisfy the schema either, so we
  // hand off to the zod safeParse below which will emit a clean
  // validation error response.
  const body: Record<string, unknown> =
    typeof raw === "object" && raw !== null && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};

  // Resolve the admin number once. Required by:
  //   - the silent-block paths (honeypot / spam) for the dummy URL,
  //   - the success path for `buildWhatsAppUrl`.
  // Computed before the schema validation so that an env misconfig at
  // runtime surfaces consistently regardless of which branch we take.
  const adminE164 = getAdminE164();

  // ── 5. Honeypot check (R12.7 / R19.7) ──────────────────────────────
  // We deliberately respond with the success shape — bots that detect
  // this branch could otherwise iterate on the form until they find a
  // payload that bypasses the honeypot. No Supabase write, no admin
  // notification.
  for (const field of HONEYPOT_FIELDS) {
    const value = body[field];
    if (typeof value === "string" && value.trim().length > 0) {
      console.warn("[booking] honeypot triggered; silently dropping submission", {
        field,
      });
      return jsonOk({ whatsappUrl: buildSilentBlockWaUrl(adminE164) });
    }
  }

  // ── 6. Schema validation (R12.3 / R12.4) ───────────────────────────
  const parsed = bookingSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("validation_failed", 400, {
      fieldErrors: normalizeFieldErrors(parsed.error.flatten().fieldErrors),
    });
  }
  const data = parsed.data;

  // ── 7. Spam blocklist on the parsed WhatsApp number (R19.7) ────────
  // Per R19.7, the WhatsApp number is checked against the blocklist; on
  // match we silently drop with the success shape (no DB write, no
  // admin notification, no `wa.me` redirect for a real bot operator).
  // The redacted form is the only thing that lands in logs.
  if (looksSpammy(data.whatsappNumber)) {
    console.warn("[booking] spam phone silently dropped", {
      whatsapp: redactPhoneForLog(data.whatsappNumber),
      // Notes is the most likely additional spam carrier; redact via
      // the spamBlocklist helper so any blocklist hit is replaced
      // before reaching log storage.
      notes: redact(data.notes ?? ""),
    });
    return jsonOk({ whatsappUrl: buildSilentBlockWaUrl(adminE164) });
  }

  // ── 8. Rate limit (R12.8) ──────────────────────────────────────────
  // Extract the client IP via the X-Forwarded-For / X-Real-IP /
  // CF-Connecting-IP precedence ladder. When no IP can be resolved we
  // skip the rate-limit gate (fail-open): the upstream Origin and
  // schema gates still bind, and forcing every IP-less request to 429
  // would lock out edge-runtime probes that legitimately have no
  // proxy header populated.
  const rawIp = extractClientIp(req);
  if (rawIp !== null) {
    const verdict = await checkBookingRateLimit(rawIp);
    if (!verdict.allowed) {
      return jsonError("rate_limited", 429);
    }
  }

  // ── 9. Defense-in-depth E.164 re-validation (R12.5) ────────────────
  // The schema's `.brand<"E164">()` already guarantees a `+1…\+9{8,15}`
  // shape, so this branch is unreachable in practice. It exists per
  // design §16 to make any future refactor of the schema impossible to
  // bypass — if someone ever loosens `whatsappNumber` upstream, this
  // gate catches it before it hits Supabase.
  if (!isValidE164(data.whatsappNumber)) {
    return jsonError("validation_failed", 400, {
      fieldErrors: { whatsappNumber: ["invalid_phone_e164"] },
    });
  }

  // ── 10. Admin number env check ─────────────────────────────────────
  if (adminE164 === null) {
    // Build-time env validator should have prevented this; if it
    // didn't, a 500 surfaces the misconfig to ops without leaking
    // which env var is missing.
    console.error(
      "[booking] ARASYA_WHATSAPP_NUMBER missing or invalid at runtime",
    );
    return jsonError("config_error", 500);
  }

  // ── 11. Build the prefilled wa.me URL ──────────────────────────────
  const whatsappUrl = buildWhatsAppUrl({
    locale: data.locale,
    form: data,
    adminE164,
  });

  // ── 12. Supabase insert (R12.9 / R12.11) ───────────────────────────
  // R12.11: hash the IP with `LEAD_IP_HASH_SALT` so the raw value
  // never reaches Supabase. `hashIp` throws on misconfig (empty salt /
  // empty ip) — both indicate a server bug rather than a request
  // anomaly, so we log and fall through with `ipHash = null` rather
  // than rejecting the lead.
  let ipHash: string | null = null;
  if (rawIp !== null) {
    try {
      ipHash = hashIp(rawIp);
    } catch (err) {
      console.error("[booking] failed to hash client IP", {
        message: err instanceof Error ? err.message : String(err),
      });
      ipHash = null;
    }
  }

  const userAgent = req.headers.get("user-agent");
  // `sourcePage` priority: explicit body field (set by the client form
  // from `window.location.pathname`) > Referer header. Either may be
  // null; the column is nullable.
  const sourcePage = (() => {
    if (typeof data.sourcePage === "string" && data.sourcePage.length > 0) {
      return data.sourcePage;
    }
    const referer = req.headers.get("referer");
    return typeof referer === "string" && referer.length > 0 ? referer : null;
  })();

  // Cast the typed Supabase client to its un-typed form. `types/database.ts`
  // is currently the empty stub generated before `pnpm db:types` has been
  // run against a live schema, so `Tables` is `Record<string, never>` and
  // `from("leads")` would fail to typecheck against the typed overload.
  // Once the generator runs, this cast becomes redundant but stays sound.
  const sb = supabaseService() as unknown as SupabaseClient;
  const insertResult = await sb
    .from("leads")
    .insert({
      full_name: data.fullName,
      whatsapp_number: data.whatsappNumber,
      pickup_city: data.pickupCity,
      pickup_location: data.pickupLocation,
      destination: data.destination ?? null,
      pickup_date: data.pickupDate,
      pickup_time: data.pickupTime,
      rental_duration: data.rentalDuration,
      passengers: data.passengers,
      preferred_vehicle: data.preferredVehicle ?? null,
      trip_type: data.tripType,
      notes: data.notes ?? null,
      locale: data.locale,
      source_page: sourcePage,
      utm_source: data.utmSource ?? null,
      utm_medium: data.utmMedium ?? null,
      utm_campaign: data.utmCampaign ?? null,
      ip_hash: ipHash,
      user_agent: userAgent ?? null,
      status: "new",
    })
    .select("id")
    .single();

  if (insertResult.error !== null) {
    // R12.9: persistence failure. Log only the Supabase error code +
    // message — never the raw payload (R19.8). The redacted phone is
    // surfaced for ops correlation; everything else is omitted.
    const err = insertResult.error as { code?: string; message: string };
    console.error("[booking] db_error inserting lead", {
      code: err.code,
      message: err.message,
      whatsapp: redactPhoneForLog(data.whatsappNumber),
    });
    return jsonError("db_error", 500);
  }

  const inserted = insertResult.data as { id: string } | null;
  if (inserted === null || typeof inserted.id !== "string" || inserted.id.length === 0) {
    console.error("[booking] insert returned no row id", {
      whatsapp: redactPhoneForLog(data.whatsappNumber),
    });
    return jsonError("db_error", 500);
  }

  // ── 13. Admin notification webhook (R12.6 / R12.10) ────────────────
  // Fire-and-forget — does not await; failures and 5s timeouts are
  // logged inside `notifyAdmin` and never surface to the client.
  notifyAdmin({
    leadId: inserted.id,
    fullName: data.fullName,
    whatsappNumber: data.whatsappNumber,
    pickupCity: data.pickupCity,
    pickupDate: data.pickupDate,
    pickupTime: data.pickupTime,
    tripType: data.tripType,
    locale: data.locale,
    sourcePage: typeof sourcePage === "string" ? sourcePage : undefined,
  });

  // ── 14. Success response (R12.1 / R12.10) ──────────────────────────
  return jsonOk({ whatsappUrl, leadId: inserted.id });
}
