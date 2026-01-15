import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface LeadNotificationRequest {
  lead_id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  status: string;
  immatriculation?: string;
  access_token?: string;
}

async function sendEmailSMTP(
  to: string,
  toName: string,
  subject: string,
  htmlBody: string,
  fromEmail: string = "team@taxiassur.com",
  fromName: string = "TaxiAssur"
): Promise<void> {
  const SMTP_HOST = Deno.env.get("IONOS_SMTP_HOST") || "smtp.ionos.fr";
  const SMTP_PORT = parseInt(Deno.env.get("IONOS_SMTP_PORT") || "465");
  const SMTP_USER = Deno.env.get("IONOS_EMAIL_USER") || "team@taxiassur.com";
  const SMTP_PASS = Deno.env.get("IONOS_EMAIL_PASSWORD");

  if (!SMTP_PASS) {
    throw new Error("IONOS_EMAIL_PASSWORD not configured");
  }

  const conn = await Deno.connect({
    hostname: SMTP_HOST,
    port: SMTP_PORT,
  });

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  async function readResponse(): Promise<string> {
    const buffer = new Uint8Array(1024);
    const n = await conn.read(buffer);
    if (n === null) return "";
    return decoder.decode(buffer.subarray(0, n));
  }

  async function sendCommand(cmd: string): Promise<string> {
    await conn.write(encoder.encode(cmd + "\r\n"));
    return await readResponse();
  }

  try {
    await readResponse();
    await sendCommand(`EHLO ${SMTP_HOST}`);
    await sendCommand(`AUTH LOGIN`);
    await sendCommand(btoa(SMTP_USER));
    await sendCommand(btoa(SMTP_PASS));
    await sendCommand(`MAIL FROM:<${fromEmail}>`);
    await sendCommand(`RCPT TO:<${to}>`);
    await sendCommand("DATA");

    const emailContent = [
      `From: "${fromName}" <${fromEmail}>`,
      `To: "${toName}" <${to}>`,
      `Subject: ${subject}`,
      "MIME-Version: 1.0",
      "Content-Type: text/html; charset=UTF-8",
      "",
      htmlBody,
      ".",
    ].join("\r\n");

    await conn.write(encoder.encode(emailContent + "\r\n"));
    await readResponse();
    await sendCommand("QUIT");
  } finally {
    conn.close();
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const lead: LeadNotificationRequest = await req.json();
    console.log("Sending notification for lead via IONOS SMTP 465:", lead.lead_id);

    const prospectSpaceUrl = lead.access_token
      ? `https://taxiassur.com/espace-prospect/${lead.access_token}`
      : "https://taxiassur.com/espace-documents";

    const teamEmailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: #f3f4f6; margin: 0; padding: 20px; }
    .container { max-width: 650px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; padding: 25px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
    .alert-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
    .info-grid { display: grid; gap: 15px; margin: 20px 0; }
    .info-item { background: #f9fafb; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb; }
    .info-label { color: #6b7280; font-size: 12px; text-transform: uppercase; margin-bottom: 5px; }
    .info-value { color: #1f2937; font-weight: bold; font-size: 16px; }
    .cta-button { background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; }
    .footer { background: #1f2937; color: white; padding: 20px; text-align: center; font-size: 12px; border-radius: 0 0 10px 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 28px;">🚕 NOUVEAU LEAD TAXIASSUR</h1>
      <p style="margin: 10px 0 0 0;">Traitement prioritaire requis</p>
    </div>
    <div class="content">
      <div class="alert-box">
        <strong>⚡ ACTION REQUISE :</strong> Contactez ce prospect dans les <strong>15 minutes</strong>
      </div>
      <h2 style="color: #1f2937; margin-top: 0;">📋 Informations du prospect</h2>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Nom complet</div>
          <div class="info-value">${lead.name}</div>
        </div>
        <div class="info-item">
          <div class="info-label">📞 Téléphone</div>
          <div class="info-value"><a href="tel:${lead.phone}" style="color: #10b981; text-decoration: none;">${lead.phone}</a></div>
        </div>
        <div class="info-item">
          <div class="info-label">📧 Email</div>
          <div class="info-value"><a href="mailto:${lead.email}" style="color: #3b82f6; text-decoration: none;">${lead.email}</a></div>
        </div>
        <div class="info-item">
          <div class="info-label">📍 Ville</div>
          <div class="info-value">${lead.city}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Statut</div>
          <div class="info-value">${lead.status}</div>
        </div>
        ${lead.immatriculation ? `<div class="info-item"><div class="info-label">🚗 Immatriculation</div><div class="info-value">${lead.immatriculation}</div></div>` : ""}
      </div>
      <h3 style="color: #1f2937;">✅ Prochaines actions</h3>
      <ol style="color: #4b5563; line-height: 1.8;">
        <li>Appeler le prospect au <strong>${lead.phone}</strong></li>
        <li>Qualifier le besoin et confirmer les informations</li>
        <li>Vérifier l'envoi des 7 documents requis</li>
        <li>Préparer et envoyer le devis sous 24h</li>
      </ol>
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://taxiassur.com/backoffice/crm-commercial" class="cta-button">OUVRIR LE CRM</a>
      </div>
    </div>
    <div class="footer">
      <strong>TaxiAssur CRM</strong> - Notification automatique
    </div>
  </div>
</body>
</html>`;

    const clientEmailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; background: #f3f4f6; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center; color: white; }
    .header h1 { margin: 0 0 10px 0; font-size: 28px; }
    .content { padding: 30px; }
    .success-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 8px; }
    .docs-section { background: #f0f9ff; border: 2px solid #3b82f6; padding: 25px; border-radius: 15px; margin: 25px 0; }
    .doc-item { background: white; padding: 12px 15px; margin: 8px 0; border-radius: 8px; border-left: 4px solid #10b981; }
    .cta-button { background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; padding: 18px 35px; text-decoration: none; border-radius: 50px; display: inline-block; font-weight: bold; font-size: 16px; }
    .contact-box { background: #dbeafe; padding: 25px; border-radius: 15px; margin: 25px 0; text-align: center; }
    .footer { background: #1f2937; color: white; padding: 30px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ DEMANDE REÇUE !</h1>
      <p style="margin: 0; font-size: 18px;">Bonjour ${lead.name}</p>
    </div>
    <div class="content">
      <div class="success-box">
        <strong>Excellente nouvelle !</strong><br>
        Votre demande de devis d'assurance taxi a été confirmée avec succès.
      </div>
      <h2 style="color: #1f2937;">🎯 Prochaines étapes</h2>
      <ul style="color: #4b5563;">
        <li>Votre expert TaxiAssur vous recontacte <strong>sous 15 minutes</strong></li>
        <li>Analyse personnalisée de vos besoins</li>
        <li>Proposition des meilleures offres du marché</li>
        <li>Économies moyennes constatées : <strong>580 €/an</strong></li>
      </ul>
      <div class="docs-section">
        <h3 style="color: #1e40af; margin-top: 0; text-align: center;">📄 7 Documents requis</h3>
        <div class="doc-item"><strong>1.</strong> Licence de taxi professionnelle</div>
        <div class="doc-item"><strong>2.</strong> Permis de conduire (recto-verso)</div>
        <div class="doc-item"><strong>3.</strong> Pièce d'identité (CNI/passeport)</div>
        <div class="doc-item"><strong>4.</strong> Carte grise du véhicule</div>
        <div class="doc-item"><strong>5.</strong> Relevé d'information assureur</div>
        <div class="doc-item"><strong>6.</strong> Autorisation de stationnement</div>
        <div class="doc-item"><strong>7.</strong> RIB - Relevé d'Identité Bancaire</div>
      </div>
      <div style="text-align: center; background: #fef3c7; padding: 25px; border-radius: 15px; margin: 25px 0;">
        <p style="color: #92400e; font-weight: bold; margin-bottom: 15px;">📤 Uploadez vos documents maintenant !</p>
        <a href="${prospectSpaceUrl}" class="cta-button">ACCÉDER À MON ESPACE</a>
      </div>
      <div class="contact-box">
        <h3 style="color: #1e40af; margin-top: 0;">💬 Besoin d'aide ?</h3>
        <p style="margin: 10px 0;">
          <strong>📞 01 80 85 57 86</strong><br>
          <a href="mailto:team@taxiassur.com" style="color: #1e40af;">📧 team@taxiassur.com</a>
        </p>
      </div>
    </div>
    <div class="footer">
      <div style="font-size: 22px; font-weight: bold; color: #10b981; margin-bottom: 10px;">TaxiAssur</div>
      <p>Courtier spécialisé en assurance taxi et VTC</p>
      <p style="margin-top: 10px; font-size: 12px;">ORIAS 11 061 425 - Excellence Coverage Risks</p>
    </div>
  </div>
</body>
</html>`;

    let sent = 0;
    const errors: string[] = [];

    try {
      await sendEmailSMTP(
        "team@taxiassur.com",
        "Équipe TaxiAssur",
        `[TAXIASSUR] Nouveau Lead - ${lead.name} - ${lead.city}`,
        teamEmailHtml
      );
      sent++;
      console.log("✅ Email sent to team@taxiassur.com");
    } catch (err) {
      console.error("❌ Failed to send to team:", err);
      errors.push(`team: ${err.message}`);
    }

    try {
      await sendEmailSMTP(
        "commercial@xcr.fr",
        "Commercial XCR",
        `[TAXIASSUR] Nouveau Lead - ${lead.name} - ${lead.city}`,
        teamEmailHtml
      );
      sent++;
      console.log("✅ Email sent to commercial@xcr.fr");
    } catch (err) {
      console.error("❌ Failed to send to commercial:", err);
      errors.push(`commercial: ${err.message}`);
    }

    try {
      await sendEmailSMTP(
        lead.email,
        lead.name,
        "Demande confirmée ! Votre expert TaxiAssur vous recontacte rapidement",
        clientEmailHtml
      );
      sent++;
      console.log(`✅ Email sent to client: ${lead.email}`);
    } catch (err) {
      console.error("❌ Failed to send to client:", err);
      errors.push(`client: ${err.message}`);
    }

    console.log(`📧 Emails sent via IONOS SMTP 465: ${sent}/3`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (sent > 0) {
      await supabase.from("crm_interactions").insert([
        {
          lead_id: lead.lead_id,
          type: "email",
          direction: "outbound",
          subject: `[TAXIASSUR] Nouveau Lead - ${lead.name}`,
          content: "Email de notification interne envoyé à l'équipe via IONOS SMTP",
          to_email: "team@taxiassur.com",
          from_email: "team@taxiassur.com"
        },
        {
          lead_id: lead.lead_id,
          type: "email",
          direction: "outbound",
          subject: "Demande confirmée ! Votre expert TaxiAssur vous recontacte rapidement",
          content: "Email de confirmation envoyé au prospect via IONOS SMTP",
          to_email: lead.email,
          from_email: "team@taxiassur.com"
        }
      ]);
    }

    return new Response(
      JSON.stringify({
        success: sent > 0,
        message: `${sent} emails sent successfully via IONOS SMTP port 465`,
        emails_sent: sent,
        emails_failed: 3 - sent,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("❌ Send notification error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});