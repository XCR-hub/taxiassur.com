#!/usr/bin/env node

/**
 * Script de test de la configuration IONOS
 * Vérifie que les paramètres SMTP et IMAP sont corrects
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('🧪 Test de la configuration IONOS');
console.log('==================================\n');

// Vérifier les variables d'environnement locales
console.log('📋 Variables d\'environnement locales (.env):');
console.log('  ✓ IONOS_EMAIL_USER:', process.env.IONOS_EMAIL_USER || '❌ Non défini');
console.log('  ✓ IONOS_SMTP_HOST:', process.env.IONOS_SMTP_HOST || '❌ Non défini');
console.log('  ✓ IONOS_SMTP_PORT:', process.env.IONOS_SMTP_PORT || '❌ Non défini');
console.log('  ✓ IONOS_IMAP_HOST:', process.env.IONOS_IMAP_HOST || '❌ Non défini');
console.log('  ✓ IONOS_IMAP_PORT:', process.env.IONOS_IMAP_PORT || '❌ Non défini');
console.log('');

// Vérifier les valeurs
const checks = [
  {
    name: 'Port SMTP',
    value: process.env.IONOS_SMTP_PORT,
    expected: '465',
    critical: true
  },
  {
    name: 'Host IMAP',
    value: process.env.IONOS_IMAP_HOST,
    expected: 'imap.ionos.fr',
    critical: true
  },
  {
    name: 'Port IMAP',
    value: process.env.IONOS_IMAP_PORT,
    expected: '993',
    critical: false
  },
  {
    name: 'Host SMTP',
    value: process.env.IONOS_SMTP_HOST,
    expected: 'smtp.ionos.fr',
    critical: false
  }
];

console.log('🔍 Vérification des valeurs:');
let errors = 0;
let warnings = 0;

checks.forEach(check => {
  const isCorrect = check.value === check.expected;
  const icon = isCorrect ? '✅' : (check.critical ? '❌' : '⚠️');
  const status = isCorrect ? 'OK' : `Attendu: ${check.expected}, Reçu: ${check.value || 'undefined'}`;

  console.log(`  ${icon} ${check.name}: ${status}`);

  if (!isCorrect) {
    if (check.critical) {
      errors++;
    } else {
      warnings++;
    }
  }
});

console.log('');

// Test d'envoi d'email de test
async function testEmailFunction() {
  console.log('📧 Test de l\'Edge Function send-email-ionos...');

  try {
    const testLead = {
      type: 'INSERT',
      table: 'crm_leads',
      record: {
        id: 'test-' + Date.now(),
        name: 'Test Configuration IONOS',
        email: 'test@example.com',
        phone: '0600000000',
        city: 'Paris',
        status: 'test',
        created_at: new Date().toISOString(),
        access_token: 'test-token'
      }
    };

    console.log('  🔄 Appel de la fonction...');

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/send-email-ionos`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testLead)
      }
    );

    if (response.ok) {
      const data = await response.json();
      console.log('  ✅ Fonction accessible');
      console.log('  📊 Réponse:', JSON.stringify(data, null, 2));
    } else {
      const errorText = await response.text();
      console.log('  ⚠️  Erreur HTTP:', response.status);
      console.log('  📄 Détails:', errorText);
    }
  } catch (error) {
    console.log('  ❌ Erreur lors du test:', error.message);
  }
}

// Test de synchronisation IMAP
async function testImapFunction() {
  console.log('');
  console.log('📥 Test de l\'Edge Function sync-ionos-imap-v2...');

  try {
    console.log('  🔄 Appel de la fonction...');

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/sync-ionos-imap-v2`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.ok) {
      const data = await response.json();
      console.log('  ✅ Fonction accessible');
      console.log('  📊 Réponse:', JSON.stringify(data, null, 2));
    } else {
      const errorText = await response.text();
      console.log('  ⚠️  Erreur HTTP:', response.status);
      console.log('  📄 Détails:', errorText);
    }
  } catch (error) {
    console.log('  ❌ Erreur lors du test:', error.message);
  }
}

// Résumé final
console.log('');
console.log('==================================');
if (errors > 0) {
  console.log(`❌ ${errors} erreur(s) critique(s) détectée(s)`);
  console.log('⚠️  Corrigez les erreurs avant de continuer');
  console.log('💡 Exécutez: npm run update:ionos-secrets');
} else if (warnings > 0) {
  console.log(`⚠️  ${warnings} avertissement(s)`);
  console.log('✅ Configuration utilisable mais peut être optimisée');
} else {
  console.log('✅ Configuration IONOS correcte !');
  console.log('');
  // Lancer les tests des Edge Functions
  await testEmailFunction();
  await testImapFunction();
}
console.log('==================================');
console.log('');
