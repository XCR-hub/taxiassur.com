#!/usr/bin/env node

/**
 * Script de vérification des imports lazy dans router.tsx
 * Vérifie que tous les fichiers importés existent et ont un export default
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

console.log('\n🔍 VÉRIFICATION DES IMPORTS LAZY\n');
console.log('='.repeat(60));

const routerPath = path.join(projectRoot, 'src', 'router.tsx');
const routerContent = fs.readFileSync(routerPath, 'utf-8');

const lazyImportRegex = /const\s+(\w+)\s*=\s*lazy\(\s*\(\)\s*=>\s*import\(['"](.+?)['"]\)\s*\)/g;

const imports = [];
let match;

while ((match = lazyImportRegex.exec(routerContent)) !== null) {
  imports.push({
    name: match[1],
    path: match[2]
  });
}

console.log(`\n📦 Trouvé ${imports.length} imports lazy\n`);

let errors = 0;
let warnings = 0;

for (const imp of imports) {
  let filePath = imp.path;

  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) {
    filePath += '.tsx';
  }

  const fullPath = path.join(projectRoot, 'src', filePath);

  process.stdout.write(`Vérification ${imp.name.padEnd(30)} ... `);

  if (!fs.existsSync(fullPath)) {
    const tsPath = fullPath.replace('.tsx', '.ts');
    if (fs.existsSync(tsPath)) {
      console.log('✅ OK (.ts)');
    } else {
      console.log(`❌ FICHIER INTROUVABLE`);
      console.log(`   Chemin: ${fullPath}`);
      errors++;
    }
    continue;
  }

  const content = fs.readFileSync(fullPath, 'utf-8');

  if (!content.includes('export default')) {
    console.log('⚠️  AUCUN EXPORT DEFAULT');
    warnings++;
  } else {
    console.log('✅ OK');
  }
}

console.log('\n' + '='.repeat(60));
console.log('\n📊 RÉSUMÉ:\n');
console.log(`   Total imports:     ${imports.length}`);
console.log(`   Erreurs:           ${errors}`);
console.log(`   Avertissements:    ${warnings}`);
console.log(`   OK:                ${imports.length - errors - warnings}`);

if (errors > 0) {
  console.log('\n❌ Des fichiers sont introuvables!\n');
  console.log('Ces imports doivent être supprimés ou les fichiers créés.\n');
  process.exit(1);
}

if (warnings > 0) {
  console.log('\n⚠️  Certains composants n\'ont pas d\'export default!\n');
  console.log('Cela peut causer l\'erreur React #130 en production.\n');
  process.exit(1);
}

console.log('\n✅ Tous les imports lazy sont valides!\n');
