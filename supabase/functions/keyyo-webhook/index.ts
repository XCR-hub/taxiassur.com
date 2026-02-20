import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

/**
 * Keyyo Webhook Handler
 * Reçoit les notifications d'appels de Keyyo via HTTP GET
 *
 * Documentation: Guide Keyyo CTI/API/TAPI v1.6
 *
 * Paramètres GET envoyés par Keyyo:
 * - _ACCOUNT_: Numéro de la ligne Keyyo (format international)
 * - _CALLER_: Numéro de l'appelant (format international)
 * - _CALLEE_: Numéro de l'appelé (format international)
 * - _CALLREF_: Identifiant de l'appel
 * - _N_TYPE_: Type de notification (SETUP, CONNECT, RELEASE)
 * - _N_VERSION_: Version de l'API (1)
 * - _DREF_: Identifiant du dialogue
 * - _DREF_REPLACE_: Identifiant du dialogue remplacé (interception/transfert)
 * - _SESSION_ID_: Identifiant de session
 * - _IS_ACD_: Si l'appel provient d'un numéro d'accueil (1/0)
 * - _REDIRECTING_NUMBER_: Numéro qui effectue le renvoi
 * - _TSMS_: Timestamp en millisecondes
 *
 * Sécurité: Keyyo envoie depuis l'IP 83.136.160.79
 */

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Keyyo envoie les notifications via GET
    const url = new URL(req.url);
    const params = url.searchParams;

    // Extraire les paramètres Keyyo
    const account = params.get("account") || params.get("_ACCOUNT_");
    const caller = params.get("caller") || params.get("_CALLER_");
    const callee = params.get("callee") || params.get("_CALLEE_");
    const callRef = params.get("callref") || params.get("_CALLREF_");
    const notificationType = params.get("type") || params.get("_N_TYPE_");
    const dref = params.get("dref") || params.get("_DREF_");
    const drefReplace = params.get("drefreplace") || params.get("_DREF_REPLACE_");
    const sessionId = params.get("_SESSION_ID_");
    const isAcd = params.get("_IS_ACD_") === "1";
    const redirectingNumber = params.get("_REDIRECTING_NUMBER_");
    const tsms = params.get("_TSMS_");

    // Vérifier l'IP source (sécurité)
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("x-real-ip");

    console.log("Keyyo webhook received:", {
      ip: clientIp,
      account,
      caller,
      callee,
      type: notificationType,
      callRef,
      dref,
    });

    // Valider les paramètres obligatoires
    if (!account || !caller || !callee || !notificationType) {
      throw new Error(
        "Missing required parameters: account, caller, callee, type"
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Récupérer le provider Keyyo
    const { data: provider } = await supabase
      .from("telephony_providers")
      .select("id")
      .eq("name", "keyyo")
      .single();

    if (!provider) {
      console.error("Keyyo provider not found");
      return new Response("OK", { status: 200 }); // Toujours répondre OK pour Keyyo
    }

    // Déterminer la direction de l'appel
    // Si ACCOUNT = CALLER, c'est un appel sortant, sinon entrant
    const direction = account === caller ? "outbound" : "inbound";

    // Créer un ID unique pour l'appel (combinaison de DREF et CALLREF)
    const externalId = callRef || `keyyo_${dref}_${tsms}`;

    // Timestamp de l'événement
    const eventTimestamp = tsms
      ? new Date(parseInt(tsms)).toISOString()
      : new Date().toISOString();

    // Construire les métadonnées
    const metadata: any = {
      account,
      caller,
      callee,
      call_ref: callRef,
      dref,
      dref_replace: drefReplace,
      session_id: sessionId,
      is_acd: isAcd,
      redirecting_number: redirectingNumber,
      notification_type: notificationType,
      timestamp_ms: tsms,
    };

    // Traiter selon le type de notification
    switch (notificationType) {
      case "SETUP": {
        // Initiation de l'appel (le téléphone sonne)
        await handleSetup(
          supabase,
          provider.id,
          externalId,
          direction,
          caller,
          callee,
          account,
          eventTimestamp,
          metadata
        );
        break;
      }

      case "CONNECT": {
        // Appel décroché
        await handleConnect(supabase, externalId, eventTimestamp);
        break;
      }

      case "RELEASE": {
        // Appel terminé
        await handleRelease(supabase, externalId, eventTimestamp);
        break;
      }

      default:
        console.warn(`Unknown notification type: ${notificationType}`);
    }

    // Toujours répondre OK à Keyyo
    return new Response("OK", {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "text/plain" },
    });
  } catch (error: any) {
    console.error("Keyyo Webhook error:", error);

    // Même en cas d'erreur, répondre OK pour ne pas que Keyyo réessaie
    return new Response("OK", {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "text/plain" },
    });
  }
});

/**
 * SETUP: Initiation de l'appel (sonnerie)
 */
