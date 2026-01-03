import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface BacklinkEmailRequest {
  campaign_id: string;
  recipient_email: string;
  recipient_name: string;
  recipient_website: string;
  subject: string;
  content: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const payload: BacklinkEmailRequest = await req.json();
    const { campaign_id, recipient_email, recipient_name, recipient_website, subject, content } = payload;

    if (!campaign_id || !recipient_email || !subject || !content) {
      throw new Error("Champs obligatoires manquants");
    }

    const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
    if (!BREVO_API_KEY) {
      throw new Error("BREVO_API_KEY not configured");
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Extraire le domaine de l'email
    const domain = recipient_email.split('@')[1];

    // Template HTML professionnel pour backlinks
    const emailBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            line-height: 1.8;
            background: #f4f4f4;
            padding: 20px;
          }
          .email-wrapper {
            max-width: 680px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
          }
          .header {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            padding: 30px;
            text-align: center;
          }
          .header h1 {
            font-size: 24px;
            margin-bottom: 10px;
          }
          .content {
            padding: 40px 30px;
            color: #333;
          }
          .message {
            white-space: pre-wrap;
            font-size: 16px;
            line-height: 1.8;
            margin: 25px 0;
          }
          .cta {
            text-align: center;
            margin: 35px 0;
          }
          .cta-button {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            padding: 15px 35px;
            text-decoration: none;
            border-radius: 50px;
            display: inline-block;
            font-weight: 600;
            font-size: 16px;
          }
          .footer {
            background: #f8f8f8;
            padding: 25px;
            text-align: center;
            font-size: 13px;
            color: #666;
            border-top: 1px solid #eee;
          }
          .signature {
            margin-top: 35px;
            padding-top: 25px;
            border-top: 2px solid #eee;
            font-size: 15px;
          }
          .signature-name {
            font-weight: 700;
            color: #10b981;
            font-size: 17px;
          }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="header">
            <h1>🚕 TaxiAssur</h1>
            <p>Assurance Taxi Professionnelle</p>
          </div>

          <div class="content">
            <p style="font-size: 16px;">Bonjour ${recipient_name || ''},</p>

            <div class="message">${content.replace(/\n/g, '<br>')}</div>

            <div class="cta">
              <a href="https://taxiassur.com/partners" class="cta-button">
                En savoir plus sur notre partenariat
              </a>
            </div>

            <div class="signature">
              <div class="signature-name">L'équipe TaxiAssur</div>
              <div style="margin-top: 8px;">Courtier en Assurance Taxi</div>
              <div style="margin-top: 5px; color: #059669;">📧 contact@taxiassur.com</div>
              <div style="color: #059669;">🌐 taxiassur.com</div>
            </div>
          </div>

          <div class="footer">
            <p><strong>TaxiAssur - Assurance Taxi Professionnelle</strong></p>
            <p style="margin-top: 10px; font-size: 12px;">© 2026 TaxiAssur - Tous droits réservés</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Envoyer l'email via Brevo
    const emailResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: "TaxiAssur",
          email: "contact@taxiassur.com",
        },
        to: [
          { email: recipient_email, name: recipient_name || "" },
        ],
        subject: subject,
        htmlContent: emailBody,
      }),
    });

    if (!emailResponse.ok) {
      const error = await emailResponse.text();
      console.error("Brevo email error:", error);
      throw new Error(`Failed to send email: ${error}`);
    }

    const emailResult = await emailResponse.json();
    const brevoMessageId = emailResult.messageId;

    // Enregistrer le tracking dans Supabase
    const { data: trackingData, error: trackingError } = await supabase
      .from('backlink_email_tracking')
      .insert({
        campaign_id: campaign_id,
        prospect_website: recipient_website,
        recipient_email: recipient_email,
        recipient_name: recipient_name,
        recipient_domain: domain,
        subject: subject,
        content: content,
        brevo_message_id: brevoMessageId,
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (trackingError) {
      console.error('Error saving email tracking:', trackingError);
      // Ne pas échouer si le tracking échoue, l'email est envoyé
    }

    console.log(`✅ Backlink email sent to ${recipient_email}, MessageID: ${brevoMessageId}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email envoyé avec succès",
        to: recipient_email,
        brevo_message_id: brevoMessageId,
        tracking_id: trackingData?.id
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );
  } catch (error) {
    console.error("Error sending backlink email:", error);
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