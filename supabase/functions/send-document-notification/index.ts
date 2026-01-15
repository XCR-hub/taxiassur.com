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

function addLinkTracking(html: string, trackingId: string, supabaseUrl: string): string {
  const urlRegex = /href="([^"]+)"/gi;
  return html.replace(urlRegex, (match, url) => {
    if (url.startsWith('mailto:') || url.startsWith('tel:') || url.startsWith('#')) {
      return match;
    }
    const trackedUrl = `${supabaseUrl}/functions/v1/track-email-click?id=${trackingId}&url=${encodeURIComponent(url)}`;
    return `href="${trackedUrl}"`;
  });
}

function addTrackingPixel(html: string, trackingId: string, supabaseUrl: string): string {
  const pixelUrl = `${supabaseUrl}/functions/v1/track-email-open?id=${trackingId}`;
  const pixel = `<img src="${pixelUrl}" width="1" height="1" style="display:none;" alt="" />`;
  if (html.includes('</body>')) {
    return html.replace('</body>', `${pixel}</body>`);
  }
  return html + pixel;
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
  const SMTP_PORT = parseInt(Deno.env.get("IONOS_SMTP_PORT") || "465");
  const SMTP_USER = Deno.env.get("IONOS_EMAIL_USER") || "team@taxiassur.com";
  const SMTP_PASS = Deno.env.get("IONOS_EMAIL_PASSWORD");

  if (!SMTP_PASS) throw new Error("IONOS_EMAIL_PASSWORD not configured");

  const conn = await Deno.connect({ hostname: SMTP_HOST, port: SMTP_PORT });
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  async function readResponse(): Promise<string> {
    const buffer = new Uint8Array(1024);
    const n = await conn.read(buffer);
    return n === null ? "" : decoder.decode(buffer.subarray(0, n));
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
      return n === null ? "" : decoder.decode(buffer.subarray(0, n));
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
    const payload = await req.json();
    const document = payload.record;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: lead } = await supabase
      .from('leads')
      .select('name, email, phone, city')
      .eq('id', document.lead_id)
      .single();

    if (!lead) throw new Error("Lead not found");

    const documentTypes: Record<string, string> = {
      licence_taxi: "Licence de taxi professionnelle",
      permis_conduire: "Permis de conduire",
      piece_identite: "Pièce d'identité",
      carte_grise: "Carte grise du véhicule",
      releve_information: "Relevé d'information",
      autorisation_stationnement: "Autorisation de stationnement",
      rib: "RIB - Relevé d'Identité Bancaire",
    };

    const documentTypeName = documentTypes[document.document_type] || document.document_type;

    let emailBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; background: #f3f4f6; padding: 20px; }
          .container { max-width: 650px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; }
          .alert { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
          .document-badge { background: #3b82f6; color: white; padding: 10px 20px; border-radius: 20px; display: inline-block; margin: 15px 0; }
          .info-box { background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .cta-button { background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; margin-top: 20px; }
          .footer { background: #1f2937; color: white; padding: 20px; text-align: center; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 28px;">📄 NOUVEAU DOCUMENT REÇU</h1>
            <p style="margin: 10px 0 0 0;">Notification TaxiAssur</p>
          </div>
          
          <div class="content">
            <div class="alert">
              <strong>⚡ DOCUMENT UPLOADÉ :</strong> Un nouveau document vient d'être déposé
            </div>
            
            <h2 style="color: #1f2937; margin-top: 0;">Informations du document</h2>
            
            <div class="document-badge">
              📄 ${documentTypeName}
            </div>
            
            <div class="info-box">
              <p><strong>Prospect :</strong> ${lead.name}</p>
              <p><strong>Email :</strong> ${lead.email}</p>
              <p><strong>Téléphone :</strong> ${lead.phone}</p>
              <p><strong>Ville :</strong> ${lead.city}</p>
              <p><strong>Nom du fichier :</strong> ${document.file_name}</p>
              <p><strong>Taille :</strong> ${(document.file_size / 1024).toFixed(2)} KB</p>
            </div>
            
            <h3 style="color: #1f2937;">📊 Prochaines actions</h3>
            <ol style="color: #4b5563; line-height: 1.8;">
              <li>🔍 Vérifier la validité du document</li>
              <li>✅ Valider dans le CRM si conforme</li>
              <li>📧 Contacter le prospect si nécessaire</li>
              <li>📝 Mettre à jour le dossier</li>
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

    // Créer le tracking
    const { data: emailRecord } = await supabase
      .from('email_sends')
      .insert({
        lead_id: document.lead_id,
        email_to: 'team@taxiassur.com',
        email_from: 'team@taxiassur.com',
        subject: `📄 Nouveau document : ${documentTypeName} - ${lead.name}`,
        body_html: emailBody,
        status: 'sent'
      })
      .select('tracking_id')
      .single();

    const trackingId = emailRecord?.tracking_id;

    if (trackingId) {
      emailBody = addLinkTracking(emailBody, trackingId, supabaseUrl);
      emailBody = addTrackingPixel(emailBody, trackingId, supabaseUrl);
    }

    await sendEmailSMTP(
      'team@taxiassur.com',
      'Équipe TaxiAssur',
      `📄 Nouveau document : ${documentTypeName} - ${lead.name}`,
      emailBody,
      'team@taxiassur.com',
      'TaxiAssur Notifications'
    );

    console.log(`✅ Email notification document envoyé pour ${lead.name}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Notification envoyée",
        tracking_id: trackingId
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("❌ Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});