async function handleSetup(
  supabase: any,
  providerId: string,
  externalId: string,
  direction: string,
  caller: string,
  callee: string,
  account: string,
  timestamp: string,
  metadata: any
) {
  try {
    // Essayer de trouver le lead associé au numéro
    let leadId = null;

    // Pour les appels entrants, chercher le lead par le numéro de l'appelant
    if (direction === "inbound") {
      const { data: lead } = await supabase
        .from("crm_leads")
        .select("id")
        .or(`phone.eq.${caller},mobile.eq.${caller}`)
        .limit(1)
        .single();

      if (lead) {
        leadId = lead.id;
      }
    }

    // Pour les appels sortants, chercher par le numéro appelé
    if (direction === "outbound") {
      const { data: lead } = await supabase
        .from("crm_leads")
        .select("id")
        .or(`phone.eq.${callee},mobile.eq.${callee}`)
        .limit(1)
        .single();

      if (lead) {
        leadId = lead.id;
      }
    }

    // Essayer de trouver l'utilisateur associé à cette ligne Keyyo
    let userId = null;
    const { data: keyyoUser } = await supabase
      .from("telephony_users")
      .select("user_id")
      .eq("provider_id", providerId)
      .eq("phone_number", account)
      .limit(1)
      .single();

    if (keyyoUser) {
      userId = keyyoUser.user_id;
    }

    // Créer ou mettre à jour l'enregistrement de l'appel
    const { error } = await supabase.from("telephony_calls").upsert(
      {
        external_id: externalId,
        provider_id: providerId,
        lead_id: leadId,
        user_id: userId,
        direction,
        from_number: caller,
        to_number: callee,
        status: "ringing",
        initiated_at: timestamp,
        metadata,
      },
      {
        onConflict: "external_id",
      }
    );

    if (error) {
      console.error("Failed to save call SETUP:", error);
    } else {
      console.log(`Call SETUP saved: ${externalId} (${direction})`);
    }

    // Si un lead est trouvé, créer une interaction
    if (leadId) {
      await supabase.from("crm_interactions").insert({
        lead_id: leadId,
        type: "call_incoming",
        channel: "phone",
        direction,
        metadata: {
          phone_number: direction === "inbound" ? caller : callee,
          status: "ringing",
          call_ref: externalId,
        },
      });
    }
  } catch (error) {
    console.error("Error in handleSetup:", error);
  }
}

/**
 * CONNECT: Appel décroché
 */
async function handleConnect(
  supabase: any,
  externalId: string,
  timestamp: string
) {
  try {
    const { error } = await supabase
      .from("telephony_calls")
      .update({
        status: "answered",
        answered_at: timestamp,
      })
      .eq("external_id", externalId);

    if (error) {
      console.error("Failed to update call CONNECT:", error);
    } else {
      console.log(`Call CONNECT updated: ${externalId}`);
    }
  } catch (error) {
    console.error("Error in handleConnect:", error);
  }
}

/**
 * RELEASE: Appel terminé
 */
async function handleRelease(
  supabase: any,
  externalId: string,
  timestamp: string
) {
  try {
    // Récupérer l'appel pour calculer la durée
    const { data: call } = await supabase
      .from("telephony_calls")
      .select("*")
      .eq("external_id", externalId)
      .single();

    if (!call) {
      console.warn(`Call not found for RELEASE: ${externalId}`);
      return;
    }

    // Calculer la durée
    let durationSeconds = 0;
    let talkTimeSeconds = 0;

    if (call.initiated_at) {
      const initiatedTime = new Date(call.initiated_at).getTime();
      const endTime = new Date(timestamp).getTime();
      durationSeconds = Math.round((endTime - initiatedTime) / 1000);
    }

    if (call.answered_at) {
      const answeredTime = new Date(call.answered_at).getTime();
      const endTime = new Date(timestamp).getTime();
      talkTimeSeconds = Math.round((endTime - answeredTime) / 1000);
    }

    // Mettre à jour l'appel
    const { error } = await supabase
      .from("telephony_calls")
      .update({
        status: "completed",
        ended_at: timestamp,
        duration_seconds: durationSeconds,
        talk_time_seconds: talkTimeSeconds,
      })
      .eq("external_id", externalId);

    if (error) {
      console.error("Failed to update call RELEASE:", error);
    } else {
      console.log(
        `Call RELEASE updated: ${externalId} (duration: ${durationSeconds}s, talk: ${talkTimeSeconds}s)`
      );
    }

    // Mettre à jour l'interaction si elle existe
    if (call.lead_id) {
      await supabase
        .from("crm_interactions")
        .update({
          metadata: supabase.raw(`metadata || '{"duration_seconds": ${talkTimeSeconds}, "status": "completed"}'::jsonb`),
        })
        .eq("lead_id", call.lead_id)
        .eq("metadata->>call_ref", externalId);
    }
  } catch (error) {
    console.error("Error in handleRelease:", error);
  }
}
