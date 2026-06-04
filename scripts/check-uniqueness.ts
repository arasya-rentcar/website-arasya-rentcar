#!/usr/bin/env node
/**
 * scripts/check-uniqueness.ts
 *
 * Build-time uniqueness analyzer for narrative MDX bodies (R6.1, R6.2,
 * R6.6, R22.12, R23.7).
 *
 * What it enforces:
 *   - R6.1  Pairwise Jaccard token overlap between any two MDX bodies
 *           of the same locale must stay below 40%. Pairs above the
 *           threshold are reported so editors can rewrite — and per
 *           R22.12 a launched city pair above the threshold should be
 *           demoted to `coverable` until rewritten.
 *   - R6.2  Each MDX body must contain at least 150 content tokens
 *           (after stopword removal). Files below the floor are
 *           flagged.
 *   - R6.6  Token-overlap is the canonical similarity measure for
 *           same-locale comparisons; this script is the single source
 *           of truth for that computation.
 *
 * What it does NOT do:
 *   - Auto-demote launched cities. The script is read-only — it
 *     produces a report. The operator runs the demotion as a
 *     Supabase update after reviewing the report (R22.12 is a process
 *     contract, not a script side-effect).
 *
 * Tokenisation:
 *   1. NFKD-normalise + ASCII-lowercase the MDX body.
 *   2. Strip punctuation (keep ASCII letters, digits, Latin diacritics
 *      0x00C0–0x017F, and whitespace).
 *   3. Split on whitespace.
 *   4. Drop tokens shorter than 3 characters and tokens in the small
 *      Indonesian + English stopword list below.
 *
 * Similarity: the Jaccard index on token Set membership —
 * |A ∩ B| / |A ∪ B|. Equivalent to "fraction of words that appear in
 * both documents", which is what R6.1's "≤40% token overlap" wording
 * naturally maps to.
 *
 * Exit codes:
 *   0 — every doc clears the word-count floor and every same-locale
 *       pair stays at or below the 40% Jaccard threshold.
 *   1 — at least one violation; word-count + overlap reports are
 *       emitted to stderr first so editors get the full picture in a
 *       single CI run.
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
// Paths + thresholds
// -----------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, "..");

const CONTENT_DIR = resolve(PROJECT_ROOT, "content");

/** R6.1 — pairwise Jaccard similarity ceiling. Inclusive: > threshold fails. */
const OVERLAP_THRESHOLD = 0.4;

/** R6.2 — per-doc minimum content-token count after stopword removal. */
const MIN_BODY_TOKENS = 150;

// -----------------------------------------------------------------------------
// Stopwords
// -----------------------------------------------------------------------------

/**
 * Indonesian + English stopword list. Trimmed to commonly recurring
 * function words so the Jaccard score reflects content overlap rather
 * than grammar overlap. The set is intentionally small — over-pruning
 * would mask legitimate near-duplicates.
 */
const STOPWORDS: ReadonlySet<string> = new Set<string>([
  // Indonesian
  "yang",
  "dan",
  "atau",
  "untuk",
  "dengan",
  "dari",
  "kepada",
  "pada",
  "akan",
  "adalah",
  "ini",
  "itu",
  "saya",
  "kami",
  "kita",
  "anda",
  "tidak",
  "juga",
  "sudah",
  "bisa",
  "dapat",
  "oleh",
  "sebagai",
  "jadi",
  "agar",
  "namun",
  "tetapi",
  "sehingga",
  "karena",
  "hingga",
  "supaya",
  "melalui",
  "setelah",
  "sebelum",
  "sampai",
  "tanpa",
  "ada",
  "seperti",
  "bagi",
  "lebih",
  "saat",
  "tahun",
  // English
  "the",
  "and",
  "for",
  "with",
  "from",
  "are",
  "was",
  "were",
  "been",
  "being",
  "have",
  "has",
  "had",
  "this",
  "that",
  "these",
  "those",
  "you",
  "they",
  "not",
  "but",
  "also",
  "just",
  "can",
  "could",
  "may",
  "might",
  "must",
  "shall",
  "should",
  "will",
  "would",
  "into",
  "over",
  "through",
  "about",
  "than",
  "then",
  "because",
  "such",
  "more",
  "most",
]);

