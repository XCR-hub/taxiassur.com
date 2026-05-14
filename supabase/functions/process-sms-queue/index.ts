import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SMS_TEMPLATES: Record<string, (vars: any) => string> = {
  new_lead_prospect: (vars) =>
    `TaxiAssur - Bonjour ${vars.first_name || vars.lead_name || ""}, votre demande de devis est confirmee ! Un expert vous rappelle sous 15 min. Deposez vos documents ici : ${vars.upload_link || vars.prospect_link || "https://taxiassur.com"}`,

  new_lead_team: (vars) =>
    `[TAXIASSUR] Nouveau lead : ${vars.lead_name || "Prospect"} - Tel: ${vars.lead_phone || "N/A"} - ${vars.lead_city || ""} - A rappeler sous 15 min !`,

  new_lead_commercial: (vars) =>
    `[TAXIASSUR] Nouveau lead : ${vars.lead_name || "Prospect"} - Tel: ${vars.lead_phone || "N/A"} - ${vars.lead_city || ""} - A rappeler sous 15 min !`,

  new_lead_confirmation: (vars) =>
    `TaxiAssur - Bonjour ${vars.first_name || vars.lead_name || ""}, votre demande est confirmee ! Expert dispo sous 15 min. Deposez vos pieces : ${vars.upload_link || "https://taxiassur.com"}`,

  relance_documents: (vars) =>
    `TaxiAssur - ${vars.first_name || "Bonjour"}, vos documents sont en attente pour finaliser votre devis. Deposez-les ici : ${vars.upload_link || "https://taxiassur.com"} - Tel: 01 80 85 57 86`,

  document_reminder: (vars) =>
    `TaxiAssur - ${vars.first_name || "Bonjour"}, vos documents sont en attente pour votre devis. Deposez-les maintenant : ${vars.upload_link || "https://taxiassur.com"}`,

  quote_ready: (vars) =>
    `TaxiAssur - ${vars.first_name || "Bonjour"}, votre devis est pret ! Consultez-le et choisissez votre offre : ${vars.upload_link || "https://taxiassur.com"} - Tel: 01 80 85 57 86`,

  devis_envoye: (vars) =>
    `TaxiAssur - ${vars.first_name || "Bonjour"}, votre devis est disponible ! Consultez-le ici : ${vars.upload_link || "https://taxiassur.com"}`,

  relance_devis: (vars) =>
    `TaxiAssur - ${vars.first_name || "Bonjour"}, votre devis vous attend ! Offre limitee. Consultez-le : ${vars.upload_link || "https://taxiassur.com"} - Tel: 01 80 85 57 86`,

  quote_reminder: (vars) =>
    `TaxiAssur - ${vars.first_name || "Bonjour"}, n'oubliez pas votre devis ! Consultez-le ici : ${vars.upload_link || "https://taxiassur.com"}`,

  relance_paiement: (vars) =>
    `TaxiAssur - ${vars.first_name || "Bonjour"}, votre devis est accepte ! Finalisez le paiement pour activer votre assurance : ${vars.upload_link || "https://taxiassur.com"}`,

  payment_reminder: (vars) =>
    `TaxiAssur - ${vars.first_name || "Bonjour"}, finalisez votre paiement pour activer votre couverture : ${vars.upload_link || "https://taxiassur.com"}`,

  relance_signature: (vars) =>
    `TaxiAssur - ${vars.first_name || "Bonjour"}, signez votre contrat en 2 min : ${vars.upload_link || "https://taxiassur.com"} - Votre couverture demarre des la signature !`,

  signature_reminder: (vars) =>
    `TaxiAssur - ${vars.first_name || "Bonjour"}, votre contrat attend votre signature. C'est rapide et securise : ${vars.upload_link || "https://taxiassur.com"}`,

  welcome_client: (vars) =>
    `TaxiAssur - Bienvenue ${vars.first_name || ""} ! Votre contrat est actif. Accedez a votre espace client : https://taxiassur.com/espace-client - Tel: 01 80 85 57 86`,

  client_actif: (vars) =>
    `TaxiAssur - Felicitations ${vars.first_name || ""} ! Votre assurance est active. Espace client : https://taxiassur.com/espace-client`,

  // Reactivation / recontact templates
  reactivation_premier_contact: (vars) =>
    `TaxiAssur - ${vars.first_name || "Bonjour"}, on reprend contact ! Nouvelles offres exclusives pour votre assurance taxi. Reprenez votre dossier : ${vars.upload_link || vars.prospect_link || "https://taxiassur.com"} - Tel: 01 80 85 57 86`,

  reactivation_tarifs: (vars) =>
    `TaxiAssur - ${vars.first_name || "Bonjour"}, nos tarifs 2026 ont baisse ! Profitez-en pour votre assurance taxi. Votre dossier est actif : ${vars.upload_link || vars.prospect_link || "https://taxiassur.com"}`,

  reactivation_derniere_chance: (vars) =>
    `TaxiAssur - ${vars.first_name || "Bonjour"}, derniere chance ! Offre speciale anciens prospects sur votre assurance taxi : ${vars.upload_link || vars.prospect_link || "https://taxiassur.com"} - Tel: 01 80 85 57 86`,

  relance_inactive: (vars) =>
    `TaxiAssur - ${vars.first_name || "Bonjour"}, votre demande de devis est toujours en cours ! Reprenez-la : ${vars.upload_link || vars.prospect_link || "https://taxiassur.com"} - Devis gratuit. Tel: 01 80 85 57 86`,

  recontact_programme: (vars) =>
    `TaxiAssur - ${vars.first_name || "Bonjour"}, votre dossier a ete reactive. De nouvelles offres sont disponibles ! Consultez : ${vars.upload_link || vars.prospect_link || "https://taxiassur.com"}`,
};

