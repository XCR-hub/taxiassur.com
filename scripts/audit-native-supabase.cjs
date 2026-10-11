const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = process.cwd();
const sources = new Map();
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (/\.[jt]sx?$/.test(file) && !/\.(test|spec)\./.test(file)) sources.set(file, fs.readFileSync(file, 'utf8'));
  }
}
walk(path.join(root, 'src'));
function resolve(from, name) {
  const base = name.startsWith('@/') ? path.join(root, 'src', name.slice(2)) : name.startsWith('.') ? path.resolve(path.dirname(from), name) : null;
  if (!base) return null;
  return [base, ...['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx'].map(ext => base + ext)].find(file => sources.has(file));
}
const reachable = new Set();
function visit(file) {
  if (!file || reachable.has(file)) return;
  reachable.add(file);
  const source = sources.get(file);
  for (const item of ts.preProcessFile(source, true, true).importedFiles) visit(resolve(file, item.fileName));
  // Include lazy routes with literal dynamic import paths.
  for (const match of source.matchAll(/import\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) visit(resolve(file, match[1]));
}
visit(path.join(root, 'src', 'main.tsx'));
const relative = file => path.relative(root, file).replaceAll('\\', '/');
const legacy = [...sources].filter(([, source]) => /\bsupabase\s*\.|supabaseInstance|createClient\(/.test(source));
const active = legacy.filter(([file]) => reachable.has(file)).map(([file]) => relative(file)).sort();
const inactive = legacy.filter(([file]) => !reachable.has(file)).map(([file]) => relative(file)).sort();
const report = {
  generated_at: new Date().toISOString(),
  note: 'Conservative static import graph; barrel exports and type imports can overestimate runtime use. Supabase-compatible local endpoints are not necessarily hosted Supabase connections.',
  reachable_legacy_files: active,
  unreachable_legacy_files: inactive,
  native_document_screens: ['src/components/crm/DocumentValidationComplete.tsx', 'src/backoffice/PendingDocumentsManager.tsx'],
  compatibility_proxy: 'functions/api/supabase/[[path]].js -> https://postgres-read-api.taxiassur.com',
  native_postgres_legacy_schema: 'supabase_rest is a local PostgreSQL schema, not an external connection',
};
fs.mkdirSync(path.join(root, 'reports'), { recursive: true });
fs.writeFileSync(path.join(root, 'reports', 'native-supabase-audit.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ reachable_legacy_files: active.length, unreachable_legacy_files: inactive.length, active, report: 'reports/native-supabase-audit.json' }, null, 2));
