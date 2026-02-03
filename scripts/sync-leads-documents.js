import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import readline from 'readline';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Variables d\'environnement manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function syncDocuments(dryRun = true) {
  console.log('\n========================================');
  console.log('SYNCHRONISATION DES DOCUMENTS');
  console.log(dryRun ? '(MODE TEST - AUCUNE MODIFICATION)' : '(MODE RÉEL - MODIFICATIONS APPLIQUÉES)');
  console.log('========================================\n');

  // 1. Récupérer les documents prospect
  const { data: prospectDocs, error: prospectError } = await supabase
    .from('prospect_documents')
    .select('*');

  if (prospectError) {
    console.error('Erreur lors de la récupération des documents prospect:', prospectError);
    return;
  }

  console.log(`Trouvé ${prospectDocs?.length || 0} documents dans prospect_documents\n`);

  // 2. Récupérer les documents CRM existants
  const { data: existingCrmDocs, error: crmError } = await supabase
    .from('crm_lead_documents')
    .select('lead_id, document_type, file_name');

  const existingDocsMap = new Map();
  existingCrmDocs?.forEach(doc => {
    const key = `${doc.lead_id}-${doc.document_type}-${doc.file_name}`;
    existingDocsMap.set(key, true);
  });

  console.log(`Trouvé ${existingCrmDocs?.length || 0} documents dans crm_lead_documents\n`);

  // 3. Préparer les migrations
  const toMigrate = [];
  const skipped = [];

  for (const doc of prospectDocs || []) {
    const key = `${doc.lead_id}-${doc.document_type}-${doc.file_name}`;

    // Vérifier si le lead existe
    const { data: leadExists } = await supabase
      .from('crm_leads')
      .select('id')
      .eq('id', doc.lead_id)
      .single();

    if (!leadExists) {
      skipped.push({
        file_name: doc.file_name,
        reason: 'Lead inexistant',
        lead_id: doc.lead_id
      });
      continue;
    }

    // Vérifier si le document existe déjà
    if (existingDocsMap.has(key)) {
      skipped.push({
        file_name: doc.file_name,
        reason: 'Déjà existant dans crm_lead_documents',
        lead_id: doc.lead_id
      });
      continue;
    }

    // Préparer la migration
    toMigrate.push({
      lead_id: doc.lead_id,
      document_type: doc.document_type || 'autre',
      file_name: doc.file_name,
      file_path: doc.file_path || doc.storage_path || '',
      file_size: doc.file_size || 0,
      mime_type: doc.mime_type || 'application/octet-stream',
      status: doc.validated ? 'validated' : 'pending',
      uploaded_by: 'prospect',
      uploaded_at: doc.uploaded_at || doc.created_at,
      notes: doc.notes || null,
      metadata: doc.metadata || {}
    });
  }

  console.log(`Documents à migrer: ${toMigrate.length}`);
  console.log(`Documents ignorés: ${skipped.length}\n`);

  if (skipped.length > 0) {
    console.log('Raisons d\'ignorance:');
    const reasons = {};
    skipped.forEach(s => {
      reasons[s.reason] = (reasons[s.reason] || 0) + 1;
    });
    Object.entries(reasons).forEach(([reason, count]) => {
      console.log(`  - ${reason}: ${count}`);
    });
    console.log();
  }

  if (toMigrate.length > 0) {
    console.log('Aperçu des documents à migrer (5 premiers):');
    toMigrate.slice(0, 5).forEach((doc, i) => {
      console.log(`  ${i + 1}. ${doc.file_name} (${doc.document_type}) - ${doc.status}`);
    });
    console.log();

    if (!dryRun) {
      console.log('Migration en cours...');

      let migrated = 0;
      let errors = 0;

      for (const doc of toMigrate) {
        const { error } = await supabase
          .from('crm_lead_documents')
          .insert(doc);

        if (error) {
          console.error(`  ❌ Erreur pour ${doc.file_name}:`, error.message);
          errors++;
        } else {
          migrated++;
          if (migrated % 10 === 0) {
            console.log(`  ✓ ${migrated}/${toMigrate.length} migrés...`);
          }
        }
      }

      console.log(`\n✓ Migration terminée: ${migrated} documents migrés, ${errors} erreurs`);
    } else {
      console.log('⚠️  MODE TEST activé - aucune modification effectuée');
      console.log('   Relancez avec --real pour appliquer les modifications');
    }
  } else {
    console.log('✓ Aucun document à migrer');
  }
}

