import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ClaimNotificationRequest {
  type: "new_claim" | "status_update";
  claim_id: string;
  claim_reference?: string;
  client_name: string;
  client_email: string;
  claim_type: string;
  claim_date?: string;
  description?: string;
  status?: string;
  client_visible_status?: string;
  client_visible_notes?: string;
  vehicle?: string;
  immatriculation?: string;
}

const STATUS_LABELS: Record<string, string> = {
  DECLARED: "Déclaré",
  EXPERT_MISSIONED: "Expert missionné",
  EXPERTISE_SCHEDULED: "Expertise planifiée",
  EXPERTISE_DONE: "Expertise effectuée",
  INSTRUCTION: "En instruction",
  INDEMNISATION_PROPOSED: "Indemnisation proposée",
  REPAIR_IN_PROGRESS: "Réparation en cours",
  CLOSED: "Clôturé",
  REJECTED: "Refusé",
};

async function sendEmailSMTP(
  to: string,
  toName: string,
  subject: string,
  htmlBody: string
): Promise<void> {
  const SMTP_HOST = Deno.env.get("SMTP_HOST") || Deno.env.get("HMAIL_SMTP_HOST") || Deno.env.get("IONOS_SMTP_HOST") || "mail.xcr.fr";
  const SMTP_PORT = parseInt(Deno.env.get("SMTP_PORT") || Deno.env.get("HMAIL_SMTP_PORT") || Deno.env.get("IONOS_SMTP_PORT") || "587");
  const SMTP_USER = Deno.env.get("SMTP_USER") || Deno.env.get("HMAIL_SMTP_USER") || Deno.env.get("IONOS_EMAIL_USER") || "tcerda@xcr.fr";
  const SMTP_PASS = Deno.env.get("SMTP_PASS") || Deno.env.get("HMAIL_SMTP_PASS") || Deno.env.get("IONOS_EMAIL_PASSWORD") || Deno.env.get("IONOS_SMTP_PASSWORD");
  const SMTP_SECURITY = (Deno.env.get("SMTP_SECURITY") || Deno.env.get("HMAIL_SMTP_SECURITY") || Deno.env.get("IONOS_SMTP_SECURITY") || (SMTP_PORT === 465 ? "ssl" : "starttls")).toLowerCase();

  if (!SMTP_PASS) {
    throw new Error("IONOS_EMAIL_PASSWORD not configured");
  }

  let conn: Deno.TcpConn | Deno.TlsConn = SMTP_SECURITY === "ssl"
    ? await Deno.connectTls({ hostname: SMTP_HOST, port: SMTP_PORT })
    : await Deno.connect({ hostname: SMTP_HOST, port: SMTP_PORT });

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  async function readResponse(): Promise<string> {
    const buffer = new Uint8Array(4096);
    const n = await conn.read(buffer);
    if (n === null) return "";
    return decoder.decode(buffer.subarray(0, n));
  }

  async function sendCommand(command: string): Promise<string> {
    await conn.write(encoder.encode(command + "\r\n"));
    return await readResponse();
  }

  const expect = (response: string, codes: string[]) => {
    if (!codes.some((code) => response.startsWith(code))) throw new Error("EmailTransportError");
  };
  try {
    expect(await readResponse(), ["220"]);
    expect(await sendCommand(`EHLO taxiassur.com`), ["250"]);
    if (SMTP_SECURITY === "starttls" || SMTP_SECURITY === "tls") {
      expect(await sendCommand("STARTTLS"), ["220"]);
      conn = await Deno.startTls(conn as Deno.TcpConn, { hostname: SMTP_HOST });
      expect(await sendCommand(`EHLO taxiassur.com`), ["250"]);
    }
    const authB64 = btoa(`\0${SMTP_USER}\0${SMTP_PASS}`);
    expect(await sendCommand(`AUTH PLAIN ${authB64}`), ["235"]);
    expect(await sendCommand(`MAIL FROM:<${SMTP_USER}>`), ["250"]);
    expect(await sendCommand(`RCPT TO:<${to}>`), ["250", "251"]);
    expect(await sendCommand("DATA"), ["354"]);

    const boundary = `boundary_${Date.now()}`;
    const message = [
      `From: TaxiAssur <${SMTP_USER}>`,
      `To: ${toName.replace(/[\r\n"]/g, "")} <${to}>`,
      `Subject: ${subject.replace(/[\r\n]/g, "")}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: quoted-printable`,
      ``,
      htmlBody,
      ``,
      `--${boundary}--`,
      `.`,
    ].join("\r\n");

    await conn.write(encoder.encode(message + "\r\n"));
    expect(await readResponse(), ["250"]);
    expect(await sendCommand("QUIT"), ["221"]);
  } finally {
    conn.close();
  }
}

