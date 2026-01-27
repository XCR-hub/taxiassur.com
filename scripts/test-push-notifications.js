#!/usr/bin/env node

/**
 * Script de test pour le système de notifications push CRM
 *
 * Usage:
 *   node scripts/test-push-notifications.js
 *
 * Ce script crée des notifications de test de différents types pour tester
 * le système de push notifications en temps réel.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ VITE_SUPABASE_URL et VITE_SUPABASE_SERVICE_ROLE_KEY doivent être définis dans .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Exemples de notifications de test
const testNotifications = [
  {
    event_type: 'new_lead',
    message: '🎉 Nouveau prospect : Marie Dubois vient de s\'inscrire depuis le formulaire web !',
    priority: 'high',
    metadata: {
      lead_name: 'Marie Dubois',
      source: 'formulaire_web',
      email: 'marie.dubois@example.com'
    }
  },
  {
    event_type: 'document_uploaded',
    message: '📄 Jean Martin a uploadé son permis de conduire',
    priority: 'medium',
    metadata: {
      lead_name: 'Jean Martin',
      document_type: 'permis_conduire',
      file_name: 'permis_recto_verso.pdf'
    }
  },
  {
    event_type: 'email_received',
    message: '📧 Nouvelle réponse de Sophie Leroy concernant son devis',
    priority: 'medium',
    metadata: {
      lead_name: 'Sophie Leroy',
      subject: 'Re: Devis assurance taxi Paris',
      from: 'sophie.leroy@example.com'
    }
  },
  {
    event_type: 'status_change',
    message: '🔄 Pierre Dupont est passé de "Nouveau" à "Documents en cours"',
    priority: 'low',
    metadata: {
      lead_name: 'Pierre Dupont',
      old_status: 'Nouveau lead',
      new_status: 'Documents en cours'
    }
  },
  {
    event_type: 'ai_decision',
    message: '🤖 L\'IA recommande de contacter Julie Bernard (score : 95/100)',
    priority: 'high',
    metadata: {
      lead_name: 'Julie Bernard',
      ai_score: 95,
      reason: 'Profil très qualifié, forte intention d\'achat'
    }
  },
  {
    event_type: 'quote_requested',
    message: '💰 Demande de devis urgente : Luc Petit souhaite souscrire rapidement',
    priority: 'urgent',
    metadata: {
      lead_name: 'Luc Petit',
      urgency: 'high',
      requested_coverage: 'Tous risques'
    }
  },
  {
    event_type: 'document_validated',
    message: '✅ Tous les documents de Alice Moreau ont été validés !',
    priority: 'low',
    metadata: {
      lead_name: 'Alice Moreau',
      validated_count: 7,
      completion_rate: 100
    }
  }
];

async function createTestNotifications() {
  console.log('🔔 Création de notifications de test...\n');

  // Récupérer un lead existant (ou null)
  const { data: leads } = await supabase
    .from('crm_leads')
    .select('id')
    .limit(1);

  const leadId = leads && leads.length > 0 ? leads[0].id : null;

  for (let i = 0; i < testNotifications.length; i++) {
    const notification = testNotifications[i];

    console.log(`${i + 1}. Création de "${notification.event_type}"...`);

    const { data, error } = await supabase
      .from('crm_event_notifications')
      .insert({
        ...notification,
        lead_id: leadId
      })
      .select()
      .single();

    if (error) {
      console.error(`   ❌ Erreur: ${error.message}`);
    } else {
      console.log(`   ✅ Créée avec succès (ID: ${data.id})`);
      console.log(`   📝 Message: ${notification.message}`);
      console.log(`   🎯 Priorité: ${notification.priority}\n`);
    }

    // Attendre 2 secondes entre chaque notification pour voir les animations
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n✨ Toutes les notifications de test ont été créées !');
  console.log('👀 Ouvrez le CRM pour les voir apparaître en temps réel.');
}

async function createSingleNotification(type = 'new_lead') {
  const notification = testNotifications.find(n => n.event_type === type);

  if (!notification) {
    console.error(`❌ Type de notification "${type}" inconnu`);
    return;
  }

  console.log(`🔔 Création d'une notification "${type}"...\n`);

  const { data: leads } = await supabase
    .from('crm_leads')
    .select('id')
    .limit(1);

  const leadId = leads && leads.length > 0 ? leads[0].id : null;

  const { data, error } = await supabase
    .from('crm_event_notifications')
    .insert({
      ...notification,
      lead_id: leadId
    })
    .select()
    .single();

  if (error) {
    console.error(`❌ Erreur: ${error.message}`);
  } else {
    console.log(`✅ Créée avec succès !`);
    console.log(`📝 Message: ${notification.message}`);
    console.log(`🎯 Priorité: ${notification.priority}`);
  }
}

async function listNotificationTypes() {
  console.log('📋 Types de notifications disponibles:\n');
  testNotifications.forEach((notif, index) => {
    console.log(`${index + 1}. ${notif.event_type}`);
    console.log(`   Message: ${notif.message}`);
    console.log(`   Priorité: ${notif.priority}\n`);
  });
}

async function clearAllNotifications() {
  console.log('🗑️  Suppression de toutes les notifications...\n');

  const { error } = await supabase
    .from('crm_event_notifications')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (error) {
    console.error(`❌ Erreur: ${error.message}`);
  } else {
    console.log('✅ Toutes les notifications ont été supprimées');
  }
}

// CLI
const command = process.argv[2];
const arg = process.argv[3];

switch (command) {
  case 'all':
    await createTestNotifications();
    break;

  case 'one':
    await createSingleNotification(arg || 'new_lead');
    break;

  case 'list':
    await listNotificationTypes();
    break;

  case 'clear':
    await clearAllNotifications();
    break;

  default:
    console.log(`
🔔 Script de Test - Notifications Push CRM

Usage:
  node scripts/test-push-notifications.js [command] [options]

Commands:
  all           Créer toutes les notifications de test (avec délai de 2s)
  one [type]    Créer une seule notification de type spécifié
  list          Lister tous les types de notifications disponibles
  clear         Supprimer toutes les notifications

Exemples:
  node scripts/test-push-notifications.js all
  node scripts/test-push-notifications.js one new_lead
  node scripts/test-push-notifications.js one document_uploaded
  node scripts/test-push-notifications.js list
  node scripts/test-push-notifications.js clear

Types disponibles:
  - new_lead
  - document_uploaded
  - email_received
  - status_change
  - ai_decision
  - quote_requested
  - document_validated
    `);
    process.exit(0);
}

process.exit(0);
