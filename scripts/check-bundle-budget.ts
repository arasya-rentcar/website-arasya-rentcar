#!/usr/bin/env node
/**
 * scripts/check-bundle-budget.ts
 *
 * Build-time guard that fails CI if the homepage's First Load JS
 * exceeds 170 KB gzipped (R16.8, design §19).
 *
 * R16.8 (verbatim):
 *   "THE Website SHALL ship no more than 170 kilobytes of first-party
 *    JavaScript in the initial bundle for the homepage route, measured
 *    after gzip compression."
 *
 * How the budget is computed
 * --------------------------
 * Next.js's "First Load JS" for a given route is the union of:
 *   - the route-specific page chunks
 *   - the shared polyfills + framework + main runtime chunks loaded by
 *     every route ("rootMainFiles" / "polyfillFiles")
 *
 * Across Next.js versions the manifest layout differs, so this script
 * tries each known location in order and stops at the first hit:
 *
 *   1. `.next/app-build-manifest.json` (classic webpack build).
 *      Shape: { pages: Record<route, string[]> } where route looks like
 *      "/[locale]/page" or "/page".
 *
 *   2. `.next/server/app/page/build-manifest.json` (Next 16 + Turbopack
 *      per-route manifest for the unlocalized "/" route — the homepage
 *      of this project, which redirects through middleware to "/id").
 *      Shape: { rootMainFiles: string[], polyfillFiles: string[],
 *               pages: Record<route, string[]> }.
 *
 *   3. `.next/server/app/[locale]/page/build-manifest.json` if the
 *      project ever moves the homepage under the [locale] segment.
 *
 * Each chunk path is resolved against `.next/`, the file is read, gzip
 * compressed at default level 6, and its compressed length is summed.
 * A chunk that is referenced but missing on disk is skipped with a
 * warning (defensive — should never happen in a clean build).
 *
 * Behaviour when there is no build output
 * ---------------------------------------
 * If none of the manifests exist, the script logs a notice and exits
 * 0. This lets CI run the check on PR branches where `pnpm build` may
 * not have been invoked yet, and lets a future task wire it as a
 * post-build step without breaking earlier phases.
 *
 * Flags
 * -----
 *   --strict   Fail (exit 1) when no manifest is found instead of
 *              skipping. Use this in the post-`next build` CI step.
 *   --json     Emit a machine-readable summary on stdout.
 *
 * Exit codes
 * ----------
 *   0 — homepage within budget, OR no manifest found and --strict not set.
 *   1 — homepage exceeds 170 KB gz, OR --strict set and manifest missing.
 *
 * Zero runtime dependencies beyond Node's standard library.
 */

import { existsSync, readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

// -----------------------------------------------------------------------------
// Paths + constants
// -----------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, "..");
const NEXT_DIR = resolve(PROJECT_ROOT, ".next");

/** R16.8 budget: 170 KB gzipped. */
const BUDGET_BYTES = 170 * 1024;

/** gzip default compression level — same level Vercel's edge uses for static assets. */
const GZIP_LEVEL = 6;

// -----------------------------------------------------------------------------
// CLI flags
// -----------------------------------------------------------------------------

const args = process.argv.slice(2);
const STRICT = args.includes("--strict");
const JSON_OUT = args.includes("--json");

// -----------------------------------------------------------------------------
// Manifest shapes
// -----------------------------------------------------------------------------

interface AppBuildManifest {
  /** Route key → list of chunk paths relative to `.next/`. */
  pages?: Record<string, readonly string[]>;
  rootMainFiles?: readonly string[];
  polyfillFiles?: readonly string[];
}

/** A discovered homepage manifest plus the chunks attributed to it. */
interface HomepageManifest {
  readonly source: string;
  readonly route: string;
  readonly chunks: readonly string[];
}

// -----------------------------------------------------------------------------
// Manifest discovery
// -----------------------------------------------------------------------------

/**
 * Candidate (manifest path, route lookup keys) pairs, tried in order.
 * The first manifest that exists AND yields a non-empty chunk list
 * wins. Route keys are tried in order — the first match wins.
 */
const HOMEPAGE_CANDIDATES: ReadonlyArray<{
  readonly manifestPath: string;
  readonly routeKeys: readonly string[];
  /** When true, treat the manifest as a per-route manifest where
   *  rootMainFiles + polyfillFiles ARE the homepage's first-load JS,
   *  even if `pages` is empty. */
  readonly treatAsPerRoute: boolean;
}> = [
  {
    manifestPath: resolve(NEXT_DIR, "app-build-manifest.json"),
    routeKeys: ["/[locale]/page", "/page", "/"],
    treatAsPerRoute: false,
  },
  {
    manifestPath: resolve(NEXT_DIR, "server", "app", "page", "build-manifest.json"),
    routeKeys: ["/page", "/"],
    treatAsPerRoute: true,
  },
  {
    manifestPath: resolve(
      NEXT_DIR,
      "server",
      "app",
      "[locale]",
      "page",
      "build-manifest.json",
    ),
    routeKeys: ["/[locale]/page", "/page"],
    treatAsPerRoute: true,
  },
];

function readManifest(path: string): AppBuildManifest | null {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as AppBuildManifest;
  } catch (err) {
    console.warn(`[bundle-budget] failed to parse ${relToRoot(path)}: ${(err as Error).message}`);
    return null;
  }
}

