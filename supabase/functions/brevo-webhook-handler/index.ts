import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

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
    const payload = await req.json();
    console.log('Brevo webhook received:', JSON.stringify(payload, null, 2));

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Brevo envoie un tableau d'events
    const events = payload.events || [payload];

    for (const event of events) {
      const messageId = event.message_id || event['message-id'];
      const eventType = event.event;
      const email = event.email;

      if (!messageId) {
        console.log('No message ID in event, skipping');
        continue;
      }

      // Récupérer l'enregistrement de tracking
      const { data: tracking, error: fetchError } = await supabase
        .from('backlink_email_tracking')
        .select('*')
        .eq('brevo_message_id', messageId)
        .maybeSingle();

      if (fetchError || !tracking) {
        console.log(`No tracking found for message ${messageId}`);
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
            console.log(`👀 Email opened: ${email}`);
          }
          break;

        case 'click':
        case 'clicked':
          if (!tracking.clicked_at) {
            updates.clicked_at = event.date || new Date().toISOString();
            updates.status = 'clicked';
            console.log(`👆 Email clicked: ${email}`);
          }
          break;

        case 'delivered':
          console.log(`✅ Email delivered: ${email}`);
          break;

        case 'soft_bounce':
        case 'hard_bounce':
        case 'bounce':
          updates.bounced_at = event.date || new Date().toISOString();
          updates.status = 'bounced';
          console.log(`❌ Email bounced: ${email}`);
          break;

        case 'spam':
        case 'complaint':
          updates.status = 'failed';
          console.log(`⚠️ Spam complaint: ${email}`);
          break;

        case 'unsubscribed':
          console.log(`🚫 Unsubscribed: ${email}`);
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
        console.log(`✅ Tracking updated for ${messageId}`);
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
    console.error("Error processing Brevo webhook:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});