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

    console.log("Starting SEO daily refresh");

    const staticPages = [
      "/", "/contact", "/blog", "/actualites", "/assurance-taxi",
      "/assurance-vtc", "/rc-professionnelle", "/flotte-vehicules",
      "/gestion-sinistres", "/prix-assurance-taxi", "/quelle-assurance-taxi",
      "/offres", "/partenaires", "/faq", "/legal", "/conditions", "/politique"
    ];

    const { data: blogPosts } = await supabase
      .from("blog_posts")
      .select("slug")
      .eq("published", true);

    const { data: cityPages } = await supabase
      .from("city_pages")
      .select("slug");

    const totalUrls = staticPages.length + (blogPosts?.length || 0) + (cityPages?.length || 0);

    console.log("Total URLs:", totalUrls);

    const { data: gscConfig } = await supabase
      .from("seo_automation_config")
      .select("value")
      .eq("key", "google_search_console")
      .maybeSingle();

    let googleMetrics = {
      indexedPages: 0,
      impressions: 0,
      clicks: 0,
      ctr: 0,
      averagePosition: 0
    };

    if (gscConfig?.value?.enabled && gscConfig?.value?.credentials) {
      console.log("Fetching Google Search Console data");
      googleMetrics = await fetchGoogleSearchConsoleData(
        gscConfig.value.credentials,
        gscConfig.value.site_url
      );
    } else {
      console.log("Using estimates");
      googleMetrics.indexedPages = Math.floor(totalUrls * 0.85);
    }

    const pendingPages = totalUrls - googleMetrics.indexedPages;

    await supabase
      .from("seo_metrics")
      .upsert({
        date: new Date().toISOString().split('T')[0],
        total_urls: totalUrls,
        indexed_pages: googleMetrics.indexedPages,
        pending_pages: pendingPages,
        impressions: googleMetrics.impressions,
        clicks: googleMetrics.clicks,
        ctr: googleMetrics.ctr,
        average_position: googleMetrics.averagePosition,
        source: gscConfig?.value?.enabled ? 'google' : 'automated'
      });

    console.log("Metrics saved");

    const siteUrl = gscConfig?.value?.site_url || "https://taxiassur.com";

    const { data: pingConfig } = await supabase
      .from("seo_automation_config")
      .select("value")
      .eq("key", "auto_ping_on_publish")
      .maybeSingle();

    if (pingConfig?.value?.enabled) {
      console.log("Pinging search engines");
      pingSearchEngines(siteUrl);
    }

    await supabase
      .from("seo_automation_config")
      .update({
        last_executed_at: new Date().toISOString(),
        next_execution_at: getNextExecutionDate()
      })
      .eq("key", "daily_metrics_refresh");

    return new Response(
      JSON.stringify({
        success: true,
        metrics: {
          total_urls: totalUrls,
          indexed_pages: googleMetrics.indexedPages,
          pending_pages: pendingPages,
          impressions: googleMetrics.impressions,
          clicks: googleMetrics.clicks,
          average_position: googleMetrics.averagePosition
        },
        message: "SEO metrics refreshed successfully"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function fetchGoogleSearchConsoleData(credentialsJson: string, siteUrl: string) {
  try {
    const credentials = JSON.parse(credentialsJson);
    const accessToken = await getAccessToken(credentials);

    if (!accessToken) {
      return getEstimatedMetrics();
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    const response = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          dimensions: ["page"],
          rowLimit: 1000
        })
      }
    );

    if (!response.ok) {
      return getEstimatedMetrics();
    }

    const data = await response.json();

    const indexedPages = data.rows?.length || 0;
    const totalImpressions = data.rows?.reduce((sum: number, row: any) => sum + row.impressions, 0) || 0;
    const totalClicks = data.rows?.reduce((sum: number, row: any) => sum + row.clicks, 0) || 0;
    const avgPosition = data.rows?.reduce((sum: number, row: any) => sum + row.position, 0) / (data.rows?.length || 1) || 0;
    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) : 0;

    return {
      indexedPages,
      impressions: totalImpressions,
      clicks: totalClicks,
      ctr: Math.round(ctr * 10000) / 100,
      averagePosition: Math.round(avgPosition * 10) / 10
    };

  } catch (error) {
    return getEstimatedMetrics();
  }
}

async function getAccessToken(credentials: any): Promise<string | null> {
  try {
    const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const now = Math.floor(Date.now() / 1000);
    const claim = {
      iss: credentials.client_email,
      scope: "https://www.googleapis.com/auth/webmasters.readonly",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now
    };

    const claimString = btoa(JSON.stringify(claim));
    const signatureInput = `${header}.${claimString}`;

    const privateKey = await crypto.subtle.importKey(
      "pkcs8",
      pemToArrayBuffer(credentials.private_key),
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      privateKey,
      new TextEncoder().encode(signatureInput)
    );

    const jwt = `${signatureInput}.${btoa(String.fromCharCode(...new Uint8Array(signature)))}`;

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt
      })
    });

    if (!tokenResponse.ok) {
      return null;
    }

    const tokenData = await tokenResponse.json();
    return tokenData.access_token;

  } catch (error) {
    return null;
  }
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----BEGIN PRIVATE KEY-----/, "").replace(/-----END PRIVATE KEY-----/, "").replace(/\s/g, "");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function getEstimatedMetrics() {
  return {
    indexedPages: 0,
    impressions: 0,
    clicks: 0,
    ctr: 0,
    averagePosition: 0
  };
}

function pingSearchEngines(siteUrl: string) {
  const sitemapUrl = `${siteUrl}/feeds/sitemap.xml`;
  const urls = [
    `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
    `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`
  ];
  urls.forEach(url => fetch(url).catch(() => {}));
}

function getNextExecutionDate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(2, 0, 0, 0);
  return tomorrow.toISOString();
}
