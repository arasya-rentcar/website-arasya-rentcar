"use client";

// Shared motion primitive for hero entrances, section reveals, and CTA
// emphasis per Design §19 and §29.4. The `motion` package (formerly
// `framer-motion`, per §29.4) is imported from `motion/react`.
//
// Requirements:
// - R14.6: animations stay tasteful and short. This wrapper is a dumb
//   pass-through for variants, transitions, and gesture props; it does
//   not introduce any animation on its own. Durations live on the
//   consumer-provided variants (see `lib/motion/variants.ts`) and the
//   design rules cap them at 400 ms.
// - R14.7: when the Visitor has `prefers-reduced-motion: reduce`,
//   entrance/reveal/emphasis animations are suppressed and the target
//   end state renders without transition. This is implemented by
//   reading `useReducedMotion()` and rendering a plain HTML element
//   with all motion-only props stripped.

import * as React from "react";
import {
  motion,
  useReducedMotion,
  type HTMLMotionProps,
} from "motion/react";

/**
 * Element tags the {@link MotionWrapper} can render. Limited to the
 * block-level containers used for hero entrances, section reveals, and
 * CTA emphasis (R14.6).
 */
export type MotionWrapperTag = "div" | "section" | "article";

/**
 * Props for {@link MotionWrapper}, parameterised by the rendered tag.
 *
 * Accepts every `HTMLMotionProps<T>` (`variants`, `initial`, `animate`,
 * `exit`, `transition`, `while*` gesture props, and the standard HTML
 * attributes for the tag), plus the wrapper-specific `as` selector.
 */
export type MotionWrapperProps<T extends MotionWrapperTag = "div"> =
  HTMLMotionProps<T> & {
    /** Element tag to render. Defaults to `"div"`. */
    as?: T;
  };

// Concrete `motion.*` component lookup keyed by tag name. Kept as a
// `const` so the `as` value narrows to the correct component at runtime.
const MOTION_COMPONENTS = {
  div: motion.div,
  section: motion.section,
  article: motion.article,
} as const satisfies Record<MotionWrapperTag, React.ElementType>;

// Prop names owned by the Motion library. When `prefers-reduced-motion`
// is active we render a plain DOM element; these names are stripped so
// they never reach the browser. The list intentionally covers the full
// Motion v12 surface rather than just the props we use today, so future
// consumers don't accidentally leak motion props onto the DOM.
const MOTION_ONLY_PROP_NAMES: ReadonlySet<string> = new Set([
  "animate",
  "custom",
  "drag",
  "dragConstraints",
  "dragControls",
  "dragDirectionLock",
  "dragElastic",
  "dragListener",
  "dragMomentum",
  "dragPropagation",
  "dragSnapToOrigin",
  "dragTransition",
  "exit",
  "inherit",
  "initial",
  "layout",
  "layoutDependency",
  "layoutId",
  "layoutRoot",
  "layoutScroll",
  "onAnimationComplete",
  "onAnimationStart",
  "onDirectionLock",
  "onDrag",
  "onDragEnd",
  "onDragStart",
  "onDragTransitionEnd",
  "onHoverEnd",
  "onHoverStart",
  "onLayoutAnimationComplete",
  "onLayoutAnimationStart",
  "onPan",
  "onPanEnd",
  "onPanStart",
  "onTap",
  "onTapCancel",
  "onTapStart",
  "onUpdate",
  "onViewportEnter",
  "onViewportLeave",
  "transformTemplate",
  "transition",
  "variants",
  "viewport",
  "whileDrag",
  "whileFocus",
  "whileHover",
  "whileInView",
  "whileTap",
]);

/**
 * Thin wrapper around `motion.div` / `motion.section` / `motion.article`
 * that honours `prefers-reduced-motion`.
 *
 * - Use from any Client Component boundary. Pair with variants from
 *   `lib/motion/variants.ts` (`fadeIn`, `fadeInUp`, `stagger`).
 * - When the Visitor has `prefers-reduced-motion: reduce`, the wrapper
 *   renders a plain HTML element with all motion-only props stripped,
 *   satisfying R14.7 (no entrance/reveal/emphasis animation).
 * - Otherwise it forwards every prop unchanged to the matching
 *   `motion.*` component.
 *
 * Requirements: R14.6, R14.7. Design: §19, §29.4.
 */
export function MotionWrapper<T extends MotionWrapperTag = "div">(
  props: MotionWrapperProps<T>,
): React.ReactElement {
  const { as, children, ...rest } = props;
  const tag: MotionWrapperTag = (as ?? "div") as MotionWrapperTag;
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    // R14.7: render the final visual state with no motion props.
    const domProps: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(
      rest as Record<string, unknown>,
    )) {
      if (!MOTION_ONLY_PROP_NAMES.has(key)) {
        domProps[key] = value;
      }
    }
    // `HTMLMotionProps<T>["children"]` permits `MotionValue`s; in the
    // reduced-motion branch we target a plain DOM element, so narrow to
    // `ReactNode` for the host element signature.
    return React.createElement(
      tag,
      domProps,
      children as React.ReactNode,
    );
  }

  // TypeScript narrows `MOTION_COMPONENTS[tag]` to a union of three motion
  // component types. Each accepts a structurally identical shape for the
  // animation props, so we reconcile the spread with a single assertion
  // bound to the shared `HTMLMotionProps<"div">` form.
  const Component = MOTION_COMPONENTS[tag] as React.ComponentType<
    HTMLMotionProps<"div">
  >;
  return (
    <Component {...(rest as HTMLMotionProps<"div">)}>{children}</Component>
  );
}

export default MotionWrapper;
