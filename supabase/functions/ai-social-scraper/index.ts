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
    const maxResults = Math.min(
      10,
      Math.max(1, Number(body?.max_results) || 3),
    );
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const aggregate = await fetch(
      `${supabaseUrl}/functions/v1/news-aggregator-master`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
        },
        body: "{}",
      },
    );
    if (!aggregate.ok) {
      console.error("News aggregation failed", { status: aggregate.status });
      return json({ error: "L’agrégation des actualités a échoué" }, 502);
    }
    const aggregation = await aggregate.json();
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });
    const { data: articles, error } = await supabase.from("news_articles")
      .select("id,title,summary,category,status,published_at,created_at").order(
        "created_at",
        { ascending: false },
      ).limit(maxResults);
    if (error) throw error;
    return json({
      success: true,
      articles: articles || [],
      stats: aggregation?.stats || null,
    });
  } catch (error) {
    console.error(
      "AI social scraper failed",
      error instanceof Error ? error.message : "unknown error",
    );
    return json({ error: "Impossible de récupérer les actualités" }, 500);
  }
});
