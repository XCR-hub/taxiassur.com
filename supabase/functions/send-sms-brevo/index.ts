import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SMSRequest {
  to: string;
  content: string;
  lead_id?: string;
  sender?: string;
  tag?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const brevoApiKey = Deno.env.get("BREVO_API_KEY");
    if (!brevoApiKey) {
      return new Response(
        JSON.stringify({ error: "BREVO_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { to, content, lead_id, sender, tag }: SMSRequest = await req.json();

    if (!to || !content) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, content" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format phone number to international format
    let phoneNumber = to.replace(/[\s\-\.]/g, "");
    if (phoneNumber.startsWith("0")) {
      phoneNumber = "33" + phoneNumber.substring(1);
    }
    if (!phoneNumber.startsWith("+")) {
      phoneNumber = "+" + phoneNumber;
    }

    // Brevo Transactional SMS API
    const brevoResponse = await fetch(
      "https://api.brevo.com/v3/transactionalSMS/sms",
      {
        method: "POST",
        headers: {
          "api-key": brevoApiKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          type: "transactional",
          unicodeEnabled: true,
          sender: sender || "TaxiAssur",
          recipient: phoneNumber,
          content: content,
          tag: tag || "crm-sms",
        }),
      }
    );

    const brevoData = await brevoResponse.json();

    if (!brevoResponse.ok) {
      console.error("Brevo SMS error:", brevoData);
      return new Response(
        JSON.stringify({
          error: "Failed to send SMS",
          details: brevoData,
        }),
        { status: brevoResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log interaction in CRM if lead_id provided
    if (lead_id) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      await supabase.from("crm_interactions").insert({
        lead_id,
        type: "sms",
        direction: "outbound",
        subject: `SMS envoyé au ${to}`,
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
        creditUsed: brevoData.creditRemaining
          ? undefined
          : brevoData.smsCount || 1,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("SMS send error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", message: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
