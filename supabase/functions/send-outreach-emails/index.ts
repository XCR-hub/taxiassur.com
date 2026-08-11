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
const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (
      char,
    ) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[char]!),
  );

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
    if (body?.action && body.action !== "send_batch") {
      return json({ error: "Action invalide" }, 400);
    }
    const batchSize = Math.min(50, Math.max(1, Number(body?.batchSize) || 10));
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const brevoKey = Deno.env.get("BREVO_API_KEY")?.trim() || "";
    if (!brevoKey) {
      return json({ error: "Le fournisseur e-mail n’est pas configuré" }, 503);
    }
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });
    await admin.rpc("release_stale_outreach_deliveries");
    const { data: deliveries, error: claimError } = await admin.rpc(
      "claim_outreach_deliveries",
      { p_limit: batchSize },
    );
    if (claimError) throw claimError;

    let sent = 0;
    let failed = 0;
    let suppressed = 0;
    const results: Array<{ id: string; status: string }> = [];
    for (const delivery of deliveries || []) {
      const { data: suppression, error: suppressionError } = await admin.from(
        "outreach_suppressions",
      ).select("id").eq("email", delivery.recipient_email).maybeSingle();
      if (suppressionError) throw suppressionError;
      if (suppression) {
        await admin.from("outreach_delivery_queue").update({
          status: "suppressed",
          unsubscribe_token: null,
          updated_at: new Date().toISOString(),
        }).eq("id", delivery.id).eq("status", "sending");
        suppressed++;
        results.push({ id: delivery.id, status: "suppressed" });
        continue;
      }
      const unsubscribeUrl =
        `${supabaseUrl}/functions/v1/unsubscribe-outreach?token=${delivery.unsubscribe_token}`;
      const safeBody = escapeHtml(String(delivery.body_text)).replace(
        /\r?\n/g,
        "<br>",
      );
      const html =
        `<!doctype html><html lang="fr"><meta charset="utf-8"><body style="font-family:Arial,sans-serif;line-height:1.6;color:#172033"><div style="max-width:680px;margin:auto;padding:24px"><div>${safeBody}</div><hr style="margin-top:32px;border:0;border-top:1px solid #ddd"><p style="font-size:12px;color:#667085">TaxiAssur — courtier en assurance taxi. Si vous ne souhaitez plus recevoir de propositions de partenariat, <a href="${unsubscribeUrl}">désinscrivez-vous ici</a>.</p></div></body></html>`;
      try {
        const response = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          signal: AbortSignal.timeout(15000),
          headers: {
            "api-key": brevoKey,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            sender: {
              name: "TaxiAssur Partenariats",
              email: Deno.env.get("BREVO_SENDER_EMAIL") ||
                "contact@taxiassur.com",
            },
            to: [{
              email: delivery.recipient_email,
              name: String(delivery.recipient_name || "").replace(
                /[\r\n]/g,
                " ",
              ).slice(0, 200),
            }],
            subject: delivery.subject,
            htmlContent: html,
            textContent:
              `${delivery.body_text}\n\nDésinscription : ${unsubscribeUrl}`,
            headers: {
              "List-Unsubscribe": `<${unsubscribeUrl}>`,
              "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            },
          }),
        });
        if (!response.ok) {
          throw new Error(
            response.status === 429
              ? "provider_rate_limited"
              : `provider_${response.status}`,
          );
        }
        const provider = await response.json().catch(() => ({}));
        const { error: updateError } = await admin.from(
          "outreach_delivery_queue",
        ).update({
          status: "sent",
          sent_at: new Date().toISOString(),
          provider_message_id:
            String(provider?.messageId || "").slice(0, 500) || null,
          unsubscribe_token: null,
          last_error: null,
          updated_at: new Date().toISOString(),
        }).eq("id", delivery.id).eq("status", "sending");
        if (updateError) throw new Error("audit_update_failed");
        if (delivery.opportunity_id) {
          await admin.from("backlink_opportunities").update({
            status: "contacted",
            contacted_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }).eq("id", delivery.opportunity_id);
        }
        sent++;
        results.push({ id: delivery.id, status: "sent" });
      } catch (error) {
        const reason = error instanceof Error
          ? error.message.slice(0, 200)
          : "delivery_failed";
        if (reason === "audit_update_failed") {
          await admin.from("outreach_delivery_queue").update({
            status: "delivery_uncertain",
            unsubscribe_token: null,
            last_error: reason,
            updated_at: new Date().toISOString(),
          }).eq("id", delivery.id).eq("status", "sending");
          failed++;
          results.push({ id: delivery.id, status: "delivery_uncertain" });
          continue;
        }
        const delayMinutes = Math.min(
          1440,
          15 * Math.pow(2, Math.max(0, Number(delivery.attempts) - 1)),
        );
        await admin.from("outreach_delivery_queue").update({
          status: "failed",
          last_error: reason,
          next_attempt_at: new Date(Date.now() + delayMinutes * 60000)
            .toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("id", delivery.id).eq("status", "sending");
        failed++;
        results.push({ id: delivery.id, status: "failed" });
      }
    }
    return json({
      success: failed === 0,
      total_processed: results.length,
      sent,
      failed,
      suppressed,
      results,
    });
  } catch (error) {
    console.error(
      "Outreach batch failed",
      error instanceof Error ? error.message : "unknown error",
    );
    return json({ error: "Impossible de traiter la campagne" }, 500);
  }
});
