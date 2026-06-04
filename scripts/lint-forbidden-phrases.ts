#!/usr/bin/env node
/**
 * scripts/lint-forbidden-phrases.ts
 *
 * Forbidden-phrase lint over MDX bodies and i18n dictionary strings
 * (R20.1, R20.2, R20.5).
 *
 * Scans:
 *   1. Every `*.mdx` body under `content/`. Frontmatter is stripped via
 *      `gray-matter`; the body alone is checked. The MDX file's
 *      frontmatter `locale` field selects the per-locale phrase list.
 *   2. Every string value (recursively) in the i18n dictionaries at
 *      `lib/i18n/dictionaries/{id,en}.json`. The filename selects the
 *      per-locale phrase list.
 *
 * Normalisation: every text and every phrase is normalised via NFKD
 * Unicode decomposition + ASCII-lowercased before substring matching.
 * This catches diacritic variants ("self-drîve") and casing variants
 * ("Self-Drive") with the same pass.
 *
 * Phrase taxonomy: the FORBIDDEN map is the single source of truth.
 * It enumerates the chauffeur-only-violating phrases enumerated by
 * R20.1 / R20.2 / R20.5 for each locale plus a small `any` list for
 * locale-agnostic terms. Phrases are matched literally (substring) on
 * the normalised text — not as regex — so authors can add a new
 * forbidden term by appending one string.
 *
 * Output: one stderr line per violation in the form
 *   [forbidden-phrases] <file>: "<phrase>" — "<context>"
 * where `<context>` is the surrounding ±30 characters of the source
 * (un-normalised) text so reviewers can see the original casing /
 * whitespace.
 *
 * Exit codes:
 *   0 — no forbidden phrases found in any MDX body or dictionary string.
 *   1 — at least one violation; full list dumped to stderr first.
 *
 * Zero runtime dependencies beyond Node's standard library and
 * `gray-matter` (already a devDependency for the MDX pipeline).
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import type { Dirent } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

import matter from "gray-matter";

// -----------------------------------------------------------------------------
// Paths + constants
// -----------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, "..");

const CONTENT_DIR = resolve(PROJECT_ROOT, "content");
const DICT_DIR = resolve(PROJECT_ROOT, "lib", "i18n", "dictionaries");

/**
 * Forbidden phrases per locale. Each entry is matched literally (as a
 * substring) against the NFKD-normalised, ASCII-lowercased target text.
 * Ordering is informational — phrases are listed roughly by topic
 * (self-drive → leasing → account/dashboard → payment) so a reader can
 * audit coverage at a glance.
 */
const FORBIDDEN: Readonly<Record<"id" | "en" | "any", ReadonlyArray<string>>> = {
  id: [
    // Self-drive (R2.3, R20.1)
    "lepas kunci",
    "rental lepas kunci",
    "self-drive",
    "self drive",
    // Leasing / rent-to-own (R2.7, R20.1)
    "rent to own",
    "rent-to-own",
    "leasing kendaraan",
    // Customer account / login (R2.4, R20.1)
    "akun pelanggan",
    "login akun",
    "buat akun",
    // Reservation dashboard (R2.5, R20.1)
    "dashboard reservasi",
  ],
  en: [
    // Self-drive (R2.3, R20.2)
    "self-drive",
    "self drive",
    // Leasing / rent-to-own (R2.7, R20.2)
    "rent to own",
    "rent-to-own",
    "vehicle leasing",
    // Customer account / login (R2.4, R20.2)
    "customer account",
    "create account",
    "sign in",
    // Reservation dashboard (R2.5, R20.2)
    "reservation dashboard",
  ],
  any: [],
};

// -----------------------------------------------------------------------------
// Diagnostics
// -----------------------------------------------------------------------------

interface Violation {
  readonly file: string;
  readonly phrase: string;
  readonly context: string;
}

function relPath(abs: string): string {
  return relative(PROJECT_ROOT, abs).split(sep).join("/");
}

// -----------------------------------------------------------------------------
// Phrase matching
// -----------------------------------------------------------------------------

function normalize(text: string): string {
  return text.normalize("NFKD").toLowerCase();
}

/**
 * Find every occurrence of any phrase in `phrases` inside `text`.
 *
 * Both the text and each phrase are normalised before comparison so a
 * diacritic-bearing variant or alternate casing still matches. The
 * returned `context` slice comes from the un-normalised source so the
 * report shows the author's original copy (preserving casing /
 * accents / whitespace) instead of the lowercased ASCII form.
 */
function findPhrasesIn(
  text: string,
  phrases: ReadonlyArray<string>,
): ReadonlyArray<{ phrase: string; context: string }> {
  const normalised = normalize(text);
  const hits: { phrase: string; context: string }[] = [];
  for (const phrase of phrases) {
    const np = normalize(phrase);
    if (np.length === 0) continue;
    let idx = 0;
    while ((idx = normalised.indexOf(np, idx)) !== -1) {
      const start = Math.max(0, idx - 30);
      const end = Math.min(text.length, idx + np.length + 30);
      hits.push({ phrase, context: text.slice(start, end) });
      idx += np.length;
    }
  }
  return hits;
}

