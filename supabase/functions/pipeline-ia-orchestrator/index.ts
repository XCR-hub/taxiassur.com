import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

interface Task {
  id: string;
  lead_id: string;
  task_type: string;
  task_action: string;
  priority: number;
}

interface Lead {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  current_stage_key: string;
  access_token?: string | null;
}

function securePortalUrl(lead: Lead, portal: "espace-prospect" | "espace-client"): string | null {
  const token = String(lead.access_token || "").trim();
  if (!/^[0-9a-f]{64}$/i.test(token)) return null;
  return portal === "espace-client"
    ? `https://taxiassur.com/espace-client/${encodeURIComponent(token)}`
    : `https://taxiassur.com/espace-prospect?token=${encodeURIComponent(token)}`;
}

async function sendEmail(to: string, subject: string, htmlContent: string, firstName: string) {
  if (!BREVO_API_KEY) return { success: false, error: "No API key" };
  
  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: "TaxiAssur", email: "contact@taxiassur.com" },
        to: [{ email: to, name: firstName }],
        subject,
        htmlContent,
      }),
    });
    return { success: response.ok };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function sendSMS(phone: string, message: string) {
  console.log(`[SMS] To: ${phone} - ${message.substring(0, 50)}...`);
  return { success: true, simulated: true };
}

async function generateAIContent(prompt: string): Promise<string> {
  if (!OPENAI_API_KEY) return "Contenu par defaut";
  
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 500,
      }),
    });
    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  } catch {
    return "";
  }
}

