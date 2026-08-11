import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { isInternalRequest } from "../_shared/internal-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const randomToken = () =>
  [...crypto.getRandomValues(new Uint8Array(32))].map((value) =>
    value.toString(16).padStart(2, "0")
  ).join("");
const sha256 = async (value: string) =>
  [
    ...new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
    ),
  ].map((byte) => byte.toString(16).padStart(2, "0")).join("");

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!(await isInternalRequest(req))) {
    return json({ error: "Unauthorized" }, 401);
  }
  try {
    const body = await req.json().catch(() => ({}));
    if (body?.action && body.action !== "batch_outreach") {
      return json({ error: "Action invalide" }, 400);
    }
    const limit = Math.min(50, Math.max(1, Number(body?.batchSize) || 50));
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const { data: campaign } = await admin.from("backlink_campaigns").select(
      "id",
    ).eq("status", "active").order("created_at", { ascending: false }).limit(1)
      .maybeSingle();
    const { data: opportunities, error } = await admin.from(
      "backlink_opportunities",
    ).select("id,domain,url,contact_email,contact_name,description").in(
      "status",
      ["pending", "new"],
    ).not("contact_email", "is", null).limit(limit);
    if (error) throw error;
    const results: Array<{ opportunity_id: string; status: string }> = [];
    for (const opportunity of opportunities || []) {
      const email = String(opportunity.contact_email || "").trim()
        .toLowerCase();
      if (!emailPattern.test(email) || email.length > 320) {
        results.push({
          opportunity_id: opportunity.id,
          status: "invalid_email",
        });
        continue;
      }
      const { data: suppressed, error: suppressionError } = await admin.from(
        "outreach_suppressions",
      ).select("id").eq("email", email).maybeSingle();
      if (suppressionError) throw suppressionError;
      if (suppressed) {
        results.push({ opportunity_id: opportunity.id, status: "suppressed" });
        continue;
      }
      const domain = String(opportunity.domain || "votre site").replace(
        /[\r\n]/g,
        " ",
      ).slice(0, 200);
      const name = String(opportunity.contact_name || `équipe ${domain}`)
        .replace(/[\r\n]/g, " ").slice(0, 200);
      const token = randomToken();
      const tokenHash = await sha256(token);
      const idempotencyKey = `backlink:${opportunity.id}:initial`;
      const { error: insertError } = await admin.from("outreach_delivery_queue")
        .upsert({
          opportunity_id: opportunity.id,
          campaign_id: campaign?.id || null,
          recipient_email: email,
          recipient_name: name,
          recipient_website: String(opportunity.url || "").slice(0, 500),
          subject: `Proposition de partenariat avec TaxiAssur pour ${domain}`
            .slice(0, 200),
          body_text:
            `Bonjour ${name},\n\nNous avons découvert ${domain} dans le cadre de notre veille sur les ressources utiles aux professionnels du taxi. Nous souhaitons vous proposer un échange éditorial ou un partenariat pertinent pour nos audiences respectives.\n\nSi le sujet vous intéresse, nous pouvons vous transmettre une proposition courte et personnalisée.\n\nCordialement,\nL’équipe TaxiAssur`,
          idempotency_key: idempotencyKey,
          unsubscribe_token: token,
          unsubscribe_token_hash: tokenHash,
        }, { onConflict: "idempotency_key", ignoreDuplicates: true });
      if (insertError) throw insertError;
      results.push({ opportunity_id: opportunity.id, status: "queued" });
    }
    return json({ success: true, total_processed: results.length, results });
  } catch (error) {
    console.error(
      "Partner outreach preparation failed",
      error instanceof Error ? error.message : "unknown error",
    );
    return json({ error: "Impossible de préparer la campagne" }, 500);
  }
});
