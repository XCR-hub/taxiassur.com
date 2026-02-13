import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");

    if (!BREVO_API_KEY) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "BREVO_API_KEY n'est pas configurée dans les secrets Supabase",
          help: "Exécutez: supabase secrets set BREVO_API_KEY=votre_clé_api"
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Test de connexion à l'API Brevo
    const response = await fetch("https://api.brevo.com/v3/account", {
      method: "GET",
      headers: {
        "accept": "application/json",
        "api-key": BREVO_API_KEY,
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(
        JSON.stringify({
          success: false,
          error: `Erreur API Brevo: ${response.status}`,
          details: errorText,
          help: "Vérifiez que votre clé API Brevo est valide"
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const accountData = await response.json();

    return new Response(
      JSON.stringify({
        success: true,
        message: "✅ Configuration Brevo OK",
        account: {
          email: accountData.email || "Non disponible",
          plan: accountData.plan?.type || "Non disponible",
          credits: accountData.plan?.credits || 0
        },
        api_key_preview: `${BREVO_API_KEY.substring(0, 10)}...${BREVO_API_KEY.substring(BREVO_API_KEY.length - 5)}`
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("Erreur test Brevo:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