function buildNewClaimTeamEmail(data: ClaimNotificationRequest): string {
  const claimDate = data.claim_date
    ? new Date(data.claim_date).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })
    : "Non renseignée";

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <div style="background: #dc2626; padding: 24px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 22px;">Nouveau sinistre déclaré</h1>
    </div>
    <div style="padding: 32px;">
      <p style="color: #374151; font-size: 16px; margin: 0 0 24px;">Un client vient de déclarer un sinistre dans son espace client.</p>

      <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <h2 style="color: #dc2626; font-size: 16px; margin: 0 0 12px;">Informations client</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 6px 0; color: #6b7280; font-size: 14px; width: 40%;">Nom</td><td style="padding: 6px 0; color: #111827; font-size: 14px; font-weight: 600;">${data.client_name}</td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Email</td><td style="padding: 6px 0; color: #111827; font-size: 14px;">${data.client_email}</td></tr>
          ${data.immatriculation ? `<tr><td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Immatriculation</td><td style="padding: 6px 0; color: #111827; font-size: 14px;">${data.immatriculation}</td></tr>` : ""}
          ${data.vehicle ? `<tr><td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Véhicule</td><td style="padding: 6px 0; color: #111827; font-size: 14px;">${data.vehicle}</td></tr>` : ""}
        </table>
      </div>

      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <h2 style="color: #374151; font-size: 16px; margin: 0 0 12px;">Détails du sinistre</h2>
        <table style="width: 100%; border-collapse: collapse;">
          ${data.claim_reference ? `<tr><td style="padding: 6px 0; color: #6b7280; font-size: 14px; width: 40%;">Référence</td><td style="padding: 6px 0; color: #111827; font-size: 14px; font-weight: 600;">${data.claim_reference}</td></tr>` : ""}
          <tr><td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Type</td><td style="padding: 6px 0; color: #111827; font-size: 14px;">${data.claim_type}</td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Date du sinistre</td><td style="padding: 6px 0; color: #111827; font-size: 14px;">${claimDate}</td></tr>
        </table>
        ${data.description ? `<div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e5e7eb;"><p style="color: #6b7280; font-size: 13px; margin: 0 0 4px;">Description :</p><p style="color: #374151; font-size: 14px; margin: 0;">${data.description}</p></div>` : ""}
      </div>

      <div style="text-align: center; margin-top: 24px;">
        <a href="https://www.taxiassur.com/backoffice/claims" style="background: #dc2626; color: white; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-size: 15px; font-weight: 600; display: inline-block;">Gérer ce sinistre</a>
      </div>
    </div>
    <div style="background: #f9fafb; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">TaxiAssur — Notification automatique</p>
    </div>
  </div>
