#!/usr/bin/env node

/**
 * Script de Migration Complète - Toutes Tables Leads → leads
 *
 * Ce script remplace toutes les références aux anciennes tables leads par 'leads'
 * - crm_leads_enhanced
 * - exit_intent_leads
 * - taxi_prospects
 * - partner_prospects
 * - leads_backup
 * - quote_requests (partiellement)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Tables à migrer
const TABLES_TO_MIGRATE = [
  'crm_leads_enhanced',
  'exit_intent_leads',
  'taxi_prospects',
  'partner_prospects',
  'leads_backup'
];

// Répertoires à traiter
const DIRECTORIES = [
  path.join(__dirname, '../supabase/functions'),
  path.join(__dirname, '../src'),
  path.join(__dirname, '../public/api')
];

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  let changes = [];

  // Pour chaque table à migrer
  TABLES_TO_MIGRATE.forEach(oldTable => {
    const regex1 = new RegExp(`'${oldTable}'`, 'g');
    const regex2 = new RegExp(`"${oldTable}"`, 'g');
    const regex3 = new RegExp(`\`${oldTable}\``, 'g');
    const regex4 = new RegExp(`${oldTable}\\(`, 'g');

    if (content.match(regex1) || content.match(regex2) || content.match(regex3) || content.match(regex4)) {
      changes.push(oldTable);
      content = content.replace(regex1, "'leads'");
      content = content.replace(regex2, '"leads"');
      content = content.replace(regex3, '`leads`');
      content = content.replace(regex4, 'leads(');
    }
  });

  // Si le contenu a changé, écrire le fichier
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    const relativePath = path.relative(path.join(__dirname, '..'), filePath);
    console.log(`✅ ${relativePath}`);
    console.log(`   → Remplacé: ${changes.join(', ')}`);
    return { file: relativePath, changes };
  }

  return null;
}

function processDirectory(dir, results = []) {
  if (!fs.existsSync(dir)) {
    return results;
  }

  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // Ignorer node_modules et dist
      if (item === 'node_modules' || item === 'dist' || item === '.git') {
        continue;
      }
      processDirectory(fullPath, results);
    } else if (item.endsWith('.ts') || item.endsWith('.tsx') || item.endsWith('.js') || item.endsWith('.jsx') || item.endsWith('.php')) {
      const result = replaceInFile(fullPath);
      if (result) {
        results.push(result);
      }
    }
  }

  return results;
}

console.log('🔄 Migration COMPLÈTE vers table unifiée "leads"...\n');
console.log(`📦 Tables à migrer: ${TABLES_TO_MIGRATE.join(', ')}\n`);

const allResults = [];

DIRECTORIES.forEach(dir => {
  const dirName = path.basename(dir);
  console.log(`\n📁 Traitement: ${dirName}/`);
  const results = processDirectory(dir);
  allResults.push(...results);
});

console.log('\n' + '='.repeat(60));
console.log(`✨ Migration terminée: ${allResults.length} fichiers mis à jour`);
console.log('='.repeat(60));

if (allResults.length > 0) {
  console.log('\n📊 Résumé des changements:');

  const tableStats = {};
  allResults.forEach(result => {
    result.changes.forEach(table => {
      tableStats[table] = (tableStats[table] || 0) + 1;
    });
  });

  Object.entries(tableStats).forEach(([table, count]) => {
    console.log(`   • ${table}: ${count} fichier(s)`);
  });

  console.log('\n📋 Prochaines étapes:');
  console.log('1. Vérifier les changements: git diff');
  console.log('2. Tester le build: npm run build');
  console.log('3. Tester les edge functions: supabase functions serve');
  console.log('4. Déployer: supabase functions deploy');
} else {
  console.log('\n✅ Aucun fichier à migrer (déjà à jour)');
}
