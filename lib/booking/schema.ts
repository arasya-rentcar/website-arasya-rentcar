/**
 * Shared Booking_Form Zod schema.
 *
 * Task 8.1 — Shared booking zod schema with all validation rules from R10.
 * This module is the SINGLE source of truth for Booking_Form validation;
 * it is shared by the client `BookingForm` component (task 8.3) and the
 * server `/api/booking` Route Handler (task 8.14).
 *
 * Requirements mapped (R10.1–R10.15):
 * - R10.1  Collects full name, WhatsApp number, pickup city, pickup
 *          location, destination (optional), pickup date, pickup time,
 *          rental duration, passengers, preferred vehicle (optional),
 *          trip type, notes (optional), locale, UTM attribution fields,
 *          and `sourcePage`.
 * - R10.2  `fullName` trimmed, 3–80 characters, not digits-only.
 * - R10.3  `whatsappNumber` normalized via {@link normalizePhone} to the
 *          E.164 `+62…` shape and re-validated against {@link E164_REGEX}.
 *          Output is branded as `"E164"` so downstream code cannot mix
 *          raw input strings with normalized phones.
 * - R10.4  `pickupCity` trimmed, 2–80 characters. (City *options* come
 *          from the Content_Layer at render time; the schema only
 *          enforces the shape.)
 * - R10.5  `pickupLocation` trimmed, 3–140 characters.
 * - R10.6  `destination` optional, trimmed, up to 140 characters.
 * - R10.7  `pickupDate` in ISO `YYYY-MM-DD` form; must not be in the
 *          past in the Asia/Jakarta timezone.
 * - R10.8  `pickupTime` in 24-hour `HH:MM` form.
 * - R10.9  `rentalDuration` one of: `half_day_4h`, `full_day_10h`,
 *          `overnight_24h`, `multi_day` (exported as
 *          {@link rentalDurationEnum}).
 * - R10.10 `passengers` integer 1–30.
 * - R10.11 `preferredVehicle` optional, trimmed, up to 80 characters.
 * - R10.12 `tripType` one of: `airport_transfer`, `corporate`,
 *          `city_tour`, `wedding`, `out_of_city`, `other` (exported as
 *          {@link tripTypeEnum}).
 * - R10.13 `notes` optional, trimmed, up to 500 characters.
 * - R10.14 `locale` one of: `id`, `en` (exported as {@link localeEnum}).
 * - R10.15 `utmSource`, `utmMedium`, `utmCampaign` each optional,
 *          trimmed, up to 200 characters.
 *
 * Cross-field rule (R10.6 / R10.7): the combined `{pickupDate, pickupTime}`
 * pair — interpreted as an Asia/Jakarta wall-clock moment — must be at
 * least two hours after the current moment in Asia/Jakarta. Evaluated
 * via {@link getJakartaNow} and {@link wallClockInJakarta}, which build
 * Date values whose *host-local* fields carry Jakarta wall-clock
 * components so `.getTime()` subtraction yields a Jakarta-local delta
 * independent of the host timezone.
 *
 * Design reference: §24 (Booking_Schema).
 *
 * Pure module: imports only from `zod` and `./normalizePhone`. No I/O,
 * no Next.js imports, safe for both client and server bundles.
 */

import { z } from "zod";
import { E164_REGEX, normalizePhone } from "./normalizePhone";

// --- Enums (R10.9, R10.12, R10.14) ------------------------------------------

/**
 * Rental duration options (R10.9).
 *
 * The four discrete tiers the Booking_Form offers, chosen so that each
 * maps to a distinct pricing SKU on the Admin side. Free-text durations
 * are intentionally rejected to keep downstream routing (WhatsApp
 * message, Supabase `leads.rental_duration` column) consistent.
 */
export const rentalDurationEnum = z.enum([
  "half_day_4h",
  "full_day_10h",
  "overnight_24h",
  "multi_day",
]);

/**
 * Trip type options (R10.12).
 *
 * Covers the Admin-facing taxonomy of rental intents. `other` is the
 * deliberate escape hatch for long-tail requests that the Admin
 * clarifies manually over WhatsApp.
 */
export const tripTypeEnum = z.enum([
  "airport_transfer",
  "corporate",
  "city_tour",
  "wedding",
  "out_of_city",
  "other",
]);

/** Supported Locale values (R10.14). Mirrors `Locale` in the i18n layer. */
export const localeEnum = z.enum(["id", "en"]);

// --- Asia/Jakarta time helpers ---------------------------------------------

/**
 * ISO-8601 `YYYY-MM-DD` regex used by both the `pickupDate` format check
 * and the cross-field `superRefine` short-circuit.
 */
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/** 24-hour `HH:MM` regex (00:00–23:59). */
const HH_MM_24H_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Minimum booking lead time in milliseconds (2 hours, per task 8.1). */
const MIN_LEAD_TIME_MS = 2 * 60 * 60 * 1000;

/**
 * Return today's calendar date in the Asia/Jakarta timezone as a
 * `YYYY-MM-DD` string.
 *
 * Uses `Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" })`
 * because `en-CA` formats numeric dates as ISO-8601, making the result
 * directly comparable against `pickupDate` using string ordering
 * (`>=`) — lexicographic order on `YYYY-MM-DD` strings coincides with
 * chronological order.
 */
