#!/usr/bin/env node
/**
 * scripts/check-service-role-leak.ts
 *
 * Transitive-import build guard that fails CI when the Supabase
 * service-role key (or the server-only Supabase factory) is reachable
 * from any Client Component.
 *
 * Complements the ESLint rule `arasya/no-service-key-in-client`
 * (lib/eslint-rules/no-service-key-in-client.mjs) which only checks
 * single-file references. This script performs the TRANSITIVE check
 * mandated by design §22:
 *
 *   "A custom ESLint rule `no-service-key-in-client` plus a build
 *    check fails the build if `SUPABASE_SERVICE_ROLE_KEY` is imported
 *    by any module reachable from a Client Component boundary (R21.8)."
 *
 * Satisfies:
 *   - R21.8  — no module transitively imported by a Client Component
 *              may reference the Supabase_Service_Role_Key.
 *   - R19.6  — Supabase_Service_Role_Key must remain server-only.
 *
 * Design references:
 *   - §22 — Supabase Client Factory + build-time transitive-import check.
 *
 * Algorithm
 * ---------
 *   1. Walk the repo and collect every TS/JS source file outside the
 *      excluded build/tooling directories.
 *   2. For each file, statically extract import sources (static
 *      `import`/`export … from`, dynamic `import("…")`, and
 *      `require("…")`). False positives are fine; false negatives are
 *      not — this guard errs on the side of flagging more, never less.
 *   3. Resolve each import source against the project root (with the
 *      `@/*` alias from tsconfig.json) and the importing file's
 *      directory. Only first-party files are added to the graph.
 *   4. Identify "client roots": files whose first non-comment directive
 *      is `"use client"`.
 *   5. Compute the transitive closure from the client roots along the
 *      import graph. Any file in that closure is "client-reachable".
 *   6. For every client-reachable file, check whether it:
 *        a. references `SUPABASE_SERVICE_ROLE_KEY` verbatim, or
 *        b. references the `supabaseService` symbol, or
 *        c. imports from the server-only factory module
 *           (`@/lib/supabase/server`, `lib/supabase/server`, or a
 *           relative path ending in `supabase/server`).
 *      Any match is a leak.
 *   7. For each leak, perform a reverse BFS over the import graph to
 *      produce the shortest chain from some client root down to the
 *      offending file, and print it. Exit 1 on any leak; exit 0 with a
 *      success summary otherwise.
 *
 * Usage:
 *   pnpm check:service-role-leak
 *   pnpm check:service-role-leak -- --ignore-path some/path
 *
 * Flags:
 *   --ignore-path <path>   Repo-relative path to exclude from the scan
 *                          (repeatable). Allowlisting is provided for
 *                          future escape hatches; no path is ignored by
 *                          default.
 *
 * Zero runtime dependencies beyond Node's standard library — kept
 * dependency-free so the CI job is fast and self-contained.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import type { Dirent } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

// -----------------------------------------------------------------------------
// Paths + constants
// -----------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..');

const EXCLUDED_DIR_NAMES = new Set<string>([
  '.next',
  '.git',
  '.github',
  '.kiro',
  '.vscode',
  'node_modules',
  'dist',
  'out',
  'build',
  'coverage',
]);

const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'] as const;

/** Tokens that indicate a server-only Supabase surface. */
const SERVICE_ROLE_KEY_TOKEN = 'SUPABASE_SERVICE_ROLE_KEY';
const SERVICE_FACTORY_SYMBOL = 'supabaseService';

/**
 * Regex patterns matched against resolved relative module paths to
 * identify the server-only Supabase factory. Kept deliberately lenient
 * so that any future relocation under `lib/supabase/server*` is still
 * flagged — false positives here are cheap; false negatives are unsafe.
 */
const SERVER_MODULE_RELATIVE_PATTERNS: readonly RegExp[] = [
  /(?:^|\/)lib\/supabase\/server(?:\.(?:ts|tsx|js|mjs|cjs))?$/,
];

// -----------------------------------------------------------------------------
// CLI args
// -----------------------------------------------------------------------------

interface CliOptions {
  readonly ignorePaths: readonly string[];
}

