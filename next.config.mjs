/**
 * Next.js configuration.
 *
 * Intentionally minimal for Phase 1 (task 1.1). Later tasks extend this file:
 *   - Tailwind CSS v4 setup (task 2.1, via PostCSS / globals.css; no next.config change required)
 *   - MDX loader (@next/mdx) wiring (task 4.7)
 *   - Image remotePatterns, i18n, headers, etc. (later phases)
 *
 * Task 4.7 — MDX wiring
 *
 * `createMDX({ options: {} })` from `@next/mdx` registers a webpack loader for
 * `.mdx` files so `import`-based MDX pages (if we ever add any) compile as
 * first-class modules. Narrative content loading goes through
 * `lib/content/narrative/mdx.ts` + `lib/content/narrative/compile.ts` which
 * use `@mdx-js/mdx`'s `evaluate` directly — we do not rely on `@next/mdx`'s
 * loader for that path, but we still ship the loader registration here so
 * future task work (and the pageExtensions wiring) does not need to revisit
 * `next.config.mjs` again.
 *
 * `pageExtensions` is extended with `md` and `mdx` per design §4.3 so the App
 * Router can resolve MDX files on disk without a per-route shim.
 *
 * `images.formats` declares AVIF and WebP as the optimizer output formats per
 * R16.4. Next.js's defaults already include WebP, but we list both explicitly
 * so the policy is auditable from configuration alone — `ResponsiveImage`
 * (`components/ui/ResponsiveImage.tsx`) relies on this being set so that any
 * `next/image` source served through the optimizer emits AVIF/WebP variants.
 */

import createMDX from "@next/mdx";

/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ["ts", "tsx", "js", "jsx", "md", "mdx"],
  images: {
    formats: ["image/avif", "image/webp"],
  },
};

const withMDX = createMDX({ options: {} });

export default withMDX(nextConfig);