function todayInJakarta(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Return a Date whose *host-local* fields represent the current
 * Asia/Jakarta wall-clock time.
 *
 * The trick: format `new Date()` as an `en-US` locale string in
 * `Asia/Jakarta`, then re-parse it with the default Date constructor,
 * which interprets the string in the host's local timezone. The net
 * effect is that `.getFullYear()`, `.getMonth()`, …, `.getMinutes()` on
 * the returned Date read out Jakarta wall-clock components, regardless
 * of where the server is physically running.
 *
 * Pairs with {@link wallClockInJakarta} so that subtracting `.getTime()`
 * values yields a delta in Jakarta wall-clock milliseconds.
 */
function getJakartaNow(): Date {
  const now = new Date();
  const jakartaString = now.toLocaleString("en-US", {
    timeZone: "Asia/Jakarta",
  });
  return new Date(jakartaString);
}

/**
 * Build a Date whose host-local fields represent the Asia/Jakarta
 * wall-clock moment `{dateIso}T{timeHm}` (e.g. `2026-01-02T08:30`).
 *
 * Must be compared only against another Date built with the same
 * helper family ({@link getJakartaNow}); comparing against a
 * naïve `new Date()` would re-introduce host-timezone skew.
 *
 * Assumes inputs have already passed {@link ISO_DATE_REGEX} and
 * {@link HH_MM_24H_REGEX}; the `superRefine` short-circuits otherwise.
 */
function wallClockInJakarta(dateIso: string, timeHm: string): Date {
  const [yStr, mStr, dStr] = dateIso.split("-");
  const [hStr, minStr] = timeHm.split(":");
  const year = Number(yStr);
  const month = Number(mStr);
  const day = Number(dStr);
  const hour = Number(hStr);
  const minute = Number(minStr);
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

// --- Booking schema (R10.1–R10.15) -----------------------------------------

/**
 * The Booking_Form Zod schema.
 *
 * `fullName` enforces R10.2 (3–80 trimmed characters, not digits-only).
 * `whatsappNumber` runs a `.transform` through {@link normalizePhone}
 * that emits a canonical `+62…` E.164 string on success and calls
 * `ctx.addIssue` + returns `z.NEVER` on failure (R10.3). A follow-up
 * `.refine` re-asserts {@link E164_REGEX} as defense-in-depth, and
 * `.brand<"E164">()` marks the output type so callers cannot confuse
 * raw phone strings with normalized ones.
 *
 * The cross-field `.superRefine` enforces the 2-hour lead time on
 * `{pickupDate, pickupTime}` in Asia/Jakarta. It short-circuits when
 * either field failed format validation so that the user sees one
 * error per field rather than two stacked errors.
 */
export const bookingSchema = z
  .object({
    // R10.1, R10.2
    fullName: z
      .string()
      .trim()
      .min(3)
      .max(80)
      .refine((v) => !/^\d+$/.test(v), {
        message: "fullName_digits_only",
      }),

    // R10.3
    whatsappNumber: z
      .string()
      .transform((raw, ctx) => {
        const normalized = normalizePhone(raw, { defaultCountry: "ID" });
        if (normalized === null) {
          ctx.addIssue({
            code: "custom",
            message: "invalid_phone",
          });
          return z.NEVER;
        }
        return normalized;
      })
      .refine((v) => E164_REGEX.test(v), { message: "invalid_phone_e164" })
      .brand<"E164">(),

    // R10.4
    pickupCity: z.string().trim().min(2).max(80),

    // R10.5
    pickupLocation: z.string().trim().min(3).max(140),

    // R10.6
    destination: z.string().trim().max(140).optional(),

    // R10.7
    pickupDate: z
      .string()
      .regex(ISO_DATE_REGEX, { message: "invalid_date_format" })
      .refine((v) => v >= todayInJakarta(), {
        message: "date_in_past",
      }),

    // R10.8
    pickupTime: z.string().regex(HH_MM_24H_REGEX, {
      message: "invalid_time_format",
    }),

    // R10.9
    rentalDuration: rentalDurationEnum,

    // R10.10
    passengers: z.number().int().min(1).max(30),

    // R10.11
    preferredVehicle: z.string().trim().max(80).optional(),

    // R10.12
    tripType: tripTypeEnum,

    // R10.13
    notes: z.string().trim().max(500).optional(),

    // R10.14
    locale: localeEnum,

    // R10.15
    utmSource: z.string().trim().max(200).optional(),
    utmMedium: z.string().trim().max(200).optional(),
    utmCampaign: z.string().trim().max(200).optional(),

    // Client-captured from `document.location.pathname`.
    sourcePage: z.string().trim().max(300).optional(),
  })
  .superRefine((data, ctx) => {
    // Skip the lead-time rule if either component failed its own
    // format check — the user already has a field-level error.
    if (!ISO_DATE_REGEX.test(data.pickupDate)) return;
    if (!HH_MM_24H_REGEX.test(data.pickupTime)) return;

    const pickup = wallClockInJakarta(data.pickupDate, data.pickupTime);
    const now = getJakartaNow();
    if (pickup.getTime() - now.getTime() < MIN_LEAD_TIME_MS) {
      ctx.addIssue({
        code: "custom",
        path: ["pickupTime"],
        message: "need_2h_lead",
      });
    }
  });

// --- Inferred types ---------------------------------------------------------

/**
 * Raw form values *before* any transforms or refinements run.
 *
 * This is what the client form (`react-hook-form` `<form>` state) holds
 * and what the server receives in the request body. `whatsappNumber`
 * is a plain `string` here — the canonical `+62…` form is only
 * available after parsing into {@link BookingParsed}.
 */
export type BookingInput = z.input<typeof bookingSchema>;

/**
 * Validated Booking_Form payload *after* transforms and refinements.
 *
 * `whatsappNumber` is a branded `string & z.BRAND<"E164">`, so code
 * that consumes a {@link BookingParsed} (the `/api/booking` handler,
 * the WhatsApp URL builder, the Supabase writer) gets a compile-time
 * guarantee that the phone has been normalized. Optional string
 * fields stay `string | undefined`.
 */
export type BookingParsed = z.output<typeof bookingSchema>;