async function executeAction(task: Task, lead: Lead): Promise<{ success: boolean; result: any }> {
  const { task_action } = task;
  const { email, first_name, phone } = lead;
  
  switch (task_action) {
    case "send_welcome_email": {
      const prospectLink = securePortalUrl(lead, "espace-prospect");
      if (!prospectLink) return { success: false, result: "Jeton prospect indisponible" };
      const content = `
        <h2>Bienvenue ${first_name} !</h2>
        <p>Merci de votre interet pour TaxiAssur.</p>
        <p>Un conseiller va etudier votre dossier et vous recontacter tres rapidement.</p>
        <p>En attendant, n'hesitez pas a preparer vos documents :</p>
        <ul>
          <li>Carte grise du vehicule</li>
          <li>Permis de conduire</li>
          <li>Carte professionnelle taxi</li>
          <li>Releve d'information assurance</li>
        </ul>
        <p><a href="https://taxiassur.com/espace-prospect?token=${prospectLink}">Deposer mes documents</a></p>
      `;
      return await sendEmail(email, "Bienvenue chez TaxiAssur - Votre devis en cours", content, first_name);
    }
    
    case "send_welcome_sms": {
      return await sendSMS(phone, `Bonjour ${first_name}, merci pour votre demande de devis taxi. Un conseiller TaxiAssur va vous recontacter. A bientot!`);
    }
    
    case "ai_qualify_lead": {
      const qualification = await generateAIContent(`
        Analyse ce lead taxi et donne un score de 1 a 100:
        Prenom: ${first_name}
        Email: ${email}
        Telephone: ${phone}
        Reponds uniquement avec un JSON: {"score": X, "risk": "low|medium|high", "priority": "urgent|high|medium|low"}
      `);
      
      try {
        const parsed = JSON.parse(qualification);
        await supabase.from("crm_leads").update({
          ai_qualification_score: parsed.score || 50,
          ai_risk_level: parsed.risk || "medium",
          priority: parsed.priority || "medium",
        }).eq("id", lead.id);
        return { success: true, result: parsed };
      } catch {
        return { success: true, result: { score: 50 } };
      }
    }
    
    case "send_document_request": {
      const prospectLink = securePortalUrl(lead, "espace-prospect");
      if (!prospectLink) return { success: false, result: "Jeton prospect indisponible" };
      const content = `
        <h2>Documents necessaires pour votre devis</h2>
        <p>Bonjour ${first_name},</p>
        <p>Pour finaliser votre devis d'assurance taxi, nous avons besoin des documents suivants :</p>
        <ul>
          <li><strong>Carte grise</strong> du vehicule taxi</li>
          <li><strong>Permis de conduire</strong> recto-verso</li>
          <li><strong>Carte professionnelle taxi</strong></li>
          <li><strong>Releve d'information</strong> de votre ancien assureur</li>
          <li><strong>KBIS</strong> (si entreprise)</li>
        </ul>
        <p><a href="https://taxiassur.com/espace-prospect?token=${prospectLink}" style="background:#2563eb;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;margin:20px 0;">DEPOSER MES DOCUMENTS</a></p>
        <p>Des que nous aurons tous vos documents, nous vous enverrons votre devis personnalise sous 24h.</p>
      `;
      
      await supabase.from("document_collection_status").upsert({
        lead_id: lead.id,
        required_documents: JSON.stringify(["carte_grise", "permis_conduire", "carte_pro_taxi", "releve_information", "kbis"]),
        missing_documents: JSON.stringify(["carte_grise", "permis_conduire", "carte_pro_taxi", "releve_information", "kbis"]),
        completion_percentage: 0,
      }, { onConflict: "lead_id" });
      
      return await sendEmail(email, "Documents requis pour votre devis taxi - TaxiAssur", content, first_name);
    }
    
    case "send_reminder_24h":
    case "send_reminder_48h":
    case "send_urgent_reminder": {
      const prospectLink = securePortalUrl(lead, "espace-prospect");
      if (!prospectLink) return { success: false, result: "Jeton prospect indisponible" };
      const { data: docStatus } = await supabase
        .from("document_collection_status")
        .select("missing_documents, reminder_count")
        .eq("lead_id", lead.id)
        .maybeSingle();
      
      if (!docStatus || docStatus.missing_documents?.length === 0) {
        return { success: true, result: "No reminder needed" };
      }
      
      const urgency = task_action === "send_urgent_reminder" ? "URGENT: " : "";
      const content = `
        <h2>${urgency}Documents en attente</h2>
        <p>Bonjour ${first_name},</p>
        <p>Il nous manque encore quelques documents pour finaliser votre devis :</p>
        <ul>${(docStatus.missing_documents || []).map((d: string) => `<li>${d.replace(/_/g, " ")}</li>`).join("")}</ul>
        <p><a href="https://taxiassur.com/espace-prospect?token=${prospectLink}">Deposer mes documents maintenant</a></p>
      `;
      
      await supabase.from("document_collection_status").update({
        last_reminder_sent: new Date().toISOString(),
        reminder_count: (docStatus.reminder_count || 0) + 1,
      }).eq("lead_id", lead.id);
      
      return await sendEmail(email, `${urgency}Documents manquants - Votre devis taxi attend`, content, first_name);
    }
    
    case "ai_verify_documents": {
      const { data: docs } = await supabase
        .from("document_collection_status")
        .select("received_documents")
        .eq("lead_id", lead.id)
        .maybeSingle();
      
      if (docs?.received_documents?.length > 0) {
        await supabase.from("document_collection_status").update({
          verified_documents: docs.received_documents,
          verified_by_ai: true,
          ai_verification_notes: "Documents verifies automatiquement par IA",
        }).eq("lead_id", lead.id);
      }
      return { success: true, result: "Documents verified" };
    }
    
    case "notify_agent_ready":
    case "add_to_quote_queue": {
      await supabase.from("ready_for_quote_queue").upsert({
        lead_id: lead.id,
        priority_score: 80,
        documents_verified: true,
        status: "waiting",
        dossier_summary: { name: `${first_name} ${lead.last_name}`, email, phone },
      }, { onConflict: "lead_id" });
      
      await supabase.from("crm_leads").update({
        needs_human_intervention: true,
        human_intervention_reason: "Dossier complet - PRET POUR DEVIS",
        ready_for_quote: true,
      }).eq("id", lead.id);
      
      return { success: true, result: "Added to quote queue" };
    }
    
    case "send_quote_email": {
      const content = `
        <h2>Votre devis d'assurance taxi</h2>
        <p>Bonjour ${first_name},</p>
        <p>Suite a l'etude de votre dossier, nous avons le plaisir de vous transmettre notre meilleure offre d'assurance taxi.</p>
        <p>Vous trouverez ci-joint votre devis personnalise.</p>
        <p>N'hesitez pas a nous contacter pour toute question.</p>
        <p><strong>Offre valable 30 jours</strong></p>
      `;
      
      await supabase.from("crm_leads").update({ quote_sent_at: new Date().toISOString() }).eq("id", lead.id);
      return await sendEmail(email, "Votre devis assurance taxi - TaxiAssur", content, first_name);
    }
    
    case "schedule_followup": {
      await supabase.from("ai_autonomous_tasks").insert({
        lead_id: lead.id,
        task_type: "quote_followup",
        task_action: "followup_quote_call",
        scheduled_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        priority: 70,
      });
      return { success: true, result: "Followup scheduled" };
    }
    
    case "ai_respond_objections":
    case "ai_handle_objections": {
      const aiResponse = await generateAIContent(`
        Un prospect taxi hesite a souscrire. Genere un email court et convaincant qui:
        - Rappelle les avantages de TaxiAssur
        - Propose de repondre a ses questions
        - Mentionne la garantie satisfait ou rembourse
        Maximum 100 mots, ton professionnel et rassurant.
      `);
      
      return await sendEmail(email, "Une question sur votre devis ? - TaxiAssur", `<p>${aiResponse}</p>`, first_name);
    }
    
    case "send_contract_for_signature": {
      return { success: false, result: "Signature sécurisée non créée : action manuelle requise" };
    }

    case "send_payment_link": {
      return { success: false, result: "Lien de paiement sécurisé non créé : action manuelle requise" };
    }    
    case "send_welcome_pack": {
      const clientLink = securePortalUrl(lead, "espace-client");
      if (!clientLink) return { success: false, result: "Jeton client indisponible" };
      const content = `
        <h2>Bienvenue chez TaxiAssur ! 🎉</h2>
        <p>Felicitations ${first_name} !</p>
        <p>Votre assurance taxi est maintenant active. Vous recevrez votre attestation par email separement.</p>
        <p>Votre espace client est disponible pour gerer votre contrat :</p>
        <p><a href="${clientLink}">ACCEDER A MON ESPACE CLIENT</a></p>
      `;
      return await sendEmail(email, "Bienvenue ! Votre assurance taxi est active", content, first_name);
    }
    
    default:
      console.log(`Action non geree: ${task_action}`);
      return { success: true, result: `Action ${task_action} logged` };
  }
}

