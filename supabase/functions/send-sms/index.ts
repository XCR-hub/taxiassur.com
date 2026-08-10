import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};
const internalDomains = new Set(["taxiassur.com", "taxiassur.fr", "xcr.fr"]);

async function isAuthorized(req: Request, supabaseUrl: string, serviceKey: string): Promise<boolean> {
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return false;
  if (token === serviceKey) return true;
  const admin = createClient(supabaseUrl, serviceKey);
  const { data, error } = await admin.auth.getUser(token);
  if (error) return false;
  const domain = (data.user?.email || "").toLowerCase().split("@")[1];
  return internalDomains.has(domain);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ success: false, error: "Service indisponible" }), {
        status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!await isAuthorized(req, supabaseUrl, serviceKey)) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let payload: Record<string, unknown>;
    try { payload = await req.json(); } catch {
      return new Response(JSON.stringify({ success: false, error: "Corps JSON invalide" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const to = typeof payload.to === "string" ? payload.to.trim() : "";
    const rawContent = payload.body ?? payload.message ?? payload.content;
    const content = typeof rawContent === "string" ? rawContent.trim() : "";
    const leadIdValue = payload.lead_id ?? payload.leadId;
    const lead_id = typeof leadIdValue === "string" ? leadIdValue.trim() : undefined;
    const tag = typeof payload.tag === "string" ? payload.tag.trim().slice(0, 64) : "crm-sms";

    const response = await fetch(`${supabaseUrl}/functions/v1/send-sms-brevo`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ to, content, lead_id, tag }),
    });
    const responseText = await response.text();
    let result: Record<string, unknown> = {};
    try { result = JSON.parse(responseText); } catch { /* provider response is redacted below */ }
    if (!response.ok) {
      return new Response(JSON.stringify({ success: false, error: "Echec envoi SMS" }), {
        status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify(result), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Legacy SMS adapter failed", error instanceof Error ? error.name : "unknown");
    return new Response(JSON.stringify({ success: false, error: "Erreur serveur" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});