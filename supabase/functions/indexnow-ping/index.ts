import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SEARCH_ENGINES = [
  { name: "Google", url: "https://www.google.com/ping?sitemap=", method: "sitemap" },
  { name: "Bing", url: "https://www.bing.com/indexnow", method: "indexnow" },
  { name: "Yandex", url: "https://yandex.com/indexnow", method: "indexnow" }
];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { urls } = await req.json();
    const siteUrl = "https://taxiassur.com";
    const sitemapUrl = `${siteUrl}/feeds/sitemap.xml`;
    const results = [];

    // Ping Google (sitemap)
    try {
      const googleUrl = `${SEARCH_ENGINES[0].url}${encodeURIComponent(sitemapUrl)}`;
      const response = await fetch(googleUrl);
      await supabase.rpc("log_seo_ping", {
        p_engine: "google",
        p_urls: [sitemapUrl],
        p_method: "sitemap",
        p_success: response.ok,
        p_response_code: response.status,
        p_response_message: "Sitemap submitted"
      });
      results.push({ engine: "Google", success: response.ok, status: response.status });
    } catch (error) {
      results.push({ engine: "Google", success: false, error: error.message });
    }

    // Ping Bing et Yandex (IndexNow)
    const indexNowKey = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
    const indexNowEngines = SEARCH_ENGINES.slice(1);

    for (const engine of indexNowEngines) {
      try {
        const payload = {
          host: "taxiassur.com",
          key: indexNowKey,
          keyLocation: `${siteUrl}/indexnow-key.txt`,
          urlList: urls || [siteUrl]
        };

        const response = await fetch(engine.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        await supabase.rpc("log_seo_ping", {
          p_engine: engine.name.toLowerCase(),
          p_urls: payload.urlList,
          p_method: "indexnow",
          p_success: response.ok || response.status === 202,
          p_response_code: response.status,
          p_response_message: "IndexNow submitted"
        });

        results.push({ engine: engine.name, success: response.ok || response.status === 202, status: response.status });
      } catch (error) {
        results.push({ engine: engine.name, success: false, error: error.message });
      }
    }

    const successCount = results.filter(r => r.success).length;

    return new Response(
      JSON.stringify({
        success: true,
        engines_pinged: results.length,
        successful: successCount,
        results: results,
        message: `${successCount}/${results.length} moteurs notifiés`
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
