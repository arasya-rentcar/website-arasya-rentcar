"use client";

/**
 * Locale-aware cookie consent banner (task 11.2, R18.5, R18.6).
 *
 * Renders a fixed bottom-of-viewport banner asking the visitor for
 * permission to load non-essential analytics. The user's choice is
 * persisted in `localStorage` via {@link writeConsent} so the banner
 * does not reappear on subsequent visits within the year.
 *
 * Behavior matrix:
 *
 * | Initial state                     | Banner shown? | Persisted state    |
 * |-----------------------------------|---------------|--------------------|
 * | First visit, DNT off, no record   | yes           | unchanged          |
 * | First visit, DNT on               | no            | denied (auto)      |
 * | Returning, record < 1 year old    | no            | unchanged          |
 * | Returning, record ≥ 1 year old    | yes           | unchanged          |
 * | User clicks Accept                | hides         | granted, now()     |
 * | User clicks Decline               | hides         | denied,  now()     |
 *
 * R18.5 — DNT auto-decline. When `navigator.doNotTrack === "1"` we
 * never show the banner; we record `"denied"` once so the analytics
 * client (task 11.1) sees the explicit refusal on every subsequent
 * navigation. This is "treat DNT as explicit denial" — the banner
 * does not need to be visible to record that denial.
 *
 * R18.6 — Re-show after 1 year. The persistence helper
 * ({@link shouldShowBanner}) reports `true` whenever the stored
 * record's timestamp is older than {@link ONE_YEAR_MS}. We honor
 * that by mounting the banner again on the next page load.
 *
 * Hydration: the banner renders `null` on the server and on the
 * very first client render so the server HTML and the first client
 * paint match (no `useEffect`-driven flash of the banner before we
 * have a chance to read `localStorage`/DNT). After hydration
 * `useSyncExternalStore` re-evaluates {@link getBannerSnapshot}
 * against the live browser state and the banner appears (or stays
 * hidden) accordingly. Subsequent Accept/Decline clicks update the
 * persisted record, which re-fires the snapshot and closes the
 * banner without any local React state.
 *
 * Accessibility:
 *   - Wrapped in `role="region"` with `aria-label` so screen readers
 *     announce the consent prompt as a discrete landmark.
 *   - Buttons use the project's shadcn `Button` so they inherit the
 *     focus ring + 44×44 tap target conventions.
 *
 * Locale: copy is rendered inline rather than via the dictionary
 * because the consent banner's strings are tightly coupled to legal
 * positioning and we want them to live next to the component that
 * displays them (R18.5/R18.6 review trail). When the dictionary
 * gains a `consent` namespace this can be migrated; for now the
 * component receives the active {@link Locale} and switches between
 * Bahasa Indonesia and English.
 *
 * Design: §19 (Client Components list), §27 (privacy/legal copy).
 */