// -----------------------------------------------------------------------------
// MDX scan
// -----------------------------------------------------------------------------

function walkMdxFiles(root: string): string[] {
  const out: string[] = [];
  if (!existsSync(root)) return out;
  function visit(dir: string): void {
    let entries: Dirent[];
    try {
      entries = readdirSync(dir, {
        withFileTypes: true,
        encoding: "utf8",
      }) as Dirent[];
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      if (entry.name === "node_modules") continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        visit(full);
      } else if (
        entry.isFile() &&
        entry.name.toLowerCase().endsWith(".mdx")
      ) {
        out.push(full);
      }
    }
  }
  visit(root);
  return out;
}

function checkMdx(): { files: number; violations: Violation[] } {
  const files = walkMdxFiles(CONTENT_DIR);
  const violations: Violation[] = [];

  for (const file of files) {
    let raw: string;
    try {
      raw = readFileSync(file, "utf8");
    } catch (err) {
      violations.push({
        file: relPath(file),
        phrase: "(io)",
        context: `failed to read MDX: ${(err as Error).message}`,
      });
      continue;
    }

    const parsed = matter(raw) as unknown as {
      data: Record<string, unknown>;
      content: string;
    };
    const localeRaw = parsed.data["locale"];
    const locale: "id" | "en" | "any" =
      localeRaw === "id" || localeRaw === "en" ? localeRaw : "any";

    const phrases = [...FORBIDDEN[locale], ...FORBIDDEN.any];
    for (const hit of findPhrasesIn(parsed.content, phrases)) {
      violations.push({
        file: relPath(file),
        phrase: hit.phrase,
        context: hit.context,
      });
    }
  }

  return { files: files.length, violations };
}

// -----------------------------------------------------------------------------
// Dictionary scan
// -----------------------------------------------------------------------------

/**
 * Recursively walk a parsed JSON dictionary value, applying
 * `findPhrasesIn` to every string leaf. Records the JSON path of each
 * string so the violation message points the editor at the exact key.
 */
function walkDict(
  value: unknown,
  keyPath: string,
  phrases: ReadonlyArray<string>,
  filePath: string,
  out: Violation[],
): void {
  if (typeof value === "string") {
    for (const hit of findPhrasesIn(value, phrases)) {
      out.push({
        file: `${filePath}:${keyPath}`,
        phrase: hit.phrase,
        context: hit.context,
      });
    }
    return;
  }
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) {
      walkDict(value[i], `${keyPath}[${i}]`, phrases, filePath, out);
    }
    return;
  }
  if (typeof value === "object" && value !== null) {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const nextPath = keyPath === "" ? k : `${keyPath}.${k}`;
      walkDict(v, nextPath, phrases, filePath, out);
    }
  }
}

function checkDictionaries(): { files: number; violations: Violation[] } {
  const violations: Violation[] = [];
  let scanned = 0;

  if (!existsSync(DICT_DIR)) {
    return { files: 0, violations };
  }

  for (const locale of ["id", "en"] as const) {
    const path = join(DICT_DIR, `${locale}.json`);
    if (!existsSync(path)) continue;
    scanned += 1;

    let raw: string;
    try {
      raw = readFileSync(path, "utf8");
    } catch (err) {
      violations.push({
        file: relPath(path),
        phrase: "(io)",
        context: `failed to read dictionary: ${(err as Error).message}`,
      });
      continue;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      violations.push({
        file: relPath(path),
        phrase: "(parse)",
        context: `JSON.parse failed: ${(err as Error).message}`,
      });
      continue;
    }

    const phrases = [...FORBIDDEN[locale], ...FORBIDDEN.any];
    walkDict(parsed, "", phrases, relPath(path), violations);
  }

  return { files: scanned, violations };
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------

function main(): void {
  const mdx = checkMdx();
  const dict = checkDictionaries();

  for (const v of mdx.violations) {
    console.error(
      `[forbidden-phrases] [mdx] ${v.file}: "${v.phrase}" — ${JSON.stringify(v.context)}`,
    );
  }
  for (const v of dict.violations) {
    console.error(
      `[forbidden-phrases] [dict] ${v.file}: "${v.phrase}" — ${JSON.stringify(v.context)}`,
    );
  }

  const total = mdx.violations.length + dict.violations.length;
  console.log(
    `[forbidden-phrases] mdx: scanned ${mdx.files} files, ${mdx.violations.length} violations`,
  );
  console.log(
    `[forbidden-phrases] dictionaries: scanned ${dict.files} files, ${dict.violations.length} violations`,
  );

  if (total > 0) {
    console.error(`[forbidden-phrases] FAILED with ${total} violation(s)`);
    process.exit(1);
  }

  console.log("[forbidden-phrases] ok — no forbidden phrases found");
  process.exit(0);
}

main();
