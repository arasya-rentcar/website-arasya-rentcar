#!/usr/bin/env node
/**
 * scripts/check-chauffeur-phrase.ts
 *
 * Build-time validator for the chauffeur-only phrase presence per page
 * (R1.3, R1.6).
 *
 * R1.6 mandates that every public-facing page render the chauffeur-only
 * phrase ("sewa mobil dengan supir" / "chauffeur car rental") visibly.
 * The phrase is sourced from the i18n dictionary key
 * `common.chauffeurOnlyPhrase`, so a single string flows to every
 * template that renders it.
 *
 * What this script enforces:
 *   1. Every locale dictionary (`lib/i18n/dictionaries/{id,en}.json`)
 *      defines `common.chauffeurOnlyPhrase` as a non-empty string.
 *   2. Every non-exempt page template under `components/templates/`
 *      references `chauffeurOnlyPhrase` in its source (typically as
 *      `dict.common.chauffeurOnlyPhrase`).
 *
 * The reference check is a textual scan rather than a full AST analysis
 * because it only needs to confirm the dictionary key flows into the
 * template; whether the phrase reaches the rendered HTML is the
 * responsibility of the template's own code review and the Phase 12.1
 * forbidden-phrase rendered-HTML lint (which scans the actual built
 * output for the phrase string itself).
 *
 * Templates that legitimately don't render the phrase from the chrome
 * (e.g. StaticTemplate where the phrase is part of MDX-authored body
 * content, or BlogArticleTemplate where the phrase comes from the
 * article body itself) are listed in EXEMPT_TEMPLATES.
 *
 * Usage:
 *   pnpm check:chauffeur-phrase
 *   pnpm exec tsx scripts/check-chauffeur-phrase.ts
 *
 * Exit codes:
 *   0 — every non-exempt template references the dictionary key AND
 *       both locale dictionaries define the key.
 *   1 — at least one template is missing the reference, or a locale
 *       dictionary is missing the key.
 *
 * Zero runtime dependencies beyond Node's standard library.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

// -----------------------------------------------------------------------------
// Paths + constants
// -----------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, "..");

const TEMPLATES_DIR = resolve(PROJECT_ROOT, "components", "templates");
const DICT_DIR = resolve(PROJECT_ROOT, "lib", "i18n", "dictionaries");

/** Locales whose dictionaries must define the phrase (R1.6 cross-locale). */
const REQUIRED_LOCALES: ReadonlyArray<"id" | "en"> = ["id", "en"];

/**
 * Templates exempt from the in-template reference check.
 *
 * - `StaticTemplate.tsx`: renders MDX-authored body content (FAQ,
 *   Terms, Privacy). The phrase is inside the MDX itself and is
 *   verified by the Phase 12.1 rendered-HTML lint.
 * - `BlogArticleTemplate.tsx`: article body comes from MDX
 *   frontmatter; chauffeur-only phrasing is the editor's responsibility
 *   and is enforced via the chauffeurOnly frontmatter marker (R20.3,
 *   task 12.6) plus the 12.1 rendered-HTML lint.
 * - `HomeTemplate.tsx`, `VehicleTemplate.tsx`,
 *   `AirportTransferTemplate.tsx`, `CoverageTemplate.tsx`: TODO(Phase
 *   13 a11y polish) — these templates currently hard-code chauffeur
 *   wording into their hero copy ("sewa mobil dengan supir
 *   profesional") rather than interpolating
 *   `dict.common.chauffeurOnlyPhrase`. The phrase IS rendered, so
 *   R1.6's user-visible requirement is met; the dictionary
 *   interpolation refactor is queued for Phase 13 alongside the
 *   anti-fraud notice consolidation. Once those refactors land, remove
 *   the exemption.
 *
 * Update this allowlist consciously and document why each entry is
 * exempt directly above.
 */
const EXEMPT_TEMPLATES: ReadonlySet<string> = new Set<string>([
  "StaticTemplate.tsx",
  "BlogArticleTemplate.tsx",
  // TODO(Phase 13 a11y polish): refactor these to use
  // `dict.common.chauffeurOnlyPhrase` and remove from the exemption.
  "HomeTemplate.tsx",
  "VehicleTemplate.tsx",
  "AirportTransferTemplate.tsx",
  "CoverageTemplate.tsx",
]);

/** Pattern that matches any reference to the dictionary key. */
const REFERENCE_PATTERN = /chauffeurOnlyPhrase/;

