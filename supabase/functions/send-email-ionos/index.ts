import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AttachmentInput {
  filename: string;
  url?: string;
  content?: string; // base64
  contentType?: string;
}

interface AttachmentResolved {
  filename: string;
  base64: string;
  contentType: string;
}

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const MAX_TOTAL_ATTACHMENT_BYTES = 20 * 1024 * 1024;
const allowedAttachmentTypes = new Set([
  "application/pdf", "image/jpeg", "image/png", "image/webp", "text/plain",
  "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);
function safeAttachmentName(value: unknown): string {
  return String(value || "document").replace(/[\r\n"\\/]/g, "_").replace(/[^\p{L}\p{N}._ -]/gu, "_").slice(0, 120) || "document";
}
function normalizeAttachmentType(value: unknown): string | null {
  const type = String(value || "").split(";")[0].trim().toLowerCase();
  return allowedAttachmentTypes.has(type) ? type : null;
}
async function fetchAttachment(att: AttachmentInput, allowedHosts: Set<string>): Promise<AttachmentResolved> {
  const filename = safeAttachmentName(att.filename);
  const declaredType = normalizeAttachmentType(att.contentType);
  if (att.content) {
    const compact = att.content.replace(/\s/g, "");
    if (!declaredType || !/^[A-Za-z0-9+/]*={0,2}$/.test(compact) || Math.ceil(compact.length * 3 / 4) > MAX_ATTACHMENT_BYTES) {
      throw new Error("InvalidAttachmentContent");
    }
    return { filename, base64: compact, contentType: declaredType };
  }
  if (!att.url) throw new Error("MissingAttachmentSource");
  let url: URL;
  try { url = new URL(att.url); } catch { throw new Error("InvalidAttachmentUrl"); }
  if (url.protocol !== "https:" || !allowedHosts.has(url.hostname.toLowerCase()) || url.username || url.password) {
    throw new Error("UntrustedAttachmentUrl");
  }
  const response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(15000) });
  if (!response.ok || !response.body) throw new Error("AttachmentFetchError");
  const contentLength = Number(response.headers.get("content-length") || "0");
  if (contentLength > MAX_ATTACHMENT_BYTES) throw new Error("AttachmentTooLarge");
  const contentType = normalizeAttachmentType(response.headers.get("content-type") || declaredType);
  if (!contentType) throw new Error("InvalidAttachmentType");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_ATTACHMENT_BYTES) { await reader.cancel(); throw new Error("AttachmentTooLarge"); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, Math.min(index + 0x8000, bytes.length)));
  }
  return { filename, base64: btoa(binary), contentType };
}
function chunkBase64(b64: string, size = 76): string {
  const lines: string[] = [];
  for (let i = 0; i < b64.length; i += size) lines.push(b64.substring(i, i + size));
  return lines.join("\r\n");
}

