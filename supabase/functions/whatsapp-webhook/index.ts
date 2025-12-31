import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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
    const payload: any = {};
    formData.forEach((value, key) => {
      payload[key] = value;
    });

    console.log("WhatsApp webhook received:", payload);

    const { MessageSid, From, To, Body, NumMedia, MediaUrl0, MediaContentType0 } = payload as TwilioWebhookPayload;

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

    if (NumMedia && parseInt(NumMedia) > 0) {
      messageData.media_url = MediaUrl0;
      messageData.media_content_type = MediaContentType0;
    }

    const { error: msgError } = await supabase
      .from("wa_messages")
      .insert(messageData);

    if (msgError) {
      console.error("Error inserting message:", msgError);
      throw msgError;
    }

    await supabase.from("wa_webhooks_log").insert({
      webhook_type: "inbound_message",
      message_sid: MessageSid,
      payload: payload,
      processed: true,
    });

    if (Body?.toLowerCase().includes("stop")) {
      await supabase
        .from("wa_contacts")
        .update({ opted_out: true })
        .eq("phone_e164", phone);
    } else if (Body?.toLowerCase().includes("start")) {
      await supabase
        .from("wa_contacts")
        .update({ opted_out: false })
        .eq("phone_e164", phone);
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