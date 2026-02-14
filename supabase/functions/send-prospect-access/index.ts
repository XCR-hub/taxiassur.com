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
    const { lead_id, email, first_name, last_name, access_token } = await req.json();

    if (!lead_id) {
      throw new Error("lead_id est requis");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Récupérer les infos du lead
    const { data: lead, error: leadError } = await supabase
      .from("crm_leads")
      .select("id, first_name, last_name, email, access_token")
      .eq("id", lead_id)
      .maybeSingle();

    if (leadError || !lead) {
      throw new Error(`Lead introuvable: ${leadError?.message || "Aucune donnée"}`);
    }

    if (!lead.email) {
      throw new Error("Le lead n'a pas d'email");
    }

    if (!lead.access_token) {
      throw new Error("Le lead n'a pas de token d'accès");
    }

    // Lien d'accès à l'espace prospect
    const prospectSpaceLink = `https://taxiassur.com/espace-prospect/${lead.access_token}`;

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; background: #f3f4f6; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 30px; text-align: center; color: white; }
    .header h1 { margin: 0 0 10px 0; font-size: 28px; }
    .content { padding: 40px 30px; }
    .welcome-box { background: #dbeafe; border-left: 4px solid #3b82f6; padding: 20px; margin: 25px 0; border-radius: 8px; }
    .link-box { background: #fef3c7; border: 2px solid #f59e0b; padding: 25px; border-radius: 12px; margin: 25px 0; text-align: center; }
    .cta-button { background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; padding: 18px 35px; text-decoration: none; border-radius: 50px; display: inline-block; font-weight: bold; font-size: 16px; margin: 20px 0; }
    .features-grid { display: grid; gap: 15px; margin: 25px 0; }
    .feature-item { background: #f9fafb; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; }
    .info-box { background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 8px; }
    .footer { background: #1f2937; color: white; padding: 30px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📋 Votre Espace Prospect TaxiAssur</h1>
      <p style="margin: 0; font-size: 18px;">Finalisez votre dossier en ligne</p>
    </div>
    <div class="content">
      <div class="welcome-box">
        <strong style="font-size: 18px;">Bonjour ${lead.first_name || ""} !</strong><br><br>
        Votre espace prospect est prêt. Vous pouvez maintenant uploader vos documents et suivre l'avancement de votre dossier d'assurance taxi.
      </div>

      <h2 style="color: #1f2937; margin-top: 30px;">🔐 Accès sécurisé à votre espace</h2>

      <div class="link-box">
        <p style="margin-top: 0; color: #92400e; font-weight: bold;">Cliquez sur le bouton ci-dessous pour accéder :</p>

        <div style="margin: 25px 0;">
          <a href="${prospectSpaceLink}" class="cta-button" style="text-decoration: none;">
            📄 ACCÉDER À MON ESPACE PROSPECT
          </a>
        </div>

        <p style="margin: 0; font-size: 14px; color: #92400e;">
          Ce lien est personnel et sécurisé.
        </p>
      </div>

      <h3 style="color: #1f2937;">✨ Que pouvez-vous faire dans votre espace prospect ?</h3>

      <div class="features-grid">
        <div class="feature-item">
          <strong>📤 Uploader vos documents</strong><br>
          Licence taxi, permis, carte grise, pièce d'identité...
        </div>
        <div class="feature-item">
          <strong>📊 Suivre votre dossier</strong><br>
          Progression en temps réel de votre demande
        </div>
        <div class="feature-item">
          <strong>💰 Recevoir vos devis</strong><br>
          Comparez les offres des meilleures compagnies
        </div>
        <div class="feature-item">
          <strong>✍️ Signer en ligne</strong><br>
          Signature électronique sécurisée
        </div>
        <div class="feature-item">
          <strong>💳 Payer en ligne</strong><br>
          Paiement comptant sécurisé par Monetico
        </div>
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
      <div style="font-size: 22px; font-weight: bold; color: #f59e0b; margin-bottom: 10px;">TaxiAssur</div>
      <p style="margin: 5px 0;">Courtier spécialisé en assurance taxi et VTC</p>
      <p style="margin-top: 15px; font-size: 12px; color: #9ca3af;">
        ORIAS 11 061 425 - Excellence Coverage Risks<br>
        Ce message vous est envoyé suite à votre demande de devis
      </p>
    </div>
  </div>
</body>
</html>`;

    await sendEmailSMTP(
      lead.email,
      `${lead.first_name || ""} ${lead.last_name || ""}`.trim() || "Prospect",
      "📋 Accédez à votre espace prospect TaxiAssur",
      emailHtml,
      "team@taxiassur.com",
      "TaxiAssur"
    );

    await supabase.from("crm_interactions").insert({
      lead_id: lead.id,
      type: "email",
      direction: "outbound",
      subject: "Envoi accès espace prospect",
      content: `Email d'accès espace prospect envoyé avec lien : ${prospectSpaceLink}`,
      to_email: lead.email,
      from_email: "team@taxiassur.com",
    });

    console.log(`✅ Email d'accès prospect envoyé à ${lead.email}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email d'accès prospect envoyé avec succès",
        prospect_space_link: prospectSpaceLink,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("❌ Erreur lors de l'envoi de l'accès prospect:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
