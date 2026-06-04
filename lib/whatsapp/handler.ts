/**
 * WhatsApp_Handler — pure URL builders for the WhatsApp booking
 * conversion path (design §15).
 *
 * This module turns a validated Booking_Form payload (`BookingParsed`
 * from `lib/booking/schema.ts`) into a `wa.me` URL with a localized,
 * line-broken, key-value prefilled message. It also exposes a generic
 * builder for the floating WhatsApp button and inline CTAs that fire
 * before the Visitor has filled the form.
 *
 * Requirements:
 * - R11.1 Pure function: payload + locale → `wa.me` URL with a
 *   URL-encoded prefilled message capped per the message-length rule.
 * - R11.2 The Admin number is read from `process.env.ARASYA_WHATSAPP_NUMBER`
 *   *by the caller* (route handler, server component, or build-time env
 *   validator) and passed in as `adminE164`. This module is pure: no
 *   env reads, no I/O, no React imports. Hardcoded phone-number
 *   literals are forbidden.
 * - R11.3 The caller is responsible for validating `adminE164` against
 *   {@link isValidE164}; this module trusts the input and only does the
 *   `+` strip needed by `wa.me`. The build-time env-validation script
 *   (`scripts/validate-env.ts`) blocks deployment when the env value is
 *   missing or malformed.
 * - R11.4 The message body lists every booking field on its own line in
 *   the form `{label}: {value}`, ordered greeting → contact → location
 *   → time → service details → notes → closing. Empty / undefined
 *   optional fields are omitted (R11.4: destination, preferred vehicle,
 *   notes are conditional). The total `text` value is capped at
 *   {@link MESSAGE_MAX_LEN} characters; if the body would exceed the
 *   cap, the handler trims `notes` first, then the closing line, never
 *   splitting a word mid-character ({@link truncateAtWordBoundary}).
 * - R11.10 The generic builder produces a locale-appropriate prefilled
 *   message for non-form WhatsApp CTAs.
 *
 * Pure module: imports only types from the booking schema, types from
 * the Content_Layer, the labels dictionary in this folder, and one
 * formatter helper from `lib/booking/normalizePhone`. Safe for both
 * client and server bundles.
 *
 * Design reference: §15 (WhatsApp Handler).
 */

import type { BookingParsed } from "@/lib/booking/schema";
import { formatIndonesianDisplay } from "@/lib/booking/normalizePhone";
import type { Locale } from "@/lib/content";

import { WHATSAPP_LABELS, type WhatsAppLabels } from "./labels";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Maximum length, in JavaScript code units, of the `text` query
 * parameter passed to `wa.me`. Capped at 1024 per the task spec; this
 * is well within R11.1's 4096-character ceiling and leaves headroom
 * for URL-encoding expansion (the percent-encoded form can be up to
 * ~3× the raw length, but `wa.me` measures the cap on the decoded
 * value).
 */
export const MESSAGE_MAX_LEN = 1024;

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Optional context about the page the Visitor is converting from.
 *
 * Used by analytics-ish prefill flows where the caller wants the
 * resulting WhatsApp message (or the future analytics event tied to
 * it) to carry the slug context. Currently the slugs do not appear in
 * the rendered message body — they are reserved for future use and
 * for analytics emission in task 11.4 (R11.11).
 */
export interface BookingMessageContext {
  readonly citySlug?: string;
  readonly vehicleSlug?: string;
  readonly serviceSlug?: string;
}

/**
 * Input shape accepted by {@link buildWhatsAppUrl}.
 *
 * `form` is the *parsed* (post-zod) Booking_Form payload, so
 * `whatsappNumber` is the branded `+62…` E.164 string and date / time
 * fields are already in the canonical formats required by R11.4.
 *
 * `adminE164` MUST be a validated E.164 string. Callers should obtain
 * it via the build-time env validation in `scripts/validate-env.ts`
 * (R11.3) or by piping `process.env.ARASYA_WHATSAPP_NUMBER` through
 * `isValidE164` from `@/lib/booking/normalizePhone`.
 */