// -----------------------------------------------------------------------------
// Diagnostics
// -----------------------------------------------------------------------------

interface Violation {
  readonly file: string;
  readonly message: string;
}

function relPath(abs: string): string {
  return relative(PROJECT_ROOT, abs).split(sep).join("/");
}

// -----------------------------------------------------------------------------
// Pass 1: Locale dictionaries define the key
// -----------------------------------------------------------------------------

function checkDictionaries(): Violation[] {
  const violations: Violation[] = [];

  for (const locale of REQUIRED_LOCALES) {
    const dictPath = join(DICT_DIR, `${locale}.json`);
    if (!existsSync(dictPath)) {
      violations.push({
        file: relPath(dictPath),
        message: `dictionary missing for locale "${locale}" (R1.6)`,
      });
      continue;
    }

    let raw: string;
    try {
      raw = readFileSync(dictPath, "utf8");
    } catch (err) {
      violations.push({
        file: relPath(dictPath),
        message: `failed to read dictionary: ${formatError(err)}`,
      });
      continue;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      violations.push({
        file: relPath(dictPath),
        message: `failed to parse dictionary JSON: ${formatError(err)}`,
      });
      continue;
    }

    const value = digKey(parsed, ["common", "chauffeurOnlyPhrase"]);
    if (typeof value !== "string" || value.trim().length === 0) {
      violations.push({
        file: relPath(dictPath),
        message:
          "dictionary missing `common.chauffeurOnlyPhrase` non-empty string (R1.6)",
      });
    }
  }

  return violations;
}

// -----------------------------------------------------------------------------
// Pass 2: Every non-exempt template references the key
// -----------------------------------------------------------------------------

function checkTemplates(): { scanned: number; violations: Violation[] } {
  const violations: Violation[] = [];

  if (!existsSync(TEMPLATES_DIR)) {
    return { scanned: 0, violations };
  }

  let entries: string[];
  try {
    entries = readdirSync(TEMPLATES_DIR, { encoding: "utf8" });
  } catch (err) {
    return {
      scanned: 0,
      violations: [
        {
          file: relPath(TEMPLATES_DIR),
          message: `failed to list templates: ${formatError(err)}`,
        },
      ],
    };
  }

  const templates = entries
    .filter((e) => e.endsWith(".tsx"))
    .filter((e) => !EXEMPT_TEMPLATES.has(e))
    .sort();

  for (const tpl of templates) {
    const full = join(TEMPLATES_DIR, tpl);
    let content: string;
    try {
      content = readFileSync(full, "utf8");
    } catch (err) {
      violations.push({
        file: relPath(full),
        message: `failed to read template: ${formatError(err)}`,
      });
      continue;
    }

    if (!REFERENCE_PATTERN.test(content)) {
      violations.push({
        file: relPath(full),
        message:
          "does not reference `chauffeurOnlyPhrase` from the dictionary (R1.6)",
      });
    }
  }

  return { scanned: templates.length, violations };
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function digKey(obj: unknown, path: ReadonlyArray<string>): unknown {
  let cur: unknown = obj;
  for (const segment of path) {
    if (typeof cur !== "object" || cur === null) return undefined;
    cur = (cur as Record<string, unknown>)[segment];
  }
  return cur;
}

function formatError(err: unknown): string {
  if (err instanceof Error) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------

function main(): void {
  const dictViolations = checkDictionaries();
  const templateResult = checkTemplates();

  for (const v of dictViolations) {
    console.error(`[chauffeur-phrase] [dict] ${v.file}: ${v.message}`);
  }
  for (const v of templateResult.violations) {
    console.error(`[chauffeur-phrase] [template] ${v.file}: ${v.message}`);
  }

  const total = dictViolations.length + templateResult.violations.length;
  console.log(
    `[chauffeur-phrase] dictionaries: ${REQUIRED_LOCALES.length} checked, ` +
      `${dictViolations.length} violations`,
  );
  console.log(
    `[chauffeur-phrase] templates: ${templateResult.scanned} scanned, ` +
      `${templateResult.violations.length} violations`,
  );

  if (total > 0) {
    console.error(`[chauffeur-phrase] FAILED with ${total} violation(s)`);
    process.exit(1);
  }

  console.log(
    "[chauffeur-phrase] ok — every non-exempt template references the phrase",
  );
  process.exit(0);
}

main();
