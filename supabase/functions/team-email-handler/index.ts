import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const REQUIRED_DOCUMENTS = [
  'cni',
  'kbis',
  'carte_pro',
  'carte_grise',
  'releve_sinistre',
  'rib',
  'autorisation_stationnement'
];

const REQUIRED_INFO = ['nom', 'prenom', 'telephone', 'email', 'adresse'];

const DOCUMENT_LABELS: Record<string, string> = {
  cni: 'Carte Nationale d\'Identité',
  kbis: 'Extrait Kbis',
  carte_pro: 'Carte Professionnelle',
  carte_grise: 'Carte Grise',
  releve_sinistre: 'Relevé de Sinistres',
  rib: 'RIB',
  autorisation_stationnement: 'Autorisation de Stationnement'
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const emailData = await req.json();
    
    console.log('[Team Email] Email reçu de:', emailData.from);

    // 1. VÉRIFIER SI LE LEAD EXISTE
    let { data: lead } = await supabase
      .from('leads')
      .select('*')
      .eq('email', emailData.from)
      .maybeSingle();

    let isNewLead = false;

    // 2. CRÉER LE LEAD SI NÉCESSAIRE
    if (!lead) {
      console.log('[Team Email] Création nouveau lead');
      isNewLead = true;
      
      const emailParts = emailData.from.split('@');
      const namePart = emailParts[0].replace(/[._]/g, ' ');
      
      const { data: newLead, error: createError } = await supabase
        .from('leads')
        .insert({
          email: emailData.from,
          name: emailData.fromName || namePart,
          source: 'email_team',
          status: 'new',
          score: 60,
          metadata: {
            first_email_subject: emailData.subject,
            first_email_date: new Date().toISOString(),
            first_email_content: emailData.text?.substring(0, 500)
          }
        })
        .select()
        .single();

      if (createError) {
        console.error('[Team Email] Erreur création lead:', createError);
        throw createError;
      }

      lead = newLead;

      // Créer l'entrée pipeline
      await supabase.from('lead_pipeline_history').insert({
        lead_id: lead.id,
        stage_id: (await supabase.from('lead_pipeline_stages').select('id').eq('stage_name', 'nouveau_lead').single()).data?.id,
        stage_name: 'nouveau_lead'
      });

      // Notifier les commerciaux
      await notifyCommercials(supabase, lead, 'nouveau_lead');
    }

    // 3. ENREGISTRER LA COMMUNICATION
    await supabase.from('lead_communications').insert({
      lead_id: lead.id,
      communication_type: 'initial_contact',
      direction: 'inbound',
      channel: 'email',
      subject: emailData.subject,
      content: emailData.text || '',
      from_address: emailData.from,
      to_address: 'team@taxiassur.com',
      status: 'received',
      delivered_at: new Date().toISOString(),
      attachments: emailData.attachments || []
    });

    // 4. VÉRIFIER LES PIÈCES ET INFORMATIONS
    const { data: docsStatus } = await supabase.rpc('check_lead_documents_complete', { lead_id_param: lead.id });
    const { data: infoStatus } = await supabase.rpc('check_lead_info_complete', { lead_id_param: lead.id });

    console.log('[Team Email] Status documents:', docsStatus);
    console.log('[Team Email] Status infos:', infoStatus);

    // 5. ANALYSER LES PIÈCES JOINTES (si présentes)
    if (emailData.attachments && emailData.attachments.length > 0) {
      await processAttachments(supabase, lead.id, emailData.attachments);
    }

    // 6. CRÉER LES DOCUMENTS MANQUANTS
    for (const docType of REQUIRED_DOCUMENTS) {
      const { data: existingDoc } = await supabase
        .from('lead_documents')
        .select('id')
        .eq('lead_id', lead.id)
        .eq('document_type', docType)
        .maybeSingle();

      if (!existingDoc) {
        await supabase.from('lead_documents').insert({
          lead_id: lead.id,
          document_type: docType,
          document_category: 'obligatoire',
          status: 'missing'
        });
      }
    }

    // 7. ENVOYER LA RÉPONSE APPROPRIÉE
    const response = await generateResponse(supabase, lead, docsStatus, infoStatus, isNewLead);
    
    await sendEmail(supabase, lead.email, response.subject, response.body);
    await sendSMS(supabase, lead, response.smsContent);
    await sendWhatsApp(supabase, lead, response.whatsappContent);

    // 8. ENREGISTRER LA RÉPONSE
    await supabase.from('lead_communications').insert({
      lead_id: lead.id,
      communication_type: 'auto_response',
      direction: 'outbound',
      channel: 'email',
      subject: response.subject,
      content: response.body,
      from_address: 'team@taxiassur.com',
      to_address: lead.email,
      status: 'sent',
      sent_at: new Date().toISOString()
    });

    // 9. PROGRAMMER LES RELANCES SI NÉCESSAIRE
    if (!docsStatus.all_documents_present || !infoStatus.all_info_present) {
      await scheduleReminder(supabase, lead.id, 'documents_manquants', 3);
    }

    // 10. METTRE À JOUR LE STAGE SI TOUT EST COMPLET
    if (docsStatus.all_documents_present && infoStatus.all_info_present) {
      await progressToStage(supabase, lead.id, 'documents_complets');
      await notifyCommercials(supabase, lead, 'documents_complets');
    } else if (infoStatus.all_info_present) {
      await progressToStage(supabase, lead.id, 'documents_attente');
    } else {
      await progressToStage(supabase, lead.id, 'informations_collecte');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        lead_id: lead.id,
        new_lead: isNewLead,
        documents_complete: docsStatus.all_documents_present,
        info_complete: infoStatus.all_info_present
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error('[Team Email] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function processAttachments(supabase: any, leadId: string, attachments: any[]) {
  for (const attachment of attachments) {
    const docType = guessDocumentType(attachment.filename);
    
    if (docType) {
      await supabase.from('lead_documents')
        .upsert({
          lead_id: leadId,
          document_type: docType,
          file_name: attachment.filename,
          file_url: attachment.url,
          file_size: attachment.size,
          mime_type: attachment.contentType,
          status: 'uploaded',
          upload_date: new Date().toISOString()
        }, { onConflict: 'lead_id,document_type' });
    }
  }
}

function guessDocumentType(filename: string): string | null {
  const lower = filename.toLowerCase();
  
  if (lower.includes('cni') || lower.includes('carte') && lower.includes('identite')) return 'cni';
  if (lower.includes('kbis')) return 'kbis';
  if (lower.includes('carte') && lower.includes('pro')) return 'carte_pro';
  if (lower.includes('carte') && lower.includes('grise')) return 'carte_grise';
  if (lower.includes('sinistre') || lower.includes('releve')) return 'releve_sinistre';
  if (lower.includes('rib')) return 'rib';
  if (lower.includes('autorisation') || lower.includes('stationnement')) return 'autorisation_stationnement';
  
  return null;
}

async function generateResponse(supabase: any, lead: any, docsStatus: any, infoStatus: any, isNewLead: boolean) {
  const firstName = lead.metadata?.prenom || lead.name.split(' ')[0] || 'Cher(e) professionnel(le)';
  
  let subject = '';
  let body = '';
  let smsContent = '';
  let whatsappContent = '';

  if (isNewLead) {
    subject = '✅ Bienvenue chez TaxiAssur - Demande bien reçue';
    
    body = `Bonjour ${firstName},\n\n`;
    body += `Nous avons bien reçu votre demande et vous remercions de votre confiance !\n\n`;
    body += `Notre équipe d'experts en assurance taxi va étudier votre dossier avec attention.\n\n`;

    if (!infoStatus.all_info_present) {
      body += `⚠️ Pour traiter votre demande rapidement, nous avons besoin de quelques informations complémentaires :\n\n`;
      
      for (const info of infoStatus.missing_info) {
        const labels: Record<string, string> = {
          nom: 'Votre nom',
          prenom: 'Votre prénom',
          telephone: 'Votre numéro de téléphone',
          email: 'Votre adresse email',
          adresse: 'Votre adresse complète'
        };
        body += `   • ${labels[info] || info}\n`;
      }
      body += `\n`;
    }

    if (!docsStatus.all_documents_present) {
      body += `📄 Documents nécessaires pour votre devis :\n\n`;
      
      for (const doc of docsStatus.missing_documents) {
        body += `   • ${DOCUMENT_LABELS[doc] || doc}\n`;
      }
      body += `\n`;
      body += `👉 Déposez vos documents en toute sécurité : https://taxiassur.com/espace-prospect/${lead?.access_token || lead?.id || 'documents'}\n\n`;
    }

    body += `Notre équipe vous contactera dans les plus brefs délais.\n\n`;
    body += `Besoin d'aide ? Appelez-nous au 01 80 85 57 86\n\n`;
    body += `Cordialement,\nL'équipe TaxiAssur\n`;

    smsContent = `Bienvenue chez TaxiAssur ! Votre demande est bien reçue. Complétez votre dossier : taxiassur.com/espace-prospect`;
    whatsappContent = `Bonjour ${firstName} 👋\n\nVotre demande est bien reçue ! Pour accélérer votre devis, déposez vos documents ici : https://taxiassur.com/espace-prospect/${lead?.access_token || lead?.id || 'documents'}\n\nÀ très vite !\n✨ TaxiAssur`;
  } else {
    // Lead existant
    if (docsStatus.all_documents_present && infoStatus.all_info_present) {
      subject = '🎉 Dossier complet - Devis en cours';
      body = `Bonjour ${firstName},\n\nExcellente nouvelle ! Nous avons bien reçu tous vos documents.\n\nNotre équipe vérifie actuellement votre éligibilité et prépare votre devis personnalisé.\n\nVous recevrez notre meilleure offre sous 24-48h.\n\nCordialement,\nL'équipe TaxiAssur`;
      smsContent = `✅ Dossier complet ! Votre devis TaxiAssur arrive sous 24-48h.`;
      whatsappContent = `Super ${firstName} ! 🎉\n\nTous vos documents sont reçus. Votre devis arrive très vite !\n\n✨ TaxiAssur`;
    } else {
      subject = '📄 Documents manquants pour votre devis';
      body = `Bonjour ${firstName},\n\nNous avons bien reçu votre message.\n\nPour finaliser votre devis, il nous manque encore :\n\n`;
      
      for (const doc of docsStatus.missing_documents) {
        body += `   • ${DOCUMENT_LABELS[doc] || doc}\n`;
      }
      
      body += `\n👉 Déposez-les ici : https://taxiassur.com/espace-prospect/${lead?.access_token || lead?.id || 'documents'}\n\nNotre équipe attend vos documents pour vous faire la meilleure offre !\n\nCordialement,\nL'équipe TaxiAssur`;
      smsContent = `Documents manquants pour votre devis TaxiAssur. Déposez-les : taxiassur.com/espace-prospect`;
      whatsappContent = `Bonjour ${firstName},\n\nIl nous manque quelques documents pour votre devis. Déposez-les ici : https://taxiassur.com/espace-prospect/${lead?.access_token || lead?.id || 'documents'}\n\n✨ TaxiAssur`;
    }
  }

  return { subject, body, smsContent, whatsappContent };
}

async function sendEmail(supabase: any, to: string, subject: string, body: string) {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({ to, subject, body, from: 'team@taxiassur.com' })
    });
  } catch (error) {
    console.error('[Team Email] Failed to send email:', error);
  }
}

