"use client";

/**
 * WhatsAppClickTracker (task 11.4, requirements R11.11 and R18.2).
 *
 * Fires a `whatsapp_click` analytics event whenever a Visitor
 * interacts with any WhatsApp CTA on the site, so the Analytics_Layer
 * can attribute conversions to the surface that produced them
 * (e.g. `floating_button`, `cta_band`, `city_hero`, …).
 *
 * Strategy: delegated document-level click listener
 * --------------------------------------------------
 * Every WhatsApp CTA in the codebase carries the data-attributes
 * `data-analytics-event="whatsapp_click"` and a stable
 * `data-analytics-source="<surface>"` tag. Rather than refactor every
 * CTA (some of which are Server Components and cannot own React
 * `onClick` handlers directly without becoming Client Components),
 * we install a single capture-phase click listener on `document`
 * that walks the event target's ancestor chain looking for an
 * element with `data-analytics-event="whatsapp_click"`. When found,
 * we read the surface tag and emit `whatsapp_click` with the
 * properties mandated by R18.2 — `page_path`, `page_type`,
 * `subject_slug` (or null), and `locale`.
 *
 * The listener is a pure observer:
 *   • Never calls `preventDefault` or `stopPropagation` — the
 *     anchor's normal `wa.me` navigation must continue unaffected.
 *   • Never throws — any analytics failure is swallowed and logged so
 *     a misconfigured client cannot break the click path.
 *   • Fires regardless of whether the WhatsApp window actually opens
 *     (R11.11 explicitly requires this).
 *
 * Mount once inside `app/[locale]/layout.tsx` alongside
 * `<PageViewTracker />`; rendering `null` means the component never
 * affects layout flow.
 *
 * Validates: Requirements R11.11, R18.2.
 */

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { pageTypeFromPath } from "@/components/analytics/PageViewTracker";
import { trackWhatsAppClick } from "@/lib/analytics/events";
import type { Locale } from "@/lib/content";

export interface WhatsAppClickTrackerProps {
  /**
   * Active Locale for the surrounding layout. Forwarded into every
   * `whatsapp_click` event so dashboards can segment by audience
   * without re-deriving the locale from `page_path`.
   */
  readonly locale: Locale;
}

/**
 * Extract the subject slug from the active pathname for the
 * `whatsapp_click` event (R18.2 / R11.11).
 *
 * The slug is the entity the page is scoped to:
 *   - `/sewa-mobil/{city}` / `/car-rental/{city}` → `{city}`
 *   - `/sewa-mobil/{city}/airport-transfer`      → `{city}`
 *   - `/sewa-mobil/{city}/{vehicle}`             → `{city}` (the
 *       parent surface; the vehicle is conveyed by the surface tag,
 *       not the subject slug)
 *   - `/internasional/{country}` / `/international/{country}` →
 *       `{country}`
 *   - `/armada/{vehicle}` / `/fleet/{vehicle}`   → `{vehicle}`
 *   - `/layanan/{service}` / `/services/{service}` → `{service}`
 *   - `/blog/{article}`                          → `{article}`
 *
 * Returns `null` for non-entity surfaces (homepage, blog index,
 * booking page, contact, FAQ, terms, privacy, vehicle/fleet index)
 * — the tracker preserves the `null` semantics by handing it to
 * `trackWhatsAppClick`, which normalises it to the sentinel string
 * `"none"` for Plausible's primitive-only `props` contract.
 *
 * The function strips the optional `/en` locale prefix before
 * matching so the EN and ID slug families collapse to the same
 * comparison; the lookahead avoids mis-stripping a path like
 * `/encyclopedia`.
 */
export function subjectSlugFromPath(path: string): string | null {
  const withoutLocale = path.replace(/^\/en(?=\/|$)/, "");
  const normalized = withoutLocale === "" ? "/" : withoutLocale;
  const segments = normalized.split("/").filter(Boolean);
  const root = segments[0];
  const second = segments[1];

  if (typeof root !== "string" || typeof second !== "string") return null;

  if (root === "sewa-mobil" || root === "car-rental") return second;
  if (root === "internasional" || root === "international") return second;
  if (root === "armada" || root === "fleet") return second;
  if (root === "layanan" || root === "services") return second;
  if (root === "blog") return second;

  return null;
}

/**
 * `<WhatsAppClickTracker locale={locale} />` — mount once inside the
 * locale layout. The component renders `null` and exists purely for
 * the side-effect of its capture-phase document click listener.
 */
export default function WhatsAppClickTracker({
  locale,
}: WhatsAppClickTrackerProps): null {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof document === "undefined") return;

    const onClick = (event: MouseEvent): void => {
      // Walk up from the event target to find an element flagged
      // with `data-analytics-event="whatsapp_click"`. The CTA is
      // typically an `<a>`, but the click target may be a nested
      // child (an `<svg>` icon inside the anchor, for instance), so
      // we traverse the ancestor chain rather than checking
      // `event.target` alone.
      let node: Element | null =
        event.target instanceof Element ? event.target : null;
      while (node !== null) {
        if (node.getAttribute("data-analytics-event") === "whatsapp_click") {
          // The page_path is whatever Next's router currently
          // resolves to; usePathname is reactive across SPA
          // navigations so this stays in sync without a manual
          // re-bind.
          const currentPath =
            typeof pathname === "string" && pathname.length > 0
              ? pathname
              : "/";
          try {
            trackWhatsAppClick({
              page_path: currentPath,
              page_type: pageTypeFromPath(currentPath),
              subject_slug: subjectSlugFromPath(currentPath),
              locale,
            });
          } catch (err) {
            // Never let analytics break the click path. R11.11 is
            // explicit that the event fires regardless of the
            // WhatsApp window opening; we equally protect the
            // WhatsApp navigation from any analytics failure.
            console.error(
              "[whatsappClickTracker] trackWhatsAppClick failed",
              err,
            );
          }
          // We're an observer, not a gatekeeper — never
          // preventDefault or stopPropagation. The normal `wa.me`
          // navigation must continue.
          return;
        }
        node = node.parentElement;
      }
    };

    // Use the capture phase so we still fire even if a nested click
    // handler in user code calls `stopPropagation()` on the bubble
    // phase. The listener never preventDefault/stopPropagation
    // itself, so capture-phase use is purely defensive.
    document.addEventListener("click", onClick, { capture: true });
    return () => {
      document.removeEventListener("click", onClick, { capture: true });
    };
  }, [pathname, locale]);

  return null;
}
