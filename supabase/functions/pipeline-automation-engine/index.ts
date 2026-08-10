import { isInternalRequest } from "../_shared/internal-auth.ts";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (!(await isInternalRequest(req))) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("[Pipeline Automation] Starting...");

    const results = {
      document_reminders: 0,
      quote_reminders: 0,
      payment_reminders: 0,
      signature_reminders: 0,
      welcome_sent: 0,
      errors: 0,
    };

    await processDocumentReminders(supabase, results);
    await processQuoteReminders(supabase, results);
    await processPaymentReminders(supabase, results);
    await processSignatureReminders(supabase, results);
    await processNewClients(supabase, results);

    console.log("[Pipeline Automation] Done:", results);

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[Pipeline Automation] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

async function queueEmail(
  supabase: any,
  recipient: string,
  templateKey: string,
  variables: Record<string, string>,
  priority: number = 5,
) {
  const { error } = await supabase.from("notification_queue").insert({
    recipient,
    template_key: templateKey,
    variables,
    status: "pending",
    priority,
    scheduled_for: new Date().toISOString(),
  });
  if (error) {
    throw new Error(
      "Notification queue insert failed: " + (error.code || "unknown"),
    );
  }
}

async function logInteraction(
  supabase: any,
  leadId: string,
  subject: string,
  type: string,
) {
  const { error } = await supabase.from("crm_interactions").insert({
    lead_id: leadId,
    type: "email",
    direction: "outbound",
    subject,
    content: `Relance automatique : ${type}`,
    from_email: "team@taxiassur.com",
  });
  if (error) {
    throw new Error("Interaction insert failed: " + (error.code || "unknown"));
  }
}

function getUploadLink(lead: any): string {
  const token = typeof lead.access_token === "string"
    ? lead.access_token.trim().toLowerCase()
    : "";
  if (!/^[0-9a-f]{64}$/.test(token)) {
    throw new Error("Lead access token missing");
  }
  return `https://taxiassur.com/espace-prospect?token=${token}`;
}

function getFirstName(lead: any): string {
  return (
    lead.first_name ||
    (lead.full_name ? lead.full_name.split(" ")[0] : null) ||
    (lead.name ? lead.name.split(" ")[0] : null) ||
    "Prospect"
  );
}

// ==========================================
// 1. DOCUMENT REMINDERS
// Leads in COLLECTE_DOCUMENTS with no doc for >48h
// ==========================================
async function processDocumentReminders(supabase: any, results: any) {
  try {
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    const { data: leads } = await supabase
      .from("crm_leads")
      .select(
        "id, email, full_name, first_name, name, access_token, updated_at",
      )
      .eq("status", "COLLECTE_DOCUMENTS")
      .lt("updated_at", cutoff)
      .not("email", "is", null);

    for (const lead of leads || []) {
      try {
        const { data: docs } = await supabase
          .from("crm_lead_documents")
          .select("id")
          .eq("lead_id", lead.id)
          .limit(1);

        if (docs && docs.length > 0) continue;

        const { data: lastInteraction } = await supabase
          .from("crm_interactions")
          .select("created_at")
          .eq("lead_id", lead.id)
          .eq("type", "email")
          .ilike("subject", "%documents%")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastInteraction) {
          const lastSent = new Date(lastInteraction.created_at).getTime();
          if (Date.now() - lastSent < 72 * 60 * 60 * 1000) continue;
        }

        const firstName = getFirstName(lead);
        const uploadLink = getUploadLink(lead);

        await queueEmail(supabase, lead.email, "relance_documents", {
          first_name: firstName,
          upload_link: uploadLink,
        }, 7);

        await logInteraction(
          supabase,
          lead.id,
          "Rappel : Documents manquants",
          "relance_documents",
        );
        results.document_reminders++;
      } catch (err) {
        console.error(`[Doc reminders] Error for lead ${lead.id}:`, err);
        results.errors++;
      }
    }
  } catch (err) {
    console.error("[Doc reminders] Fatal:", err);
  }
}

// ==========================================
// 2. QUOTE REMINDERS
// Leads in DEVIS status for >72h
// ==========================================
async function processQuoteReminders(supabase: any, results: any) {
  try {
    const cutoff = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();

    const { data: leads } = await supabase
      .from("crm_leads")
      .select(
        "id, email, full_name, first_name, name, access_token, updated_at",
      )
      .eq("status", "DEVIS")
      .lt("updated_at", cutoff)
      .not("email", "is", null);

    for (const lead of leads || []) {
      try {
        const { data: lastInteraction } = await supabase
          .from("crm_interactions")
          .select("created_at")
          .eq("lead_id", lead.id)
          .eq("type", "email")
          .ilike("subject", "%devis%")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastInteraction) {
          const lastSent = new Date(lastInteraction.created_at).getTime();
          if (Date.now() - lastSent < 72 * 60 * 60 * 1000) continue;
        }

        const firstName = getFirstName(lead);
        const uploadLink = getUploadLink(lead);

        await queueEmail(supabase, lead.email, "relance_devis", {
          first_name: firstName,
          upload_link: uploadLink,
        }, 6);

        await logInteraction(
          supabase,
          lead.id,
          "Votre devis TaxiAssur vous attend",
          "relance_devis",
        );
        results.quote_reminders++;
      } catch (err) {
        console.error(`[Quote reminders] Error for lead ${lead.id}:`, err);
        results.errors++;
      }
    }
  } catch (err) {
    console.error("[Quote reminders] Fatal:", err);
  }
}

