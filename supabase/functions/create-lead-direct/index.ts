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

    // Normaliser l'email
    const normalizedEmail = input.p_email.toLowerCase().trim();

    // 1. Vérifier si un lead existe déjà avec cet email
    const { data: existingLead } = await supabase
      .from("crm_leads")
      .select("id, access_token, first_name, last_name, phone, city, source, metadata")
      .eq("email", normalizedEmail)
      .maybeSingle(); // maybeSingle() ne lance pas d'erreur si aucun lead trouvé

    let result;

    if (existingLead) {
      // Lead existant : mise à jour
      console.log("[create-lead-direct] Updating existing lead:", existingLead.id);

      const { error: updateError } = await supabase
        .from("crm_leads")
        .update({
          first_name: input.p_first_name || existingLead.first_name,
          last_name: input.p_last_name || existingLead.last_name,
          phone: input.p_phone || existingLead.phone,
          city: input.p_city || existingLead.city,
          source: input.p_source || existingLead.source,
          metadata: input.p_metadata || existingLead.metadata,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingLead.id);

      if (updateError) {
        console.error("[create-lead-direct] Update error:", updateError);
        throw updateError;
      }

      result = {
        lead_id: existingLead.id,
        access_token: existingLead.access_token,
        is_new: false,
      };
    } else {
      // Nouveau lead : insertion
      console.log("[create-lead-direct] Creating new lead");

      // Générer un token d'accès
      const accessToken = crypto.randomUUID().replace(/-/g, "");

      const { data: insertResult, error: insertError } = await supabase
        .from("crm_leads")
        .insert({
          email: normalizedEmail,
          first_name: input.p_first_name,
          last_name: input.p_last_name,
          phone: input.p_phone,
          city: input.p_city,
          source: input.p_source || "website",
          metadata: input.p_metadata || {},
          access_token: accessToken,
          status: "nouveau_lead",
        })
        .select("id, access_token");

      if (insertError) {
        console.error("[create-lead-direct] Insert error:", insertError);
        console.error("[create-lead-direct] Error code:", insertError.code);
        console.error("[create-lead-direct] Error message:", insertError.message);
        throw insertError;
      }

      if (!insertResult || insertResult.length === 0) {
        console.error("[create-lead-direct] No data returned after insert");
        throw new Error("Insertion réussie mais aucune donnée retournée");
      }

      const newLead = insertResult[0];
      result = {
        lead_id: newLead.id,
        access_token: newLead.access_token,
        is_new: true,
      };
    }

    console.log("[create-lead-direct] Lead saved:", {
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
