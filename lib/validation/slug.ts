/**
 * Slug validation for dynamic route segments.
 *
 * Requirements:
 * - R3.4: Dynamic route segments must consist only of lowercase ASCII letters
 *   (a-z), digits (0-9), and hyphens (-); 1–80 chars; no leading, trailing, or
 *   consecutive hyphens.
 * - R3.5: URLs with non-conforming dynamic segments must 404 in the locale of
 *   the path prefix. This module exposes the validator; the 404 response is
 *   implemented by page routing.
 *
 * Design: §3.
 *
 * Pure module: no imports, no side effects.
 */

/**
 * Regex matching a valid slug per R3.4.
 *
 * Breakdown:
 * - `[a-z0-9]+`     — one or more lowercase alphanumerics (no leading hyphen)
 * - `(-[a-z0-9]+)*` — zero or more groups of a single hyphen followed by one or
 *                     more alphanumerics (forbids trailing and consecutive hyphens)
 *
 * Length bounds are enforced separately by {@link isValidSlug} so that regex
 * backtracking stays linear on pathological inputs.
 */
export const SLUG_REGEX: RegExp = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Inclusive minimum slug length (R3.4). */
export const SLUG_MIN_LENGTH = 1;

/** Inclusive maximum slug length (R3.4). */
export const SLUG_MAX_LENGTH = 80;

/**
 * Type guard: returns `true` iff `value` is a string of length
 * [{@link SLUG_MIN_LENGTH}, {@link SLUG_MAX_LENGTH}] matching {@link SLUG_REGEX}.
 *
 * Does not mutate `value`. Use {@link normalizeSlug} first if you want to
 * accept inputs with surrounding whitespace or mixed case.
 */
export function isValidSlug(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }
  if (value.length < SLUG_MIN_LENGTH || value.length > SLUG_MAX_LENGTH) {
    return false;
  }
  return SLUG_REGEX.test(value);
}

/**
 * Assertion: throws an `Error` with a clear message unless `value` satisfies
 * {@link isValidSlug}. Narrows `value` to `string` for callers on success.
 */
export function assertValidSlug(value: unknown): asserts value is string {
  if (typeof value !== "string") {
    throw new Error(
      `Invalid slug: expected string, received ${typeof value}.`,
    );
  }
  if (value.length < SLUG_MIN_LENGTH || value.length > SLUG_MAX_LENGTH) {
    throw new Error(
      `Invalid slug: length ${value.length} is outside [${SLUG_MIN_LENGTH}, ${SLUG_MAX_LENGTH}].`,
    );
  }
  if (!SLUG_REGEX.test(value)) {
    throw new Error(
      `Invalid slug: "${value}" must match ${SLUG_REGEX.source} ` +
        `(lowercase a-z, 0-9, single hyphens between alphanumeric groups, ` +
        `no leading/trailing/consecutive hyphens).`,
    );
  }
}

/**
 * Normalizes a slug-like string: trims surrounding whitespace and lowercases
 * ASCII letters. Returns the normalized string even when it is not (yet) a
 * valid slug — this is a pure, total function used by the 301 canonicalization
 * logic in task 15.2 before validation.
 *
 * Callers that need a guarantee of validity should feed the result into
 * {@link isValidSlug} or {@link assertValidSlug}.
 */
export function normalizeSlug(value: string): string {
  return value.trim().toLowerCase();
}