function parseArgs(argv: readonly string[]): CliOptions {
  const ignorePaths: string[] = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === undefined) continue;
    if (arg === '--ignore-path') {
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) {
        console.error('✖ --ignore-path requires a path argument.');
        process.exit(2);
      }
      ignorePaths.push(resolve(PROJECT_ROOT, next));
      i += 1;
    } else if (arg.startsWith('--ignore-path=')) {
      ignorePaths.push(resolve(PROJECT_ROOT, arg.slice('--ignore-path='.length)));
    } else if (arg === '--help' || arg === '-h') {
      printHelpAndExit(0);
    } else {
      console.error(`✖ Unknown argument: ${arg}`);
      printHelpAndExit(2);
    }
  }

  return { ignorePaths };
}

function printHelpAndExit(code: number): never {
  console.log('Usage: tsx scripts/check-service-role-leak.ts [--ignore-path <path>]...');
  console.log('');
  console.log('Fails with exit status 1 if SUPABASE_SERVICE_ROLE_KEY or the server-only');
  console.log('Supabase factory is transitively imported by any Client Component (R21.8).');
  process.exit(code);
}

// -----------------------------------------------------------------------------
// File discovery
// -----------------------------------------------------------------------------

function isSourceFile(name: string): boolean {
  return SOURCE_EXTENSIONS.some((ext) => name.endsWith(ext));
}

function walkSourceFiles(root: string): string[] {
  const out: string[] = [];

  function visit(dir: string): void {
    let entries: Dirent[];
    try {
      entries = readdirSync(dir, { withFileTypes: true, encoding: 'utf8' }) as Dirent[];
    } catch {
      return;
    }
    for (const entry of entries) {
      if (EXCLUDED_DIR_NAMES.has(entry.name)) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        visit(full);
      } else if (entry.isFile() && isSourceFile(entry.name)) {
        out.push(full);
      }
    }
  }

  visit(root);
  return out;
}

// -----------------------------------------------------------------------------
// Source analysis
// -----------------------------------------------------------------------------

/** BOM + leading whitespace + leading JS comments stripper. */
function stripLeadingTrivia(source: string): string {
  let s = source;
  if (s.charCodeAt(0) === 0xfeff) s = s.slice(1);

  // Repeatedly strip leading whitespace, // line comments, and /* block
  // comments. Non-greedy block-comment match handles multi-line headers.
  for (;;) {
    const before = s.length;
    s = s.replace(/^\s+/, '');
    s = s.replace(/^\/\/[^\n]*(?:\n|$)/, '');
    s = s.replace(/^\/\*[\s\S]*?\*\//, '');
    if (s.length === before) break;
  }
  return s;
}

/**
 * True when the file's first non-comment directive is `"use client"`.
 * Both single- and double-quoted directives are accepted, with optional
 * trailing semicolon or newline (per ECMAScript Directive Prologue).
 */
function isClientDirective(source: string): boolean {
  const head = stripLeadingTrivia(source);
  return /^(?:"use client"|'use client')(?:\s*;|\s|$)/.test(head);
}

/**
 * Extract every module specifier referenced by `import … from "…"`,
 * `import "…"`, `export … from "…"`, dynamic `import("…")`, or
 * `require("…")`. Duplicates are collapsed.
 */
function extractImportSpecifiers(source: string): string[] {
  const out = new Set<string>();

  // Static `import … from "…"` and bare `import "…"`.
  const importRe =
    /^\s*import\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"\n]+)['"]/gm;
  // `export … from "…"` (re-export).
  const exportFromRe =
    /^\s*export\s+(?:\*(?:\s+as\s+[A-Za-z_$][\w$]*)?|\{[\s\S]*?\}|[A-Za-z_$][\w$]*)\s+from\s+['"]([^'"\n]+)['"]/gm;
  // Dynamic `import("…")` (may appear anywhere).
  const dynamicImportRe = /\bimport\s*\(\s*['"]([^'"\n]+)['"]\s*\)/g;
  // CommonJS `require("…")`.
  const requireRe = /\brequire\s*\(\s*['"]([^'"\n]+)['"]\s*\)/g;

  for (const re of [importRe, exportFromRe, dynamicImportRe, requireRe]) {
    let match: RegExpExecArray | null;
    while ((match = re.exec(source)) !== null) {
      const spec = match[1];
      if (typeof spec === 'string' && spec !== '') out.add(spec);
    }
  }

  return Array.from(out);
}