function findHomepageManifest(): HomepageManifest | null {
  for (const candidate of HOMEPAGE_CANDIDATES) {
    const manifest = readManifest(candidate.manifestPath);
    if (manifest === null) continue;

    // Try named routes first.
    let route: string | null = null;
    let pageChunks: readonly string[] = [];
    for (const key of candidate.routeKeys) {
      const chunks = manifest.pages?.[key];
      if (chunks && chunks.length > 0) {
        route = key;
        pageChunks = chunks;
        break;
      }
    }

    // For per-route manifests, rootMainFiles + polyfillFiles are the
    // homepage's first-load even when `pages` is empty.
    const rootMain = manifest.rootMainFiles ?? [];
    const polyfills = manifest.polyfillFiles ?? [];

    if (route === null && candidate.treatAsPerRoute && rootMain.length > 0) {
      route = "/";
    }

    if (route === null) continue;

    // Dedupe while preserving order (page chunks first, then shared).
    const seen = new Set<string>();
    const merged: string[] = [];
    for (const c of [...pageChunks, ...rootMain, ...polyfills]) {
      if (!seen.has(c)) {
        seen.add(c);
        merged.push(c);
      }
    }

    return {
      source: candidate.manifestPath,
      route,
      chunks: merged,
    };
  }

  return null;
}

// -----------------------------------------------------------------------------
// Sizing
// -----------------------------------------------------------------------------

interface ChunkSize {
  readonly chunk: string;
  readonly rawBytes: number;
  readonly gzBytes: number;
  readonly missing: boolean;
}

function sizeChunk(chunk: string): ChunkSize {
  const fullPath = resolve(NEXT_DIR, chunk);
  if (!existsSync(fullPath)) {
    return { chunk, rawBytes: 0, gzBytes: 0, missing: true };
  }
  const buf = readFileSync(fullPath);
  const gz = gzipSync(buf, { level: GZIP_LEVEL });
  return { chunk, rawBytes: buf.length, gzBytes: gz.length, missing: false };
}

// -----------------------------------------------------------------------------
// Reporting helpers
// -----------------------------------------------------------------------------

function relToRoot(absPath: string): string {
  const rel = absPath.startsWith(PROJECT_ROOT)
    ? absPath.slice(PROJECT_ROOT.length + 1)
    : absPath;
  return rel.split(/[\\/]/).join("/");
}

function fmtKb(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------

function main(): void {
  if (!existsSync(NEXT_DIR)) {
    const msg = "[bundle-budget] no .next/ directory — run `pnpm build` first";
    if (STRICT) {
      console.error(msg);
      process.exit(1);
    }
    console.log(`${msg} (skipping)`);
    process.exit(0);
  }

  const homepage = findHomepageManifest();
  if (homepage === null) {
    const msg =
      "[bundle-budget] could not locate a homepage build manifest under .next/. " +
      "Tried: " +
      HOMEPAGE_CANDIDATES.map((c) => relToRoot(c.manifestPath)).join(", ");
    if (STRICT) {
      console.error(msg);
      process.exit(1);
    }
    console.log(`${msg} (skipping)`);
    process.exit(0);
  }

  console.log(
    `[bundle-budget] homepage route "${homepage.route}" — ${homepage.chunks.length} chunks`,
  );
  console.log(`[bundle-budget] manifest: ${relToRoot(homepage.source)}`);

  const sizes = homepage.chunks.map(sizeChunk);

  let totalGz = 0;
  let totalRaw = 0;
  let missing = 0;
  for (const s of sizes) {
    if (s.missing) {
      missing += 1;
      console.warn(`  ! missing on disk: ${s.chunk}`);
      continue;
    }
    totalGz += s.gzBytes;
    totalRaw += s.rawBytes;
    console.log(`  ${s.chunk}  raw=${fmtKb(s.rawBytes)}  gz=${fmtKb(s.gzBytes)}`);
  }

  const overBudget = totalGz > BUDGET_BYTES;
  const summary = {
    route: homepage.route,
    manifest: relToRoot(homepage.source),
    chunks: sizes.length,
    missingChunks: missing,
    totalRawBytes: totalRaw,
    totalGzBytes: totalGz,
    budgetBytes: BUDGET_BYTES,
    overBudget,
  };

  console.log(
    `[bundle-budget] total first-load JS: ${fmtKb(totalGz)} gz ` +
      `(raw ${fmtKb(totalRaw)}) | budget ${fmtKb(BUDGET_BYTES)} gz`,
  );

  if (JSON_OUT) {
    console.log(JSON.stringify(summary, null, 2));
  }

  if (overBudget) {
    const overage = totalGz - BUDGET_BYTES;
    console.error(
      `[bundle-budget] FAIL — homepage exceeds budget by ${fmtKb(overage)} gz (R16.8)`,
    );
    process.exit(1);
  }

  console.log(`[bundle-budget] OK — homepage within ${fmtKb(BUDGET_BYTES)} gz budget (R16.8)`);
  process.exit(0);
}

main();
