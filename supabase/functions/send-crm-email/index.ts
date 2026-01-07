import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EmailRequest {
  to_email: string;
  to_name: string;
  subject: string;
  content: string;
  lead_id?: string;
}

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
    const body = await req.json();
    const { to_email, to_name, subject, content, lead_id }: EmailRequest = body;

    if (!to_email || !subject || !content) {
      throw new Error("Champs obligatoires manquants");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let emailBody = `
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
            font-size: 28px;
            font-weight: 800;
          }
          .content {
            padding: 40px 30px;
          }
          .message-content {
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            border-left: 5px solid #3b82f6;
            padding: 25px;
            border-radius: 15px;
            margin: 25px 0;
            color: #1e293b;
            font-size: 16px;
            line-height: 1.8;
            white-space: pre-wrap;
          }
          .cta-section {
            text-align: center;
            margin: 35px 0;
            padding: 25px;
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            border-radius: 15px;
          }
          .cta-button {
            background: linear-gradient(135deg, #ec4899 0%, #db2777 100%);
            color: white;
            padding: 16px 36px;
            text-decoration: none;
            border-radius: 50px;
            display: inline-block;
            font-weight: 700;
            font-size: 16px;
            margin-top: 15px;
          }
          .contact-banner {
            background: linear-gradient(135deg, #a5f3fc 0%, #67e8f9 100%);
            border-radius: 15px;
            padding: 25px;
            text-align: center;
            margin: 25px 0;
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
            <h1>🚕 TaxiAssur</h1>
          </div>

          <div class="content">
            <h2 style="color: #1e293b; font-size: 24px; margin-bottom: 10px;">Bonjour ${to_name || ""},</h2>

            <div class="message-content">
              ${content.replace(/\n/g, '<br>')}
            </div>

            <div class="cta-section">
              <p style="color: #92400e; font-weight: 600; margin-bottom: 10px;">
                Vous avez une question ? Nous sommes là pour vous !
              </p>
              <a href="mailto:team@taxiassur.com" class="cta-button">
                💬 Répondre à ce message
              </a>
            </div>

            <div class="contact-banner">
              <h3 style="color: #164e63; font-size: 20px; margin-bottom: 15px;">📞 Restons en contact</h3>
              <p style="color: #164e63; font-weight: 600;">
                📧 team@taxiassur.com | 📞 01 80 85 57 86
              </p>
            </div>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb; color: #6b7280;">
              <p style="font-weight: 600; color: #374151;">Cordialement,</p>
              <p style="font-weight: 700; color: #10b981; font-size: 16px; margin-top: 5px;">L'équipe TaxiAssur</p>
            </div>
          </div>

          <div class="footer">
            <div style="font-size: 24px; font-weight: 800; color: #10b981; margin-bottom: 10px;">🚕 TaxiAssur</div>
            <p>© 2026 TaxiAssur - Tous droits réservés</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Créer le tracking
    const { data: emailRecord } = await supabase
      .from('email_sends')
      .insert({
        lead_id: lead_id || null,
        email_to: to_email,
        email_from: "team@taxiassur.com",
        subject: subject,
        body_html: emailBody,
        body_text: content,
        status: 'sent'
      })
      .select('tracking_id')
      .single();

    const trackingId = emailRecord?.tracking_id;

    // Ajouter le tracking
    if (trackingId) {
      emailBody = addLinkTracking(emailBody, trackingId, supabaseUrl);
      emailBody = addTrackingPixel(emailBody, trackingId, supabaseUrl);
    }

    console.log("📤 Envoi email CRM IONOS avec tracking:", trackingId);

    await sendEmailSMTP(
      to_email,
      to_name || "",
      subject,
      emailBody,
      "team@taxiassur.com",
      "TaxiAssur"
    );

    console.log("✅ Email CRM envoyé avec succès à", to_email);

    // Enregistrer l'interaction CRM
    if (lead_id) {
      await supabase.from('crm_interactions').insert({
        lead_id: lead_id,
        type: 'email',
        direction: 'outbound',
        subject: subject,
        content: content,
        to_email: to_email,
        from_email: 'team@taxiassur.com'
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email envoyé avec succès via IONOS avec tracking",
        to: to_email,
        tracking_id: trackingId
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );
  } catch (error) {
    console.error("❌ Error sending CRM email:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});