async function sendSMS(
  phone: string,
  content: string,
  leadId?: string
): Promise<{ success: boolean; messageId?: string }> {
  const brevoApiKey = Deno.env.get("BREVO_API_KEY");
  if (!brevoApiKey) {
    throw new Error("BREVO_API_KEY not configured");
  }

  let phoneNumber = phone.replace(/[\s\-\.]/g, "");
  if (phoneNumber.startsWith("0")) {
    phoneNumber = "33" + phoneNumber.substring(1);
  }
  if (!phoneNumber.startsWith("+")) {
    phoneNumber = "+" + phoneNumber;
  }

  const response = await fetch(
    "https://api.brevo.com/v3/transactionalSMS/sms",
    {
      method: "POST",
      headers: {
        "api-key": brevoApiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        type: "transactional",
        unicodeEnabled: true,
        sender: "TaxiAssur",
        recipient: phoneNumber,
        content: content,
        tag: "workflow-sms",
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error("Brevo SMS error:", data);
    throw new Error(data.message || "SMS send failed");
  }

  // Log CRM interaction
  if (leadId) {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    await supabase.from("crm_interactions").insert({
      lead_id: leadId,
      type: "sms",
      direction: "outbound",
      subject: `SMS workflow envoye`,
      content: content,
      metadata: {
        message_id: data.messageId,
        reference: data.reference,
        phone: phoneNumber,
        provider: "brevo",
        automated: true,
      },
    });
  }

  return { success: true, messageId: data.messageId };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Processing SMS queue...");

    const { data: pending, error: fetchError } = await supabase
      .from("sms_queue")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_for", new Date().toISOString())
      .order("priority", { ascending: false })
      .limit(20);

    if (fetchError) throw fetchError;

    if (!pending || pending.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          processed: 0,
          message: "No pending SMS",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${pending.length} pending SMS`);

    let sent = 0;
    let failed = 0;

    for (const sms of pending) {
      try {
        await supabase
          .from("sms_queue")
          .update({ status: "processing" })
          .eq("id", sms.id);

        const vars = sms.variables || {};
        const templateFn = SMS_TEMPLATES[sms.template_key];

        let content: string;
        if (templateFn) {
          content = templateFn(vars);
        } else if (sms.content) {
          content = sms.content;
        } else {
          throw new Error(`Unknown SMS template: ${sms.template_key}`);
        }

        const result = await sendSMS(sms.recipient, content, sms.lead_id);

        await supabase
          .from("sms_queue")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            attempts: (sms.attempts || 0) + 1,
            metadata: { ...(sms.metadata || {}), message_id: result.messageId },
          })
          .eq("id", sms.id);

        sent++;
        console.log(
          `SMS sent to ${sms.recipient} (template: ${sms.template_key})`
        );
      } catch (err) {
        console.error(`Failed to send SMS ${sms.id}:`, err);

        await supabase
          .from("sms_queue")
          .update({
            status: "failed",
            error_message:
              err instanceof Error ? err.message : "Unknown error",
            attempts: (sms.attempts || 0) + 1,
          })
          .eq("id", sms.id);

        failed++;
      }
    }

    console.log(`SMS processed: ${pending.length}, Sent: ${sent}, Failed: ${failed}`);

    return new Response(
      JSON.stringify({ success: true, processed: pending.length, sent, failed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("SMS queue processor error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
