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

    const messageId = `<${Date.now()}.${Math.random().toString(36).substring(7)}@taxiassur.com>`;
    const date = new Date().toUTCString();

    const emailContent = [
      `From: "${fromName}" <${fromEmail}>`,
      `To: "${toName}" <${to}>`,
      `Subject: ${subject}`,
      `Date: ${date}`,
      `Message-ID: ${messageId}`,
      "MIME-Version: 1.0",
      "Content-Type: text/html; charset=UTF-8",
      "Content-Transfer-Encoding: 8bit",
      "X-Mailer: TaxiAssur Mail System",
      "X-Priority: 3",
      "Importance: Normal",
      "List-Unsubscribe: <mailto:team@taxiassur.com?subject=unsubscribe>",
      "Reply-To: team@taxiassur.com",
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

    // Email Prospect - Version optimisée anti-spam avec meilleure lisibilité
    const clientEmailHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <title>Demande confirmée - TaxiAssur</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; line-height: 1.6; background-color: #f5f5f5; color: #333333; }
    table { border-collapse: collapse; width: 100%; }
    img { max-width: 100%; height: auto; border: 0; }
    .wrapper { width: 100%; table-layout: fixed; background-color: #f5f5f5; padding: 20px 0; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #dddddd; }
    .header { background-color: #10b981; color: #ffffff; padding: 40px 30px; text-align: center; }
    .header h1 { font-size: 28px; font-weight: bold; margin-bottom: 10px; }
    .header p { font-size: 16px; }
    .content { padding: 30px; }
    .success-message { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 25px; }
    .success-message strong { color: #92400e; display: block; margin-bottom: 5px; font-size: 16px; }
    h2 { color: #111827; font-size: 20px; margin: 25px 0 15px 0; font-weight: bold; }
    .content p { color: #4b5563; font-size: 15px; line-height: 1.7; margin-bottom: 15px; }
    ul { margin: 0 0 20px 20px; padding: 0; }
    ul li { color: #4b5563; font-size: 15px; line-height: 1.8; margin-bottom: 8px; }
    ul li strong { color: #111827; font-weight: bold; }
    .docs-box { background-color: #eff6ff; border: 2px solid #3b82f6; padding: 20px; margin: 25px 0; }
    .docs-box h3 { color: #1e40af; font-size: 18px; text-align: center; margin-bottom: 15px; font-weight: bold; }
    .doc-list { background-color: #ffffff; padding: 15px; margin: 0; }
    .doc-list div { padding: 10px; margin: 5px 0; border-left: 3px solid #10b981; background-color: #f9fafb; font-size: 14px; color: #111827; }
    .cta-box { text-align: center; background-color: #fef3c7; padding: 25px; margin: 25px 0; }
    .cta-box p { color: #92400e; font-weight: bold; margin-bottom: 15px; font-size: 16px; }
    .cta-button { display: inline-block; background-color: #f97316; color: #ffffff; padding: 15px 35px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 16px; }
    .contact-box { background-color: #eff6ff; padding: 20px; text-align: center; margin: 25px 0; }
    .contact-box h3 { color: #1e40af; font-size: 18px; margin-bottom: 10px; font-weight: bold; }
    .contact-box p { font-size: 15px; color: #111827; margin: 8px 0; }
    .contact-box strong { font-size: 18px; color: #111827; }
    .contact-box a { color: #1e40af; text-decoration: none; font-weight: bold; }
    .footer { background-color: #1f2937; color: #d1d5db; padding: 25px; text-align: center; }
    .footer-logo { font-size: 20px; font-weight: bold; color: #10b981; margin-bottom: 10px; }
    .footer p { font-size: 13px; margin: 5px 0; line-height: 1.5; }
    .footer-legal { font-size: 11px; color: #9ca3af; margin-top: 10px; }
    @media only screen and (max-width: 600px) {
      .wrapper { padding: 10px 0; }
      .header { padding: 30px 20px; }
      .header h1 { font-size: 24px; }
      .content { padding: 20px; }
      .docs-box, .cta-box, .contact-box { padding: 15px; }
      .cta-button { padding: 12px 25px; font-size: 15px; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <table class="container" role="presentation">
      <tr>
        <td class="header">
          <h1>Demande confirmée</h1>
          <p>Bonjour ${lead.name}</p>
        </td>
      </tr>
      <tr>
        <td class="content">
          <div class="success-message">
            <strong>Votre demande a été enregistrée avec succès</strong>
            Nous avons bien reçu votre demande de devis d'assurance taxi.
          </div>

          <h2>Ce qui va se passer maintenant</h2>
          <ul>
            <li>Un expert TaxiAssur vous contacte <strong>dans les 15 minutes</strong></li>
            <li>Nous analysons vos besoins spécifiques</li>
            <li>Vous recevez les meilleures offres du marché</li>
            <li>Économies moyennes : <strong>580 euros par an</strong></li>
          </ul>

          <div class="docs-box">
            <h3>Documents nécessaires (7 au total)</h3>
            <div class="doc-list">
              <div><strong>1.</strong> Licence de taxi professionnelle</div>
              <div><strong>2.</strong> Permis de conduire (recto et verso)</div>
              <div><strong>3.</strong> Pièce d'identité (carte d'identité ou passeport)</div>
              <div><strong>4.</strong> Carte grise du véhicule</div>
              <div><strong>5.</strong> Relevé d'information de votre assureur actuel</div>
              <div><strong>6.</strong> Autorisation de stationnement (si applicable)</div>
              <div><strong>7.</strong> RIB - Relevé d'Identité Bancaire</div>
            </div>
          </div>

          <div class="cta-box">
            <p>Déposez vos documents en ligne dès maintenant</p>
            <a href="${prospectSpaceUrl}" class="cta-button">Accéder à mon espace</a>
          </div>

          <div class="contact-box">
            <h3>Une question ?</h3>
            <p>
              <strong>Téléphone : 01 80 85 57 86</strong><br>
              <a href="mailto:team@taxiassur.com">Email : team@taxiassur.com</a>
            </p>
          </div>
        </td>
      </tr>
      <tr>
        <td class="footer">
          <div class="footer-logo">TaxiAssur</div>
          <p>Courtier spécialisé en assurance taxi et VTC</p>
          <p class="footer-legal">ORIAS 11 061 425 - Excellence Coverage Risks</p>
        </td>
      </tr>
    </table>
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
