#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const rootDir = dirname(dirname(__filename));
const distDir = join(rootDir, "dist");

function git(args) {
  const result = spawnSync("git", args, {
    cwd: rootDir,
    encoding: "utf8",
    stdio: "pipe",
  });

  if (result.status !== 0) return "";
  return result.stdout.trim();
}

const commit = process.env.COMMIT_REF || git(["rev-parse", "HEAD"]);
const branch =
  process.env.BRANCH ||
  process.env.HEAD ||
  git(["rev-parse", "--abbrev-ref", "HEAD"]);

const info = {
  site: "taxiassur.com",
  generatedAt: new Date().toISOString(),
  deployProvider: process.env.NETLIFY === "true" ? "netlify" : "local",
  context: process.env.CONTEXT || "",
  branch,
  commit,
  commitShort: commit ? commit.slice(0, 8) : "",
  repository: git(["config", "--get", "remote.origin.url"]),
};

if (!existsSync(distDir)) {
  mkdirSync(distDir, { recursive: true });
}

writeFileSync(join(distDir, "deploy-info.json"), `${JSON.stringify(info, null, 2)}\n`);
console.log(`Generated dist/deploy-info.json for ${info.commitShort || "unknown commit"}`);