// -----------------------------------------------------------------------------
// Import resolution
// -----------------------------------------------------------------------------

/** Try each source extension (and index.* inside directories). */
function tryResolveCandidate(basePath: string): string | null {
  // Exact file with explicit extension already supplied.
  if (existsSync(basePath)) {
    try {
      const st = statSync(basePath);
      if (st.isFile()) return resolve(basePath);
    } catch {
      /* ignore */
    }
  }
  // Exact file with each known extension appended.
  for (const ext of SOURCE_EXTENSIONS) {
    const cand = basePath + ext;
    if (existsSync(cand)) {
      try {
        if (statSync(cand).isFile()) return resolve(cand);
      } catch {
        /* ignore */
      }
    }
  }
  // `<dir>/index.<ext>`
  if (existsSync(basePath)) {
    try {
      if (statSync(basePath).isDirectory()) {
        for (const ext of SOURCE_EXTENSIONS) {
          const cand = join(basePath, `index${ext}`);
          if (existsSync(cand)) {
            try {
              if (statSync(cand).isFile()) return resolve(cand);
            } catch {
              /* ignore */
            }
          }
        }
      }
    } catch {
      /* ignore */
    }
  }
  return null;
}

/**
 * Resolve a first-party import specifier to an absolute file path.
 * Returns null for bare-package imports (e.g. `react`, `next/server`)
 * and for unresolvable specifiers — the guard only cares about the
 * first-party graph.
 */
function resolveImport(fromFile: string, spec: string): string | null {
  // Ignore query/hash suffixes (e.g. `foo?raw`, `foo#bar`).
  let cleaned = spec;
  const qIdx = cleaned.indexOf('?');
  if (qIdx !== -1) cleaned = cleaned.slice(0, qIdx);
  const hIdx = cleaned.indexOf('#');
  if (hIdx !== -1) cleaned = cleaned.slice(0, hIdx);
  if (cleaned === '') return null;

  let base: string;
  if (cleaned.startsWith('@/')) {
    base = resolve(PROJECT_ROOT, cleaned.slice(2));
  } else if (cleaned.startsWith('./') || cleaned.startsWith('../') || cleaned === '.' || cleaned === '..') {
    base = resolve(dirname(fromFile), cleaned);
  } else if (cleaned.startsWith('/')) {
    // Absolute path — treat as project-relative.
    base = resolve(PROJECT_ROOT, '.' + cleaned);
  } else {
    // Bare package import — external, not part of the first-party graph.
    return null;
  }

  return tryResolveCandidate(base);
}

// -----------------------------------------------------------------------------
// Leak detection
// -----------------------------------------------------------------------------

interface LeakReason {
  readonly kind: 'service-role-key' | 'factory-symbol' | 'server-module-import';
  readonly detail: string;
}

function relPath(abs: string): string {
  return relative(PROJECT_ROOT, abs).split(sep).join('/');
}

function importSpecifierLooksLikeServerModule(spec: string): boolean {
  // Normalize `@/` alias and leading `./` noise into a canonical
  // project-relative-ish string for pattern matching. Bare package
  // specifiers (no `@/`, `.`, `/`) never match server module patterns
  // because the factory always lives at `lib/supabase/server`.
  let normalized = spec;
  if (normalized.startsWith('@/')) normalized = normalized.slice(2);
  // Strip leading `./` / `../` chains.
  normalized = normalized.replace(/^(?:\.{1,2}\/)+/, '');
  return SERVER_MODULE_RELATIVE_PATTERNS.some((re) => re.test(normalized));
}

/**
 * Collect the reasons a given file itself leaks (independent of the
 * import graph). Reasons tied to imports are attached here so the
 * report can cite both the text evidence and the offending import.
 */