async function sendSMS(supabase: any, lead: any, content: string) {
  if (!lead.phone) return;
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({ to: lead.phone, message: content })
    });

    await supabase.from('lead_communications').insert({
      lead_id: lead.id,
      communication_type: 'notification',
      direction: 'outbound',
      channel: 'sms',
      content,
      to_address: lead.phone,
      status: 'sent',
      sent_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Team Email] Failed to send SMS:', error);
  }
}

async function sendWhatsApp(supabase: any, lead: any, content: string) {
  if (!lead.phone) return;
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    await fetch(`${supabaseUrl}/functions/v1/send-whatsapp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({ to: lead.phone, message: content })
    });

    await supabase.from('lead_communications').insert({
      lead_id: lead.id,
      communication_type: 'notification',
      direction: 'outbound',
      channel: 'whatsapp',
      content,
      to_address: lead.phone,
      status: 'sent',
      sent_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Team Email] Failed to send WhatsApp:', error);
  }
}

async function notifyCommercials(supabase: any, lead: any, eventType: string) {
  const notifications: Record<string, any> = {
    nouveau_lead: {
      subject: `🆕 Nouveau lead: ${lead.name}`,
      body: `Un nouveau lead vient d'arriver sur team@taxiassur.com\n\nNom: ${lead.name}\nEmail: ${lead.email}\nSource: ${lead.source}\n\nConsultez le dossier dans le CRM.`
    },
    documents_complets: {
      subject: `✅ Dossier complet: ${lead.name}`,
      body: `Le dossier de ${lead.name} est maintenant complet !\n\nTous les documents ont été reçus.\nVous pouvez préparer le devis.`
    }
  };

  const notification = notifications[eventType];
  if (!notification) return;

  try {
    await sendEmail(supabase, 'team@taxiassur.com', notification.subject, notification.body);
  } catch (error) {
    console.error('[Team Email] Failed to notify commercials:', error);
  }
}

