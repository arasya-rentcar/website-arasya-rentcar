import * as React from "react";

/**
 * `<JsonLd>` — server-rendered emitter for schema.org JSON-LD blocks
 * (design §11, R8.7).
 *
 * Pages pass the result of every `lib/seo/jsonld.ts` builder they want on
 * the page as a single array — for example:
 *
 * ```tsx
 * <JsonLd
 *   blocks={[
 *     localBusinessJsonLd(...),
 *     faqJsonLd(...),            // may return null when <3 FAQs (R8.3)
 *     breadcrumbListJsonLd(...), // always produces an object
 *   ]}
 * />
 * ```
 *
 * The component filters out `null` / `undefined` entries (so callers don't
 * have to branch around optional blocks like `faqJsonLd`) and then emits
 * one `<script type="application/ld+json">` **per surviving block**. R8.7
 * is explicit that multiple blocks on the same page must be distinct
 * `<script>` elements, not a single `@graph` container — that constraint
 * is enforced here rather than in the builders so the builders stay pure
 * value producers.
 *
 * XSS guard: we serialize each block with `JSON.stringify` and then
 * replace every `</` sequence with `<\/`. Any untrusted string value that
 * happens to contain `</script>` would otherwise terminate the surrounding
 * `<script>` tag when the HTML parser scans it; `<\/script>` is still a
 * valid JSON string (JSON allows the `\/` escape) and parses to the same
 * Unicode text, so structured-data consumers see identical content while
 * the HTML parser no longer treats the substring as a tag close.
 *
 * Pure Server Component: no `"use client"`, no hooks, no event handlers.
 * Safe to render from any RSC boundary including `app/layout.tsx`.
 */

export interface JsonLdProps {
  /**
   * The JSON-LD blocks to emit, in document order. `null` / `undefined`
   * entries are skipped — this matches the `faqJsonLd` contract of
   * returning `null` when R8.3's "≥3 FAQs" threshold isn't met, so page
   * templates can hand the builder result through unconditionally.
   */
  readonly blocks: ReadonlyArray<Record<string, unknown> | null | undefined>;
}

/**
 * Produce a stable React `key` for one block. We prefer the JSON-LD
 * subject identifier (`@type` + `@id`) when both are present strings,
 * because that combo is stable across re-renders and unique among the
 * blocks our builders emit on a single page. We fall back to the original
 * array index — computed before null-filtering — so keys remain unique
 * even for blocks that omit `@id` (notably `BreadcrumbList`, which has no
 * canonical subject identifier in our builder output).
 */
function deriveBlockKey(
  block: Record<string, unknown>,
  index: number,
): string {
  const type = block["@type"];
  const id = block["@id"];
  if (typeof type === "string" && typeof id === "string") {
    return `${type}:${id}`;
  }
  if (typeof type === "string") {
    return `${type}:${index}`;
  }
  return String(index);
}

/**
 * Serialize one JSON-LD block to an HTML-safe string (see module-level
 * XSS guard note).
 */
function serializeBlock(block: Record<string, unknown>): string {
  return JSON.stringify(block).replace(/<\//g, "<\\/");
}

export function JsonLd({ blocks }: JsonLdProps): React.ReactNode {
  const scripts: React.ReactElement[] = [];

  blocks.forEach((block, index) => {
    if (block === null || block === undefined) {
      return;
    }
    const json = serializeBlock(block);
    scripts.push(
      <script
        key={deriveBlockKey(block, index)}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: json }}
      />,
    );
  });

  return <>{scripts}</>;
}

export default JsonLd;
