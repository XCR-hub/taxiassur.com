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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const payload: LeadPayload = await req.json();
    const lead = payload.record;

    const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
    if (!BREVO_API_KEY) {
      throw new Error("BREVO_API_KEY not configured");
    }

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
          .priority-badge { background: #ef4444; color: white; padding: 5px 15px; border-radius: 20px; font-size: 12px; font-weight: bold; display: inline-block; }
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
              <li>📄 Vérifier l'envoi des 7 documents requis (incluant autorisation stationnement + RIB)</li>
              <li>💰 Préparer et envoyer le devis sous 24h</li>
            </ol>

            <div style="text-align: center; margin: 30px 0;">
              <a href="https://taxiassur.com/backoffice/crm-commercial" class="cta-button">
                📊 OUVRIR LE CRM
              </a>
              <br>
              <a href="https://taxiassur.com/backoffice/leads" style="color: #3b82f6; text-decoration: none; font-size: 14px;">
                Voir tous les leads →
              </a>
            </div>

            <div style="background: #eff6ff; border: 1px solid #3b82f6; padding: 15px; border-radius: 8px;">
              <strong>💡 Rappel :</strong> L'email automatique de confirmation avec demande de documents a été envoyé au prospect.
            </div>
          </div>

          <div class="footer">
            <strong>TaxiAssur CRM</strong><br>
            Notification automatique | Ne pas répondre à cet email
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
            font-size: 32px;
            font-weight: 800;
            text-shadow: 0 2px 10px rgba(0,0,0,0.2);
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
          .success-banner strong {
            font-size: 18px;
            display: block;
            margin-bottom: 10px;
          }
          .documents-section {
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            border: 3px solid #3b82f6;
            padding: 30px;
            border-radius: 20px;
            margin: 30px 0;
          }
          .documents-section h3 {
            color: #1e40af;
            font-size: 24px;
            font-weight: 800;
            margin-bottom: 20px;
            text-align: center;
          }
          .document-item {
            background: white;
            padding: 15px;
            margin: 10px 0;
            border-radius: 12px;
            border-left: 5px solid #10b981;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
          .document-item strong {
            color: #1e293b;
            font-size: 16px;
            display: block;
            margin-bottom: 5px;
          }
          .document-item span {
            color: #64748b;
            font-size: 14px;
          }
          .cta-section {
            text-align: center;
            margin: 35px 0;
            padding: 30px;
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            border-radius: 20px;
            border: 3px solid #f59e0b;
          }
          .cta-section p {
            color: #92400e !important;
            font-weight: 700 !important;
            margin-bottom: 20px;
            font-size: 18px !important;
          }
          .cta-button {
            background: #ec4899;
            background-image: linear-gradient(135deg, #ec4899 0%, #db2777 100%);
            color: #ffffff !important;
            padding: 18px 40px;
            text-decoration: none;
            border-radius: 50px;
            display: inline-block;
            font-weight: 700;
            font-size: 18px;
            box-shadow: 0 10px 30px rgba(236, 72, 153, 0.4);
            margin-top: 15px;
            border: 2px solid #db2777;
          }
          .cta-button span {
            color: #ffffff !important;
          }
          .info-box {
            background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
            border: 2px solid #3b82f6;
            padding: 25px;
            border-radius: 15px;
            margin: 25px 0;
          }
          .info-box strong {
            color: #1e40af;
            font-size: 18px;
            display: block;
            margin-bottom: 15px;
          }
          .info-box ul {
            list-style: none;
            padding: 0;
          }
          .info-box li {
            color: #1e40af;
            padding: 8px 0;
            border-bottom: 1px solid #93c5fd;
          }
          .info-box li:last-child {
            border-bottom: none;
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
            font-size: 22px;
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
            font-size: 26px;
            font-weight: 800;
            color: #10b981;
            margin-bottom: 10px;
          }
          .footer p {
            color: #94a3b8;
            font-size: 13px;
            margin: 5px 0;
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
            <h1>✅ DEMANDE REÇUE !</h1>
            <div class="subtitle">Félicitations ${lead.name} !</div>
          </div>

          <div class="content">
            <h2 style="color: #1e293b; font-size: 24px; margin-bottom: 15px;">Merci pour votre confiance</h2>
            <p style="color: #475569; font-size: 16px; margin-bottom: 20px;">
              Nous avons bien reçu votre demande de devis pour une <strong style="color: #10b981;">assurance taxi à ${lead.city}</strong>.
            </p>

            <div class="success-banner">
              <strong>⏱️ Réponse rapide garantie</strong>
              Notre expert vous contacte dans les <strong>15 minutes</strong> au <strong>${lead.phone}</strong>
            </div>

            <div class="documents-section">
              <h3>📋 Documents requis pour votre devis</h3>
              <p style="color: #1e40af; text-align: center; margin-bottom: 20px; font-weight: 600;">
                Pour obtenir votre devis <strong>sous 24h</strong>, merci de nous transmettre ces <strong>7 pièces</strong>
              </p>

              <div class="document-item">
                <strong>1. 📜 Licence de taxi professionnelle</strong>
                <span>En cours de validité</span>
              </div>
              <div class="document-item">
                <strong>2. 🪚 Permis de conduire</strong>
                <span>Recto-verso, lisible</span>
              </div>
              <div class="document-item">
                <strong>3. 🆔 Pièce d'identité</strong>
                <span>CNI ou passeport valide</span>
              </div>
              <div class="document-item">
                <strong>4. 🚗 Carte grise du véhicule</strong>
                <span>Certificat d'immatriculation</span>
              </div>
              <div class="document-item">
                <strong>5. 📊 Relevé d'information</strong>
                <span>De votre assureur précédent (si applicable)</span>
              </div>
              <div class="document-item">
                <strong>6. 🅿️ Autorisation de stationnement</strong>
                <span>Autorisation préfectorale de stationnement taxi</span>
              </div>
              <div class="document-item">
                <strong>7. 🏦 RIB - Relevé d'Identité Bancaire</strong>
                <span>Coordonnées bancaires complètes</span>
              </div>
            </div>

            <div class="cta-section">
              <p style="color: #92400e;">Uploadez vos documents maintenant et obtenez votre devis en express !</p>
              <a href="https://taxiassur.com/espace-documents?token=${lead.access_token}" class="cta-button" style="text-decoration: none; color: #ffffff !important; background-color: #ec4899; background-image: linear-gradient(135deg, #ec4899 0%, #db2777 100%); display: inline-block; padding: 18px 40px; border-radius: 50px; font-weight: 700; font-size: 18px; box-shadow: 0 10px 30px rgba(236, 72, 153, 0.4);">
                <span style="color: #ffffff !important;">📤 UPLOADER MES DOCUMENTS</span>
              </a>
              <p style="color: #92400e; font-size: 14px; margin-top: 15px;">
                Vous pouvez aussi les envoyer par email à <a href="mailto:team@taxiassur.com" style="color: #db2777; font-weight: 600;">team@taxiassur.com</a>
              </p>
            </div>

            <div class="info-box">
              <strong>ℹ️ Vos informations enregistrées</strong>
              <ul>
                <li>📞 Téléphone : ${lead.phone}</li>
                <li>📧 Email : ${lead.email}</li>
                <li>📍 Ville : ${lead.city}</li>
                <li>👤 Statut : ${lead.status}</li>
                ${lead.immatriculation ? `<li>🚗 Immatriculation : ${lead.immatriculation}</li>` : ""}
              </ul>
            </div>

            <div class="contact-banner">
              <h3>📞 Besoin d'aide ?</h3>
              <p style="color: #0e7490; margin-bottom: 15px;">
                Notre équipe est disponible pour répondre à toutes vos questions
              </p>
              <div class="contact-info">
                <div class="contact-item">
                  <span>📞</span>
                  <a href="tel:0180855786" style="color: #164e63; text-decoration: none; font-weight: 700;">01 80 85 57 86</a>
                </div>
                <div class="contact-item">
                  <span>📧</span>
                  <a href="mailto:team@taxiassur.com" style="color: #164e63; text-decoration: none; font-weight: 700;">team@taxiassur.com</a>
                </div>
              </div>
            </div>
          </div>

          <div class="footer">
            <div class="footer-logo">🚕 TaxiAssur</div>
            <p><strong>Courtier spécialisé en assurance taxi et VTC</strong></p>
            <p style="margin-top: 15px;">01 80 85 57 86 | team@taxiassur.com</p>
            <p style="margin-top: 10px;">© 2026 TaxiAssur - Tous droits réservés</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const teamResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: "TaxiAssur Notifications",
          email: "team@taxiassur.com",
        },
        to: [
          { email: "team@taxiassur.com", name: "Équipe TaxiAssur" },
        ],
        subject: `🎯 Nouveau Lead : ${lead.name} - ${lead.city}`,
        htmlContent: teamEmailBody,
      }),
    });

    if (!teamResponse.ok) {
      const error = await teamResponse.text();
      console.error("Brevo team email error:", error);
      throw new Error(`Failed to send team email: ${error}`);
    }

    const clientResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: "TaxiAssur",
          email: "team@taxiassur.com",
        },
        to: [
          { email: lead.email, name: lead.name },
        ],
        subject: "Votre demande de devis assurance taxi",
        htmlContent: clientEmailBody,
      }),
    });

    if (!clientResponse.ok) {
      const error = await clientResponse.text();
      console.error("Brevo client email error:", error);
      throw new Error(`Failed to send client email: ${error}`);
    }

    console.log(`✅ Emails sent successfully for lead ${lead.id}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    await supabase.from('crm_interactions').insert([
      {
        lead_id: lead.id,
        type: 'email',
        direction: 'outbound',
        subject: `🎯 Nouveau Lead : ${lead.name} - ${lead.city}`,
        content: 'Email de notification interne envoyé à l\'équipe',
        to_email: 'team@taxiassur.com',
        from_email: 'team@taxiassur.com'
      },
      {
        lead_id: lead.id,
        type: 'email',
        direction: 'outbound',
        subject: 'Votre demande de devis assurance taxi',
        content: clientEmailBody,
        to_email: lead.email,
        from_email: 'team@taxiassur.com'
      }
    ]);

    return new Response(
      JSON.stringify({ success: true, message: "Emails sent" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});