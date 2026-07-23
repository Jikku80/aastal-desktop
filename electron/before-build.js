// electron/before-build.js
//
// electron-builder "beforeBuild" hook — runs automatically as part of
// `npm run dist` (electron-builder), before packaging starts.
//
// Why this exists: electron/package.json's extraResources packages
// ../dentaldb/.next/standalone directly. That directory is only wired to
// the local backend (http://127.0.0.1:4000) if dentaldb was built with
// `npm run build:electron`, which sets NEXT_PUBLIC_API_URL at build time.
// Next.js inlines NEXT_PUBLIC_* env vars into the built JS at build time,
// not at runtime — so if someone instead ran the plain `build` script (or
// forgot to build dentaldb at all before packaging), the packaged desktop
// app would silently ship wired to the *production* API
// (https://app.clinickarobar.com, see dentaldb/lib/api.ts's fallback)
// instead of talking to its own bundled local backend.
//
// This hook removes the manual step entirely: it always (re)builds
// dentaldb with build:electron before packaging, then verifies the output
// actually contains the local API URL.
//
// NOTE (fixed): this used to ALSO fail the build if the string
// "api.clinickarobar.com" appeared ANYWHERE in the standalone output.
// That's the wrong invariant — the production domain legitimately (and
// correctly) shows up in places that have nothing to do with the app's
// own runtime API base URL:
//   - next.config.js's CSP `connect-src` header, which must always allow
//     the real production API origin regardless of build target
//   - the admin "API Reference" panel (dashboard/settings/page.tsx),
//     which hardcodes the production URL on purpose as public API-docs
//     example text shown to users
//   - dead-code remnants of dentaldb/lib/api.ts's fallback branch, which
//     the minifier doesn't always strip even once it's unreachable
// A blind substring scan for that domain will therefore ALWAYS find a
// hit and fail every build, even a correct one (this is exactly what
// broke the linux/mac CI runs). The only thing we can actually verify
// without executing the app is that the LOCAL url got inlined somewhere
// — that's sufficient proof build:electron ran with the right env var.

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const LOCAL_API_URL = 'http://127.0.0.1:4000';

const DENTALDB_DIR = path.join(__dirname, '..', 'dentaldb');
const STANDALONE_DIR = path.join(DENTALDB_DIR, '.next', 'standalone');

function run(cmd, args, cwd) {
  console.log(`[before-build] running: ${cmd} ${args.join(' ')} (cwd=${cwd})`);
  execFileSync(cmd, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' });
}

function walkFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue; // don't scan vendored deps
      walkFiles(full, out);
    } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.mjs'))) {
      out.push(full);
    }
  }
  return out;
}

function verifyInlinedApiUrl() {
  if (!fs.existsSync(STANDALONE_DIR)) {
    throw new Error(
      `[before-build] FAILED: ${STANDALONE_DIR} does not exist after build:electron. ` +
      `Cannot verify the Electron build is wired to the local backend.`,
    );
  }

  const files = walkFiles(STANDALONE_DIR);
  let foundLocalUrl = false;

  for (const file of files) {
    const contents = fs.readFileSync(file, 'utf-8');
    if (contents.includes(LOCAL_API_URL)) {
      foundLocalUrl = true;
      break;
    }
  }

  if (!foundLocalUrl) {
    throw new Error(
      `[before-build] FAILED: did not find "${LOCAL_API_URL}" inlined anywhere ` +
      `in ${STANDALONE_DIR}. NEXT_PUBLIC_API_URL may not have been set when ` +
      `dentaldb was built — refusing to package a build with an unverified API URL.`,
    );
  }

  console.log(`[before-build] OK: dentaldb's standalone build is wired to ${LOCAL_API_URL}.`);
}

async function beforeBuild() {
  run('npm', ['run', 'build:electron'], DENTALDB_DIR);
  verifyInlinedApiUrl();
}

module.exports = beforeBuild;

// Also runnable directly (npm run predist / node before-build.js), not just
// as electron-builder's beforeBuild hook — belt and suspenders so this can't
// be skipped by invoking electron-builder some other way, and so it fails
// the same way whether it runs via npm's predist lifecycle or the hook.
if (require.main === module) {
  beforeBuild().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
}
