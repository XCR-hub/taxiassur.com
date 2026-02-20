import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

/**
 * Keyyo Click-to-Call Edge Function
 * Initie un appel via l'API Keyyo (API CTI réelle)
 *
 * Documentation: Guide Keyyo CTI/API/TAPI v1.6
 * URL: https://ssl.keyyo.com/makecall.html
 *
 * Authentification: HTTP DIGEST ou IP Whitelist
 */

interface ClickToCallRequest {
  account: string; // Numéro de ligne Keyyo au format international (ex: 33123456789)
  callee: string; // Numéro à appeler
  callee_name?: string; // Nom de la personne appelée
  caller?: string; // Pour mise en relation (optionnel)
  record?: boolean; // Enregistrer l'appel (envoi par email)
  lead_id?: string; // ID du lead dans le CRM
}

/**
 * Helper pour créer une URL avec authentification HTTP DIGEST
 */
async function makeKeyyoCall(
  baseUrl: string,
  params: URLSearchParams,
  sipLogin: string,
  sipPassword: string
): Promise<Response> {
  const url = `${baseUrl}/makecall.html?${params.toString()}`;

  // Essayer d'abord sans authentification (si IP whitelistée)
  let response = await fetch(url, {
    method: "GET",
    headers: {
      "User-Agent": "TaxiAssur-CRM/1.0",
    },
  });

  // Si 401, utiliser HTTP DIGEST
  if (response.status === 401 && sipLogin && sipPassword) {
    const wwwAuthenticate = response.headers.get("WWW-Authenticate");

    if (wwwAuthenticate?.includes("Digest")) {
      // Pour HTTP DIGEST, on utilise l'authentification basique
      // car Deno ne supporte pas nativement DIGEST
      const credentials = btoa(`${sipLogin}:${sipPassword}`);

      response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Basic ${credentials}`,
          "User-Agent": "TaxiAssur-CRM/1.0",
        },
      });
    }
  }

  return response;
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
    const {
      account,
      callee,
      callee_name,
      caller,
      record,
      lead_id,
    }: ClickToCallRequest = await req.json();

    if (!account || !callee) {
      throw new Error("account and callee are required");
    }

    // Get Keyyo configuration
    const { data: provider, error: providerError } = await supabase
      .from("telephony_providers")
      .select("*")
      .eq("name", "keyyo")
      .eq("is_active", true)
      .single();

    if (providerError || !provider) {
      throw new Error("Keyyo provider not configured or not active");
    }

    const config = provider.config as any;

    if (!config.base_url) {
      throw new Error("Keyyo base URL not configured");
    }

    // Construire les paramètres de l'appel
    const params = new URLSearchParams({
      ACCOUNT: account,
      CALLEE: callee,
    });

    if (callee_name) {
      params.append("CALLEE_NAME", callee_name);
    }

    if (caller) {
      params.append("CALLER", caller);
    }

    if (record) {
      params.append("RECORD", "1");
    }

    console.log("Initiating Keyyo call:", {
      account,
      callee,
      callee_name,
      caller,
      record,
    });

    // Appeler l'API Keyyo
    const keyyoResponse = await makeKeyyoCall(
      config.base_url,
      params,
      config.sip_login || account,
      config.sip_password || ""
    );

    const responseText = await keyyoResponse.text();

    if (!keyyoResponse.ok) {
      console.error("Keyyo API error:", {
        status: keyyoResponse.status,
        statusText: keyyoResponse.statusText,
        body: responseText,
      });

      // Vérifier les erreurs spécifiques
      if (keyyoResponse.status === 401) {
        throw new Error(
          "Authentification Keyyo échouée. Vérifiez le login/password SIP ou l'IP whitelistée."
        );
      } else if (keyyoResponse.status === 500 && responseText.includes("Come Back Later")) {
        throw new Error(
          "Limite de débit Keyyo atteinte (1 appel/seconde). Réessayez dans 1 seconde."
        );
      } else {
        throw new Error(
          `Keyyo API error: ${keyyoResponse.status} - ${responseText}`
        );
      }
    }

    // Keyyo renvoie "OK" en cas de succès
    if (responseText.trim() !== "OK") {
      console.warn("Unexpected Keyyo response:", responseText);
    }

    // Get user ID from auth header
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token || "");

    // Générer un ID d'appel unique (Keyyo n'en fournit pas directement)
    const externalCallId = `keyyo_${account}_${Date.now()}`;

    // Save call to database
    const { data: callData, error: callError } = await supabase
      .from("telephony_calls")
      .insert({
        provider_id: provider.id,
        external_id: externalCallId,
        lead_id: lead_id || null,
        user_id: user?.id || null,
        direction: "outbound",
        from_number: account,
        to_number: callee,
        status: "initiated",
        metadata: {
          account,
          callee,
          callee_name: callee_name || null,
          caller: caller || null,
          record_requested: record || false,
          keyyo_response: responseText,
        },
      })
      .select()
      .single();

    if (callError) {
      console.error("Failed to save call to database:", callError);
      // Don't fail the whole request if DB save fails
    }

    console.log("Call initiated successfully:", {
      call_id: callData?.id,
      external_id: externalCallId,
    });

    return new Response(
      JSON.stringify({
        success: true,
        call_id: callData?.id,
        external_id: externalCallId,
        message: "Appel initié avec succès. Votre téléphone va sonner.",
        keyyo_response: responseText,
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
        details:
          "Vérifiez la configuration Keyyo (SIP login/password ou IP whitelist)",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
