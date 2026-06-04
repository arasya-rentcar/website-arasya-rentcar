#!/usr/bin/env node
/**
 * scripts/check-non-goal-leak.ts
 *
 * Static-analysis lint that scans the codebase for identifiers
 * referencing the explicit MVP non-goals enumerated in R2.3–R2.9.
 *
 * What it checks:
 *   - R2.3 (no self-drive functionality):     `self-drive`, `selfDrive`
 *   - R2.4 (no customer account / login):     `customerAccount`, `userLogin`,
 *                                             `createAccount`
 *   - R2.5 (no reservation dashboard):        `reservationDashboard`,
 *                                             `bookingDashboard`
 *   - R2.6 (no payment integration):          `stripe`, `midtrans`, `xendit`,
 *                                             `paymentGateway`, `checkoutSession`
 *   - R2.7 (no leasing / rent-to-own):        `rentToOwn`, `leasing`,
 *                                             `fleetLease`
 *   - R2.8 (no driver-facing app):            `driverApp`, `driverPortal`,
 *                                             `chauffeurApp`
 *   - R2.9 (no multi-tenant / vendor portal): `vendorPortal`, `partnerPortal`,
 *                                             `multiTenant`
 *
 * Distinct from `lint-forbidden-phrases.ts` (task 12.1) which scans
 * authored text. This script scans CODE — TS / TSX / JS / JSX / MJS /
 * CJS source files under `app/`, `components/`, `lib/`, and `scripts/`.
 *
 * Match strategy: each pattern is a case-insensitive RegExp anchored to
 * word boundaries so `accountability` is not flagged for the
 * `customerAccount` rule. Comment lines are skipped (lines starting
 * with `//` or `*`) so explanatory comments referencing the non-goals
 * remain allowed.
 *
 * False-positive escape hatch: this script and
 * `lint-forbidden-phrases.ts` necessarily reference the patterns
 * themselves; they're listed in `ALLOWLIST` below. Add to that set if
 * a legitimate scan-self situation arises.
 *
 * Exit codes:
 *   0 — no non-goal identifiers found.
 *   1 — at least one violation; full list dumped to stderr first.
 *
 * Zero runtime dependencies beyond Node's standard library.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import type { Dirent } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

// -----------------------------------------------------------------------------
// Paths + constants
// -----------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, "..");

/** Directories to scan. */
const SCAN_ROOTS: ReadonlyArray<string> = ["app", "components", "lib", "scripts"];

/** File extensions to scan. */
const EXTS: ReadonlySet<string> = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
]);

interface Pattern {
  readonly regex: RegExp;
  readonly description: string;
  readonly nonGoal: string;
}

/**
 * Patterns to flag. Each is anchored to word boundaries via `\b` so
 * common substrings (e.g. `accountability` for `account`) don't
 * false-positive. Patterns are case-insensitive.
 */
const PATTERNS: ReadonlyArray<Pattern> = [
  {
    regex: /\b(?:self[-_]?drive|selfDrive)\b/i,
    description: "self-drive identifier",
    nonGoal: "R2.3 (no self-drive)",
  },
  {
    regex: /\b(?:rent[_-]?to[_-]?own|leasing|fleet[_-]?lease)\b/i,
    description: "rent-to-own / leasing identifier",
    nonGoal: "R2.7 (no leasing / rent-to-own)",
  },
  {
    regex:
      /\b(?:customer[_-]?account|customerAccount|user[_-]?login|userLogin|create[_-]?account|createAccount)\b/i,
    description: "customer-account identifier",
    nonGoal: "R2.4 (no customer account / login)",
  },
  {
    regex:
      /\b(?:reservation[_-]?dashboard|reservationDashboard|booking[_-]?dashboard|bookingDashboard)\b/i,
    description: "reservation-dashboard identifier",
    nonGoal: "R2.5 (no reservation dashboard)",
  },
  {
    regex:
      /\b(?:stripe|midtrans|xendit|payment[_-]?gateway|paymentGateway|checkout[_-]?session|checkoutSession)\b/i,
    description: "payment-gateway identifier",
    nonGoal: "R2.6 (no payment integration)",
  },
  {
    regex:
      /\b(?:driver[_-]?app|driverApp|driver[_-]?portal|driverPortal|chauffeur[_-]?app|chauffeurApp)\b/i,
    description: "driver-facing app identifier",
    nonGoal: "R2.8 (no driver-facing app)",
  },
  {
    regex:
      /\b(?:vendor[_-]?portal|vendorPortal|partner[_-]?portal|partnerPortal|multi[_-]?tenant|multiTenant)\b/i,
    description: "vendor / multi-tenant portal identifier",
    nonGoal: "R2.9 (no multi-tenant / vendor portal)",
  },
];

/**
 * Files where the non-goal identifiers legitimately appear (e.g. this
 * file defines the patterns; the forbidden-phrase lint references
 * them as well). Listed by relative path; checked exactly.
 */
const ALLOWLIST: ReadonlySet<string> = new Set<string>([
  "scripts/check-non-goal-leak.ts",
  "scripts/lint-forbidden-phrases.ts",
]);

// -----------------------------------------------------------------------------
// Diagnostics
// -----------------------------------------------------------------------------

interface Violation {
  readonly file: string;
  readonly line: number;
  readonly match: string;
  readonly description: string;
  readonly nonGoal: string;
}

function relPath(abs: string): string {
  return relative(PROJECT_ROOT, abs).split(sep).join("/");
}

// -----------------------------------------------------------------------------
// File discovery
// -----------------------------------------------------------------------------

function walkCodeFiles(): string[] {
  const out: string[] = [];
  for (const root of SCAN_ROOTS) {
    const fullRoot = resolve(PROJECT_ROOT, root);
    if (!existsSync(fullRoot)) continue;
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
        const fp = join(dir, entry.name);
        if (entry.isDirectory()) {
          visit(fp);
        } else if (entry.isFile()) {
          const dot = entry.name.lastIndexOf(".");
          if (dot >= 0 && EXTS.has(entry.name.slice(dot).toLowerCase())) {
            out.push(fp);
          }
        }
      }
    }
    visit(fullRoot);
  }
  return out;
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------

function main(): void {
  const files = walkCodeFiles();
  console.log(`[non-goal-leak] scanning ${files.length} files`);

  const violations: Violation[] = [];

  for (const file of files) {
    const rel = relPath(file);
    if (ALLOWLIST.has(rel)) continue;

    let raw: string;
    try {
      raw = readFileSync(file, "utf8");
    } catch {
      continue;
    }

    const lines = raw.split(/\r?\n/);
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i] ?? "";
      const trimmed = line.trim();
      // Skip comment-only lines so explanatory references don't false-positive.
      if (trimmed.startsWith("//") || trimmed.startsWith("*")) continue;

      for (const pat of PATTERNS) {
        const m = pat.regex.exec(line);
        if (m !== null) {
          violations.push({
            file: rel,
            line: i + 1,
            match: m[0],
            description: pat.description,
            nonGoal: pat.nonGoal,
          });
        }
      }
    }
  }

  if (violations.length === 0) {
    console.log(
      "[non-goal-leak] ok — no non-goal capability identifiers found",
    );
    process.exit(0);
  }

  console.error(`[non-goal-leak] ${violations.length} violation(s):`);
  for (const v of violations) {
    console.error(
      `  ${v.file}:${v.line} matched "${v.match}" — ${v.description} (${v.nonGoal})`,
    );
  }
  process.exit(1);
}

main();
