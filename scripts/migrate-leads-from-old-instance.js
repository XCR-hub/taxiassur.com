import { createClient } from '@supabase/supabase-js';

// ANCIENNE INSTANCE (qiavtxpaznxpttkdaevy)
const OLD_SUPABASE_URL = 'https://qiavtxpaznxpttkdaevy.supabase.co';
const OLD_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpYXZ0eHBhem54cHR0a2RhZXZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5Njg1ODUsImV4cCI6MjA4NjU0NDU4NX0.FvEbDxwQy8tsTgeGr4skoJh2KXWJldlSm1RIhoDPY5g';

// NOUVELLE INSTANCE (drohhxrkoequjphvabvq)
const NEW_SUPABASE_URL = 'https://drohhxrkoequjphvabvq.supabase.co';
const NEW_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyb2hoeHJrb2VxdWpwaHZhYnZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODM3NjAsImV4cCI6MjA3NTM1OTc2MH0.LP9fh10fY0nRDjpG4VW2yGZ5sT4BkiDalox8ToMbMlg';

// Clients Supabase
const oldSupabase = createClient(OLD_SUPABASE_URL, OLD_SUPABASE_ANON_KEY);
const newSupabase = createClient(NEW_SUPABASE_URL, NEW_SUPABASE_ANON_KEY);

async function main() {
  console.log('🔍 VÉRIFICATION DES INSTANCES SUPABASE\n');
  console.log('=' .repeat(60));

  // =========================================
  // ÉTAPE 1: VÉRIFIER L'ANCIENNE INSTANCE
  // =========================================
  console.log('\n📊 ANCIENNE INSTANCE (qiavtxpaznxpttkdaevy)');
  console.log('-'.repeat(60));

  let oldLeads = [];
  try {
    const { data, error, count } = await oldSupabase
      .from('crm_leads')
      .select('*', { count: 'exact' });

    if (error) {
      console.log(`❌ Erreur: ${error.message}`);
      console.log('   Tentative avec la table "leads"...');

      const { data: leadsData, error: leadsError, count: leadsCount } = await oldSupabase
        .from('leads')
        .select('*', { count: 'exact' });

      if (leadsError) {
        console.log(`❌ Erreur sur "leads": ${leadsError.message}`);
      } else {
        oldLeads = leadsData || [];
        console.log(`✅ Trouvé ${leadsCount} leads dans la table "leads"`);
      }
    } else {
      oldLeads = data || [];
      console.log(`✅ Trouvé ${count} leads dans la table "crm_leads"`);
    }
  } catch (err) {
    console.log(`❌ Erreur de connexion: ${err.message}`);
  }

  // =========================================
  // ÉTAPE 2: VÉRIFIER LA NOUVELLE INSTANCE
  // =========================================
  console.log('\n📊 NOUVELLE INSTANCE (drohhxrkoequjphvabvq)');
  console.log('-'.repeat(60));

  let newLeads = [];
  try {
    const { data, error, count } = await newSupabase
      .from('crm_leads')
      .select('*', { count: 'exact' });

    if (error) {
      console.log(`❌ Erreur: ${error.message}`);
    } else {
      newLeads = data || [];
      console.log(`✅ Trouvé ${count} leads dans la table "crm_leads"`);
    }
  } catch (err) {
    console.log(`❌ Erreur de connexion: ${err.message}`);
  }

  // =========================================
  // ÉTAPE 3: AFFICHER LE RÉSUMÉ
  // =========================================
  console.log('\n' + '='.repeat(60));
  console.log('📋 RÉSUMÉ DE LA SITUATION');
  console.log('='.repeat(60));
  console.log(`Ancienne instance: ${oldLeads.length} leads`);
  console.log(`Nouvelle instance: ${newLeads.length} leads`);
  console.log('');

  if (oldLeads.length === 0) {
    console.log('✅ Pas de leads à migrer - l\'ancienne instance est vide');
    return;
  }

  // =========================================
  // ÉTAPE 4: AFFICHER LES DÉTAILS DES LEADS
  // =========================================
  console.log('\n📝 DÉTAILS DES LEADS À MIGRER');
  console.log('-'.repeat(60));

  oldLeads.forEach((lead, index) => {
    console.log(`${index + 1}. ${lead.email || 'Sans email'} - ${lead.status || 'Sans statut'}`);
    if (lead.nom || lead.prenom) {
      console.log(`   Nom: ${lead.prenom || ''} ${lead.nom || ''}`);
    }
    if (lead.telephone) {
      console.log(`   Tél: ${lead.telephone}`);
    }
  });

  // =========================================
  // ÉTAPE 5: MIGRATION
  // =========================================
  console.log('\n' + '='.repeat(60));
  console.log('🚀 MIGRATION DES LEADS');
  console.log('='.repeat(60));

  let migratedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const lead of oldLeads) {
    try {
      // Vérifier si le lead existe déjà (par email)
      if (lead.email) {
        const { data: existing } = await newSupabase
          .from('crm_leads')
          .select('id')
          .eq('email', lead.email)
          .maybeSingle();

        if (existing) {
          console.log(`⏭️  Lead déjà existant: ${lead.email}`);
          skippedCount++;
          continue;
        }
      }

      // Préparer les données pour la migration
      const leadData = {
        email: lead.email,
        nom: lead.nom,
        prenom: lead.prenom,
        telephone: lead.telephone,
        status: lead.status || 'nouveau_lead',
        ville: lead.ville,
        code_postal: lead.code_postal,
        type_vehicule: lead.type_vehicule,
        immatriculation: lead.immatriculation,
        notes: lead.notes,
        source: lead.source || 'migration',
        created_at: lead.created_at,
        updated_at: lead.updated_at
      };

      // Supprimer les champs undefined
      Object.keys(leadData).forEach(key => {
        if (leadData[key] === undefined) {
          delete leadData[key];
        }
      });

      // Insérer dans la nouvelle instance
      const { error } = await newSupabase
        .from('crm_leads')
        .insert(leadData);

      if (error) {
        console.log(`❌ Erreur pour ${lead.email}: ${error.message}`);
        errorCount++;
      } else {
        console.log(`✅ Migré: ${lead.email || 'Lead sans email'}`);
        migratedCount++;
      }
    } catch (err) {
      console.log(`❌ Erreur inattendue pour ${lead.email}: ${err.message}`);
      errorCount++;
    }
  }

  // =========================================
  // ÉTAPE 6: RAPPORT FINAL
  // =========================================
  console.log('\n' + '='.repeat(60));
  console.log('📊 RAPPORT FINAL DE MIGRATION');
  console.log('='.repeat(60));
  console.log(`✅ Leads migrés avec succès: ${migratedCount}`);
  console.log(`⏭️  Leads ignorés (déjà existants): ${skippedCount}`);
  console.log(`❌ Erreurs: ${errorCount}`);
  console.log(`📈 Total traité: ${oldLeads.length}`);
  console.log('');

  if (migratedCount > 0) {
    console.log('🎉 Migration terminée avec succès !');
    console.log('\n📌 PROCHAINES ÉTAPES:');
    console.log('1. Vérifier les leads dans le backoffice');
    console.log('2. Tester la création de nouveaux leads');
    console.log('3. Vérifier les emails de notification');
  }
}

// Exécuter le script
main().catch(console.error);
