"use client";

import dynamic from "next/dynamic";

/**
 * Client-only lazy-loaded chat widget wrapper (R16.9).
 *
 * Wraps `ThirdPartyChatWidget` in `next/dynamic` with `ssr: false` so
 * the widget script tag injection happens only on the client and only
 * after the initial page paint. This keeps the homepage's First Load
 * JS budget (R16.8) well below the 170 KB ceiling — without the dynamic
 * import the widget's third-party script bundle would be eagerly
 * fetched even for visitors who haven't given consent.
 *
 * The wrapper itself is a tiny client component that resolves to the
 * dynamic-imported `ThirdPartyChatWidget` on hydration. Pass through
 * the `consentGiven` prop unchanged.
 *
 * ## Below-fold templates note
 *
 * R16.9 also calls for code-splitting below-fold sections in
 * `HomeTemplate`, `CityTemplate`, and `VehicleTemplate` (testimonials,
 * related cities, related articles). Those sections are currently
 * implemented as pure Server Components that ship zero client JS, so
 * wrapping them in `next/dynamic` would add overhead without a bundle
 * win. They remain plain server-rendered children. If any of those
 * sections later gains a client-only hook (e.g. a carousel, a video
 * player), it should be migrated to a `next/dynamic` wrapper alongside
 * this one.
 *
 * ## Mount target
 *
 * This component is the future mount target for the consent-gated chat
 * widget integration — see the TODO in `app/[locale]/layout.tsx` and
 * task 11.2 for the cookie-consent context that gates `consentGiven`.
 */
const ThirdPartyChatWidget = dynamic(
  () => import("@/components/chat/ThirdPartyChatWidget"),
  { ssr: false },
);

export interface LazyChatWidgetProps {
  readonly consentGiven?: boolean;
}

export default function LazyChatWidget(
  props: LazyChatWidgetProps,
): React.JSX.Element {
  return <ThirdPartyChatWidget consentGiven={props.consentGiven ?? false} />;
}
