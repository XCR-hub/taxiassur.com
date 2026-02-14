import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface LeadInput {
  p_city: string;
  p_email: string;
  p_first_name: string;
  p_last_name: string;
  p_metadata: Record<string, any>;
  p_phone: string;
  p_source: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Parse input
    const input: LeadInput = await req.json();

    // Create Supabase client with service_role (bypasses RLS and PostgREST cache)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    console.log("[create-lead-direct] Creating lead:", {
      email: input.p_email,
      name: `${input.p_first_name} ${input.p_last_name}`,
    });

    // Call upsert_lead function directly via SQL
    const { data, error } = await supabase.rpc("upsert_lead", {
      p_city: input.p_city,
      p_email: input.p_email,
      p_first_name: input.p_first_name,
      p_last_name: input.p_last_name,
      p_metadata: input.p_metadata,
      p_phone: input.p_phone,
      p_source: input.p_source || "website",
    });

    if (error) {
      console.error("[create-lead-direct] Error:", error);
      throw error;
    }

    const result = data?.[0];
    if (!result) {
      throw new Error("No result from upsert_lead");
    }

    console.log("[create-lead-direct] Lead created:", {
      lead_id: result.lead_id,
      is_new: result.is_new,
    });

    return new Response(
      JSON.stringify({
        success: true,
        lead_id: result.lead_id,
        access_token: result.access_token,
        is_new: result.is_new,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("[create-lead-direct] Fatal error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Erreur lors de la création du lead",
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
