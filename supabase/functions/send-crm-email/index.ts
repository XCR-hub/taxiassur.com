import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { claimDelivery, finishDelivery } from '../_shared/delivery-idempotency.ts';

type DynamicSupabaseClient = ReturnType<typeof createClient<any>>;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface Attachment {
  filename: string;
  reference_id?: string;
  path?: string;     // Pour documents légaux (chemin local)
  url?: string;      // Pour documents lead/custom (URL publique)
  bucket?: 'prospect-documents' | 'crm-documents' | 'email-attachments';
  type: 'legal' | 'lead_document' | 'custom';
}


const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const MAX_TOTAL_ATTACHMENT_BYTES = 20 * 1024 * 1024;
const allowedBuckets = new Set(["prospect-documents", "crm-documents", "email-attachments"]);

function safeAttachmentName(value: unknown): string {
  return String(value || "document").replace(/[\r\n"\\/]/g, "_").slice(0, 120) || "document";
}

async function readLimitedResponse(response: Response): Promise<Uint8Array> {
  if (!response.ok || !response.body) throw new Error("AttachmentUnavailable");
  if (Number(response.headers.get("content-length") || 0) > MAX_ATTACHMENT_BYTES) throw new Error("AttachmentTooLarge");
  const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
  while (true) {
    const { done, value } = await reader.read(); if (done) break; size += value.byteLength;
    if (size > MAX_ATTACHMENT_BYTES) { await reader.cancel(); throw new Error("AttachmentTooLarge"); } chunks.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; } return bytes;
}

async function downloadAllowedUrl(rawUrl: string, supabaseUrl: string): Promise<Uint8Array> {
  const url = new URL(rawUrl, "https://taxiassur.com");
  const supabaseHost = new URL(supabaseUrl).hostname.toLowerCase();
  const allowedHosts = new Set([supabaseHost, "taxiassur.com", "www.taxiassur.com", "taxiassur.fr", "www.taxiassur.fr"]);
  if (url.protocol !== "https:" || !allowedHosts.has(url.hostname.toLowerCase()) || url.username || url.password) throw new Error("UntrustedAttachmentUrl");
  return await readLimitedResponse(await fetch(url, { redirect: "error", signal: AbortSignal.timeout(15000) }));
}

async function validateAttachmentOwnership(
  supabase: DynamicSupabaseClient, leadId: string, attachment: Attachment,
): Promise<void> {
  const cleanPath = attachment.path?.replace(/^\/+/, "");
  if (attachment.bucket === "email-attachments") {
    if (!cleanPath?.startsWith(`${leadId}/`)) throw new Error("AttachmentOwnershipMismatch"); return;
  }
  if (attachment.bucket === "prospect-documents" || attachment.bucket === "crm-documents") {
    const table = attachment.bucket === "prospect-documents" ? "prospect_documents" : "crm_lead_documents";
    const { data, error } = await supabase.from(table).select("id").eq("lead_id", leadId).eq("file_path", cleanPath || "").maybeSingle();
    if (error || !data) throw new Error("AttachmentOwnershipMismatch"); return;
  }
  if (attachment.url && attachment.reference_id?.startsWith("quote-")) {
    const id = attachment.reference_id.slice(6); const { data } = await supabase.from("lead_company_quotes").select("quote_file_url").eq("id", id).eq("lead_id", leadId).maybeSingle();
    if (!data || data.quote_file_url !== attachment.url) throw new Error("AttachmentOwnershipMismatch"); return;
  }
  if (attachment.url && attachment.reference_id?.startsWith("contract-")) {
    const id = attachment.reference_id.slice(9); const { data } = await supabase.from("lead_contracts").select("contract_file_url").eq("id", id).eq("lead_id", leadId).maybeSingle();
    if (!data || data.contract_file_url !== attachment.url) throw new Error("AttachmentOwnershipMismatch"); return;
  }
  if (attachment.type !== "legal") throw new Error("AttachmentOwnershipMismatch");
}

async function resolveAttachment(
  supabase: DynamicSupabaseClient, supabaseUrl: string, attachment: Attachment,
): Promise<Uint8Array> {
  if (attachment.bucket && attachment.path) {
    if (!allowedBuckets.has(attachment.bucket) || attachment.path.split("/").includes("..")) throw new Error("InvalidAttachmentPath");
    const { data, error } = await supabase.storage.from(attachment.bucket).download(attachment.path.replace(/^\/+/, ""));
    if (error || !data || data.size > MAX_ATTACHMENT_BYTES) throw new Error("AttachmentUnavailable");
    return new Uint8Array(await data.arrayBuffer());
  }
  if (attachment.type === "legal" && attachment.path?.startsWith("/documents/")) return await downloadAllowedUrl(attachment.path, supabaseUrl);
  if (attachment.url) return await downloadAllowedUrl(attachment.url, supabaseUrl);
  throw new Error("MissingAttachmentSource");
}

async function sendEmailBrevo(
  supabase: DynamicSupabaseClient,
  supabaseUrl: string,
  to: string,
  subject: string,
  htmlBody: string,
  attachments: Attachment[] = []
): Promise<void> {
  const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");

  if (!BREVO_API_KEY) {
    throw new Error("BREVO_API_KEY not configured");
  }

  if (attachments.length > 10) throw new Error("TooManyAttachments");
  const brevoAttachments: Array<{ name: string; content: string }> = [];
  let totalBytes = 0;
  for (const attachment of attachments) {
    const fileContent = await resolveAttachment(supabase, supabaseUrl, attachment);
    totalBytes += fileContent.byteLength; if (totalBytes > MAX_TOTAL_ATTACHMENT_BYTES) throw new Error("AttachmentsTooLarge");
    let binary = ""; for (let index = 0; index < fileContent.length; index += 0x8000) binary += String.fromCharCode(...fileContent.subarray(index, Math.min(index + 0x8000, fileContent.length)));
    brevoAttachments.push({ name: safeAttachmentName(attachment.filename), content: btoa(binary) });
  }

  // Construire le payload Brevo
  const payload = {
    sender: {
      name: "TaxiAssur",
      email: "team@taxiassur.com"
    },
    to: [{ email: to }],
    subject: subject,
    htmlContent: htmlBody,
    ...(brevoAttachments.length > 0 && { attachment: brevoAttachments })
  };

  console.log(`📤 Sending email via Brevo with ${brevoAttachments.length} attachments`);

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    signal: AbortSignal.timeout(15000),
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "api-key": BREVO_API_KEY
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) throw new Error("BrevoRejected");
}

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function addLinkTracking(html: string, trackingId: string, supabaseUrl: string): string {
  const urlRegex = /href="([^"]+)"/gi;
  return html.replace(urlRegex, (match, url) => {
    let target: URL;
    try { target = new URL(url); } catch { return match; }
    if (!["https:", "http:"].includes(target.protocol)) return match;
    const trackedUrl = `${supabaseUrl}/functions/v1/track-email-click?id=${trackingId}&url=${encodeURIComponent(url)}`;
    return `href="${trackedUrl}"`;
  });
}

