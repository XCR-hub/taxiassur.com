import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';
import path from 'path';

const SRC_DIR = path.resolve(process.cwd(), 'src');
const IMPORT_LINE = "import { toast } from '@/lib/toast';";

// Detect toast type from message content
function detectType(msg) {
  const lower = msg.toLowerCase();
  if (lower.includes('erreur') || lower.includes('error') || lower.includes('❌') || lower.includes('impossible') || lower.includes('invalide') || lower.includes('introuvable')) return 'error';
  if (lower.includes('✅') || lower.includes('succès') || lower.includes('success') || lower.includes('créé') || lower.includes('validé') || lower.includes('envoyé') || lower.includes('ajouté') || lower.includes('supprimé') || lower.includes('confirmé') || lower.includes('enregistré') || lower.includes('réussi') || lower.includes('terminé') || lower.includes('copié') || lower.includes('publié') || lower.includes('finalisé') || lower.includes('converti') || lower.includes('soumis') || lower.includes('démarré') || lower.includes('lancé') || lower.includes('activé') || lower.includes('désactivé') || lower.includes('arrêté')) return 'success';
  if (lower.includes('⚠️') || lower.includes('attention') || lower.includes('veuillez') || lower.includes('obligatoire') || lower.includes('requis') || lower.includes('manquant') || lower.includes('remplir') || lower.includes('sélectionner') || lower.includes('saisir') || lower.includes('indiquer') || lower.includes('aucun') || lower.includes('aucune')) return 'warning';
  return 'info';
}

// Replace a single alert( ... ); call
// Returns the replacement string
function replaceAlert(content) {
  let modified = content;
  let changed = false;

  // Match: alert(`...`);  alert('...');  alert("...");  alert(`multi\nline`);
  // We need to handle multi-line template literals and concatenation
  // Strategy: replace alert( with toast.TYPE( by scanning character by character

  let result = '';
  let i = 0;

  while (i < modified.length) {
    // Look for 'alert(' pattern
    if (modified.startsWith('alert(', i)) {
      // Find matching closing paren
      let depth = 1;
      let j = i + 6; // after 'alert('
      let inString = false;
      let stringChar = '';
      let inTemplate = false;
      let templateDepth = 0;

      while (j < modified.length && depth > 0) {
        const ch = modified[j];

        if (inString) {
          if (ch === '\\') {
            j += 2;
            continue;
          }
          if (ch === stringChar) inString = false;
        } else if (inTemplate) {
          if (ch === '\\') { j += 2; continue; }
          if (ch === '`') { inTemplate = false; templateDepth--; }
          else if (ch === '$' && modified[j+1] === '{') { depth++; j += 2; continue; }
          else if (ch === '}' && templateDepth > 0) { depth--; }
        } else {
          if (ch === '"' || ch === "'") { inString = true; stringChar = ch; }
          else if (ch === '`') { inTemplate = true; templateDepth++; }
          else if (ch === '(') depth++;
          else if (ch === ')') {
            depth--;
            if (depth === 0) break;
          }
        }
        j++;
      }

      // Extract the full argument string
      const argStr = modified.slice(i + 6, j);
      const type = detectType(argStr);
      result += `toast.${type}(${argStr})`;
      i = j + 1; // skip the closing paren
      changed = true;
    } else {
      result += modified[i];
      i++;
    }
  }

  return { content: changed ? result : modified, changed };
}

function addImport(content, filePath) {
  // Check if import already exists
  if (content.includes("from '@/lib/toast'") || content.includes('from "@/lib/toast"')) {
    return content;
  }

  // Find the last import line and add after it
  const lines = content.split('\n');
  let lastImportIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trimStart().startsWith('import ')) {
      lastImportIdx = i;
    }
  }

  if (lastImportIdx >= 0) {
    lines.splice(lastImportIdx + 1, 0, IMPORT_LINE);
  } else {
    lines.unshift(IMPORT_LINE);
  }

  return lines.join('\n');
}

async function main() {
  const files = await glob('src/**/*.{tsx,ts}', { cwd: process.cwd(), ignore: ['**/__tests__/**', '**/*.test.*', '**/toast.ts'] });

  let totalFiles = 0;
  let totalAlerts = 0;

  for (const file of files) {
    const fullPath = path.join(process.cwd(), file);
    const original = readFileSync(fullPath, 'utf8');

    if (!original.includes('alert(')) continue;

    const { content: replaced, changed } = replaceAlert(original);
    if (!changed) continue;

    const alertCount = (original.match(/\balert\(/g) || []).length;
    const withImport = addImport(replaced, file);

    writeFileSync(fullPath, withImport, 'utf8');
    totalFiles++;
    totalAlerts += alertCount;
    console.log(`  ✓ ${file} (${alertCount} alert(s))`);
  }

  console.log(`\nDone: ${totalAlerts} alert() calls replaced in ${totalFiles} files.`);
}

main().catch(err => { console.error(err); process.exit(1); });
