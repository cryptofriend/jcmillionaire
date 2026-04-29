#!/usr/bin/env node
/**
 * Static safety check: ensure no external navigation in the source tree is
 * unconditionally reachable inside the World Mini App. World App treats those
 * as external navigations and bumps the user out into Safari/Chrome.
 *
 * Heuristic:
 *   For each external-navigation occurrence we look at the surrounding ~30
 *   lines above the match. If we don't see a guard like `isInWorldApp`,
 *   `inWorldApp`, or `!isInWorldApp` in that window, we flag it.
 *
 *   Files in src/components/ui/** and test/script files are ignored — those
 *   are generic primitives, not app surfaces rendered in World App.
 *
 * Exit code:
 *   0 = clean
 *   1 = unguarded external navigation found (CI should fail)
 */
import { request } from 'node:https';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const SRC = join(ROOT, 'src');
const WORLD_APP_ENTRY_URLS = [
  'https://jackiechain.world/',
  'https://game.jackiechain.world/',
  'https://www.jackiechain.world/',
  'https://jcmillionaire.lovable.app/',
];

const IGNORE_DIRS = new Set(['node_modules', 'dist', 'build', '.git']);
const IGNORE_PATH_PARTS = ['/components/ui/', '/__tests__/', '/scripts/'];

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (IGNORE_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) walk(full, files);
    else if (/\.(tsx?|jsx?)$/.test(entry)) files.push(full);
  }
  return files;
}

const offenders = [];
const NAVIGATION_PATTERNS = [
  /target=["']_blank["']/,
  /\.target\s*=\s*["']_blank["']/,
  /window\.open\s*\(/,
  /(?:window\.)?location\.(?:assign|replace)\s*\(/,
  /(?:window\.)?location\.href\s*=/,
  /\.click\s*\(\)/,
];
const GUARD_RE = /isInWorldApp|inWorldApp/;

function checkNoRedirect(url) {
  return new Promise((resolve) => {
    const req = request(url, { method: 'HEAD', timeout: 10_000 }, (res) => {
      const status = res.statusCode || 0;
      const location = res.headers.location;
      res.resume();
      resolve({ url, status, location, ok: status >= 200 && status < 300 && !location });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ url, status: 0, ok: false, error: 'timeout' });
    });
    req.on('error', (error) => resolve({ url, status: 0, ok: false, error: error.message }));
    req.end();
  });
}

for (const file of walk(SRC)) {
  if (IGNORE_PATH_PARTS.some((p) => file.includes(p))) continue;
  const text = readFileSync(file, 'utf8');
  if (!NAVIGATION_PATTERNS.some((pattern) => pattern.test(text))) continue;

  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (!NAVIGATION_PATTERNS.some((pattern) => pattern.test(lines[i]))) continue;
    // Look back ~30 lines for a World App guard
    const start = Math.max(0, i - 30);
    const window = lines.slice(start, i + 1).join('\n');
    if (!GUARD_RE.test(window)) {
      offenders.push({
        file: relative(ROOT, file),
        line: i + 1,
        snippet: lines[i].trim(),
      });
    }
  }
}

const redirectResults = await Promise.all(WORLD_APP_ENTRY_URLS.map(checkNoRedirect));
const redirectOffenders = redirectResults.filter((result) => !result.ok);

if (offenders.length === 0 && redirectOffenders.length === 0) {
  console.log('✓ No unguarded external navigation or redirecting World App entry URLs.');
  process.exit(0);
}

console.error('✗ World Mini App navigation risk found.');
console.error('  These can redirect the user to Safari when opened inside the World Mini App.\n');
for (const o of offenders) {
  console.error(`  ${o.file}:${o.line}`);
  console.error(`    ${o.snippet}`);
}
for (const result of redirectOffenders) {
  console.error(`  ${result.url}`);
  console.error(`    status: ${result.status}${result.location ? `, location: ${result.location}` : ''}${result.error ? `, error: ${result.error}` : ''}`);
}
process.exit(1);
