import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/seo/canonical";

/**
 * `/robots.txt` generator.
 *
 * Requirements:
 * - R7.6 — THE Website SHALL serve a `robots.txt` at `/robots.txt` that
 *   allows all crawlers and references the absolute `sitemap.xml` URL.
 *
 * Design: §12 (Sitemap and Robots). Next.js App Router materializes this
 * default export as the response body for `/robots.txt`. `absoluteUrl` is
 * sourced from `NEXT_PUBLIC_SITE_URL`, so the `Sitemap:` directive is an
 * absolute URL (e.g. `https://arasyarentcar.com/sitemap.xml`) as required
 * by R7.6; `host` advertises the canonical site origin for the same reason.
 *
 * `/api/*` routes are disallowed because they are server endpoints
 * (booking, revalidate, og) and are not Indexable_Pages.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl(""),
  };
}
