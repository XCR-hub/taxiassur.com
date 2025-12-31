import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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
    const payload: any = {};
    formData.forEach((value, key) => {
      payload[key] = value;
    });

    console.log("WhatsApp status webhook:", payload);

    const { MessageSid, MessageStatus, ErrorCode, ErrorMessage } = payload as TwilioStatusPayload;

    const updateData: any = {
      status: MessageStatus.toLowerCase(),
    };

    if (ErrorCode) {
      updateData.error_code = ErrorCode;
    }

    if (ErrorMessage) {
      updateData.error_message = ErrorMessage;
    }

    if (MessageStatus.toLowerCase() === "read") {
      updateData.read_at = new Date().toISOString();
    }

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
      payload: payload,
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