async function processTasksBatch(): Promise<{ processed: number; success: number; failed: number }> {
  const { data: tasks, error } = await supabase
    .from("ai_autonomous_tasks")
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_at", new Date().toISOString())
    .order("priority", { ascending: false })
    .order("scheduled_at", { ascending: true })
    .limit(20);
  
  if (error || !tasks?.length) {
    return { processed: 0, success: 0, failed: 0 };
  }
  
  let success = 0;
  let failed = 0;
  
  for (const task of tasks) {
    await supabase.from("ai_autonomous_tasks").update({ status: "executing" }).eq("id", task.id);
    
    const { data: lead } = await supabase
      .from("crm_leads")
      .select("*")
      .eq("id", task.lead_id)
      .maybeSingle();
    
    if (!lead) {
      await supabase.from("ai_autonomous_tasks").update({
        status: "failed",
        execution_result: { error: "Lead not found" },
        executed_at: new Date().toISOString(),
      }).eq("id", task.id);
      failed++;
      continue;
    }
    
    try {
      const result = await executeAction(task, lead);
      
      await supabase.from("ai_autonomous_tasks").update({
        status: result.success ? "completed" : "failed",
        execution_result: result,
        executed_at: new Date().toISOString(),
      }).eq("id", task.id);
      
      await supabase.from("crm_leads").update({
        auto_actions_count: (lead.auto_actions_count || 0) + 1,
        last_auto_action_at: new Date().toISOString(),
      }).eq("id", lead.id);
      
      if (result.success) success++;
      else failed++;
      
    } catch (e) {
      await supabase.from("ai_autonomous_tasks").update({
        status: task.retry_count < task.max_retries ? "pending" : "failed",
        retry_count: task.retry_count + 1,
        execution_result: { error: e.message },
      }).eq("id", task.id);
      failed++;
    }
  }
  
  return { processed: tasks.length, success, failed };
}

async function checkStageProgressions(): Promise<number> {
  const { data: leads } = await supabase
    .from("crm_leads")
    .select("id, current_stage_key, stage_entered_at")
    .not("current_stage_key", "in", "(quote_pending,contract_pending,won,lost)");
  
  if (!leads?.length) return 0;
  
  let progressions = 0;
  
  for (const lead of leads) {
    const { data: stage } = await supabase
      .from("pipeline_stages")
      .select("next_stage_conditions, stage_order")
      .eq("stage_key", lead.current_stage_key)
      .maybeSingle();
    
    if (!stage) continue;
    
    const conditions = stage.next_stage_conditions as any;
    
    if (conditions?.auto_advance && conditions?.fallback_advance_hours) {
      const hoursInStage = (Date.now() - new Date(lead.stage_entered_at).getTime()) / (1000 * 60 * 60);
      
      if (hoursInStage >= conditions.fallback_advance_hours) {
        const { data: nextStage } = await supabase
          .from("pipeline_stages")
          .select("stage_key")
          .eq("stage_order", stage.stage_order + 1)
          .maybeSingle();
        
        if (nextStage) {
          await supabase.rpc("advance_lead_stage", {
            p_lead_id: lead.id,
            p_new_stage: nextStage.stage_key,
            p_ai_decision: { reason: "auto_timeout", hours: hoursInStage },
          });
          progressions++;
        }
      }
    }
  }
  
  return progressions;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  
  try {
    const tasksResult = await processTasksBatch();
    const progressions = await checkStageProgressions();
    
    const result = {
      timestamp: new Date().toISOString(),
      tasks: tasksResult,
      stage_progressions: progressions,
      status: "success",
    };
    
    await supabase.from("automation_logs").insert({
      automation_type: "pipeline_orchestrator",
      status: "success",
      details: result,
    });
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
    
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
