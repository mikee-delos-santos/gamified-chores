// Prints a build id for the web/PWA export to stdout (nothing else goes to stdout).
//
// The id must change on every deploy so a long-open tab can tell its running code is stale
// (see use-app-update.ts + version.json). It prefers the commit SHA (Railway injects
// RAILWAY_GIT_COMMIT_SHA; otherwise we ask git) and always appends a build timestamp so even a
// redeploy of the same commit produces a new id.

const { execSync } = require('node:child_process');

function shortSha() {
  const fromRailway = process.env.RAILWAY_GIT_COMMIT_SHA;
  if (fromRailway) return fromRailway.slice(0, 7);
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return 'dev';
  }
}

// Compact UTC stamp: YYYYMMDDHHmm. Date.now() would also work; this is just human-readable.
function stamp() {
  return new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);
}

process.stdout.write(`${shortSha()}.${stamp()}`);
