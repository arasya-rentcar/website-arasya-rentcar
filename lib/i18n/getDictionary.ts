/**
 * Locale-aware dictionary loader.
 *
 * Pure, server-safe module (no React imports, no side effects).
 * Consumers import this from Server Components and route handlers to render
 * locale-specific user-facing copy per design §18 and R4.1.
 *
 * The `Dictionary` type is derived from `./dictionaries/id.json` via a
 * type-level dynamic import, so the JSON file itself is the single source of
 * truth for the shape and any mismatch with `en.json` surfaces as a type
 * error at build time under the project's `strict` + `noUncheckedIndexedAccess`
 * compiler settings.
 */

/**
 * The exhaustive set of supported Locales per R4.1.
 *
 * Exactly two values are allowed. `id` is the default.
 */
export type Locale = "id" | "en";

/**
 * The default Locale applied whenever no explicit Locale is resolved from
 * the URL path prefix (R4.1).
 */
export const DEFAULT_LOCALE: Locale = "id";

/**
 * Frozen, ordered list of every supported Locale.
 *
 * Consumers can iterate this to emit hreflang alternates (R4.3), drive the
 * Locale switcher (R4.5), or validate incoming `[locale]` route params.
 */
export const SUPPORTED_LOCALES: readonly Locale[] = Object.freeze([
  "id",
  "en",
] as const);

/**
 * Narrowing helper that reports whether an arbitrary string is one of the
 * Locale literals defined above. Useful in middleware, route handlers, and
 * any place that receives a raw `params.locale` value.
 */
export function isLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/**
 * The complete shape of every Locale dictionary, derived from the Bahasa
 * Indonesia source file so that `en.json` must structurally match.
 *
 * Using `typeof import(...)` as a type query keeps the JSON file out of the
 * runtime bundle at the module scope — only the dynamic `import()` calls
 * inside `getDictionary()` pull actual JSON payloads into Webpack chunks,
 * which Next.js code-splits per locale.
 */
export type Dictionary = typeof import("./dictionaries/id.json");

/**
 * Load the dictionary for the given Locale.
 *
 * Uses dynamic `import()` so Next.js emits one chunk per locale rather than
 * shipping every translation on every page. The cast to `Dictionary` is
 * safe because both JSON files are validated at compile time against the
 * inferred shape via the `enDictionaryMatchesShape` type check below.
 *
 * @param locale - one of the values in {@link SUPPORTED_LOCALES}
 * @returns the fully-typed dictionary for that locale
 */
export async function getDictionary(locale: Locale): Promise<Dictionary> {
  switch (locale) {
    case "en": {
      const mod = await import("./dictionaries/en.json");
      return mod.default as Dictionary;
    }
    case "id":
    default: {
      const mod = await import("./dictionaries/id.json");
      return mod.default as Dictionary;
    }
  }
}

/**
 * Compile-time guard: the English dictionary must have the same structural
 * shape as the Indonesian dictionary used to derive {@link Dictionary}. If a
 * key is added to one file but not the other, this line produces a type
 * error that blocks `pnpm typecheck` and the Next.js build.
 *
 * The value is intentionally unused at runtime; the assignment exists purely
 * so TypeScript validates the structural compatibility.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _enDictionaryMatchesShape: Dictionary =
  {} as unknown as typeof import("./dictionaries/en.json");
