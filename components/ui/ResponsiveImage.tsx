import * as React from "react";
import Image, { type ImageProps } from "next/image";

/**
 * Responsive image wrapper enforcing the project's image policy
 * (R16.4, R16.5).
 *
 * R16.4 — every raster image goes through `next/image` with explicit
 * `width`/`height` (or `fill`), a responsive `sizes` attribute, and
 * AVIF/WebP variants emitted by Next's optimizer (configured in
 * `next.config.mjs` under `images.formats`).
 *
 * R16.5 — when the LCP element of a template is a hero image, callers
 * pass `priority` so Next.js emits a `<link rel="preload">` for it
 * during the initial document load.
 *
 * Usage:
 *
 * ```tsx
 * <ResponsiveImage
 *   src="/cities/bogor/hero.jpg"
 *   alt="Bogor city skyline"
 *   width={1600}
 *   height={900}
 *   priority
 *   sizes="(max-width: 768px) 100vw, 1200px"
 * />
 *
 * <ResponsiveImage
 *   src="/vehicles/innova.jpg"
 *   alt=""
 *   width={400}
 *   height={300}
 *   sizes="(max-width: 640px) 100vw, 33vw"
 * />
 * ```
 *
 * `width`/`height` (or `fill`) are required by the underlying
 * `next/image` API; this wrapper passes them through unchanged. `alt`
 * is required to keep accessibility callers honest — pass an empty
 * string for purely decorative images per WAI-ARIA practice.
 *
 * `sizes` defaults to a sensible mobile-first breakpoint string when
 * not provided. Override per-call when a specific layout requires a
 * tighter hint to keep responsive image selection accurate.
 */
export type ResponsiveImageProps = Omit<ImageProps, "alt"> & {
  /**
   * Alt text — required for accessibility. Pass an empty string for
   * purely decorative images so screen readers skip them.
   */
  readonly alt: string;
  /**
   * Whether this image is the LCP hero. When true, Next.js preloads
   * the image via `<link rel="preload">` and skips lazy loading.
   */
  readonly priority?: boolean;
};

/**
 * Default `sizes` hint used when a caller does not supply one.
 * Tuned for the project's three-column desktop / two-column tablet /
 * full-width mobile layout grid.
 */
const DEFAULT_SIZES =
  "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw";

export default function ResponsiveImage({
  alt,
  priority = false,
  sizes,
  ...rest
}: ResponsiveImageProps): React.JSX.Element {
  return (
    <Image
      {...rest}
      alt={alt}
      priority={priority}
      sizes={sizes ?? DEFAULT_SIZES}
    />
  );
}
