"use client";

/**
 * PageViewTracker (task 11.3, requirement R18.1).
 *
 * Fires a `page_view` analytics event on every successful page load —
 * the initial server-rendered hit and every subsequent client-side
 * navigation in the App Router.
 *
 * Why this lives in a Client Component
 * ------------------------------------
 * The Plausible script tag in `app/[locale]/layout.tsx` is loaded in
 * `manual` mode, which disables Plausible's built-in auto-pageview.
 * That gives the consent-aware `trackEvent` wrapper in
 * `lib/analytics/client.ts` a single, observable code path for every
 * `page_view` emission and prevents double-counting after consent
 * changes. With auto-pageview disabled we are responsible for firing
 * the event ourselves on each navigation.
 *
 * `usePathname()` from `next/navigation` re-renders this component
 * whenever the App Router transitions to a new pathname, including
 * SPA-style soft navigations triggered by `<Link>` clicks. Binding
 * the emission `useEffect` to `pathname` ensures the event fires
 * exactly once per landing path and once per subsequent transition.
 *
 * The component renders `null` — it has no DOM output. It is mounted
 * unconditionally inside the locale layout; if Plausible has not
 * loaded (no `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`, consent not granted, DNT
 * on), the underlying `trackEvent` is a no-op so this becomes free.
 *
 * Validates: Requirements R18.1.
 */

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import {
  trackPageView,
  type AnalyticsPageType,
} from "@/lib/analytics/events";
import type { Locale } from "@/lib/content";

export interface PageViewTrackerProps {
  /**
   * Active Locale for the surrounding layout. Forwarded into every
   * `page_view` event so dashboards can segment by audience without
   * re-deriving the locale from `page_path`.
   */
  readonly locale: Locale;
}

/**
 * Map a pathname to the page-type tag enumerated by R18.1.
 *
 * The taxonomy is intentionally narrow (see
 * {@link AnalyticsPageType}). Each route family maps to exactly one
 * tag so dashboards aggregate consistently across both locale
 * variants of the same logical page (e.g. `/sewa-mobil/bogor` and
 * `/en/car-rental/bogor` both tag as `city_page`).
 *
 * The function strips the optional `/en` locale prefix before
 * matching so the EN and ID slug families collapse to the same
 * comparison. Default fallback is `static_page`, matching the
 * R18.1 contract for unclassified routes.
 */
export function pageTypeFromPath(path: string): AnalyticsPageType {
  // Strip an `/en` locale prefix (the ID locale lives at the root).
  // We require a trailing `/` or end-of-string after `en` so that a
  // hypothetical path like `/encyclopedia` is not mis-stripped.
  const withoutLocale = path.replace(/^\/en(?=\/|$)/, "");
  const normalized = withoutLocale === "" ? "/" : withoutLocale;

  if (normalized === "/") return "homepage";

  if (normalized === "/blog") return "blog_index";
  if (normalized.startsWith("/blog/")) return "blog_article";

  if (normalized === "/booking" || normalized.startsWith("/booking/")) {
    return "booking_page";
  }

  if (
    normalized.startsWith("/sewa-mobil/") ||
    normalized.startsWith("/car-rental/")
  ) {
    if (normalized.endsWith("/airport-transfer")) {
      return "airport_transfer_page";
    }
    // Path layout under these roots is /{root}/{city}[/{vehicle}].
    // Three or more non-empty segments mean we are on a city-vehicle
    // detail page; the taxonomy has no dedicated bucket for the
    // combination, so we tag it as `vehicle_page` since the focus of
    // the page is the vehicle.
    const segments = normalized.split("/").filter(Boolean);
    if (segments.length >= 3) return "vehicle_page";
    return "city_page";
  }

  if (
    normalized.startsWith("/internasional/") ||
    normalized.startsWith("/international/")
  ) {
    return "country_page";
  }

  if (
    normalized === "/armada" ||
    normalized === "/fleet" ||
    normalized.startsWith("/armada/") ||
    normalized.startsWith("/fleet/")
  ) {
    return "vehicle_page";
  }

  if (
    normalized.startsWith("/layanan/") ||
    normalized.startsWith("/services/")
  ) {
    return "service_page";
  }

  // Static page surfaces — contact, FAQ, terms, privacy, and any
  // unclassified route. Both locale variants of each slug are
  // covered by the same fallthrough.
  return "static_page";
}

/**
 * `<PageViewTracker locale={locale} />` — mount once inside the
 * locale layout. Rendering `null` means the component never affects
 * layout flow; it exists purely for its `useEffect` side-effect.
 */
export default function PageViewTracker({
  locale,
}: PageViewTrackerProps): null {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof pathname !== "string" || pathname.length === 0) return;
    trackPageView({
      page_path: pathname,
      locale,
      page_type: pageTypeFromPath(pathname),
    });
  }, [pathname, locale]);

  return null;
}
