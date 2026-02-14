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
    console.log("Sending notification for lead via IONOS SMTP:", lead.lead_id);

    const prospectSpaceUrl = lead.access_token
      ? `https://taxiassur.com/espace-prospect?token=${lead.access_token}`
      : "https://taxiassur.com/espace-documents";

    // Email Commercial & Team - Amélioré
    const teamEmailHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.7; color: #1f2937; background: #f9fafb; margin: 0; padding: 20px; }
    .container { max-width: 650px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; padding: 40px 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 32px; font-weight: 700; letter-spacing: -0.5px; }
    .header p { margin: 12px 0 0 0; font-size: 16px; opacity: 0.95; }
    .content { padding: 40px 35px; }
    .alert-box { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-left: 5px solid #f59e0b; padding: 20px; margin: 0 0 30px 0; border-radius: 8px; box-shadow: 0 2px 8px rgba(245, 158, 11, 0.15); }
    .alert-box strong { font-size: 17px; color: #92400e; }
    h2 { color: #111827; margin: 0 0 25px 0; font-size: 22px; font-weight: 700; }
    .info-grid { display: grid; gap: 18px; margin: 0 0 35px 0; }
    .info-item { background: #f9fafb; padding: 18px 20px; border-radius: 10px; border: 1px solid #e5e7eb; transition: all 0.2s; }
    .info-item:hover { background: #f3f4f6; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
    .info-label { color: #6b7280; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
    .info-value { color: #111827; font-weight: 600; font-size: 18px; word-break: break-word; }
    .info-value a { color: inherit; text-decoration: none; }
    h3 { color: #111827; font-size: 18px; margin: 35px 0 15px 0; font-weight: 700; }
    ol { margin: 0; padding-left: 25px; }
    ol li { color: #374151; line-height: 2; font-size: 16px; margin-bottom: 8px; }
    ol li strong { color: #111827; }
    .cta-button { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 18px 40px; text-decoration: none; border-radius: 12px; display: inline-block; font-weight: 700; font-size: 16px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3); }
    .footer { background: #111827; color: #d1d5db; padding: 30px; text-align: center; font-size: 13px; line-height: 1.6; }
    .footer strong { color: #f3f4f6; font-size: 15px; }
    @media only screen and (max-width: 600px) {
      body { padding: 10px; }
      .header { padding: 30px 20px; }
      .header h1 { font-size: 26px; }
      .content { padding: 25px 20px; }
      .info-item { padding: 15px; }
      .info-value { font-size: 16px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚕 NOUVEAU LEAD</h1>
      <p>Action immédiate requise</p>
    </div>
    <div class="content">
      <div class="alert-box">
        <strong>⚡ URGENT :</strong> Contactez ce prospect dans les <strong>15 minutes maximum</strong>
      </div>
      <h2>📋 Informations du prospect</h2>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">👤 Nom complet</div>
          <div class="info-value">${lead.name}</div>
        </div>
        <div class="info-item">
          <div class="info-label">📞 Téléphone</div>
          <div class="info-value"><a href="tel:${lead.phone}">${lead.phone}</a></div>
        </div>
        <div class="info-item">
          <div class="info-label">📧 Email</div>
          <div class="info-value"><a href="mailto:${lead.email}">${lead.email}</a></div>
        </div>
        <div class="info-item">
          <div class="info-label">📍 Ville</div>
          <div class="info-value">${lead.city}</div>
        </div>
        ${lead.immatriculation ? `<div class="info-item"><div class="info-label">🚗 Immatriculation</div><div class="info-value">${lead.immatriculation}</div></div>` : ""}
      </div>
      <h3>✅ Actions à réaliser immédiatement</h3>
      <ol>
        <li>Appeler le prospect au <strong>${lead.phone}</strong></li>
        <li>Qualifier le besoin et confirmer les informations</li>
        <li>Demander les 7 documents obligatoires</li>
        <li>Préparer et envoyer le devis sous 24h</li>
      </ol>
      <div style="text-align: center; margin: 40px 0 0 0;">
        <a href="https://taxiassur.com/backoffice/crm-killer/pipeline" class="cta-button">OUVRIR LE CRM</a>
      </div>
    </div>
    <div class="footer">
      <strong>TaxiAssur CRM</strong><br>
      Notification automatique · Ne pas répondre à cet email
    </div>
  </div>
</body>
</html>`;

    // Email Prospect - Amélioré avec meilleure lisibilité
    const clientEmailHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.7; background: #f9fafb; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 45px 30px; text-align: center; color: white; }
    .header h1 { margin: 0 0 12px 0; font-size: 32px; font-weight: 700; }
    .header p { margin: 0; font-size: 18px; opacity: 0.95; }
    .content { padding: 40px 35px; }
    .success-box { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-left: 5px solid #f59e0b; padding: 22px; margin: 0 0 30px 0; border-radius: 10px; box-shadow: 0 2px 10px rgba(245, 158, 11, 0.15); }
    .success-box strong { color: #92400e; font-size: 17px; }
    h2 { color: #111827; font-size: 22px; margin: 0 0 20px 0; font-weight: 700; }
    .content > p { color: #374151; font-size: 16px; line-height: 1.8; margin: 0 0 18px 0; }
    .content > ul { color: #374151; font-size: 16px; line-height: 1.8; margin: 0 0 25px 0; padding-left: 25px; }
    .content > ul li { margin-bottom: 10px; }
    .content > ul li strong { color: #111827; }
    .docs-section { background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border: 3px solid #3b82f6; padding: 30px 25px; border-radius: 16px; margin: 30px 0; box-shadow: 0 4px 15px rgba(59, 130, 246, 0.15); }
    .docs-section h3 { color: #1e40af; margin: 0 0 20px 0; text-align: center; font-size: 20px; font-weight: 700; }
    .doc-item { background: white; padding: 14px 18px; margin: 10px 0; border-radius: 10px; border-left: 4px solid #10b981; font-size: 15px; color: #111827; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    .doc-item strong { font-weight: 700; margin-right: 8px; }
    .cta-section { text-align: center; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 30px 25px; border-radius: 16px; margin: 30px 0; }
    .cta-section p { color: #92400e; font-weight: 700; margin: 0 0 18px 0; font-size: 17px; }
    .cta-button { background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; padding: 18px 40px; text-decoration: none; border-radius: 50px; display: inline-block; font-weight: 700; font-size: 17px; box-shadow: 0 4px 15px rgba(249, 115, 22, 0.4); }
    .contact-box { background: #dbeafe; padding: 28px 25px; border-radius: 16px; margin: 30px 0; text-align: center; }
    .contact-box h3 { color: #1e40af; margin: 0 0 15px 0; font-size: 20px; font-weight: 700; }
    .contact-box p { margin: 12px 0; font-size: 16px; color: #1f2937; }
    .contact-box strong { font-size: 20px; color: #111827; }
    .contact-box a { color: #1e40af; text-decoration: none; font-weight: 600; }
    .footer { background: #111827; color: #d1d5db; padding: 35px 30px; text-align: center; }
    .footer .logo { font-size: 24px; font-weight: 700; color: #10b981; margin-bottom: 12px; }
    .footer p { margin: 8px 0; font-size: 14px; line-height: 1.6; }
    .footer .legal { font-size: 12px; margin-top: 15px; color: #9ca3af; }
    @media only screen and (max-width: 600px) {
      body { padding: 10px; }
      .header { padding: 35px 20px; }
      .header h1 { font-size: 26px; }
      .content { padding: 25px 20px; }
      .docs-section, .cta-section, .contact-box { padding: 20px 15px; }
      .cta-button { padding: 16px 30px; font-size: 16px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ DEMANDE REÇUE !</h1>
      <p>Bonjour ${lead.name}</p>
    </div>
    <div class="content">
      <div class="success-box">
        <strong>Excellente nouvelle !</strong><br>
        Votre demande de devis d'assurance taxi a été confirmée avec succès.
      </div>
      <h2>🎯 Prochaines étapes</h2>
      <ul>
        <li>Votre expert TaxiAssur vous recontacte <strong>sous 15 minutes</strong></li>
        <li>Analyse personnalisée de vos besoins</li>
        <li>Proposition des meilleures offres du marché</li>
        <li>Économies moyennes constatées : <strong>580 €/an</strong></li>
      </ul>
      <div class="docs-section">
        <h3>📄 7 Documents obligatoires</h3>
        <div class="doc-item"><strong>1.</strong> Licence de taxi professionnelle</div>
        <div class="doc-item"><strong>2.</strong> Permis de conduire (recto-verso)</div>
        <div class="doc-item"><strong>3.</strong> Pièce d'identité (CNI/passeport)</div>
        <div class="doc-item"><strong>4.</strong> Carte grise du véhicule</div>
        <div class="doc-item"><strong>5.</strong> Relevé d'information assureur</div>
        <div class="doc-item"><strong>6.</strong> Autorisation de stationnement</div>
        <div class="doc-item"><strong>7.</strong> RIB - Relevé d'Identité Bancaire</div>
      </div>
      <div class="cta-section">
        <p>📤 Uploadez vos documents maintenant !</p>
        <a href="${prospectSpaceUrl}" class="cta-button">ACCÉDER À MON ESPACE</a>
      </div>
      <div class="contact-box">
        <h3>💬 Besoin d'aide ?</h3>
        <p>
          <strong>📞 01 80 85 57 86</strong><br>
          <a href="mailto:team@taxiassur.com">📧 team@taxiassur.com</a>
        </p>
      </div>
    </div>
    <div class="footer">
      <div class="logo">TaxiAssur</div>
      <p>Courtier spécialisé en assurance taxi et VTC</p>
      <p class="legal">ORIAS 11 061 425 - Excellence Coverage Risks</p>
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

    console.log(`📧 Emails sent via IONOS SMTP: ${sent}/3`);

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
        message: `${sent} emails sent successfully via IONOS SMTP`,
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
