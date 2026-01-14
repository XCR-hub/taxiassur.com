import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PendingAction {
  id: string;
  lead_id: string;
  action_type: string;
  action_params: Record<string, unknown>;
  from_status: string;
  to_status: string;
  priority: number;
  lead_email: string;
  lead_phone: string;
  lead_first_name: string;
  lead_last_name: string;
  lead_full_name: string;
}

interface ActionResult {
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const startTime = Date.now();
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const body = await req.json();
    const action = body.action || "process_queue";
    const limit = body.limit || 20;

    console.log(`Pipeline Action Executor - Action: ${action}, Limit: ${limit}`);

    if (action === "process_queue") {
      const results = await processActionQueue(supabase, limit);

      return new Response(
        JSON.stringify({
          success: true,
          processed: results.processed,
          succeeded: results.succeeded,
          failed: results.failed,
          duration_ms: Date.now() - startTime,
          details: results.details,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "execute_single" && body.action_id) {
      const result = await executeSingleAction(supabase, body.action_id);

      return new Response(
        JSON.stringify({
          success: result.success,
          result,
          duration_ms: Date.now() - startTime,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "get_stats") {
      const { data: stats } = await supabase.rpc("get_pipeline_action_stats");

      return new Response(
        JSON.stringify({ success: true, stats }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Pipeline Action Executor Error:", error);

    return new Response(
      JSON.stringify({
        error: "Executor error",
        message: error instanceof Error ? error.message : "Unknown error",
        duration_ms: Date.now() - startTime,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function processActionQueue(
  supabase: ReturnType<typeof createClient>,
  limit: number
): Promise<{ processed: number; succeeded: number; failed: number; details: ActionResult[] }> {
  const { data: pendingActions, error } = await supabase.rpc("get_pending_pipeline_actions", {
    p_limit: limit,
  });

  if (error || !pendingActions || pendingActions.length === 0) {
    console.log("No pending actions to process");
    return { processed: 0, succeeded: 0, failed: 0, details: [] };
  }

  console.log(`Processing ${pendingActions.length} pending actions`);

  const results: ActionResult[] = [];
  let succeeded = 0;
  let failed = 0;

  for (const action of pendingActions as PendingAction[]) {
    try {
      await supabase.rpc("start_pipeline_action", { p_action_id: action.id });

      const result = await executeAction(supabase, action);
      results.push(result);

      await supabase.rpc("complete_pipeline_action", {
        p_action_id: action.id,
        p_success: result.success,
        p_result: result.details || {},
        p_error: result.success ? null : result.message,
      });

      if (result.success) {
        succeeded++;
        console.log(`Action ${action.action_type} for lead ${action.lead_id}: Success`);
      } else {
        failed++;
        console.log(`Action ${action.action_type} for lead ${action.lead_id}: Failed - ${result.message}`);
      }

      await supabase
        .from("crm_leads")
        .update({
          last_automation_at: new Date().toISOString(),
          automation_count: (await getLeadAutomationCount(supabase, action.lead_id)) + 1,
          last_automation_result: result.success ? "success" : "failed",
        })
        .eq("id", action.lead_id);
    } catch (err) {
      failed++;
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      console.error(`Error executing action ${action.id}:`, errorMsg);

      await supabase.rpc("complete_pipeline_action", {
        p_action_id: action.id,
        p_success: false,
        p_result: {},
        p_error: errorMsg,
      });

      results.push({ success: false, message: errorMsg });
    }
  }

  return { processed: pendingActions.length, succeeded, failed, details: results };
}

async function getLeadAutomationCount(
  supabase: ReturnType<typeof createClient>,
  leadId: string
): Promise<number> {
  const { data } = await supabase
    .from("crm_leads")
    .select("automation_count")
    .eq("id", leadId)
    .maybeSingle();

  return data?.automation_count || 0;
}

async function executeSingleAction(
  supabase: ReturnType<typeof createClient>,
  actionId: string
): Promise<ActionResult> {
  const { data: action } = await supabase
    .from("pipeline_action_queue")
    .select(`
      *,
      crm_leads (
        id, email, phone, first_name, last_name, company_name, city, status
      )
    `)
    .eq("id", actionId)
    .maybeSingle();

  if (!action) {
    return { success: false, message: "Action not found" };
  }

  const pendingAction: PendingAction = {
    id: action.id,
    lead_id: action.lead_id,
    action_type: action.action_type,
    action_params: action.action_params || {},
    from_status: action.from_status,
    to_status: action.to_status,
    priority: action.priority,
    lead_email: action.crm_leads?.email || "",
    lead_phone: action.crm_leads?.phone || "",
    lead_first_name: action.crm_leads?.first_name || "",
    lead_last_name: action.crm_leads?.last_name || "",
    lead_full_name:
      `${action.crm_leads?.first_name || ""} ${action.crm_leads?.last_name || ""}`.trim() ||
      action.crm_leads?.email ||
      "",
  };

  return await executeAction(supabase, pendingAction);
}

async function executeAction(
  supabase: ReturnType<typeof createClient>,
  action: PendingAction
): Promise<ActionResult> {
  const actionType = action.action_type;
  const params = action.action_params || {};

  console.log(`Executing: ${actionType} for ${action.lead_full_name} (${action.lead_email})`);

  switch (actionType) {
    case "send_welcome_email":
      return await sendEmail(supabase, action, {
        template: "welcome_new_lead",
        subject: `Bienvenue ${action.lead_first_name || ""} ! Votre demande de devis taxi`,
        ...params,
      });

    case "send_documents_request":
      return await sendEmail(supabase, action, {
        template: "request_documents",
        subject: "Documents requis pour votre devis d'assurance taxi",
        ...params,
      });

    case "send_quote_email":
      return await sendEmail(supabase, action, {
        template: "quote_sent",
        subject: "Votre devis d'assurance taxi personnalise",
        ...params,
      });

    case "send_signature_request":
      return await sendSignatureRequest(supabase, action, params);

    case "send_followup":
      return await sendEmail(supabase, action, {
        template: "followup_no_response",
        subject: `${action.lead_first_name || ""}, votre devis vous attend !`,
        urgency: "high",
        ...params,
      });

    case "send_recontact_email":
      return await sendEmail(supabase, action, {
        template: "recontact_win_back",
        subject: "Nouvelles offres exclusives pour votre assurance taxi",
        ...params,
      });

    case "send_contract_confirmation":
      return await sendContractConfirmation(supabase, action, params);

    case "create_payment_link":
      return await createPaymentLink(supabase, action, params);

    case "send_payment_instructions":
      return await sendEmail(supabase, action, {
        template: "payment_instructions",
        subject: "Instructions de paiement - Votre assurance taxi",
        ...params,
      });

    case "notify_commercial":
      return await notifyCommercial(supabase, action, params);

    case "update_last_contact":
      return await updateLastContact(supabase, action);

    case "schedule_followup":
      return await scheduleFollowup(supabase, action, params);

    case "notify_signature_received":
      return await notifySignatureReceived(supabase, action);

    case "create_sinister_file":
      return await createSinisterFile(supabase, action, params);

    default:
      console.log(`Unknown action type: ${actionType}`);
      return { success: false, message: `Unknown action type: ${actionType}` };
  }
}

async function sendEmail(
  supabase: ReturnType<typeof createClient>,
  action: PendingAction,
  params: Record<string, unknown>
): Promise<ActionResult> {
  if (!BREVO_API_KEY) {
    const { data, error } = await supabase.functions.invoke("send-email-ionos", {
      body: {
        to: action.lead_email,
        subject: params.subject as string,
        template: params.template as string,
        lead_id: action.lead_id,
        lead_name: action.lead_full_name,
        lead_first_name: action.lead_first_name,
        variables: {
          first_name: action.lead_first_name || "Cher client",
          full_name: action.lead_full_name,
          from_status: action.from_status,
          to_status: action.to_status,
        },
      },
    });

    if (error) {
      return { success: false, message: error.message };
    }

    return {
      success: true,
      message: `Email sent via IONOS to ${action.lead_email}`,
      details: { provider: "ionos", template: params.template },
    };
  }

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: "TaxiAssur", email: "contact@taxiassur.fr" },
        to: [{ email: action.lead_email, name: action.lead_full_name }],
        subject: params.subject,
        htmlContent: generateEmailContent(action, params),
        tags: [params.template as string, "pipeline_automation"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, message: `Brevo API error: ${errorText}` };
    }

    const result = await response.json();

    await supabase.from("email_messages").insert({
      lead_id: action.lead_id,
      subject: params.subject as string,
      from_email: "contact@taxiassur.fr",
      to_email: action.lead_email,
      direction: "outbound",
      status: "sent",
      provider: "brevo",
      message_id: result.messageId,
      metadata: { template: params.template, pipeline_action: action.action_type },
    });

    return {
      success: true,
      message: `Email sent to ${action.lead_email}`,
      details: { messageId: result.messageId, provider: "brevo" },
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Email send error",
    };
  }
}

function generateEmailContent(action: PendingAction, params: Record<string, unknown>): string {
  const template = params.template as string;
  const firstName = action.lead_first_name || "Cher client";

  const templates: Record<string, string> = {
    welcome_new_lead: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f59e0b;">Bienvenue chez TaxiAssur !</h2>
        <p>Bonjour ${firstName},</p>
        <p>Nous avons bien recu votre demande de devis pour votre assurance taxi.</p>
        <p>Un conseiller expert va etudier votre dossier et vous recontactera sous 24h avec une offre personnalisee.</p>
        <p><strong>En attendant :</strong></p>
        <ul>
          <li>Preparez vos documents : carte professionnelle, permis, carte grise</li>
          <li>Notez vos questions pour votre conseiller</li>
        </ul>
        <p>A tres bientot,<br>L'equipe TaxiAssur</p>
        <p style="font-size: 12px; color: #666;">Tel: 01 80 85 57 86</p>
      </div>
    `,
    request_documents: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f59e0b;">Documents requis pour votre devis</h2>
        <p>Bonjour ${firstName},</p>
        <p>Pour finaliser votre devis d'assurance taxi, nous avons besoin des documents suivants :</p>
        <ul>
          <li>Carte professionnelle taxi ou carte VTC</li>
          <li>Permis de conduire recto/verso</li>
          <li>Carte grise du vehicule</li>
          <li>Releve d'information de votre ancien assureur</li>
          <li>Piece d'identite</li>
        </ul>
        <p>Vous pouvez les envoyer directement par email ou les deposer dans votre espace personnel.</p>
        <p>Cordialement,<br>L'equipe TaxiAssur</p>
      </div>
    `,
    quote_sent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f59e0b;">Votre devis personnalise est pret !</h2>
        <p>Bonjour ${firstName},</p>
        <p>Excellente nouvelle ! Votre devis d'assurance taxi est pret.</p>
        <p>Nous avons compare 5 compagnies pour vous proposer le meilleur tarif.</p>
        <p><strong>Prochaine etape :</strong> Un conseiller vous contactera pour vous presenter les details de l'offre.</p>
        <p>Si vous souhaitez accelerer le processus, appelez-nous au <strong>01 80 85 57 86</strong>.</p>
        <p>Cordialement,<br>L'equipe TaxiAssur</p>
      </div>
    `,
    followup_no_response: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f59e0b;">${firstName}, votre devis vous attend !</h2>
        <p>Bonjour ${firstName},</p>
        <p>Nous n'avons pas eu de nouvelles de votre part concernant votre devis d'assurance taxi.</p>
        <p>Avez-vous des questions ? Notre equipe est la pour vous accompagner.</p>
        <p>Appelez-nous : <strong>01 80 85 57 86</strong></p>
        <p>Votre devis reste valable pendant 30 jours.</p>
        <p>A bientot,<br>L'equipe TaxiAssur</p>
      </div>
    `,
    recontact_win_back: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f59e0b;">Des nouvelles offres pour vous !</h2>
        <p>Bonjour ${firstName},</p>
        <p>Il y a quelque temps, vous aviez manifeste de l'interet pour nos assurances taxi.</p>
        <p>Depuis, nous avons negocie de nouveaux tarifs avantageux avec nos partenaires.</p>
        <p><strong>Offre speciale :</strong> Demandez un nouveau devis et beneficiez de -10% sur votre premiere annee.</p>
        <p>Contactez-nous au <strong>01 80 85 57 86</strong> ou repondez a cet email.</p>
        <p>Cordialement,<br>L'equipe TaxiAssur</p>
      </div>
    `,
  };

  return templates[template] || templates.welcome_new_lead;
}

async function sendSignatureRequest(
  supabase: ReturnType<typeof createClient>,
  action: PendingAction,
  params: Record<string, unknown>
): Promise<ActionResult> {
  const accessToken = generateAccessToken();

  await supabase
    .from("crm_leads")
    .update({ access_token: accessToken })
    .eq("id", action.lead_id);

  const signatureUrl = `https://taxiassur.fr/espace-prospect?token=${accessToken}&action=sign`;

  await sendEmail(supabase, action, {
    template: "signature_request",
    subject: "Signez votre contrat d'assurance taxi en ligne",
    content: `Cliquez ici pour signer: ${signatureUrl}`,
    ...params,
  });

  return {
    success: true,
    message: "Signature request sent",
    details: { signatureUrl },
  };
}

async function sendContractConfirmation(
  supabase: ReturnType<typeof createClient>,
  action: PendingAction,
  params: Record<string, unknown>
): Promise<ActionResult> {
  await supabase
    .from("crm_leads")
    .update({
      converted_to_client: true,
      converted_at: new Date().toISOString(),
    })
    .eq("id", action.lead_id);

  await sendEmail(supabase, action, {
    template: "contract_active",
    subject: "Felicitations ! Votre contrat d'assurance taxi est actif",
    ...params,
  });

  return {
    success: true,
    message: "Contract confirmation sent, lead converted to client",
    details: { converted: true },
  };
}

async function createPaymentLink(
  supabase: ReturnType<typeof createClient>,
  action: PendingAction,
  params: Record<string, unknown>
): Promise<ActionResult> {
  const { data, error } = await supabase.functions.invoke("create-cic-payment-link", {
    body: {
      lead_id: action.lead_id,
      type: params.type || "down_payment",
      email: action.lead_email,
      name: action.lead_full_name,
    },
  });

  if (error) {
    return { success: false, message: error.message };
  }

  return {
    success: true,
    message: "Payment link created",
    details: { paymentUrl: data?.payment_url },
  };
}

async function notifyCommercial(
  supabase: ReturnType<typeof createClient>,
  action: PendingAction,
  params: Record<string, unknown>
): Promise<ActionResult> {
  const { data: lead } = await supabase
    .from("crm_leads")
    .select("assigned_to")
    .eq("id", action.lead_id)
    .maybeSingle();

  if (lead?.assigned_to) {
    await supabase.from("crm_event_notifications").insert({
      user_id: lead.assigned_to,
      lead_id: action.lead_id,
      event_type: "pipeline_action",
      title: params.message as string || "Action requise",
      message: `Lead ${action.lead_full_name} - ${action.to_status}`,
      priority: "high",
      read: false,
    });
  }

  return {
    success: true,
    message: "Commercial notified",
    details: { assignedTo: lead?.assigned_to },
  };
}

async function updateLastContact(
  supabase: ReturnType<typeof createClient>,
  action: PendingAction
): Promise<ActionResult> {
  await supabase
    .from("crm_leads")
    .update({ last_contact_at: new Date().toISOString() })
    .eq("id", action.lead_id);

  return { success: true, message: "Last contact updated" };
}

async function scheduleFollowup(
  supabase: ReturnType<typeof createClient>,
  action: PendingAction,
  params: Record<string, unknown>
): Promise<ActionResult> {
  const delayHours = (params.delay_hours as number) || 48;
  const followupDate = new Date(Date.now() + delayHours * 60 * 60 * 1000);

  await supabase
    .from("crm_leads")
    .update({ next_followup_at: followupDate.toISOString() })
    .eq("id", action.lead_id);

  await supabase.rpc("queue_pipeline_action", {
    p_lead_id: action.lead_id,
    p_action_type: params.action as string || "send_followup",
    p_action_params: {},
    p_from_status: action.to_status,
    p_to_status: action.to_status,
    p_triggered_by: "scheduled",
    p_priority: 7,
    p_delay_minutes: delayHours * 60,
  });

  return {
    success: true,
    message: `Followup scheduled for ${followupDate.toISOString()}`,
    details: { scheduledAt: followupDate.toISOString() },
  };
}

async function notifySignatureReceived(
  supabase: ReturnType<typeof createClient>,
  action: PendingAction
): Promise<ActionResult> {
  const { data: lead } = await supabase
    .from("crm_leads")
    .select("assigned_to")
    .eq("id", action.lead_id)
    .maybeSingle();

  if (lead?.assigned_to) {
    await supabase.from("crm_event_notifications").insert({
      user_id: lead.assigned_to,
      lead_id: action.lead_id,
      event_type: "signature_received",
      title: "Signature recue !",
      message: `${action.lead_full_name} a signe son contrat`,
      priority: "critical",
      read: false,
    });
  }

  return { success: true, message: "Signature notification sent" };
}

async function createSinisterFile(
  supabase: ReturnType<typeof createClient>,
  action: PendingAction,
  params: Record<string, unknown>
): Promise<ActionResult> {
  const { data: claim, error } = await supabase
    .from("crm_claims")
    .insert({
      lead_id: action.lead_id,
      claim_type: "sinistre",
      status: "new",
      priority: params.priority as string || "high",
      description: "Dossier sinistre ouvert automatiquement",
    })
    .select()
    .single();

  if (error) {
    return { success: false, message: error.message };
  }

  if (params.notify_team) {
    await supabase.from("crm_event_notifications").insert({
      event_type: "sinister_declared",
      title: "Nouveau sinistre declare",
      message: `${action.lead_full_name} a declare un sinistre`,
      priority: "critical",
      read: false,
    });
  }

  return {
    success: true,
    message: "Sinister file created",
    details: { claimId: claim?.id },
  };
}

function generateAccessToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}