#!/usr/bin/env node

/**
 * Script de test pour l'envoi d'email d'accès prospect
 *
 * Usage:
 *   node scripts/test-email-prospect-access.js <lead_id>
 *   node scripts/test-email-prospect-access.js --check-secrets
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement manquantes:');
  console.error('   VITE_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('   VITE_SUPABASE_ANON_KEY:', supabaseKey ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSecrets() {
  console.log('\n🔍 Vérification des secrets Supabase...\n');

  const secretsToCheck = [
    'IONOS_SMTP_HOST',
    'IONOS_SMTP_PORT',
    'IONOS_EMAIL_USER',
    'IONOS_EMAIL_PASSWORD',
    'IONOS_SMTP_PASSWORD'
  ];

  console.log('Secrets à vérifier:');
  secretsToCheck.forEach(secret => {
    console.log(`  - ${secret}`);
  });

  console.log('\n⚠️  Note: Impossible de lire les secrets depuis le frontend');
  console.log('    Vérifiez manuellement dans Supabase Dashboard:');
  console.log('    Settings → Edge Functions → Secrets\n');

  console.log('Configuration attendue:');
  console.log('  IONOS_SMTP_HOST=smtp.ionos.fr');
  console.log('  IONOS_SMTP_PORT=465');
  console.log('  IONOS_EMAIL_USER=team@taxiassur.com');
  console.log('  IONOS_EMAIL_PASSWORD=<votre_mot_de_passe>');
  console.log('  OU');
  console.log('  IONOS_SMTP_PASSWORD=<votre_mot_de_passe>\n');
}

async function testEmailSending(leadId) {
  console.log('\n📧 Test d\'envoi d\'email d\'accès prospect\n');
  console.log('Lead ID:', leadId);

  // 1. Vérifier que le lead existe
  console.log('\n1️⃣  Vérification du lead...');
  const { data: lead, error: leadError } = await supabase
    .from('crm_leads')
    .select('id, first_name, last_name, email, phone')
    .eq('id', leadId)
    .maybeSingle();

  if (leadError) {
    console.error('❌ Erreur lors de la récupération du lead:', leadError.message);
    process.exit(1);
  }

  if (!lead) {
    console.error('❌ Lead introuvable avec l\'ID:', leadId);
    process.exit(1);
  }

  console.log('✅ Lead trouvé:');
  console.log('   Nom:', lead.first_name, lead.last_name);
  console.log('   Email:', lead.email);
  console.log('   Téléphone:', lead.phone || 'Non renseigné');

  if (!lead.email) {
    console.error('❌ Le lead n\'a pas d\'email configuré');
    process.exit(1);
  }

  // 2. Appeler la fonction Edge
  console.log('\n2️⃣  Envoi de l\'email via Edge Function...');
  console.log('   Fonction: send-client-access');
  console.log('   Destinataire:', lead.email);

  const { data, error } = await supabase.functions.invoke('send-client-access', {
    body: {
      lead_id: leadId,
      email: lead.email,
      first_name: lead.first_name,
      last_name: lead.last_name
    }
  });

  if (error) {
    console.error('\n❌ Erreur Edge Function:');
    console.error('   Type:', error.name);
    console.error('   Message:', error.message);
    console.error('   Contexte:', JSON.stringify(error.context, null, 2));

    console.log('\n💡 Actions à effectuer:');
    console.log('   1. Vérifier les secrets SMTP dans Supabase Dashboard');
    console.log('   2. Consulter les logs de la fonction send-client-access');
    console.log('   3. Vérifier que le port SMTP est 465 (SSL)');
    console.log('   4. Exécuter: node scripts/test-email-prospect-access.js --check-secrets\n');

    process.exit(1);
  }

  if (!data || !data.success) {
    console.error('\n❌ Échec de l\'envoi:');
    console.error('   Réponse:', JSON.stringify(data, null, 2));
    process.exit(1);
  }

  console.log('\n✅ Email envoyé avec succès !');
  console.log('   Lien d\'accès:', data.client_space_link);

  // 3. Vérifier l'interaction créée
  console.log('\n3️⃣  Vérification de l\'interaction créée...');
  const { data: interactions, error: interactionError } = await supabase
    .from('crm_interactions')
    .select('*')
    .eq('lead_id', leadId)
    .eq('type', 'email')
    .eq('direction', 'outbound')
    .order('created_at', { ascending: false })
    .limit(1);

  if (interactionError) {
    console.log('⚠️  Impossible de vérifier l\'interaction:', interactionError.message);
  } else if (!interactions || interactions.length === 0) {
    console.log('⚠️  Aucune interaction trouvée (peut être normale si RLS restrictif)');
  } else {
    console.log('✅ Interaction créée:');
    console.log('   Sujet:', interactions[0].subject);
    console.log('   Date:', new Date(interactions[0].created_at).toLocaleString('fr-FR'));
  }

  console.log('\n🎉 Test réussi ! Le prospect devrait recevoir l\'email sous peu.\n');
}

// Main
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('Usage:');
  console.log('  node scripts/test-email-prospect-access.js <lead_id>');
  console.log('  node scripts/test-email-prospect-access.js --check-secrets');
  console.log('\nExemples:');
  console.log('  node scripts/test-email-prospect-access.js 123e4567-e89b-12d3-a456-426614174000');
  console.log('  node scripts/test-email-prospect-access.js --check-secrets');
  process.exit(0);
}

if (args[0] === '--check-secrets') {
  checkSecrets();
} else {
  const leadId = args[0];
  testEmailSending(leadId);
}
