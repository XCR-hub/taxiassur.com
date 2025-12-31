import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SendWhatsAppRequest {
  conversationId: string;
  body?: string;
  templateName?: string;
  templateVariables?: Record<string, string>;
  mediaUrl?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { conversationId, body, templateName, templateVariables, mediaUrl } =
      await req.json() as SendWhatsAppRequest;

    if (!conversationId) {
      return new Response(
        JSON.stringify({ success: false, error: "conversationId required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: conversation, error: convError } = await supabase
      .from("wa_conversations")
      .select("*, wa_contacts(*)")
      .eq("id", conversationId)
      .single();

    if (convError || !conversation) {
      return new Response(
        JSON.stringify({ success: false, error: "Conversation not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const contact = conversation.wa_contacts;

    if (contact.opted_out) {
      return new Response(
        JSON.stringify({ success: false, error: "Contact opted out" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let messageBody = body;

    if (templateName) {
      const { data: template } = await supabase
        .from("wa_templates")
        .select("*")
        .eq("name", templateName)
        .eq("approved", true)
        .single();

      if (template) {
        messageBody = template.body;
        if (templateVariables) {
          Object.entries(templateVariables).forEach(([key, value]) => {
            messageBody = messageBody!.replace(`{{${key}}}`, value);
          });
        }

        await supabase
          .from("wa_templates")
          .update({ usage_count: (template.usage_count || 0) + 1 })
          .eq("id", template.id);
      }
    }

    if (!messageBody) {
      return new Response(
        JSON.stringify({ success: false, error: "Message body required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
    const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
    const TWILIO_WHATSAPP_FROM = Deno.env.get("TWILIO_WHATSAPP_FROM") || "whatsapp:+14155238886";

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      return new Response(
        JSON.stringify({ success: false, error: "Twilio credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const authHeader = `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`;

    const formData = new URLSearchParams();
    formData.append("To", `whatsapp:${contact.phone_e164}`);
    formData.append("From", TWILIO_WHATSAPP_FROM);
    formData.append("Body", messageBody);

    if (mediaUrl) {
      formData.append("MediaUrl", mediaUrl);
    }

    const twilioResponse = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    if (!twilioResponse.ok) {
      const errorText = await twilioResponse.text();
      console.error("Twilio API error:", errorText);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Twilio error: ${twilioResponse.status}`,
          details: errorText,
        }),
        { status: twilioResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await twilioResponse.json();

    const authHeader2 = req.headers.get("authorization");
    let userId = null;
    if (authHeader2) {
      const token = authHeader2.replace("Bearer ", "");
      const { data: userData } = await supabase.auth.getUser(token);
      userId = userData?.user?.id;
    }

    const { error: msgError } = await supabase.from("wa_messages").insert({
      conversation_id: conversationId,
      direction: "outbound",
      body: messageBody,
      media_url: mediaUrl || null,
      message_sid: result.sid,
      status: result.status,
      sent_by_user_id: userId,
    });

    if (msgError) {
      console.error("Error saving message:", msgError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        messageSid: result.sid,
        status: result.status,
        message: "WhatsApp sent successfully",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Send WhatsApp error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});