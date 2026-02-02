import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface Attachment {
  filename: string;
  path?: string;     // Pour documents légaux (chemin local)
  url?: string;      // Pour documents lead/custom (URL publique)
  type: 'legal' | 'lead_document' | 'custom';
}

interface EmailRequest {
  to: string;
  subject: string;
  body: string;
  lead_id?: string;
  attachments?: Attachment[];
}

// Fonction pour télécharger un fichier depuis une URL
async function downloadFile(url: string): Promise<Uint8Array> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download file from ${url}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

// Fonction pour lire un fichier local (pour documents légaux)
async function readLocalFile(path: string): Promise<Uint8Array> {
  try {
    // Les fichiers sont dans /public, on les lit depuis le Supabase Storage
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const fileUrl = `${supabaseUrl}/storage/v1/object/public${path}`;
    return await downloadFile(fileUrl);
  } catch (error) {
    console.error(`Error reading local file ${path}:`, error);
    throw error;
  }
}

async function sendEmailBrevo(
  to: string,
  subject: string,
  htmlBody: string,
  attachments: Attachment[] = []
): Promise<void> {
  const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");

  if (!BREVO_API_KEY) {
    throw new Error("BREVO_API_KEY not configured");
  }

  // Préparer les pièces jointes
  const brevoAttachments = [];

  for (const attachment of attachments) {
    try {
      let fileContent: Uint8Array;

      // Télécharger le fichier selon son type
      if (attachment.path) {
        // Document légal (fichier local)
        fileContent = await readLocalFile(attachment.path);
      } else if (attachment.url) {
        // Document lead ou custom (URL)
        fileContent = await downloadFile(attachment.url);
      } else {
        console.warn(`Attachment ${attachment.filename} has no path or url, skipping`);
        continue;
      }

      // Encoder en base64
      const base64Content = btoa(String.fromCharCode(...fileContent));

      brevoAttachments.push({
        name: attachment.filename,
        content: base64Content
      });

      console.log(`✅ Attachment prepared: ${attachment.filename} (${fileContent.length} bytes)`);
    } catch (error) {
      console.error(`❌ Error preparing attachment ${attachment.filename}:`, error);
      // Continue with other attachments
    }
  }

  // Construire le payload Brevo
  const payload = {
    sender: {
      name: "TaxiAssur",
      email: "team@taxiassur.com"
    },
    to: [{ email: to }],
    subject: subject,
    htmlContent: htmlBody,
    ...(brevoAttachments.length > 0 && { attachment: brevoAttachments })
  };

  console.log(`📤 Sending email via Brevo with ${brevoAttachments.length} attachments`);

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "api-key": BREVO_API_KEY
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Brevo API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  console.log("✅ Email sent via Brevo:", result.messageId);
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const to_email = body.to_email || body.to;
    const to_name = body.to_name || body.name || "";
    const subject = body.subject;
    const content = body.content || body.body;
    const lead_id = body.lead_id;
    const attachments: Attachment[] = body.attachments || [];

    if (!to_email || !subject || !content) {
      throw new Error("Champs obligatoires manquants: to/to_email, subject, content/body");
    }

    console.log(`📧 Preparing email to ${to_email} with ${attachments.length} attachments`);

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
            background: #f3f4f6;
            padding: 20px;
            color: #1f2937;
          }
          .email-wrapper {
            max-width: 680px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
          }
          .header {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            padding: 40px 30px;
            text-align: center;
          }
          .header h1 {
            color: #ffffff !important;
            font-size: 28px;
            font-weight: 800;
            margin: 0;
          }
          .content {
            padding: 40px 30px;
            background: #ffffff;
            color: #1f2937;
          }
          .content h2 {
            color: #111827 !important;
            font-size: 24px;
            margin-bottom: 20px;
            font-weight: 700;
          }
          .message-content {
            background: #f9fafb;
            border-left: 4px solid #10b981;
            padding: 25px;
            border-radius: 8px;
            margin: 25px 0;
            color: #111827 !important;
            font-size: 16px;
            line-height: 1.8;
            white-space: pre-wrap;
          }
          .message-content p, .message-content span, .message-content div {
            color: #111827 !important;
          }
          .attachments-info {
            background: #eff6ff;
            border: 1px solid #3b82f6;
            border-radius: 8px;
            padding: 15px 20px;
            margin: 20px 0;
          }
          .attachments-info h3 {
            color: #1e40af !important;
            font-size: 16px;
            margin-bottom: 10px;
            font-weight: 700;
          }
          .attachments-info ul {
            list-style: none;
            padding: 0;
            margin: 0;
          }
          .attachments-info li {
            color: #1e40af !important;
            padding: 5px 0;
            font-size: 14px;
          }
          .attachments-info li:before {
            content: "📎 ";
            margin-right: 8px;
          }
          .cta-section {
            text-align: center;
            margin: 30px 0;
            padding: 25px;
            background: #fef3c7;
            border-radius: 12px;
          }
          .cta-section p {
            color: #78350f !important;
            font-weight: 600;
            margin-bottom: 15px;
            font-size: 16px;
          }
          .cta-button {
            background: #10b981;
            color: #ffffff !important;
            padding: 14px 32px;
            text-decoration: none;
            border-radius: 8px;
            display: inline-block;
            font-weight: 700;
            font-size: 16px;
            margin-top: 10px;
          }
          .contact-banner {
            background: #e0f2fe;
            border-radius: 12px;
            padding: 25px;
            text-align: center;
            margin: 25px 0;
          }
          .contact-banner h3 {
            color: #0c4a6e !important;
            font-size: 20px;
            margin-bottom: 12px;
            font-weight: 700;
          }
          .contact-banner p {
            color: #0c4a6e !important;
            font-weight: 600;
            font-size: 16px;
          }
          .signature {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 2px solid #e5e7eb;
          }
          .signature p {
            color: #4b5563 !important;
            font-weight: 600;
            margin: 5px 0;
          }
          .signature .team {
            color: #10b981 !important;
            font-weight: 700;
            font-size: 18px;
          }
          .footer {
            background: #1f2937;
            color: #ffffff !important;
            padding: 30px;
            text-align: center;
          }
          .footer div {
            font-size: 24px;
            font-weight: 800;
            color: #10b981 !important;
            margin-bottom: 10px;
          }
          .footer p {
            color: #d1d5db !important;
            margin: 5px 0;
          }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="header">
            <h1>🚕 TaxiAssur</h1>
          </div>

          <div class="content">
            <h2>Bonjour ${to_name || ""},</h2>

            <div class="message-content">
              ${content.replace(/\n/g, '<br>')}
            </div>

            ${attachments.length > 0 ? `
              <div class="attachments-info">
                <h3>📎 Documents joints (${attachments.length})</h3>
                <ul>
                  ${attachments.map(a => `<li>${a.filename}</li>`).join('')}
                </ul>
              </div>
            ` : ''}

            <div class="cta-section">
              <p>Vous avez une question ? Nous sommes là pour vous !</p>
              <a href="mailto:team@taxiassur.com" class="cta-button">
                💬 Répondre à ce message
              </a>
            </div>

            <div class="contact-banner">
              <h3>📞 Restons en contact</h3>
              <p>📧 team@taxiassur.com | 📞 01 80 85 57 86</p>
            </div>

            <div class="signature">
              <p>Cordialement,</p>
              <p class="team">L'équipe TaxiAssur</p>
            </div>
          </div>

          <div class="footer">
            <div>🚕 TaxiAssur</div>
            <p>© 2026 TaxiAssur - Tous droits réservés</p>
          </div>
        </div>
      </body>
      </html>
    `;

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

    if (trackingId) {
      emailBody = addLinkTracking(emailBody, trackingId, supabaseUrl);
      emailBody = addTrackingPixel(emailBody, trackingId, supabaseUrl);
    }

    console.log("📤 Envoi email CRM avec tracking:", trackingId);

    // Envoyer via Brevo avec support des pièces jointes
    await sendEmailBrevo(
      to_email,
      subject,
      emailBody,
      attachments
    );

    console.log("✅ Email CRM envoyé avec succès à", to_email, "avec", attachments.length, "pièces jointes");

    if (lead_id) {
      await supabase.from('crm_interactions').insert({
        lead_id: lead_id,
        type: 'email',
        direction: 'outbound',
        subject: subject,
        content: content,
        to_email: to_email,
        from_email: 'team@taxiassur.com',
        metadata: {
          attachments_count: attachments.length,
          attachments_names: attachments.map(a => a.filename)
        }
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Email envoyé avec succès avec ${attachments.length} pièces jointes`,
        to: to_email,
        tracking_id: trackingId,
        attachments_sent: attachments.length
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
