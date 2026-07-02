import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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

async function fetchAttachment(att: AttachmentInput): Promise<AttachmentResolved | null> {
  try {
    const filename = att.filename || "attachment";
    const contentType = att.contentType || "application/octet-stream";

    if (att.content) {
      return { filename, base64: att.content, contentType };
    }

    if (!att.url) return null;

    const resp = await fetch(att.url);
    if (!resp.ok) {
      console.warn(`[ATTACH] Fetch failed (${resp.status}) for ${att.url}`);
      return null;
    }
    const buf = new Uint8Array(await resp.arrayBuffer());
    let binary = "";
    for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i]);
    const base64 = btoa(binary);
    const detectedType = resp.headers.get("content-type") || contentType;
    return { filename, base64, contentType: detectedType };
  } catch (err) {
    console.warn(`[ATTACH] Error resolving ${att.filename}:`, err);
    return null;
  }
}

function chunkBase64(b64: string, size = 76): string {
  const lines: string[] = [];
  for (let i = 0; i < b64.length; i += size) lines.push(b64.substring(i, i + size));
  return lines.join("\r\n");
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
  fromEmail = "team@taxiassur.com",
  fromName = "TaxiAssur",
  attachments: AttachmentResolved[] = []
): Promise<void> {
  const SMTP_HOST = Deno.env.get("SMTP_HOST") || Deno.env.get("HMAIL_SMTP_HOST") || Deno.env.get("IONOS_SMTP_HOST") || "mail.xcr.fr";
  const SMTP_PORT = parseInt(Deno.env.get("SMTP_PORT") || Deno.env.get("HMAIL_SMTP_PORT") || Deno.env.get("IONOS_SMTP_PORT") || "587");
  const SMTP_USER = Deno.env.get("SMTP_USER") || Deno.env.get("HMAIL_SMTP_USER") || Deno.env.get("IONOS_EMAIL_USER") || "tcerda@xcr.fr";
  const SMTP_PASS = Deno.env.get("SMTP_PASS") || Deno.env.get("HMAIL_SMTP_PASS") || Deno.env.get("IONOS_EMAIL_PASSWORD") || Deno.env.get("IONOS_SMTP_PASSWORD");
  const SMTP_SECURITY = (Deno.env.get("SMTP_SECURITY") || Deno.env.get("HMAIL_SMTP_SECURITY") || Deno.env.get("IONOS_SMTP_SECURITY") || (SMTP_PORT === 465 ? "ssl" : "starttls")).toLowerCase();
  const SENDER_EMAIL = Deno.env.get("FROM_EMAIL") || Deno.env.get("HMAIL_FROM_EMAIL") || SMTP_USER;

  console.log(`[hMail] SMTP ${SMTP_HOST}:${SMTP_PORT} security=${SMTP_SECURITY} user=${SMTP_USER} attachments=${attachments.length}`);

  if (!SMTP_PASS) throw new Error("SMTP_PASS not configured");

  let conn: any = SMTP_SECURITY === "ssl"
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

  try {
    await readResponse();
    await sendCommand(`EHLO taxiassur.com`);
    if (SMTP_SECURITY === "starttls" || SMTP_SECURITY === "tls") {
      const startTlsResponse = await sendCommand("STARTTLS");
      if (!startTlsResponse.startsWith("220")) throw new Error("SMTP STARTTLS failed");
      conn = await Deno.startTls(conn, { hostname: SMTP_HOST });
      await sendCommand(`EHLO taxiassur.com`);
    }
    await sendCommand("AUTH LOGIN");
    await sendCommand(btoa(SMTP_USER), false);
    const authResponse = await sendCommand(btoa(SMTP_PASS), false);
    if (authResponse.includes("535")) throw new Error("SMTP auth failed");

    await sendCommand(`MAIL FROM:<${SENDER_EMAIL}>`);
    await sendCommand(`RCPT TO:<${to}>`);
    await sendCommand("DATA");

    const mime = buildMimeMessage(fromName, SENDER_EMAIL, toName, to, subject, htmlBody, attachments);
    // Dot-stuffing: any line starting with "." must be escaped
    const safe = mime.replace(/\r\n\./g, "\r\n..");
    await sendCommand(safe + "\r\n.", false);
    await sendCommand("QUIT");
    console.log(`[SMTP] Sent to ${to}`);
    conn.close();
  } catch (error) {
    console.error(`[SMTP] Error:`, error);
    try { conn.close(); } catch (_) { /* noop */ }
    throw error;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const payload: any = await req.json();
    console.log(`[HANDLER] payload keys=${Object.keys(payload).join(",")}`);

    const to = payload.to;
    const subject = payload.subject;
    const html = payload.html || payload.htmlBody;

    if (!to || !subject || !html) {
      throw new Error("Missing required fields: to, subject, html");
    }

    const rawAttachments: AttachmentInput[] = Array.isArray(payload.attachments) ? payload.attachments : [];
    const resolvedAttachments: AttachmentResolved[] = [];
    for (const att of rawAttachments) {
      const r = await fetchAttachment(att);
      if (r) resolvedAttachments.push(r);
    }

    await sendEmailSMTP(
      to,
      payload.toName || to,
      subject,
      html,
      payload.from || payload.fromEmail || "team@taxiassur.com",
      payload.fromName || "TaxiAssur",
      resolvedAttachments
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email sent via hMail SMTP",
        recipient: to,
        attachments: resolvedAttachments.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[HANDLER] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message,
        details: String(error),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
