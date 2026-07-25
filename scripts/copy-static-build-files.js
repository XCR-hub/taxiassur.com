#!/usr/bin/env node

import { copyFileSync, cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const rootDir = dirname(dirname(__filename));

const copies = [
  ["public/content", "dist/content"],
  ["public/feeds", "dist/feeds"],
];

for (const [src, dest] of copies) {
  const srcPath = join(rootDir, src);
  const destPath = join(rootDir, dest);
  if (!existsSync(srcPath)) continue;

  mkdirSync(destPath, { recursive: true });
  cpSync(srcPath, destPath, { recursive: true });
  console.log(`Copied ${src} -> ${dest}`);
}

const htaccess = join(rootDir, "public/.htaccess");
if (existsSync(htaccess)) {
  copyFileSync(htaccess, join(rootDir, "dist/.htaccess"));
  console.log("Copied public/.htaccess -> dist/.htaccess");
}

