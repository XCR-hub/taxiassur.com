import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { verifyBearerSecret } from '../_shared/secret-auth.ts';

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
    if (!verifyBearerSecret(req, Deno.env.get('BREVO_WEBHOOK_TOKEN'))) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const payload = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Brevo envoie un tableau d'events
    const events = payload.events || [payload];

    for (const event of events) {
      const messageId = event.messageId || event.message_id || event['message-id'];
      const eventType = event.msg_status || event.event;

      if (!messageId) {
        console.warn('Brevo event skipped without message identifier');
        continue;
      }

      if (event.messageId !== undefined) {
        const normalizedStatus = String(eventType || '').toLowerCase();
        const delivered = normalizedStatus === 'delivered';
        const failed = ['soft_bounce', 'hard_bounce', 'blocked', 'invalid', 'error', 'skip'].includes(normalizedStatus);
        const sent = ['accepted', 'sent'].includes(normalizedStatus);
        if (!delivered && !failed && !sent) continue;

        const smsUpdates: Record<string, unknown> = {
          status: delivered ? 'delivered' : failed ? 'failed' : 'sent',
          updated_at: new Date().toISOString(),
        };
        if (delivered) smsUpdates.delivered_at = new Date().toISOString();

        const { error: smsUpdateError } = await supabase
          .from('sms_messages')
          .update(smsUpdates)
          .eq('provider_message_id', String(messageId))
          .eq('direction', 'outbound');
        if (smsUpdateError) throw smsUpdateError;
        continue;
      }

      // Récupérer l'enregistrement de tracking
      const { data: tracking, error: fetchError } = await supabase
        .from('backlink_email_tracking')
        .select('*')
        .eq('brevo_message_id', messageId)
        .maybeSingle();

      if (fetchError || !tracking) {

        // Tenter de trouver dans crm_interactions pour les emails CRM
        const { data: interaction } = await supabase
          .from('crm_interactions')
          .select('*')
          .eq('brevo_message_id', messageId)
          .maybeSingle();

        if (interaction) {
          // Mettre à jour l'interaction CRM
          const crmUpdates: any = {};

          if (eventType === 'opened' || eventType === 'open') {
            crmUpdates.opened_at = event.date || new Date().toISOString();
          } else if (eventType === 'click' || eventType === 'clicked') {
            crmUpdates.clicked_at = event.date || new Date().toISOString();
          }

          if (Object.keys(crmUpdates).length > 0) {
            await supabase
              .from('crm_interactions')
              .update(crmUpdates)
              .eq('id', interaction.id);
          }
        }

        continue;
      }

      // Préparer les mises à jour selon le type d'événement
      const updates: any = {
        brevo_event_data: {
          ...(tracking.brevo_event_data || {}),
          [eventType]: event
        },
        updated_at: new Date().toISOString()
      };

      switch (eventType) {
        case 'opened':
        case 'open':
          if (!tracking.opened_at) {
            updates.opened_at = event.date || new Date().toISOString();
            updates.status = 'opened';
          }
          break;

        case 'click':
        case 'clicked':
          if (!tracking.clicked_at) {
            updates.clicked_at = event.date || new Date().toISOString();
            updates.status = 'clicked';
          }
          break;

        case 'delivered':
          break;

        case 'soft_bounce':
        case 'hard_bounce':
        case 'bounce':
          updates.bounced_at = event.date || new Date().toISOString();
          updates.status = 'bounced';
          break;

        case 'spam':
        case 'complaint':
          updates.status = 'failed';
          break;

        case 'unsubscribed':
          break;

        default:
          console.log(`Unknown event type: ${eventType}`);
      }

      // Mettre à jour le tracking
      const { error: updateError } = await supabase
        .from('backlink_email_tracking')
        .update(updates)
        .eq('id', tracking.id);

      if (updateError) {
        console.error('Error updating tracking:', updateError);
      } else {
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: events.length }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );
  } catch (error) {
    console.error("Error processing Brevo webhook");
    return new Response(
      JSON.stringify({ success: false, error: "Webhook processing failed" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});