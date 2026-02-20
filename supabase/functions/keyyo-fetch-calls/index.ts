import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

/**
 * Keyyo Fetch Calls Edge Function
 * Récupère l'historique des appels depuis Keyyo API
 */

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { start_date, end_date, extension } = await req.json();

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

    // Build query params
    const params = new URLSearchParams();
    if (start_date) params.append("start_date", start_date);
    if (end_date) params.append("end_date", end_date);
    if (extension) params.append("extension", extension);

    // Call Keyyo API
    const keyyoResponse = await fetch(
      `${config.base_url}/calls?${params.toString()}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${config.api_key}`,
          "X-Account-ID": config.account_id || "",
        },
      }
    );

    if (!keyyoResponse.ok) {
      throw new Error(`Keyyo API error: ${keyyoResponse.status}`);
    }

    const keyyoData = await keyyoResponse.json();
    const calls = keyyoData.calls || keyyoData.data || [];

    // Import calls to database
    const callsToImport = calls.map((call: any) => ({
      provider_id: provider.id,
      external_id: call.id || call.call_id,
      direction: call.direction,
      from_number: call.from || call.caller_number,
      to_number: call.to || call.called_number,
      status: mapKeyyoStatus(call.status),
      initiated_at: call.start_time || call.created_at,
      answered_at: call.answer_time,
      ended_at: call.end_time || call.hangup_time,
      duration_seconds: call.duration || 0,
      talk_time_seconds: call.talk_time || call.duration || 0,
      has_recording: !!call.recording_url,
      recording_url: call.recording_url,
      metadata: {
        keyyo_data: call,
      },
    }));

    // Bulk insert (upsert on external_id)
    if (callsToImport.length > 0) {
      const { error: insertError } = await supabase
        .from("telephony_calls")
        .upsert(callsToImport, {
          onConflict: "external_id",
          ignoreDuplicates: false,
        });

      if (insertError) {
        console.error("Failed to import calls:", insertError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        calls: calls,
        imported: callsToImport.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Keyyo Fetch Calls error:", error);
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

function mapKeyyoStatus(status: string): string {
  const statusMap: Record<string, string> = {
    "answered": "answered",
    "completed": "completed",
    "no-answer": "missed",
    "busy": "failed",
    "failed": "failed",
    "voicemail": "voicemail",
  };
  return statusMap[status?.toLowerCase()] || "completed";
}
