import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const OUR_NUMBER = "+33744410598";
const MISSING_TEXT_VALUES = new Set(["undefined", "null", "nan", "none", "n/a", "na"]);

function cleanText(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = String(value).trim();
  if (!text || MISSING_TEXT_VALUES.has(text.toLowerCase())) return "";
  return text;
}

const SMS_TEMPLATES: Record<string, (vars: any) => string> = {
  new_lead_prospect: (vars) =>
    `TaxiAssur - Bonjour ${vars.first_name || ""}, votre demande de devis est confirmee ! Un expert vous rappelle sous 15 min. Deposez vos documents : ${vars.upload_link || vars.prospect_link || "https://taxiassur.com"}`,
  new_lead_team: (vars) =>
    `[TAXIASSUR] Nouveau lead : ${vars.lead_name || "Prospect"} - Tel: ${vars.lead_phone || "N/A"} - ${vars.lead_city || ""} - A rappeler !`,
  new_lead_commercial: (vars) =>
    `[TAXIASSUR] Nouveau lead : ${vars.lead_name || "Prospect"} - Tel: ${vars.lead_phone || "N/A"} - A rappeler sous 15 min !`,
  new_lead_confirmation: (vars) =>
    `TaxiAssur - Bonjour ${vars.first_name || ""}, demande confirmee ! Expert dispo sous 15 min. Deposez vos pieces : ${vars.upload_link || "https://taxiassur.com"}`,
  relance_documents: (vars) =>
    `TaxiAssur - ${vars.first_name || "Bonjour"}, vos documents sont en attente pour finaliser votre devis. Deposez-les : ${vars.upload_link || "https://taxiassur.com"}`,
  document_reminder: (vars) =>
    `TaxiAssur - ${vars.first_name || "Bonjour"}, documents en attente pour votre devis. Deposez-les : ${vars.upload_link || "https://taxiassur.com"}`,
  quote_ready: (vars) =>
    `TaxiAssur - ${vars.first_name || "Bonjour"}, votre devis est pret ! Consultez-le : ${vars.upload_link || "https://taxiassur.com"}`,
  devis_envoye: (vars) =>
    `TaxiAssur - ${vars.first_name || "Bonjour"}, votre devis est disponible ! Consultez-le : ${vars.upload_link || "https://taxiassur.com"}`,
  relance_devis: (vars) =>
    `TaxiAssur - ${vars.first_name || "Bonjour"}, votre devis expire bientot ! Consultez-le : ${vars.upload_link || "https://taxiassur.com"}`,
  relance_paiement: (vars) =>
    `TaxiAssur - ${vars.first_name || "Bonjour"}, finalisez le paiement pour activer votre assurance : ${vars.upload_link || "https://taxiassur.com"}`,
  payment_reminder: (vars) =>
    `TaxiAssur - ${vars.first_name || "Bonjour"}, finalisez votre paiement : ${vars.upload_link || "https://taxiassur.com"}`,
  relance_signature: (vars) =>
    `TaxiAssur - ${vars.first_name || "Bonjour"}, signez votre contrat en 2 min : ${vars.upload_link || "https://taxiassur.com"}`,
  welcome_client: (vars) =>
    `TaxiAssur - Bienvenue ${vars.first_name || ""} ! Contrat actif. Espace client : https://taxiassur.com/espace-client`,
  client_actif: (vars) =>
    `TaxiAssur - Felicitations ${vars.first_name || ""} ! Assurance active. Espace client : https://taxiassur.com/espace-client`,
};

