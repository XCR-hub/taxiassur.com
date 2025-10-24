import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const source = url.searchParams.get("source") || "unknown";

    console.log(`📥 Received webhook from: ${source}`);

    // Lire le payload
    const payload = await req.json();
    console.log("Payload:", JSON.stringify(payload, null, 2));

    // Enregistrer l'événement webhook
    const { data: event, error: eventError } = await supabase
      .from("seo_webhook_events")
      .insert({
        source,
        event_type: payload.type || payload.eventType || "unknown",
        payload: payload,
        processed: false
      })
      .select()
      .single();

    if (eventError) {
      console.error("Error saving webhook event:", eventError);
      throw eventError;
    }

    console.log(`✅ Webhook event saved: ${event.id}`);

    // Traiter l'événement selon la source
    switch (source.toLowerCase()) {
      case "google":
      case "google_search_console":
        await handleGoogleSearchConsoleWebhook(supabase, event.id, payload);
        break;

      case "bing":
      case "bing_webmaster":
        await handleBingWebmasterWebhook(supabase, event.id, payload);
        break;

      case "indexnow":
        await handleIndexNowWebhook(supabase, event.id, payload);
        break;

      default:
        console.log(`⚠️ Unknown source: ${source}`);
    }

    // Marquer comme traité
    await supabase
      .from("seo_webhook_events")
      .update({
        processed: true,
        processed_at: new Date().toISOString()
      })
      .eq("id", event.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Webhook received and processed",
        event_id: event.id
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in seo-webhook-receiver:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Handler pour Google Search Console
async function handleGoogleSearchConsoleWebhook(
  supabase: any,
  eventId: string,
  payload: any
) {
  console.log("🔍 Processing Google Search Console webhook...");

  // Vérifier le type d'événement
  if (payload.type === "URL_UPDATED" || payload.type === "URL_CRAWLED") {
    const url = payload.url || payload.inspectionResult?.inspectionResult?.indexStatusResult?.url;

    if (url) {
      const isIndexed = payload.inspectionResult?.inspectionResult?.indexStatusResult?.verdict === "PASS";
      const crawlDate = payload.inspectionResult?.inspectionResult?.indexStatusResult?.lastCrawlTime;

      await supabase.rpc("update_indexation_status", {
        p_url: url,
        p_is_indexed: isIndexed,
        p_google_status: payload.inspectionResult?.inspectionResult?.indexStatusResult?.verdict || "unknown"
      });

      console.log(`✅ Updated indexation status for: ${url}`);
    }
  }

  // Gestion des erreurs de crawl
  if (payload.type === "CRAWL_ERROR") {
    const url = payload.url;
    const errorDetails = payload.error;

    if (url) {
      await supabase
        .from("seo_indexation_status")
        .update({
          has_errors: true,
          errors: [errorDetails],
          last_checked_at: new Date().toISOString()
        })
        .eq("url", url);

      console.log(`⚠️ Crawl error recorded for: ${url}`);
    }
  }
}

// Handler pour Bing Webmaster Tools
async function handleBingWebmasterWebhook(
  supabase: any,
  eventId: string,
  payload: any
) {
  console.log("🔍 Processing Bing Webmaster webhook...");

  if (payload.event === "PageCrawled" || payload.event === "PageIndexed") {
    const url = payload.url;
    const isIndexed = payload.event === "PageIndexed";

    if (url) {
      await supabase.rpc("update_indexation_status", {
        p_url: url,
        p_is_indexed: isIndexed,
        p_bing_status: payload.status || "indexed"
      });

      console.log(`✅ Updated Bing indexation status for: ${url}`);
    }
  }
}

// Handler pour IndexNow
async function handleIndexNowWebhook(
  supabase: any,
  eventId: string,
  payload: any
) {
  console.log("🔍 Processing IndexNow webhook...");

  if (payload.urlList && Array.isArray(payload.urlList)) {
    for (const url of payload.urlList) {
      await supabase.rpc("update_indexation_status", {
        p_url: url,
        p_is_indexed: true,
        p_google_status: "submitted_via_indexnow"
      });
    }

    console.log(`✅ Updated ${payload.urlList.length} URLs from IndexNow`);
  }
}
