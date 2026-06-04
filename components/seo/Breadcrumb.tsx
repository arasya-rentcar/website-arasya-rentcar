import * as React from "react";
import Link from "next/link";

import { breadcrumbListJsonLd } from "@/lib/seo/jsonld";

import { JsonLd } from "./JsonLd";

/**
 * `<Breadcrumb>` — visible breadcrumb trail plus the matching
 * `BreadcrumbList` JSON-LD block (R8.4, design §9).
 *
 * R8.4 requires two artefacts to stay in lock-step on every
 * programmatically generated page: a human-readable breadcrumb the user
 * navigates with, and a schema.org `BreadcrumbList` describing the same
 * hierarchy for search engines. This component owns both outputs so a
 * template cannot render one without the other — if a page is visibly
 * showing "Home › Sewa Mobil › Bogor", the emitted JSON-LD lists
 * exactly those three items in that order.
 *
 * Conventions:
 *   - `items` is the ordered ancestor trail (root → parent), each entry
 *     already localized by the caller.
 *   - `currentLabel` + `currentPath` represent the current page; it's
 *     split out from `items` because the current page is rendered as
 *     non-linked plain text with `aria-current="page"` rather than a
 *     `<Link>`, and we need the current path for the JSON-LD final
 *     `ListItem.item` URL.
 *   - Separators use `aria-hidden="true"` so assistive tech hears the
 *     item labels in sequence without the visual glyph being spoken.
 *
 * Pure Server Component: no `"use client"`, no hooks, no event handlers.
 * Safe to render from any RSC boundary (templates in `components/templates/*`).
 */

/**
 * One ancestor entry in the breadcrumb trail (root → parent).
 *
 * `path` is a locale-prefixed route such as `/sewa-mobil/bogor`; the
 * JSON-LD builder (`breadcrumbListJsonLd`) converts it to an absolute
 * URL via `absoluteUrl`. `name` is the already-localized visible label.
 */
export interface BreadcrumbItem {
  readonly name: string;
  readonly path: string;
}

export interface BreadcrumbProps {
  /**
   * Ordered ancestor trail from the root (typically the homepage) down
   * to the direct parent of the current page. Does not include the
   * current page itself — pass that via `currentLabel` + `currentPath`.
   */
  readonly items: readonly BreadcrumbItem[];
  /**
   * Visible label for the current page. Rendered as plain text with
   * `aria-current="page"` (not a link) and appended to the JSON-LD
   * trail as its final `ListItem`.
   */
  readonly currentLabel: string;
  /**
   * Locale-prefixed path of the current page (for example
   * `/sewa-mobil/bogor`). Used only to build the JSON-LD final item's
   * URL — it is not rendered as a link.
   */
  readonly currentPath: string;
}

export function Breadcrumb({
  items,
  currentLabel,
  currentPath,
}: BreadcrumbProps): React.ReactElement {
  // Build the full trail the JSON-LD block needs. The visible markup
  // renders `items` as links and `currentLabel` as the current page,
  // while the structured-data trail is the concatenation of both so
  // search engines see the same hierarchy the user sees.
  const jsonLdItems = [
    ...items.map((item) => ({ name: item.name, path: item.path })),
    { name: currentLabel, path: currentPath },
  ];

  return (
    <>
      <nav aria-label="Breadcrumb">
        <ol className="text-sm text-muted-foreground flex items-center gap-2">
          {items.map((item, index) => (
            <li key={`${item.path}:${index}`} className="flex items-center gap-2">
              <Link
                href={item.path}
                className="hover:text-foreground hover:underline underline-offset-2 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-[var(--ring)]"
              >
                {item.name}
              </Link>
              <span aria-hidden="true">&rsaquo;</span>
            </li>
          ))}
          <li aria-current="page" className="text-foreground">
            {currentLabel}
          </li>
        </ol>
      </nav>
      <JsonLd blocks={[breadcrumbListJsonLd({ items: jsonLdItems })]} />
    </>
  );
}

export default Breadcrumb;
