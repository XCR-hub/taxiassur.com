import "jsr:@supabase/functions-js/edge-runtime.d.ts";
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
    const limit = Math.min(10, Math.max(1, Number(body?.maxEmailsPerRun) || 5));
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceKey}`,
    };
    const preparation = await fetch(
      `${supabaseUrl}/functions/v1/partner-scraper-outreach`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "batch_outreach", batchSize: limit }),
      },
    );
    if (!preparation.ok) {
      console.error("Backlink preparation failed", {
        status: preparation.status,
      });
      return json({ error: "La préparation des e-mails a échoué" }, 502);
    }
    const prepared = await preparation.json();
    const delivery = await fetch(
      `${supabaseUrl}/functions/v1/send-outreach-emails`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "send_batch", batchSize: limit }),
      },
    );
    const delivered = await delivery.json().catch(() => null);
    if (!delivery.ok) {
      console.error("Backlink delivery failed", { status: delivery.status });
      return json({
        error: "L’envoi des e-mails a échoué",
        queued: prepared?.total_processed || 0,
      }, 502);
    }
    return json({
      success: true,
      emailsSent: delivered?.sent || 0,
      failed: delivered?.failed || 0,
      suppressed: delivered?.suppressed || 0,
      queued: prepared?.total_processed || 0,
      results: delivered?.results || [],
    });
  } catch (error) {
    console.error(
      "Backlink outreach orchestration failed",
      error instanceof Error ? error.message : "unknown error",
    );
    return json({ error: "Impossible de lancer la campagne" }, 500);
  }
});
