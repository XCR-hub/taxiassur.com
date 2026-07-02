import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function base64Encode(str: string): string {
  return btoa(str);
}

async function sendEmailSMTP(
  to: string,
  toName: string,
  subject: string,
  htmlBody: string,
  fromEmail: string = "team@taxiassur.com",
  fromName: string = "TaxiAssur"
): Promise<void> {
  const SMTP_HOST = Deno.env.get("SMTP_HOST") || Deno.env.get("HMAIL_SMTP_HOST") || Deno.env.get("IONOS_SMTP_HOST") || "mail.xcr.fr";
  const SMTP_PORT = parseInt(Deno.env.get("SMTP_PORT") || Deno.env.get("HMAIL_SMTP_PORT") || Deno.env.get("IONOS_SMTP_PORT") || "587");
  const SMTP_USER = Deno.env.get("SMTP_USER") || Deno.env.get("HMAIL_SMTP_USER") || Deno.env.get("IONOS_EMAIL_USER") || "tcerda@xcr.fr";
  const SMTP_PASS = Deno.env.get("SMTP_PASS") || Deno.env.get("HMAIL_SMTP_PASS") || Deno.env.get("IONOS_EMAIL_PASSWORD") || Deno.env.get("IONOS_SMTP_PASSWORD");
  const SMTP_SECURITY = (Deno.env.get("SMTP_SECURITY") || Deno.env.get("HMAIL_SMTP_SECURITY") || Deno.env.get("IONOS_SMTP_SECURITY") || (SMTP_PORT === 465 ? "ssl" : "starttls")).toLowerCase();

  if (!SMTP_PASS) {
    console.error("⚠️ IONOS_EMAIL_PASSWORD not configured in Supabase secrets");
    throw new Error("Configuration email IONOS manquante. Veuillez contacter l'administrateur.");
  }

  console.log(`📧 Tentative envoi email SMTP vers ${to} via ${SMTP_HOST}:${SMTP_PORT}`);

  let conn: any = SMTP_SECURITY === "ssl"
    ? await Deno.connectTls({ hostname: SMTP_HOST, port: SMTP_PORT })
    : await Deno.connect({ hostname: SMTP_HOST, port: SMTP_PORT });

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
    if (SMTP_SECURITY === "starttls" || SMTP_SECURITY === "tls") {
      const startTlsResponse = await sendCommand("STARTTLS");
      if (!startTlsResponse.startsWith("220")) throw new Error("SMTP STARTTLS failed");
      conn = await Deno.startTls(conn, { hostname: SMTP_HOST });
      await sendCommand(`EHLO ${SMTP_HOST}`);
    }
    await sendCommand(`AUTH LOGIN`);
    await sendCommand(base64Encode(SMTP_USER));
    await sendCommand(base64Encode(SMTP_PASS));
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
    const { lead_id, payment_url, amount, email, first_name, last_name } = await req.json();

    if (!payment_url || !amount) {
      throw new Error("payment_url et amount sont requis");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Récupérer les données du lead si non fournies
    let leadEmail = email;
    let leadFirstName = first_name;
    let leadLastName = last_name;

    if (!leadEmail) {
      const { data: lead, error: leadError } = await supabase
        .from("crm_leads")
        .select("email, first_name, last_name")
        .eq("id", lead_id)
        .maybeSingle();

      if (leadError || !lead) {
        throw new Error(`Lead introuvable: ${leadError?.message || "Aucune donnée"}`);
      }

      leadEmail = lead.email;
      leadFirstName = lead.first_name;
      leadLastName = lead.last_name;
    }

    if (!leadEmail) {
      throw new Error("Email du lead introuvable");
    }

    const formattedAmount = new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; background: #f3f4f6; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 40px 30px; text-align: center; color: white; }
    .header h1 { margin: 0 0 10px 0; font-size: 28px; }
    .content { padding: 40px 30px; }
    .info-box { background: #dbeafe; border-left: 4px solid #3b82f6; padding: 20px; margin: 25px 0; border-radius: 8px; }
    .payment-box { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 3px solid #f59e0b; padding: 30px; border-radius: 16px; margin: 30px 0; text-align: center; box-shadow: 0 4px 15px rgba(245,158,11,0.3); }
    .amount-display { background: white; padding: 20px; border-radius: 12px; margin: 20px 0; border: 2px solid #f59e0b; }
    .amount-value { color: #ea580c; font-weight: bold; font-size: 36px; font-family: 'Courier New', monospace; }
    .cta-button { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 20px 45px; text-decoration: none; border-radius: 50px; display: inline-block; font-weight: bold; font-size: 18px; margin: 20px 0; box-shadow: 0 4px 15px rgba(16,185,129,0.4); transition: all 0.3s; }
    .cta-button:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(16,185,129,0.5); }
    .warning-box { background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 8px; }
    .steps-box { background: #f9fafb; padding: 25px; border-radius: 12px; margin: 25px 0; }
    .step-item { display: flex; align-items: start; margin: 15px 0; }
    .step-number { background: #10b981; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 15px; flex-shrink: 0; }
    .security-badges { display: flex; justify-content: center; gap: 20px; margin: 25px 0; flex-wrap: wrap; }
    .security-badge { background: #f0fdf4; border: 2px solid #10b981; padding: 12px 20px; border-radius: 8px; font-size: 13px; color: #065f46; font-weight: bold; }
    .footer { background: #1f2937; color: white; padding: 30px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>💳 Paiement de votre comptant</h1>
      <p style="margin: 0; font-size: 18px;">Dernière étape pour lancer votre contrat</p>
    </div>
    <div class="content">
      <div class="info-box">
        <strong style="font-size: 18px;">Bonjour ${leadFirstName || ""} !</strong><br><br>
        Votre dossier est prêt ! Il ne reste plus qu'à régler le comptant pour activer immédiatement votre assurance taxi.
      </div>

      <div class="payment-box">
        <h2 style="margin-top: 0; color: #92400e; font-size: 24px;">💰 Montant à régler</h2>

        <div class="amount-display">
          <div style="color: #6b7280; font-size: 14px; margin-bottom: 10px;">Comptant d'assurance</div>
          <div class="amount-value">${formattedAmount}</div>
          <div style="color: #6b7280; font-size: 12px; margin-top: 10px;">Paiement sécurisé en ligne</div>
        </div>

        <div style="margin: 30px 0;">
          <a href="${payment_url}" class="cta-button" style="text-decoration: none;">
            🚀 PAYER MAINTENANT
          </a>
        </div>

        <p style="margin: 0; font-size: 14px; color: #92400e;">
          ⚡ Activation instantanée après paiement
        </p>
      </div>

      <div class="steps-box">
        <h3 style="margin-top: 0; color: #1f2937;">📋 Que se passe-t-il après le paiement ?</h3>

        <div class="step-item">
          <div class="step-number">1</div>
          <div>
            <strong>Paiement sécurisé</strong><br>
            <span style="color: #6b7280; font-size: 14px;">Transaction cryptée via Monetico (CIC)</span>
          </div>
        </div>

        <div class="step-item">
          <div class="step-number">2</div>
          <div>
            <strong>Activation immédiate</strong><br>
            <span style="color: #6b7280; font-size: 14px;">Votre contrat est activé en quelques secondes</span>
          </div>
        </div>

        <div class="step-item">
          <div class="step-number">3</div>
          <div>
            <strong>Réception des documents</strong><br>
            <span style="color: #6b7280; font-size: 14px;">Attestation et contrat envoyés par email</span>
          </div>
        </div>

        <div class="step-item">
          <div class="step-number">4</div>
          <div>
            <strong>Vous pouvez rouler !</strong><br>
            <span style="color: #6b7280; font-size: 14px;">Couverture effective immédiatement</span>
          </div>
        </div>
      </div>

      <div class="security-badges">
        <div class="security-badge">🔒 Paiement 100% sécurisé</div>
        <div class="security-badge">✅ Conforme PCI-DSS</div>
        <div class="security-badge">🏦 CIC Monetico</div>
      </div>

      <div class="warning-box">
        <strong>⚠️ Important :</strong> Ce lien de paiement est personnel et sécurisé. Il reste valide pendant 7 jours.
      </div>

      <div style="background: #dbeafe; padding: 20px; border-radius: 12px; margin: 30px 0; text-align: center;">
        <h3 style="color: #1e40af; margin-top: 0;">💬 Besoin d'aide ?</h3>
        <p style="margin: 10px 0; color: #1f2937;">
          <strong>📞 01 80 85 57 86</strong><br>
          <a href="mailto:team@taxiassur.com" style="color: #1e40af;">📧 team@taxiassur.com</a>
        </p>
        <p style="margin: 0; font-size: 14px; color: #6b7280;">
          Notre équipe est disponible du lundi au vendredi, 9h-18h
        </p>
      </div>
    </div>
    <div class="footer">
      <div style="font-size: 22px; font-weight: bold; color: #10b981; margin-bottom: 10px;">TaxiAssur</div>
      <p style="margin: 5px 0;">Courtier spécialisé en assurance taxi et VTC</p>
      <p style="margin-top: 15px; font-size: 12px; color: #9ca3af;">
        ORIAS 11 061 425 - Excellence Coverage Risks<br>
        Ce message vous est envoyé car vous avez souscrit une assurance chez TaxiAssur
      </p>
    </div>
  </div>
</body>
</html>`;

    await sendEmailSMTP(
      leadEmail,
      `${leadFirstName || ""} ${leadLastName || ""}`.trim() || "Client",
      `💳 Paiement de votre comptant - ${formattedAmount}`,
      emailHtml,
      "team@taxiassur.com",
      "TaxiAssur"
    );

    // Enregistrer l'interaction seulement si c'est lié à un lead
    if (lead_id) {
      await supabase.from("crm_interactions").insert({
        lead_id: lead_id,
        type: "email",
        direction: "outbound",
        subject: `Envoi lien de paiement comptant ${formattedAmount}`,
        content: `Email de paiement envoyé avec lien sécurisé Monetico pour ${formattedAmount}`,
        to_email: leadEmail,
        from_email: "team@taxiassur.com",
      });
    }

    console.log(`✅ Email de paiement envoyé à ${leadEmail} pour ${formattedAmount}${lead_id ? ` (Lead: ${lead_id})` : ' (Facturation libre)'}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email de paiement envoyé avec succès",
        payment_url: payment_url,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("❌ Erreur lors de l'envoi de l'email de paiement:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
