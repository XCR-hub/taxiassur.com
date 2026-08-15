import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { isInternalRequest } from "../_shared/internal-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
});

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!(await isInternalRequest(req))) return json({ error: "Unauthorized" }, 401);

  try {
    const body = await req.json().catch(() => ({}));
    const type = String(body?.type || "");
    const keyword = String(body?.keyword || "").trim();
    if (!keyword || keyword.length > 200) return json({ error: "Mot-clé invalide" }, 400);

    if (type === "google_suggest") {
      const url = new URL("https://suggestqueries.google.com/complete/search");
      url.search = new URLSearchParams({ client: "firefox", q: keyword, hl: "fr", gl: "fr" }).toString();
      const response = await fetch(url, { signal: AbortSignal.timeout(10_000), redirect: "error" });
      if (!response.ok) return json({ error: "Service de suggestions indisponible" }, 502);
      const data = await response.json();
      const suggestions = Array.isArray(data?.[1]) ? data[1].filter((value: unknown) => typeof value === "string").slice(0, 20) : [];
      return json({ suggestions });
    }

    if (type === "google_trends") {
      const apiKey = Deno.env.get("SERP_API_KEY")?.trim();
      if (!apiKey) return json({ error: "Analyse de tendances non configurée" }, 503);
      const url = new URL("https://serpapi.com/search.json");
      url.search = new URLSearchParams({ engine: "google_trends", q: keyword, data_type: "TIMESERIES", geo: "FR", api_key: apiKey }).toString();
      const response = await fetch(url, { signal: AbortSignal.timeout(15_000), redirect: "error" });
      if (!response.ok) return json({ error: "Service de tendances indisponible" }, 502);
      return json(await response.json());
    }

    return json({ error: "Type d'analyse inconnu" }, 400);
  } catch {
    return json({ error: "Analyse temporairement indisponible" }, 500);
  }
});
