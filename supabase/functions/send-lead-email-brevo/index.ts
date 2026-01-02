import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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
    nom_prenom: string;
    telephone: string;
    email: string;
    ville: string;
    statut: string;
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
                <div class="info-value">${lead.nom_prenom}</div>
              </div>

              <div class="info-item">
                <div class="info-label">📞 Téléphone</div>
                <div class="info-value"><a href="tel:${lead.telephone}" style="color: #10b981; text-decoration: none;">${lead.telephone}</a></div>
              </div>

              <div class="info-item">
                <div class="info-label">📧 Email</div>
                <div class="info-value"><a href="mailto:${lead.email}" style="color: #3b82f6; text-decoration: none; font-size: 14px;">${lead.email}</a></div>
              </div>

              <div class="info-item">
                <div class="info-label">📍 Ville</div>
                <div class="info-value">${lead.ville}</div>
              </div>

              <div class="info-item">
                <div class="info-label">👤 Statut professionnel</div>
                <div class="info-value">${lead.statut}</div>
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
              <li>☎️ Appeler le prospect au <strong>${lead.telephone}</strong></li>
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
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f59e0b 0%, #eab308 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
          .success-icon { font-size: 48px; margin-bottom: 20px; }
          .highlight { background: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; margin: 20px 0; }
          .documents { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .document-item { padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
          .document-item:last-child { border-bottom: none; }
          .cta-button { background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; margin: 20px 0; }
          .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 10px 10px; }
          .info-box { background: #eff6ff; border: 1px solid #3b82f6; padding: 15px; border-radius: 8px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="success-icon">✅</div>
            <h1 style="margin: 0; font-size: 28px;">DEMANDE REÇUE !</h1>
            <p style="margin: 10px 0 0 0; font-size: 18px;">Félicitations ${lead.nom_prenom} !</p>
          </div>

          <div class="content">
            <h2 style="color: #1f2937;">Merci pour votre confiance</h2>
            <p>Nous avons bien reçu votre demande de devis pour une <strong>assurance taxi à ${lead.ville}</strong>.</p>

            <div class="highlight">
              <strong>⏱️ Réponse rapide garantie :</strong><br>
              Notre expert vous contacte dans les <strong>15 minutes</strong> au <strong>${lead.telephone}</strong>
            </div>

            <h3 style="color: #1f2937;">📋 Documents requis pour votre devis</h3>
            <p>Pour accélérer le traitement de votre dossier et obtenir votre devis <strong>sous 24h</strong>, merci de nous transmettre ces <strong>7 pièces</strong> :</p>

            <div class="documents">
              <div class="document-item">
                <strong>1. Licence de taxi professionnelle</strong><br>
                <span style="color: #6b7280; font-size: 14px;">En cours de validité</span>
              </div>
              <div class="document-item">
                <strong>2. Permis de conduire</strong><br>
                <span style="color: #6b7280; font-size: 14px;">Recto-verso, lisible</span>
              </div>
              <div class="document-item">
                <strong>3. Pièce d'identité</strong><br>
                <span style="color: #6b7280; font-size: 14px;">CNI ou passeport valide</span>
              </div>
              <div class="document-item">
                <strong>4. Carte grise du véhicule</strong><br>
                <span style="color: #6b7280; font-size: 14px;">Certificat d'immatriculation</span>
              </div>
              <div class="document-item">
                <strong>5. Relevé d'information</strong><br>
                <span style="color: #6b7280; font-size: 14px;">De votre assureur précédent (si vous en avez un)</span>
              </div>
              <div class="document-item">
                <strong>6. Autorisation de stationnement</strong><br>
                <span style="color: #6b7280; font-size: 14px;">Autorisation préfectorale de stationnement taxi</span>
              </div>
              <div class="document-item">
                <strong>7. RIB - Relevé d'Identité Bancaire</strong><br>
                <span style="color: #6b7280; font-size: 14px;">Coordonnées bancaires complètes</span>
              </div>
            </div>

            <div style="text-align: center;">
              <a href="https://taxiassur.com/espace-documents?token=${lead.access_token}" class="cta-button" style="text-decoration: none;">
                📤 UPLOADER MES DOCUMENTS
              </a>
              <p style="color: #6b7280; font-size: 14px;">Accédez à votre espace sécurisé pour uploader vos documents</p>
              <p style="color: #9ca3af; font-size: 12px; margin-top: 10px;">
                Vous pouvez aussi les envoyer par email à <a href="mailto:team@taxiassur.com" style="color: #3b82f6;">team@taxiassur.com</a>
              </p>
            </div>

            <div class="info-box">
              <strong>ℹ️ Vos informations enregistrées :</strong><br>
              <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                <li>Téléphone : ${lead.telephone}</li>
                <li>Email : ${lead.email}</li>
                <li>Ville : ${lead.ville}</li>
                <li>Statut : ${lead.statut}</li>
                ${lead.immatriculation ? `<li>Immatriculation : ${lead.immatriculation}</li>` : ""}
              </ul>
            </div>

            <h3 style="color: #1f2937;">📞 Besoin d'aide ?</h3>
            <p>Notre équipe est disponible pour répondre à toutes vos questions :</p>
            <p>
              <strong>Téléphone :</strong> <a href="tel:0180855786" style="color: #10b981; text-decoration: none;">01 80 85 57 86</a><br>
              <strong>Email :</strong> <a href="mailto:team@taxiassur.com" style="color: #10b981; text-decoration: none;">team@taxiassur.com</a>
            </p>
          </div>

          <div class="footer">
            <strong>TaxiAssur.com</strong><br>
            Courtier spécialisé en assurance taxi et VTC<br>
            01 80 85 57 86 | team@taxiassur.com
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
        subject: `🎯 Nouveau Lead : ${lead.nom_prenom} - ${lead.ville}`,
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
          { email: lead.email, name: lead.nom_prenom },
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