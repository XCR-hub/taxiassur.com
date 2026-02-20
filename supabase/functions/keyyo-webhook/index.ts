import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

/**
 * Keyyo Webhook Handler
 * Reçoit les événements de Keyyo (appels, enregistrements, etc.)
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

    const payload = await req.json();
    const eventType = payload.event || payload.type;

    console.log(`Received Keyyo webhook event: ${eventType}`, payload);

    switch (eventType) {
      case "call.initiated":
      case "call.started":
        await handleCallStarted(supabase, payload);
        break;

      case "call.answered":
        await handleCallAnswered(supabase, payload);
        break;

      case "call.ended":
      case "call.completed":
        await handleCallEnded(supabase, payload);
        break;

      case "recording.available":
        await handleRecordingAvailable(supabase, payload);
        break;

      default:
        console.log(`Unknown event type: ${eventType}`);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Webhook processed" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Keyyo Webhook error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function handleCallStarted(supabase: any, payload: any) {
  const { data, error } = await supabase
    .from("telephony_calls")
    .upsert({
      external_id: payload.call_id,
      direction: payload.direction,
      from_number: payload.from,
      to_number: payload.to,
      status: "ringing",
      initiated_at: payload.timestamp || new Date().toISOString(),
      metadata: { keyyo_event: payload },
    }, {
      onConflict: "external_id",
    });

  if (error) console.error("Failed to save call started:", error);
}

async function handleCallAnswered(supabase: any, payload: any) {
  const { error } = await supabase
    .from("telephony_calls")
    .update({
      status: "answered",
      answered_at: payload.timestamp || new Date().toISOString(),
    })
    .eq("external_id", payload.call_id);

  if (error) console.error("Failed to update call answered:", error);
}

async function handleCallEnded(supabase: any, payload: any) {
  const { error } = await supabase
    .from("telephony_calls")
    .update({
      status: "completed",
      ended_at: payload.timestamp || new Date().toISOString(),
      duration_seconds: payload.duration || 0,
      talk_time_seconds: payload.talk_time || payload.duration || 0,
      has_recording: !!payload.recording_url,
      recording_url: payload.recording_url,
    })
    .eq("external_id", payload.call_id);

  if (error) console.error("Failed to update call ended:", error);
}

async function handleRecordingAvailable(supabase: any, payload: any) {
  const { error } = await supabase
    .from("telephony_calls")
    .update({
      has_recording: true,
      recording_url: payload.recording_url,
    })
    .eq("external_id", payload.call_id);

  if (error) console.error("Failed to update recording:", error);
}
