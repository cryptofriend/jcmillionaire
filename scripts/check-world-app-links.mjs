#!/usr/bin/env node
/**
 * Static safety check: ensure no `target="_blank"` link in the source tree
 * is unconditionally rendered inside the World Mini App. World App treats
 * those as external navigations and bumps the user out into Safari/Chrome.
 *
 * Heuristic:
 *   For each `target="_blank"` occurrence we look at the surrounding ~30 lines
 *   above the match. If we don't see a guard like `isInWorldApp`, `inWorldApp`,
 *   or `!isInWorldApp` in that window, we flag it.
 *
 *   Files in src/components/ui/** and test/script files are ignored — those
 *   are generic primitives, not app surfaces rendered in World App.
 *
 * Exit code:
 *   0 = clean
 *   1 = unguarded target="_blank" found (CI should fail)
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const SRC = join(ROOT, 'src');

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
const TARGET_RE = /target=["']_blank["']/g;
const GUARD_RE = /isInWorldApp|inWorldApp/;

for (const file of walk(SRC)) {
  if (IGNORE_PATH_PARTS.some((p) => file.includes(p))) continue;
  const text = readFileSync(file, 'utf8');
  if (!TARGET_RE.test(text)) continue;
  TARGET_RE.lastIndex = 0;

  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (!/target=["']_blank["']/.test(lines[i])) continue;
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

if (offenders.length === 0) {
  console.log('✓ No unguarded target="_blank" links — safe for World Mini App.');
  process.exit(0);
}

console.error('✗ Unguarded target="_blank" links found.');
console.error('  These will redirect the user to Safari when opened inside the World Mini App.');
console.error('  Wrap them in `{!isInWorldApp() && ...}` or hide via `inWorldApp` flag.\n');
for (const o of offenders) {
  console.error(`  ${o.file}:${o.line}`);
  console.error(`    ${o.snippet}`);
}
process.exit(1);
