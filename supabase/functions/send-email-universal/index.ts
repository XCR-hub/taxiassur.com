import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const MAX_TOTAL_ATTACHMENT_BYTES = 20 * 1024 * 1024;
const internalDomains = new Set(["taxiassur.com", "taxiassur.fr", "xcr.fr"]);
const normalizeEmails = (value: unknown): string[] => {
  const values = Array.isArray(value) ? value : [value];
  return values
    .filter((item: unknown): item is string => typeof item === "string")
    .map((item: string) => item.trim().toLowerCase())
    .filter((item: string) => emailPattern.test(item));
};

const isInternalEmail = (email: string) => internalDomains.has(email.split("@")[1]);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405);

  try {
    const payload = await req.json();
    const recipients = normalizeEmails(payload.to);
    const cc = normalizeEmails(payload.cc);
    const bcc = normalizeEmails(payload.bcc);
    const allRecipients = [...recipients, ...cc, ...bcc];

    const subject = typeof payload.subject === "string" ? payload.subject.trim() : "";
    const html = typeof payload.html === "string" ? payload.html.trim() : "";
    if (recipients.length === 0 || !subject || !html) {
      return json({ success: false, error: "to, subject et html sont requis" }, 400);
    }
    if (allRecipients.length > 50 || subject.length > 200 || html.length > 2_000_000) {
      return json({ success: false, error: "Limites d'envoi dépassées" }, 413);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authorization = req.headers.get("Authorization") || "";
    const token = authorization.replace(/^Bearer\s+/i, "");
    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: userResult } = token ? await adminClient.auth.getUser(token) : { data: { user: null } };
    const authenticatedEmail = userResult.user?.email?.toLowerCase() || "";
    const isStaff = Boolean(authenticatedEmail && isInternalEmail(authenticatedEmail));
    const isService = Boolean(serviceKey && token === serviceKey);

    if (!isStaff && !isService) {
      return json({ success: false, error: "Authentification requise" }, 401);
    }

    const requestedSender = typeof payload.from === "string" ? payload.from.trim().toLowerCase() : "";
    const senderEmail = requestedSender && emailPattern.test(requestedSender) && isInternalEmail(requestedSender)
      ? requestedSender
      : "team@taxiassur.com";

    const brevoKey = Deno.env.get("BREVO_API_KEY");
    if (!brevoKey) return json({ success: false, error: "Service e-mail indisponible" }, 503);

    const rawAttachments = Array.isArray(payload.attachments) ? payload.attachments : [];
    if (rawAttachments.length > 10) return json({ success: false, error: "Trop de pièces jointes" }, 413);
    let totalAttachmentBytes = 0;
    const attachments = rawAttachments.map((item: unknown) => {
      if (!item || typeof item !== "object") throw new Error("InvalidAttachment");
      const input = item as Record<string, unknown>;
      const name = String(input.name || "piece-jointe").replace(/[\r\n"\\/]/g, "_").slice(0, 120);
      const content = String(input.content || "").replace(/\s/g, "");
      const estimatedBytes = Math.ceil(content.length * 3 / 4);
      if (!content || !/^[A-Za-z0-9+/]*={0,2}$/.test(content) || estimatedBytes > MAX_ATTACHMENT_BYTES) throw new Error("InvalidAttachment");
      totalAttachmentBytes += estimatedBytes;
      if (totalAttachmentBytes > MAX_TOTAL_ATTACHMENT_BYTES) throw new Error("AttachmentsTooLarge");
      return { name, content };
    });
    const replyTo = typeof payload.replyTo === "string" ? payload.replyTo.trim().toLowerCase() : "";
    if (replyTo && !emailPattern.test(replyTo)) return json({ success: false, error: "Adresse de réponse invalide" }, 400);

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      signal: AbortSignal.timeout(15000),
      headers: { "api-key": brevoKey, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        sender: { email: senderEmail, name: String(payload.fromName || "TaxiAssur").replace(/[\r\n]/g, " ").slice(0, 150) },
        to: recipients.map((email: string) => ({ email, name: payload.toName || email })),
        subject,
        htmlContent: html,
        textContent: typeof payload.text === "string" ? payload.text : undefined,
        replyTo: replyTo ? { email: replyTo } : undefined,
        cc: cc.length ? cc.map((email: string) => ({ email })) : undefined,
        bcc: bcc.length ? bcc.map((email: string) => ({ email })) : undefined,
        attachment: attachments,
      }),
    });

    if (!response.ok) {
      console.error("Brevo email rejected request", response.status);
      return json({ success: false, error: "Envoi impossible" }, response.status === 429 ? 429 : 502);
    }

    if (typeof payload.lead_id === "string" && uuidPattern.test(payload.lead_id)) {
      await adminClient.from("crm_interactions").insert({
        lead_id: payload.lead_id,
        type: "email",
        direction: "outbound",
        subject,
        content: payload.text || "Email envoyé via Brevo",
        to_email: recipients.join(","),
        from_email: senderEmail,
      });
    }

    return json({ success: true, recipients: recipients.length });;
  } catch (error) {
    console.error("Universal email error", error instanceof Error ? error.name : "UnknownError");
    return json({ success: false, error: "Envoi impossible" }, 500);
  }
});
