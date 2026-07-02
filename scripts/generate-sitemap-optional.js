#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const rootDir = dirname(dirname(__filename));

function loadLocalEnv() {
  const envPath = join(rootDir, ".env");
  if (!existsSync(envPath)) return;

  const env = readFileSync(envPath, "utf8");
  for (const line of env.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
}

loadLocalEnv();

if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
  console.log("Sitemap generation skipped: Supabase environment is not configured locally.");
  process.exit(0);
}

const result = spawnSync(process.execPath, ["scripts/generate-clean-sitemap.js"], {
  cwd: rootDir,
  stdio: "inherit",
  shell: false,
});

if (result.status !== 0) {
  console.log("Sitemap generation skipped: Supabase environment is not configured locally.");
}
