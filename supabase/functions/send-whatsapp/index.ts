import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { claimDelivery, finishDelivery } from '../_shared/delivery-idempotency.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const internalDomains = new Set(["taxiassur.com", "taxiassur.fr", "xcr.fr"]);

async function isAuthorized(req: Request, supabaseUrl: string, serviceKey: string): Promise<boolean> {
  const authorization = req.headers.get("Authorization") || "";
  const token = authorization.replace(/^Bearer\s+/i, "");
  if (!token) return false;
  if (token === serviceKey) return true;
  const admin = createClient(supabaseUrl, serviceKey);
  const { data, error } = await admin.auth.getUser(token);
  if (error) return false;
  const email = data.user?.email?.toLowerCase() || "";
  return internalDomains.has(email.split("@")[1]);
}

interface SendWhatsAppRequest {
  conversationId?: string;
  body?: string;
  message?: string;
  to?: string;
  lead_id?: string;
  leadId?: string;
  templateName?: string;
  templateVariables?: Record<string, string>;
  mediaUrl?: string;
  requestId?: string;
}

function normalizePhone(value: unknown): string | null {
  let phone = String(value ?? "").replace(/^whatsapp:/i, "").replace(/[^\d+]/g, "");
  if (phone.startsWith("00")) phone = `+${phone.slice(2)}`;
  else if (phone.startsWith("0")) phone = `+33${phone.slice(1)}`;
  else if (!phone.startsWith("+") && phone.startsWith("33")) phone = `+${phone}`;
  return /^\+[1-9]\d{7,14}$/.test(phone) ? phone : null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let deliveryAdmin: any = null;
  let deliveryRequestId: string | undefined;
  let providerCallStarted = false;
  let deliveryFinalized = false;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ success: false, error: "Service indisponible" }), {
        status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(supabaseUrl, supabaseKey);
    deliveryAdmin = supabase;

    if (!await isAuthorized(req, supabaseUrl, supabaseKey)) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { conversationId, body, message, to, lead_id, leadId, templateName, templateVariables, mediaUrl, requestId } =
      await req.json() as SendWhatsAppRequest;

    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    let resolvedConversationId = conversationId || "";
    if (resolvedConversationId && !uuidPattern.test(resolvedConversationId)) {
      return new Response(JSON.stringify({ success: false, error: "Conversation invalide" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!resolvedConversationId) {
      const requestedLeadId = lead_id || leadId || "";
      let phone = normalizePhone(to);
      let displayName = "Contact WhatsApp";
      if (requestedLeadId) {
        if (!uuidPattern.test(requestedLeadId)) return new Response(JSON.stringify({ success: false, error: "Lead invalide" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const { data: lead } = await supabase.from("crm_leads").select("phone, first_name, last_name").eq("id", requestedLeadId).maybeSingle();
        if (!lead) return new Response(JSON.stringify({ success: false, error: "Lead introuvable" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        phone = normalizePhone(lead.phone);
        displayName = `${lead.first_name || ""} ${lead.last_name || ""}`.trim() || displayName;
      }
      if (!phone) return new Response(JSON.stringify({ success: false, error: "Telephone invalide" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      let { data: waContact } = await supabase.from("wa_contacts").select("id").eq("phone_e164", phone).maybeSingle();
      if (!waContact) {
        const { data: created, error: createError } = await supabase.from("wa_contacts").upsert({ phone_e164: phone, display_name: displayName }, { onConflict: "phone_e164" }).select("id").single();
        if (createError || !created) throw new Error("WhatsAppContactError");
        waContact = created;
      }
      let { data: waConversation } = await supabase.from("wa_conversations").select("id").eq("contact_id", waContact.id).eq("status", "open").order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!waConversation) {
        const { data: created, error: createError } = await supabase.from("wa_conversations").insert({ contact_id: waContact.id, status: "open" }).select("id").single();
        if (createError || !created) throw new Error("WhatsAppConversationError");
        waConversation = created;
      }
      resolvedConversationId = waConversation.id;
    }

    const { data: conversation, error: convError } = await supabase
      .from("wa_conversations")
      .select("*, wa_contacts(*)")
      .eq("id", resolvedConversationId)
      .single();

    if (convError || !conversation) {
      return new Response(
        JSON.stringify({ success: false, error: "Conversation not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const contact = conversation.wa_contacts;

    if (!contact?.phone_e164 || !/^\+[1-9]\d{7,14}$/.test(contact.phone_e164)) {
      return new Response(JSON.stringify({ success: false, error: "Invalid contact phone" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (contact.opted_out) {
      return new Response(
        JSON.stringify({ success: false, error: "Contact opted out" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let messageBody = body || message;
    let usedTemplateId: string | null = null;

    if (templateName) {
      if (!/^[a-zA-Z0-9_-]{1,100}$/.test(templateName)) {
        return new Response(JSON.stringify({ success: false, error: "Nom de modele invalide" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (templateVariables && (
        typeof templateVariables !== "object" ||
        Array.isArray(templateVariables) ||
        Object.entries(templateVariables).length > 20 ||
        Object.entries(templateVariables).some(([key, value]) =>
          !/^[a-zA-Z0-9_]{1,50}$/.test(key) || typeof value !== "string" || value.length > 500
        )
      )) {
        return new Response(JSON.stringify({ success: false, error: "Variables de modele invalides" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: template } = await supabase
        .from("wa_templates")
        .select("*")
        .eq("name", templateName)
        .eq("approved", true)
        .single();

      if (!template) {
        return new Response(JSON.stringify({ success: false, error: "Modele WhatsApp approuve introuvable" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (template) {
        messageBody = template.body;
        if (templateVariables) {
          Object.entries(templateVariables).forEach(([key, value]) => {
            messageBody = messageBody!.replace(`{{${key}}}`, value);
          });
        }

        usedTemplateId = template.id;
      }
    }

    if (!messageBody) {
      return new Response(
        JSON.stringify({ success: false, error: "Message body required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    messageBody = messageBody.trim();
    if (messageBody.length > 4096) {
      return new Response(JSON.stringify({ success: false, error: "Message too long" }), {
        status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (mediaUrl) {
      try {
        const parsedMediaUrl = new URL(mediaUrl);
        const allowedMediaHost = parsedMediaUrl.hostname === 'taxiassur.com' ||
          parsedMediaUrl.hostname.endsWith('.taxiassur.com') ||
          parsedMediaUrl.hostname.endsWith('.supabase.co');
        if (parsedMediaUrl.protocol !== 'https:' || !allowedMediaHost || mediaUrl.length > 2048) {
          throw new Error('Invalid media URL');
        }
      } catch {
        return new Response(JSON.stringify({ success: false, error: "Invalid mediaUrl" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
    const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
    const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
    const TWILIO_WHATSAPP_FROM = Deno.env.get("TWILIO_WHATSAPP_FROM") || "";

    if (
      !TWILIO_ACCOUNT_SID ||
      !/^AC[0-9a-f]{32}$/i.test(TWILIO_ACCOUNT_SID) ||
      !TWILIO_AUTH_TOKEN ||
      !/^whatsapp:\+[1-9]\d{7,14}$/.test(TWILIO_WHATSAPP_FROM)
    ) {
      return new Response(
        JSON.stringify({ success: false, error: "Service WhatsApp indisponible" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    const deliveryClaim = await claimDelivery(supabase, {
      requestId, channel: "whatsapp",
      fingerprint: JSON.stringify({ conversationId: resolvedConversationId, to: contact.phone_e164, body: messageBody, templateName: templateName || null, templateVariables: templateVariables || null, mediaUrl: mediaUrl || null }),
    });
    if (deliveryClaim?.kind === "conflict") return new Response(JSON.stringify({ success: false, error: "Identifiant de livraison invalide ou deja utilise" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (deliveryClaim?.kind === "replay") return new Response(JSON.stringify(deliveryClaim.response), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (deliveryClaim?.kind === "in_progress" || deliveryClaim?.kind === "uncertain") return new Response(JSON.stringify({ success: false, error: "Livraison deja en cours ou statut fournisseur incertain", retryable: false }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    deliveryRequestId = deliveryClaim?.kind === "claimed" ? deliveryClaim.requestId : undefined;
    providerCallStarted = true;
    const twilioResponse = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
      signal: AbortSignal.timeout(30_000),
    });

    if (!twilioResponse.ok) {
      await finishDelivery(supabase, deliveryRequestId, "failed", { error: `Twilio HTTP ${twilioResponse.status}` });
      deliveryFinalized = true;
      providerCallStarted = false;
      await twilioResponse.text();
      console.error("Twilio API failure", twilioResponse.status);
      return new Response(JSON.stringify({
        success: false,
        error: twilioResponse.status === 429 ? "Limite WhatsApp atteinte, reessayez plus tard" : "Echec envoi WhatsApp",
      }), {
        status: twilioResponse.status === 429 ? 429 : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await twilioResponse.json();
    if (!/^SM[a-f0-9]{32}$/i.test(String(result.sid || ''))) {
      await finishDelivery(supabase, deliveryRequestId, "uncertain", { error: "InvalidTwilioResponse" });
      deliveryFinalized = true;
      providerCallStarted = false;
      return new Response(JSON.stringify({ success: false, error: "Réponse WhatsApp invalide" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const providerStatus = String(result.status || '').toLowerCase();
    const normalizedStatus = ['accepted', 'queued', 'sending'].includes(providerStatus)
      ? 'queued'
      : providerStatus === 'sent' ? 'sent'
      : providerStatus === 'delivered' ? 'delivered'
      : providerStatus === 'read' ? 'read'
      : ['undelivered', 'failed'].includes(providerStatus) ? 'failed'
      : null;
    if (!normalizedStatus) {
      await finishDelivery(supabase, deliveryRequestId, "uncertain", { providerId: String(result.sid), error: "InvalidTwilioStatus" });
      deliveryFinalized = true;
      providerCallStarted = false;
      return new Response(JSON.stringify({ success: false, error: "Statut WhatsApp invalide" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader2 = req.headers.get("authorization");
    let userId = null;
    if (authHeader2) {
      const token = authHeader2.replace("Bearer ", "");
      const { data: userData } = await supabase.auth.getUser(token);
      userId = userData?.user?.id;
    }

    const { error: msgError } = await supabase.from("wa_messages").insert({
      conversation_id: resolvedConversationId,
      direction: "outbound",
      body: messageBody,
      media_url: mediaUrl || null,
      message_sid: result.sid,
      status: normalizedStatus,
      sent_by_user_id: userId,
    });

    if (msgError) {
      await finishDelivery(supabase, deliveryRequestId, "uncertain", { providerId: String(result.sid), error: "WhatsAppAuditFailure" });
      deliveryFinalized = true;
      providerCallStarted = false;
      console.error("WhatsApp persistence failure", msgError.code || "unknown");
      return new Response(JSON.stringify({ success: false, error: "WhatsApp accepté, audit non enregistré" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (usedTemplateId) {
      const { error: usageError } = await supabase.rpc("increment_wa_template_usage", { p_template_id: usedTemplateId });
      if (usageError) console.error("WhatsApp template usage persistence failed");
    }

    const successPayload = { success: true };
    await finishDelivery(supabase, deliveryRequestId, "sent", { providerId: String(result.sid), response: successPayload });
    deliveryFinalized = true;
    providerCallStarted = false;
    return new Response(JSON.stringify(successPayload), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    if (deliveryAdmin && deliveryRequestId && !deliveryFinalized) {
      try {
        await finishDelivery(deliveryAdmin, deliveryRequestId, providerCallStarted ? "uncertain" : "failed", { error: error instanceof Error ? error.name : "unknown" });
      } catch {
        console.error("WhatsApp delivery ledger update failed");
      }
    }
    console.error("Send WhatsApp failure", error instanceof Error ? error.name : "unknown");
    return new Response(
      JSON.stringify({
        success: false,
        error: "Erreur serveur WhatsApp",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});