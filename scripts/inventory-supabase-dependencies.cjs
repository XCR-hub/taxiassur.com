#!/usr/bin/env node
const { readFileSync, readdirSync, mkdirSync, writeFileSync } = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const roots = ['src', 'scripts', 'server', 'api', 'supabase/functions'].filter((directory) => {
  try { return readdirSync(path.join(root, directory)).length >= 0; } catch { return false; }
});

function files(directory) {
  return readdirSync(path.join(root, directory), { withFileTypes: true }).flatMap((entry) => {
    const relative = `${directory}/${entry.name}`;
    if (entry.isDirectory()) return files(relative);
    return /\.(?:cjs|mjs|js|jsx|ts|tsx)$/.test(entry.name) ? [relative] : [];
  });
}

const patterns = {
  tables: /\.from\(\s*['"]([^'"]+)['"]\s*\)/g,
  rpc: /\.rpc\(\s*['"]([^'"]+)['"]/g,
  edge_functions: /functions\.invoke(?:<[^>]+>)?\(\s*['"]([^'"]+)['"]/g,
  storage_buckets: /storage\.from\(\s*['"]([^'"]+)['"]\s*\)/g,
  auth_methods: /\.auth\.([A-Za-z][A-Za-z0-9_]*)\s*\(/g,
  realtime_channels: /\.channel\(\s*['"`]([^'"`]+)['"`]/g,
  environment_keys: /(?:import\.meta\.env\.|process\.env\.)(VITE_SUPABASE_[A-Z0-9_]+|SUPABASE_[A-Z0-9_]+)/g,
};

const inventory = Object.fromEntries(Object.keys(patterns).map((key) => [key, new Map()]));
const coupledFiles = new Set();

for (const file of roots.flatMap(files)) {
  const source = readFileSync(path.join(root, file), 'utf8');
  if (/supabase/i.test(source)) coupledFiles.add(file);
  for (const [category, pattern] of Object.entries(patterns)) {
    pattern.lastIndex = 0;
    for (const match of source.matchAll(pattern)) {
      const name = match[1];
      const entries = inventory[category].get(name) || [];
      entries.push(file);
      inventory[category].set(name, entries);
    }
  }
}

const serialized = Object.fromEntries(Object.entries(inventory).map(([category, values]) => [
  category,
  [...values.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([name, references]) => ({
    name,
    references: [...new Set(references)].sort(),
  })),
]));

const report = {
  generated_at: new Date().toISOString(),
  roots,
  coupled_files: [...coupledFiles].sort(),
  counts: {
    coupled_files: coupledFiles.size,
    ...Object.fromEntries(Object.entries(serialized).map(([category, entries]) => [category, entries.length])),
  },
  dependencies: serialized,
};

mkdirSync(path.join(root, 'reports'), { recursive: true });
const output = path.join(root, 'reports', 'supabase-dependency-inventory.json');
writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ ok: true, output, counts: report.counts }, null, 2));
