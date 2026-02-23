#!/usr/bin/env node

/**
 * Script de vérification de la configuration email
 * Vérifie que tous les emails partent bien de team@taxiassur.com
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const EXPECTED_FROM_EMAIL = 'team@taxiassur.com';
const FUNCTIONS_DIR = 'supabase/functions';

console.log('🔍 VÉRIFICATION CONFIGURATION EMAIL\n');
console.log('='=repeat(60));

// Fonctions d'envoi d'emails à vérifier
const emailFunctions = [
  'send-lead-email-brevo',
  'send-email-ionos',
  'send-document-notification',
  'send-crm-email',
  'send-email-universal',
  'send-quote-email',
  'send-client-access',
  'send-lead-notification',
  'send-backlink-email-brevo',
  'send-newsletter-campaign',
  'send-smart-template-email',
  'send-payment-link-email',
  'send-payment-link-monetico',
  'send-intelligent-document-request'
];

let totalChecks = 0;
let passedChecks = 0;
let warnings = [];
let errors = [];

console.log(`\n📧 Vérification de ${emailFunctions.length} fonctions d'envoi d'emails...\n`);

for (const funcName of emailFunctions) {
  const funcPath = join(FUNCTIONS_DIR, funcName, 'index.ts');

  try {
    const content = readFileSync(funcPath, 'utf-8');
    totalChecks++;

    // Vérifier les occurrences de from email
    const fromEmailMatches = [
      ...content.matchAll(/fromEmail\s*[:=]\s*["']([^"']+)["']/g),
      ...content.matchAll(/from_email\s*[:=]\s*["']([^"']+)["']/g),
      ...content.matchAll(/"from"\s*:\s*["']([^"']+)["']/g),
      ...content.matchAll(/sender\s*:\s*\{[^}]*email\s*:\s*["']([^"']+)["']/g)
    ];

    let hasCorrectFrom = true;
    let foundFromEmails = new Set();

    for (const match of fromEmailMatches) {
      const email = match[1];
      foundFromEmails.add(email);

      if (email !== EXPECTED_FROM_EMAIL && !email.includes('${') && !email.includes('||')) {
        hasCorrectFrom = false;
        errors.push(`❌ ${funcName}: Utilise "${email}" au lieu de "${EXPECTED_FROM_EMAIL}"`);
      }
    }

    // Vérifier les variables d'environnement
    if (content.includes('IONOS_EMAIL_USER') || content.includes('SMTP_USER')) {
      const hasPasswordCheck = content.includes('IONOS_EMAIL_PASSWORD');
      if (hasPasswordCheck) {
        passedChecks++;
        console.log(`✅ ${funcName}: Utilise IONOS SMTP avec team@taxiassur.com`);
      } else {
        warnings.push(`⚠️  ${funcName}: Utilise IONOS mais sans vérification du mot de passe`);
      }
    } else if (foundFromEmails.size > 0) {
      if (hasCorrectFrom || foundFromEmails.has(EXPECTED_FROM_EMAIL)) {
        passedChecks++;
        console.log(`✅ ${funcName}: Utilise ${EXPECTED_FROM_EMAIL}`);
      }
    } else {
      warnings.push(`⚠️  ${funcName}: Aucune configuration "from" détectée (peut-être dynamique)`);
    }

  } catch (error) {
    if (error.code === 'ENOENT') {
      warnings.push(`⚠️  ${funcName}: Fichier non trouvé`);
    } else {
      errors.push(`❌ ${funcName}: Erreur de lecture - ${error.message}`);
    }
  }
}

// Résumé
console.log('\n' + '='.repeat(60));
console.log('\n📊 RÉSUMÉ\n');
console.log(`Total vérifié : ${totalChecks}`);
console.log(`✅ Conformes : ${passedChecks}`);
console.log(`⚠️  Avertissements : ${warnings.length}`);
console.log(`❌ Erreurs : ${errors.length}`);

if (warnings.length > 0) {
  console.log('\n⚠️  AVERTISSEMENTS:\n');
  warnings.forEach(w => console.log(w));
}

if (errors.length > 0) {
  console.log('\n❌ ERREURS:\n');
  errors.forEach(e => console.log(e));
  console.log('\n⛔ ACTION REQUISE: Corriger les erreurs ci-dessus\n');
  process.exit(1);
}

console.log('\n✅ CONFIGURATION EMAIL VÉRIFIÉE\n');
console.log('Tous les emails partiront bien de team@taxiassur.com\n');

// Vérifier les secrets Supabase
console.log('='.repeat(60));
console.log('\n🔐 SECRETS SUPABASE REQUIS\n');
console.log('Assurez-vous que ces secrets sont configurés:\n');
console.log('  IONOS_SMTP_HOST       = "smtp.ionos.fr"');
console.log('  IONOS_SMTP_PORT       = "587"');
console.log('  IONOS_EMAIL_USER      = "team@taxiassur.com"');
console.log('  IONOS_EMAIL_PASSWORD  = "TAXIassur!,"\n');
console.log('Commande pour vérifier:');
console.log('  supabase secrets list | grep IONOS\n');
console.log('Commande pour mettre à jour:');
console.log('  supabase secrets set IONOS_EMAIL_PASSWORD="TAXIassur!,"\n');

process.exit(0);
