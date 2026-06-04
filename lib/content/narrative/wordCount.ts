/**
 * Word-count and section-count utilities for narrative MDX uniqueness checks.
 *
 * This module is consumed by the uniqueness analyzer (`scripts/check-uniqueness.ts`,
 * task 12.2) which enforces the per-entity word-count and token-overlap thresholds
 * defined in Requirements R6.1–R6.4:
 *
 * - R6.1 City intro:    150–600 words, ≥3 landmarks, ≥3 FAQs,
 *                       ≤40% token overlap vs. any other `launched` city intro
 *                       in the same locale.
 * - R6.2 Country intro: 200–800 words, ≥3 use cases, ≥3 FAQs,
 *                       ≤40% token overlap vs. any other active country intro
 *                       in the same locale.
 * - R6.3 Vehicle desc.: 120–500 words,
 *                       ≤40% token overlap vs. any other active vehicle desc.
 *                       in the same locale.
 * - R6.4 Service desc.: 150–600 words,
 *                       ≤40% token overlap vs. any other active service desc.
 *                       in the same locale.
 *
 * Per R23.4 the extractor operates on MDX body content that has already had
 * frontmatter stripped. This module additionally strips MDX/HTML/JSX component
 * tags and markdown syntax so only natural-language tokens are counted.
 *
 * Design reference: §4.5 (narrative MDX cache + word-count extraction).
 *
 * Pure module: no I/O, no mutation of external state.
 */

/**
 * Aggregate word-count result for a narrative document.
 *
 * `total` is the word count for the full body.
 * `sections` is an optional per-section breakdown keyed by frontmatter field
 * name (e.g. `intro`, `landmarks`, `faqs`). Populated by {@link countSections}.
 */
export interface WordCountResult {
  readonly total: number;
  readonly sections: Record<string, number>;
}

/**
 * Minimal bilingual stop-word list used by {@link overlapRatio} to avoid
 * punishing authors for common filler terms. Kept intentionally small so that
 * content words (landmarks, trip types, vehicle attributes) drive the overlap
 * score. Covers the highest-frequency English + Indonesian function words.
 */
const STOP_WORDS: ReadonlySet<string> = new Set([
  // English
  "the",
  "a",
  "an",
  "and",
  "or",
  "of",
  "to",
  "in",
  "on",
  "for",
  "with",
  "by",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  // Indonesian
  "yang",
  "dan",
  "di",
  "ke",
  "dari",
  "untuk",
  "pada",
  "atau",
  "dengan",
  "adalah",
  "ada",
  "ini",
  "itu",
  "sebuah",
  "sebagai",
  "akan",
]);

// --- Markdown / MDX stripping regexes ---------------------------------------

/** Markdown image: `![alt](url)` — removed entirely (alt text not counted). */
const IMAGE_RE = /!\[[^\]]*\]\([^)]*\)/g;

/** Markdown link: `[text](url)` — replaced with the link text only. */
const LINK_RE = /\[([^\]]*)\]\([^)]*\)/g;

/** HTML + JSX/MDX tags: `<Tag ...>`, `</Tag>`, `<Tag />`. */
const HTML_TAG_RE = /<[^>]+>/g;

/** Leading blockquote markers at start of any line: `> `, `>> `, ... */
const BLOCKQUOTE_RE = /^[ \t]*>+[ \t]?/gm;

