import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const brevoKey = Deno.env.get('BREVO_API_KEY')!;
    const sendgridKey = Deno.env.get('SENDGRID_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { campaign_id, test_mode = false, test_email } = await req.json();

    if (!campaign_id) {
      return new Response(
        JSON.stringify({ error: 'campaign_id requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Récupérer la campagne
    const { data: campaign, error: campaignError } = await supabase
      .from('newsletter_campaigns')
      .select('*')
      .eq('id', campaign_id)
      .single();

    if (campaignError || !campaign) {
      return new Response(
        JSON.stringify({ error: 'Campagne introuvable', details: campaignError }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Récupérer les abonnés actifs ou email de test
    let recipients = [];
    if (test_mode && test_email) {
      recipients = [{ email: test_email, name: 'Test' }];
    } else {
      const { data: subscribers } = await supabase
        .from('newsletter_subscribers')
        .select('email, name')
        .eq('status', 'active');
      recipients = subscribers || [];
    }

    if (recipients.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Aucun destinataire trouvé' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sélectionner le provider optimal
    const { data: provider, error: providerError } = await supabase
      .rpc('select_optimal_email_provider');

    const selectedProvider = provider || 'brevo';
    console.log(`🔧 Provider sélectionné: ${selectedProvider}`);

    // Marquer la campagne comme en cours
    await supabase
      .from('newsletter_campaigns')
      .update({
        status: 'sending',
        provider_used: selectedProvider,
        sent_at: new Date().toISOString()
      })
      .eq('id', campaign_id);

    let sentCount = 0;
    let errorCount = 0;

    // Envoyer les emails
    for (const recipient of recipients) {
      try {
        let emailSent = false;

        if (selectedProvider === 'brevo' && brevoKey) {
          const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
              'api-key': brevoKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sender: { name: 'TaxiAssur', email: 'contact@taxiassur.com' },
              to: [{ email: recipient.email, name: recipient.name || '' }],
              subject: campaign.subject,
              htmlContent: campaign.content_html,
              tags: ['newsletter', campaign_id]
            }),
          });

          if (brevoResponse.ok) {
            emailSent = true;
            const brevoData = await brevoResponse.json();
            
            // Enregistrer l'envoi
            await supabase.from('email_send_log').insert({
              recipient_email: recipient.email,
              subject: campaign.subject,
              provider_used: 'brevo',
              status: 'sent',
              message_id: brevoData.messageId,
              campaign_id: campaign_id
            });
          }
        } else if (selectedProvider === 'sendgrid' && sendgridKey) {
          const sendgridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${sendgridKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: { email: 'contact@taxiassur.com', name: 'TaxiAssur' },
              personalizations: [{
                to: [{ email: recipient.email, name: recipient.name || '' }]
              }],
              subject: campaign.subject,
              content: [{ type: 'text/html', value: campaign.content_html }]
            }),
          });

          if (sendgridResponse.ok || sendgridResponse.status === 202) {
            emailSent = true;
            const sendgridMsgId = sendgridResponse.headers.get('X-Message-Id');
            
            // Enregistrer l'envoi
            await supabase.from('email_send_log').insert({
              recipient_email: recipient.email,
              subject: campaign.subject,
              provider_used: 'sendgrid',
              status: 'sent',
              message_id: sendgridMsgId,
              campaign_id: campaign_id
            });
          }
        }

        if (emailSent) {
          sentCount++;
          // Incrémenter les compteurs du provider
          await supabase.rpc('increment_provider_counters', { p_provider: selectedProvider });
        } else {
          errorCount++;
        }

        // Délai pour éviter le rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`❌ Erreur envoi à ${recipient.email}:`, error);
        errorCount++;
      }
    }

    // Mettre à jour les stats de la campagne
    await supabase
      .from('newsletter_campaigns')
      .update({
        status: errorCount === 0 ? 'sent' : 'partial',
        total_sent: sentCount,
        completed_at: new Date().toISOString()
      })
      .eq('id', campaign_id);

    return new Response(
      JSON.stringify({
        success: true,
        campaign_id,
        provider_used: selectedProvider,
        sent_count: sentCount,
        error_count: errorCount,
        test_mode
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erreur fonction send-newsletter-universal:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});