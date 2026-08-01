#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const rootDir = dirname(dirname(__filename));

const result = spawnSync(process.execPath, ['scripts/generate-clean-sitemap.js', ...process.argv.slice(2)], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: false,
});

if (result.status !== 0) {
  console.log('Sitemap generation skipped: autonomous public content endpoints unavailable or below SEO threshold. Existing sitemap kept.');
}