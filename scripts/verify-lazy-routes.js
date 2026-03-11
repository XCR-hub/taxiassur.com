#!/usr/bin/env node

/**
 * Vérifie que tous les imports lazy du router pointent vers des fichiers existants
 * Identifie les erreurs 5xx potentielles causées par des composants manquants
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// Lire le fichier router.tsx
const routerPath = path.join(projectRoot, 'src', 'router.tsx');
const routerContent = fs.readFileSync(routerPath, 'utf-8');

// Extraire tous les imports lazy
const lazyImportRegex = /const\s+(\w+)\s*=\s*lazy\(\(\)\s*=>\s*import\(['"](.+?)['"]\)\);/g;
const matches = [...routerContent.matchAll(lazyImportRegex)];

console.log('\n🔍 VÉRIFICATION DES ROUTES LAZY-LOADED\n');
console.log('=' .repeat(60));

let errors = 0;
let warnings = 0;
const results = {
  valid: [],
  missing: [],
  suspicious: []
};

matches.forEach(([fullMatch, componentName, importPath]) => {
  // Résoudre le chemin relatif
  const resolvedPath = path.join(projectRoot, 'src', importPath + '.tsx');
  const exists = fs.existsSync(resolvedPath);

  if (!exists) {
    console.log(`❌ MANQUANT: ${componentName}`);
    console.log(`   Import: ${importPath}`);
    console.log(`   Chemin: ${resolvedPath}\n`);
    errors++;
    results.missing.push({ componentName, importPath, resolvedPath });
  } else {
    // Vérifier que le fichier n'est pas vide
    const content = fs.readFileSync(resolvedPath, 'utf-8');
    if (content.length < 100) {
      console.log(`⚠️  SUSPECT: ${componentName} (fichier très court)`);
      console.log(`   Taille: ${content.length} octets\n`);
      warnings++;
      results.suspicious.push({ componentName, importPath, size: content.length });
    } else {
      results.valid.push({ componentName, importPath });
    }
  }
});

console.log('=' .repeat(60));
console.log(`\n📊 RÉSULTATS:`);
console.log(`✅ Routes valides: ${results.valid.length}`);
console.log(`❌ Routes manquantes: ${results.missing.length}`);
console.log(`⚠️  Routes suspectes: ${results.suspicious.length}`);

if (results.missing.length > 0) {
  console.log('\n🔴 COMPOSANTS MANQUANTS (cause probable d\'erreurs 5xx):');
  results.missing.forEach(({ componentName, importPath }) => {
    console.log(`  - ${componentName}: ${importPath}`);
  });
}

if (results.suspicious.length > 0) {
  console.log('\n⚠️  COMPOSANTS SUSPECTS (potentiel problème):');
  results.suspicious.forEach(({ componentName, size }) => {
    console.log(`  - ${componentName}: ${size} octets`);
  });
}

// Sauvegarder le rapport
const reportPath = path.join(projectRoot, 'LAZY_ROUTES_REPORT.json');
fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
console.log(`\n💾 Rapport sauvegardé: ${reportPath}`);

if (errors > 0) {
  console.log('\n❌ ERREURS DÉTECTÉES! Les routes manquantes vont causer des erreurs 5xx.');
  process.exit(1);
}

console.log('\n✅ Toutes les routes sont valides!\n');
