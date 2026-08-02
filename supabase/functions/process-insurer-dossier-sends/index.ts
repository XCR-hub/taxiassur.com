import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

type JsonObject = Record<string, unknown>;

interface InsurerDossierSend {
  id: string;
  lead_id: string;
  insurance_company_id?: string | null;
  contact_id?: string | null;
  recipient_email: string;
  recipient_name?: string | null;
  company_name?: string | null;
  subject: string;
  message?: string | null;
  documents: unknown;
  status: "pending" | "processing" | "sent" | "failed" | "cancelled" | "closed" | "responded";
  send_type?: "initial" | "followup" | null;
  attempts: number;
  max_attempts?: number | null;
  followup_step?: number | null;
  scheduled_at?: string | null;
  sent_at?: string | null;
  next_followup_at?: string | null;
  metadata?: JsonObject | null;
}

interface LeadRecord {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  company_name?: string | null;
  city?: string | null;
  postal_code?: string | null;
}

interface NormalizedDocument {
  id: string;
  file_name: string;
  file_url: string;
  document_type: string;
  source: string;
  contentType: string;
}

interface ProcessResult {
  id: string;
  lead_id: string;
  recipient_email: string;
  mode: "initial" | "followup";
  status: "sent" | "retry" | "failed" | "skipped";
  attempts?: number;
  followup_step?: number;
  error?: string;
}

function jsonResponse(body: JsonObject, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function clampLimit(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value || 20);
  if (!Number.isFinite(parsed)) return 20;
  return Math.max(1, Math.min(50, Math.floor(parsed)));
}

function safeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error || "Unknown error");
  return message.slice(0, 1200);
}

function extractBearerToken(req: Request): string {
  const authHeader = req.headers.get("Authorization") || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
}

function isAuthorizedWorkerRequest(req: Request, serviceRoleKey: string): boolean {
  const bearerToken = extractBearerToken(req);
  const apiKey = req.headers.get("apikey") || req.headers.get("Apikey") || "";
  return bearerToken === serviceRoleKey || apiKey === serviceRoleKey;
}

function addDays(date: Date, days: number): string {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy.toISOString();
}

function getString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function guessContentType(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  return "application/octet-stream";
}

