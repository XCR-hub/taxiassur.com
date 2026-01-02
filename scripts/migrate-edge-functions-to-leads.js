#!/usr/bin/env node

/**
 * Script de Migration Edge Functions - crm_leads_enhanced → leads
 *
 * Ce script remplace toutes les références à 'crm_leads_enhanced' par 'leads'
 * dans tous les fichiers Edge Functions Supabase
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FUNCTIONS_DIR = path.join(__dirname, '../supabase/functions');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;

  // Remplacer toutes les occurrences
  content = content.replace(/'crm_leads_enhanced'/g, "'leads'");
  content = content.replace(/"crm_leads_enhanced"/g, '"leads"');
  content = content.replace(/`crm_leads_enhanced`/g, '`leads`');

  // Remplacer dans les jointures SQL style
  content = content.replace(/crm_leads_enhanced\(/g, 'leads(');

  // Si le contenu a changé, écrire le fichier
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Migré: ${path.relative(FUNCTIONS_DIR, filePath)}`);
    return 1;
  }

  return 0;
}

function processDirectory(dir) {
  let count = 0;

  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      count += processDirectory(fullPath);
    } else if (item.endsWith('.ts') || item.endsWith('.js')) {
      count += replaceInFile(fullPath);
    }
  }

  return count;
}

console.log('🔄 Migration des Edge Functions vers table "leads"...\n');

if (!fs.existsSync(FUNCTIONS_DIR)) {
  console.error('❌ Dossier supabase/functions introuvable');
  process.exit(1);
}

const filesUpdated = processDirectory(FUNCTIONS_DIR);

console.log(`\n✨ Migration terminée: ${filesUpdated} fichiers mis à jour`);
console.log('\n📋 Prochaines étapes:');
console.log('1. Vérifiez les changements: git diff supabase/functions');
console.log('2. Testez localement: supabase functions serve');
console.log('3. Déployez: supabase functions deploy');
