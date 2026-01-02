#!/usr/bin/env node

/**
 * Script de vérification avant déploiement
 * Vérifie que les bons fichiers sont présents dans /dist
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, '..', 'dist');

console.log('🔍 Vérification du build avant déploiement...\n');

const checks = {
  passed: [],
  failed: [],
  warnings: []
};

// 1. Vérifier que /dist existe
if (!fs.existsSync(distDir)) {
  checks.failed.push('❌ Le dossier /dist n\'existe pas. Exécutez: npm run build');
  console.log('❌ ÉCHEC: /dist manquant\n');
  process.exit(1);
}

checks.passed.push('✅ Dossier /dist existe');

// 2. Vérifier index.html
const indexPath = path.join(distDir, 'index.html');
if (!fs.existsSync(indexPath)) {
  checks.failed.push('❌ index.html manquant');
} else {
  const indexContent = fs.readFileSync(indexPath, 'utf-8');

  // Vérifier les hash corrects
  const expectedHashes = {
    'vendor-supabase-Cnygdk3Q.js': false,
    'backoffice-core-CtnYLgZA.js': false,
    'index-B8w1-JBh.js': false
  };

  for (const [file, found] of Object.entries(expectedHashes)) {
    if (indexContent.includes(file)) {
      expectedHashes[file] = true;
      checks.passed.push(`✅ ${file} référencé dans index.html`);
    }
  }

  // Vérifier que les anciens hash ne sont PAS présents
  const oldHashes = [
    'vendor-supabase-h8YbU8g5.js',
    'backoffice-core-BpJ2pi-U.js',
    'index-UscTyJrB.js'
  ];

  for (const oldFile of oldHashes) {
    if (indexContent.includes(oldFile)) {
      checks.failed.push(`❌ ANCIEN HASH trouvé dans index.html: ${oldFile}`);
    }
  }

  // Vérifier si tous les hash attendus sont présents
  const missingHashes = Object.entries(expectedHashes)
    .filter(([, found]) => !found)
    .map(([file]) => file);

  if (missingHashes.length > 0) {
    checks.warnings.push(`⚠️ Hash manquants dans index.html: ${missingHashes.join(', ')}`);
  }
}

// 3. Vérifier que les fichiers existent
const assetsDir = path.join(distDir, 'assets');
if (!fs.existsSync(assetsDir)) {
  checks.failed.push('❌ Dossier /dist/assets manquant');
} else {
  const files = fs.readdirSync(assetsDir);

  const expectedFiles = [
    'vendor-supabase-Cnygdk3Q.js',
    'backoffice-core-CtnYLgZA.js'
  ];

  for (const file of expectedFiles) {
    if (files.includes(file)) {
      const filePath = path.join(assetsDir, file);
      const stats = fs.statSync(filePath);
      const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
      checks.passed.push(`✅ ${file} existe (${sizeMB} MB)`);
    } else {
      checks.failed.push(`❌ ${file} manquant dans /assets`);
    }
  }

  // Vérifier qu'aucun ancien fichier n'existe
  const oldFiles = [
    'vendor-supabase-h8YbU8g5.js',
    'backoffice-core-BpJ2pi-U.js'
  ];

  for (const oldFile of oldFiles) {
    if (files.includes(oldFile)) {
      checks.failed.push(`❌ ANCIEN fichier présent: ${oldFile} (doit être supprimé)`);
    }
  }
}

// 4. Vérifier .htaccess
const htaccessPath = path.join(distDir, '.htaccess');
if (!fs.existsSync(htaccessPath)) {
  checks.warnings.push('⚠️ .htaccess manquant (recommandé pour cache-control)');
} else {
  const htaccessContent = fs.readFileSync(htaccessPath, 'utf-8');
  if (htaccessContent.includes('Cache-Control')) {
    checks.passed.push('✅ .htaccess contient Cache-Control headers');
  } else {
    checks.warnings.push('⚠️ .htaccess ne contient pas Cache-Control');
  }
}

// 5. Vérifier les fichiers essentiels
const essentialFiles = [
  'favicon.ico',
  'robots.txt',
  'sitemap.xml'
];

for (const file of essentialFiles) {
  const filePath = path.join(distDir, file);
  if (fs.existsSync(filePath)) {
    checks.passed.push(`✅ ${file} présent`);
  } else {
    checks.warnings.push(`⚠️ ${file} manquant`);
  }
}

// Afficher les résultats
console.log('\n📊 RÉSULTATS DE VÉRIFICATION\n');
console.log('═══════════════════════════════════════\n');

if (checks.passed.length > 0) {
  console.log('✅ RÉUSSITES:');
  checks.passed.forEach(msg => console.log(`   ${msg}`));
  console.log();
}

if (checks.warnings.length > 0) {
  console.log('⚠️  AVERTISSEMENTS:');
  checks.warnings.forEach(msg => console.log(`   ${msg}`));
  console.log();
}

if (checks.failed.length > 0) {
  console.log('❌ ÉCHECS:');
  checks.failed.forEach(msg => console.log(`   ${msg}`));
  console.log();
}

console.log('═══════════════════════════════════════\n');

// Résumé
const total = checks.passed.length + checks.warnings.length + checks.failed.length;
console.log(`📈 Total: ${total} vérifications`);
console.log(`   ✅ Réussies: ${checks.passed.length}`);
console.log(`   ⚠️  Avertissements: ${checks.warnings.length}`);
console.log(`   ❌ Échecs: ${checks.failed.length}\n`);

// Recommandations
if (checks.failed.length === 0) {
  console.log('🎉 BUILD PRÊT POUR LE DÉPLOIEMENT!\n');
  console.log('📦 Prochaines étapes:');
  console.log('   1. Supprimer les anciens fichiers sur IONOS:');
  console.log('      - vendor-supabase-h8YbU8g5.js');
  console.log('      - backoffice-core-BpJ2pi-U.js');
  console.log('   2. Uploader TOUT le contenu de /dist vers /public_html');
  console.log('   3. Vérifier sur https://taxiassur.com/backoffice');
  console.log('   4. Vider le cache navigateur (Ctrl+Shift+Delete)');
  console.log('\n📖 Voir: DEPLOY_IONOS_URGENT.md pour instructions détaillées\n');
  process.exit(0);
} else {
  console.log('⚠️  CORRECTIONS NÉCESSAIRES AVANT DÉPLOIEMENT\n');
  console.log('🔧 Actions:');
  if (checks.failed.some(msg => msg.includes('dist'))) {
    console.log('   → Exécutez: npm run build');
  }
  console.log('   → Corrigez les erreurs ci-dessus');
  console.log('   → Relancez: node scripts/verify-deployment.js\n');
  process.exit(1);
}
