import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const googleEmail = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_EMAIL") || "";
    const googleKey = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_KEY") || Deno.env.get("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY") || "";

    if (!googleEmail || !googleKey) {
      throw new Error("Google Search Console service account secrets are missing");
    }

    const body = await req.json().catch(() => ({}));
    const sitemapUrl = body.sitemapUrl || "https://taxiassur.com/sitemap.xml";

    const { data: configData } = await supabase
      .from("system_config")
      .select("value")
      .eq("key", "gsc_site_url")
      .maybeSingle();

    const siteUrl = configData?.value || "sc-domain:taxiassur.com";
    const accessToken = await getGoogleAccessToken(googleEmail, googleKey, "https://www.googleapis.com/auth/webmasters");
    const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/sitemaps/${encodeURIComponent(sitemapUrl)}`;

    const submitResponse = await fetch(endpoint, {
      method: "PUT",
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!submitResponse.ok) {
      const errorBody = await submitResponse.text().catch(() => "");
      throw new Error(`GSC sitemap submit failed ${submitResponse.status}: ${errorBody.slice(0, 500)}`);
    }

    return new Response(JSON.stringify({
      success: true,
      siteUrl,
      sitemapUrl,
      google_status: submitResponse.status,
      submitted_at: new Date().toISOString(),
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("GSC sitemap submit error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function getGoogleAccessToken(email: string, privateKey: string, scope: string): Promise<string> {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: email,
    scope,
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const base64UrlEncode = (obj: unknown) => btoa(JSON.stringify(obj))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  const signatureInput = `${base64UrlEncode(header)}.${base64UrlEncode(claim)}`;
  const pemContents = privateKey
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\\n/g, "\n")
    .replace(/\n/g, "")
    .trim();

  const binaryKey = Uint8Array.from(atob(pemContents), (char) => char.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signatureInput)
  );

  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  const jwt = `${signatureInput}.${encodedSignature}`;
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!tokenResponse.ok) {
    const body = await tokenResponse.text().catch(() => "");
    throw new Error(`Google token error ${tokenResponse.status}: ${body.slice(0, 300)}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}