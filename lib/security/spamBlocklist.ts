/**
 * Spam blocklist + redaction helpers for the Booking_Form Route Handler
 * (design §16).
 *
 * Requirements:
 * - R19.7: IF a Booking_Form submission contains a known spam signal
 *   (URL, common promo token, Russian/Chinese/Kazakh spam phrase, etc.)
 *   THEN the `/api/booking` Route Handler SHALL reject the payload with a
 *   generic validation error response AND SHALL redact any matching text
 *   before it is written to application logs.
 *
 * Design:
 * - §16 (Booking Route Handler): the Route Handler calls {@link isSpamPayload}
 *   on the parsed form data and, on a match, emits a single structured log
 *   line whose string fields have been passed through {@link redact} so the
 *   raw spam content never lands in application logs. The matched phrase
 *   identifiers (phrase text for strings, `regex.source` for RegExps) are
 *   safe to log — they describe the blocklist entry, not the spammer's
 *   payload.
 *
 * Pure module: no I/O, no Next.js imports, no Supabase imports, no side
 * effects. Safe to import from Route Handlers, middleware, scripts, and unit
 * tests alike. The blocklist is a conservative baseline — ops can extend
 * {@link SPAM_PHRASES} as new signals emerge without touching callers.
 */

// ---------------------------------------------------------------------------
// Internal regex buckets
// ---------------------------------------------------------------------------
//
// The task splits regex detectors into two categories that differ only in
// which text form they run against:
//
//   - URL detectors match punctuation-rich patterns (`://`, `.me/`, `.ly`).
//     They run against the *original* text so that neither NFKC
//     normalization nor `toLowerCase()` can reshape a URL in a way that
//     hides the signal.
//   - Phrase detectors (word-boundary country tokens, etc.) run against
//     the NFKC-normalized lowercase form so that `\b…\b` boundaries behave
//     consistently across Unicode width variants.
//
// Both regex sets are marked `/i` defensively even though the phrase
// detectors operate on lowered text — the flag keeps them correct even
// when a future caller reaches in through {@link SPAM_PHRASES} directly.

const URL_REGEXES: readonly RegExp[] = [
  /https?:\/\/[^\s]+/i,
  /\bt\.me\//i,
  /bit\.ly/i,
];

const PHRASE_REGEXES: readonly RegExp[] = [
  /\b(kz|ru)\b/i,
];

/**
 * Conservative starter list of spam signals. Ops can extend this array as
 * new patterns emerge; order is preserved so any downstream snapshotting
 * stays stable. Strings are matched case-insensitively as substrings.
 * RegExp entries are used as-is.
 *
 * Ordering mirrors the scope laid down for task 8.12 so reviewers can diff
 * the array against the spec at a glance.
 */
export const SPAM_PHRASES: readonly (string | RegExp)[] = [
  "viagra",
  "cialis",
  "bitcoin",
  "crypto giveaway",
  "seo backlinks",
  ...URL_REGEXES,
  "loan offer",
  "work from home",
  ...PHRASE_REGEXES,
];

// ---------------------------------------------------------------------------
// Matching helpers
// ---------------------------------------------------------------------------

/** Lowercase NFKC form used for string substring + phrase-regex matching. */
function normalize(text: string): string {
  return text.normalize("NFKC").toLowerCase();
}

/**
 * Find the first blocklist entry that matches `text`, or `null` if none do.
 * Shared by {@link looksSpammy} (which just wants a boolean) and
 * {@link isSpamPayload} (which needs the matched identifier to log).
 */
function findSpamMatch(text: string): string | RegExp | null {
  const lowered = normalize(text);

  for (const phrase of SPAM_PHRASES) {
    if (typeof phrase === "string") {
      // Substring match against the NFKC-lowercased text. We also lower
      // the phrase so callers can register blocklist entries in any case.
      if (lowered.includes(phrase.toLowerCase())) {
        return phrase;
      }
      continue;
    }

    // RegExp entry: decide which text form to test against.
    const target = URL_REGEXES.includes(phrase) ? text : lowered;
    if (phrase.test(target)) {
      return phrase;
    }
  }

  return null;
}

/**
 * Returns `true` iff `text` contains any known spam signal.
 *
 * NFKC-normalizes and lowercases the input before checking string phrases
 * and phrase-style regexes. URL detectors run against the original text so
 * URL punctuation survives intact. Returns `true` on the first match.
 *
 * @example Canonical use from the Route Handler
 * ```ts
 * if (looksSpammy(d.notes ?? "")) {
 *   return NextResponse.json({ code: "spam_rejected" }, { status: 400 });
 * }
 * ```
 *
 * @example Matches common spam punctuation regardless of case
 * ```ts
 * looksSpammy("Check this: https://evil.example/promo"); // true
 * looksSpammy("VIAGRA available now");                   // true
 * looksSpammy("bit.LY/xyz");                             // true
 * ```
 *
 * @example Benign inputs
 * ```ts
 * looksSpammy("Tolong booking untuk besok pagi"); // false
 * looksSpammy("");                                // false
 * ```
 */
export function looksSpammy(text: string): boolean {
  if (typeof text !== "string" || text.length === 0) return false;
  return findSpamMatch(text) !== null;
}

// ---------------------------------------------------------------------------
// Payload walker
// ---------------------------------------------------------------------------

/** Maximum recursion depth — guards against circular references (R19.7). */
const MAX_DEPTH = 6;

