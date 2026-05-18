import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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
    const to = payload.to;
    const content = payload.body || payload.message || payload.content;
    const lead_id = payload.lead_id || payload.leadId;

    if (!to || !content) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields: to and body/message/content" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const brevoApiKey = Deno.env.get("BREVO_API_KEY");
    if (!brevoApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "SMS service not configured (BREVO_API_KEY missing)" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let phoneNumber = to.replace(/[\s\-\.]/g, "");
    if (phoneNumber.startsWith("0")) {
      phoneNumber = "33" + phoneNumber.substring(1);
    }
    if (!phoneNumber.startsWith("+")) {
      phoneNumber = "+" + phoneNumber;
    }

    const brevoResponse = await fetch("https://api.brevo.com/v3/transactionalSMS/sms", {
      method: "POST",
      headers: {
        "api-key": brevoApiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        type: "transactional",
        unicodeEnabled: true,
        sender: "TaxiAssur",
        recipient: phoneNumber,
        content: content,
        tag: payload.tag || "crm-sms",
      }),
    });

    const brevoData = await brevoResponse.json();

    if (!brevoResponse.ok) {
      console.error("Brevo SMS error:", brevoData);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to send SMS", details: brevoData }),
        { status: brevoResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (lead_id) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      await supabase.from("crm_interactions").insert({
        lead_id,
        type: "sms",
        direction: "outbound",
        subject: `SMS envoye au ${to}`,
        content: content,
        metadata: {
          message_id: brevoData.messageId,
          reference: brevoData.reference,
          phone: phoneNumber,
          provider: "brevo",
        },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        messageId: brevoData.messageId,
        reference: brevoData.reference,
        smsCount: brevoData.smsCount || 1,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Send SMS error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
