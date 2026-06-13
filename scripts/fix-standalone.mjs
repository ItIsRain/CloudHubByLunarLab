#!/usr/bin/env node
/**
 * Post-build fixer for `output: 'standalone'` deployments.
 *
 * Next.js ships the standalone build with a minimal Node server but does NOT
 * copy `.next/static` (JS chunks, CSS) or `public/` (favicons, images, the
 * pdfjs worker we host ourselves) into the standalone bundle. Running the
 * server without them produces the symptoms we saw on prod:
 *
 *   - `InvariantError: The client reference manifest for route "/X" does not
 *     exist` — chunks missing
 *   - `Failed to load static file for page: /500 ENOENT` — error fallback
 *     missing
 *
 * We also defensively mirror any client-reference-manifest files into the
 * standalone tree. Next has long-standing bugs where route-group manifests
 * (e.g. our `(auth)` group) don't always make it across.
 *
 * Cross-platform on Node ≥ 16.7 thanks to `fs.cpSync({recursive: true})`.
 */
import { existsSync, cpSync, readdirSync, statSync, mkdirSync } from "node:fs";
import { join, dirname, relative } from "node:path";

const PROJECT_ROOT = process.cwd();
const STANDALONE = join(PROJECT_ROOT, ".next", "standalone");
const NEXT_STATIC = join(PROJECT_ROOT, ".next", "static");
const PUBLIC_DIR = join(PROJECT_ROOT, "public");
const SERVER_APP = join(PROJECT_ROOT, ".next", "server", "app");

if (!existsSync(STANDALONE)) {
  console.log("[fix-standalone] .next/standalone not found — skipping.");
  console.log("[fix-standalone] (only relevant when next.config has output: 'standalone')");
  process.exit(0);
}

function copyDir(src, dest, label) {
  if (!existsSync(src)) {
    console.warn(`[fix-standalone] ${label} not found at ${src} — skipping.`);
    return;
  }
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(src, dest, { recursive: true, force: true });
  console.log(`[fix-standalone] copied ${label} → ${relative(PROJECT_ROOT, dest)}`);
}

// 1. .next/static → standalone/.next/static
copyDir(NEXT_STATIC, join(STANDALONE, ".next", "static"), ".next/static");

// 2. public → standalone/public
copyDir(PUBLIC_DIR, join(STANDALONE, "public"), "public");

// 3. Belt-and-suspenders: walk .next/server/app and copy any
//    *_client-reference-manifest.js files that aren't already in standalone.
//    Next.js sometimes drops manifests for route groups like `(auth)`.
function walkAndCopyManifests(srcDir) {
  if (!existsSync(srcDir)) return;
  const stack = [srcDir];
  let copied = 0;
  while (stack.length > 0) {
    const dir = stack.pop();
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
        continue;
      }
      if (!entry.name.endsWith("_client-reference-manifest.js")) continue;
      const rel = relative(PROJECT_ROOT, full);
      const destPath = join(STANDALONE, rel);
      if (existsSync(destPath)) {
        const srcSize = statSync(full).size;
        const dstSize = statSync(destPath).size;
        if (srcSize === dstSize) continue;
      }
      mkdirSync(dirname(destPath), { recursive: true });
      cpSync(full, destPath, { force: true });
      copied++;
    }
  }
  if (copied > 0) {
    console.log(`[fix-standalone] synced ${copied} client-reference-manifest file(s)`);
  }
}

walkAndCopyManifests(SERVER_APP);

console.log("[fix-standalone] done.");
