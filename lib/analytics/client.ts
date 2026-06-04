"use client";

/**
 * Analytics_Layer client wrapper (design §19, requirement R18).
 *
 * Wraps Plausible's global `plausible()` function so callers can fire
 * analytics events without knowing about the global, and so every
 * emission is gated on three independent conditions:
 *
 *   1. `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` is set — the Plausible script
 *      will not have been loaded otherwise, so emitting is a no-op
 *      anyway. This keeps dev / preview environments free of
 *      analytics noise (R18.5: only essential scripts run before
 *      consent; absence of a configured domain is also "essential
 *      none").
 *   2. The Visitor has explicitly granted consent via the cookie
 *      consent banner (R18.5, R18.6). Until that signal arrives the
 *      status is `"unknown"` and every call is dropped.
 *   3. The browser's DoNotTrack signal is off. R18.5 states that an
 *      inbound `DoNotTrack: 1` is treated as an explicit denial of
 *      consent for the session; we mirror that in-page so a Visitor
 *      with DNT on never produces events even if the consent banner
 *      was previously accepted on a different device.
 *
 * Plausible itself is loaded by `app/[locale]/layout.tsx` via
 * `next/script` (task 11.3) and exposes `window.plausible(eventName, opts)`.
 * This module is the only place in the app that should reference that
 * global; everything else goes through {@link trackEvent} or one of
 * the typed helpers in `./events`.
 *
 * The module is `"use client"` because it touches `window` and
 * `navigator` and stores per-session consent in a module-scoped
 * variable. It is safe to import from server components — the
 * functions are no-ops on the server (every check guards on
 * `typeof window !== "undefined"` or equivalent).
 *
 * The exported consent surface ({@link ConsentStatus},
 * {@link getConsentStatus}, {@link setConsentStatus}) is the same one
 * `lib/analytics/consentStore.ts` (task 11.2) hydrates from
 * `localStorage` on app boot, so the persistence layer and the
 * emission gate stay in lock-step.
 *
 * Design reference: §19 (Client Components, analytics).
 */

declare global {
  interface Window {
    /**
     * Plausible's tracking function, attached to `window` by the
     * Plausible script tag with `data-domain` set to the project's
     * domain. The signature here mirrors the documented public API:
     *
     *   plausible(eventName, { props: Record<string, primitive> })
     *
     * `props` values must be primitive (string/number/boolean) — that
     * is the contract Plausible's ingestion API enforces.
     */
    plausible?: (
      eventName: string,
      opts?: { props?: Record<string, string | number | boolean> },
    ) => void;
  }
}

// ---------------------------------------------------------------------------
// Consent state (in-memory, per session)
// ---------------------------------------------------------------------------

/**
 * Tri-state consent signal used by {@link shouldEmitAnalytics} and the
 * cookie consent banner.
 *
 * - `"unknown"` — the Visitor has not yet made a decision; treated as
 *   denial so we never emit before the banner has been resolved.
 *   Default on first load.
 * - `"granted"` — the Visitor accepted analytics in the cookie
 *   banner. Analytics scripts may load and `trackEvent` calls fire.
 * - `"denied"`  — the Visitor declined or revoked consent, OR the
 *   browser advertised DoNotTrack=1 at decision time (R18.5).
 *   Analytics scripts MUST NOT load.
 */
export type ConsentStatus = "unknown" | "granted" | "denied";

/**
 * Module-scoped consent cache. The cookie consent banner (task 11.2)
 * is the source of truth — on mount it reads the persisted decision
 * from `localStorage` (via `lib/analytics/consentStore.ts`) and calls
 * {@link setConsentStatus} to hydrate this value, then calls it
 * again whenever the Visitor changes the decision.
 *
 * Stored at module scope rather than in React state so server-emitted
 * call sites and pure helpers can read it without hooking into a
 * provider. The trade-off is that consumers re-rendering on a
 * consent change must be triggered by the banner itself; the
 * analytics call sites are fire-and-forget and don't need to react.
 */
let currentStatus: ConsentStatus = "unknown";

/**
 * Read the current in-memory consent state. The state is process-local
 * — `consentStore.applyPersistedConsent()` rehydrates it from
 * `localStorage` on app boot, and `setConsentStatus` mutates it
 * after the user clicks Accept/Decline.
 */
export function getConsentStatus(): ConsentStatus {
  return currentStatus;
}

