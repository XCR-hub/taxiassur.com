import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: pinterestConfig, error: configError } = await supabase
      .from("social_networks")
      .select("config")
      .eq("platform", "pinterest")
      .maybeSingle();

    if (configError || !pinterestConfig) {
      return new Response(
        JSON.stringify({ error: "Configuration Pinterest non trouvée" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const apiKey = pinterestConfig.config?.api_key;

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "API Key Pinterest manquante" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("📌 Récupération des boards Pinterest...");

    const response = await fetch("https://api.pinterest.com/v5/boards", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Erreur Pinterest API:", errorText);
      throw new Error(`Pinterest API error: ${response.statusText}`);
    }

    const data = await response.json();
    const boards = data.items || [];

    console.log(`✅ ${boards.length} boards récupérés`);

    return new Response(
      JSON.stringify({
        success: true,
        boards: boards.map((board: any) => ({
          id: board.id,
          name: board.name,
          description: board.description,
          privacy: board.privacy,
          pin_count: board.pin_count,
        })),
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("❌ Erreur:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