</body>
</html>`;
}

function buildNewClaimClientEmail(data: ClaimNotificationRequest): string {
  const claimDate = data.claim_date
    ? new Date(data.claim_date).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })
    : "Non renseignée";

  const firstName = data.client_name.split(" ")[0] || data.client_name;

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <div style="background: #1d4ed8; padding: 24px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 22px;">Votre sinistre a bien été enregistré</h1>
    </div>
    <div style="padding: 32px;">
      <p style="color: #374151; font-size: 16px; margin: 0 0 16px;">Bonjour ${firstName},</p>
      <p style="color: #374151; font-size: 15px; margin: 0 0 24px;">Nous avons bien reçu votre déclaration de sinistre. Notre équipe va prendre en charge votre dossier et vous tiendra informé(e) de chaque étape.</p>

      <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <h2 style="color: #1d4ed8; font-size: 16px; margin: 0 0 12px;">Récapitulatif de votre déclaration</h2>
        <table style="width: 100%; border-collapse: collapse;">
          ${data.claim_reference ? `<tr><td style="padding: 6px 0; color: #6b7280; font-size: 14px; width: 40%;">Référence</td><td style="padding: 6px 0; color: #111827; font-size: 14px; font-weight: 600;">${data.claim_reference}</td></tr>` : ""}
          <tr><td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Type</td><td style="padding: 6px 0; color: #111827; font-size: 14px;">${data.claim_type}</td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Date du sinistre</td><td style="padding: 6px 0; color: #111827; font-size: 14px;">${claimDate}</td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Statut</td><td style="padding: 6px 0;"><span style="background: #dcfce7; color: #16a34a; padding: 2px 10px; border-radius: 12px; font-size: 13px; font-weight: 600;">Déclaré</span></td></tr>
        </table>
      </div>

      <div style="background: #f9fafb; border-left: 4px solid #1d4ed8; padding: 16px; margin-bottom: 24px; border-radius: 0 8px 8px 0;">
        <p style="color: #374151; font-size: 14px; margin: 0;"><strong>Prochaines étapes :</strong> Notre équipe va examiner votre dossier et vous contacter si des informations complémentaires sont nécessaires. Vous serez notifié(e) par email à chaque avancée importante.</p>
      </div>

      <div style="text-align: center; margin-top: 24px;">
        <a href="https://www.taxiassur.com/espace-client" style="background: #1d4ed8; color: white; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-size: 15px; font-weight: 600; display: inline-block;">Suivre mon sinistre</a>
      </div>
    </div>
    <div style="background: #f9fafb; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">TaxiAssur — 01 86 95 27 86 — team@taxiassur.com</p>
    </div>
  </div>
</body>
</html>`;
}

