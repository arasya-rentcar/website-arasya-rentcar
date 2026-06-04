import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import Script from "next/script";

import PageViewTracker from "@/components/analytics/PageViewTracker";
import WhatsAppClickTracker from "@/components/analytics/WhatsAppClickTracker";
import WhatsAppButton from "@/components/chat/WhatsAppButton";
import CookieConsentBanner from "@/components/consent/CookieConsentBanner";
import Footer from "@/components/nav/Footer";
import PrimaryNav from "@/components/nav/PrimaryNav";
import { Toaster } from "@/components/ui/sonner";
import {
  SUPPORTED_LOCALES,
  getDictionary,
  isLocale,
} from "@/lib/i18n/getDictionary";

/**
 * Locale-aware layout for `app/[locale]/*` (task 7.1).
 *
 * Renders the chrome that every locale-scoped page shares:
 *
 *   1. The skip-to-content link, which R15.5 mandates be the FIRST
 *      focusable element on every page. It is visually hidden with
 *      Tailwind's `sr-only` utility and flips to a visible, focus-ring-
 *      highlighted pill on keyboard focus via the `focus:not-sr-only`
 *      variant. Activating it jumps focus to `#main`, the id we set
 *      on the `<main>` landmark below.
 *   2. The site chrome — `PrimaryNav` (task 7.3), `Footer` (task 7.3),
 *      `WhatsAppButton` (task 9.1), and the `CookieConsentBanner`
 *      (task 11.2). Each lives in its own component file; the layout
 *      only orchestrates their order so the Tab traversal goes
 *      skip-link → nav → main → floating widgets → footer.
 *   3. The `<main id="main">` landmark that receives focus when the
 *      skip link is activated (R15.5) and that AXE/a11y tests assert
 *      exists exactly once per page.
 *   4. The Sonner `<Toaster />` mount (originally added in task 2.5)
 *      kept inside the locale subtree so toast copy can eventually be
 *      wired through the same dictionary as the rest of the UI.
 *
 * Locale handling
 * ---------------
 * The incoming `params.locale` is validated with `isLocale` and any
 * non-supported value triggers `notFound()` per R4.9. The `<html lang>`
 * attribute itself is set in `app/layout.tsx` — the root layout reads
 * the `x-locale` header written by `middleware.ts` because Next's
 * App Router only permits one root layout and nested layouts cannot
 * re-render `<html>`. This split keeps R4.8 (html lang matches active
 * Locale) satisfied without requiring the root layout to be a
 * pass-through, which the framework rejects.
 *
 * `generateStaticParams` and `dynamicParams = false` together pin
 * the allowed locale segments to the two values declared in
 * `SUPPORTED_LOCALES`. Any other segment is 404'd without ever
 * running this layout (R4.9).
 */

/**
 * R4.9: reject every locale segment that is not in `SUPPORTED_LOCALES`.
 * Combined with `generateStaticParams` below, this prevents Next.js
 * from lazily rendering arbitrary locale values (e.g. `/fr/...`).
 */
export const dynamicParams = false;

/**
 * Pre-generate the two supported locale segments at build time so
 * `/` (id) and `/en` render as static HTML from the CDN.
 */
export function generateStaticParams(): { locale: string }[] {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const dict = await getDictionary(locale);

  return (
    <>
      {/*
       * R15.5 — Skip-to-content link.
       *
       * First focusable element in the locale subtree. Hidden with
       * `sr-only` until it receives focus, at which point
       * `focus:not-sr-only` lifts it into a fixed, keyboard-visible
       * pill in the top-left corner. Clicking (or pressing Enter)
       * jumps focus to the `<main id="main">` landmark below.
       */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-[var(--primary)] focus:px-4 focus:py-2 focus:text-[var(--primary-foreground)] focus:shadow-md focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2"
      >
        {dict.meta.skipLinkLabel}
      </a>

      {/*
       * Global primary navigation (task 7.3, R3.8). Mounts after the
       * skip-to-content link and before <main> so the Tab order remains
       * skip-link → nav → main. LocaleSwitcher (task 7.4) mounts inside
       * PrimaryNav itself.
       */}
      <PrimaryNav locale={locale} dict={dict.nav} />

      <main id="main" className="min-h-screen">
        {children}
      </main>

      {/*
       * Floating WhatsApp button (task 9.1, R11.7/R13.1/R13.2/R13.3).
       * Mounted inside the locale subtree so it appears on every page
       * with the correct Locale-aware tooltip and aria-label. Pages
       * that need to suppress it (e.g. the booking confirmation
       * screen) can do so by overriding the layout or by hiding it
       * via a route-specific wrapper.
       */}
      <WhatsAppButton
        locale={locale}
        dict={{ common: dict.common, meta: dict.meta }}
      />

      {/*
       * Global site footer (task 7.3, R3.9, R13.5). Provides the
       * FAQ/Terms/Privacy links, the official admin WhatsApp number in
       * `+62 xxx-xxxx-xxxx` format, and the anti-fraud notice.
       */}
      <Footer locale={locale} dict={dict.footer} />

      {/*
       * Cookie consent banner (task 11.2, R18.5, R18.6). Mounted
       * inside the locale subtree so its copy can render in the
       * active Locale. The banner is `position: fixed` and renders
       * `null` until its `useEffect` decides whether to display, so
       * placing it after `<Footer />` is intentional — there is no
       * layout-flow consequence to its mount order, and keeping it
       * near the other client-side widgets (`WhatsAppButton`,
       * `Toaster`) makes the chrome easy to audit.
       */}
      <CookieConsentBanner locale={locale} />

      {/*
       * Plausible analytics script (task 11.3, R18.1).
       *
       * Loaded only when `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` is set —
       * dev/preview deployments without a configured domain skip
       * the script entirely (R18.5: "only essential scripts run
       * before consent"; absence of a configured domain is also
       * "essentially none").
       *
       * The `script.manual.js` variant disables Plausible's built-in
       * auto-pageview, leaving `<PageViewTracker>` below as the
       * single source of `page_view` events. That keeps the
       * consent gate in `lib/analytics/client.ts trackEvent` as the
       * one observable boundary for emission and prevents
       * double-counting on consent changes.
       *
       * `strategy="afterInteractive"` defers loading until the page
       * is interactive; the consent gate inside `trackEvent` will
       * also drop any events that fire before the script attaches
       * its `window.plausible` global.
       */}
      {process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN ? (
        <Script
          src="https://plausible.io/js/script.manual.js"
          data-domain={process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN}
          strategy="afterInteractive"
        />
      ) : null}

      {/*
       * Page-view tracker (task 11.3, R18.1). Mounted unconditionally
       * — it is a no-op when the Plausible script is not loaded or
       * when consent has not been granted. The component listens to
       * `usePathname()` so it fires on the initial render and on
       * every App Router soft navigation.
       */}
      <PageViewTracker locale={locale} />

      {/*
       * WhatsApp-click tracker (task 11.4, R11.11/R18.2). Installs a
       * single capture-phase document click listener that fires the
       * `whatsapp_click` analytics event whenever any anchor flagged
       * with `data-analytics-event="whatsapp_click"` is clicked —
       * the floating WhatsApp button, every CTA band, and every
       * inline hero CTA share that attribute, so this single mount
       * covers them all. Like `<PageViewTracker>` it is a no-op
       * pre-consent and renders `null`.
       */}
      <WhatsAppClickTracker locale={locale} />

      <Toaster position="top-right" richColors closeButton />
    </>
  );
}
