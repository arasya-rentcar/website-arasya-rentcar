import * as React from "react";

import type { Locale } from "@/lib/content";

/**
 * Inline foreign-language wrapper utilities (R15.8).
 *
 * R15.8 says inline foreign-language phrases embedded in primarily-other-locale
 * copy must be wrapped in an element carrying a `lang` attribute so assistive
 * technologies announce them with the right pronunciation engine.
 *
 * This module exposes two surfaces:
 *
 * - **`<Lang>`** — a JSX component for use in templates. Forwards
 *   `code` to `lang`, accepts an optional `className` for layout
 *   alignment, and renders its children unchanged. Preferred form for
 *   most call sites because it composes naturally with the rest of
 *   the template's JSX tree.
 *
 * - **`langSpan(code, text)`** — an imperative helper for code paths
 *   that build up strings programmatically (e.g. translation
 *   functions, MDX-derived bullet lists). Returns a
 *   `<span lang>` React element. The `text` argument is a plain
 *   string by design — when callers need to embed React children,
 *   they should reach for `<Lang>` instead.
 *
 * Both helpers accept any BCP-47 language tag, not just the project's
 * `Locale` union, so authors can wrap a Spanish brand name embedded in
 * an Indonesian paragraph (`<Lang code="es">…</Lang>`) without changing
 * the type. The `Locale` type is also accepted directly for the common
 * case of an Indonesian brand reference inside English copy.
 *
 * Both helpers are pure server-renderable — no `"use client"`, no
 * hooks, no DOM access. Safe for any rendering context.
 *
 * Existing MDX bodies and templates that mix locales without `<Lang>`
 * wrappers stay as-is; this module is the future-author tool. Phase 12
 * lints already cover the major slip cases (forbidden phrases,
 * chauffeur-only phrase presence).
 *
 * @example In an Indonesian paragraph:
 *
 *   "Pelanggan kami menyebut layanan ini sebagai
 *    <Lang code='en'>peace of mind</Lang>."
 *
 * @example Imperative use:
 *
 *   const node = langSpan("ja", "おもてなし");
 */
export interface LangProps {
  /** BCP-47 language tag for the wrapped phrase (e.g. "en", "id", "es"). */
  readonly code: Locale | string;
  /** The phrase to wrap. Any React children are accepted. */
  readonly children: React.ReactNode;
  /** Optional class names so the wrapper can absorb layout styles. */
  readonly className?: string;
}

/**
 * Render an inline `<span lang>` wrapping the supplied children. Use
 * inside templates and MDX bodies whenever a phrase is in a language
 * different from the surrounding paragraph (R15.8).
 */
export function Lang({
  code,
  children,
  className,
}: LangProps): React.JSX.Element {
  return (
    <span lang={code} className={className}>
      {children}
    </span>
  );
}

/**
 * Imperative `<span lang>` helper for code that builds strings
 * programmatically. Returns a React element so the caller can drop it
 * into a JSX tree alongside other nodes.
 *
 * Prefer the {@link Lang} component in templates; reach for this
 * helper only when the JSX form is awkward (e.g. inside a `.map()`
 * over translation strings).
 */
export function langSpan(code: string, text: string): React.JSX.Element {
  return <span lang={code}>{text}</span>;
}
