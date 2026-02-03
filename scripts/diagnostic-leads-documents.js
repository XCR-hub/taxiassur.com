import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Variables d\'environnement manquantes');
  console.error('VITE_SUPABASE_URL:', supabaseUrl);
  console.error('Key disponible:', supabaseKey ? 'Oui' : 'Non');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnosticComplet() {
  console.log('========================================');
  console.log('DIAGNOSTIC COMPLET - LEADS & DOCUMENTS');
  console.log('========================================\n');

  // 1. ANALYSE DES LEADS
  console.log('1. ANALYSE DES LEADS');
  console.log('--------------------');

  const { data: crmLeads, error: crmError } = await supabase
    .from('crm_leads')
    .select('id, email, phone, first_name, last_name, status, created_at')
    .order('created_at', { ascending: false });

  if (crmError) {
    console.error('Erreur lors de la récupération des leads:', crmError);
  } else {
    console.log(`Total leads dans crm_leads: ${crmLeads?.length || 0}`);

    // Grouper par statut
    const byStatus = {};
    crmLeads?.forEach(lead => {
      byStatus[lead.status] = (byStatus[lead.status] || 0) + 1;
    });

    console.log('\nRépartition par statut:');
    Object.entries(byStatus).forEach(([status, count]) => {
      console.log(`  - ${status}: ${count}`);
    });

    // Leads sans email
    const leadsWithoutEmail = crmLeads?.filter(l => !l.email);
    console.log(`\nLeads SANS email: ${leadsWithoutEmail?.length || 0}`);
    if (leadsWithoutEmail && leadsWithoutEmail.length > 0) {
      console.log('  IDs:', leadsWithoutEmail.map(l => l.id).join(', '));
    }

    // Leads avec email mais incomplet
    const leadsIncomplete = crmLeads?.filter(l => l.email && (!l.first_name || !l.last_name));
    console.log(`\nLeads avec email mais INCOMPLETS: ${leadsIncomplete?.length || 0}`);
  }

  // 2. ANALYSE DES EMAILS
  console.log('\n\n2. ANALYSE DES EMAILS');
  console.log('---------------------');

  const { data: allEmails, error: emailsError } = await supabase
    .from('email_messages')
    .select('id, lead_id, from_email, subject, received_at, created_at')
    .order('created_at', { ascending: false });

  if (emailsError) {
    console.error('Erreur lors de la récupération des emails:', emailsError);
  } else {
    console.log(`Total emails dans email_messages: ${allEmails?.length || 0}`);

    const emailsWithLead = allEmails?.filter(e => e.lead_id);
    const emailsWithoutLead = allEmails?.filter(e => !e.lead_id);

    console.log(`Emails LIÉS à un lead: ${emailsWithLead?.length || 0}`);
    console.log(`Emails NON liés à un lead: ${emailsWithoutLead?.length || 0}`);

    if (emailsWithoutLead && emailsWithoutLead.length > 0) {
      console.log('\nExemples d\'emails non liés (10 premiers):');
      emailsWithoutLead.slice(0, 10).forEach(email => {
        console.log(`  - ${email.from_email} | ${email.subject} | ${new Date(email.created_at).toLocaleDateString()}`);
      });
    }

    // Emails avec pièces jointes
    const { data: attachments } = await supabase
      .from('email_attachments')
      .select('email_id, filename, content_type, auto_detected_type');

    console.log(`\nTotal pièces jointes d'emails: ${attachments?.length || 0}`);

    if (attachments && attachments.length > 0) {
      const emailsWithAttachments = [...new Set(attachments.map(a => a.email_id))];
      console.log(`Emails avec pièces jointes: ${emailsWithAttachments.length}`);

      // Types de documents détectés
      const docTypes = {};
      attachments.forEach(a => {
        const type = a.auto_detected_type || 'non détecté';
        docTypes[type] = (docTypes[type] || 0) + 1;
      });

      console.log('\nTypes de documents dans les emails:');
      Object.entries(docTypes).forEach(([type, count]) => {
        console.log(`  - ${type}: ${count}`);
      });
    }
  }

  // 3. ANALYSE DES DOCUMENTS CRM
  console.log('\n\n3. ANALYSE DES DOCUMENTS CRM');
  console.log('-----------------------------');

  const { data: crmDocs, error: docsError } = await supabase
    .from('crm_lead_documents')
    .select('id, lead_id, document_type, file_name, status, uploaded_at');

  if (docsError) {
    console.error('Erreur lors de la récupération des documents CRM:', docsError);
  } else {
    console.log(`Total documents dans crm_lead_documents: ${crmDocs?.length || 0}`);

    // Par type
    const byType = {};
    crmDocs?.forEach(doc => {
      byType[doc.document_type] = (byType[doc.document_type] || 0) + 1;
    });

    console.log('\nRépartition par type:');
    Object.entries(byType).forEach(([type, count]) => {
      console.log(`  - ${type}: ${count}`);
    });

    // Par statut de validation
    const byValidation = {};
    crmDocs?.forEach(doc => {
      byValidation[doc.status] = (byValidation[doc.status] || 0) + 1;
    });

    console.log('\nRépartition par statut:');
    Object.entries(byValidation).forEach(([status, count]) => {
      console.log(`  - ${status}: ${count}`);
    });

    // Leads avec documents
    const leadsWithDocs = [...new Set(crmDocs?.map(d => d.lead_id))];
    console.log(`\nLeads ayant au moins 1 document: ${leadsWithDocs.length}`);
  }

  // 4. ANALYSE DES DOCUMENTS PROSPECT
  console.log('\n\n4. ANALYSE DES DOCUMENTS PROSPECT');
  console.log('----------------------------------');

  const { data: prospectDocs, error: prospectError } = await supabase
    .from('prospect_documents')
    .select('id, lead_id, document_type, file_name, validated, uploaded_at');

  if (prospectError) {
    console.error('Erreur lors de la récupération des documents prospect:', prospectError);
  } else {
    console.log(`Total documents dans prospect_documents: ${prospectDocs?.length || 0}`);

    // Par type
    const byType = {};
    prospectDocs?.forEach(doc => {
      byType[doc.document_type] = (byType[doc.document_type] || 0) + 1;
    });

    console.log('\nRépartition par type:');
    Object.entries(byType).forEach(([type, count]) => {
      console.log(`  - ${type}: ${count}`);
    });

    // Validés vs non validés
    const validated = prospectDocs?.filter(d => d.validated);
    const notValidated = prospectDocs?.filter(d => !d.validated);
    console.log(`\nDocuments VALIDÉS: ${validated?.length || 0}`);
    console.log(`Documents NON validés: ${notValidated?.length || 0}`);

    // Leads avec documents
    const leadsWithProspectDocs = [...new Set(prospectDocs?.map(d => d.lead_id))];
    console.log(`\nLeads ayant des documents prospect: ${leadsWithProspectDocs.length}`);
  }

  // 5. CROISEMENT DES DONNÉES
  console.log('\n\n5. CROISEMENT DES DONNÉES');
  console.log('-------------------------');

  if (crmLeads && allEmails) {
    // Leads avec emails
    const leadIds = crmLeads.map(l => l.id);
    const emailsForLeads = allEmails.filter(e => e.lead_id && leadIds.includes(e.lead_id));
    const leadsWithEmails = [...new Set(emailsForLeads.map(e => e.lead_id))];

    console.log(`Leads ayant au moins 1 email: ${leadsWithEmails.length} / ${crmLeads.length}`);
    console.log(`Leads SANS email: ${crmLeads.length - leadsWithEmails.length}`);

    // Leads sans aucune interaction
    const leadsWithInteraction = [...new Set([
      ...leadsWithEmails,
      ...(crmDocs ? [...new Set(crmDocs.map(d => d.lead_id))] : []),
      ...(prospectDocs ? [...new Set(prospectDocs.map(d => d.lead_id))] : [])
    ])];

    const leadsWithoutInteraction = crmLeads.filter(l => !leadsWithInteraction.includes(l.id));
    console.log(`\nLeads SANS AUCUNE interaction: ${leadsWithoutInteraction.length}`);

    if (leadsWithoutInteraction.length > 0 && leadsWithoutInteraction.length <= 10) {
      console.log('\nLeads sans interaction:');
      leadsWithoutInteraction.forEach(lead => {
        console.log(`  - ${lead.email} | ${lead.first_name} ${lead.last_name} | ${lead.status} | Créé le ${new Date(lead.created_at).toLocaleDateString()}`);
      });
    }
  }

  // 6. ANALYSE DES EMAILS NON TRAITÉS
  console.log('\n\n6. SUGGESTIONS DE SYNCHRONISATION');
  console.log('----------------------------------');

  if (allEmails) {
    const emailsWithoutLead = allEmails.filter(e => !e.lead_id);

    if (emailsWithoutLead.length > 0) {
      console.log(`\n⚠️  ${emailsWithoutLead.length} emails ne sont PAS liés à un lead !`);
      console.log('   Ces emails peuvent contenir des informations importantes.');
      console.log('   Recommandation: Exécuter la synchronisation automatique.');
    }
  }

  // Vérifier les doublons d'email
  if (crmLeads) {
    const emailCounts = {};
    crmLeads.forEach(lead => {
      if (lead.email) {
        emailCounts[lead.email] = (emailCounts[lead.email] || 0) + 1;
      }
    });

    const duplicates = Object.entries(emailCounts).filter(([_, count]) => count > 1);
    if (duplicates.length > 0) {
      console.log(`\n⚠️  ${duplicates.length} emails en DOUBLON détectés !`);
      console.log('   Emails concernés:');
      duplicates.forEach(([email, count]) => {
        console.log(`     - ${email}: ${count} occurrences`);
      });
    }
  }

  // Documents orphelins
  if (crmDocs && prospectDocs && crmLeads) {
    const leadIds = crmLeads.map(l => l.id);
    const orphanCrmDocs = crmDocs.filter(d => d.lead_id && !leadIds.includes(d.lead_id));
    const orphanProspectDocs = prospectDocs.filter(d => d.lead_id && !leadIds.includes(d.lead_id));

    const totalOrphans = orphanCrmDocs.length + orphanProspectDocs.length;
    if (totalOrphans > 0) {
      console.log(`\n⚠️  ${totalOrphans} documents ORPHELINS (lead_id inexistant) !`);
      console.log(`   - crm_lead_documents: ${orphanCrmDocs.length}`);
      console.log(`   - prospect_documents: ${orphanProspectDocs.length}`);
    }
  }

  console.log('\n========================================');
  console.log('FIN DU DIAGNOSTIC');
  console.log('========================================\n');
}

diagnosticComplet().catch(console.error);