import { useEffect, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { isDntEnabled } from "@/lib/analytics/client";
import {
  applyPersistedConsent,
  shouldShowBanner,
  subscribeSameTabConsent,
  writeConsent,
} from "@/lib/analytics/consentStore";
import type { Locale } from "@/lib/content";

export interface CookieConsentBannerProps {
  /** Active Locale, used to render banner copy in the visitor's language. */
  readonly locale: Locale;
}

/**
 * Subscribe to anything that changes the persisted consent record.
 *
 * `useSyncExternalStore` requires a `subscribe` callback — this one
 * fans the snapshot-recompute trigger across two channels:
 *
 *   1. Cross-tab via the browser's `storage` event, so a write in
 *      another window of the same site (e.g. user clicked Accept on
 *      another tab) closes the banner here.
 *   2. Same-tab via {@link subscribeSameTabConsent}, so an Accept /
 *      Decline click in *this* tab also re-reads the snapshot — the
 *      DOM `storage` event does NOT fire for same-tab writes.
 *
 * Returns a cleanup function that detaches both subscriptions.
 */
function subscribeToConsentChanges(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const storageHandler = (event: StorageEvent): void => {
    // `event.key === null` happens on `localStorage.clear()`. We
    // treat that as a relevant change too so a cleared store re-shows
    // the banner.
    if (event.key === null || event.key === "arasya:consent:v1") {
      callback();
    }
  };
  window.addEventListener("storage", storageHandler);
  const unsubscribeSameTab = subscribeSameTabConsent(callback);
  return () => {
    window.removeEventListener("storage", storageHandler);
    unsubscribeSameTab();
  };
}

/**
 * Compute the banner visibility from the current browser state. Used
 * as the `getSnapshot` for {@link useSyncExternalStore}. Returns:
 *
 *   - `false` when DoNotTrack is on (R18.5 — never show the banner)
 *   - `false` when there is a fresh persisted record (R18.6)
 *   - `true`  when there is no record or the record has aged past 1y
 */
function getBannerSnapshot(): boolean {
  if (isDntEnabled()) return false;
  return shouldShowBanner();
}

/**
 * Server-rendered snapshot. The server has no access to localStorage
 * or `navigator.doNotTrack`, so we conservatively render `false`. The
 * client snapshot then takes over after hydration. This matches the
 * server HTML to the first client paint and avoids a banner flash.
 */
function getBannerServerSnapshot(): boolean {
  return false;
}

/**
 * Cookie consent banner. Shown only when the visitor has neither
 * accepted nor declined recently and DoNotTrack is off.
 *
 * @param locale Active Locale, used to render banner copy.
 *
 * Validates requirements: R18.5, R18.6.
 */
export default function CookieConsentBanner({
  locale,
}: CookieConsentBannerProps): React.JSX.Element | null {
  // R19's idiomatic way to render based on external (browser-only)
  // state without tripping the `react-hooks/set-state-in-effect`
  // rule. `subscribeToConsentChanges` listens for cross-tab consent
  // mutations and re-runs `getBannerSnapshot` on each event so the
  // banner stays in sync if the user clicks Accept on another tab.
  const show = useSyncExternalStore(
    subscribeToConsentChanges,
    getBannerSnapshot,
    getBannerServerSnapshot,
  );

  useEffect(() => {
    // Side effects on mount that do NOT mutate React state:
    //   1. Rehydrate the in-memory analytics consent state from
    //      localStorage so any other module that reads
    //      `getConsentStatus` sees the user's prior decision.
    //   2. R18.5 DNT auto-decline. If `navigator.doNotTrack` is on
    //      we persist a `denied` record so task 11.1's analytics
    //      client never thinks about loading a script for this
    //      visitor. The persistence call below also fires the
    //      `storage` event in other tabs; in *this* tab the snapshot
    //      reads `false` directly via `isDntEnabled()` so no extra
    //      re-render is needed here.
    applyPersistedConsent();
    if (isDntEnabled()) {
      writeConsent("denied");
    }
  }, []);

  if (!show) return null;

  const isId = locale === "id";

  const title = isId ? "Cookie & Analitik" : "Cookies & Analytics";
  const description = isId
    ? "Kami menggunakan analitik privat (tanpa cookie pelacak) untuk meningkatkan layanan kami. Tidak ada data pribadi yang disimpan."
    : "We use privacy-friendly analytics (no tracking cookies) to improve our service. No personal data is stored.";
  const acceptLabel = isId ? "Terima" : "Accept";
  const declineLabel = isId ? "Tolak" : "Decline";

  // Accept/Decline simply persist the decision. `writeConsent` then
  // notifies same-tab subscribers (see `subscribeSameTabConsent`) so
  // `useSyncExternalStore` re-reads `getBannerSnapshot`, observes
  // that a fresh record exists, and the banner closes. There is no
  // local component state to mutate — the banner's visibility is
  // entirely a function of the persisted record + the DNT signal.
  const handleAccept = (): void => {
    writeConsent("granted");
  };

  const handleDecline = (): void => {
    writeConsent("denied");
  };

  return (
    <div
      role="region"
      aria-label={title}
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--border)] bg-[var(--background)] px-4 py-4 shadow-lg sm:px-6"
    >
      <div className="container mx-auto flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex-1">
          <p className="font-semibold text-[var(--foreground)]">{title}</p>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {description}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={handleDecline} variant="outline" size="default">
            {declineLabel}
          </Button>
          <Button onClick={handleAccept} size="default">
            {acceptLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