async function fixDuplicateLeads(dryRun = true) {
  console.log('\n========================================');
  console.log('CORRECTION DES DOUBLONS DE LEADS');
  console.log(dryRun ? '(MODE TEST - AUCUNE MODIFICATION)' : '(MODE RÉEL - MODIFICATIONS APPLIQUÉES)');
  console.log('========================================\n');

  const { data: allLeads } = await supabase
    .from('crm_leads')
    .select('*')
    .order('created_at', { ascending: true });

  if (!allLeads) return;

  const emailGroups = {};
  allLeads.forEach(lead => {
    if (lead.email) {
      if (!emailGroups[lead.email]) {
        emailGroups[lead.email] = [];
      }
      emailGroups[lead.email].push(lead);
    }
  });

  const duplicates = Object.entries(emailGroups).filter(([_, leads]) => leads.length > 1);

  if (duplicates.length === 0) {
    console.log('✓ Aucun doublon détecté');
    return;
  }

  console.log(`⚠️  ${duplicates.length} emails en doublon détectés\n`);

  for (const [email, leads] of duplicates) {
    console.log(`\nEmail: ${email}`);
    console.log(`Nombre de leads: ${leads.length}`);
    leads.forEach((lead, i) => {
      console.log(`  ${i + 1}. ID: ${lead.id} | Créé: ${new Date(lead.created_at).toLocaleDateString()} | Statut: ${lead.status}`);
    });

    if (!dryRun) {
      // Garder le lead le plus récent et avec le plus d'infos
      const keepLead = leads.reduce((best, current) => {
        // Critères: le plus récent, ou avec plus de données
        const bestScore = (best.first_name ? 1 : 0) + (best.phone ? 1 : 0) + (best.notes ? 1 : 0);
        const currentScore = (current.first_name ? 1 : 0) + (current.phone ? 1 : 0) + (current.notes ? 1 : 0);

        if (currentScore > bestScore) return current;
        if (currentScore === bestScore && new Date(current.created_at) > new Date(best.created_at)) return current;
        return best;
      });

      const toDelete = leads.filter(l => l.id !== keepLead.id);

      console.log(`  → Garder: ${keepLead.id}`);
      console.log(`  → Supprimer: ${toDelete.map(l => l.id).join(', ')}`);

      // Déplacer les documents et interactions vers le lead conservé
      for (const oldLead of toDelete) {
        // Documents
        await supabase
          .from('crm_lead_documents')
          .update({ lead_id: keepLead.id })
          .eq('lead_id', oldLead.id);

        // Documents prospect
        await supabase
          .from('prospect_documents')
          .update({ lead_id: keepLead.id })
          .eq('lead_id', oldLead.id);

        // Interactions
        await supabase
          .from('crm_interactions')
          .update({ lead_id: keepLead.id })
          .eq('lead_id', oldLead.id);

        // Emails
        await supabase
          .from('email_messages')
          .update({ lead_id: keepLead.id })
          .eq('lead_id', oldLead.id);

        // Supprimer l'ancien lead
        await supabase
          .from('crm_leads')
          .delete()
          .eq('id', oldLead.id);
      }

      console.log('  ✓ Fusion effectuée');
    }
  }

  if (dryRun) {
    console.log('\n⚠️  MODE TEST activé - aucune modification effectuée');
    console.log('   Relancez avec --real pour appliquer les modifications');
  }
}

async function verifyDocumentPaths() {
  console.log('\n========================================');
  console.log('VÉRIFICATION DES CHEMINS DE DOCUMENTS');
  console.log('========================================\n');

  const { data: docs } = await supabase
    .from('crm_lead_documents')
    .select('id, file_name, file_path, mime_type');

  if (!docs || docs.length === 0) {
    console.log('Aucun document à vérifier');
    return;
  }

  console.log(`Vérification de ${docs.length} documents...\n`);

  let validPaths = 0;
  let invalidPaths = 0;

  for (const doc of docs) {
    if (!doc.file_path || doc.file_path === '') {
      console.log(`❌ ${doc.file_name} - Chemin vide`);
      invalidPaths++;
    } else {
      // Tenter de récupérer l'URL publique
      const { data: publicUrl } = supabase.storage
        .from('crm-documents')
        .getPublicUrl(doc.file_path);

      if (publicUrl) {
        validPaths++;
      } else {
        console.log(`⚠️  ${doc.file_name} - Chemin invalide: ${doc.file_path}`);
        invalidPaths++;
      }
    }
  }

  console.log(`\n✓ Chemins valides: ${validPaths}`);
  console.log(`❌ Chemins invalides: ${invalidPaths}`);
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--real');

  console.log('==============================================');
  console.log('SCRIPT DE SYNCHRONISATION - LEADS & DOCUMENTS');
  console.log('==============================================\n');

  if (dryRun) {
    console.log('⚠️  MODE TEST ACTIVÉ');
    console.log('   Ce script va analyser sans effectuer de modifications');
    console.log('   Utilisez --real pour appliquer les modifications\n');
  } else {
    console.log('🔴 MODE RÉEL ACTIVÉ');
    console.log('   Ce script va MODIFIER la base de données');

    const confirm = await question('   Êtes-vous sûr de vouloir continuer? (oui/non): ');
    if (confirm.toLowerCase() !== 'oui') {
      console.log('   Annulé par l\'utilisateur');
      rl.close();
      process.exit(0);
    }
    console.log();
  }

  // 1. Synchroniser les documents
  await syncDocuments(dryRun);

  // 2. Corriger les doublons
  await fixDuplicateLeads(dryRun);

  // 3. Vérifier les chemins de documents
  await verifyDocumentPaths();

  console.log('\n========================================');
  console.log('SYNCHRONISATION TERMINÉE');
  console.log('========================================\n');

  if (dryRun) {
    console.log('💡 Pour appliquer ces modifications, relancez avec:');
    console.log('   node scripts/sync-leads-documents.js --real\n');
  }

  rl.close();
}

main().catch(console.error);
