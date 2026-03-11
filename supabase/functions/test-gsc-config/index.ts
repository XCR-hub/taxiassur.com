import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Tester les secrets Google
    const googleEmail = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_EMAIL");
    const googleKey = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_KEY");
    const googlePrivateKey = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY");

    const result = {
      timestamp: new Date().toISOString(),
      secrets_status: {
        GOOGLE_SERVICE_ACCOUNT_EMAIL: googleEmail ? {
          configured: true,
          value_preview: googleEmail.substring(0, 30) + "...",
          length: googleEmail.length
        } : { configured: false },
        GOOGLE_SERVICE_ACCOUNT_KEY: googleKey ? {
          configured: true,
          value_preview: googleKey.substring(0, 50) + "...",
          length: googleKey.length
        } : { configured: false },
        GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: googlePrivateKey ? {
          configured: true,
          value_preview: googlePrivateKey.substring(0, 50) + "...",
          length: googlePrivateKey.length,
          has_begin_marker: googlePrivateKey.includes("BEGIN PRIVATE KEY"),
          has_end_marker: googlePrivateKey.includes("END PRIVATE KEY")
        } : { configured: false }
      },
      recommendations: []
    };

    // Recommandations
    if (!googleEmail && !googleKey && !googlePrivateKey) {
      result.recommendations.push("Aucun secret Google configuré. Vérifiez les secrets Supabase.");
    }

    if (googleEmail && !googleKey && !googlePrivateKey) {
      result.recommendations.push("Email configuré mais pas de clé. Utilisez GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY pour la clé privée complète.");
    }

    if (googleKey && !googlePrivateKey) {
      result.recommendations.push("GOOGLE_SERVICE_ACCOUNT_KEY trouvé. Renommez-le en GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.");
    }

    if (googlePrivateKey && !googlePrivateKey.includes("BEGIN PRIVATE KEY")) {
      result.recommendations.push("La clé privée ne semble pas correctement formatée. Elle doit commencer par '-----BEGIN PRIVATE KEY-----'");
    }

    return new Response(
      JSON.stringify(result, null, 2),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
