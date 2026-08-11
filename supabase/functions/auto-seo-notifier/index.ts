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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const urls = [
      "https://taxiassur.com/",
      "https://taxiassur.com/villes",
      "https://taxiassur.com/actualites",
      "https://taxiassur.com/sitemap.xml",
      "https://taxiassur.com/feeds/sitemap.xml",
      "https://taxiassur.com/feeds/rss.xml",
    ];
    const response = await fetch(`${supabaseUrl}/functions/v1/indexnow-ping`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ urls }),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      console.error("Automatic SEO notification failed", {
        status: response.status,
      });
      return json({ ok: false, error: "La notification SEO a échoué" }, 502);
    }
    return json({
      ok: true,
      submitted: result?.submitted || urls.length,
      results: result?.results || [],
    });
  } catch (error) {
    console.error(
      "Automatic SEO notifier failed",
      error instanceof Error ? error.message : "unknown error",
    );
    return json({ ok: false, error: "Notification SEO indisponible" }, 500);
  }
});
