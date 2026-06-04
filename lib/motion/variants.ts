// Shared motion variants for the Arasya Rentcar website.
//
// Design references:
// - §19 (Accessibility & Performance): `components/motion/MotionWrapper.tsx`
//   uses the Motion library and its `useReducedMotion` hook to skip
//   entrance variants (R14.7).
// - §29.4 (Motion and interaction): package is `motion` (the former
//   `framer-motion` rebrand). Import types and components from `motion/react`.
//
// Requirements:
// - R14.6: animations are applied tastefully to hero entrances, section
//   reveals, and CTA emphasis, with each transition duration ≤ 400 ms.
// - R14.7: when the Visitor has `prefers-reduced-motion: reduce`, entrance,
//   reveal, and emphasis animations are suppressed (handled by the
//   `MotionWrapper` client component; the variants below are the
//   non-reduced targets).
//
// Keep this set intentionally small. Each variant uses a named state pair
// (`hidden` → `visible`) so consumers can wire them into a single
// `variants={…} initial="hidden" animate="visible"` call, and so parent
// `stagger` variants can propagate the active state to descendants.

import type { Variants } from "motion/react";

/**
 * Simple opacity fade-in.
 *
 * - Hidden: `opacity: 0`
 * - Visible: `opacity: 1`
 * - Duration: 240 ms, eased out (no overshoot, no translate).
 *
 * Use for subtle reveals where motion should be barely noticed
 * (e.g., trust badges, supporting paragraphs). Within R14.6's 400 ms cap.
 */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.24, ease: "easeOut" },
  },
};

/**
 * Fade-in combined with a 16 px upward translate.
 *
 * - Hidden: `opacity: 0, y: 16`
 * - Visible: `opacity: 1, y: 0`
 * - Duration: 320 ms, eased out.
 *
 * Primary hero-entrance and section-reveal variant per R14.6. The 16 px
 * offset is small enough that the browser absorbs it without layout
 * thrash (transform only — no height change), and 320 ms stays well under
 * the 400 ms ceiling.
 */
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.32, ease: "easeOut" },
  },
};

/**
 * Parent orchestrator that staggers child variants on entrance.
 *
 * - `staggerChildren: 0.06` — 60 ms gap between successive children.
 * - `delayChildren: 0.04` — tiny initial lead-in so the container itself
 *   commits to its final state before children animate.
 *
 * Pair with a child variant (typically {@link fadeInUp}) on each
 * animated descendant. The parent itself renders no visual transition;
 * it only propagates the `hidden` / `visible` state to children.
 */
export const stagger: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.04,
    },
  },
};
