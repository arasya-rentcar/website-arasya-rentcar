// MDX allowlisted components registry (R23.3, design §4.4).
//
// This module is the single source of truth for which JSX tags MDX
// authors may use inside narrative content (cities, countries,
// vehicles, services, articles). The MDX compiler (task 4.5) reads
// `mdxAllowlist` to reject any JSX tag that is not a key of this map,
// which means the build fails fast per R23.3 when an unknown tag is
// referenced.
//
// IMPORTANT: the MDX-facing tag name is the KEY of this object, not
// the imported component name. Most components line up 1:1, but the
// MDX tag `<FAQ>` maps to the `Faq` component, so in authoring we
// write `<FAQ q="…" a="…" />` while the file is `Faq.tsx`. This is
// the explicit shape design §4.4 requires.

import { Callout } from "./Callout";
import { Faq } from "./Faq";
import { Landmark } from "./Landmark";
import { TripIdea } from "./TripIdea";
import { Tip } from "./Tip";
import { Testimonial } from "./Testimonial";
import { InternalLink } from "./InternalLink";
import { VehicleCard } from "./VehicleCard";

/**
 * The exact set of JSX tag names MDX authors may use. Keys are the
 * tag names as they appear in MDX source; values are the React
 * components they render to.
 */
export const mdxAllowlist = {
  Callout,
  FAQ: Faq,
  Landmark,
  TripIdea,
  Tip,
  Testimonial,
  InternalLink,
  VehicleCard,
} as const;

/**
 * Union of allowed MDX tag names (string keys of `mdxAllowlist`).
 * Consumed by the task 4.5 compiler's allowlist check.
 */
export type AllowedMdxComponent = keyof typeof mdxAllowlist;

// Named re-exports so individual components are still tree-shakeable
// for non-MDX consumers (e.g. template files that render a Testimonial
// outside an MDX body). Keep these in alphabetical order.
export { Callout } from "./Callout";
export { Faq } from "./Faq";
export { InternalLink } from "./InternalLink";
export { Landmark } from "./Landmark";
export { Testimonial } from "./Testimonial";
export { Tip } from "./Tip";
export { TripIdea } from "./TripIdea";
export { VehicleCard } from "./VehicleCard";

export type { CalloutProps, CalloutVariant } from "./Callout";
export type { FaqItem, FaqProps } from "./Faq";
export type { InternalLinkProps } from "./InternalLink";
export type { LandmarkProps } from "./Landmark";
export type { TestimonialProps } from "./Testimonial";
export type { TipProps } from "./Tip";
export type { TripIdeaProps } from "./TripIdea";
export type { VehicleCardLocale, VehicleCardProps } from "./VehicleCard";
