import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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
    const { code, redirectUri } = await req.json();

    if (!code || !redirectUri) {
      throw new Error("Missing required parameters: code, redirectUri");
    }

    const clientId = Deno.env.get("YOUTUBE_CLIENT_ID") ?? Deno.env.get("GOOGLE_CLIENT_ID");
    const clientSecret = Deno.env.get("YOUTUBE_CLIENT_SECRET") ?? Deno.env.get("GOOGLE_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      throw new Error(
        "YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET not configured in Supabase Edge Function secrets"
      );
    }

    console.log("Exchanging YouTube OAuth code for tokens...");

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await response.json();

    if (!response.ok || tokenData.error) {
      const message = tokenData.error_description || tokenData.error || "Unknown OAuth error";
      console.error("YouTube OAuth error:", tokenData);
      return new Response(
        JSON.stringify({ success: false, error: message, details: tokenData }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!tokenData.refresh_token) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "Aucun refresh_token reçu. Révoquez l'accès sur https://myaccount.google.com/permissions puis réessayez en ajoutant prompt=consent et access_type=offline à l'URL d'autorisation.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let expiresAt: string | null = null;
    if (tokenData.expires_in) {
      expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
    }

    return new Response(
      JSON.stringify({
        success: true,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_type: tokenData.token_type || "Bearer",
        expires_in: tokenData.expires_in || null,
        expires_at: expiresAt,
        scope: tokenData.scope || null,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in youtube-oauth-exchange:", error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
