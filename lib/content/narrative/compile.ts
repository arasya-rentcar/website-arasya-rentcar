/**
 * MDX body → React element compiler.
 *
 * Per design §4.3 narrative bodies are compiled and evaluated at build time
 * through `@mdx-js/mdx`'s `evaluate` function. `evaluate` takes our MDX body
 * text plus a JSX runtime and returns an `MDXModule` whose `default` export
 * is an `MDXContent` component. We invoke that component with the
 * `mdxAllowlist` map as its `components` prop so every PascalCase JSX tag in
 * the body resolves to the corresponding allowlisted React component
 * (R23.3). The compiled `React.ReactElement` is returned for downstream
 * narrative loaders (`cities.ts`, `countries.ts`, ...) to embed directly in
 * the page tree.
 *
 * Safety nets (belt and braces, R23.3 / R23.6):
 *   1. `lib/content/narrative/mdx.ts` already rejects any PascalCase JSX tag
 *      that is not a key of `mdxAllowlist` before the body ever reaches this
 *      module.
 *   2. We re-scan the body for the same shape immediately before the
 *      `evaluate` call. If a future code path feeds this function raw MDX
 *      that bypassed `mdx.ts` (ad-hoc tooling, tests, etc.) we still fail
 *      fast with a `[mdx-compile] ... — unknown component <Foo>` error.
 *   3. The `useMDXComponents` option is intentionally omitted: components
 *      are passed via the `components` prop on the rendered element, which
 *      prevents authors from sneaking in a component via a `<MDXProvider>`
 *      context we do not control.
 *
 * Pure module except for the `evaluate` call itself. No filesystem access,
 * no process-global mutation. Returns a `React.ReactElement` (not a
 * `ReactNode`) so callers can conditionally render and transform it the
 * same way they would any other element.
 */

import { evaluate } from "@mdx-js/mdx";
import * as jsxRuntime from "react/jsx-runtime";
import * as jsxDevRuntime from "react/jsx-dev-runtime";
import type * as React from "react";

import { mdxAllowlist } from "@/components/mdx";

// ---------------------------------------------------------------------------
// Belt-and-braces allowlist scan (mirrors `./mdx.ts`)
// ---------------------------------------------------------------------------

/**
 * Matches a JSX opening-tag name that starts with a capital letter. Matches
 * the regex in `./mdx.ts` so the two scans agree on what counts as a custom
 * component reference.
 */
const JSX_OPEN_TAG_RE = /<([A-Z][A-Za-z0-9]*)/g;

/**
 * Set of allowed JSX tag names (keys of `mdxAllowlist`). Computed once at
 * module load so the hot-path is a `Set.has` lookup.
 */
const ALLOWED_TAGS: ReadonlySet<string> = new Set(Object.keys(mdxAllowlist));

/**
 * Throw when the body references a PascalCase JSX tag that is not in the
 * allowlist. The `[mdx-compile]` prefix distinguishes this message from the
 * parallel `[mdx]` message produced during the frontmatter-loading scan so
 * CI logs surface which layer caught the unknown tag.
 */
function assertOnlyAllowedTags(bodyText: string): void {
  const seen = new Set<string>();
  for (const match of bodyText.matchAll(JSX_OPEN_TAG_RE)) {
    const tag = match[1];
    if (tag === undefined) continue;
    if (seen.has(tag)) continue;
    seen.add(tag);
    if (!ALLOWED_TAGS.has(tag)) {
      throw new Error(`[mdx-compile] unknown component <${tag}>`);
    }
  }
}

// ---------------------------------------------------------------------------
// JSX runtime resolution
// ---------------------------------------------------------------------------

/**
 * Runtime dispatch for the production vs. development JSX helpers.
 *
 * `@mdx-js/mdx` ships two compile outputs — a production shape that calls
 * `jsx` / `jsxs` and a development shape that calls `jsxDEV`. We pass both
 * and let `evaluate` pick the right one based on whether the compiled module
 * was emitted with `development: true` (the default is `false`). React
 * exposes these helpers via separate entry points; importing both here is
 * cheap because tree-shaking at runtime is a no-op once we reference them.
 */
type ReactJsxRuntime = {
  readonly Fragment: React.ComponentType<{ children?: React.ReactNode }>;
  readonly jsx: unknown;
  readonly jsxs: unknown;
};

type ReactJsxDevRuntime = {
  readonly Fragment: React.ComponentType<{ children?: React.ReactNode }>;
  readonly jsxDEV: unknown;
};

const prodRuntime = jsxRuntime as unknown as ReactJsxRuntime;
const devRuntime = jsxDevRuntime as unknown as ReactJsxDevRuntime;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compile an MDX body string into a rendered `React.ReactElement`.
 *
 * Steps:
 *   1. Belt-and-braces PascalCase-tag allowlist scan against the raw body.
 *      Throws `[mdx-compile] ... — unknown component <Tag>` if a tag slips
 *      past the upstream scan in `./mdx.ts`.
 *   2. Call `evaluate` from `@mdx-js/mdx` with React's automatic JSX runtime
 *      wired up (both production and development helpers provided so either
 *      compile mode works). The returned `MDXModule` exposes an
 *      `MDXContent` component on its `default` export.
 *   3. Invoke that component with the `mdxAllowlist` map as its
 *      `components` prop, so every allowlisted JSX tag in the body resolves
 *      to the corresponding React component. Returns the resulting element.
 *
 * The returned value is a `React.ReactElement` (not a `ReactNode`) so
 * callers can pass it through element-level helpers (e.g. `cloneElement`)
 * without casting.
 *
 * @param bodyText MDX body with frontmatter already stripped (see
 *                 `./mdx.ts` — `LoadedNarrative.bodyText`).
 * @returns Rendered React element.
 */
export async function compileMdxToReact(
  bodyText: string,
): Promise<React.ReactElement> {
  assertOnlyAllowedTags(bodyText);

  const mod = await evaluate(bodyText, {
    Fragment: prodRuntime.Fragment,
    // `evaluate` wants `Jsx` / `JsxDev` shaped callables. The types from
    // `hast-util-to-jsx-runtime` are structural matches for React's
    // `jsx`/`jsxs`/`jsxDEV` but TypeScript cannot see through the
    // re-exported namespace types, so we cast once here rather than leak
    // `unknown` into every caller.
    jsx: prodRuntime.jsx as Parameters<typeof evaluate>[1]["jsx"],
    jsxs: prodRuntime.jsxs as Parameters<typeof evaluate>[1]["jsxs"],
    jsxDEV: devRuntime.jsxDEV as Parameters<typeof evaluate>[1]["jsxDEV"],
  });

  const MDXContent = mod.default;
  // The `mdxAllowlist` object is `as const` so every value is a concrete
  // React component. We cast once through `unknown` to the concrete
  // `components` parameter type the MDX default export expects — this keeps
  // call sites free of `any` and avoids re-importing `mdx/types` here.
  type MdxComponentsArg = Parameters<typeof MDXContent>[0]["components"];
  return MDXContent({ components: mdxAllowlist as unknown as MdxComponentsArg });
}
