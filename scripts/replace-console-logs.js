import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const files = glob.sync('src/**/*.{ts,tsx}', { cwd: projectRoot, absolute: true });

let totalReplacements = 0;
let filesModified = 0;

files.forEach(file => {
  let content = readFileSync(file, 'utf-8');
  const originalContent = content;

  const hasConsole = /console\.(log|warn|error|info|debug)/.test(content);

  if (!hasConsole) return;

  const hasLoggerImport = /import.*logger.*from.*['"].*logger['"]/.test(content);

  if (!hasLoggerImport) {
    const importMatch = content.match(/^(import.*\n)+/m);
    if (importMatch) {
      const lastImportIndex = content.lastIndexOf(importMatch[0]) + importMatch[0].length;
      content = content.slice(0, lastImportIndex) +
                "import { logger } from '@/lib/logger';\n" +
                content.slice(lastImportIndex);
    } else {
      content = "import { logger } from '@/lib/logger';\n\n" + content;
    }
  }

  content = content.replace(/console\.(log|warn|error|info|debug)/g, 'logger.$1');

  if (content !== originalContent) {
    writeFileSync(file, content, 'utf-8');
    const matches = originalContent.match(/console\.(log|warn|error|info|debug)/g);
    totalReplacements += matches ? matches.length : 0;
    filesModified++;
  }
});

console.log(`✅ Remplacement terminé:`);
console.log(`   - ${filesModified} fichiers modifiés`);
console.log(`   - ${totalReplacements} console.* remplacés par logger.*`);
