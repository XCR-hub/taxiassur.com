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
    const { lead_id, temporary_password } = await req.json();

    if (!lead_id) {
      throw new Error("lead_id est requis");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: lead, error: leadError } = await supabase
      .from("crm_leads")
      .select("id, first_name, last_name, email, phone")
      .eq("id", lead_id)
      .maybeSingle();

    if (leadError || !lead) {
      throw new Error(`Lead introuvable: ${leadError?.message || "Aucune donnée"}`);
    }

    if (!lead.email) {
      throw new Error("Le lead n'a pas d'email");
    }

    const tempPassword = temporary_password || `TaxiAssur${Math.random().toString(36).substring(2, 10)}!`;

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; background: #f3f4f6; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center; color: white; }
    .header h1 { margin: 0 0 10px 0; font-size: 28px; }
    .content { padding: 40px 30px; }
    .welcome-box { background: #dbeafe; border-left: 4px solid #3b82f6; padding: 20px; margin: 25px 0; border-radius: 8px; }
    .credentials-box { background: #fef3c7; border: 2px solid #f59e0b; padding: 25px; border-radius: 12px; margin: 25px 0; }
    .credential-item { background: white; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #10b981; }
    .credential-label { color: #6b7280; font-size: 12px; text-transform: uppercase; margin-bottom: 5px; }
    .credential-value { color: #1f2937; font-weight: bold; font-size: 18px; font-family: 'Courier New', monospace; }
    .cta-button { background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; padding: 18px 35px; text-decoration: none; border-radius: 50px; display: inline-block; font-weight: bold; font-size: 16px; margin: 20px 0; }
    .features-grid { display: grid; gap: 15px; margin: 25px 0; }
    .feature-item { background: #f9fafb; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981; }
    .warning-box { background: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 8px; }
    .footer { background: #1f2937; color: white; padding: 30px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Bienvenue chez TaxiAssur !</h1>
      <p style="margin: 0; font-size: 18px;">Votre espace client est prêt</p>
    </div>
    <div class="content">
      <div class="welcome-box">
        <strong style="font-size: 18px;">Félicitations ${lead.first_name || ""} !</strong><br><br>
        Votre assurance taxi est maintenant active. Nous sommes ravis de vous compter parmi nos clients.
      </div>

      <h2 style="color: #1f2937; margin-top: 30px;">🔐 Vos identifiants de connexion</h2>

      <div class="credentials-box">
        <p style="margin-top: 0; color: #92400e; font-weight: bold;">Conservez ces informations en lieu sûr :</p>

        <div class="credential-item">
          <div class="credential-label">Adresse email</div>
          <div class="credential-value">${lead.email}</div>
        </div>

        <div class="credential-item">
          <div class="credential-label">Mot de passe temporaire</div>
          <div class="credential-value">${tempPassword}</div>
        </div>
      </div>

      <div class="warning-box">
        <strong>⚠️ Important :</strong> Pour des raisons de sécurité, vous devrez changer ce mot de passe lors de votre première connexion.
      </div>

      <div style="text-align: center; margin: 35px 0;">
        <a href="https://taxiassur.com/espace-client" class="cta-button">
          ACCÉDER À MON ESPACE CLIENT
        </a>
      </div>

      <h3 style="color: #1f2937;">✨ Que pouvez-vous faire dans votre espace client ?</h3>

      <div class="features-grid">
        <div class="feature-item">
          <strong>📄 Consulter vos documents</strong><br>
          Attestations, contrats, factures disponibles 24h/24
        </div>
        <div class="feature-item">
          <strong>🚨 Déclarer un sinistre</strong><br>
          Procédure simple et suivi en temps réel
        </div>
        <div class="feature-item">
          <strong>✏️ Modifier vos informations</strong><br>
          Mettez à jour vos coordonnées et véhicules
        </div>
        <div class="feature-item">
          <strong>💬 Contacter votre conseiller</strong><br>
          Messagerie sécurisée et assistance prioritaire
        </div>
        <div class="feature-item">
          <strong>💳 Gérer vos paiements</strong><br>
          Consultez vos échéances et modifiez votre RIB
        </div>
        <div class="feature-item">
          <strong>📊 Suivre vos prestations</strong><br>
          Historique complet de vos interactions
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
      <div style="font-size: 22px; font-weight: bold; color: #10b981; margin-bottom: 10px;">TaxiAssur</div>
      <p style="margin: 5px 0;">Courtier spécialisé en assurance taxi et VTC</p>
      <p style="margin-top: 15px; font-size: 12px; color: #9ca3af;">
        ORIAS 11 061 425 - Excellence Coverage Risks<br>
        Ce message vous est envoyé car vous êtes client chez TaxiAssur
      </p>
    </div>
  </div>
</body>
</html>`;

    await sendEmailSMTP(
      lead.email,
      `${lead.first_name || ""} ${lead.last_name || ""}`.trim() || "Client",
      "🎉 Bienvenue ! Vos accès à l'espace client TaxiAssur",
      emailHtml,
      "team@taxiassur.com",
      "TaxiAssur"
    );

    await supabase.from("crm_interactions").insert({
      lead_id: lead.id,
      type: "email",
      direction: "outbound",
      subject: "Envoi des accès espace client",
      content: `Email d'accès espace client envoyé avec mot de passe temporaire`,
      to_email: lead.email,
      from_email: "team@taxiassur.com",
    });

    console.log(`✅ Email d'accès client envoyé à ${lead.email}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email d'accès envoyé avec succès",
        temporary_password: tempPassword,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("❌ Erreur lors de l'envoi des accès client:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