async function scheduleReminder(supabase: any, leadId: string, reason: string, daysUntil: number) {
  const scheduledFor = new Date();
  scheduledFor.setDate(scheduledFor.getDate() + daysUntil);

  await supabase.from('lead_reminders').insert({
    lead_id: leadId,
    reminder_type: 'follow_up',
    reminder_reason: reason,
    scheduled_for: scheduledFor.toISOString(),
    priority: 'medium',
    max_attempts: 3
  });
}

async function progressToStage(supabase: any, leadId: string, stageName: string) {
  // Clôturer l'ancien stage
  await supabase
    .from('lead_pipeline_history')
    .update({ 
      exited_at: new Date().toISOString()
    })
    .eq('lead_id', leadId)
    .is('exited_at', null);

  // Créer le nouveau stage
  const { data: stage } = await supabase
    .from('lead_pipeline_stages')
    .select('id')
    .eq('stage_name', stageName)
    .single();

  if (stage) {
    await supabase.from('lead_pipeline_history').insert({
      lead_id: leadId,
      stage_id: stage.id,
      stage_name: stageName
    });
  }

  // Mettre à jour le status du lead
  const statusMap: Record<string, string> = {
    nouveau_lead: 'new',
    informations_collecte: 'contacted',
    documents_attente: 'engaged',
    documents_complets: 'qualified',
    verification_eligibilite: 'qualified',
    devis_preparation: 'quote_requested',
    devis_envoye: 'quote_sent',
    devis_accepte: 'quote_accepted',
    paiement_attente: 'payment_pending',
    paiement_recu: 'payment_received',
    contrat_preparation: 'contract_preparation',
    contrat_signature: 'contract_signing',
    contrat_signe: 'contract_signed',
    client_actif: 'converted'
  };

  const newStatus = statusMap[stageName] || 'new';
  await supabase
    .from('leads')
    .update({ status: newStatus })
    .eq('id', leadId);
}