// ==========================================
// 3. PAYMENT REMINDERS
// Leads in DECISION_CLIENT or PAIEMENT for >48h
// ==========================================
async function processPaymentReminders(supabase: any, results: any) {
  try {
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    const { data: leads } = await supabase
      .from("crm_leads")
      .select(
        "id, email, full_name, first_name, name, access_token, updated_at",
      )
      .in("status", ["DECISION_CLIENT", "PAIEMENT"])
      .lt("updated_at", cutoff)
      .not("email", "is", null);

    for (const lead of leads || []) {
      try {
        const { data: lastInteraction } = await supabase
          .from("crm_interactions")
          .select("created_at")
          .eq("lead_id", lead.id)
          .eq("type", "email")
          .ilike("subject", "%paiement%")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastInteraction) {
          const lastSent = new Date(lastInteraction.created_at).getTime();
          if (Date.now() - lastSent < 48 * 60 * 60 * 1000) continue;
        }

        const firstName = getFirstName(lead);
        const uploadLink = getUploadLink(lead);

        await queueEmail(supabase, lead.email, "relance_paiement", {
          first_name: firstName,
          upload_link: uploadLink,
        }, 8);

        await logInteraction(
          supabase,
          lead.id,
          "Finalisez votre souscription TaxiAssur",
          "relance_paiement",
        );
        results.payment_reminders++;
      } catch (err) {
        console.error(`[Payment reminders] Error for lead ${lead.id}:`, err);
        results.errors++;
      }
    }
  } catch (err) {
    console.error("[Payment reminders] Fatal:", err);
  }
}

// ==========================================
// 4. SIGNATURE REMINDERS
// Leads in CONTRAT_SIGNE for >24h (waiting for counter-signature)
// ==========================================
async function processSignatureReminders(supabase: any, results: any) {
  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: leads } = await supabase
      .from("crm_leads")
      .select(
        "id, email, full_name, first_name, name, access_token, updated_at",
      )
      .eq("status", "CONTRAT_SIGNE")
      .lt("updated_at", cutoff)
      .not("email", "is", null);

    for (const lead of leads || []) {
      try {
        const { data: lastInteraction } = await supabase
          .from("crm_interactions")
          .select("created_at")
          .eq("lead_id", lead.id)
          .eq("type", "email")
          .ilike("subject", "%signature%")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastInteraction) {
          const lastSent = new Date(lastInteraction.created_at).getTime();
          if (Date.now() - lastSent < 48 * 60 * 60 * 1000) continue;
        }

        const firstName = getFirstName(lead);
        const uploadLink = getUploadLink(lead);

        await queueEmail(supabase, lead.email, "relance_signature", {
          first_name: firstName,
          upload_link: uploadLink,
        }, 9);

        await logInteraction(
          supabase,
          lead.id,
          "Signez votre contrat TaxiAssur",
          "relance_signature",
        );
        results.signature_reminders++;
      } catch (err) {
        console.error(`[Signature reminders] Error for lead ${lead.id}:`, err);
        results.errors++;
      }
    }
  } catch (err) {
    console.error("[Signature reminders] Fatal:", err);
  }
}

// ==========================================
// 5. WELCOME NEW CLIENTS
// Leads just moved to CLIENT_ACTIF (last 2h, no welcome email yet)
// ==========================================
async function processNewClients(supabase: any, results: any) {
  try {
    const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    const { data: leads } = await supabase
      .from("crm_leads")
      .select("id, email, full_name, first_name, name, updated_at")
      .eq("status", "CLIENT_ACTIF")
      .gte("updated_at", cutoff)
      .not("email", "is", null);

    for (const lead of leads || []) {
      try {
        const { data: existing } = await supabase
          .from("crm_interactions")
          .select("id")
          .eq("lead_id", lead.id)
          .ilike("subject", "%bienvenue%")
          .limit(1)
          .maybeSingle();

        if (existing) continue;

        const firstName = getFirstName(lead);

        await queueEmail(supabase, lead.email, "welcome_client", {
          first_name: firstName,
        }, 10);

        await logInteraction(
          supabase,
          lead.id,
          "Bienvenue chez TaxiAssur !",
          "welcome_client",
        );
        results.welcome_sent++;
      } catch (err) {
        console.error(`[Welcome] Error for lead ${lead.id}:`, err);
        results.errors++;
      }
    }
  } catch (err) {
    console.error("[Welcome] Fatal:", err);
  }
}