/** Inline markdown syntax characters: bold, italic, heading, code, strike. */
const MARKDOWN_CHARS_RE = /[*_#`~]/g;

/**
 * Any character that is not a Unicode letter, Unicode number, apostrophe, or
 * whitespace. Replaced with a space so token boundaries are preserved. The
 * apostrophe survives this pass so contractions (e.g. `don't`, `it's`) stay
 * together; {@link stripEdgeApostrophes} cleans up any apostrophes that are
 * not between letters.
 */
const NON_TOKEN_RE = /[^\p{L}\p{N}'\s]/gu;

/**
 * Normalize and strip an MDX/markdown string down to a whitespace-separated
 * stream of lowercase natural-language tokens. The output still needs a
 * `.split(/\s+/)` pass to be turned into tokens; kept separate so both
 * {@link countWords} and {@link tokenize} can share the work.
 */
function normalizeAndStrip(text: string): string {
  const nfkc = text.normalize("NFKC").toLowerCase();
  return nfkc
    .replace(IMAGE_RE, " ")
    .replace(LINK_RE, "$1")
    .replace(HTML_TAG_RE, " ")
    .replace(BLOCKQUOTE_RE, " ")
    .replace(MARKDOWN_CHARS_RE, " ")
    .replace(NON_TOKEN_RE, " ");
}

/**
 * Remove apostrophes that are not sandwiched between letters. This keeps
 * contractions like `don't` intact but strips stray quote-style apostrophes
 * left over after punctuation removal (e.g. `'hello'` → `hello`).
 */
function stripEdgeApostrophes(token: string): string {
  // Drop any apostrophe at the start or end of the token, repeated until
  // stable. Inner apostrophes surrounded by letters survive.
  let out = token;
  while (out.startsWith("'")) out = out.slice(1);
  while (out.endsWith("'")) out = out.slice(0, -1);
  return out;
}

/**
 * Count natural-language words in an MDX body string.
 *
 * Processing pipeline (per R23.4):
 * 1. Unicode NFKC normalize + lowercase.
 * 2. Strip markdown images (`![alt](url)`) and replace links with their text.
 * 3. Strip HTML/JSX/MDX tags via `<[^>]+>`.
 * 4. Strip leading blockquote markers (`>`).
 * 5. Strip inline markdown syntax chars (`*`, `_`, `#`, `` ` ``, `~`).
 * 6. Replace any remaining punctuation with whitespace while preserving
 *    apostrophes that live inside contractions.
 * 7. Split on whitespace and return the count of non-empty tokens.
 *
 * @example
 * countWords("# Jakarta Chauffeur\n\nBook a **Toyota Alphard** for airport transfers.")
 * // → 7  ("jakarta", "chauffeur", "book", "a", "toyota", "alphard", "for"...)
 *
 * @example
 * countWords("Call our team — we're available 24/7.")
 * // → 6  ("call", "our", "team", "we're", "available", "24", "7")  // see note
 *
 * Note: numeric punctuation like the `/` in `24/7` is treated as a token
 * separator, so `24/7` becomes two tokens. This matches the overlap analyzer,
 * which scores token-level similarity.
 */
export function countWords(text: string): number {
  const cleaned = normalizeAndStrip(text);
  let count = 0;
  for (const raw of cleaned.split(/\s+/)) {
    if (raw.length === 0) continue;
    const tok = stripEdgeApostrophes(raw);
    if (tok.length > 0) count += 1;
  }
  return count;
}

/**
 * Tokenize an MDX body string into the same lowercase token stream that
 * {@link countWords} counts. Use this when you need the actual tokens for
 * overlap/Jaccard math.
 *
 * When `options.removeStopWords` is `true`, the minimal bilingual stop-word
 * list defined in this module is subtracted from the output. This is the
 * behavior the uniqueness analyzer (R6.1–R6.4) relies on: content words drive
 * the overlap score, not function words shared by every sentence.
 *
 * @example
 * tokenize("Jakarta is great for business trips.")
 * // → ["jakarta", "is", "great", "for", "business", "trips"]
 *
 * @example
 * tokenize("Jakarta is great for business trips.", { removeStopWords: true })
 * // → ["jakarta", "great", "business", "trips"]
 */
export function tokenize(
  text: string,
  options?: { readonly removeStopWords?: boolean },
): string[] {
  const cleaned = normalizeAndStrip(text);
  const tokens: string[] = [];
  for (const raw of cleaned.split(/\s+/)) {
    if (raw.length === 0) continue;
    const tok = stripEdgeApostrophes(raw);
    if (tok.length === 0) continue;
    if (options?.removeStopWords === true && STOP_WORDS.has(tok)) continue;
    tokens.push(tok);
  }
  return tokens;
}

/**
 * Directional word-token overlap ratio between two MDX body strings.
 *
 * Per R6.1–R6.4 two narratives share "no more than 40 percent of their word
 * tokens" when measured by case-insensitive word-level overlap after stop-word
 * removal. We use the directional overlap `|A ∩ B| / min(|A|, |B|)` rather
 * than symmetric Jaccard so that a short rephrased duplicate of a longer
 * source still scores high — the smaller document is the natural divisor and
 * a near-clone of the small document cannot hide behind the larger one's
 * extra vocabulary.
 *
 * Returns `0` when either input has no content tokens after stop-word
 * removal (nothing to compare). Output is clamped to the `[0, 1]` interval.
 *
 * @example
 * overlapRatio("We love Bali beaches", "We love Bali food")
 * // Tokens (stop-words removed): ["love","bali","beaches"] vs ["love","bali","food"]
 * // Intersection = {"love","bali"} (2); min(3,3) = 3 → 2/3 ≈ 0.667
 *
 * @example
 * overlapRatio("Jakarta airport transfers", "Bandung weekend tours")
 * // Disjoint content → 0
 */
export function overlapRatio(a: string, b: string): number {
  const aTokens = tokenize(a, { removeStopWords: true });
  const bTokens = tokenize(b, { removeStopWords: true });
  if (aTokens.length === 0 || bTokens.length === 0) return 0;

  const aSet = new Set(aTokens);
  const bSet = new Set(bTokens);

  // |A ∩ B| — iterate the smaller set for a tiny constant-factor win.
  const [small, large] = aSet.size <= bSet.size ? [aSet, bSet] : [bSet, aSet];
  let intersection = 0;
  for (const tok of small) {
    if (large.has(tok)) intersection += 1;
  }

  const divisor = Math.min(aSet.size, bSet.size);
  if (divisor === 0) return 0;
  const ratio = intersection / divisor;
  if (ratio < 0) return 0;
  if (ratio > 1) return 1;
  return ratio;
}

/**
 * Per-section size report for a narrative document. For each key:
 *
 * - `readonly unknown[]` → the array length is returned (used for `landmarks`,
 *   `faqs`, `itineraryIdeas`, etc. — the uniqueness analyzer uses this to
 *   verify `≥3` thresholds in R6.1/R6.2).
 * - `string`             → the word count of the string is returned, using
 *   {@link countWords} (used for `intro`, `heroSubheadline`, etc.).
 * - `undefined`          → reported as `0` so optional frontmatter fields do
 *   not require callers to pre-filter.
 *
 * @example
 * countSections({
 *   intro: "Jakarta is Indonesia's bustling capital city.",
 *   landmarks: [{ name: "Monas" }, { name: "Kota Tua" }, { name: "Ancol" }],
 *   testimonial: undefined,
 * })
 * // → { intro: 6, landmarks: 3, testimonial: 0 }
 */
export function countSections(
  sections: Record<string, readonly unknown[] | string | undefined>,
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const key of Object.keys(sections)) {
    const value = sections[key];
    if (value === undefined) {
      result[key] = 0;
    } else if (Array.isArray(value)) {
      result[key] = value.length;
    } else if (typeof value === "string") {
      result[key] = countWords(value);
    } else {
      // Defensive: unreachable under the declared input type, but keeps the
      // output total defined for any runtime value that slips through.
      result[key] = 0;
    }
  }
  return result;
}
