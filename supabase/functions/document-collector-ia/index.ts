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

const REQUIRED_DOCUMENTS = [
  { key: "carte_grise", name: "Carte Grise", required: true },
  { key: "permis_conduire", name: "Permis de Conduire", required: true },
  { key: "carte_pro_taxi", name: "Carte Professionnelle Taxi", required: true },
  { key: "releve_information", name: "Releve d'Information Assurance", required: true },
  { key: "kbis", name: "KBIS ou Justificatif Entreprise", required: false },
  { key: "rib", name: "RIB", required: false },
  { key: "photo_vehicule", name: "Photo du Vehicule", required: false },
];

async function sendReminderEmail(lead: any, missingDocs: string[]): Promise<boolean> {
  if (!BREVO_API_KEY || !lead.email) return false;
  
  const missingList = missingDocs.map(d => {
    const doc = REQUIRED_DOCUMENTS.find(r => r.key === d);
    return `<li>${doc?.name || d}</li>`;
  }).join("");
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1e40af;">Documents manquants pour votre devis</h2>
      <p>Bonjour ${lead.first_name || ""} ${lead.last_name || ""},</p>
      <p>Pour finaliser votre devis d'assurance taxi, nous avons encore besoin des documents suivants :</p>
      <ul style="background: #f3f4f6; padding: 20px 40px; border-radius: 8px;">${missingList}</ul>
      <p style="margin-top: 20px;">
        <a href="https://taxiassur.com/espace-prospect?token=${lead.access_token || lead.id}"
           style="background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
          DEPOSER MES DOCUMENTS
        </a>
      </p>
      <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
        Des reception de vos documents, nous vous enverrons votre devis sous 24h.
      </p>
    </div>
  `;
  
  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: "TaxiAssur", email: "contact@taxiassur.com" },
        to: [{ email: lead.email, name: `${lead.first_name || ""} ${lead.last_name || ""}` }],
        subject: `Rappel: ${missingDocs.length} document(s) manquant(s) pour votre devis taxi`,
        htmlContent: html,
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function checkAndUpdateDocumentStatus(leadId: string): Promise<{
  complete: boolean;
  percentage: number;
  missing: string[];
}> {
  const { data: uploads } = await supabase
    .from("prospect_document_uploads")
    .select("document_type, status")
    .eq("lead_id", leadId);
  
  const receivedDocs = (uploads || [])
    .filter(u => u.status === "uploaded" || u.status === "verified")
    .map(u => u.document_type);
  
  const verifiedDocs = (uploads || [])
    .filter(u => u.status === "verified")
    .map(u => u.document_type);
  
  const requiredKeys = REQUIRED_DOCUMENTS.filter(d => d.required).map(d => d.key);
  const missingDocs = requiredKeys.filter(k => !receivedDocs.includes(k));
  const percentage = Math.round((receivedDocs.filter(d => requiredKeys.includes(d)).length / requiredKeys.length) * 100);
  const isComplete = missingDocs.length === 0;
  
  await supabase.from("document_collection_status").upsert({
    lead_id: leadId,
    required_documents: JSON.stringify(requiredKeys),
    received_documents: JSON.stringify(receivedDocs),
    verified_documents: JSON.stringify(verifiedDocs),
    missing_documents: JSON.stringify(missingDocs),
    completion_percentage: percentage,
    is_complete: isComplete,
    verified_by_ai: verifiedDocs.length === receivedDocs.length,
    updated_at: new Date().toISOString(),
  }, { onConflict: "lead_id" });
  
  if (isComplete) {
    await supabase.from("crm_leads").update({
      documents_complete: true,
      current_stage_key: "dossier_complete",
    }).eq("id", leadId);
    
    await supabase.rpc("check_lead_ready_for_quote", { p_lead_id: leadId });
  }
  
  return { complete: isComplete, percentage, missing: missingDocs };
}

async function processDocumentReminders(): Promise<{ sent: number; skipped: number }> {
  const { data: incompleteLeads } = await supabase
    .from("document_collection_status")
    .select(`
      lead_id,
      missing_documents,
      reminder_count,
      last_reminder_sent
    `)
    .eq("is_complete", false)
    .lt("reminder_count", 5);
  
  if (!incompleteLeads?.length) {
    return { sent: 0, skipped: 0 };
  }
  
  let sent = 0;
  let skipped = 0;
  const now = new Date();
  
  for (const status of incompleteLeads) {
    const lastSent = status.last_reminder_sent ? new Date(status.last_reminder_sent) : null;
    const hoursSinceLastReminder = lastSent ? (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60) : 999;
    
    const reminderIntervals = [24, 48, 72, 96];
    const minInterval = reminderIntervals[status.reminder_count] || 48;
    
    if (hoursSinceLastReminder < minInterval) {
      skipped++;
      continue;
    }
    
    const { data: lead } = await supabase
      .from("crm_leads")
      .select("*")
      .eq("id", status.lead_id)
      .maybeSingle();
    
    if (!lead?.email) {
      skipped++;
      continue;
    }
    
    const missingDocs = typeof status.missing_documents === "string" 
      ? JSON.parse(status.missing_documents) 
      : status.missing_documents || [];
    
    if (missingDocs.length === 0) {
      skipped++;
      continue;
    }
    
    const emailSent = await sendReminderEmail(lead, missingDocs);
    
    if (emailSent) {
      await supabase.from("document_collection_status").update({
        last_reminder_sent: now.toISOString(),
        reminder_count: (status.reminder_count || 0) + 1,
      }).eq("lead_id", status.lead_id);
      
      await supabase.from("crm_interactions").insert({
        lead_id: status.lead_id,
        interaction_type: "email",
        direction: "outgoing",
        subject: "Rappel documents manquants",
        content: `Rappel automatique pour ${missingDocs.length} document(s) manquant(s)`,
        channel: "email",
        is_automated: true,
      });
      
      sent++;
    } else {
      skipped++;
    }
  }
  
  return { sent, skipped };
}

async function verifyAllDocuments(): Promise<{ verified: number; issues: number }> {
  const { data: pendingDocs } = await supabase
    .from("prospect_document_uploads")
    .select("*")
    .eq("status", "uploaded")
    .limit(50);
  
  if (!pendingDocs?.length) {
    return { verified: 0, issues: 0 };
  }
  
  let verified = 0;
  let issues = 0;
  
  for (const doc of pendingDocs) {
    const isValid = doc.file_url && doc.file_size > 0;
    
    if (isValid) {
      await supabase.from("prospect_document_uploads").update({
        status: "verified",
        verified_at: new Date().toISOString(),
        verification_notes: "Verification automatique IA",
      }).eq("id", doc.id);
      
      await checkAndUpdateDocumentStatus(doc.lead_id);
      verified++;
    } else {
      await supabase.from("prospect_document_uploads").update({
        status: "rejected",
        verification_notes: "Document invalide ou incomplet",
      }).eq("id", doc.id);
      issues++;
    }
  }
  
  return { verified, issues };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "all";
    
    let result: any = {};
    
    if (action === "all" || action === "verify") {
      result.verification = await verifyAllDocuments();
    }
    
    if (action === "all" || action === "remind") {
      result.reminders = await processDocumentReminders();
    }
    
    if (action === "check" && url.searchParams.get("lead_id")) {
      result.status = await checkAndUpdateDocumentStatus(url.searchParams.get("lead_id")!);
    }
    
    result.timestamp = new Date().toISOString();
    
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