async function sendSMSViaBrevo(phone: string, content: string, tag?: string): Promise<{ success: boolean; messageId?: string }> {
  const brevoApiKey = Deno.env.get("BREVO_API_KEY");
  if (!brevoApiKey) throw new Error("BREVO_API_KEY not configured");

  let phoneNumber = phone.replace(/[\s\-\.]/g, "");
  if (phoneNumber.startsWith("0")) phoneNumber = "33" + phoneNumber.substring(1);
  if (!phoneNumber.startsWith("+")) phoneNumber = "+" + phoneNumber;

  const response = await fetch("https://api.brevo.com/v3/transactionalSMS/sms", {
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
      content,
      tag: tag || "workflow-sms",
    }),
    signal: AbortSignal.timeout(30_000),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || `SMS failed: ${response.status}`);
  return { success: true, messageId: data.messageId?.toString() };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (req.headers.get("Authorization") !== `Bearer ${supabaseKey}`) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    let totalSent = 0;
    let totalFailed = 0;

    const staleBefore = new Date(Date.now() - 10 * 60_000).toISOString();
    const { error: recoverMessagesError } = await supabase
      .from("sms_messages")
      .update({ status: "pending" })
      .eq("status", "processing")
      .eq("direction", "outbound")
      .lt("updated_at", staleBefore);
    if (recoverMessagesError) throw recoverMessagesError;

    const { data: staleQueue, error: staleQueueError } = await supabase
      .from("sms_queue")
      .select("id,attempts,updated_at")
      .eq("status", "processing")
      .lt("updated_at", staleBefore)
      .limit(100);
    if (staleQueueError) throw staleQueueError;

    for (const stale of staleQueue || []) {
      const attempts = (stale.attempts || 0) + 1;
      const exhausted = attempts >= 3;
      const { error: recoveryError } = await supabase
        .from("sms_queue")
        .update({
          status: exhausted ? "failed" : "pending",
          attempts,
          scheduled_for: exhausted ? undefined : new Date(Date.now() + 60_000).toISOString(),
          error_message: exhausted ? "Delivery attempts exhausted" : "Recovered after interrupted processing",
          updated_at: new Date().toISOString(),
        })
        .eq("id", stale.id)
        .eq("status", "processing")
        .eq("updated_at", stale.updated_at);
      if (recoveryError) throw recoveryError;
    }

    // 1. Process sms_messages with pending status (new conversation system)
    const { data: pendingMessages } = await supabase
      .from("sms_messages")
      .select("*")
      .eq("status", "pending")
      .eq("direction", "outbound")
      .order("created_at", { ascending: true })
      .limit(20);

    for (const msg of pendingMessages || []) {
      const { data: claimedMessage, error: claimMessageError } = await supabase
        .from("sms_messages")
        .update({ status: "processing", updated_at: new Date().toISOString() })
        .eq("id", msg.id)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();
      if (claimMessageError) throw claimMessageError;
      if (!claimedMessage) continue;
      try {
        const recipient = cleanText(msg.to_number);
        if (!recipient) {
          await supabase.from("sms_messages").update({
            status: "failed",
            metadata: { ...((msg.metadata as any) || {}), error: "Skipped invalid SMS recipient" },
          }).eq("id", msg.id);
          totalFailed++;
          continue;
        }

        const result = await sendSMSViaBrevo(recipient, msg.content, msg.workflow_trigger || "crm-conversation");

        await supabase.from("sms_messages").update({
          status: "sent",
          provider_message_id: result.messageId,
          sent_at: new Date().toISOString(),
        }).eq("id", msg.id);

        if (msg.conversation_id) {
          await supabase.from("sms_conversations").update({
            last_message_at: new Date().toISOString(),
          }).eq("id", msg.conversation_id);
        }

        if (msg.lead_id) {
          await supabase.from("crm_interactions").insert({
            lead_id: msg.lead_id,
            type: "sms",
            direction: "outbound",
            subject: msg.is_automated ? "SMS automatique envoye" : "SMS envoye",
            content: msg.content,
            metadata: {
              conversation_id: msg.conversation_id,
              message_id: msg.id,
              workflow: msg.workflow_trigger,
              provider_message_id: result.messageId,
              is_automated: msg.is_automated,
            },
          });
        }

        totalSent++;
      } catch (err) {
        console.error(`Failed msg ${msg.id}:`, err);
        await supabase.from("sms_messages").update({
          status: "failed",
          metadata: { ...((msg.metadata as any) || {}), error: String(err) },
        }).eq("id", msg.id);
        totalFailed++;
      }
    }

    // 2. Process legacy sms_queue table
    const { data: pending } = await supabase
      .from("sms_queue")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_for", new Date().toISOString())
      .order("priority", { ascending: false })
      .limit(20);

    for (const sms of pending || []) {
      try {
        const { data: claimed, error: claimError } = await supabase
          .from("sms_queue")
          .update({ status: "processing", updated_at: new Date().toISOString() })
          .eq("id", sms.id)
          .eq("status", "pending")
          .select("id")
          .maybeSingle();
        if (claimError) throw claimError;
        if (!claimed) continue;

        const recipient = cleanText(sms.recipient);
        if (!recipient) {
          await supabase.from("sms_queue").update({
            status: "failed",
            error_message: "Skipped invalid SMS recipient",
            attempts: (sms.attempts || 0) + 1,
          }).eq("id", sms.id);
          totalFailed++;
          continue;
        }

        const vars = sms.variables || {};
        const templateFn = SMS_TEMPLATES[sms.template_key];
        const content = templateFn ? templateFn(vars) : (sms.content || "");

        if (!content) throw new Error(`No content for template: ${sms.template_key}`);

        const result = await sendSMSViaBrevo(recipient, content, sms.template_key);

        await supabase.from("sms_queue").update({
          status: "sent",
          sent_at: new Date().toISOString(),
          attempts: (sms.attempts || 0) + 1,
          metadata: { ...(sms.metadata || {}), message_id: result.messageId },
          updated_at: new Date().toISOString(),
        }).eq("id", sms.id);

        // Also insert into sms_messages for conversation tracking
        if (sms.lead_id) {
          const { data: convId } = await supabase.rpc("get_or_create_sms_conversation", {
            p_phone_number: recipient,
            p_lead_id: sms.lead_id,
          });

          await supabase.from("sms_messages").insert({
            conversation_id: convId,
            lead_id: sms.lead_id,
            direction: "outbound",
            from_number: OUR_NUMBER,
            to_number: recipient,
            content,
            status: "sent",
            provider_message_id: result.messageId,
            is_automated: true,
            workflow_trigger: sms.template_key,
            sent_at: new Date().toISOString(),
          });

          await supabase.from("crm_interactions").insert({
            lead_id: sms.lead_id,
            type: "sms",
            direction: "outbound",
            subject: "SMS workflow envoye",
            content,
            metadata: { provider: "brevo", message_id: result.messageId, template: sms.template_key, automated: true },
          });
        }

        totalSent++;
      } catch (err) {
        console.error(`Failed sms_queue ${sms.id}:`, err);
        await supabase.from("sms_queue").update({
          status: "failed",
          error_message: err instanceof Error ? err.message : "Unknown error",
          attempts: (sms.attempts || 0) + 1,
        }).eq("id", sms.id);
        totalFailed++;
      }
    }

    // 3. Process automated workflow rules (no_response triggers)
    await processNoResponseWorkflows(supabase);

    return new Response(
      JSON.stringify({ success: true, sent: totalSent, failed: totalFailed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("SMS queue error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function processNoResponseWorkflows(supabase: any) {
  const now = new Date();
  const currentHour = now.getHours();

  const { data: rules } = await supabase
    .from("sms_workflow_rules")
    .select("*")
    .eq("is_active", true)
    .eq("trigger_type", "no_response")
    .order("priority", { ascending: false });

  if (!rules?.length) return;

  for (const rule of rules) {
    if (currentHour < (rule.send_window_start || 8) || currentHour >= (rule.send_window_end || 20)) continue;

    const config = rule.trigger_config;
    const hoursSince = config.hours_since_last_contact || 24;
    const cutoff = new Date(now.getTime() - hoursSince * 3600000).toISOString();

    let query = supabase
      .from("crm_leads")
      .select("id, first_name, last_name, phone, email, access_token, pipeline_stage")
      .not("phone", "is", null)
      .lt("updated_at", cutoff)
      .limit(5);

    if (config.condition === "missing_documents") query = query.eq("pipeline_stage", "collecte_documents");
    else if (config.condition === "quotes_not_viewed") query = query.in("pipeline_stage", ["saisie_devis", "validation_devis"]);
    else if (config.condition === "no_activity") query = query.in("pipeline_stage", ["nouveau_lead", "collecte_documents"]);
    else continue;

    const { data: leads } = await query;
    if (!leads?.length) continue;

    for (const lead of leads) {
      const recipient = cleanText(lead.phone);
      if (!recipient) continue;
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const { count } = await supabase.from("sms_messages")
        .select("id", { count: "exact", head: true })
        .eq("lead_id", lead.id).eq("direction", "outbound")
        .gte("created_at", todayStart.toISOString());

      if ((count || 0) >= (rule.max_per_lead_per_day || 3)) continue;

      const { count: alreadySent } = await supabase.from("sms_messages")
        .select("id", { count: "exact", head: true })
        .eq("lead_id", lead.id).eq("workflow_trigger", rule.name)
        .gte("created_at", cutoff);

      if ((alreadySent || 0) > 0) continue;

      const prospectUrl = lead.access_token
        ? `https://taxiassur.com/espace-prospect?token=${lead.access_token}`
        : "https://taxiassur.com";

      const message = rule.message_template
        .replace(/\{\{first_name\}\}/g, lead.first_name || "")
        .replace(/\{\{last_name\}\}/g, lead.last_name || "")
        .replace(/\{\{prospect_url\}\}/g, prospectUrl)
        .replace(/\{\{email\}\}/g, lead.email || "");

      const { data: convId } = await supabase.rpc("get_or_create_sms_conversation", {
        p_phone_number: recipient, p_lead_id: lead.id,
      });

      await supabase.from("sms_messages").insert({
        conversation_id: convId,
        lead_id: lead.id,
        direction: "outbound",
        from_number: OUR_NUMBER,
        to_number: recipient,
        content: message,
        status: "pending",
        is_automated: true,
        workflow_trigger: rule.name,
      });
    }
  }
}
