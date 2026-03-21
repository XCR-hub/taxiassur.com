import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';
import path from 'path';

const IMPORT_LINE = "import { toast } from '@/lib/toast';";

async function main() {
  const files = await glob('src/**/*.{tsx,ts}', { cwd: process.cwd(), ignore: ['**/__tests__/**', '**/*.test.*', '**/toast.ts'] });

  let fixed = 0;

  for (const file of files) {
    const fullPath = path.join(process.cwd(), file);
    const content = readFileSync(fullPath, 'utf8');

    if (!content.includes(IMPORT_LINE)) continue;

    // Check if the import is misplaced (not on its own line preceded by \n)
    // Detect pattern: something on same line before `import { toast }`
    // e.g., "import {\nimport { toast } from '@/lib/toast';\n  X,"
    const brokenPattern = /^(import\s*\{[^}]*?)(\nimport \{ toast \} from '@\/lib\/toast';)/m;
    const trailingPattern = /(import \{ toast \} from '@\/lib\/toast';\n)([ ,\w]+)/m;

    // More robust: remove all occurrences of the toast import, then re-add it correctly
    let cleaned = content.split('\n').filter(line => line.trim() !== IMPORT_LINE).join('\n');

    // Find the position of the last complete import statement
    // A complete import ends with a line containing `from '...'` or `from "..."`
    const lines = cleaned.split('\n');
    let lastCompleteImportEnd = -1;
    let inMultiLineImport = false;

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (inMultiLineImport) {
        if (trimmed.startsWith("from '") || trimmed.startsWith('from "')) {
          lastCompleteImportEnd = i;
          inMultiLineImport = false;
        }
      } else if (trimmed.startsWith('import ')) {
        if (trimmed.includes(' from ')) {
          // Single-line import
          lastCompleteImportEnd = i;
        } else {
          // Multi-line import starts
          inMultiLineImport = true;
        }
      }
    }

    if (lastCompleteImportEnd >= 0) {
      lines.splice(lastCompleteImportEnd + 1, 0, IMPORT_LINE);
    } else {
      lines.unshift(IMPORT_LINE);
    }

    const newContent = lines.join('\n');
    if (newContent !== content) {
      writeFileSync(fullPath, newContent, 'utf8');
      fixed++;
      console.log(`  Fixed: ${file}`);
    }
  }

  console.log(`\nFixed ${fixed} files.`);
}

main().catch(err => { console.error(err); process.exit(1); });