function safeHeader(value: unknown, fallback = ""): string {
  return String(value || fallback).replace(/[\r\n"]/g, " ").trim().slice(0, 150);
}

function buildMimeMessage(
  fromName: string,
  fromEmail: string,
  toName: string,
  to: string,
  subject: string,
  htmlBody: string,
  attachments: AttachmentResolved[]
): string {
  fromName = safeHeader(fromName, "TaxiAssur");
  toName = safeHeader(toName, to);
  const encodedSubject = `=?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;

  if (attachments.length === 0) {
    return [
      `From: ${fromName} <${fromEmail}>`,
      `To: ${toName} <${to}>`,
      `Subject: ${encodedSubject}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: 8bit`,
      ``,
      htmlBody,
    ].join("\r\n");
  }

  const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const parts: string[] = [
    `From: ${fromName} <${fromEmail}>`,
    `To: ${toName} <${to}>`,
    `Subject: ${encodedSubject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: 8bit`,
    ``,
    htmlBody,
    ``,
  ];

  for (const att of attachments) {
    parts.push(`--${boundary}`);
    parts.push(`Content-Type: ${att.contentType}; name="${att.filename}"`);
    parts.push(`Content-Disposition: attachment; filename="${att.filename}"`);
    parts.push(`Content-Transfer-Encoding: base64`);
    parts.push(``);
    parts.push(chunkBase64(att.base64));
    parts.push(``);
  }

  parts.push(`--${boundary}--`);
  return parts.join("\r\n");
}

async function sendEmailSMTP(
  to: string,
  toName: string,
  subject: string,
  htmlBody: string,
  fromName = "TaxiAssur",
  attachments: AttachmentResolved[] = []
): Promise<void> {
  const SMTP_HOST = Deno.env.get("SMTP_HOST") || Deno.env.get("HMAIL_SMTP_HOST") || Deno.env.get("IONOS_SMTP_HOST") || "mail.xcr.fr";
  const SMTP_PORT = parseInt(Deno.env.get("SMTP_PORT") || Deno.env.get("HMAIL_SMTP_PORT") || Deno.env.get("IONOS_SMTP_PORT") || "587");
  const SMTP_USER = Deno.env.get("SMTP_USER") || Deno.env.get("HMAIL_SMTP_USER") || Deno.env.get("IONOS_EMAIL_USER") || "tcerda@xcr.fr";
  const SMTP_PASS = Deno.env.get("SMTP_PASS") || Deno.env.get("HMAIL_SMTP_PASS") || Deno.env.get("IONOS_EMAIL_PASSWORD") || Deno.env.get("IONOS_SMTP_PASSWORD");
  const SMTP_SECURITY = (Deno.env.get("SMTP_SECURITY") || Deno.env.get("HMAIL_SMTP_SECURITY") || Deno.env.get("IONOS_SMTP_SECURITY") || (SMTP_PORT === 465 ? "ssl" : "starttls")).toLowerCase();
  const SENDER_EMAIL = Deno.env.get("FROM_EMAIL") || Deno.env.get("HMAIL_FROM_EMAIL") || SMTP_USER;

  console.log(`[hMail] SMTP ${SMTP_HOST}:${SMTP_PORT} security=${SMTP_SECURITY} attachments=${attachments.length}`);

  if (!SMTP_PASS) throw new Error("SMTP_PASS not configured");

  let conn: Deno.TcpConn | Deno.TlsConn = SMTP_SECURITY === "ssl"
    ? await Deno.connectTls({ hostname: SMTP_HOST, port: SMTP_PORT })
    : await Deno.connect({ hostname: SMTP_HOST, port: SMTP_PORT });
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  async function readResponse(): Promise<string> {
    const buffer = new Uint8Array(4096);
    const n = await conn.read(buffer);
    if (n === null) return "";
    const response = decoder.decode(buffer.subarray(0, n));
    console.log(`[SMTP<] ${response.trim().substring(0, 200)}`);
    return response;
  }

  async function sendCommand(command: string, logSafe = true): Promise<string> {
    console.log(`[SMTP>] ${logSafe ? command.substring(0, 200) : "***"}`);
    await conn.write(encoder.encode(command + "\r\n"));
    return await readResponse();
  }

  function expect(response: string, codes: string[], step: string): void {
    if (!codes.some((code) => response.startsWith(code))) throw new Error(`SMTP_${step}`);
  }

  try {
    expect(await readResponse(), ["220"], "GREETING");
    expect(await sendCommand(`EHLO taxiassur.com`), ["250"], "EHLO");
    if (SMTP_SECURITY === "starttls" || SMTP_SECURITY === "tls") {
      const startTlsResponse = await sendCommand("STARTTLS");
      if (!startTlsResponse.startsWith("220")) throw new Error("SMTP STARTTLS failed");
      conn = await Deno.startTls(conn as Deno.TcpConn, { hostname: SMTP_HOST });
      expect(await sendCommand(`EHLO taxiassur.com`), ["250"], "EHLO_TLS");
    }
    expect(await sendCommand("AUTH LOGIN"), ["334"], "AUTH");
    expect(await sendCommand(btoa(SMTP_USER), false), ["334"], "AUTH_USER");
    expect(await sendCommand(btoa(SMTP_PASS), false), ["235"], "AUTH_PASSWORD");

    expect(await sendCommand(`MAIL FROM:<${SENDER_EMAIL}>`), ["250"], "MAIL_FROM");
    expect(await sendCommand(`RCPT TO:<${to}>`), ["250", "251"], "RCPT_TO");
    expect(await sendCommand("DATA"), ["354"], "DATA");

    const mime = buildMimeMessage(fromName, SENDER_EMAIL, toName, to, subject, htmlBody, attachments);
    // Dot-stuffing: any line starting with "." must be escaped
    const safe = mime.replace(/\r\n\./g, "\r\n..");
    expect(await sendCommand(safe + "\r\n.", false), ["250"], "MESSAGE");
    expect(await sendCommand("QUIT"), ["221"], "QUIT");
    console.log(`[SMTP] Message accepted by relay`);
    conn.close();
  } catch (error) {
    console.error(`[SMTP] Error:`, error);
    try { conn.close(); } catch { /* noop */ }
    throw error;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const authorization = req.headers.get("Authorization") || "";
    const token = authorization.replace(/^Bearer\s+/i, "");
    let authorized = Boolean(serviceKey && token === serviceKey);
    if (!authorized && token && supabaseUrl && serviceKey) {
      const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
      const { data } = await admin.auth.getUser(token);
      const domain = data.user?.email?.toLowerCase().split("@")[1] || "";
      authorized = ["taxiassur.com", "taxiassur.fr", "xcr.fr"].includes(domain);
    }
    if (!authorized) return new Response(JSON.stringify({ success: false, error: "Authentification requise" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const payload: Record<string, unknown> = await req.json();
    const to = typeof payload.to === "string" ? payload.to.trim().toLowerCase() : "";
    const subject = typeof payload.subject === "string" ? payload.subject.trim() : "";
    const html = typeof payload.html === "string" ? payload.html : typeof payload.htmlBody === "string" ? payload.htmlBody : "";

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to) || !subject || !html || subject.length > 200 || html.length > 2_000_000) {
      return new Response(JSON.stringify({ success: false, error: "Requête invalide" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const attachmentInputs = Array.isArray(payload.attachments) ? payload.attachments : [];
    if (attachmentInputs.length > 10) return new Response(JSON.stringify({ success: false, error: "Trop de pièces jointes" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const rawAttachments = attachmentInputs.filter((item): item is AttachmentInput => Boolean(item && typeof item === "object"));
    const configuredHost = new URL(supabaseUrl).hostname.toLowerCase();
    const extraHosts = (Deno.env.get("ATTACHMENT_ALLOWED_HOSTS") || "").split(",").map((host) => host.trim().toLowerCase()).filter(Boolean);
    const allowedHosts = new Set([configuredHost, "taxiassur.com", "www.taxiassur.com", "taxiassur.fr", "www.taxiassur.fr", ...extraHosts]);
    const resolvedAttachments: AttachmentResolved[] = [];
    let totalAttachmentBytes = 0;
    for (const att of rawAttachments) {
      const resolved = await fetchAttachment(att, allowedHosts);
      totalAttachmentBytes += Math.ceil(resolved.base64.length * 3 / 4);
      if (totalAttachmentBytes > MAX_TOTAL_ATTACHMENT_BYTES) throw new Error("AttachmentsTooLarge");
      resolvedAttachments.push(resolved);
    }

    await sendEmailSMTP(
      to,
      typeof payload.toName === "string" ? payload.toName.slice(0, 150) : to,
      subject,
      html,
      typeof payload.fromName === "string" ? payload.fromName.slice(0, 150) : "TaxiAssur",
      resolvedAttachments
    );

    return new Response(
      JSON.stringify({
        success: true,
        attachments: resolvedAttachments.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[HANDLER] Error:", error instanceof Error ? error.name : "UnknownError");
    return new Response(
      JSON.stringify({
        success: false,
        error: "Envoi impossible",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
