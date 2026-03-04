#!/usr/bin/env node
/**
 * Script pour remplacer www.taxiassur.com par taxiassur.com
 * Corrige le problème Open Graph URL not matching canonical
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.join(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');

let filesModified = 0;
let replacementsCount = 0;

function replaceWwwInFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');

  if (!content.includes('www.taxiassur.com')) {
    return false;
  }

  // Compter les occurrences AVANT remplacement
  const beforeCount = (content.match(/www\.taxiassur\.com/g) || []).length;

  // Remplacer TOUTES les occurrences de www.taxiassur.com
  const newContent = content.replace(/www\.taxiassur\.com/g, 'taxiassur.com');

  // Vérifier qu'il y a eu un changement
  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent, 'utf-8');
    filesModified++;
    replacementsCount += beforeCount;

    const relativePath = path.relative(ROOT_DIR, filePath);
    console.log(`✓ ${relativePath} (${beforeCount} remplacement${beforeCount > 1 ? 's' : ''})`);
    return true;
  }

  return false;
}

function processDirectory(dir) {
  const items = fs.readdirSync(dir);

  items.forEach(item => {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (!item.startsWith('.') && item !== 'node_modules' && item !== 'dist') {
        processDirectory(fullPath);
      }
    } else if (item.endsWith('.tsx') || item.endsWith('.ts') || item.endsWith('.json')) {
      replaceWwwInFile(fullPath);
    }
  });
}

console.log('🔄 Remplacement de www.taxiassur.com par taxiassur.com...\n');

processDirectory(SRC_DIR);

console.log('\n' + '='.repeat(60));
console.log(`✅ Remplacement terminé!`);
console.log(`   Fichiers modifiés: ${filesModified}`);
console.log(`   Remplacements totaux: ${replacementsCount}`);
console.log('='.repeat(60) + '\n');

console.log('💡 Prochaines étapes:');
console.log('   1. Vérifier que le build fonctionne: npm run build');
console.log('   2. Régénérer le sitemap: npm run seo:sitemap');
console.log('   3. Tester le site en local');
console.log('');
