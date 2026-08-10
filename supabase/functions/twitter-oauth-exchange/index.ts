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
    const body = await req.json();
    const code = typeof body?.code === "string" ? body.code.trim() : "";
    const verifier = typeof body?.code_verifier === "string"
      ? body.code_verifier.trim()
      : "";
    const redirectUri = Deno.env.get("TWITTER_REDIRECT_URI")?.trim() || "";
    const clientId = Deno.env.get("TWITTER_CLIENT_ID")?.trim() || "";
    const clientSecret = Deno.env.get("TWITTER_CLIENT_SECRET")?.trim() || "";
    if (
      !code || code.length > 2048 || !/^[A-Za-z0-9._~-]{43,128}$/.test(verifier)
    ) return json({ error: "Code OAuth ou vérificateur PKCE invalide" }, 400);
    if (!clientId || !clientSecret || !redirectUri.startsWith("https://")) {
      return json({ error: "Twitter OAuth n’est pas configuré" }, 503);
    }

    const tokenResponse = await fetch(
      "https://api.twitter.com/2/oauth2/token",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          code,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
          code_verifier: verifier,
        }),
      },
    );
    if (!tokenResponse.ok) {
      console.error("Twitter token exchange failed", {
        status: tokenResponse.status,
      });
      return json({ error: "Twitter a refusé le code d’autorisation" }, 502);
    }
    const token = await tokenResponse.json();
    if (!token?.access_token) {
      return json({ error: "Twitter n’a retourné aucun jeton" }, 502);
    }
    const userResponse = await fetch(
      "https://api.twitter.com/2/users/me?user.fields=id,name,username",
      { headers: { Authorization: `Bearer ${token.access_token}` } },
    );
    if (!userResponse.ok) {
      return json({ error: "Impossible de lire le compte Twitter" }, 502);
    }
    const user = (await userResponse.json())?.data;
    if (!user?.id) return json({ error: "Compte Twitter invalide" }, 502);

    const expiresAt = new Date(
      Date.now() + Math.max(300, Number(token.expires_in) || 7200) * 1000,
    ).toISOString();
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const { error } = await admin.from("social_networks").upsert({
      platform: "twitter",
      account_name: user.username || user.name || "Twitter",
      account_id: String(user.id),
      access_token: token.access_token,
      refresh_token: token.refresh_token || null,
      token_expires_at: expiresAt,
      is_connected: true,
      is_active: true,
      auto_publish: false,
    }, { onConflict: "platform" });
    if (error) throw error;
    return json({
      success: true,
      username: user.username || user.name || "Twitter",
      expires_at: expiresAt,
    });
  } catch (error) {
    console.error(
      "Twitter OAuth exchange failed",
      error instanceof Error ? error.message : "unknown error",
    );
    return json({ error: "Connexion Twitter impossible" }, 500);
  }
});
