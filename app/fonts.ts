/**
 * Arasya Rentcar — Web-font configuration (task 2.3).
 *
 * Two self-hosted Google fonts loaded via `next/font/google`:
 *
 * - `sans`    — body / UI font (Inter). Neutral humanist sans with
 *               strong IDN-locale coverage and high x-height for
 *               long-form Indonesian/English body copy.
 * - `display` — heading font (Plus Jakarta Sans). A modern, slightly
 *               warmer sans that pairs with Inter for hero/display copy
 *               while keeping a single-family visual voice across
 *               locales.
 *
 * Each font is self-hosted at build time by Next.js (no runtime request
 * to Google's CDN) and exposes a CSS variable that we compose with the
 * design-token fallback stack in `app/globals.css`. That composition
 * means the fallback chain is consulted while the web font is swapping
 * in, keeping Cumulative Layout Shift bounded while honoring
 * `font-display: swap` (R14.2, R14.9).
 *
 * IMPORTANT:
 * - `variable` intentionally differs from the design-token variable
 *   names (`--font-sans` / `--font-display` in `app/globals.css`). The
 *   loaded web font is exposed as `--font-sans-loaded` /
 *   `--font-display-loaded` so the @theme block can cascade the loaded
 *   font in front of the fallback stack without clobbering the base
 *   token.
 * - `adjustFontFallback: true` lets Next.js emit a metric-matched
 *   synthetic fallback face so the fallback glyph box size tracks the
 *   web font, further suppressing CLS during the swap (R14.9).
 * - `fallback` mirrors the system-font stack declared in
 *   `app/globals.css` so that if the web font fails entirely, the
 *   browser falls through to the same platform UI fonts the rest of
 *   the design system resolves to. Next.js's font loader requires the
 *   `fallback` array to be an inline literal, so the stack is repeated
 *   in both calls below rather than hoisted to a shared constant.
 */
import { Inter, Plus_Jakarta_Sans } from "next/font/google";

export const sans = Inter({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-sans-loaded",
  fallback: [
    "ui-sans-serif",
    "system-ui",
    "-apple-system",
    "Segoe UI",
    "Roboto",
    "Helvetica",
    "Arial",
    "sans-serif",
  ],
  adjustFontFallback: true,
});

export const display = Plus_Jakarta_Sans({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-display-loaded",
  fallback: [
    "ui-sans-serif",
    "system-ui",
    "-apple-system",
    "Segoe UI",
    "Roboto",
    "Helvetica",
    "Arial",
    "sans-serif",
  ],
  adjustFontFallback: true,
});
