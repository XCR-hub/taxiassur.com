import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EmailRequest {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  from?: {
    email: string;
    name: string;
  };
  replyTo?: string;
  template?: string; // Template nom: "devis", "contract", "review_request"
  data?: Record<string, any>; // Données pour le template
  templateId?: string;
  dynamicTemplateData?: Record<string, any>;
  attachments?: Array<{
    filename: string;
    content: string;
    type?: string;
    disposition?: string;
  }>;
}

interface SendGridResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Fonction pour générer le HTML des templates
function generateEmailTemplate(template: string, data: Record<string, any>): { html: string; text: string } {
  const baseStyle = `
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: linear-gradient(135deg, #1e40af 0%, #7c3aed 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
      .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
      .button { display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
      .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 14px; color: #6b7280; border-radius: 0 0 8px 8px; }
      .highlight { background: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; margin: 20px 0; }
    </style>
  `;

  switch (template) {
    case "devis": {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>${baseStyle}</head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚖 Votre Devis Assurance Taxi</h1>
            </div>
            <div class="content">
              <p>Bonjour <strong>${data.name || 'cher client'}</strong>,</p>

              <p>Nous avons le plaisir de vous transmettre votre devis personnalisé pour votre assurance taxi à <strong>${data.city || 'votre ville'}</strong>.</p>

              <div class="highlight">
                <p><strong>📄 Votre devis a été préparé avec soin</strong></p>
                <p>Notre équipe d'experts a analysé votre profil et vous propose les meilleures garanties adaptées à votre activité.</p>
              </div>

              <p><strong>Prochaines étapes :</strong></p>
              <ul>
                <li>✅ Consultez attentivement votre devis</li>
                <li>📞 Contactez-nous pour toute question au <strong>01 80 85 57 86</strong></li>
                <li>✍️ Retournez votre accord signé</li>
              </ul>

              <p>Notre conseiller reste à votre disposition pour vous accompagner dans votre décision.</p>

              <a href="https://taxiassur.com/contact" class="button">Nous Contacter</a>

              <p>Cordialement,<br><strong>L'équipe TaxiAssur</strong></p>
            </div>
            <div class="footer">
              <p>📧 team@taxiassur.com | 📞 01 80 85 57 86</p>
              <p>ORIAS 11 061 425 - Courtier Agréé</p>
              <p><a href="https://taxiassur.com">taxiassur.com</a></p>
            </div>
          </div>
        </body>
        </html>
      `;

      const text = `
Bonjour ${data.name || 'cher client'},

Nous avons le plaisir de vous transmettre votre devis personnalisé pour votre assurance taxi à ${data.city || 'votre ville'}.

Votre devis a été préparé avec soin par notre équipe d'experts.

Prochaines étapes :
- Consultez attentivement votre devis
- Contactez-nous au 01 80 85 57 86 pour toute question
- Retournez votre accord signé

Cordialement,
L'équipe TaxiAssur
team@taxiassur.com | 01 80 85 57 86
      `;

      return { html, text };
    }

    case "contract": {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>${baseStyle}</head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Bienvenue chez TaxiAssur !</h1>
            </div>
            <div class="content">
              <p>Bonjour <strong>${data.name || 'cher client'}</strong>,</p>

              <p>Félicitations ! Votre contrat d'assurance taxi est maintenant actif.</p>

              <div class="highlight">
                <p><strong>✅ Votre protection démarre immédiatement</strong></p>
                <p>Vous êtes désormais couvert par l'une des meilleures assurances du marché pour votre activité de taxi à <strong>${data.city || 'votre ville'}</strong>.</p>
              </div>

              <p><strong>Documents importants :</strong></p>
              <ul>
                <li>📄 Contrat d'assurance signé</li>
                <li>🛡️ Attestation d'assurance (à conserver dans votre véhicule)</li>
                <li>📋 Conditions générales</li>
              </ul>

              <p><strong>En cas de sinistre :</strong></p>
              <ul>
                <li>📞 Contactez-nous immédiatement au <strong>01 80 85 57 86</strong></li>
                <li>📧 Email : team@taxiassur.com</li>
                <li>⏰ Assistance 24h/24, 7j/7</li>
              </ul>

              <a href="https://taxiassur.com/gestion-sinistres" class="button">Déclarer un Sinistre</a>

              <p>Nous vous remercions de votre confiance et restons à votre écoute.</p>

              <p>Cordialement,<br><strong>L'équipe TaxiAssur</strong></p>
            </div>
            <div class="footer">
              <p>📧 team@taxiassur.com | 📞 01 80 85 57 86</p>
              <p>ORIAS 11 061 425 - Courtier Agréé</p>
              <p><a href="https://taxiassur.com">taxiassur.com</a></p>
            </div>
          </div>
        </body>
        </html>
      `;

      const text = `
Bonjour ${data.name || 'cher client'},

Félicitations ! Votre contrat d'assurance taxi est maintenant actif.

Vous êtes désormais couvert à ${data.city || 'votre ville'}.

En cas de sinistre :
- Contactez-nous au 01 80 85 57 86
- Email : team@taxiassur.com
- Assistance 24h/24, 7j/7

Merci de votre confiance.

Cordialement,
L'équipe TaxiAssur
team@taxiassur.com | 01 80 85 57 86
      `;

      return { html, text };
    }

    case "review_request": {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>${baseStyle}</head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⭐ Votre Avis Compte pour Nous</h1>
            </div>
            <div class="content">
              <p>Bonjour <strong>${data.name || 'cher client'}</strong>,</p>

              <p>Nous espérons que vous êtes satisfait de nos services d'assurance taxi à <strong>${data.city || 'votre ville'}</strong>.</p>

              <div class="highlight">
                <p><strong>💙 Partagez votre expérience</strong></p>
                <p>Votre avis nous aide à améliorer nos services et à accompagner d'autres professionnels du taxi dans leur recherche d'assurance.</p>
              </div>

              <p><strong>Pourquoi votre avis est important :</strong></p>
              <ul>
                <li>🎯 Aide d'autres chauffeurs à faire le bon choix</li>
                <li>💪 Nous motive à maintenir notre excellence</li>
                <li>📈 Améliore nos services continuellement</li>
              </ul>

              <p>Cela ne prendra que 2 minutes :</p>

              <a href="${data.review_link || 'https://g.page/r/taxiassur/review'}" class="button">Laisser un Avis Google ⭐</a>

              <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
                <em>Votre retour d'expérience, qu'il soit positif ou qu'il suggère des améliorations, est précieux pour nous.</em>
              </p>

              <p>Merci infiniment pour votre temps et votre confiance.</p>

              <p>Cordialement,<br><strong>L'équipe TaxiAssur</strong></p>
            </div>
            <div class="footer">
              <p>📧 team@taxiassur.com | 📞 01 80 85 57 86</p>
              <p>ORIAS 11 061 425 - Courtier Agréé</p>
              <p><a href="https://taxiassur.com">taxiassur.com</a></p>
            </div>
          </div>
        </body>
        </html>
      `;

      const text = `
Bonjour ${data.name || 'cher client'},

Nous espérons que vous êtes satisfait de nos services d'assurance taxi à ${data.city || 'votre ville'}.

Votre avis nous aide à améliorer nos services et à accompagner d'autres professionnels du taxi.

Laissez-nous un avis sur Google (2 minutes) :
${data.review_link || 'https://g.page/r/taxiassur/review'}

Merci infiniment pour votre temps et votre confiance.

Cordialement,
L'équipe TaxiAssur
team@taxiassur.com | 01 80 85 57 86
      `;

      return { html, text };
    }

    default:
      throw new Error(`Unknown template: ${template}`);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");

    if (!SENDGRID_API_KEY) {
      throw new Error("SENDGRID_API_KEY not configured");
    }

    const emailRequest: EmailRequest = await req.json();

    // Validation
    if (!emailRequest.to || !emailRequest.subject) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields: to, subject",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Générer le template si nécessaire
    if (emailRequest.template && emailRequest.data) {
      try {
        const { html, text } = generateEmailTemplate(emailRequest.template, emailRequest.data);
        emailRequest.html = html;
        emailRequest.text = text;
      } catch (error) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `Template error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    if (!emailRequest.text && !emailRequest.html && !emailRequest.templateId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Must provide text, html, template, or templateId",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Build SendGrid request
    const sendGridPayload: any = {
      personalizations: [
        {
          to: [{ email: emailRequest.to }],
          subject: emailRequest.subject,
        },
      ],
      from: {
        email: emailRequest.from?.email || "contact@em5892.taxiassur.com",
        name: emailRequest.from?.name || "TaxiAssur.com",
      },
      reply_to: {
        email: emailRequest.replyTo || "team@taxiassur.com",
      },
      tracking_settings: {
        click_tracking: { enable: true },
        open_tracking: { enable: true },
      },
      mail_settings: {
        bypass_list_management: { enable: false },
        footer: { enable: false },
        sandbox_mode: { enable: false },
      },
    };

    // Add template or content
    if (emailRequest.templateId) {
      sendGridPayload.template_id = emailRequest.templateId;
      if (emailRequest.dynamicTemplateData) {
        sendGridPayload.personalizations[0].dynamic_template_data =
          emailRequest.dynamicTemplateData;
      }
    } else {
      sendGridPayload.content = [];

      if (emailRequest.text) {
        sendGridPayload.content.push({
          type: "text/plain",
          value: emailRequest.text,
        });
      }

      if (emailRequest.html) {
        sendGridPayload.content.push({
          type: "text/html",
          value: emailRequest.html,
        });
      }
    }

    // Add attachments if provided
    if (emailRequest.attachments && emailRequest.attachments.length > 0) {
      sendGridPayload.attachments = emailRequest.attachments.map((att) => ({
        filename: att.filename,
        content: att.content,
        type: att.type || "application/pdf",
        disposition: att.disposition || "attachment",
      }));
    }

    // Send via SendGrid API
    const sendGridResponse = await fetch(
      "https://api.sendgrid.com/v3/mail/send",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${SENDGRID_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sendGridPayload),
      }
    );

    if (!sendGridResponse.ok) {
      const errorText = await sendGridResponse.text();
      console.error("SendGrid error:", errorText);

      return new Response(
        JSON.stringify({
          success: false,
          error: `SendGrid API error: ${sendGridResponse.status}`,
          details: errorText,
        }),
        {
          status: sendGridResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get message ID from response headers
    const messageId = sendGridResponse.headers.get("x-message-id") || undefined;

    const result: SendGridResponse = {
      success: true,
      messageId,
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Email service error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});