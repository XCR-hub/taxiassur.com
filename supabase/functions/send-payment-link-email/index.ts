import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};
const internalDomains = new Set(["taxiassur.com", "taxiassur.fr", "xcr.fr"]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const json = (status: number, body: Record<string, unknown>) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" },
});

function escapeHtml(value: unknown): string {
  const entities: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(value ?? "").replace(/[&<>"']/g, (character) => entities[character]);
}
async function isAuthorized(req: Request, url: string, serviceKey: string): Promise<boolean> {
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return false;
  if (token === serviceKey) return true;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data, error } = await admin.auth.getUser(token);
  if (error) return false;
  const domain = (data.user?.email || "").toLowerCase().split("@")[1] || "";
  return internalDomains.has(domain);
}
function isAllowedPaymentUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2048) return false;
  try {
    const url = new URL(value);
    let configuredHost = "";
    try { configuredHost = new URL(Deno.env.get("SITE_URL") || "").hostname.toLowerCase(); } catch { /* optional */ }
    const allowedHosts = new Set(["taxiassur.com", "www.taxiassur.com", "taxiassur.fr", "www.taxiassur.fr", configuredHost].filter(Boolean));
    return url.protocol === "https:" && allowedHosts.has(url.hostname.toLowerCase()) &&
      /^\/paiement\/[A-Za-z0-9_-]+$/.test(url.pathname) && /^[0-9a-f]{64}$/i.test(url.searchParams.get("token") || "");
  } catch { return false; }
}
function encodeBase64(value: string): string { return btoa(value); }
async function sendEmailSMTP(to: string, toName: string, subject: string, htmlBody: string): Promise<void> {
  const host = Deno.env.get("SMTP_HOST") || Deno.env.get("HMAIL_SMTP_HOST") || Deno.env.get("IONOS_SMTP_HOST") || "mail.xcr.fr";
  const port = Number(Deno.env.get("SMTP_PORT") || Deno.env.get("HMAIL_SMTP_PORT") || Deno.env.get("IONOS_SMTP_PORT") || "587");
  const user = Deno.env.get("SMTP_USER") || Deno.env.get("HMAIL_SMTP_USER") || Deno.env.get("IONOS_EMAIL_USER") || "tcerda@xcr.fr";
  const password = Deno.env.get("SMTP_PASS") || Deno.env.get("HMAIL_SMTP_PASS") || Deno.env.get("IONOS_EMAIL_PASSWORD") || Deno.env.get("IONOS_SMTP_PASSWORD");
  const security = (Deno.env.get("SMTP_SECURITY") || Deno.env.get("HMAIL_SMTP_SECURITY") || (port === 465 ? "ssl" : "starttls")).toLowerCase();
  if (!password || !Number.isInteger(port) || port < 1 || port > 65535) throw new Error("EmailConfigurationError");
  let connection: Deno.TcpConn | Deno.TlsConn = security === "ssl"
    ? await Deno.connectTls({ hostname: host, port }) : await Deno.connect({ hostname: host, port });
  const encoder = new TextEncoder(); const decoder = new TextDecoder();
  const read = async () => { const buffer = new Uint8Array(4096); const size = await connection.read(buffer); return size === null ? "" : decoder.decode(buffer.subarray(0, size)); };
  const command = async (value: string) => { await connection.write(encoder.encode(value + "\r\n")); return await read(); };
  const expect = (response: string, codes: string[]) => {
    if (!codes.some((code) => response.startsWith(code))) throw new Error("EmailTransportError");
  };
  try {
    expect(await read(), ["220"]); expect(await command(`EHLO ${host}`), ["250"]);
    if (security === "starttls" || security === "tls") {
      expect(await command("STARTTLS"), ["220"]);
      connection = await Deno.startTls(connection as Deno.TcpConn, { hostname: host });
      expect(await command(`EHLO ${host}`), ["250"]);
    }
    expect(await command("AUTH LOGIN"), ["334"]);
    expect(await command(encodeBase64(user)), ["334"]);
    expect(await command(encodeBase64(password)), ["235"]);
    expect(await command("MAIL FROM:<team@taxiassur.com>"), ["250"]);
    expect(await command(`RCPT TO:<${to}>`), ["250", "251"]);
    expect(await command("DATA"), ["354"]);
    const message = [`From: "TaxiAssur" <team@taxiassur.com>`, `To: "${toName.replace(/[\r\n"]/g, "")}" <${to}>`, `Subject: ${subject.replace(/[\r\n]/g, "")}`, "MIME-Version: 1.0", "Content-Type: text/html; charset=UTF-8", "", htmlBody, "."].join("\r\n");
    await connection.write(encoder.encode(message + "\r\n")); expect(await read(), ["250"]); expect(await command("QUIT"), ["221"]);
  } finally { connection.close(); }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return json(405, { success: false, error: "Method not allowed" });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!supabaseUrl || !serviceKey) return json(503, { success: false, error: "Service indisponible" });
    if (!(await isAuthorized(req, supabaseUrl, serviceKey))) return json(401, { success: false, error: "Non autorise" });
    const { lead_id, payment_url, amount, email, first_name, last_name } = await req.json();
    const numericAmount = Number(amount);
    if (!isAllowedPaymentUrl(payment_url) || !Number.isFinite(numericAmount) || numericAmount <= 0 || numericAmount > 100000) return json(400, { success: false, error: "Donnees de paiement invalides" });
    if (lead_id && !uuidPattern.test(lead_id)) return json(400, { success: false, error: "Lead invalide" });
    if (email && !emailPattern.test(email)) return json(400, { success: false, error: "Email invalide" });
    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    let recipient = email; let firstName = first_name; let lastName = last_name;
    if (lead_id) {
      const { data: lead, error } = await supabase.from("crm_leads").select("email, first_name, last_name").eq("id", lead_id).maybeSingle();
      if (error || !lead?.email) return json(404, { success: false, error: "Prospect introuvable" });
      recipient = lead.email; firstName = lead.first_name; lastName = lead.last_name;
    }
    if (!recipient || !emailPattern.test(recipient)) return json(400, { success: false, error: "Email invalide" });
    const formattedAmount = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(numericAmount);
    const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#f3f4f6;padding:24px"><div style="max-width:600px;margin:auto;background:#fff;padding:32px;border-radius:16px"><h1 style="color:#ea580c">Paiement de votre assurance</h1><p>Bonjour ${escapeHtml(firstName)},</p><p>Votre dossier est prêt. Le montant à régler est de <strong>${escapeHtml(formattedAmount)}</strong>.</p><p style="margin:32px 0"><a href="${escapeHtml(payment_url)}" style="background:#059669;color:#fff;padding:16px 24px;border-radius:24px;text-decoration:none;font-weight:bold">Payer maintenant</a></p><p>Ce lien est personnel. Ne le transmettez pas.</p><hr><p style="color:#6b7280;font-size:13px">TaxiAssur — ORIAS 11 061 425 — 01 80 85 57 86</p></div></body></html>`;
    await sendEmailSMTP(recipient, `${firstName || ""} ${lastName || ""}`.trim() || "Client", `Paiement TaxiAssur - ${formattedAmount}`, html);
    if (lead_id) await supabase.from("crm_interactions").insert({ lead_id, type: "email", direction: "outbound", subject: `Envoi lien de paiement ${formattedAmount}`, content: `Lien de paiement sécurisé envoyé pour ${formattedAmount}`, to_email: recipient, from_email: "team@taxiassur.com" });
    console.log("Payment email sent");
    return json(200, { success: true, message: "Email de paiement envoye avec succes" });
  } catch (error) {
    console.error("Payment email delivery failed", error instanceof Error ? error.name : "UnknownError");
    return json(502, { success: false, error: "Envoi impossible" });
  }
});