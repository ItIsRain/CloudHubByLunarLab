#!/usr/bin/env node
/**
 * Post-build fixer for `output: 'standalone'` deployments.
 *
 * Next.js 15/16 standalone output is incomplete in two well-known ways:
 *   1. It doesn't copy `.next/static` or `public/` — those are needed by the
 *      runtime server but documented as "your responsibility to copy".
 *   2. It silently drops some files from `.next/server/app/` for route
 *      groups (e.g. `(auth)`) and certain route patterns, producing
 *      `InvariantError: The client reference manifest for route "/X" does
 *      not exist` at runtime → PM2 restart loop.
 *
 * Symmetric error: `Failed to load static file for page: /500 ENOENT
 * ...pages/500.html` — App-Router-only apps don't have a Pages 500 page,
 * but the runtime still looks for one as a fallback in some flows.
 *
 * Strategy:
 *   * Mirror the entire `.next/server` tree into standalone (not just
 *     manifests — overwrites are fine, contents are deterministic).
 *   * Mirror `.next/static` and `public/`.
 *   * Drop a minimal `pages/500.html` stub if Next didn't generate one,
 *     so the ENOENT fallback doesn't bomb the worker.
 *
 * Idempotent. Cross-platform on Node ≥ 16.7 thanks to `fs.cpSync`.
 */
import {
  existsSync,
  cpSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import { join, relative } from "node:path";

const PROJECT_ROOT = process.cwd();
const NEXT_DIR = join(PROJECT_ROOT, ".next");
const STANDALONE = join(NEXT_DIR, "standalone");
const STANDALONE_NEXT = join(STANDALONE, ".next");

if (!existsSync(STANDALONE)) {
  console.log(
    "[fix-standalone] .next/standalone not found — skipping. " +
      "(Only relevant when next.config has output: 'standalone'.)"
  );
  process.exit(0);
}

function mirror(src, dest, label) {
  if (!existsSync(src)) {
    console.warn(`[fix-standalone] ${label}: source missing at ${src} — skipping.`);
    return;
  }
  mkdirSync(dest, { recursive: true });
  cpSync(src, dest, { recursive: true, force: true });
  console.log(
    `[fix-standalone] mirrored ${label}: ${relative(PROJECT_ROOT, src)} → ${relative(PROJECT_ROOT, dest)}`
  );
}

// 1. Whole .next/server tree → standalone/.next/server
//    This catches all client-reference-manifest.js, route-group manifests,
//    page chunks, and the pages/ fallback dir Next sometimes needs.
mirror(join(NEXT_DIR, "server"), join(STANDALONE_NEXT, "server"), ".next/server");

// 2. .next/static → standalone/.next/static (JS chunks, CSS, fonts)
mirror(join(NEXT_DIR, "static"), join(STANDALONE_NEXT, "static"), ".next/static");

// 3. public/ → standalone/public (favicons, /pdfjs worker, images)
mirror(join(PROJECT_ROOT, "public"), join(STANDALONE, "public"), "public");

// 4. Minimal pages/500.html stub if Next didn't write one. App Router apps
//    don't generate it, but the runtime sometimes looks for it as the last
//    error fallback and ENOENTs the worker if it's missing.
const pagesDir = join(STANDALONE_NEXT, "server", "pages");
const fivehundred = join(pagesDir, "500.html");
if (!existsSync(fivehundred)) {
  mkdirSync(pagesDir, { recursive: true });
  writeFileSync(
    fivehundred,
    `<!doctype html><html><head><meta charset="utf-8"><title>500 — Internal Server Error</title></head><body><h1>500 — Internal Server Error</h1><p>Sorry, something went wrong. Please try again in a moment.</p></body></html>`,
    "utf8"
  );
  console.log("[fix-standalone] wrote fallback pages/500.html");
}

console.log("[fix-standalone] done.");
