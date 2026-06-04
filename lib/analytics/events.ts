"use client";

/**
 * Analytics_Layer typed event helpers (design §19, requirement R18).
 *
 * One thin wrapper per event defined in R18.1–R18.4. The wrappers
 * exist so call sites can be statically type-checked against the
 * required property set for each event — `BookingForm` cannot
 * accidentally fire `whatsapp_click` with the wrong props, and the
 * floating WhatsApp button cannot accidentally include the Visitor's
 * full booking payload (forbidden by R18.3, R19.8).
 *
 * Event-name strings are exported as a frozen const object so
 * downstream code (e.g. analytics dashboards, tests) can reference
 * them without re-typing the literal — and so the names stay stable
 * across deploys for historical comparability.
 *
 * R18.1 page_view           — properties: page_path, locale, page_type
 * R18.2 whatsapp_click      — properties: page_path, page_type, subject_slug | null, locale
 * R18.3 booking_form_submit — properties: pickup_city, preferred_vehicle, trip_type, locale
 * R18.4 booking_form_error  — properties: field_name, locale (one event per offending field)
 *
 * Property values are restricted to primitives in
 * {@link "@/lib/analytics/client".trackEvent} so we cannot leak
 * objects or `undefined` into the Plausible payload. The helpers
 * below normalise optional values to either the primitive expected
 * by the event spec or omit the key entirely.
 */

import type { Locale } from "@/lib/content";

import { trackEvent } from "./client";

// ---------------------------------------------------------------------------
// Event names
// ---------------------------------------------------------------------------

/**
 * Canonical analytics event names. Keep these stable across deploys
 * — Plausible aggregates by event name and renaming would split
 * historical series.
 */
export const ANALYTICS_EVENTS = {
  pageView: "page_view",
  whatsappClick: "whatsapp_click",
  bookingFormSubmit: "booking_form_submit",
  bookingFormError: "booking_form_error",
} as const;

/** Union of every event name this module can emit. */
export type AnalyticsEventName =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

// ---------------------------------------------------------------------------
// Page-type taxonomy (R18.1)
// ---------------------------------------------------------------------------

/**
 * The page-type taxonomy enumerated in R18.1. Every page in the app
 * resolves to exactly one of these values; the `PageViewTracker`
 * (task 11.3) maps the active route to the appropriate tag.
 */
export type AnalyticsPageType =
  | "homepage"
  | "city_page"
  | "country_page"
  | "vehicle_page"
  | "airport_transfer_page"
  | "service_page"
  | "blog_index"
  | "blog_article"
  | "booking_page"
  | "static_page";

// ---------------------------------------------------------------------------
// page_view (R18.1)
// ---------------------------------------------------------------------------

/**
 * Properties for the `page_view` event. The R18.1 contract excludes
 * any PII, so this shape is intentionally narrow: just the path, the
 * locale, and the page-type tag.
 */
export interface PageViewProps {
  readonly page_path: string;
  readonly locale: Locale;
  readonly page_type: AnalyticsPageType;
}

/** Emit a `page_view` event (R18.1). */
export function trackPageView(props: PageViewProps): void {
  trackEvent(ANALYTICS_EVENTS.pageView, {
    page_path: props.page_path,
    locale: props.locale,
    page_type: props.page_type,
  });
}

// ---------------------------------------------------------------------------
// whatsapp_click (R18.2)
// ---------------------------------------------------------------------------

/**
 * Properties for the `whatsapp_click` event.
 *
 * `subject_slug` is the slug of the entity the CTA is tied to (the
 * city slug on a City_Page, the vehicle slug on a Vehicle_Page, etc.)
 * and is `null` for non-entity surfaces such as the homepage or the
 * floating button on a static page. R18.2 explicitly allows `null`
 * here.
 */
export interface WhatsAppClickProps {
  readonly page_path: string;
  readonly page_type: AnalyticsPageType;
  readonly subject_slug: string | null;
  readonly locale: Locale;
}

/**
 * Emit a `whatsapp_click` event (R18.2).
 *
 * `subject_slug` is normalised to the string `"none"` when null
 * because Plausible's `props` only accepts primitive non-null values
 * — the `null` semantics are preserved by the explicit sentinel
 * string so dashboards can group "no entity context" clicks
 * together.
 */
export function trackWhatsAppClick(props: WhatsAppClickProps): void {
  trackEvent(ANALYTICS_EVENTS.whatsappClick, {
    page_path: props.page_path,
    page_type: props.page_type,
    subject_slug: props.subject_slug ?? "none",
    locale: props.locale,
  });
}

// ---------------------------------------------------------------------------
// booking_form_submit (R18.3)
// ---------------------------------------------------------------------------

/**
 * Properties for the `booking_form_submit` event.
 *
 * R18.3 forbids name, WhatsApp number, notes, pickup location, and
 * destination — only the listed structured fields are allowed. The
 * type below names exactly those fields and nothing more, so a
 * `BookingForm` author cannot accidentally pass the wrong shape.
 */
export interface BookingFormSubmitProps {
  readonly locale: Locale;
  readonly trip_type: string;
  readonly pickup_city: string;
  readonly preferred_vehicle: string | null;
}

/** Emit a `booking_form_submit` event (R18.3). */
export function trackBookingFormSubmit(props: BookingFormSubmitProps): void {
  trackEvent(ANALYTICS_EVENTS.bookingFormSubmit, {
    locale: props.locale,
    trip_type: props.trip_type,
    pickup_city: props.pickup_city,
    // Plausible disallows null; preserve the "no preference" state as
    // a sentinel so the dashboard can still segment by it.
    preferred_vehicle: props.preferred_vehicle ?? "none",
  });
}

// ---------------------------------------------------------------------------
// booking_form_error (R18.4)
// ---------------------------------------------------------------------------

/**
 * Properties for the `booking_form_error` event. R18.4 emits one
 * event per offending field; the rejected input value MUST NOT be
 * included.
 */
export interface BookingFormErrorProps {
  readonly locale: Locale;
  readonly field_name: string;
}

/** Emit a `booking_form_error` event (R18.4). One per offending field. */
export function trackBookingFormError(props: BookingFormErrorProps): void {
  trackEvent(ANALYTICS_EVENTS.bookingFormError, {
    locale: props.locale,
    field_name: props.field_name,
  });
}
