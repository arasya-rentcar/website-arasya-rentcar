"use client";

/**
 * `localStorage`-backed persistence for the user's analytics-consent
 * decision (task 11.2, R18.5, R18.6).
 *
 * The Cookie_Consent_Banner is the only UI that mutates this store;
 * `lib/analytics/client.ts` reads it indirectly through
 * {@link applyPersistedConsent} on app boot so the in-memory consent
 * state matches whatever the user chose on a previous visit.
 *
 * Storage shape:
 *
 *   localStorage["arasya:consent:v1"] = JSON.stringify({
 *     status: "granted" | "denied",
 *     timestamp: "2025-01-15T08:00:00.000Z"
 *   })
 *
 * The `:v1` suffix on the key is reserved for future schema evolution
 * — if we ever extend the record (e.g. to track consent for a third
 * channel) we bump to `:v2` and migrate, instead of silently changing
 * the parser's contract.
 *
 * Every public function tolerates being called from a context where
 * `window` is undefined (SSR, RSC) or where `localStorage` throws
 * (Safari Private Browsing, file:// origin, quota exceeded). The
 * fallback in every error path is "no record found" so the banner
 * shows again rather than silently locking the user out of
 * re-consenting.
 *
 * Requirements:
 * - R18.5 — DNT is wired into the consumer ({@link CookieConsentBanner})
 *   not this store; the store only persists explicit decisions.
 * - R18.6 — persistence ≥180 days. We persist for one year (365 days)
 *   and re-show the banner when the record is older — see
 *   {@link shouldShowBanner}. One year is well within the ≥180-day
 *   floor and aligns with common GDPR cookie-banner re-consent
 *   intervals.
 */

import {
  setConsentStatus,
  type ConsentStatus,
} from "@/lib/analytics/client";

const STORAGE_KEY = "arasya:consent:v1";

/**
 * Same-tab subscribers notified on every {@link writeConsent} call.
 *
 * The browser's `storage` event only fires in *other* tabs — within
 * the same tab a write to `localStorage` does not notify subscribers.
 * The cookie consent banner uses `useSyncExternalStore`, which needs
 * a re-read trigger after the user clicks Accept/Decline in this
 * very tab. This in-module listener set bridges that gap.
 */
const sameTabListeners = new Set<() => void>();

/**
 * Subscribe a listener that fires whenever {@link writeConsent} is
 * called in the *same* tab. Returns an unsubscribe function. Used by
 * the cookie consent banner's `useSyncExternalStore` subscriber so
 * the banner closes immediately after the user clicks Accept/Decline.
 */
export function subscribeSameTabConsent(listener: () => void): () => void {
  sameTabListeners.add(listener);
  return () => sameTabListeners.delete(listener);
}

/**
 * One year, expressed in milliseconds. Used by {@link shouldShowBanner}
 * to decide whether the persisted record is stale enough to warrant
 * re-prompting the visitor (R18.6).
 */
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * The persisted record shape. `timestamp` is an ISO-8601 string so
 * the JSON survives `JSON.parse` round-trips without timezone
 * ambiguity.
 */
export interface ConsentRecord {
  readonly status: Exclude<ConsentStatus, "unknown">;
  readonly timestamp: string;
}

/**
 * Read the persisted consent record from `localStorage`.
 *
 * Returns `null` whenever:
 *   - we are running on the server (no `window`)
 *   - `localStorage` access throws (private mode, quota)
 *   - no record exists for {@link STORAGE_KEY}
 *   - the stored payload is malformed JSON
 *   - the stored payload's `status` is not `granted` or `denied`
 *   - the stored payload's `timestamp` is not a string
 *
 * Defensive parsing: a record with a missing/extra field is treated
 * as no record at all rather than a partial parse. This keeps the
 * banner visible (and re-asks for consent) instead of silently
 * leaving the user in a corrupted-state limbo.
 */
export function readConsent(): ConsentRecord | null {
  if (typeof window === "undefined") return null;

  let raw: string | null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Private mode, disabled storage, etc. Treat as no record.
    return null;
  }

  if (raw === null) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;
  const candidate = parsed as Partial<ConsentRecord>;
  if (candidate.status !== "granted" && candidate.status !== "denied") {
    return null;
  }
  if (typeof candidate.timestamp !== "string") return null;

  return { status: candidate.status, timestamp: candidate.timestamp };
}

/**
 * Persist a consent decision to `localStorage` and propagate it to
 * the in-memory analytics consent state (R18.6).
 *
 * Calling this with `"granted"` is the only path that allows task
 * 11.1's analytics script to load on subsequent navigations. Calling
 * it with `"denied"` is what the DNT auto-decline path
 * ({@link CookieConsentBanner}) uses to record the implied refusal.
 *
 * Storage failures (quota, locked private mode) are logged to the
 * console but never thrown — a banner that crashes the app on a
 * full-quota error is worse than one that silently fails to
 * persist.
 */
export function writeConsent(status: "granted" | "denied"): void {
  if (typeof window === "undefined") return;

  const record: ConsentRecord = {
    status,
    timestamp: new Date().toISOString(),
  };

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch (err) {
    // We deliberately swallow the storage error so the in-memory
    // state still updates and the banner closes. The consequence is
    // that the banner will reappear on next page load — which is the
    // correct conservative behavior when persistence fails.
    console.error("[consent] failed to persist consent record", err);
  }

  setConsentStatus(status);

  // Notify same-tab subscribers (the cookie banner's
  // `useSyncExternalStore` snapshot re-reader) so the UI updates
  // immediately. The browser's `storage` event covers cross-tab
  // updates; this loop covers the same-tab case.
  for (const listener of sameTabListeners) {
    try {
      listener();
    } catch (err) {
      console.error("[consent] same-tab listener threw", err);
    }
  }
}

/**
 * Whether the consent banner should be shown to the visitor on the
 * current page load (R18.6).
 *
 * Returns `true` when:
 *   - no record exists at all (first visit, cleared storage), OR
 *   - the persisted record is older than {@link ONE_YEAR_MS}, OR
 *   - the persisted record's timestamp is corrupt (NaN after parse)
 *
 * Returns `false` once the user has made a decision recently. The
 * banner is suppressed even when `status === "denied"` — the user
 * said no, we respect that until the year is up.
 */
export function shouldShowBanner(): boolean {
  const record = readConsent();
  if (record === null) return true;

  const recordedAt = new Date(record.timestamp).getTime();
  if (Number.isNaN(recordedAt)) return true;

  return Date.now() - recordedAt > ONE_YEAR_MS;
}

/**
 * Hydrate the in-memory analytics consent state from `localStorage`.
 *
 * Called from the banner's `useEffect` on mount so that subsequent
 * code (analytics page-view tracker, third-party chat widget) reads
 * the correct status before any decisions about loading scripts get
 * made.
 *
 * No-op when no record exists — the in-memory default (`"unknown"`)
 * already matches the no-record case.
 */
export function applyPersistedConsent(): void {
  const record = readConsent();
  if (record !== null) {
    setConsentStatus(record.status);
  }
}
