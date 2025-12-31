import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface TwilioWebhook {
  MessageSid?: string;
  SmsSid?: string;
  AccountSid?: string;
  MessagingServiceSid?: string;
  From?: string;
  To?: string;
  Body?: string;
  MessageStatus?: string;
  SmsStatus?: string;
  ErrorCode?: string;
  ErrorMessage?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const contentType = req.headers.get("content-type") || "";
    let webhookData: TwilioWebhook = {};

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      webhookData = Object.fromEntries(formData.entries());
    } else if (contentType.includes("application/json")) {
      webhookData = await req.json();
    }

    console.log("📥 Webhook Twilio reçu:", webhookData);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const messageSid = webhookData.MessageSid || webhookData.SmsSid;
    const status = webhookData.MessageStatus || webhookData.SmsStatus;
    const from = webhookData.From;
    const to = webhookData.To;
    const body = webhookData.Body;

    if (body && from) {
      console.log("📨 SMS entrant reçu de", from);

      const response = await fetch(`${supabaseUrl}/rest/v1/sms_received`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
          "Prefer": "return=minimal"
        },
        body: JSON.stringify({
          from_number: from,
          to_number: to,
          message_body: body,
          message_sid: messageSid,
          raw_data: webhookData,
          received_at: new Date().toISOString()
        })
      });

      if (!response.ok) {
        console.error("Erreur enregistrement SMS:", await response.text());
      }
    }

    if (status && messageSid) {
      console.log(`📊 Mise à jour statut SMS ${messageSid}: ${status}`);

      const response = await fetch(
        `${supabaseUrl}/rest/v1/sms_logs?message_sid=eq.${messageSid}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
            "Prefer": "return=minimal"
          },
          body: JSON.stringify({
            status: status,
            error_code: webhookData.ErrorCode || null,
            error_message: webhookData.ErrorMessage || null,
            updated_at: new Date().toISOString()
          })
        }
      );

      if (!response.ok) {
        console.error("Erreur mise à jour statut:", await response.text());
      }
    }

    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "text/xml"
        }
      }
    );

  } catch (error) {
    console.error("❌ Erreur webhook:", error);

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});