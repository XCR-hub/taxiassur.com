#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const rootDir = dirname(dirname(__filename));

const result = spawnSync(process.execPath, ["scripts/generate-clean-sitemap.js"], {
  cwd: rootDir,
  stdio: "inherit",
  shell: false,
});

if (result.status !== 0) {
  console.log("Sitemap generation skipped: Supabase environment is not configured locally.");
}