/**
 * Return the stable string identifier for a blocklist entry:
 * - strings → the phrase text as-registered (stable, safe to log)
 * - RegExp  → `source` (the pattern without flags, stable, safe to log)
 *
 * Identifiers intentionally describe the *blocklist rule*, not the
 * spammer's payload, so they can be surfaced in logs without leaking
 * personal data.
 */
function phraseIdentifier(phrase: string | RegExp): string {
  return typeof phrase === "string" ? phrase : phrase.source;
}

/**
 * Recursively walk `value`, collecting blocklist-rule identifiers for every
 * string that matches. `depth` is bounded by {@link MAX_DEPTH} so circular
 * references terminate after at most six hops.
 */
function collectMatches(
  value: unknown,
  depth: number,
  out: Set<string>,
): void {
  if (depth > MAX_DEPTH) return;

  if (typeof value === "string") {
    const hit = findSpamMatch(value);
    if (hit !== null) out.add(phraseIdentifier(hit));
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectMatches(item, depth + 1, out);
    }
    return;
  }

  if (value !== null && typeof value === "object") {
    for (const nested of Object.values(value as Record<string, unknown>)) {
      collectMatches(nested, depth + 1, out);
    }
    return;
  }

  // Numbers, booleans, null, undefined, symbols, bigints: skipped.
}

/**
 * Inspect every string value inside `payload` (including values nested in
 * arrays and plain objects) and report whether any matches a blocklist
 * entry. Non-string leaves (numbers, booleans, `null`, `undefined`) are
 * skipped per R19.7's focus on textual spam signals.
 *
 * The walker is depth-capped at {@link MAX_DEPTH} (6), which both limits
 * work on pathologically nested structures and guarantees termination on
 * self-referential objects without needing a visited-set.
 *
 * `matches` contains stable rule identifiers (phrase text for strings,
 * `regex.source` for RegExps), deduped across the payload in the order
 * they were first encountered. Callers can safely include these in
 * structured logs — they describe the blocklist, not the spammer's input.
 *
 * @example Booking submission contains a promotional URL
 * ```ts
 * isSpamPayload({
 *   fullName: "Mas Budi",
 *   notes: "Promo terbaik https://bit.ly/xxx",
 * });
 * // → { spam: true, matches: ["https?:\\/\\/[^\\s]+", "bit\\.ly"] }
 * ```
 *
 * @example Clean payload
 * ```ts
 * isSpamPayload({
 *   fullName: "Ibu Rini",
 *   passengers: 3,
 *   notes: "Jemput pukul 08:00 di Bogor",
 * });
 * // → { spam: false, matches: [] }
 * ```
 *
 * @example Circular reference terminates safely
 * ```ts
 * const p: Record<string, unknown> = { notes: "halo" };
 * p.self = p;
 * isSpamPayload(p); // → { spam: false, matches: [] }  (does not stack-overflow)
 * ```
 */
export function isSpamPayload(
  payload: Record<string, unknown>,
): { spam: boolean; matches: string[] } {
  const matches = new Set<string>();
  // The payload itself counts as depth 0; its direct fields are depth 1.
  collectMatches(payload, 0, matches);
  const arr = Array.from(matches);
  return { spam: arr.length > 0, matches: arr };
}

// ---------------------------------------------------------------------------
// Redaction
// ---------------------------------------------------------------------------

/** Marker written in place of any blocklist hit before the text reaches logs. */
const REDACTION_MARKER = "[REDACTED]";

/** Escape a literal string for safe interpolation into a RegExp source. */
function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Ensure a regex replaces *every* occurrence during `String.prototype.replace`.
 * The baseline blocklist regexes are declared with `/i` but no `/g`, so we
 * clone them here with the `g` flag added. Cloning keeps state clean: shared
 * stateful regexes would otherwise carry `lastIndex` across calls.
 */
function withGlobalFlag(re: RegExp): RegExp {
  return re.flags.includes("g") ? re : new RegExp(re.source, re.flags + "g");
}

/**
 * Replace every blocklist hit in `text` with `[REDACTED]`. Used by the
 * Route Handler's structured logger so raw spam content never lands in
 * application logs (R19.7, design §16).
 *
 * String phrases are redacted case-insensitively. Regex entries are cloned
 * with a global flag so all matches are replaced in one pass. Callers can
 * redact before logging without worrying about regex state mutation.
 *
 * @example Redacting a notes field before logging
 * ```ts
 * const raw = "Promo terbaik https://bit.ly/abc - VIAGRA murah";
 * console.warn("[booking.spam]", { notes: redact(raw) });
 * // Log line notes: "Promo terbaik [REDACTED] - [REDACTED] murah"
 * //                                  ^^^^^^^^^^   ^^^^^^^^^^
 * //                              URL + bit.ly      viagra
 * ```
 *
 * @example Input without any blocklist hits is returned unchanged
 * ```ts
 * redact("Tolong booking mobil Innova untuk besok");
 * // → "Tolong booking mobil Innova untuk besok"
 * ```
 */
export function redact(text: string): string {
  if (typeof text !== "string" || text.length === 0) return text;

  let out = text;
  for (const phrase of SPAM_PHRASES) {
    if (typeof phrase === "string") {
      out = out.replace(new RegExp(escapeRegExp(phrase), "gi"), REDACTION_MARKER);
    } else {
      out = out.replace(withGlobalFlag(phrase), REDACTION_MARKER);
    }
  }
  return out;
}
