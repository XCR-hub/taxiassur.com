import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

/**
 * Keyyo Click-to-Call Edge Function
 * Initie un appel via l'API Keyyo
 *
 * Documentation: https://api.keyyo.com/v1/docs/click-to-call
 */

interface ClickToCallRequest {
  from_extension: string;
  to_number: string;
  lead_id?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get request body
    const { from_extension, to_number, lead_id }: ClickToCallRequest = await req.json();

    if (!from_extension || !to_number) {
      throw new Error("from_extension and to_number are required");
    }

    // Get Keyyo configuration
    const { data: provider, error: providerError } = await supabase
      .from("telephony_providers")
      .select("*")
      .eq("name", "keyyo")
      .eq("is_active", true)
      .single();

    if (providerError || !provider) {
      throw new Error("Keyyo provider not configured");
    }

    const config = provider.config as any;

    if (!config.api_key || !config.base_url) {
      throw new Error("Keyyo API key or base URL not configured");
    }

    // Call Keyyo API
    // Documentation: POST /v1/click-to-call
    const keyyoResponse = await fetch(`${config.base_url}/click-to-call`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.api_key}`,
        "X-Account-ID": config.account_id || "",
      },
      body: JSON.stringify({
        from: from_extension,
        to: to_number,
        auto_answer: true, // Réponse automatique sur le poste
      }),
    });

    if (!keyyoResponse.ok) {
      const errorText = await keyyoResponse.text();
      throw new Error(`Keyyo API error: ${keyyoResponse.status} - ${errorText}`);
    }

    const keyyoData = await keyyoResponse.json();

    // Get user ID from auth header
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token || "");

    // Save call to database
    const { data: callData, error: callError } = await supabase
      .from("telephony_calls")
      .insert({
        provider_id: provider.id,
        external_id: keyyoData.call_id || keyyoData.id,
        lead_id: lead_id || null,
        user_id: user?.id || null,
        direction: "outbound",
        from_number: from_extension,
        to_number: to_number,
        status: "initiated",
        metadata: {
          keyyo_call_id: keyyoData.call_id || keyyoData.id,
          keyyo_response: keyyoData,
        },
      })
      .select()
      .single();

    if (callError) {
      console.error("Failed to save call:", callError);
      // Don't fail the whole request if DB save fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        call_id: callData?.id || keyyoData.call_id,
        keyyo_call_id: keyyoData.call_id || keyyoData.id,
        message: "Call initiated successfully",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Keyyo Click-to-Call error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
