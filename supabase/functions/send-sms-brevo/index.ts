import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { claimDelivery, finishDelivery } from "../_shared/delivery-idempotency.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const internalDomains = new Set(["taxiassur.com", "taxiassur.fr", "xcr.fr"]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

interface SMSRequest {
  to: string;
  content: string;
  lead_id?: string;
  sender?: string;
  tag?: string;
  requestId?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let deliveryAdmin: any = null;
  let deliveryRequestId: string | undefined;
  let providerCallStarted = false;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ error: "Service indisponible" }), {
        status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!await isAuthorized(req, supabaseUrl, serviceKey)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }    deliveryAdmin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });


    const brevoApiKey = Deno.env.get("BREVO_API_KEY");
    if (!brevoApiKey) {
      return new Response(
        JSON.stringify({ error: "Service SMS indisponible" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload = await req.json() as Partial<SMSRequest>;
    let to = typeof payload.to === "string" ? payload.to.trim() : "";
    const content = typeof payload.content === "string" ? payload.content.trim() : "";
    const lead_id = typeof payload.lead_id === "string" ? payload.lead_id : undefined;
    const tag = typeof payload.tag === "string" ? payload.tag.slice(0, 64) : "crm-sms";

    if (lead_id && !uuidPattern.test(lead_id)) {
      return new Response(JSON.stringify({ error: "Invalid lead_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (lead_id) {
      const { data: lead } = await deliveryAdmin.from("crm_leads").select("phone").eq("id", lead_id).maybeSingle();
      if (!lead?.phone) {
        return new Response(JSON.stringify({ error: "Lead phone not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      to = lead.phone;
    }

    if (!to || !content) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, content" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (content.length > 480) {
      return new Response(JSON.stringify({ error: "SMS content too long" }), {
        status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Format phone number to international format
    let phoneNumber = to.replace(/[\s.-]/g, "");
    if (phoneNumber.startsWith("0")) {
      phoneNumber = "33" + phoneNumber.substring(1);
    }
    if (!phoneNumber.startsWith("+")) {
      phoneNumber = "+" + phoneNumber;
    }
    if (!/^\+[1-9]\d{7,14}$/.test(phoneNumber)) {
      return new Response(JSON.stringify({ error: "Invalid phone number" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const deliveryClaim = await claimDelivery(deliveryAdmin, {
      requestId: payload.requestId,
      channel: "sms",
      fingerprint: JSON.stringify({ phoneNumber, content, lead_id: lead_id || null, tag }),
    });
    if (deliveryClaim?.kind === "conflict") return new Response(JSON.stringify({ error: "Identifiant de livraison invalide ou deja utilise" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (deliveryClaim?.kind === "replay") return new Response(JSON.stringify(deliveryClaim.response), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (deliveryClaim?.kind === "in_progress" || deliveryClaim?.kind === "uncertain") return new Response(JSON.stringify({ error: "Livraison deja en cours ou statut fournisseur incertain", retryable: false }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    deliveryRequestId = deliveryClaim?.kind === "claimed" ? deliveryClaim.requestId : undefined;

    // Brevo Transactional SMS API
    providerCallStarted = true;
    const brevoResponse = await fetch(
      "https://api.brevo.com/v3/transactionalSMS/sms",
      {
        method: "POST",
        signal: AbortSignal.timeout(15000),
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
          tag,
        }),
      }
    );

    let brevoData: Record<string, unknown> = {};
    try { brevoData = await brevoResponse.json(); } catch { /* non-JSON provider response */ }

    if (!brevoResponse.ok) {
      await finishDelivery(deliveryAdmin, deliveryRequestId, "failed", { error: `Brevo HTTP ${brevoResponse.status}` });
      providerCallStarted = false;
      console.error("Brevo SMS failure", brevoResponse.status);
      return new Response(
        JSON.stringify({
          error: brevoResponse.status === 429 ? "Limite SMS atteinte, reessayez plus tard" : "Echec envoi SMS",
        }),
        { status: brevoResponse.status === 429 ? 429 : 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log interaction in CRM if lead_id provided
    if (lead_id) {
      await deliveryAdmin.from("crm_interactions").insert({
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

    const successPayload = { success: true };
    await finishDelivery(deliveryAdmin, deliveryRequestId, "sent", {
      providerId: String(brevoData.messageId || ""), response: successPayload,
    });
    providerCallStarted = false;
    return new Response(JSON.stringify(successPayload), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    if (deliveryAdmin && deliveryRequestId) {
      try {
        await finishDelivery(deliveryAdmin, deliveryRequestId, providerCallStarted ? "uncertain" : "failed", { error: error instanceof Error ? error.name : "unknown" });
      } catch {
        console.error("SMS delivery ledger update failed");
      }
    }
    console.error("SMS send failure", error instanceof Error ? error.name : "unknown");
    return new Response(
      JSON.stringify({ error: "Erreur serveur SMS" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
