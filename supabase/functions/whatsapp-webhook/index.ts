import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { verifyTwilioWebhook } from "../_shared/twilio-webhook.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, X-Twilio-Signature",
};

interface TwilioWebhookPayload {
  MessageSid: string;
  From: string;
  To: string;
  Body?: string;
  NumMedia?: string;
  MediaUrl0?: string;
  MediaContentType0?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const formData = await req.formData();
    if (!(await verifyTwilioWebhook(req, formData, "TWILIO_WHATSAPP_WEBHOOK_URL"))) {
      return new Response("Forbidden", { status: 403, headers: corsHeaders });
    }
    const payload: Record<string, string> = {};
    formData.forEach((value, key) => {
      payload[key] = String(value);
    });


    const { MessageSid, From, To, Body, NumMedia, MediaUrl0, MediaContentType0 } = payload as unknown as TwilioWebhookPayload;
    const mediaCount = Number(NumMedia || 0);
    if (!/^SM[a-f0-9]{32}$/i.test(String(MessageSid || '')) ||
        !/^whatsapp:\+[1-9]\d{7,14}$/.test(String(From || '')) ||
        (Body && Body.length > 4096) ||
        !Number.isInteger(mediaCount) || mediaCount < 0 || mediaCount > 10) {
      return new Response('Invalid WhatsApp payload', { status: 400, headers: corsHeaders });
    }
    if (mediaCount > 0) {
      try {
        const mediaUrl = new URL(String(MediaUrl0 || ''));
        if (mediaUrl.protocol !== 'https:' || !(mediaUrl.hostname === 'api.twilio.com' || mediaUrl.hostname.endsWith('.twilio.com'))) {
          throw new Error('Untrusted media URL');
        }
      } catch {
        return new Response('Invalid WhatsApp media', { status: 400, headers: corsHeaders });
      }
    }

    const phone = From.replace("whatsapp:", "");

    const { data: convId, error: convError } = await supabase
      .rpc("upsert_wa_contact_conversation", {
        p_phone: phone,
        p_name: null
      });

    if (convError) {
      console.error("Error upserting contact:", convError);
      throw convError;
    }

    const messageData: any = {
      conversation_id: convId,
      direction: "inbound",
      body: Body || null,
      message_sid: MessageSid,
      status: "received",
    };

    if (mediaCount > 0) {
      messageData.media_url = MediaUrl0;
      messageData.media_content_type = MediaContentType0;
    }

    const { error: msgError } = await supabase
      .from("wa_messages")
      .insert(messageData);

    if (msgError?.code === "23505") {
      return new Response("OK", { status: 200, headers: { ...corsHeaders, "Content-Type": "text/plain" } });
    }
    if (msgError) {
      console.error("Error inserting inbound WhatsApp message");
      throw msgError;
    }

    await supabase.from("wa_webhooks_log").insert({
      webhook_type: "inbound_message",
      message_sid: MessageSid,
      payload: { has_body: Boolean(Body), num_media: Number(NumMedia || 0), media_content_type: MediaContentType0 || null },
      processed: true,
    });

    const normalizedCommand = Body?.trim().toLowerCase();
    if (["stop", "unsubscribe", "désabonnement", "desabonnement"].includes(normalizedCommand || "")) {
      await supabase.from("wa_contacts").update({ opted_out: true }).eq("phone_e164", phone);
    } else if (["start", "subscribe", "réabonnement", "reabonnement"].includes(normalizedCommand || "")) {
      await supabase.from("wa_contacts").update({ opted_out: false }).eq("phone_e164", phone);
    }
    return new Response("OK", {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "text/plain" },
    });
  } catch (error) {
    console.error("WhatsApp webhook error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});