function addTrackingPixel(html: string, trackingId: string, supabaseUrl: string): string {
  const pixelUrl = `${supabaseUrl}/functions/v1/track-email-open?id=${trackingId}`;
  const pixel = `<img src="${pixelUrl}" width="1" height="1" style="display:none;" alt="" />`;
  if (html.includes('</body>')) {
    return html.replace('</body>', `${pixel}</body>`);
  }
  return html + pixel;
}

function getPayloadMetadata(body: Record<string, unknown>): Record<string, unknown> {
  return body.metadata && typeof body.metadata === 'object' ? body.metadata as Record<string, unknown> : {};
}

function hasExplicitTrackingConsent(body: Record<string, unknown>): boolean {
  const metadata = getPayloadMetadata(body);
  return body.tracking_consent === true ||
    body.trackingConsent === true ||
    metadata.email_tracking_consent === true ||
    metadata.tracking_consent === true ||
    metadata.email_tracking_allowed === true;
}

function isTrackingRequested(body: Record<string, unknown>): boolean {
  return body.tracking_enabled === true || body.trackOpens === true || body.trackClicks === true;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  let deliveryAdmin: any = null;
  let deliveryRequestId: string | undefined;
  let providerCallStarted = false;
  let deliveryFinalized = false;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
    deliveryAdmin = supabase;
    let authorized = Boolean(supabaseKey && token === supabaseKey);
    if (!authorized && token && supabaseUrl && supabaseKey) {
      const { data } = await supabase.auth.getUser(token);
      const domain = data.user?.email?.toLowerCase().split("@")[1] || "";
      authorized = ["taxiassur.com", "taxiassur.fr", "xcr.fr"].includes(domain);
    }
    if (!authorized) return new Response(JSON.stringify({ success: false, error: "Authentification requise" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body: Record<string, unknown> = await req.json();

    const to_email = body.to_email || body.to;
    const to_name = body.to_name || body.name || "";
    const subject = body.subject;
    const content = body.content || body.body;
    const lead_id = body.lead_id || body.leadId;
    if (lead_id !== undefined && (typeof lead_id !== "string" || !uuidPattern.test(lead_id))) throw new Error("InvalidLeadId");
    const attachments = Array.isArray(body.attachments) ? body.attachments.filter((item): item is Attachment => Boolean(item && typeof item === "object")) : [];
    const trackingRequested = isTrackingRequested(body);
    const trackingAllowed = trackingRequested && hasExplicitTrackingConsent(body);
    const trackOpens = trackingAllowed && body.trackOpens !== false;
    const trackClicks = trackingAllowed && body.trackClicks !== false;

    if (trackingRequested && !trackingAllowed) {
      console.warn('CRM email tracking requested but disabled: missing explicit tracking consent');
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(to_email || "").trim()) || typeof subject !== "string" || typeof content !== "string" || !subject.trim() || !content.trim() || subject.length > 200 || content.length > 2_000_000) {
      const missingFields = [];
      if (!to_email) missingFields.push('to_email/to');
      if (!subject) missingFields.push('subject');
      if (!content) missingFields.push('content/body');
      throw new Error(`Champs obligatoires manquants: ${missingFields.join(', ')}`);
    }


    let emailBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            line-height: 1.6;
            background: #f3f4f6;
            padding: 20px;
            color: #1f2937;
          }
          .email-wrapper {
            max-width: 680px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
          }
          .header {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            padding: 40px 30px;
            text-align: center;
          }
          .header h1 {
            color: #ffffff !important;
            font-size: 28px;
            font-weight: 800;
            margin: 0;
          }
          .content {
            padding: 40px 30px;
            background: #ffffff;
            color: #1f2937;
          }
          .content h2 {
            color: #111827 !important;
            font-size: 24px;
            margin-bottom: 20px;
            font-weight: 700;
          }
          .message-content {
            background: #f9fafb;
            border-left: 4px solid #10b981;
            padding: 25px;
            border-radius: 8px;
            margin: 25px 0;
            color: #111827 !important;
            font-size: 16px;
            line-height: 1.8;
            white-space: pre-wrap;
          }
          .message-content p, .message-content span, .message-content div {
            color: #111827 !important;
          }
          .attachments-info {
            background: #eff6ff;
            border: 1px solid #3b82f6;
            border-radius: 8px;
            padding: 15px 20px;
            margin: 20px 0;
          }
          .attachments-info h3 {
            color: #1e40af !important;
            font-size: 16px;
            margin-bottom: 10px;
            font-weight: 700;
          }
          .attachments-info ul {
            list-style: none;
            padding: 0;
            margin: 0;
          }
          .attachments-info li {
            color: #1e40af !important;
            padding: 5px 0;
            font-size: 14px;
          }
          .attachments-info li:before {
            content: "📎 ";
            margin-right: 8px;
          }
          .cta-section {
            text-align: center;
            margin: 30px 0;
            padding: 25px;
            background: #fef3c7;
            border-radius: 12px;
          }
          .cta-section p {
            color: #78350f !important;
            font-weight: 600;
            margin-bottom: 15px;
            font-size: 16px;
          }
          .cta-button {
            background: #10b981;
            color: #ffffff !important;
            padding: 14px 32px;
            text-decoration: none;
            border-radius: 8px;
            display: inline-block;
            font-weight: 700;
            font-size: 16px;
            margin-top: 10px;
          }
          .contact-banner {
            background: #e0f2fe;
            border-radius: 12px;
            padding: 25px;
            text-align: center;
            margin: 25px 0;
          }
          .contact-banner h3 {
            color: #0c4a6e !important;
            font-size: 20px;
            margin-bottom: 12px;
            font-weight: 700;
          }
          .contact-banner p {
            color: #0c4a6e !important;
            font-weight: 600;
            font-size: 16px;
          }
          .signature {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 2px solid #e5e7eb;
          }
          .signature p {
            color: #4b5563 !important;
            font-weight: 600;
            margin: 5px 0;
          }
          .signature .team {
            color: #10b981 !important;
            font-weight: 700;
            font-size: 18px;
          }
          .footer {
            background: #1f2937;
            color: #ffffff !important;
            padding: 30px;
            text-align: center;
          }
          .footer div {
            font-size: 24px;
            font-weight: 800;
            color: #10b981 !important;
            margin-bottom: 10px;
          }
          .footer p {
            color: #d1d5db !important;
            margin: 5px 0;
          }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="header">
            <h1>🚕 TaxiAssur</h1>
          </div>

          <div class="content">
            <h2>Bonjour ${escapeHtml(to_name || "")},</h2>

            <div class="message-content">
              ${content.replace(/\n/g, '<br>')}
            </div>

            ${attachments.length > 0 ? `
              <div class="attachments-info">
                <h3>📎 Documents joints (${attachments.length})</h3>
                <ul>
                  ${attachments.map(a => `<li>${escapeHtml(a.filename)}</li>`).join('')}
                </ul>
              </div>
            ` : ''}

            <div class="cta-section">
              <p>Vous avez une question ? Nous sommes là pour vous !</p>
              <a href="mailto:team@taxiassur.com" class="cta-button">
                💬 Répondre à ce message
              </a>
            </div>

            <div class="contact-banner">
              <h3>📞 Restons en contact</h3>
              <p>📧 team@taxiassur.com | 📞 01 80 85 57 86</p>
            </div>

            <div class="signature">
              <p>Cordialement,</p>
              <p class="team">L'équipe TaxiAssur</p>
            </div>
          </div>

          <div class="footer">
            <div>🚕 TaxiAssur</div>
            <p>© 2026 TaxiAssur - Tous droits réservés</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const deliveryClaim = await claimDelivery(supabase, {
      requestId: body.requestId ?? body.request_id,
      channel: "email",
      fingerprint: JSON.stringify({
        to: String(to_email).trim().toLowerCase(), subject: subject.trim(), content,
        lead_id: lead_id || null,
        attachments: attachments.map((attachment) => ({ filename: attachment.filename, path: attachment.path || null, type: attachment.type || null })),
      }),
    });
    if (deliveryClaim?.kind === "conflict") return new Response(JSON.stringify({ success: false, error: "Identifiant de livraison invalide ou deja utilise" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (deliveryClaim?.kind === "replay") return new Response(JSON.stringify(deliveryClaim.response), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (deliveryClaim?.kind === "in_progress" || deliveryClaim?.kind === "uncertain") return new Response(JSON.stringify({ success: false, error: "Livraison deja en cours ou statut fournisseur incertain", retryable: false }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    deliveryRequestId = deliveryClaim?.kind === "claimed" ? deliveryClaim.requestId : undefined;
    const { data: emailRecord, error: emailRecordError } = await supabase
      .from('email_sends')
      .insert({
        lead_id: lead_id || null,
        email_to: to_email,
        email_from: "team@taxiassur.com",
        subject: subject,
        body_html: emailBody,
        body_text: content,
        status: 'processing',
        metadata: {
          ...getPayloadMetadata(body),
          email_tracking_allowed: trackingAllowed,
          tracking_requested: trackingRequested,
          track_opens: trackOpens,
          track_clicks: trackClicks,
          tracking_purpose: body.tracking_purpose || body.trackingPurpose || 'crm_email',
          tracking_disabled_reason: trackingRequested && !trackingAllowed ? 'missing_explicit_tracking_consent' : null
        }
      })
      .select('id, tracking_id')
      .single();

    if (emailRecordError || !emailRecord?.id) throw new Error("EmailAuditUnavailable");
    const trackingId = trackingAllowed ? emailRecord?.tracking_id : undefined;

    if (trackingId) {
      if (trackClicks) {
        emailBody = addLinkTracking(emailBody, trackingId, supabaseUrl);
      }
      if (trackOpens) {
        emailBody = addTrackingPixel(emailBody, trackingId, supabaseUrl);
      }
    }

    console.log("📤 Envoi email CRM avec tracking:", trackingId);

    // Envoyer via Brevo avec support des pièces jointes
    if (typeof lead_id === "string" && uuidPattern.test(lead_id)) {
      for (const attachment of attachments) await validateAttachmentOwnership(supabase, lead_id, attachment);
    } else if (attachments.some((attachment) => attachment.type !== "legal")) {
      throw new Error("LeadRequiredForAttachment");
    }

    try {
      providerCallStarted = true;
      await sendEmailBrevo(
        supabase,
        supabaseUrl,
        String(to_email),
        subject,
        emailBody,
        attachments
      );

      providerCallStarted = false;
    } catch (sendError) {
      const rejected = sendError instanceof Error && sendError.message === "BrevoRejected";
      await finishDelivery(supabase, deliveryRequestId, rejected ? "failed" : "uncertain", {
        error: sendError instanceof Error ? sendError.name : "unknown",
      });
      deliveryFinalized = true;
      providerCallStarted = false;
      await supabase.from('email_sends').update({ status: rejected ? 'failed' : 'delivery_uncertain' }).eq('id', emailRecord.id);
      throw sendError;
    }

    if (emailRecord?.id) {
      await supabase.from('email_sends').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', emailRecord.id);
    }

    if (lead_id) {
      await supabase.from('crm_interactions').insert({
        lead_id: lead_id,
        type: 'email',
        direction: 'outbound',
        subject: subject,
        content: content,
        to_email: to_email,
        from_email: 'team@taxiassur.com',
        metadata: {
          attachments_count: attachments.length,
          attachments_names: attachments.map(a => a.filename),
          email_tracking_allowed: trackingAllowed,
          tracking_requested: trackingRequested
        }
      });
    }

    const successPayload = { success: true, attachments_sent: attachments.length };
    await finishDelivery(supabase, deliveryRequestId, "sent", { response: successPayload });
    deliveryFinalized = true;
    return new Response(JSON.stringify(successPayload), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    if (deliveryAdmin && deliveryRequestId && !deliveryFinalized) {
      try {
        await finishDelivery(deliveryAdmin, deliveryRequestId, providerCallStarted ? "uncertain" : "failed", { error: error instanceof Error ? error.name : "unknown" });
      } catch {
        console.error("Email delivery ledger update failed");
      }
    }
    console.error("CRM email failed:", error instanceof Error ? error.name : "UnknownError");
    return new Response(
      JSON.stringify({
        success: false,
        error: "Envoi impossible"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