export interface BookingMessageInput {
  readonly locale: Locale;
  readonly form: BookingParsed;
  readonly adminE164: string;
  readonly context?: BookingMessageContext;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Strip the leading `+` from an E.164 number for use as the `wa.me`
 * path segment.
 *
 * `wa.me` URLs are documented to use the digits-only form (the leading
 * `+` is rejected as part of the path). Using `String.prototype.replace`
 * on an anchored regex keeps the operation total: for already-stripped
 * numbers the input is returned unchanged.
 *
 * The caller is responsible for ensuring `e164` is a valid E.164
 * string; this helper does not validate.
 */
function digitsForWaMe(e164: string): string {
  return e164.replace(/^\+/, "");
}

/**
 * Return `value` if it is a non-empty string after trimming, otherwise
 * `null`. Used to decide whether to include an optional Booking_Form
 * field in the message body (R11.4 — destination, preferred vehicle,
 * notes are skipped when empty).
 */
function nonEmpty(value: string | undefined | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

/**
 * Truncate `str` to at most `maxLen` characters without splitting a
 * word mid-character.
 *
 * Strategy: if the string already fits, return it unchanged. Otherwise
 * cut to `maxLen`, then walk back to the previous whitespace boundary
 * (any of space, newline, tab) so the visible result ends on a complete
 * word. If no whitespace exists in the prefix (e.g. one extremely long
 * token), fall back to the hard cut so we never return more than
 * `maxLen` characters.
 *
 * `maxLen` ≤ 0 returns the empty string. Callers should guard against
 * that case explicitly when they want a non-empty result.
 */
export function truncateAtWordBoundary(str: string, maxLen: number): string {
  if (maxLen <= 0) return "";
  if (str.length <= maxLen) return str;

  const hardCut = str.slice(0, maxLen);
  // Walk back from the end of the hard cut to the previous whitespace.
  // We accept any ASCII whitespace because the message body is plain
  // text composed by this module — the labels dictionary contains no
  // exotic Unicode whitespace.
  for (let i = hardCut.length - 1; i >= 0; i -= 1) {
    const ch = hardCut[i];
    if (ch === " " || ch === "\n" || ch === "\t") {
      // Trim any trailing whitespace so the result reads cleanly.
      return hardCut.slice(0, i).replace(/[\s]+$/, "");
    }
  }
  // No whitespace found — fall back to the hard cut to honor the cap.
  return hardCut;
}

/**
 * One labeled line in the message body, e.g. `Nama lengkap: Budi`.
 *
 * Centralizing the `${label}: ${value}` join here keeps the field
 * order in {@link buildBookingMessageBody} readable: each field is one
 * call with the label key and the resolved string value, and the
 * separator format only has to change in one place if R11.4 ever
 * relaxes.
 */
function line(label: string, value: string): string {
  return `${label}: ${value}`;
}

/**
 * Compose the prefilled message body in `locale`-localized form
 * following the field order required by R11.4.
 *
 * The body is structured as:
 *   1. Greeting (always)
 *   2. Contact block: full name + WhatsApp number (display-formatted
 *      via {@link formatIndonesianDisplay}, falls back to E.164 for
 *      non-Indonesian numbers)
 *   3. Location block: pickup city + pickup location + drop-off
 *      (drop-off only when set)
 *   4. Schedule block: pickup date + pickup time + rental duration +
 *      passenger count
 *   5. Service block: preferred vehicle (when set) + service type
 *   6. Notes (when set)
 *   7. Closing line
 *
 * Returns the joined body. Length capping is handled by the outer
 * {@link buildWhatsAppUrl} so this helper stays format-only.
 */
function buildBookingMessageBody(
  form: BookingParsed,
  labels: WhatsAppLabels,
): { lines: string[]; notesIndex: number | null } {
  const lines: string[] = [];

  // 1. Greeting
  lines.push(labels.greeting);

  // 2. Contact block
  lines.push(line(labels.fullName, form.fullName));
  // The WhatsApp number is a branded `+62…` E.164 string. Display it
  // in the human-friendly `+62 xxx-xxxx-xxxx` form for visual clarity
  // in the chat; non-Indonesian numbers pass through unchanged because
  // `formatIndonesianDisplay` only formats `+62` numbers.
  lines.push(line(labels.whatsappNumber, formatIndonesianDisplay(form.whatsappNumber)));

  // 3. Location block
  lines.push(line(labels.pickupCity, form.pickupCity));
  lines.push(line(labels.pickupLocation, form.pickupLocation));
  const destination = nonEmpty(form.destination);
  if (destination !== null) {
    lines.push(line(labels.dropoffLocation, destination));
  }

  // 4. Schedule block
  lines.push(line(labels.pickupDate, form.pickupDate));
  lines.push(line(labels.pickupTime, form.pickupTime));
  lines.push(line(labels.rentalDuration, form.rentalDuration));
  lines.push(line(labels.passengerCount, String(form.passengers)));

  // 5. Service block
  const preferredVehicle = nonEmpty(form.preferredVehicle);
  if (preferredVehicle !== null) {
    lines.push(line(labels.preferredVehicle, preferredVehicle));
  }
  // `tripType` is the schema enum value; resolve through the
  // `serviceTypeValues` map so the message shows the Locale-appropriate
  // display string (e.g. `Sewa korporat` / `Corporate rental`).
  const serviceTypeDisplay = labels.serviceTypeValues[form.tripType];
  lines.push(line(labels.serviceType, serviceTypeDisplay));

  // 6. Notes (R11.4 — skip when empty)
  let notesIndex: number | null = null;
  const notes = nonEmpty(form.notes);
  if (notes !== null) {
    notesIndex = lines.length;
    lines.push(line(labels.notes, notes));
  }

  // 7. Closing
  lines.push(labels.closingPolite);

  return { lines, notesIndex };
}

/**
 * Encode `digits` and `text` into a final `wa.me` URL.
 *
 * Uses {@link URLSearchParams} for the query so the encoder handles
 * `+`, spaces, newlines, and Unicode characters per WHATWG without us
 * having to reimplement `encodeURIComponent` edge cases. The `digits`
 * path segment is already digits-only by construction.
 */
function assembleWaUrl(digits: string, text: string): string {
  const params = new URLSearchParams({ text });
  return `https://wa.me/${digits}?${params.toString()}`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build the `wa.me` URL that opens WhatsApp with a prefilled,
 * locale-aware booking message (R11.1, R11.4).
 *
 * The message body is composed line-by-line via
 * {@link buildBookingMessageBody}. If the joined body exceeds
 * {@link MESSAGE_MAX_LEN} characters, the handler shortens the message
 * in two stages so the most informative content survives:
 *
 *   1. **Truncate `notes` first.** Notes are user-supplied free text
 *      and are the line most likely to push the body past the cap;
 *      they are also the line whose loss costs the Admin the least
 *      since the structured fields (date, location, etc.) carry the
 *      booking essentials.
 *   2. **Drop the closing line second.** If the body is still over
 *      after the notes truncation, the polite closing is removed.
 *
 * Word boundaries are preserved through {@link truncateAtWordBoundary}
 * so the chat never shows a half-typed word.
 *
 * The resulting URL takes the shape:
 *
 * ```
 * https://wa.me/{digits}?text={url-encoded-message}
 * ```
 *
 * where `{digits}` is `adminE164` with the leading `+` stripped per
 * `wa.me`'s required form, and `{url-encoded-message}` is produced by
 * `URLSearchParams` (which uses application/x-www-form-urlencoded
 * encoding — a superset of the encoding `wa.me` expects).
 *
 * @example
 * ```ts
 * import { buildWhatsAppUrl } from "@/lib/whatsapp/handler";
 *
 * const url = buildWhatsAppUrl({
 *   locale: "id",
 *   adminE164: process.env.ARASYA_WHATSAPP_NUMBER!,
 *   form: parsedBookingPayload,
 * });
 * window.open(url, "_blank");
 * ```
 */
export function buildWhatsAppUrl(input: BookingMessageInput): string {
  const labels = WHATSAPP_LABELS[input.locale];
  const composed = buildBookingMessageBody(input.form, labels);

  let message = composed.lines.join("\n");

  if (message.length > MESSAGE_MAX_LEN) {
    // Stage 1: truncate the notes line, if present, at the word
    // boundary that makes the whole body fit. We compute the budget
    // for the notes line as `MAX - (everything-else-length)`, then
    // rebuild the notes line as `${label}: ${truncatedValue}`.
    if (composed.notesIndex !== null) {
      const notesIdx = composed.notesIndex;
      const otherLines = composed.lines.filter((_, i) => i !== notesIdx);
      const otherLen = otherLines.join("\n").length + 1; // +1 for the newline that joins notes to its neighbor
      const notesBudget = MESSAGE_MAX_LEN - otherLen;
      const notesLabelPrefix = `${labels.notes}: `;
      const valueBudget = notesBudget - notesLabelPrefix.length;
      const notesLine = composed.lines[notesIdx];
      if (typeof notesLine === "string") {
        const originalValue = notesLine.slice(notesLabelPrefix.length);
        const truncatedValue =
          valueBudget > 0
            ? truncateAtWordBoundary(originalValue, valueBudget)
            : "";
        const rebuilt = [...composed.lines];
        if (truncatedValue.length === 0) {
          // Budget is zero or negative — drop the entire notes line so
          // we do not emit a label with an empty value. The closing
          // line stays at the tail of `rebuilt`; stage 2 below
          // recomputes the message length against the rebuilt array,
          // so the index shift caused by this `splice` does not
          // matter.
          rebuilt.splice(notesIdx, 1);
        } else {
          rebuilt[notesIdx] = `${notesLabelPrefix}${truncatedValue}`;
        }
        message = rebuilt.join("\n");
      }
    }

    // Stage 2: if still over budget, drop the closing line.
    if (message.length > MESSAGE_MAX_LEN) {
      const lines = message.split("\n");
      // The closing line is the polite phrase placed last; it is
      // always the last line of the body when present (per
      // `buildBookingMessageBody`), so removing the tail line is
      // sufficient as long as that tail equals `labels.closingPolite`
      // (which it does until stage 1 may have already removed it).
      if (lines[lines.length - 1] === labels.closingPolite) {
        lines.pop();
      }
      message = lines.join("\n");
    }

    // Stage 3 (defensive): if the message is *still* over the cap —
    // which can only happen when a single non-notes line is itself
    // longer than the cap, an extreme edge case given the schema
    // bounds in R10 — fall back to a word-boundary truncation of the
    // whole message. This guarantees the function never returns a
    // URL whose `text` exceeds `MESSAGE_MAX_LEN`.
    if (message.length > MESSAGE_MAX_LEN) {
      message = truncateAtWordBoundary(message, MESSAGE_MAX_LEN);
    }
  }

  return assembleWaUrl(digitsForWaMe(input.adminE164), message);
}

/**
 * Build a `wa.me` URL for a CTA that fires *before* the Booking_Form
 * has been filled (R11.10): the floating WhatsApp button, the inline
 * hero CTAs on city / country / vehicle / airport / service pages, and
 * the secondary CTAs in the footer.
 *
 * When `prefilledMessage` is omitted, the function emits the locale's
 * default greeting + opening question:
 *
 * - `id`: `Halo Admin Arasya, saya ingin bertanya tentang sewa mobil dengan supir.`
 * - `en`: `Hi Arasya admin, I'd like to ask about chauffeur car rental.`
 *
 * When `prefilledMessage` is provided, it is used verbatim (after the
 * same length cap as {@link buildWhatsAppUrl}) so callers that want to
 * reference a city or vehicle name can pass the fully-composed
 * sentence.
 *
 * @example
 * ```ts
 * // Floating button — default greeting
 * const href = buildGenericWaUrl(adminE164, "id");
 *
 * // Inline city CTA — custom message naming the city
 * const href = buildGenericWaUrl(
 *   adminE164,
 *   "id",
 *   "Halo Admin Arasya, saya ingin sewa mobil dengan supir di Bogor.",
 * );
 * ```
 */
export function buildGenericWaUrl(
  adminE164: string,
  locale: Locale,
  prefilledMessage?: string,
): string {
  const labels = WHATSAPP_LABELS[locale];

  const defaultMessage =
    locale === "id"
      ? `${labels.greeting} saya ingin bertanya tentang sewa mobil dengan supir.`
      : `${labels.greeting} I'd like to ask about chauffeur car rental.`;

  const raw = prefilledMessage ?? defaultMessage;
  const message =
    raw.length > MESSAGE_MAX_LEN
      ? truncateAtWordBoundary(raw, MESSAGE_MAX_LEN)
      : raw;

  return assembleWaUrl(digitsForWaMe(adminE164), message);
}

/**
 * Format an E.164 number for human display as `+62 xxx-xxxx-xxxx`
 * (R13.5).
 *
 * Thin re-export wrapper around
 * {@link "@/lib/booking/normalizePhone".formatIndonesianDisplay} so
 * `lib/whatsapp/*` is the single import surface for any UI work that
 * needs to render the official Admin number alongside a WhatsApp CTA
 * (the floating button tooltip, the anti-fraud notice, the booking
 * confirmation screen, etc.). Keeping the re-export here means
 * downstream code does not need to know that the formatting helper
 * lives in the booking module.
 */
export function formatWhatsAppNumberDisplay(e164: string): string {
  return formatIndonesianDisplay(e164);
}
