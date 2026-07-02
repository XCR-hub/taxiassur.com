export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  security: string;
  fromEmail: string;
  replyTo: string;
}

export interface SendHtmlEmailOptions {
  to: string;
  toName?: string;
  subject: string;
  htmlBody: string;
  fromEmail?: string;
  fromName?: string;
  replyTo?: string;
  headers?: Record<string, string>;
}

export interface SendMimeMessageOptions {
  to: string;
  subject: string;
  mimeMessage: string;
  envelopeFrom?: string;
}

function env(...names: string[]): string {
  for (const name of names) {
    const value = Deno.env.get(name);
    if (value) return value;
  }
  return "";
}

export function getSmtpConfig(): SmtpConfig {
  const host = env("SMTP_HOST", "HMAIL_SMTP_HOST", "IONOS_SMTP_HOST") || "mail.xcr.fr";
  const port = parseInt(env("SMTP_PORT", "HMAIL_SMTP_PORT", "IONOS_SMTP_PORT") || "587", 10);
  const user = env("SMTP_USER", "HMAIL_SMTP_USER", "IONOS_EMAIL_USER", "IONOS_SMTP_USER") || "tcerda@xcr.fr";
  const pass = env("SMTP_PASS", "HMAIL_SMTP_PASS", "HMAIL_EMAIL_PASSWORD", "IONOS_EMAIL_PASSWORD", "IONOS_SMTP_PASSWORD");
  const security = (env("SMTP_SECURITY", "HMAIL_SMTP_SECURITY", "IONOS_SMTP_SECURITY") || (port === 465 ? "ssl" : "starttls")).toLowerCase();
  const fromEmail = env("FROM_EMAIL", "HMAIL_FROM_EMAIL", "IONOS_FROM_EMAIL") || user;
  const replyTo = env("REPLY_TO_EMAIL", "CONTACT_EMAIL") || "team@taxiassur.com";

  return { host, port, user, pass, security, fromEmail, replyTo };
}

function base64Utf8(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function encodeHeader(value: string): string {
  if (/^[\x20-\x7e]*$/.test(value)) return cleanHeader(value);
  return `=?UTF-8?B?${base64Utf8(value)}?=`;
}

function cleanHeader(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function normalizeMessage(message: string): string {
  return message.replace(/\r?\n/g, "\r\n").replace(/^\./gm, "..");
}

export function buildHtmlMimeMessage(options: SendHtmlEmailOptions, config = getSmtpConfig()): string {
  const fromEmail = cleanHeader(options.fromEmail || config.fromEmail);
  const fromName = encodeHeader(options.fromName || "TaxiAssur");
  const to = cleanHeader(options.to);
  const toName = encodeHeader(options.toName || options.to);
  const replyTo = cleanHeader(options.replyTo || config.replyTo);
  const headers = options.headers || {};

  const lines = [
    `From: ${fromName} <${fromEmail}>`,
    `To: ${toName} <${to}>`,
    `Subject: ${encodeHeader(options.subject)}`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
  ];

  if (replyTo) lines.push(`Reply-To: ${replyTo}`);

  for (const [name, value] of Object.entries(headers)) {
    if (!/^[A-Za-z0-9-]+$/.test(name)) continue;
    lines.push(`${name}: ${cleanHeader(value)}`);
  }

  lines.push("", options.htmlBody);
  return lines.join("\r\n");
}

export async function sendSmtpMimeMessage(options: SendMimeMessageOptions): Promise<void> {
  const config = getSmtpConfig();
  if (!config.pass) {
    throw new Error("SMTP_PASS not configured");
  }

  let conn: any = config.security === "ssl"
    ? await Deno.connectTls({ hostname: config.host, port: config.port })
    : await Deno.connect({ hostname: config.host, port: config.port });

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

    if (config.security === "starttls" || config.security === "tls") {
      const startTlsResponse = await sendCommand("STARTTLS");
      if (!startTlsResponse.startsWith("220")) {
        throw new Error("SMTP STARTTLS failed");
      }
      conn = await Deno.startTls(conn, { hostname: config.host });
      await sendCommand(`EHLO taxiassur.com`);
    }

    await sendCommand("AUTH LOGIN");
    await sendCommand(btoa(config.user), false);
    const authResponse = await sendCommand(btoa(config.pass), false);
    if (authResponse.includes("535")) {
      throw new Error("SMTP auth failed");
    }

    await sendCommand(`MAIL FROM:<${cleanHeader(options.envelopeFrom || config.fromEmail)}>`);
    await sendCommand(`RCPT TO:<${cleanHeader(options.to)}>`);
    await sendCommand("DATA");
    await sendCommand(`${normalizeMessage(options.mimeMessage).replace(/\r\n$/, "")}\r\n.`, false);
    await sendCommand("QUIT");
  } finally {
    try {
      conn.close();
    } catch (_) {
      // connection already closed
    }
  }
}

export async function sendSmtpHtmlEmail(options: SendHtmlEmailOptions): Promise<void> {
  const config = getSmtpConfig();
  const mimeMessage = buildHtmlMimeMessage(options, config);
  await sendSmtpMimeMessage({
    to: options.to,
    subject: options.subject,
    mimeMessage,
    envelopeFrom: config.fromEmail,
  });
}
