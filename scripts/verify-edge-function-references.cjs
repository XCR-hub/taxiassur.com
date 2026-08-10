const fs = require('node:fs');
const path = require('node:path');
const root = process.cwd();
const sourceRoot = path.join(root, 'src');
const functionsRoot = path.join(root, 'supabase', 'functions');
const missing = new Map();
function visit(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) visit(absolute);
    else if (/\.(?:ts|tsx)$/.test(entry.name)) {
      const content = fs.readFileSync(absolute, 'utf8');
      for (const match of content.matchAll(/functions\/v1\/([A-Za-z0-9_-]+)/g)) {
        const functionName = match[1];
        if (!fs.existsSync(path.join(functionsRoot, functionName, 'index.ts'))) {
          if (!missing.has(functionName)) missing.set(functionName, new Set());
          missing.get(functionName).add(path.relative(root, absolute));
        }
      }
    }
  }
}
visit(sourceRoot);
if (missing.size) {
  console.error(`Missing Edge Function implementations (${missing.size}):`);
  for (const [functionName, files] of [...missing].sort()) console.error(`- ${functionName}: ${[...files].sort().join(', ')}`);
  process.exit(1);
}
console.log('Edge Function references OK: every literal frontend endpoint has a local implementation.');
