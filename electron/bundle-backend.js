#!/usr/bin/env node
// Bundles electron/.staging/backend/dist/main.js (322 compiled NestJS files +
// a 26,000+ file node_modules tree) down into a single JS file plus a
// small handful of packages that genuinely cannot be bundled.
//
// Why this exists: the Electron desktop build was archiving the raw
// dentalDB-backend node_modules tree (26,000+ files) into the Windows
// installer. Even with 7-Zip in store/no-compression mode, that many
// individual files means the Windows CI runner (with Defender's real-time
// scanning, which GitHub-hosted runners cannot fully disable due to Tamper
// Protection) spends most of the "Package (Windows)" step just touching
// files, not compressing them. Bundling collapses ~26,600 files -> ~950.
//
// Two families of packages CANNOT be bundled and must be copied alongside
// the bundle as real files:
//   1. Native modules (compiled .node binaries) — better-sqlite3 and its
//      own runtime deps (bindings, file-uri-to-path). esbuild can bundle
//      *references* to them but not the binary itself.
//   2. Packages that load non-JS assets via fs at runtime instead of
//      require() — pdfmake's font engine (fontkit) reads Unicode font/
//      trie data files relative to its own module directory. esbuild has
//      no way to see that these files are needed (they're not required(),
//      just fs.readFileSync'd), so bundling them produces a build that
//      passes compilation but throws ENOENT the first time a PDF is
//      generated. Keeping the whole pdfmake dependency chain unbundled
//      avoids this silently-broken-PDFs failure mode entirely.
//
// Everything else (NestJS, TypeORM, class-validator, the 300+ other
// transitive deps) bundles cleanly into one file and is verified working
// end-to-end (full app boot + HTTP response) as part of the change that
// introduced this script.
//
// IMPORTANT: this also depends on dentalDB-backend's entity/migration
// loading using explicit imports (src/database/*-entities.ts,
// src/database/*-migrations.ts) rather than filesystem globs. TypeORM's
// old `__dirname + '**/*.entity.js'` glob pattern silently finds zero
// entities once everything is collapsed into one file, since the
// individual compiled files it was scanning for no longer exist on disk.
// If you ever revert that change, this bundle will build successfully
// and then fail at runtime with EntityMetadataNotFoundError.

const path = require('path');
const fs = require('fs');
const esbuild = require('esbuild');

const STAGING_DIR = path.resolve(__dirname, '../electron/.staging/backend');
const ENTRY = path.join(STAGING_DIR, 'dist/main.js');
const NODE_MODULES = path.join(STAGING_DIR, 'node_modules');

// Packages that must stay as real, unbundled files after bundling.
// Keep this list minimal — every entry here is a file-count cost.
const KEEP_UNBUNDLED = [
  // native module + its own runtime deps
  'better-sqlite3',
  'bindings',
  'file-uri-to-path',
  // pdfmake's full chain (fontkit loads font/trie data via fs, not require)
  'pdfmake',
  '@foliojs-fork',
  'base64-js', 'brotli', 'call-bind', 'call-bind-apply-helpers', 'call-bound',
  'clone', 'crypto-js', 'deep-equal', 'define-data-property',
  'define-properties', 'dfa', 'dunder-proto', 'es-define-property',
  'es-errors', 'es-object-atoms', 'function-bind', 'functions-have-names',
  'get-intrinsic', 'get-proto', 'gopd', 'has-property-descriptors',
  'has-symbols', 'has-tostringtag', 'hasown', 'iconv-lite', 'is-arguments',
  'is-date-object', 'is-regex', 'jpeg-exif', 'math-intrinsics', 'object-is',
  'object-keys', 'pako', 'png-js', 'regexp.prototype.flags', 'safer-buffer',
  'set-function-length', 'set-function-name', 'tiny-inflate',
  'unicode-properties', 'unicode-trie', 'xmldoc', 'sax',
];

// Nest's internal loadPackage() helper does try/catch requires of optional
// peer packages we don't use (microservices transports, fastify, etc). They
// aren't installed at all, so esbuild can't and shouldn't try to bundle
// them; leaving them external just leaves an unreachable require() call.
const OPTIONAL_UNUSED_PEERS = [
  '@nestjs/microservices',
  '@nestjs/microservices/microservices-module',
  '@fastify/static',
  'class-transformer/storage',
];

async function main() {
  if (!fs.existsSync(ENTRY)) {
    console.error(`[bundle-backend] Entry not found: ${ENTRY}`);
    console.error('[bundle-backend] Run electron:stage-backend first.');
    process.exit(1);
  }

  console.log('[bundle-backend] Bundling', ENTRY);
  const result = await esbuild.build({
    entryPoints: [ENTRY],
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    outfile: ENTRY, // overwrite in place — electron/main.js already spawns backend/dist/main.js
    allowOverwrite: true,
    external: [...KEEP_UNBUNDLED, ...OPTIONAL_UNUSED_PEERS],
    logLevel: 'info',
    metafile: true,
  });

  const bundleSize = fs.statSync(ENTRY).size;
  console.log(`[bundle-backend] Bundle written: ${(bundleSize / 1024 / 1024).toFixed(1)}MB`);

  console.log('[bundle-backend] Pruning node_modules to unbundled packages only...');
  const keep = new Set(KEEP_UNBUNDLED.filter((p) => !p.startsWith('@fastify') && !p.startsWith('@nestjs') && p !== 'class-transformer/storage'));
  let removed = 0;
  let keptDirs = 0;

  for (const entry of fs.readdirSync(NODE_MODULES, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;

    if (entry.name.startsWith('@')) {
      // scoped dir — recurse one level, decide per sub-package
      const scopeDir = path.join(NODE_MODULES, entry.name);
      for (const sub of fs.readdirSync(scopeDir, { withFileTypes: true })) {
        const scopedName = `${entry.name}/${sub.name}`;
        if (keep.has(scopedName) || keep.has(entry.name)) {
          keptDirs++;
          continue;
        }
        fs.rmSync(path.join(scopeDir, sub.name), { recursive: true, force: true });
        removed++;
      }
      // remove the scope dir itself if now empty
      if (fs.readdirSync(scopeDir).length === 0) fs.rmdirSync(scopeDir);
      continue;
    }

    if (keep.has(entry.name)) {
      keptDirs++;
      continue;
    }
    fs.rmSync(path.join(NODE_MODULES, entry.name), { recursive: true, force: true });
    removed++;
  }

  console.log(`[bundle-backend] Pruned ${removed} top-level packages, kept ${keptDirs}.`);

  // Sanity count for visibility in CI logs
  const countFiles = (dir) => {
    let count = 0;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) count += countFiles(full);
      else count++;
    }
    return count;
  };
  console.log(`[bundle-backend] Final node_modules file count: ${countFiles(NODE_MODULES)}`);

  console.log('[bundle-backend] Cleaning dist/ — main.js is now self-contained, other compiled files are unused...');
  const distDir = path.join(STAGING_DIR, 'dist');
  let distRemoved = 0;
  for (const entry of fs.readdirSync(distDir, { withFileTypes: true })) {
    if (entry.name === 'main.js') continue; // the bundle itself
    fs.rmSync(path.join(distDir, entry.name), { recursive: true, force: true });
    distRemoved++;
  }
  console.log(`[bundle-backend] Removed ${distRemoved} entries from dist/, kept main.js.`);
  console.log(`[bundle-backend] Final dist/ file count: ${countFiles(distDir)}`);
}

main().catch((e) => {
  console.error('[bundle-backend] FAILED:', e);
  process.exit(1);
});