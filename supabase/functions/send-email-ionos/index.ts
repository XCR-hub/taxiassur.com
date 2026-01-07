import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface LeadPayload {
  type: "INSERT";
  table: string;
  record: {
    id: string;
    name: string;
    phone: string;
    email: string;
    city: string;
    status: string;
    immatriculation?: string;
    access_token?: string;
    created_at: string;
  };
}

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
  const SMTP_HOST = "smtp.ionos.fr";
  const SMTP_PORT = 587;
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

  async function sendCommand(command: string): Promise<string> {
    await conn.write(encoder.encode(command + "\r\n"));
    return await readResponse();
  }

  try {
    await readResponse();
    await sendCommand(`EHLO taxiassur.com`);
    await sendCommand("STARTTLS");

    const tlsConn = await Deno.startTls(conn, { hostname: SMTP_HOST });

    async function readResponseTLS(): Promise<string> {
      const buffer = new Uint8Array(1024);
      const n = await tlsConn.read(buffer);
      if (n === null) return "";
      return decoder.decode(buffer.subarray(0, n));
    }

    async function sendCommandTLS(command: string): Promise<string> {
      await tlsConn.write(encoder.encode(command + "\r\n"));
      return await readResponseTLS();
    }

    await sendCommandTLS(`EHLO taxiassur.com`);
    await sendCommandTLS("AUTH LOGIN");
    await sendCommandTLS(base64Encode(SMTP_USER));
    await sendCommandTLS(base64Encode(SMTP_PASS));
    await sendCommandTLS(`MAIL FROM:<${fromEmail}>`);
    await sendCommandTLS(`RCPT TO:<${to}>`);
    await sendCommandTLS("DATA");

    const emailContent = [
      `From: ${fromName} <${fromEmail}>`,
      `To: ${toName} <${to}>`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: 8bit`,
      ``,
      htmlBody,
      `.`,
    ].join("\r\n");

    await sendCommandTLS(emailContent);
    await sendCommandTLS("QUIT");
    tlsConn.close();
  } catch (error) {
    conn.close();
    throw error;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const payload: LeadPayload = await req.json();
    const lead = payload.record;

    const teamEmailBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: #f3f4f6; }
          .container { max-width: 650px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 25px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
          .alert-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
          .info-item { background: #f9fafb; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb; }
          .info-label { color: #6b7280; font-size: 12px; text-transform: uppercase; margin-bottom: 5px; }
          .info-value { color: #1f2937; font-weight: bold; font-size: 16px; }
          .cta-button { background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; margin: 20px 0; text-align: center; }
          .footer { background: #1f2937; color: white; padding: 20px; text-align: center; font-size: 12px; border-radius: 0 0 10px 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 32px;">🎯 NOUVEAU LEAD</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Traitement prioritaire requis</p>
          </div>

          <div class="content">
            <div class="alert-box">
              <strong>⚡ ACTION REQUISE :</strong> Contactez ce prospect dans les <strong>15 minutes</strong>
            </div>

            <h2 style="color: #1f2937; margin-top: 0;">Informations du prospect</h2>

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
                <div class="info-value"><a href="mailto:${lead.email}" style="color: #3b82f6; text-decoration: none; font-size: 14px;">${lead.email}</a></div>
              </div>

              <div class="info-item">
                <div class="info-label">📍 Ville</div>
                <div class="info-value">${lead.city}</div>
              </div>

              <div class="info-item">
                <div class="info-label">👤 Statut professionnel</div>
                <div class="info-value">${lead.status}</div>
              </div>

              ${lead.immatriculation ? `
              <div class="info-item">
                <div class="info-label">🚗 Immatriculation</div>
                <div class="info-value">${lead.immatriculation}</div>
              </div>
              ` : ""}

              <div class="info-item">
                <div class="info-label">⏰ Date de demande</div>
                <div class="info-value">${new Date(lead.created_at).toLocaleString("fr-FR", {
                  dateStyle: "short",
                  timeStyle: "short"
                })}</div>
              </div>

              <div class="info-item">
                <div class="info-label">🆔 ID Lead</div>
                <div class="info-value" style="font-size: 12px; font-family: monospace;">${lead.id}</div>
              </div>
            </div>

            <h3 style="color: #1f2937;">📋 Prochaines actions</h3>
            <ol style="color: #4b5563; line-height: 1.8;">
              <li>☎️ Appeler le prospect au <strong>${lead.phone}</strong></li>
              <li>✅ Qualifier le besoin et confirmer les informations</li>
              <li>📄 Vérifier l'envoi des 7 documents requis</li>
              <li>💰 Préparer et envoyer le devis sous 24h</li>
            </ol>

            <div style="text-align: center; margin: 30px 0;">
              <a href="https://taxiassur.com/backoffice/crm-commercial" class="cta-button">
                📊 OUVRIR LE CRM
              </a>
            </div>
          </div>

          <div class="footer">
            <strong>TaxiAssur CRM</strong><br>
            Notification automatique via IONOS SMTP
          </div>
        </div>
      </body>
      </html>
    `;

    const clientEmailBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            line-height: 1.6;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
          }
          .email-wrapper {
            max-width: 680px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          }
          .header {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            padding: 40px 30px;
            text-align: center;
          }
          .header h1 {
            color: white;
            font-size: 32px;
            font-weight: 800;
            margin-bottom: 10px;
          }
          .header .subtitle {
            color: #d1fae5;
            font-size: 20px;
            font-weight: 600;
          }
          .content {
            padding: 40px 30px;
          }
          .success-banner {
            background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
            color: white;
            padding: 25px;
            border-radius: 15px;
            margin: 25px 0;
            text-align: center;
          }
          .documents-section {
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            border: 3px solid #3b82f6;
            padding: 30px;
            border-radius: 20px;
            margin: 30px 0;
          }
          .document-item {
            background: white;
            padding: 15px;
            margin: 10px 0;
            border-radius: 12px;
            border-left: 5px solid #10b981;
          }
          .cta-button {
            background: linear-gradient(135deg, #ec4899 0%, #db2777 100%);
            color: white;
            padding: 18px 40px;
            text-decoration: none;
            border-radius: 50px;
            display: inline-block;
            font-weight: 700;
            font-size: 18px;
          }
          .footer {
            background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
            color: white;
            padding: 30px;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="header">
            <h1>✅ DEMANDE REÇUE !</h1>
            <div class="subtitle">Félicitations ${lead.name} !</div>
          </div>

          <div class="content">
            <h2 style="color: #1e293b; font-size: 24px; margin-bottom: 15px;">Merci pour votre confiance</h2>
            <p style="color: #475569; font-size: 16px; margin-bottom: 20px;">
              Nous avons bien reçu votre demande de devis pour une <strong style="color: #10b981;">assurance taxi à ${lead.city}</strong>.
            </p>

            <div class="success-banner">
              <strong>⏱️ Réponse rapide garantie</strong><br>
              Notre expert vous contacte dans les <strong>15 minutes</strong> au <strong>${lead.phone}</strong>
            </div>

            <div class="documents-section">
              <h3 style="color: #1e40af; font-size: 24px; margin-bottom: 20px; text-align: center;">📋 Documents requis</h3>

              <div class="document-item">
                <strong>1. 📜 Licence de taxi professionnelle</strong>
              </div>
              <div class="document-item">
                <strong>2. 🪪 Permis de conduire</strong>
              </div>
              <div class="document-item">
                <strong>3. 🆔 Pièce d'identité</strong>
              </div>
              <div class="document-item">
                <strong>4. 🚗 Carte grise du véhicule</strong>
              </div>
              <div class="document-item">
                <strong>5. 📊 Relevé d'information</strong>
              </div>
              <div class="document-item">
                <strong>6. 🅿️ Autorisation de stationnement</strong>
              </div>
              <div class="document-item">
                <strong>7. 🏦 RIB - Relevé d'Identité Bancaire</strong>
              </div>
            </div>

            <div style="text-align: center; padding: 30px; background: #fef3c7; border-radius: 20px; margin: 30px 0;">
              <p style="color: #92400e; font-weight: 700; margin-bottom: 20px; font-size: 18px;">
                Uploadez vos documents maintenant !
              </p>
              <a href="https://taxiassur.com/espace-documents?token=${lead.access_token}" class="cta-button">
                📤 UPLOADER MES DOCUMENTS
              </a>
            </div>

            <div style="background: #dbeafe; padding: 25px; border-radius: 15px; margin: 25px 0;">
              <h3 style="color: #164e63; font-size: 22px; margin-bottom: 15px; text-align: center;">📞 Besoin d'aide ?</h3>
              <p style="text-align: center; color: #164e63; font-weight: 600;">
                📞 <a href="tel:0180855786" style="color: #164e63; text-decoration: none;">01 80 85 57 86</a><br>
                📧 <a href="mailto:team@taxiassur.com" style="color: #164e63; text-decoration: none;">team@taxiassur.com</a>
              </p>
            </div>
          </div>

          <div class="footer">
            <div style="font-size: 26px; font-weight: 800; color: #10b981; margin-bottom: 10px;">🚕 TaxiAssur</div>
            <p><strong>Courtier spécialisé en assurance taxi et VTC</strong></p>
            <p style="margin-top: 15px;">01 80 85 57 86 | team@taxiassur.com</p>
            <p style="margin-top: 10px;">© 2026 TaxiAssur - Tous droits réservés</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await sendEmailSMTP(
      "team@taxiassur.com",
      "Équipe TaxiAssur",
      `🎯 Nouveau Lead : ${lead.name} - ${lead.city}`,
      teamEmailBody,
      "team@taxiassur.com",
      "TaxiAssur Notifications"
    );

    console.log(`✅ Email équipe envoyé pour lead ${lead.id}`);

    await sendEmailSMTP(
      lead.email,
      lead.name,
      "Votre demande de devis assurance taxi",
      clientEmailBody,
      "team@taxiassur.com",
      "TaxiAssur"
    );

    console.log(`✅ Email client envoyé pour lead ${lead.id}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    await supabase.from('crm_interactions').insert([
      {
        lead_id: lead.id,
        type: 'email',
        direction: 'outbound',
        subject: `🎯 Nouveau Lead : ${lead.name} - ${lead.city}`,
        content: 'Email de notification interne envoyé à l\'équipe via IONOS SMTP',
        to_email: 'team@taxiassur.com',
        from_email: 'team@taxiassur.com'
      },
      {
        lead_id: lead.id,
        type: 'email',
        direction: 'outbound',
        subject: 'Votre demande de devis assurance taxi',
        content: 'Email de confirmation envoyé au prospect via IONOS SMTP',
        to_email: lead.email,
        from_email: 'team@taxiassur.com'
      }
    ]);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Emails sent via IONOS SMTP",
        lead_id: lead.id
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending email via IONOS:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
        details: error.toString()
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});