/**
 * Indonesian phone-number normalizer shared by the Booking_Form zod schema
 * (design §24) and the anti-fraud notice component (design §14, R13.5).
 *
 * Requirements:
 * - R10.3: THE Booking_Form SHALL validate that WhatsApp number, after
 *   normalizing leading `0`, `+62`, or `62` for Indonesian inputs to the
 *   `+62`-prefixed form, contains between 8 and 15 digits and is valid under
 *   E.164.
 *
 * Design:
 * - §14 (Booking_Form component): the client form pipes raw user input
 *   through the booking zod schema whose `whatsappNumber` field calls
 *   {@link normalizePhone} inside a `.transform(...)` step.
 * - §24 (Booking_Schema): the refinement that follows `.transform(...)` only
 *   needs to check the shape `/^\+\d{8,15}$/` because this module guarantees
 *   an E.164 string on success and `null` on any failure path.
 *
 * Pure module: no imports, no side effects. Safe for client- and
 * server-side use, and safe to import from both Next.js Route Handlers and
 * React Server Components.
 */

/**
 * Canonical E.164 shape: a `+`, a leading non-zero digit, then 7–14 more
 * digits (8–15 digits total). This matches the ITU-T E.164 cap of 15 digits
 * while also satisfying the `/^\+\d{8,15}$/` refine in the booking zod
 * schema (design §24).
 */
export const E164_REGEX: RegExp = /^\+[1-9]\d{7,14}$/;

/** Indonesia ITU-T country calling code, including the leading `+`. */
export const INDONESIA_COUNTRY_CODE = "+62";

/**
 * Options accepted by {@link normalizePhone}. Only `defaultCountry` is
 * supported today; `"ID"` is the default and the only recognized value per
 * R10.3 (the Booking_Form targets Indonesian visitors). Unknown values are
 * treated as "no default country" — bare national numbers like `0812…` or
 * `812…` will then return `null`.
 */
export interface NormalizePhoneOptions {
  readonly defaultCountry?: "ID";
}

/**
 * Normalize a human-typed phone number to strict E.164.
 *
 * Accepts Indonesian-style inputs with a leading `0`, `+62`, `62`, or a bare
 * mobile prefix `8…`, and tolerates spaces, dashes, parentheses, periods and
 * other common separators. Returns the canonical `+62…` form on success, or
 * `null` if the input cannot be coerced into a valid E.164 string.
 *
 * Rules (evaluated in order, after stripping separators):
 *
 * 1. Empty / non-string inputs → `null`.
 * 2. Starts with `+` → validated as E.164, returned as-is on success.
 *    (Allows non-Indonesian admin numbers to pass through unchanged.)
 * 3. Starts with `0` AND `defaultCountry === "ID"` (default) → the leading
 *    `0` is replaced with `+62`.
 * 4. Starts with `62` (no leading `+`) → a `+` is prepended.
 * 5. Starts with `8` (bare Indonesian mobile prefix) AND
 *    `defaultCountry === "ID"` → `+62` is prepended.
 * 6. Anything else → `null`.
 *
 * The final candidate must match {@link E164_REGEX}; otherwise `null` is
 * returned. This means the function is total: every input maps to either a
 * valid E.164 string or `null`, never an exception.
 *
 * @example Leading-zero Indonesian number
 * ```ts
 * normalizePhone("0812-3456-789");      // "+628123456789"
 * normalizePhone("0812 3456 789");      // "+628123456789"
 * normalizePhone("(0812) 3456-789");    // "+628123456789"
 * ```
 *
 * @example Already `+62`-prefixed (E.164)
 * ```ts
 * normalizePhone("+62 812-3456-789");   // "+628123456789"
 * normalizePhone("+628123456789");      // "+628123456789"
 * ```
 *
 * @example Bare country code without `+`
 * ```ts
 * normalizePhone("62 812 3456 789");    // "+628123456789"
 * ```
 *
 * @example Bare Indonesian mobile prefix
 * ```ts
 * normalizePhone("8123456789");         // "+628123456789"
 * ```
 *
 * @example Invalid characters stripped but value still rejected
 * ```ts
 * normalizePhone("abc123");             // null (no recognized leading form)
 * normalizePhone("");                   // null
 * normalizePhone("  ");                 // null
 * ```
 *
 * @example Out-of-range length
 * ```ts
 * normalizePhone("0812");               // null (too short: 5 digits after +62)
 * normalizePhone("+628" + "1".repeat(20)); // null (too long: >15 digits)
 * ```
 *
 * @example Opting out of Indonesia defaulting
 * ```ts
 * // defaultCountry omitted on purpose — callers dealing with non-Indonesian
 * // inputs should pass a validated `+`-prefixed string.
 * normalizePhone("0812-3456-789", { defaultCountry: "ID" }); // "+628123456789"
 * ```
 */