function collectFileLeakReasons(absPath: string, source: string, specifiers: readonly string[]): LeakReason[] {
  const reasons: LeakReason[] = [];

  // The server factory module itself is allowed to name the key; it is
  // only a problem when it becomes *client-reachable* (detected by the
  // caller), but we still want to record *why* it is a leak target.
  if (source.includes(SERVICE_ROLE_KEY_TOKEN)) {
    reasons.push({
      kind: 'service-role-key',
      detail: `file references ${SERVICE_ROLE_KEY_TOKEN}`,
    });
  }

  // Word-boundary match avoids flagging `supabaseServiceFoo` etc.
  if (new RegExp(`\\b${SERVICE_FACTORY_SYMBOL}\\b`).test(source)) {
    reasons.push({
      kind: 'factory-symbol',
      detail: `file references the \`${SERVICE_FACTORY_SYMBOL}\` symbol`,
    });
  }

  for (const spec of specifiers) {
    if (importSpecifierLooksLikeServerModule(spec)) {
      reasons.push({
        kind: 'server-module-import',
        detail: `imports the server-only factory from "${spec}"`,
      });
    }
  }

  // The absolute-path check catches cases where the specifier was
  // non-obvious (e.g. resolved through an odd relative path) but the
  // resolved file is still `lib/supabase/server.*`.
  const projectRel = relPath(absPath);
  if (/(?:^|\/)lib\/supabase\/server\.(?:ts|tsx|js|mjs|cjs)$/.test(projectRel)) {
    reasons.push({
      kind: 'server-module-import',
      detail: 'file IS the server-only Supabase factory module',
    });
  }

  return reasons;
}

// -----------------------------------------------------------------------------
// Graph building
// -----------------------------------------------------------------------------

interface FileInfo {
  readonly absPath: string;
  readonly isClient: boolean;
  readonly imports: readonly string[]; // resolved absolute paths, first-party only
  readonly rawSpecifiers: readonly string[];
  readonly leakReasons: readonly LeakReason[];
}