// -----------------------------------------------------------------------------
// Tokenisation
// -----------------------------------------------------------------------------

/**
 * Tokenise `text` into a content-word Set. Returns the set plus the
 * raw count of content words (pre-dedup) so the word-count floor check
 * in R6.2 can use it without re-tokenising.
 */
function tokenize(text: string): { tokens: Set<string>; count: number } {
  const cleaned = text
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9\u00C0-\u017F\s]+/g, " ");
  const words = cleaned
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
  return { tokens: new Set(words), count: words.length };
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const t of a) if (b.has(t)) intersection += 1;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// -----------------------------------------------------------------------------
// File discovery
// -----------------------------------------------------------------------------

interface Doc {
  readonly file: string;
  readonly locale: "id" | "en";
  readonly tokens: Set<string>;
  readonly tokenCount: number;
}

function walkMdx(): string[] {
  const out: string[] = [];
  if (!existsSync(CONTENT_DIR)) return out;
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
  visit(CONTENT_DIR);
  return out;
}

function relPath(abs: string): string {
  return relative(PROJECT_ROOT, abs).split(sep).join("/");
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------

function main(): void {
  const files = walkMdx();
  console.log(`[uniqueness] scanning ${files.length} MDX files`);

  const docs: Doc[] = [];
  const lowWordCount: { file: string; tokens: number }[] = [];

  for (const file of files) {
    let raw: string;
    try {
      raw = readFileSync(file, "utf8");
    } catch {
      continue;
    }

    const parsed = matter(raw) as unknown as {
      data: Record<string, unknown>;
      content: string;
    };
    const localeRaw = parsed.data["locale"];
    if (localeRaw !== "id" && localeRaw !== "en") continue;

    const { tokens, count } = tokenize(parsed.content);
    docs.push({
      file: relPath(file),
      locale: localeRaw,
      tokens,
      tokenCount: count,
    });

    if (count < MIN_BODY_TOKENS) {
      lowWordCount.push({ file: relPath(file), tokens: count });
    }
  }

  // Pairwise comparison within each locale only — cross-locale overlap
  // is expected and not in scope for R6.1.
  interface OverlapHit {
    readonly a: string;
    readonly b: string;
    readonly locale: "id" | "en";
    readonly score: number;
  }
  const overlaps: OverlapHit[] = [];
  for (let i = 0; i < docs.length; i += 1) {
    for (let j = i + 1; j < docs.length; j += 1) {
      const a = docs[i]!;
      const b = docs[j]!;
      if (a.locale !== b.locale) continue;
      const s = jaccard(a.tokens, b.tokens);
      if (s > OVERLAP_THRESHOLD) {
        overlaps.push({ a: a.file, b: b.file, locale: a.locale, score: s });
      }
    }
  }

  let exitCode = 0;

  if (lowWordCount.length > 0) {
    console.error(
      `[uniqueness] ${lowWordCount.length} doc(s) below ${MIN_BODY_TOKENS}-token floor (R6.2):`,
    );
    for (const v of lowWordCount) {
      console.error(`  ${v.file}: ${v.tokens} tokens`);
    }
    exitCode = 1;
  }

  if (overlaps.length > 0) {
    console.error(
      `[uniqueness] ${overlaps.length} pair(s) exceed ${(OVERLAP_THRESHOLD * 100).toFixed(0)}% overlap (R6.1):`,
    );
    for (const v of overlaps.sort((x, y) => y.score - x.score)) {
      console.error(
        `  [${v.locale}] ${v.a} <> ${v.b}: ${(v.score * 100).toFixed(1)}%`,
      );
    }
    console.error(
      "[uniqueness] R22.12: launched cities exceeding the threshold should be demoted to coverable in the structured store until rewritten.",
    );
    exitCode = 1;
  }

  console.log(
    `[uniqueness] ${docs.length} docs scanned across ` +
      `${new Set(docs.map((d) => d.locale)).size} locale(s)`,
  );

  if (exitCode === 0) {
    console.log("[uniqueness] ok — no violations");
  } else {
    console.error(`[uniqueness] FAILED with violations`);
  }

  process.exit(exitCode);
}

main();