function normalizeDocuments(input: unknown): NormalizedDocument[] {
  const raw = Array.isArray(input) ? input : [];
  return raw
    .filter((item): item is JsonObject => typeof item === "object" && item !== null)
    .map((item, index) => {
      const fileName = getString(item.file_name, getString(item.filename, `document-${index + 1}.pdf`)).slice(0, 200);
      return {
        id: getString(item.id, `document-${index + 1}`).slice(0, 80),
        file_name: fileName,
        file_url: getString(item.file_url, getString(item.url, "")).trim(),
        document_type: getString(item.document_type, getString(item.type, "document")).slice(0, 80),
        source: getString(item.source, "crm").slice(0, 40),
        contentType: getString(item.contentType, guessContentType(fileName)).slice(0, 120),
      };
    })
    .filter((item) => item.file_url.length > 0);
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function textToHtml(value: unknown): string {
  return escapeHtml(value).replace(/\r?\n/g, "<br>");
}

function formatLeadName(lead: LeadRecord | null): string {
  const name = `${lead?.first_name || ""} ${lead?.last_name || ""}`.trim();
  return name || "Prospect TaxiAssur";
}

function buildEmailHtml(
  item: InsurerDossierSend,
  lead: LeadRecord | null,
  docs: NormalizedDocument[],
  mode: "initial" | "followup",
  nextFollowupStep: number,
): string {
  const leadName = formatLeadName(lead);
  const companyName = item.company_name || "votre compagnie";
  const title = mode === "followup"
    ? `Relance dossier devis - ${leadName}`
    : `Demande de saisie devis - ${leadName}`;
  const docList = docs
    .map((doc) => `<li style="margin:4px 0;padding:4px 0;border-bottom:1px solid #eee;">${escapeHtml(doc.file_name)} <span style="color:#666;font-size:12px;">(${escapeHtml(doc.document_type || "document")})</span></li>`)
    .join("");
  const message = item.message ? `
    <div style="background:#fffbeb;border-left:4px solid #f59e0b;padding:12px 15px;margin:15px 0;border-radius:4px;">
      <p style="color:#92400e;margin:0;font-size:14px;"><strong>Note TaxiAssur :</strong> ${textToHtml(item.message)}</p>
    </div>
  ` : "";
  const followupIntro = mode === "followup"
    ? `<p style="color:#374151;font-size:15px;"><strong>Relance ${nextFollowupStep}/2.</strong> Nous revenons vers vous concernant le dossier ci-joint, transmis pour saisie de devis.</p>`
    : `<p style="color:#374151;font-size:15px;">Veuillez trouver ci-joint le dossier complet pour saisie de devis.</p>`;
  const closing = mode === "followup"
    ? "Merci de nous confirmer la prise en charge du dossier ou de nous indiquer les informations manquantes."
    : "Merci de nous transmettre le devis une fois saisi, ou de nous indiquer rapidement si une piece complementaire est necessaire.";

  return `
    <div style="font-family:Arial,sans-serif;max-width:720px;margin:0 auto;">
      <div style="background:#1e3a5f;padding:20px 30px;border-radius:8px 8px 0 0;">
        <h2 style="color:#fff;margin:0;font-size:20px;">${escapeHtml(title)}</h2>
      </div>
      <div style="padding:25px 30px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
        <p style="color:#374151;font-size:15px;">Bonjour ${escapeHtml(item.recipient_name || companyName)},</p>
        ${followupIntro}

        <table style="width:100%;border-collapse:collapse;margin:20px 0;background:#f9fafb;border-radius:6px;overflow:hidden;">
          <tr style="background:#e5e7eb;">
            <td colspan="2" style="padding:10px 15px;font-weight:bold;color:#1f2937;">Informations prospect</td>
          </tr>
          <tr><td style="padding:8px 15px;color:#6b7280;width:150px;">Nom</td><td style="padding:8px 15px;color:#111827;font-weight:500;">${escapeHtml(leadName)}</td></tr>
          ${lead?.email ? `<tr><td style="padding:8px 15px;color:#6b7280;">Email</td><td style="padding:8px 15px;color:#111827;">${escapeHtml(lead.email)}</td></tr>` : ""}
          ${lead?.phone ? `<tr><td style="padding:8px 15px;color:#6b7280;">Telephone</td><td style="padding:8px 15px;color:#111827;">${escapeHtml(lead.phone)}</td></tr>` : ""}
          ${lead?.company_name ? `<tr><td style="padding:8px 15px;color:#6b7280;">Societe</td><td style="padding:8px 15px;color:#111827;">${escapeHtml(lead.company_name)}</td></tr>` : ""}
          ${lead?.city || lead?.postal_code ? `<tr><td style="padding:8px 15px;color:#6b7280;">Ville</td><td style="padding:8px 15px;color:#111827;">${escapeHtml(`${lead.postal_code || ""} ${lead.city || ""}`.trim())}</td></tr>` : ""}
        </table>

        ${message}

        <div style="margin:20px 0;">
          <p style="color:#374151;font-weight:bold;margin-bottom:8px;">Documents joints (${docs.length}) :</p>
          <ul style="list-style:none;padding:12px 16px;margin:0;background:#f3f4f6;border-radius:6px;">
            ${docList}
          </ul>
        </div>

        <p style="color:#374151;font-size:15px;margin-top:20px;">${escapeHtml(closing)}</p>

        <div style="margin-top:30px;padding-top:20px;border-top:1px solid #e5e7eb;">
          <p style="color:#6b7280;font-size:13px;margin:0;">
            Cordialement,<br>
            <strong style="color:#374151;">L'equipe TaxiAssur</strong><br>
            <span style="font-size:12px;">Courtier ORIAS 11 061 425</span><br>
            <span style="font-size:12px;">Tel : 01 80 85 57 88 | team@taxiassur.com</span>
          </p>
        </div>
      </div>
    </div>
  `;
}

async function callSendEmailIonos(
  supabaseUrl: string,
  serviceRoleKey: string,
  item: InsurerDossierSend,
  subject: string,
  html: string,
  docs: NormalizedDocument[],
): Promise<{ success: boolean; error?: string; response?: unknown }> {
  const response = await fetch(`${supabaseUrl}/functions/v1/send-email-ionos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({
      to: item.recipient_email,
      toName: item.recipient_name || item.company_name || item.recipient_email,
      subject,
      html,
      from: "team@taxiassur.com",
      fromName: "TaxiAssur",
      attachments: docs.map((doc) => ({
        filename: doc.file_name || "document.pdf",
        url: doc.file_url,
        contentType: doc.contentType || guessContentType(doc.file_name),
      })),
    }),
  });

  const text = await response.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch (_) {
    parsed = text;
  }

  const explicitFailure = typeof parsed === "object" && parsed !== null && (parsed as JsonObject).success === false;
  if (!response.ok || explicitFailure) {
    const parsedError = typeof parsed === "object" && parsed !== null ? (parsed as JsonObject).error : null;
    return {
      success: false,
      error: String(parsedError || `send-email-ionos returned HTTP ${response.status}`),
      response: parsed,
    };
  }

  return { success: true, response: parsed };
}

async function logInteraction(
  supabase: ReturnType<typeof createClient>,
  item: InsurerDossierSend,
  subject: string,
  content: string,
  status: string,
  metadata: JsonObject,
): Promise<void> {
  const { error } = await supabase.from("crm_interactions").insert({
    lead_id: item.lead_id,
    type: "email",
    interaction_type: "email",
    direction: "outbound",
    channel: "email",
    subject,
    content,
    body: content,
    status,
    metadata: {
      ...metadata,
      workflow: "insurer_dossier",
      insurer_dossier_send_id: item.id,
      recipient_email: item.recipient_email,
      company_name: item.company_name || null,
    },
  });

  if (error) {
    console.warn("Unable to log insurer dossier interaction", error);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
    }

    if (!isAuthorizedWorkerRequest(req, serviceRoleKey)) {
      return jsonResponse({ success: false, error: "Unauthorized" }, 401);
    }

    const payload = req.method === "GET" ? {} : await req.json().catch(() => ({}));
    const limit = clampLimit((payload as JsonObject).limit);
    const dryRun = (payload as JsonObject).dry_run === true;
    const now = new Date();
    const nowIso = now.toISOString();
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: pending, error: pendingError } = await supabase
      .from("insurer_dossier_sends")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_at", nowIso)
      .order("scheduled_at", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(limit);

    if (pendingError) throw pendingError;

    const pendingItems = (pending || []) as InsurerDossierSend[];
    const remaining = Math.max(0, limit - pendingItems.length);
    let followupItems: InsurerDossierSend[] = [];

    if (remaining > 0) {
      const { data: followups, error: followupError } = await supabase
        .from("insurer_dossier_sends")
        .select("*")
        .eq("status", "sent")
        .not("next_followup_at", "is", null)
        .lte("next_followup_at", nowIso)
        .lt("followup_step", 2)
        .order("next_followup_at", { ascending: true })
        .order("created_at", { ascending: true })
        .limit(remaining);

      if (followupError) throw followupError;
      followupItems = (followups || []) as InsurerDossierSend[];
    }

    const items = [...pendingItems, ...followupItems];
    if (dryRun) {
      return jsonResponse({
        success: true,
        dry_run: true,
        candidates: items.length,
        initial: pendingItems.length,
        followups: followupItems.length,
        items,
      });
    }

    const results: ProcessResult[] = [];

    for (const item of items) {
      const mode: "initial" | "followup" = item.status === "sent" ? "followup" : "initial";
      const previousStatus = item.status;
      const nextAttempt = (item.attempts || 0) + 1;
      const maxAttempts = Math.max(1, item.max_attempts || 3);
      const nextFollowupStep = mode === "followup" ? (item.followup_step || 0) + 1 : 0;
      const metadata = item.metadata || {};

      const { data: claimed, error: claimError } = await supabase
        .from("insurer_dossier_sends")
        .update({
          status: "processing",
          send_type: mode,
          attempts: nextAttempt,
          updated_at: new Date().toISOString(),
          last_error: null,
          metadata: {
            ...metadata,
            worker: "process-insurer-dossier-sends",
            processing_started_at: new Date().toISOString(),
            processing_mode: mode,
          },
        })
        .eq("id", item.id)
        .eq("status", previousStatus)
        .select("*")
        .maybeSingle();

      if (claimError || !claimed) {
        results.push({
          id: item.id,
          lead_id: item.lead_id,
          recipient_email: item.recipient_email,
          mode,
          status: "skipped",
          error: claimError ? safeError(claimError) : "Already claimed",
        });
        continue;
      }

      const claimedItem = claimed as InsurerDossierSend;

      try {
        const docs = normalizeDocuments(claimedItem.documents);
        if (docs.length === 0) {
          throw new Error("No usable document URL in insurer dossier send");
        }

        const { data: lead, error: leadError } = await supabase
          .from("crm_leads")
          .select("id, first_name, last_name, email, phone, company_name, city, postal_code")
          .eq("id", claimedItem.lead_id)
          .maybeSingle();

        if (leadError) throw leadError;

        const leadRecord = (lead || null) as LeadRecord | null;
        const subject = mode === "followup"
          ? `Relance ${nextFollowupStep}/2 - ${claimedItem.subject}`
          : claimedItem.subject;
        const html = buildEmailHtml(claimedItem, leadRecord, docs, mode, nextFollowupStep);
        const sendResult = await callSendEmailIonos(supabaseUrl, serviceRoleKey, claimedItem, subject, html, docs);

        if (!sendResult.success) {
          throw new Error(sendResult.error || "send-email-ionos failed");
        }

        const updatePayload: JsonObject = mode === "initial"
          ? {
              status: "sent",
              send_type: "initial",
              sent_at: new Date().toISOString(),
              processed_at: new Date().toISOString(),
              next_followup_at: addDays(new Date(), 2),
              followup_step: 0,
              updated_at: new Date().toISOString(),
              last_error: null,
              metadata: {
                ...(claimedItem.metadata || {}),
                sent_at: new Date().toISOString(),
                next_followup_policy: "J+2 then J+5 unless responded",
                send_result: sendResult.response || null,
              },
            }
          : {
              status: "sent",
              send_type: "followup",
              followup_step: nextFollowupStep,
              last_followup_at: new Date().toISOString(),
              next_followup_at: nextFollowupStep >= 2 ? null : addDays(new Date(), 3),
              updated_at: new Date().toISOString(),
              last_error: null,
              metadata: {
                ...(claimedItem.metadata || {}),
                last_followup_sent_at: new Date().toISOString(),
                last_followup_step: nextFollowupStep,
                send_result: sendResult.response || null,
              },
            };

        await supabase
          .from("insurer_dossier_sends")
          .update(updatePayload)
          .eq("id", claimedItem.id);

        await logInteraction(
          supabase,
          claimedItem,
          subject,
          mode === "followup"
            ? `Relance assureur ${nextFollowupStep}/2 envoyee a ${claimedItem.recipient_email} avec ${docs.length} document(s).`
            : `Dossier assureur envoye a ${claimedItem.recipient_email} avec ${docs.length} document(s).`,
          "sent",
          {
            mode,
            documents_count: docs.length,
            document_names: docs.map((doc) => doc.file_name),
            followup_step: mode === "followup" ? nextFollowupStep : 0,
          },
        );

        results.push({
          id: claimedItem.id,
          lead_id: claimedItem.lead_id,
          recipient_email: claimedItem.recipient_email,
          mode,
          status: "sent",
          attempts: nextAttempt,
          followup_step: mode === "followup" ? nextFollowupStep : 0,
        });
      } catch (error) {
        const errorMessage = safeError(error);
        const exhausted = nextAttempt >= maxAttempts;
        const retryAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

        await supabase
          .from("insurer_dossier_sends")
          .update({
            status: exhausted ? "failed" : previousStatus,
            scheduled_at: mode === "initial" && !exhausted ? retryAt : claimedItem.scheduled_at,
            next_followup_at: mode === "followup" && !exhausted ? retryAt : claimedItem.next_followup_at,
            updated_at: new Date().toISOString(),
            last_error: errorMessage,
            metadata: {
              ...(claimedItem.metadata || {}),
              last_failed_at: new Date().toISOString(),
              retry_after: exhausted ? null : retryAt,
              failed_mode: mode,
            },
          })
          .eq("id", claimedItem.id);

        await logInteraction(
          supabase,
          claimedItem,
          `Echec envoi dossier assureur - ${claimedItem.subject}`,
          `Echec ${mode} vers ${claimedItem.recipient_email}: ${errorMessage}`,
          "failed",
          { mode, error: errorMessage, exhausted },
        );

        results.push({
          id: claimedItem.id,
          lead_id: claimedItem.lead_id,
          recipient_email: claimedItem.recipient_email,
          mode,
          status: exhausted ? "failed" : "retry",
          attempts: nextAttempt,
          followup_step: mode === "followup" ? nextFollowupStep : 0,
          error: errorMessage,
        });
      }
    }

    return jsonResponse({
      success: true,
      processed: results.length,
      sent: results.filter((result) => result.status === "sent").length,
      retry: results.filter((result) => result.status === "retry").length,
      failed: results.filter((result) => result.status === "failed").length,
      skipped: results.filter((result) => result.status === "skipped").length,
      results,
    });
  } catch (error) {
    console.error("process-insurer-dossier-sends error", error);
    return jsonResponse({ success: false, error: safeError(error) }, 500);
  }
});
