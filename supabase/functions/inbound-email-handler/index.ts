import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    const emailData = await req.json();

    console.log('[Email Handler] Received email from:', emailData.from);

    const { data: lead } = await supabase
      .from('crm_leads_enhanced')
      .select('*')
      .eq('email', emailData.from)
      .maybeSingle();

    if (!lead) {
      console.log('[Email Handler] Creating new lead from email');
      
      const { data: newLead } = await supabase
        .from('crm_leads_enhanced')
        .insert({
          email: emailData.from,
          name: emailData.fromName || emailData.from.split('@')[0],
          source: 'email_inbound',
          status: 'new',
          score: 50,
          metadata: {
            first_email_subject: emailData.subject,
            first_email_date: new Date().toISOString()
          }
        })
        .select()
        .single();

      if (newLead) {
        await processInboundEmail(supabase, newLead, emailData, openaiKey);
      }
    } else {
      console.log('[Email Handler] Updating existing lead');
      
      await supabase
        .from('crm_lead_activities')
        .insert({
          lead_id: lead.id,
          activity_type: 'email_received',
          activity_details: {
            subject: emailData.subject,
            preview: emailData.text?.substring(0, 200)
          },
          score_impact: 10
        });

      await supabase
        .from('crm_leads_enhanced')
        .update({ 
          score: (lead.score || 0) + 10,
          last_contact_at: new Date().toISOString()
        })
        .eq('id', lead.id);

      await processInboundEmail(supabase, lead, emailData, openaiKey);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Email processed' }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error('[Email Handler] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function processInboundEmail(supabase: any, lead: any, emailData: any, openaiKey?: string) {
  const intent = await detectIntent(emailData.text, openaiKey);
  
  console.log('[Email Handler] Detected intent:', intent);

  if (intent === 'request_quote') {
    await handleQuoteRequest(supabase, lead, emailData);
  } else if (intent === 'question') {
    await handleQuestion(supabase, lead, emailData, openaiKey);
  } else if (intent === 'complaint') {
    await handleComplaint(supabase, lead, emailData);
  } else if (intent === 'interested') {
    await handleInterest(supabase, lead, emailData);
  } else {
    await handleGeneral(supabase, lead, emailData);
  }
}

async function detectIntent(text: string, openaiKey?: string) {
  if (!text) return 'unknown';

  const lowerText = text.toLowerCase();

  if (lowerText.includes('devis') || lowerText.includes('tarif') || lowerText.includes('prix') || lowerText.includes('coût')) {
    return 'request_quote';
  }

  if (lowerText.includes('question') || lowerText.includes('comment') || lowerText.includes('pourquoi') || lowerText.includes('?')) {
    return 'question';
  }

  if (lowerText.includes('problème') || lowerText.includes('insatisfait') || lowerText.includes('mécontent')) {
    return 'complaint';
  }

  if (lowerText.includes('intéressé') || lowerText.includes('souhait') || lowerText.includes('voudrais')) {
    return 'interested';
  }

  return 'general';
}

async function handleQuoteRequest(supabase: any, lead: any, emailData: any) {
  await supabase
    .from('crm_leads_enhanced')
    .update({ 
      status: 'quote_requested',
      score: (lead.score || 0) + 30
    })
    .eq('id', lead.id);

  await supabase
    .from('smart_alerts')
    .insert({
      alert_type: 'high_priority_lead',
      severity: 'high',
      title: 'Demande de devis par email',
      description: `${lead.name} (${lead.email}) a demandé un devis`,
      affected_components: ['sales'],
      sent_to: ['sales@taxiassur.fr']
    });

  const autoResponse = `Bonjour ${lead.name},\n\nMerci pour votre demande de devis !\n\nNous avons bien reçu votre message et notre équipe vous préparera une offre personnalisée dans les plus brefs délais.\n\nEn attendant, vous pouvez obtenir une estimation instantanée sur notre site : https://taxiassur.fr\n\nCordialement,\nL'équipe TaxiAssur`;

  await sendEmail(supabase, lead.email, 'Votre demande de devis', autoResponse);
}

async function handleQuestion(supabase: any, lead: any, emailData: any, openaiKey?: string) {
  await supabase
    .from('crm_leads_enhanced')
    .update({ 
      status: 'engaged',
      score: (lead.score || 0) + 15
    })
    .eq('id', lead.id);

  const autoResponse = `Bonjour ${lead.name},\n\nMerci pour votre question !\n\nNous avons bien reçu votre message et notre équipe vous répondra dans les meilleurs délais.\n\nEn attendant, vous trouverez peut-être votre réponse dans notre FAQ : https://taxiassur.fr/faq\n\nCordialement,\nL'équipe TaxiAssur`;

  await sendEmail(supabase, lead.email, 'Ré: ' + emailData.subject, autoResponse);
}

async function handleComplaint(supabase: any, lead: any, emailData: any) {
  await supabase
    .from('crm_leads_enhanced')
    .update({ 
      status: 'requires_attention',
      score: Math.max((lead.score || 0) - 20, 0)
    })
    .eq('id', lead.id);

  await supabase
    .from('smart_alerts')
    .insert({
      alert_type: 'customer_complaint',
      severity: 'critical',
      title: 'Réclamation client',
      description: `${lead.name} (${lead.email}) a envoyé une réclamation`,
      affected_components: ['customer_service'],
      sent_to: ['support@taxiassur.fr']
    });

  const autoResponse = `Bonjour ${lead.name},\n\nNous sommes sincèrement désolés pour cette situation.\n\nVotre message a été transmis en priorité à notre service client qui vous contactera dans les plus brefs délais pour résoudre ce problème.\n\nCordialement,\nL'équipe TaxiAssur`;

  await sendEmail(supabase, lead.email, 'Ré: ' + emailData.subject, autoResponse);
}

async function handleInterest(supabase: any, lead: any, emailData: any) {
  await supabase
    .from('crm_leads_enhanced')
    .update({ 
      status: 'interested',
      score: (lead.score || 0) + 25
    })
    .eq('id', lead.id);

  const autoResponse = `Bonjour ${lead.name},\n\nMerci pour votre intérêt pour nos services !\n\nNous sommes ravis de pouvoir vous accompagner. Un conseiller vous contactera très prochainement pour discuter de vos besoins spécifiques.\n\nCordialement,\nL'équipe TaxiAssur`;

  await sendEmail(supabase, lead.email, 'Bienvenue chez TaxiAssur', autoResponse);
}

async function handleGeneral(supabase: any, lead: any, emailData: any) {
  await supabase
    .from('crm_leads_enhanced')
    .update({ 
      score: (lead.score || 0) + 5,
      last_contact_at: new Date().toISOString()
    })
    .eq('id', lead.id);

  const autoResponse = `Bonjour ${lead.name},\n\nMerci pour votre message !\n\nNous avons bien reçu votre email et nous vous répondrons dans les meilleurs délais.\n\nCordialement,\nL'équipe TaxiAssur`;

  await sendEmail(supabase, lead.email, 'Ré: ' + emailData.subject, autoResponse);
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
      body: JSON.stringify({ to, subject, body })
    });

    console.log('[Email Handler] Auto-response sent to:', to);
  } catch (error) {
    console.error('[Email Handler] Failed to send email:', error);
  }
}
