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
    const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
    if (!secret) {
      throw new Error("TURNSTILE_SECRET_KEY not configured");
    }

    const { token, remoteip, action } = await req.json();
    if (!token || typeof token !== "string") {
      return new Response(
        JSON.stringify({ success: false, error: "missing_token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const formData = new FormData();
    formData.append("secret", secret);
    formData.append("response", token);
    formData.append("idempotency_key", crypto.randomUUID());
    if (remoteip) formData.append("remoteip", remoteip);

    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();
    const actionMatches = !action || !result.action || result.action === action;
    const success = Boolean(result.success && actionMatches);

    return new Response(
      JSON.stringify({
        success,
        action: result.action || null,
        challenge_ts: result.challenge_ts || null,
        hostname: result.hostname || null,
        error_codes: result["error-codes"] || [],
      }),
      {
        status: success ? 200 : 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "unknown_error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
