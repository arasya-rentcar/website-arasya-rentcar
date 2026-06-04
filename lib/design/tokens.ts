/**
 * Arasya Rentcar — Design Tokens (TypeScript mirror)
 *
 * Source of truth: `app/globals.css`'s `@theme` block. Components should
 * consume tokens via Tailwind utilities generated from that block
 * (`bg-primary-500`, `text-h1`, `rounded-pill`, etc.).
 *
 * This TypeScript module exists for consumers that cannot read CSS
 * variables at build/SSR time:
 *   - JSON-LD `themeColor` for metadata (task 6.5)
 *   - OG image generator that paints canvas/SVG (task 6.11)
 *   - Chart components that compute fills/strokes programmatically
 *   - Any future canvas / server-rendered image pipeline
 *
 * KEEP IN SYNC with `app/globals.css`. If you change a value here without
 * changing the @theme block (or vice versa) the two sources will drift.
 *
 * Values are satisfied against Requirement 14:
 *   - R14.1: primary + accent + neutral (11 shades) + dark text + success
 *   - R14.3: ≥6 type-scale sizes with paired line-height + letter-spacing
 *   - R14.4: spacing, radius, shadow, elevation scales
 */

export const colors = {
  primary: {
    50: "#f0f5fb",
    100: "#dbe8f4",
    200: "#b7d0e9",
    300: "#8ab2d7",
    400: "#5c8fc1",
    500: "#2f6da9",
    600: "#214f86",
    700: "#193f6a",
    800: "#132f51",
    900: "#0d2039",
    950: "#071425",
  },
  accent: {
    50: "#fef8e7",
    100: "#fdecb9",
    200: "#fcd77a",
    300: "#f5bc3b",
    400: "#e0a11e",
    500: "#b8810d",
    600: "#94660a",
    700: "#704c07",
    800: "#4f3606",
    900: "#332203",
    950: "#1b1201",
  },
  neutral: {
    50: "#fafaf9",
    100: "#f5f5f4",
    200: "#e7e5e4",
    300: "#d6d3d1",
    400: "#a8a29e",
    500: "#78716c",
    600: "#57534e",
    700: "#44403c",
    800: "#292524",
    900: "#1c1917",
    950: "#0c0a09",
  },
  success: {
    50: "#f0fdf4",
    500: "#16a34a",
    700: "#15803d",
  },
  danger: {
    50: "#fef2f2",
    500: "#dc2626",
    700: "#b91c1c",
  },
  warning: {
    50: "#fffbeb",
    500: "#d97706",
    700: "#92400e",
  },
  role: {
    text: "#1c1917",
    textMuted: "#57534e",
    background: "#ffffff",
    surface: "#fafaf9",
  },
} as const;

export type Colors = typeof colors;

export const spacing = {
  sectionY: "5rem",
} as const;

export type Spacing = typeof spacing;

export const radius = {
  sm: "0.25rem",
  md: "0.5rem",
  lg: "1rem",
  "2xl": "1.5rem",
  pill: "9999px",
} as const;

export type Radius = typeof radius;

export const shadow = {
  sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  elevated: "0 25px 50px -12px rgb(0 0 0 / 0.25)",
} as const;

export type Shadow = typeof shadow;

export const elevation = {
  0: "none",
  1: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  2: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  3: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
} as const;

export type Elevation = typeof elevation;

/**
 * Type scale: 8 semantic sizes. Each entry carries the paired
 * line-height and letter-spacing (R14.3).
 */
export const typography = {
  hero: {
    fontSize: "3.5rem",
    lineHeight: "1.05",
    letterSpacing: "-0.02em",
  },
  display: {
    fontSize: "3rem",
    lineHeight: "1.1",
    letterSpacing: "-0.02em",
  },
  h1: {
    fontSize: "2.25rem",
    lineHeight: "1.15",
    letterSpacing: "-0.015em",
  },
  h2: {
    fontSize: "1.875rem",
    lineHeight: "1.2",
    letterSpacing: "-0.01em",
  },
  h3: {
    fontSize: "1.5rem",
    lineHeight: "1.25",
    letterSpacing: "-0.005em",
  },
  body: {
    fontSize: "1rem",
    lineHeight: "1.6",
    letterSpacing: "0em",
  },
  small: {
    fontSize: "0.875rem",
    lineHeight: "1.5",
    letterSpacing: "0.005em",
  },
  caption: {
    fontSize: "0.75rem",
    lineHeight: "1.4",
    letterSpacing: "0.02em",
  },
} as const;

export type Typography = typeof typography;
export type TypographyStep = keyof Typography;

export const fontFamily = {
  sans:
    'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"',
  display:
    'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"',
} as const;

export type FontFamily = typeof fontFamily;

/**
 * Convenience aggregate for consumers that want the full token set
 * as one object (OG image generator, theme-color builders, etc.).
 */
export const tokens = {
  colors,
  spacing,
  radius,
  shadow,
  elevation,
  typography,
  fontFamily,
} as const;

export type Tokens = typeof tokens;