export function normalizePhone(
  input: string,
  options?: NormalizePhoneOptions,
): string | null {
  if (typeof input !== "string") {
    return null;
  }

  // Strip every character that is not a digit or a leading `+`. We walk the
  // string once so that a `+` appearing anywhere other than index 0 in the
  // input is dropped (e.g. "0812+3456" → "08123456"), which matches how
  // humans commonly mistype numbers.
  let cleaned = "";
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (ch === undefined) continue;
    if (ch >= "0" && ch <= "9") {
      cleaned += ch;
      continue;
    }
    if (ch === "+" && cleaned.length === 0) {
      cleaned = "+";
    }
    // Any other char (space, dash, paren, period, letter, …) is ignored.
  }

  if (cleaned.length === 0 || cleaned === "+") {
    return null;
  }

  const defaultCountry = options?.defaultCountry ?? "ID";
  const isIndonesia = defaultCountry === "ID";

  let candidate: string | null = null;

  if (cleaned.startsWith("+")) {
    // Rule 2: already E.164-shaped — pass through and let E164_REGEX validate.
    candidate = cleaned;
  } else if (cleaned.startsWith("0") && isIndonesia) {
    // Rule 3: leading national trunk prefix for Indonesia → replace with +62.
    candidate = `${INDONESIA_COUNTRY_CODE}${cleaned.slice(1)}`;
  } else if (cleaned.startsWith("62")) {
    // Rule 4: country code without `+`.
    candidate = `+${cleaned}`;
  } else if (cleaned.startsWith("8") && isIndonesia) {
    // Rule 5: bare Indonesian mobile prefix.
    candidate = `${INDONESIA_COUNTRY_CODE}${cleaned}`;
  } else {
    // Rule 6: unknown leading form.
    return null;
  }

  return E164_REGEX.test(candidate) ? candidate : null;
}

/**
 * Convenience predicate: returns `true` iff `input` is already a valid
 * E.164 string (matches {@link E164_REGEX}). Used by the build-time check
 * for `ARASYA_WHATSAPP_NUMBER` (R11.3, design §20) and by tests.
 *
 * @example
 * ```ts
 * isValidE164("+628123456789"); // true
 * isValidE164("08123456789");   // false — missing `+`
 * isValidE164("+62");           // false — too short
 * isValidE164(12345 as unknown as string); // false — wrong type
 * ```
 */
export function isValidE164(input: string): boolean {
  if (typeof input !== "string") {
    return false;
  }
  return E164_REGEX.test(input);
}

/**
 * Format an E.164 Indonesian number for human display as
 * `+62 xxx-xxxx-xxxx`, the grouping required by R13.5 (anti-fraud notice).
 *
 * The grouping after the `+62` country code is `3-4-4` digits (e.g.
 * `+62 812-3456-7890`). Shorter numbers gracefully degrade by consuming as
 * many digits as are available for each group and omitting any empty
 * trailing group, so a 9-digit national number (`+62` + `812345678`)
 * renders as `+62 812-3456-78` rather than leaving a dangling `-`.
 *
 * The input must already be a valid E.164 Indonesian number starting with
 * `+62`. If it is not, the original string is returned unchanged — this
 * function is a display helper, never a validator, and must not mask a
 * failed {@link normalizePhone}. Callers that want strict behavior should
 * guard with {@link isValidE164} first.
 *
 * @example Canonical 12-digit Indonesian mobile
 * ```ts
 * formatIndonesianDisplay("+628123456789");  // "+62 812-3456-789"
 * formatIndonesianDisplay("+6281234567890"); // "+62 812-3456-7890"
 * ```
 *
 * @example Non-Indonesian or malformed input passes through untouched
 * ```ts
 * formatIndonesianDisplay("+15551234567");   // "+15551234567"
 * formatIndonesianDisplay("not a number");   // "not a number"
 * ```
 */
export function formatIndonesianDisplay(e164: string): string {
  if (typeof e164 !== "string") {
    return e164;
  }
  if (!E164_REGEX.test(e164) || !e164.startsWith(INDONESIA_COUNTRY_CODE)) {
    return e164;
  }

  const national = e164.slice(INDONESIA_COUNTRY_CODE.length);
  if (national.length === 0) {
    return e164;
  }

  // Group as 3-4-4 after the country code; any remainder is appended as its
  // own group so no digit is ever dropped.
  const groupSizes = [3, 4, 4];
  const groups: string[] = [];
  let cursor = 0;
  for (const size of groupSizes) {
    if (cursor >= national.length) break;
    groups.push(national.slice(cursor, cursor + size));
    cursor += size;
  }
  if (cursor < national.length) {
    groups.push(national.slice(cursor));
  }

  return `${INDONESIA_COUNTRY_CODE} ${groups.join("-")}`;
}
