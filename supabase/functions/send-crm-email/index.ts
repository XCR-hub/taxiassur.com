import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("📧 CRM Email Request received:", {
      to_email: body.to_email,
      subject: body.subject,
      has_content: !!body.content,
      lead_id: body.lead_id
    });

    const { to_email, to_name, subject, content, lead_id }: EmailRequest = body;

    if (!to_email || !subject || !content) {
      console.error("❌ Missing required fields:", { to_email: !!to_email, subject: !!subject, content: !!content });
      throw new Error("Champs obligatoires manquants: " +
        (!to_email ? "email " : "") +
        (!subject ? "sujet " : "") +
        (!content ? "contenu" : ""));
    }

    const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
    if (!BREVO_API_KEY) {
      console.error("❌ BREVO_API_KEY not found in environment");
      throw new Error("BREVO_API_KEY not configured");
    }

    console.log("✅ Brevo API Key found, length:", BREVO_API_KEY.length);

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
          .logo-container {
            background: white;
            width: 120px;
            height: 120px;
            margin: 0 auto 20px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          }
          .logo {
            width: 90px;
            height: 90px;
          }
          .header h1 {
            color: white;
            font-size: 28px;
            font-weight: 800;
            text-shadow: 0 2px 10px rgba(0,0,0,0.2);
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
            box-shadow: 0 10px 30px rgba(236, 72, 153, 0.4);
            margin-top: 15px;
          }
          .contact-banner {
            background: linear-gradient(135deg, #a5f3fc 0%, #67e8f9 100%);
            border-radius: 15px;
            padding: 25px;
            text-align: center;
            margin: 25px 0;
          }
          .contact-banner h3 {
            color: #164e63;
            font-size: 20px;
            font-weight: 700;
            margin-bottom: 15px;
          }
          .contact-info {
            display: flex;
            justify-content: center;
            gap: 30px;
            flex-wrap: wrap;
            margin-top: 15px;
          }
          .contact-item {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #164e63;
            font-weight: 600;
          }
          .footer {
            background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
            color: white;
            padding: 30px;
            text-align: center;
          }
          .footer-logo {
            font-size: 24px;
            font-weight: 800;
            color: #10b981;
            margin-bottom: 10px;
          }
          .footer p {
            color: #94a3b8;
            font-size: 13px;
            margin: 5px 0;
          }
          .signature {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 2px solid #e5e7eb;
            color: #6b7280;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="header">
            <div class="logo-container">
              <svg class="logo" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <circle cx="50" cy="50" r="45" fill="#10b981"/>
                <path d="M30 40 L70 40 L70 60 L30 60 Z" fill="white"/>
                <circle cx="35" cy="70" r="8" fill="white"/>
                <circle cx="65" cy="70" r="8" fill="white"/>
                <rect x="45" y="25" width="10" height="15" fill="white"/>
              </svg>
            </div>
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
              <a href="mailto:contact@taxiassur.com" class="cta-button">
                💬 Répondre à ce message
              </a>
            </div>

            <div class="contact-banner">
              <h3>📞 Restons en contact</h3>
              <div class="contact-info">
                <div class="contact-item">
                  <span>📧</span>
                  <span>contact@taxiassur.com</span>
                </div>
                <div class="contact-item">
                  <span>📱</span>
                  <span>01 XX XX XX XX</span>
                </div>
                <div class="contact-item">
                  <span>🌐</span>
                  <span>www.taxiassur.com</span>
                </div>
              </div>
            </div>

            <div class="signature">
              <p style="font-weight: 600; color: #374151; margin-bottom: 5px;">
                Cordialement,
              </p>
              <p style="font-weight: 700; color: #10b981; font-size: 16px;">
                L'équipe TaxiAssur
              </p>
              <p style="font-style: italic; font-size: 13px;">
                Votre partenaire assurance pour professionnels du taxi
              </p>
            </div>
          </div>

          <div class="footer">
            <div class="footer-logo">🚕 TaxiAssur</div>
            <p><strong>L'assurance qui vous accompagne</strong></p>
            <p style="margin-top: 15px;">© 2026 TaxiAssur - Tous droits réservés</p>
          </div>
        </div>
      </body>
      </html>
    `;

    console.log("📤 Sending to Brevo API...");

    const emailPayload = {
      sender: {
        name: "TaxiAssur",
        email: "contact@taxiassur.com",
      },
      to: [
        { email: to_email, name: to_name || "" },
      ],
      subject: subject,
      htmlContent: emailBody,
    };

    const emailResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    console.log("📬 Brevo response status:", emailResponse.status);

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error("❌ Brevo API error:", {
        status: emailResponse.status,
        statusText: emailResponse.statusText,
        body: errorText
      });
      throw new Error(`Brevo API error (${emailResponse.status}): ${errorText}`);
    }

    const brevoResult = await emailResponse.json();
    console.log("✅ Email sent successfully to", to_email, "- Message ID:", brevoResult.messageId);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email envoyé avec succès",
        to: to_email,
        messageId: brevoResult.messageId
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );
  } catch (error) {
    console.error("❌ Error sending email:", error);
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