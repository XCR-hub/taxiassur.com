import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[Pipeline Automation] Starting automation engine...');

    const results = {
      reminders_processed: 0,
      quotes_sent: 0,
      payments_checked: 0,
      contracts_processed: 0,
      cross_sell_sent: 0
    };

    // 1. TRAITER LES RELANCES
    await processReminders(supabase, results);

    // 2. TRAITER LES DEVIS
    await processQuotes(supabase, results);

    // 3. TRAITER LES PAIEMENTS
    await processPayments(supabase, results);

    // 4. TRAITER LES CONTRATS
    await processContracts(supabase, results);

    // 5. TRAITER LE CROSS-SELLING
    await processCrossSell(supabase, results);

    console.log('[Pipeline Automation] Automation completed:', results);

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error('[Pipeline Automation] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ==========================================
// 1. RELANCES AUTOMATIQUES
// ==========================================

async function processReminders(supabase: any, results: any) {
  const { data: pendingReminders } = await supabase
    .from('lead_reminders')
    .select('*, leads(*)')
    .eq('status', 'pending')
    .lte('scheduled_for', new Date().toISOString())
    .lt('current_attempt', supabase.raw('max_attempts'));

  for (const reminder of pendingReminders || []) {
    try {
      console.log(`[Reminders] Processing reminder for lead ${reminder.lead_id}`);

      const lead = reminder.crm_leads_enhanced;
      
      if (reminder.reminder_reason === 'documents_manquants') {
        await sendDocumentReminder(supabase, lead);
      } else if (reminder.reminder_reason === 'devis_sans_reponse') {
        await sendQuoteReminder(supabase, lead);
      } else if (reminder.reminder_reason === 'paiement_attente') {
        await sendPaymentReminder(supabase, lead);
      } else if (reminder.reminder_reason === 'signature_attente') {
        await sendSignatureReminder(supabase, lead);
      }

      await supabase
        .from('lead_reminders')
        .update({
          current_attempt: reminder.current_attempt + 1,
          last_attempt_at: new Date().toISOString(),
          status: reminder.current_attempt + 1 >= reminder.max_attempts ? 'completed' : 'pending',
          scheduled_for: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
        })
        .eq('id', reminder.id);

      results.reminders_processed++;
    } catch (error) {
      console.error(`[Reminders] Error processing reminder ${reminder.id}:`, error);
    }
  }
}

async function sendDocumentReminder(supabase: any, lead: any) {
  const { data: docsStatus } = await supabase.rpc('check_lead_documents_complete', { lead_id_param: lead.id });
  
  if (docsStatus.all_documents_present) {
    return;
  }

  const firstName = lead.metadata?.prenom || lead.name.split(' ')[0];
  const subject = '⏰ Rappel: Documents manquants pour votre devis TaxiAssur';
  const body = `Bonjour ${firstName},\n\nNous attendons toujours les documents suivants pour finaliser votre devis :\n\n${docsStatus.missing_documents.map((d: string) => `   • ${d}`).join('\n')}\n\n👉 Déposez-les ici : https://taxiassur.com/espace-prospect?token=${lead.access_token || lead.id}\n\nNotre équipe est à votre disposition pour toute question.\n\nCordialement,\nL'équipe TaxiAssur`;

  await sendNotification(supabase, lead, subject, body, 'document_reminder');
}

async function sendQuoteReminder(supabase: any, lead: any) {
  const firstName = lead.metadata?.prenom || lead.name.split(' ')[0];
  const subject = '📝 Votre devis TaxiAssur vous attend';
  const body = `Bonjour ${firstName},\n\nNous avons remarqué que vous n'avez pas encore consulté votre devis.\n\nNotre offre exclusive est valable encore quelques jours !\n\n👉 Consultez votre devis : https://taxiassur.com/espace-prospect?token=${lead.access_token || lead.id}\n\nBesoin d'aide pour votre décision ? Appelez-nous au 01 80 85 57 86\n\nCordialement,\nL'équipe TaxiAssur`;

  await sendNotification(supabase, lead, subject, body, 'quote_reminder');
}

async function sendPaymentReminder(supabase: any, lead: any) {
  const firstName = lead.metadata?.prenom || lead.name.split(' ')[0];
  const subject = '💳 Finalisez votre souscription TaxiAssur';
  const body = `Bonjour ${firstName},\n\nVotre devis est accepté ! Il ne reste plus qu'à finaliser le paiement pour activer votre assurance.\n\n👉 Procéder au paiement : https://taxiassur.com/paiement-comptant?lead=${lead.id}\n\nVotre couverture démarre dès réception du paiement.\n\nCordialement,\nL'équipe TaxiAssur`;

  await sendNotification(supabase, lead, subject, body, 'payment_reminder');
}

async function sendSignatureReminder(supabase: any, lead: any) {
  const firstName = lead.metadata?.prenom || lead.name.split(' ')[0];
  const subject = '✍️ Signature de votre contrat TaxiAssur';
  const body = `Bonjour ${firstName},\n\nVotre contrat est prêt à être signé !\n\n👉 Signer en ligne : https://taxiassur.com/espace-prospect?token=${lead.access_token || lead.id}\n\nLa signature électronique est sécurisée et prend moins de 2 minutes.\n\nCordialement,\nL'équipe TaxiAssur`;

  await sendNotification(supabase, lead, subject, body, 'signature_reminder');
}

// ==========================================
// 2. WORKFLOW DEVIS
// ==========================================

async function processQuotes(supabase: any, results: any) {
  const { data: readyLeads } = await supabase
    .from('leads')
    .select('*, lead_pipeline_history!inner(stage_name)')
    .eq('lead_pipeline_history.stage_name', 'documents_complets')
    .is('lead_pipeline_history.exited_at', null);

  for (const lead of readyLeads || []) {
    try {
      console.log(`[Quotes] Lead ${lead.id} ready for quote`);

      await progressToStage(supabase, lead.id, 'verification_eligibilite');
      
      await sendNotification(supabase, lead, 
        '✅ Dossier complet - Devis en préparation',
        `Bonjour,\n\nTous vos documents sont reçus ! Notre équipe prépare actuellement votre devis personnalisé.\n\nVous le recevrez sous 24-48h.\n\nCordialement,\nL'équipe TaxiAssur`,
        'quote_preparation'
      );

      results.quotes_sent++;
    } catch (error) {
      console.error(`[Quotes] Error for lead ${lead.id}:`, error);
    }
  }

  const { data: sentQuotes } = await supabase
    .from('lead_quotes')
    .select('*, leads(*)')
    .eq('status', 'sent')
    .is('viewed_at', null)
    .lt('sent_at', new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString());

  for (const quote of sentQuotes || []) {
    const { data: existingReminder } = await supabase
      .from('lead_reminders')
      .select('id')
      .eq('lead_id', quote.lead_id)
      .eq('reminder_reason', 'devis_sans_reponse')
      .eq('status', 'pending')
      .maybeSingle();

    if (!existingReminder) {
      await supabase.from('lead_reminders').insert({
        lead_id: quote.lead_id,
        reminder_type: 'follow_up',
        reminder_reason: 'devis_sans_reponse',
        scheduled_for: new Date().toISOString(),
        priority: 'high'
      });
    }
  }
}

// ==========================================
// 3. WORKFLOW PAIEMENT
// ==========================================

async function processPayments(supabase: any, results: any) {
  const { data: acceptedQuotes } = await supabase
    .from('lead_quotes')
    .select('*, leads(*)')
    .eq('status', 'accepted')
    .is('signed_at', null);

  for (const quote of acceptedQuotes || []) {
    try {
      const { data: existingPayment } = await supabase
        .from('lead_payments')
        .select('id')
        .eq('quote_id', quote.id)
        .maybeSingle();

      if (!existingPayment) {
        const paymentLink = `https://taxiassur.fr/paiement/${quote.id}`;
        
        await supabase.from('lead_payments').insert({
          lead_id: quote.lead_id,
          quote_id: quote.id,
          payment_type: 'initial',
          amount: quote.amount,
          status: 'pending',
          payment_link: paymentLink,
          payment_link_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        });

        await progressToStage(supabase, quote.lead_id, 'paiement_attente');

        const lead = quote.crm_leads_enhanced;
        const firstName = lead.metadata?.prenom || lead.name.split(' ')[0];

        await sendNotification(supabase, lead,
          '🎉 Devis accepté - Finalisez votre souscription',
          `Bonjour ${firstName},\n\nFélicitations ! Votre devis est accepté.\n\nPour activer votre assurance, procédez au paiement sécurisé :\n👉 ${paymentLink}\n\nVotre couverture démarre immédiatement après paiement.\n\nCordialement,\nL'équipe TaxiAssur`,
          'payment_request'
        );

        results.payments_checked++;
      }
    } catch (error) {
      console.error(`[Payments] Error for quote ${quote.id}:`, error);
    }
  }

  const { data: paidPayments } = await supabase
    .from('lead_payments')
    .select('*, leads(*)')
    .eq('status', 'paid')
    .is('paid_at', null);

  for (const payment of paidPayments || []) {
    await supabase
      .from('lead_payments')
      .update({ paid_at: new Date().toISOString() })
      .eq('id', payment.id);

    await progressToStage(supabase, payment.lead_id, 'paiement_recu');

    const lead = payment.crm_leads_enhanced;
    await sendNotification(supabase, lead,
      '✅ Paiement reçu - Contrat en préparation',
      `Bonjour,\n\nVotre paiement est bien reçu !\n\nNotre équipe prépare actuellement votre contrat. Vous le recevrez en signature électronique sous peu.\n\nCordialement,\nL'équipe TaxiAssur`,
      'payment_received'
    );
  }
}

// ==========================================
// 4. WORKFLOW CONTRAT
// ==========================================

async function processContracts(supabase: any, results: any) {
  const { data: readyForContract } = await supabase
    .from('leads')
    .select('*, lead_pipeline_history!inner(stage_name)')
    .eq('lead_pipeline_history.stage_name', 'paiement_recu')
    .is('lead_pipeline_history.exited_at', null);

  for (const lead of readyForContract || []) {
    await progressToStage(supabase, lead.id, 'contrat_preparation');
    results.contracts_processed++;
  }

  const { data: contractsReady } = await supabase
    .from('lead_contracts')
    .select('*, leads(*)')
    .eq('status', 'ready_for_signature')
    .is('signature_url', null);

  for (const contract of contractsReady || []) {
    const signatureUrl = `https://taxiassur.fr/signature/${contract.id}`;

    await supabase
      .from('lead_contracts')
      .update({ signature_url: signatureUrl })
      .eq('id', contract.id);

    await progressToStage(supabase, contract.lead_id, 'contrat_signature');

    const lead = contract.crm_leads_enhanced;
    const firstName = lead.metadata?.prenom || lead.name.split(' ')[0];

    await sendNotification(supabase, lead,
      '✍️ Votre contrat TaxiAssur est prêt !',
      `Bonjour ${firstName},\n\nExcellente nouvelle ! Votre contrat est prêt.\n\nSignez-le en ligne en quelques clics :\n👉 ${signatureUrl}\n\nVotre assurance sera active dès signature.\n\nCordialement,\nL'équipe TaxiAssur`,
      'contract_signature'
    );
  }

  const { data: signedContracts } = await supabase
    .from('lead_contracts')
    .select('*, leads(*)')
    .eq('status', 'signed')
    .is('activated_at', null);

  for (const contract of signedContracts || []) {
    await supabase
      .from('lead_contracts')
      .update({ 
        status: 'active',
        activated_at: new Date().toISOString() 
      })
      .eq('id', contract.id);

    await progressToStage(supabase, contract.lead_id, 'client_actif');

    const lead = contract.crm_leads_enhanced;
    const firstName = lead.metadata?.prenom || lead.name.split(' ')[0];

    await sendNotification(supabase, lead,
      '🎉 Bienvenue dans la famille TaxiAssur !',
      `Bonjour ${firstName},\n\nVotre contrat est signé et actif !\n\n👉 Accédez à votre espace client : https://taxiassur.com/espace-client\n\nVous pouvez :\n• Consulter vos documents\n• Déclarer un sinistre\n• Modifier vos informations\n• Contacter votre conseiller\n\nBienvenue chez TaxiAssur !\n\nCordialement,\nL'équipe TaxiAssur`,
      'welcome_client'
    );
  }
}

// ==========================================
// 5. CROSS-SELLING BI-MENSUEL
// ==========================================

async function processCrossSell(supabase: any, results: any) {
  const fifteenDaysAgo = new Date();
  fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

  const { data: activeClients } = await supabase
    .from('leads')
    .select('*')
    .eq('status', 'converted')
    .or(`created_at.lt.${fifteenDaysAgo.toISOString()}`);

  const { data: campaigns } = await supabase
    .from('cross_sell_campaigns')
    .select('*')
    .eq('is_active', true);

  for (const client of activeClients || []) {
    for (const campaign of campaigns || []) {
      const { data: recentSend } = await supabase
        .from('cross_sell_history')
        .select('sent_at')
        .eq('lead_id', client.id)
        .eq('campaign_id', campaign.id)
        .order('sent_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!recentSend || new Date(recentSend.sent_at).getTime() < new Date(Date.now() - campaign.frequency_days * 24 * 60 * 60 * 1000).getTime()) {
        const firstName = client.metadata?.prenom || client.name.split(' ')[0];
        const productNames: Record<string, string> = {
          rc_professionnelle: 'RC Professionnelle',
          mutuelle_sante: 'Mutuelle Santé Madelin',
          prevoyance: 'Prévoyance Madelin',
          retraite: 'Retraite Madelin',
          mrh: 'Assurance Habitation',
          assurance_emprunteur: 'Assurance Emprunteur',
          assurance_scolaire: 'Assurance Scolaire',
          protection_juridique: 'Protection Juridique',
          gav: 'Garantie Accidents de la Vie'
        };

        const productName = productNames[campaign.product_offered] || campaign.product_offered;

        await sendNotification(supabase, client,
          `💡 Découvrez notre ${productName}`,
          `Bonjour ${firstName},\n\nEn tant que client TaxiAssur, profitez d'une offre exclusive sur notre ${productName}.\n\nProtection optimale, tarifs avantageux !\n\n👉 En savoir plus : https://taxiassur.fr/offres/${campaign.product_offered}\n\nVotre conseiller est à votre disposition.\n\nCordialement,\nL'équipe TaxiAssur`,
          'cross_sell'
        );

        await supabase.from('cross_sell_history').insert({
          campaign_id: campaign.id,
          lead_id: client.id,
          sent_at: new Date().toISOString(),
          channel: 'email'
        });

        results.cross_sell_sent++;
      }
    }
  }
}

// ==========================================
// HELPERS
// ==========================================

async function sendNotification(supabase: any, lead: any, subject: string, body: string, type: string) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  await fetch(`${supabaseUrl}/functions/v1/send-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseKey}`
    },
    body: JSON.stringify({ 
      to: lead.email, 
      subject, 
      body, 
      from: 'team@taxiassur.com' 
    })
  });

  await supabase.from('lead_communications').insert({
    lead_id: lead.id,
    communication_type: type,
    direction: 'outbound',
    channel: 'email',
    subject,
    content: body,
    from_address: 'team@taxiassur.com',
    to_address: lead.email,
    status: 'sent',
    sent_at: new Date().toISOString()
  });

  if (lead.phone) {
    const smsContent = subject.substring(0, 160);
    
    await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({ to: lead.phone, message: smsContent })
    });

    await fetch(`${supabaseUrl}/functions/v1/send-whatsapp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({ to: lead.phone, message: body.substring(0, 1000) })
    });
  }

  await fetch(`${supabaseUrl}/functions/v1/send-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseKey}`
    },
    body: JSON.stringify({ 
      to: 'team@taxiassur.com', 
      subject: `[CRM] ${type}: ${lead.name}`,
      body: `Action sur le lead ${lead.name} (${lead.email}):\n\n${subject}\n\nConsultez le CRM pour plus de détails.`
    })
  });
}

async function progressToStage(supabase: any, leadId: string, stageName: string) {
  await supabase
    .from('lead_pipeline_history')
    .update({ exited_at: new Date().toISOString() })
    .eq('lead_id', leadId)
    .is('exited_at', null);

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
}
