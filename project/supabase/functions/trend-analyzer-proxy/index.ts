import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { type, keyword } = await req.json();

    if (!type || !keyword) {
      return new Response(
        JSON.stringify({ error: "Missing type or keyword" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let apiUrl = "";
    let apiResponse;

    if (type === "google_trends") {
      // SerpAPI - Google Trends
      const SERP_API_KEY = Deno.env.get("SERP_API_KEY") || "420c1db639f7961f89b578da9be23a76cd16795664103b95019a432026555202";
      apiUrl = `https://serpapi.com/search.json?engine=google_trends&q=${encodeURIComponent(keyword)}&data_type=TIMESERIES&geo=FR&api_key=${SERP_API_KEY}`;
      
      apiResponse = await fetch(apiUrl);
      
      if (!apiResponse.ok) {
        throw new Error(`SerpAPI error: ${apiResponse.status}`);
      }

      const data = await apiResponse.json();
      
      return new Response(
        JSON.stringify(data),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    } 
    
    else if (type === "google_suggest") {
      // Google Autocomplete Suggest
      apiUrl = `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(keyword)}&hl=fr&gl=fr`;
      
      apiResponse = await fetch(apiUrl);
      
      if (!apiResponse.ok) {
        throw new Error(`Google Suggest error: ${apiResponse.status}`);
      }

      const data = await apiResponse.json();
      
      return new Response(
        JSON.stringify({ suggestions: data[1] || [] }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    else {
      return new Response(
        JSON.stringify({ error: "Unknown type. Use 'google_trends' or 'google_suggest'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (error) {
    console.error("Trend Analyzer Proxy error:", error);
    
    return new Response(
      JSON.stringify({ 
        error: "Failed to fetch trend data",
        message: error instanceof Error ? error.message : "Unknown error"
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