function buildFileInfos(files: readonly string[]): Map<string, FileInfo> {
  const infos = new Map<string, FileInfo>();

  // First pass: read sources + extract specifiers.
  const sources = new Map<string, { source: string; specs: string[] }>();
  for (const file of files) {
    let source: string;
    try {
      source = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    const specs = extractImportSpecifiers(source);
    sources.set(file, { source, specs });
  }

  // Second pass: resolve specifiers + collect leak reasons per file.
  for (const [file, { source, specs }] of sources) {
    const resolvedImports: string[] = [];
    for (const spec of specs) {
      const resolved = resolveImport(file, spec);
      if (resolved !== null) resolvedImports.push(resolved);
    }
    infos.set(file, {
      absPath: file,
      isClient: isClientDirective(source),
      imports: resolvedImports,
      rawSpecifiers: specs,
      leakReasons: collectFileLeakReasons(file, source, specs),
    });
  }

  return infos;
}

// -----------------------------------------------------------------------------
// Reachability
// -----------------------------------------------------------------------------

function transitiveClosure(
  roots: readonly string[],
  forward: ReadonlyMap<string, FileInfo>,
): Set<string> {
  const reachable = new Set<string>();
  const queue: string[] = [];
  for (const r of roots) {
    if (!reachable.has(r)) {
      reachable.add(r);
      queue.push(r);
    }
  }
  while (queue.length > 0) {
    const cur = queue.shift() as string;
    const info = forward.get(cur);
    if (!info) continue;
    for (const next of info.imports) {
      if (!reachable.has(next)) {
        reachable.add(next);
        queue.push(next);
      }
    }
  }
  return reachable;
}

function buildReverseGraph(
  forward: ReadonlyMap<string, FileInfo>,
): Map<string, Set<string>> {
  const reverse = new Map<string, Set<string>>();
  for (const [from, info] of forward) {
    for (const to of info.imports) {
      let set = reverse.get(to);
      if (set === undefined) {
        set = new Set<string>();
        reverse.set(to, set);
      }
      set.add(from);
    }
  }
  return reverse;
}

/**
 * Shortest chain from any client root down to `leakFile`, via reverse
 * BFS across the import graph. The returned list is ordered
 * client-root → … → leakFile for ergonomic reporting.
 */
function findShortestClientChain(
  leakFile: string,
  clientRoots: ReadonlySet<string>,
  reverse: ReadonlyMap<string, Set<string>>,
): string[] {
  if (clientRoots.has(leakFile)) return [leakFile];

  const parent = new Map<string, string>();
  const visited = new Set<string>([leakFile]);
  const queue: string[] = [leakFile];

  while (queue.length > 0) {
    const cur = queue.shift() as string;
    const preds = reverse.get(cur);
    if (!preds) continue;
    for (const p of preds) {
      if (visited.has(p)) continue;
      visited.add(p);
      parent.set(p, cur);
      if (clientRoots.has(p)) {
        // Reconstruct client-root → … → leakFile.
        const chain: string[] = [p];
        let n = parent.get(p);
        while (n !== undefined) {
          chain.push(n);
          n = parent.get(n);
        }
        return chain;
      }
      queue.push(p);
    }
  }

  // Not reachable from any client root (shouldn't happen for leaks we
  // report, but return a single-element fallback just in case).
  return [leakFile];
}

// -----------------------------------------------------------------------------
// Reporting
// -----------------------------------------------------------------------------

interface Leak {
  readonly file: string;
  readonly reasons: readonly LeakReason[];
  readonly chain: readonly string[];
}

function printLeakReport(leaks: readonly Leak[]): void {
  console.error('');
  console.error('✖ Service-role leak detected (R21.8, R19.6)');
  console.error(`  ${leaks.length} file${leaks.length === 1 ? '' : 's'} reachable from a Client Component reference`);
  console.error('  the server-only Supabase surface. Each leak must be moved behind a');
  console.error('  Route Handler or other server-only boundary (see design §22).');
  console.error('');

  leaks.forEach((leak, idx) => {
    console.error(`  [${idx + 1}] ${relPath(leak.file)}`);
    for (const reason of leak.reasons) {
      console.error(`        · ${reason.detail}`);
    }
    console.error('      Import chain from a Client Component:');
    leak.chain.forEach((step, i) => {
      const arrow = i === 0 ? '        ' : '          → ';
      const tag = i === 0 ? ' (client)' : i === leak.chain.length - 1 ? ' (leak)' : '';
      console.error(`${arrow}${relPath(step)}${tag}`);
    });
    console.error('');
  });

  console.error('  Fix: move service-role access into a server-only module that no');
  console.error('       "use client" file imports, or route it through a Route Handler.');
  console.error('');
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------

function main(): void {
  const { ignorePaths } = parseArgs(process.argv.slice(2));

  const allFiles = walkSourceFiles(PROJECT_ROOT).filter((f) => {
    for (const ignored of ignorePaths) {
      const rel = relative(ignored, f);
      if (rel === '' || (!rel.startsWith('..') && !rel.startsWith(sep) && !rel.includes(`..${sep}`))) {
        return false;
      }
    }
    return true;
  });

  if (allFiles.length === 0) {
    console.log('✓ No source files found to scan.');
    return;
  }

  const infos = buildFileInfos(allFiles);

  const clientRoots: string[] = [];
  for (const [file, info] of infos) {
    if (info.isClient) clientRoots.push(file);
  }

  const reachable = transitiveClosure(clientRoots, infos);

  const leaks: Leak[] = [];
  if (reachable.size > 0) {
    const reverse = buildReverseGraph(infos);
    const clientRootSet = new Set(clientRoots);

    for (const file of reachable) {
      const info = infos.get(file);
      if (!info) continue;
      if (info.leakReasons.length === 0) continue;
      const chain = findShortestClientChain(file, clientRootSet, reverse);
      leaks.push({ file, reasons: info.leakReasons, chain });
    }

    // Stable ordering: by file path for deterministic CI output.
    leaks.sort((a, b) => relPath(a.file).localeCompare(relPath(b.file)));
  }

  if (leaks.length > 0) {
    printLeakReport(leaks);
    process.exit(1);
  }

  console.log(
    `✓ Service-role leak check OK — scanned ${allFiles.length} files, ` +
      `${clientRoots.length} client root${clientRoots.length === 1 ? '' : 's'}, ` +
      `${reachable.size} reachable from client code; no leaks.`,
  );
}

main();