/**
 * Update the in-memory consent state. Idempotent — passing the same
 * value twice is a no-op visible to callers (the value is just
 * reassigned).
 *
 * Called by the cookie consent banner
 * (`components/consent/CookieConsentBanner.tsx`, task 11.2) on mount
 * (to hydrate from `localStorage`) and on every subsequent decision
 * change. Exported as a setter rather than a React context so
 * non-component code paths (tests, narrow helper modules) can flip it
 * without provider plumbing.
 */
export function setConsentStatus(status: ConsentStatus): void {
  currentStatus = status;
}

// ---------------------------------------------------------------------------
// DoNotTrack detection
// ---------------------------------------------------------------------------

/**
 * Whether the current browser advertises DoNotTrack (R18.5).
 *
 * DNT has been reported under three different property names across
 * vendors over the years:
 *
 *   - `navigator.doNotTrack`   — the standard, used by Firefox, Edge,
 *     Chrome.
 *   - `window.doNotTrack`      — older Safari.
 *   - `navigator.msDoNotTrack` — legacy IE / older Edge.
 *
 * Each returns the string `"1"` or `"yes"` when DNT is on. Anything
 * else (including the W3C-stalled `null` and `"unspecified"`) means
 * the user has not opted out.
 *
 * Server-side: returns `false`. The DNT signal is only meaningful in
 * the browser; on the server we conservatively default to "no DNT"
 * and let the client re-evaluate on hydration. Server route handlers
 * that need the signal should read the inbound `DNT` header
 * directly.
 */
export function isDntEnabled(): boolean {
  if (typeof navigator === "undefined") return false;

  const candidates: (string | null | undefined)[] = [
    navigator.doNotTrack,
    typeof window !== "undefined"
      ? (window as unknown as { doNotTrack?: string | null }).doNotTrack
      : null,
    (navigator as unknown as { msDoNotTrack?: string | null }).msDoNotTrack,
  ];

  for (const value of candidates) {
    if (value === "1" || value === "yes") return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Composite gate
// ---------------------------------------------------------------------------

/**
 * Composite predicate covering the three R18.5 / R18.6 gates:
 * configured Plausible domain + granted consent + DNT off.
 *
 * Exposed as a public function so non-emission call sites (the
 * Plausible `<Script>` tag in `app/[locale]/layout.tsx`, the consent
 * banner UI deciding whether to highlight the "tracking active"
 * label) can reuse the same logic without re-implementing it.
 */
export function shouldEmitAnalytics(): boolean {
  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  if (typeof domain !== "string" || domain.length === 0) return false;
  if (currentStatus !== "granted") return false;
  if (isDntEnabled()) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Event emission
// ---------------------------------------------------------------------------

/**
 * Fire an analytics event through the Plausible global.
 *
 * No-op when any of:
 *   - {@link shouldEmitAnalytics} returns `false` (the common case
 *     before consent or in dev/preview environments without a
 *     configured Plausible domain),
 *   - the function runs on the server (no `window`),
 *   - the Plausible script has not yet attached its global (e.g. the
 *     event fires before the `<Script>` tag has loaded — Plausible's
 *     own queueing helper is intentionally not used here because we
 *     want every emission to be observable as a synchronous no-op
 *     when consent is missing).
 *
 * The Plausible API enforces primitive `props` values; the
 * `Record<string, string | number | boolean>` type makes that
 * contract checkable at compile time so the typed helpers in
 * `./events` cannot accidentally pass a nested object or `undefined`.
 *
 * Errors thrown by `window.plausible` are swallowed and logged so a
 * misconfigured analytics provider can never break the page. The
 * caller is fire-and-forget by design (R18.2: the WhatsApp click
 * handler must complete in 500ms regardless of analytics).
 *
 * @example
 * ```ts
 * import { trackEvent } from "@/lib/analytics/client";
 * trackEvent("page_view", { page_path: "/sewa-mobil/bogor", locale: "id" });
 * ```
 */
export function trackEvent(
  eventName: string,
  props?: Record<string, string | number | boolean>,
): void {
  if (!shouldEmitAnalytics()) return;
  if (typeof window === "undefined") return;
  if (typeof window.plausible !== "function") return;

  try {
    window.plausible(eventName, props ? { props } : undefined);
  } catch (err) {
    // Never let analytics break a rendering or interaction path.
    console.error("[analytics] trackEvent failed", err);
  }
}