function buildStatusUpdateClientEmail(data: ClaimNotificationRequest): string {
  const statusLabel = STATUS_LABELS[data.status || ""] || data.status || "Mise à jour";
  const firstName = data.client_name.split(" ")[0] || data.client_name;

  const statusColors: Record<string, { bg: string; text: string; border: string }> = {
    EXPERT_MISSIONED: { bg: "#fef3c7", text: "#d97706", border: "#fde68a" },
    EXPERTISE_SCHEDULED: { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
    EXPERTISE_DONE: { bg: "#f0fdf4", text: "#16a34a", border: "#bbf7d0" },
    INSTRUCTION: { bg: "#faf5ff", text: "#7c3aed", border: "#e9d5ff" },
    INDEMNISATION_PROPOSED: { bg: "#fff7ed", text: "#ea580c", border: "#fed7aa" },
    REPAIR_IN_PROGRESS: { bg: "#eff6ff", text: "#0369a1", border: "#bae6fd" },
    CLOSED: { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" },
    REJECTED: { bg: "#fef2f2", text: "#dc2626", border: "#fecaca" },
  };

  const colors = statusColors[data.status || ""] || { bg: "#f9fafb", text: "#374151", border: "#e5e7eb" };

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <div style="background: #0f172a; padding: 24px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 22px;">Mise à jour de votre sinistre</h1>
    </div>
    <div style="padding: 32px;">
      <p style="color: #374151; font-size: 16px; margin: 0 0 16px;">Bonjour ${firstName},</p>
      <p style="color: #374151; font-size: 15px; margin: 0 0 24px;">Votre dossier sinistre a été mis à jour. Voici les dernières informations :</p>

      <div style="text-align: center; margin-bottom: 24px;">
        <span style="background: ${colors.bg}; color: ${colors.text}; border: 1px solid ${colors.border}; padding: 8px 20px; border-radius: 20px; font-size: 16px; font-weight: 700; display: inline-block;">${statusLabel}</span>
      </div>

      ${data.claim_reference ? `<div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 24px;"><p style="color: #6b7280; font-size: 13px; margin: 0 0 4px;">Référence du sinistre</p><p style="color: #111827; font-size: 15px; font-weight: 600; margin: 0;">${data.claim_reference}</p></div>` : ""}

      ${data.client_visible_status ? `
      <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <h2 style="color: #1d4ed8; font-size: 15px; margin: 0 0 8px;">Statut actuel</h2>
        <p style="color: #374151; font-size: 14px; margin: 0;">${data.client_visible_status}</p>
      </div>` : ""}

      ${data.client_visible_notes ? `
      <div style="background: #f9fafb; border-left: 4px solid #0f172a; padding: 16px; margin-bottom: 24px; border-radius: 0 8px 8px 0;">
        <h2 style="color: #374151; font-size: 15px; margin: 0 0 8px;">Message de notre équipe</h2>
        <p style="color: #374151; font-size: 14px; margin: 0; line-height: 1.6;">${data.client_visible_notes}</p>
      </div>` : ""}

      <div style="text-align: center; margin-top: 24px;">
        <a href="https://www.taxiassur.com/espace-client" style="background: #0f172a; color: white; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-size: 15px; font-weight: 600; display: inline-block;">Voir mon dossier sinistre</a>
      </div>
    </div>
    <div style="background: #f9fafb; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">TaxiAssur — 01 86 95 27 86 — team@taxiassur.com</p>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(value: unknown): string {
  const entities: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(value ?? "").replace(/[&<>"']/g, (character) => entities[character]);
}
const json = (status: number, body: Record<string, unknown>) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" },
});
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return json(405, { success: false, error: "Method not allowed" });
  let eventId: string | null = null;
  let teamSent = false;
  let clientSent = false;
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!supabaseUrl || !serviceKey) return json(503, { success: false, error: "Service indisponible" });
    const input = await req.json();
    if (!uuidPattern.test(input.claim_id || "") || !["new_claim", "status_update"].includes(input.type)) {
      return json(400, { success: false, error: "Notification invalide" });
    }
    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: claim, error: claimError } = await supabase.from("crm_claims").select("*").eq("id", input.claim_id).maybeSingle();
    if (claimError || !claim?.lead_id) return json(404, { success: false, error: "Sinistre introuvable" });
    const { data: lead, error: leadError } = await supabase.from("crm_leads").select("email, first_name, last_name, immatriculation").eq("id", claim.lead_id).maybeSingle();
    if (leadError || !lead?.email) return json(404, { success: false, error: "Prospect introuvable" });
    const rawStatus = String(claim.claim_status || claim.status || "DECLARED");
    const rawVisibleStatus = String(claim.client_visible_status || "");
    const rawVisibleNotes = String(claim.client_visible_notes || "");
    const eventKey = await sha256([input.type, claim.id, rawStatus, rawVisibleStatus, rawVisibleNotes].join("|"));
    const { data: event, error: eventError } = await supabase.from("claim_notification_events").insert({
      claim_id: claim.id, notification_type: input.type, event_key: eventKey, status: "processing",
    }).select("id, team_sent_at, client_sent_at").single();
    if (eventError) {
      if (eventError.code !== "23505") throw new Error("NotificationAuditError");
      const { data: existing } = await supabase.from("claim_notification_events").select("id, status, team_sent_at, client_sent_at").eq("event_key", eventKey).maybeSingle();
      if (!existing || existing.status !== "failed") return json(200, { success: true, duplicate: true });
      const { data: retry, error: retryError } = await supabase.from("claim_notification_events")
        .update({ status: "processing", failed_at: null }).eq("id", existing.id).eq("status", "failed").select("id").maybeSingle();
      if (retryError || !retry) return json(200, { success: true, duplicate: true });
      eventId = retry.id;
      teamSent = Boolean(existing.team_sent_at);
      clientSent = Boolean(existing.client_sent_at);
    } else {
      eventId = event.id;
      teamSent = Boolean(event.team_sent_at);
      clientSent = Boolean(event.client_sent_at);
    }
    const recipient = String(lead.email).trim().toLowerCase();
    const rawName = `${lead.first_name || ""} ${lead.last_name || ""}`.trim() || "Client";
    const data: ClaimNotificationRequest = {
      type: input.type,
      claim_id: claim.id,
      claim_reference: escapeHtml(claim.reference_number || claim.reference || ""),
      client_name: escapeHtml(rawName), client_email: escapeHtml(recipient),
      claim_type: escapeHtml(claim.claim_type || claim.incident_type || "Sinistre"),
      claim_date: claim.claim_date || claim.incident_date || claim.created_at,
      description: escapeHtml(claim.description || claim.incident_description || ""),
      status: escapeHtml(rawStatus), client_visible_status: escapeHtml(rawVisibleStatus),
      client_visible_notes: escapeHtml(rawVisibleNotes), immatriculation: escapeHtml(lead.immatriculation || ""),
      vehicle: escapeHtml(claim.vehicle_info || ""),
    };
    let delivered = 0;
    if (data.type === "new_claim") {
      const teamEmail = Deno.env.get("TEAM_NOTIFICATION_EMAIL") || "team@taxiassur.com";
      if (!teamSent) {
        await sendEmailSMTP(teamEmail, "Equipe TaxiAssur", `Nouveau sinistre declare${data.claim_reference ? ` (${data.claim_reference})` : ""}`, buildNewClaimTeamEmail(data));
        teamSent = true; delivered += 1;
        await supabase.from("claim_notification_events").update({ team_sent_at: new Date().toISOString() }).eq("id", eventId);
      }
      if (!clientSent) {
        await sendEmailSMTP(recipient, rawName, "TaxiAssur - Votre sinistre a bien ete enregistre", buildNewClaimClientEmail(data));
        clientSent = true; delivered += 1;
        await supabase.from("claim_notification_events").update({ client_sent_at: new Date().toISOString() }).eq("id", eventId);
      }
    } else if (!clientSent) {
      const statusLabel = STATUS_LABELS[rawStatus] || rawStatus || "Mise a jour";
      await sendEmailSMTP(recipient, rawName, `TaxiAssur - Votre sinistre : ${statusLabel}`, buildStatusUpdateClientEmail(data));
      clientSent = true; delivered += 1;
      await supabase.from("claim_notification_events").update({ client_sent_at: new Date().toISOString() }).eq("id", eventId);
    }
    const totalDelivered = data.type === "new_claim" ? Number(teamSent) + Number(clientSent) : Number(clientSent);
    await supabase.from("claim_notification_events").update({ status: "sent", delivered_count: totalDelivered, sent_at: new Date().toISOString() }).eq("id", eventId);
    console.log("Claim notification sent", input.type, delivered);
    return json(200, { success: true, delivered });
  } catch (error) {
    console.error("Claim notification failed", error instanceof Error ? error.name : "UnknownError");
    if (eventId) {
      try {
        const url = Deno.env.get("SUPABASE_URL") || ""; const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
        if (url && key) await createClient(url, key).from("claim_notification_events").update({ status: "failed", failed_at: new Date().toISOString() }).eq("id", eventId);
      } catch { /* audit failure must not expose details */ }
    }
    return json(502, { success: false, error: "Notification impossible" });
  }
});