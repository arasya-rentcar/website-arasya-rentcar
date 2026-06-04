/**
 * Narrowing helpers for snapshot rows.
 *
 * The snapshot loader (task 4.2) deliberately keeps every row typed as
 * `Record<string, unknown>` until the Supabase generator stub is replaced
 * (TODO noted in `snapshot.ts`). Per-entity loaders have to narrow every
 * field they touch. These helpers centralise that narrowing so each loader
 * module stays readable and none of them reach for `as string` casts —
 * which would defeat `noUncheckedIndexedAccess` and hide schema drift.
 *
 * All helpers return `null` (or a caller-provided default) when the field
 * is missing or the wrong shape. Callers decide whether to skip the row
 * with a `console.warn` or substitute a default. None of these helpers
 * throw.
 *
 * Pure module: no imports, no side effects, no Next.js or Node APIs.
 */

/** True when `row` is a plain object (not null, not an array). */
export function isRecord(row: unknown): row is Record<string, unknown> {
  return typeof row === "object" && row !== null && !Array.isArray(row);
}

/** Return `row[key]` when `row` is a plain object; otherwise `undefined`. */
export function readField(row: unknown, key: string): unknown {
  return isRecord(row) ? row[key] : undefined;
}

/** Return a non-empty string at `row[key]`; otherwise `null`. */
export function readStr(row: unknown, key: string): string | null {
  const value = readField(row, key);
  return typeof value === "string" && value.length > 0 ? value : null;
}

/** Return a non-empty string at `row[key]`, or the empty string when missing. */
export function readStrOrEmpty(row: unknown, key: string): string {
  const value = readField(row, key);
  return typeof value === "string" ? value : "";
}

/** Return a finite integer at `row[key]`; otherwise `null`. */
export function readInt(row: unknown, key: string): number | null {
  const value = readField(row, key);
  if (typeof value !== "number") return null;
  if (!Number.isFinite(value)) return null;
  if (!Number.isInteger(value)) return null;
  return value;
}

/** Return a finite integer at `row[key]`, or `fallback` when missing/invalid. */
export function readIntOr(row: unknown, key: string, fallback: number): number {
  const value = readInt(row, key);
  return value === null ? fallback : value;
}

/** Return a finite number at `row[key]`; otherwise `null`. */
export function readFloatOrNull(row: unknown, key: string): number | null {
  const value = readField(row, key);
  if (typeof value !== "number") return null;
  if (!Number.isFinite(value)) return null;
  return value;
}

/** Return a strict boolean at `row[key]`, or `fallback` when missing/invalid. */
export function readBool(row: unknown, key: string, fallback: boolean): boolean {
  const value = readField(row, key);
  return typeof value === "boolean" ? value : fallback;
}

/** Strongly-typed enum narrowing: return `row[key]` when it's one of `allowed`, else `null`. */
export function readEnum<T extends string>(
  row: unknown,
  key: string,
  allowed: readonly T[],
): T | null {
  const value = readField(row, key);
  if (typeof value !== "string") return null;
  return (allowed as readonly string[]).includes(value) ? (value as T) : null;
}
