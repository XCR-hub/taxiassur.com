import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { verifyTwilioWebhook } from "../_shared/twilio-webhook.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Twilio-Signature",
};

interface TwilioStatusPayload {
  MessageSid: string;
  MessageStatus: string;
  ErrorCode?: string;
  ErrorMessage?: string;
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
    if (!(await verifyTwilioWebhook(req, formData, "TWILIO_WHATSAPP_STATUS_URL"))) {
      return new Response("Forbidden", { status: 403, headers: corsHeaders });
    }
    const payload: Record<string, string> = {};
    formData.forEach((value, key) => {
      payload[key] = String(value);
    });


    const { MessageSid, MessageStatus, ErrorCode, ErrorMessage } = payload as unknown as TwilioStatusPayload;
    if (!/^SM[a-f0-9]{32}$/i.test(String(MessageSid || ''))) {
      return new Response('Invalid message identifier', { status: 400, headers: corsHeaders });
    }

    const providerStatus = String(MessageStatus || '').toLowerCase();
    const statusMap: Record<string, 'queued' | 'sent' | 'delivered' | 'read' | 'failed'> = {
      accepted: 'queued',
      queued: 'queued',
      sending: 'queued',
      sent: 'sent',
      delivered: 'delivered',
      read: 'read',
      undelivered: 'failed',
      failed: 'failed',
    };
    const normalizedStatus = statusMap[providerStatus];
    if (!normalizedStatus) {
      return new Response('Invalid message status', { status: 400, headers: corsHeaders });
    }

    const updateData: Record<string, string> = { status: normalizedStatus };
    if (ErrorCode) updateData.error_code = String(ErrorCode).replace(/[\r\n]/g, ' ').slice(0, 50);
    if (ErrorMessage) updateData.error_message = String(ErrorMessage).replace(/[\r\n]/g, ' ').slice(0, 500);
    if (normalizedStatus === 'read') updateData.read_at = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("wa_messages")
      .update(updateData)
      .eq("message_sid", MessageSid);

    if (updateError) {
      console.error("Error updating message status:", updateError);
      throw updateError;
    }

    await supabase.from("wa_webhooks_log").insert({
      webhook_type: "status_callback",
      message_sid: MessageSid,
      payload: { message_status: normalizedStatus, error_code: updateData.error_code || null },
      processed: true,
    });

    return new Response("OK", {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "text/plain" },
    });
  } catch (error) {
    console.error("WhatsApp status webhook error:", error);

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