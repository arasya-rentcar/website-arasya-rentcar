'use client';

import { useEffect } from 'react';

/**
 * One delegated click listener for every `[data-cta]` element on the page,
 * pushing to the GTM dataLayer. Per the handoff: `cta_click` and `quote_submit`
 * are imported as Google Ads conversions.
 *
 * Delegation rather than per-element handlers is deliberate — CTAs are server
 * components, and attaching handlers to each would drag the whole page into the
 * client bundle for the sake of analytics.
 *
 * `dataLayer` is pushed unconditionally; without a GTM container the array just
 * accumulates harmlessly, so the container can be added later without a code
 * change.
 */
declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

export function AnalyticsBridge() {
  useEffect(() => {
    function onClick(ev: MouseEvent) {
      const target = ev.target as HTMLElement | null;
      const el = target?.closest<HTMLElement>('[data-cta]');
      if (!el) return;
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: 'cta_click',
        cta: el.dataset.cta,
        city: el.dataset.city,
        unit: el.dataset.unit,
        route: el.dataset.route,
      });
    }
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  return null;
}

/** Fired by QuoteForm's onSubmit — the second Ads conversion. */
export function pushQuoteSubmit(payload: { refCode: string; cityName: string }) {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: 'quote_submit',
    ref_code: payload.refCode,
    city: payload.cityName,
  });
}

/** Fired the first time a user interacts with the quote form. */
export function pushFormStart(cityName: string) {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: 'quote_form_start', city: cityName });
}
