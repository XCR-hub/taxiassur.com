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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`📧 Redirection vers IONOS SMTP pour lead ${lead.id}`);

    // Rediriger directement vers la fonction IONOS SMTP
    const ionosResponse = await fetch(`${supabaseUrl}/functions/v1/send-email-ionos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        type: "INSERT",
        table: "crm_leads",
        record: lead
      })
    });

    if (!ionosResponse.ok) {
      const errorText = await ionosResponse.text();
      throw new Error(`IONOS email failed: ${errorText}`);
    }

    const ionosResult = await ionosResponse.json();
    console.log(`✅ Emails envoyés via IONOS SMTP pour lead ${lead.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Emails sent via IONOS SMTP (redirected from Brevo)",
        ...ionosResult
      }),
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

/*
 * ANCIEN CODE BREVO - CONSERVÉ POUR RÉFÉRENCE
 * Cette fonction redirige maintenant vers send-email-ionos
 *
 * Pour restaurer Brevo, décommenter ci-dessous et supprimer la redirection
 */

/*
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: account, error: accountError } = await supabase
      .from('email_accounts')
      .select('id')
      .eq('email', 'team@taxiassur.com')
      .maybeSingle();

    if (accountError) {
      console.error('❌ Error fetching email account:', accountError);
    }

    console.log('📧 Email account found:', account ? 'YES' : 'NO', account?.id);

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
            <h1 style="margin: 0; font-size: 32px;">NOUVEAU LEAD</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Traitement prioritaire requis</p>
          </div>

          <div class="content">
            <div class="alert-box">
              <strong>ACTION REQUISE :</strong> Contactez ce prospect dans les <strong>15 minutes</strong>
            </div>

            <h2 style="color: #1f2937; margin-top: 0;">Informations du prospect</h2>

            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Nom complet</div>
                <div class="info-value">${lead.name}</div>
              </div>

              <div class="info-item">
                <div class="info-label">Telephone</div>
                <div class="info-value"><a href="tel:${lead.phone}" style="color: #10b981; text-decoration: none;">${lead.phone}</a></div>
              </div>

              <div class="info-item">
                <div class="info-label">Email</div>
                <div class="info-value"><a href="mailto:${lead.email}" style="color: #3b82f6; text-decoration: none; font-size: 14px;">${lead.email}</a></div>
              </div>

              <div class="info-item">
                <div class="info-label">Ville</div>
                <div class="info-value">${lead.city}</div>
              </div>

              <div class="info-item">
                <div class="info-label">Statut professionnel</div>
                <div class="info-value">${lead.status}</div>
              </div>

              ${lead.immatriculation ? `
              <div class="info-item">
                <div class="info-label">Immatriculation</div>
                <div class="info-value">${lead.immatriculation}</div>
              </div>
              ` : ""}

              <div class="info-item">
                <div class="info-label">Date de demande</div>
                <div class="info-value">${new Date(lead.created_at).toLocaleString("fr-FR", {
                  dateStyle: "short",
                  timeStyle: "short"
                })}</div>
              </div>

              <div class="info-item">
                <div class="info-label">ID Lead</div>
                <div class="info-value" style="font-size: 12px; font-family: monospace;">${lead.id}</div>
              </div>
            </div>

            <h3 style="color: #1f2937;">Prochaines actions</h3>
            <ol style="color: #4b5563; line-height: 1.8;">
              <li>Appeler le prospect au <strong>${lead.phone}</strong></li>
              <li>Qualifier le besoin et confirmer les informations</li>
              <li>Verifier l'envoi des 7 documents requis</li>
              <li>Preparer et envoyer le devis sous 24h</li>
            </ol>

            <div style="text-align: center; margin: 30px 0;">
              <a href="https://taxiassur.com/backoffice/crm-killer/lead/${lead.id}" class="cta-button" style="color: white !important; text-decoration: none;">
                VOIR CE LEAD
              </a>
              <br>
              <a href="https://taxiassur.com/backoffice/crm-killer/pipeline" style="color: #3b82f6; text-decoration: none; font-size: 14px;">
                Voir tous les leads
              </a>
            </div>

            <div style="background: #eff6ff; border: 1px solid #3b82f6; padding: 15px; border-radius: 8px;">
              <strong>Rappel :</strong> L'email automatique de confirmation avec demande de documents a ete envoye au prospect.
            </div>
          </div>

          <div class="footer">
            <strong>TaxiAssur CRM</strong><br>
            Notification automatique | Ne pas repondre a cet email
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
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            background: #f3f4f6;
            padding: 20px;
          }
          .email-wrapper {
            max-width: 680px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
          }
          .header {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            padding: 50px 30px;
            text-align: center;
            position: relative;
          }
          .header::before {
            content: '✓';
            position: absolute;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            width: 60px;
            height: 60px;
            background: rgba(255,255,255,0.2);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 36px;
            color: white;
            font-weight: bold;
          }
          .logo {
            color: white;
            font-size: 28px;
            font-weight: 900;
            margin-top: 40px;
            letter-spacing: 1px;
          }
          .header h1 {
            color: white;
            font-size: 36px;
            font-weight: 800;
            margin: 15px 0 10px 0;
          }
          .header .subtitle {
            color: #d1fae5;
            font-size: 18px;
            font-weight: 500;
          }
          .content {
            padding: 40px 30px;
          }
          .greeting {
            color: #1e293b;
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 20px;
          }
          .intro-text {
            color: #475569;
            font-size: 16px;
            line-height: 1.8;
            margin-bottom: 30px;
          }
          .highlight-box {
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            border-left: 6px solid #f59e0b;
            padding: 25px;
            border-radius: 12px;
            margin: 30px 0;
          }
          .highlight-box h3 {
            color: #92400e;
            font-size: 20px;
            font-weight: 800;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .highlight-box p {
            color: #78350f;
            font-size: 16px;
            line-height: 1.6;
          }
          .urgent-action {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            padding: 35px;
            border-radius: 16px;
            margin: 35px 0;
            text-align: center;
            box-shadow: 0 10px 30px rgba(16, 185, 129, 0.3);
          }
          .urgent-action h2 {
            color: white;
            font-size: 28px;
            font-weight: 900;
            margin-bottom: 15px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .urgent-action p {
            color: #d1fae5;
            font-size: 17px;
            margin-bottom: 25px;
            font-weight: 500;
          }
          .cta-button {
            background: white;
            color: #059669 !important;
            padding: 18px 45px;
            text-decoration: none;
            border-radius: 50px;
            display: inline-block;
            font-weight: 800;
            font-size: 18px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.2);
            transition: transform 0.2s;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .benefits-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin: 25px 0;
          }
          .benefit-card {
            background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
            padding: 20px;
            border-radius: 12px;
            text-align: center;
            border: 2px solid #10b981;
          }
          .benefit-icon {
            font-size: 36px;
            margin-bottom: 10px;
          }
          .benefit-title {
            color: #065f46;
            font-weight: 700;
            font-size: 15px;
          }
          .documents-section {
            background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
            border: 3px solid #3b82f6;
            padding: 30px;
            border-radius: 16px;
            margin: 30px 0;
          }
          .documents-section h3 {
            color: #1e40af;
            font-size: 24px;
            font-weight: 800;
            margin-bottom: 15px;
            text-align: center;
          }
          .documents-section .subtitle {
            color: #1e40af;
            text-align: center;
            margin-bottom: 25px;
            font-size: 16px;
            font-weight: 600;
          }
          .document-item {
            background: white;
            padding: 15px 20px;
            margin: 12px 0;
            border-radius: 10px;
            border-left: 5px solid #10b981;
            box-shadow: 0 2px 6px rgba(0,0,0,0.08);
            display: flex;
            align-items: center;
            gap: 15px;
          }
          .document-number {
            background: #10b981;
            color: white;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 14px;
            flex-shrink: 0;
          }
          .document-info {
            flex: 1;
          }
          .document-item strong {
            color: #1e293b;
            font-size: 15px;
            display: block;
            margin-bottom: 3px;
          }
          .document-item span {
            color: #64748b;
            font-size: 13px;
          }
          .alternative-method {
            background: #f1f5f9;
            border: 2px dashed #cbd5e1;
            padding: 20px;
            border-radius: 12px;
            margin: 20px 0;
            text-align: center;
          }
          .alternative-method p {
            color: #475569;
            font-size: 14px;
            margin: 5px 0;
          }
          .steps-section {
            background: white;
            border: 2px solid #e5e7eb;
            padding: 30px;
            border-radius: 16px;
            margin: 30px 0;
          }
          .steps-section h3 {
            color: #1e293b;
            font-size: 22px;
            font-weight: 800;
            margin-bottom: 25px;
            text-align: center;
          }
          .step-item {
            display: flex;
            align-items: start;
            gap: 20px;
            margin: 20px 0;
            padding: 20px;
            background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
            border-radius: 12px;
          }
          .step-number {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            width: 45px;
            height: 45px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 22px;
            flex-shrink: 0;
          }
          .step-content strong {
            color: #1e293b;
            display: block;
            margin-bottom: 5px;
            font-size: 17px;
          }
          .step-content span {
            color: #64748b;
            font-size: 15px;
          }
          .info-box {
            background: #f8fafc;
            border: 2px solid #e2e8f0;
            padding: 20px;
            border-radius: 12px;
            margin: 25px 0;
          }
          .info-box h4 {
            color: #1e293b;
            font-size: 16px;
            margin-bottom: 12px;
            font-weight: 700;
          }
          .info-box ul {
            list-style: none;
            padding: 0;
          }
          .info-box li {
            color: #475569;
            padding: 8px 0;
            border-bottom: 1px solid #e2e8f0;
            font-size: 14px;
          }
          .info-box li:last-child {
            border-bottom: none;
          }
          .contact-box {
            background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
            border-radius: 12px;
            padding: 25px;
            text-align: center;
            margin: 30px 0;
          }
          .contact-box h3 {
            color: white;
            font-size: 20px;
            font-weight: 700;
            margin-bottom: 12px;
          }
          .contact-box p {
            color: #e0f2fe;
            margin-bottom: 15px;
            font-size: 15px;
          }
          .contact-box a {
            color: white;
            text-decoration: none;
            font-weight: 700;
            font-size: 16px;
            margin: 0 10px;
          }
          .footer {
            background: #1e293b;
            color: white;
            padding: 30px;
            text-align: center;
          }
          .footer-logo {
            font-size: 24px;
            font-weight: 900;
            color: #10b981;
            margin-bottom: 10px;
            letter-spacing: 1px;
          }
          .footer p {
            color: #94a3b8;
            font-size: 13px;
            margin: 8px 0;
          }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <div class="header">
            <div class="logo">🚕 TaxiAssur</div>
            <h1>Demande Confirmee !</h1>
            <div class="subtitle">Nous avons bien recu votre demande</div>
          </div>

          <div class="content">
            <div class="greeting">Bonjour ${lead.name},</div>

            <p class="intro-text">
              Merci de nous avoir choisi pour votre <strong>assurance taxi professionnel a ${lead.city}</strong>.
              Votre demande a ete enregistree avec succes et notre equipe d'experts est deja mobilisee pour vous proposer
              les meilleures offres du marche.
            </p>

            <div class="highlight-box">
              <h3>⚡ Reponse sous 15 minutes</h3>
              <p>
                Notre expert vous contactera au <strong>${lead.phone}</strong> dans les <strong>15 prochaines minutes</strong>
                pour analyser vos besoins specifiques et vous accompagner dans votre projet.
              </p>
            </div>

            <div class="urgent-action">
              <h2>📤 Action Immediate Requise</h2>
              <p>Accelerez le traitement de votre dossier en uploadant vos documents des maintenant</p>
              <a href="https://taxiassur.com/espace-prospect/${lead.access_token}" class="cta-button" style="text-decoration: none; color: #059669 !important;">
                📂 Acceder a mon espace securise
              </a>
              <p style="font-size: 14px; margin-top: 20px; color: #d1fae5;">
                ⚠️ Plus vous uploadez vos documents rapidement, plus vite vous recevrez votre devis personnalise
              </p>
            </div>

            <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border: 3px solid #10b981; padding: 30px; border-radius: 16px; margin: 30px 0;">
              <h3 style="color: #065f46; font-size: 22px; font-weight: 800; margin-bottom: 20px; text-align: center;">
                🎯 Votre Espace Prospect TaxiAssur
              </h3>
              <p style="color: #065f46; text-align: center; margin-bottom: 25px; font-weight: 600; font-size: 16px;">
                Un espace personnel securise a ete cree specifiquement pour vous
              </p>
              <div class="benefits-grid">
                <div class="benefit-card">
                  <div class="benefit-icon">📤</div>
                  <div class="benefit-title">Upload Documents<br>Drag & Drop</div>
                </div>
                <div class="benefit-card">
                  <div class="benefit-icon">📊</div>
                  <div class="benefit-title">Suivi Dossier<br>Temps Reel</div>
                </div>
                <div class="benefit-card">
                  <div class="benefit-icon">💰</div>
                  <div class="benefit-title">Consultation Devis<br>Comparaison Offres</div>
                </div>
                <div class="benefit-card">
                  <div class="benefit-icon">✍️</div>
                  <div class="benefit-title">Signature Electronique<br>Validation Rapide</div>
                </div>
              </div>
              <div style="text-align: center; margin-top: 25px;">
                <p style="color: #065f46; font-size: 14px; font-weight: 600; margin-bottom: 15px;">
                  🔒 Lien securise et confidentiel - Accessible 24h/24
                </p>
                <a href="https://taxiassur.com/espace-prospect/${lead.access_token}" style="background: #10b981; color: white !important; padding: 15px 35px; text-decoration: none; border-radius: 50px; display: inline-block; font-weight: 700; font-size: 16px; box-shadow: 0 8px 20px rgba(16, 185, 129, 0.3);">
                  🚀 Acceder maintenant
                </a>
              </div>
            </div>

            <div class="documents-section">
              <h3>📋 7 Documents Requis</h3>
              <p class="subtitle">
                Pour etablir votre devis personnalise <strong>sous 24h</strong>, merci de nous fournir ces pieces
              </p>

              <div class="document-item">
                <div class="document-number">1</div>
                <div class="document-info">
                  <strong>Licence de taxi professionnelle</strong>
                  <span>En cours de validite</span>
                </div>
              </div>
              <div class="document-item">
                <div class="document-number">2</div>
                <div class="document-info">
                  <strong>Permis de conduire</strong>
                  <span>Recto-verso, lisible</span>
                </div>
              </div>
              <div class="document-item">
                <div class="document-number">3</div>
                <div class="document-info">
                  <strong>Piece d'identite</strong>
                  <span>CNI ou passeport valide</span>
                </div>
              </div>
              <div class="document-item">
                <div class="document-number">4</div>
                <div class="document-info">
                  <strong>Carte grise du vehicule</strong>
                  <span>Certificat d'immatriculation</span>
                </div>
              </div>
              <div class="document-item">
                <div class="document-number">5</div>
                <div class="document-info">
                  <strong>Releve d'information</strong>
                  <span>De votre assureur precedent (si applicable)</span>
                </div>
              </div>
              <div class="document-item">
                <div class="document-number">6</div>
                <div class="document-info">
                  <strong>Autorisation de stationnement</strong>
                  <span>Autorisation prefectorale de stationnement taxi</span>
                </div>
              </div>
              <div class="document-item">
                <div class="document-number">7</div>
                <div class="document-info">
                  <strong>RIB - Releve d'Identite Bancaire</strong>
                  <span>Coordonnees bancaires completes</span>
                </div>
              </div>

              <div class="alternative-method">
                <p style="color: #1e293b; font-weight: 600; margin-bottom: 8px;">💡 Methode alternative</p>
                <p>Vous pouvez aussi envoyer vos documents par email a</p>
                <p><a href="mailto:team@taxiassur.com" style="color: #10b981; font-weight: 700; text-decoration: none;">team@taxiassur.com</a></p>
              </div>
            </div>

            <div class="steps-section">
              <h3>📍 Les Prochaines Etapes</h3>

              <div class="step-item">
                <div class="step-number">1</div>
                <div class="step-content">
                  <strong>Appel de votre expert (sous 15 min)</strong>
                  <span>Qualification precise de vos besoins et analyse de votre situation</span>
                </div>
              </div>

              <div class="step-item">
                <div class="step-number">2</div>
                <div class="step-content">
                  <strong>Upload de vos documents</strong>
                  <span>Via votre espace securise ou par email</span>
                </div>
              </div>

              <div class="step-item">
                <div class="step-number">3</div>
                <div class="step-content">
                  <strong>Reception de votre devis (sous 24h)</strong>
                  <span>Comparaison des meilleures offres avec jusqu'a 35% d'economie</span>
                </div>
              </div>

              <div class="step-item">
                <div class="step-number">4</div>
                <div class="step-content">
                  <strong>Souscription en ligne</strong>
                  <span>Signature electronique et attestation immediate</span>
                </div>
              </div>
            </div>

            <div class="info-box">
              <h4>✅ Vos Informations Enregistrees</h4>
              <ul>
                <li><strong>Nom :</strong> ${lead.name}</li>
                <li><strong>Telephone :</strong> ${lead.phone}</li>
                <li><strong>Email :</strong> ${lead.email}</li>
                <li><strong>Ville :</strong> ${lead.city}</li>
                <li><strong>Statut professionnel :</strong> ${lead.status}</li>
                ${lead.immatriculation ? `<li><strong>Immatriculation :</strong> ${lead.immatriculation}</li>` : ""}
              </ul>
            </div>

            <div class="contact-box">
              <h3>💬 Une Question ? Nous Sommes La</h3>
              <p>Notre equipe d'experts est disponible pour vous accompagner</p>
              <p>
                <a href="tel:0180855786">📞 01 80 85 57 86</a> |
                <a href="mailto:team@taxiassur.com">📧 team@taxiassur.com</a>
              </p>
            </div>

            <div style="background: #fef3c7; border-left: 6px solid #f59e0b; padding: 20px; border-radius: 12px; margin: 25px 0;">
              <p style="color: #92400e; font-size: 15px; line-height: 1.7; margin: 0;">
                <strong>🏆 Pourquoi TaxiAssur ?</strong><br>
                +100 chauffeurs nous font confiance | -35% en moyenne | Service expert et reactif |
                Courtier agree ORIAS 11 061 425 | Tarifs negocies exclusifs
              </p>
            </div>
          </div>

          <div class="footer">
            <div class="footer-logo">🚕 TaxiAssur</div>
            <p><strong>Courtier Specialise en Assurance Taxi et VTC</strong></p>
            <p style="margin-top: 15px;">Excellence Coverage Risks | ORIAS 11 061 425</p>
            <p>📞 01 80 85 57 86 | 📧 team@taxiassur.com</p>
            <p style="margin-top: 15px; font-size: 12px;">© 2026 TaxiAssur - Tous droits reserves</p>
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
          { email: "team@taxiassur.com", name: "Equipe TaxiAssur" },
        ],
        subject: `Nouveau Lead : ${lead.name} - ${lead.city}`,
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
          name: "TaxiAssur - Courtier Assurance",
          email: "team@taxiassur.com",
        },
        to: [
          { email: lead.email, name: lead.name },
        ],
        replyTo: {
          email: "team@taxiassur.com",
          name: "Equipe TaxiAssur"
        },
        subject: "✅ Votre demande de devis assurance taxi bien recue",
        htmlContent: clientEmailBody,
        headers: {
          "X-Mailer": "TaxiAssur CRM v2.0",
          "X-Priority": "3",
          "Importance": "Normal",
          "X-Entity-Ref-ID": lead.id,
          "List-Unsubscribe": `<mailto:team@taxiassur.com?subject=Desinscription>`,
        },
        tags: ["lead-confirmation", "new-lead", "prospect-email"]
      }),
    });

    if (!clientResponse.ok) {
      const error = await clientResponse.text();
      console.error("❌ BREVO CLIENT EMAIL ERROR:", error);
      console.error("Lead email:", lead.email);
      console.error("Lead name:", lead.name);
      throw new Error(`Failed to send client email: ${error}`);
    }

    const clientResult = await clientResponse.json();
    console.log(`✅ CLIENT EMAIL SENT - Lead: ${lead.id}, Email: ${lead.email}, MessageId: ${clientResult.messageId}`);

    await supabase.from('crm_interactions').insert([
      {
        lead_id: lead.id,
        type: 'email',
        direction: 'outbound',
        subject: `Nouveau Lead : ${lead.name} - ${lead.city}`,
        content: 'Email de notification interne envoye a l equipe',
        to_email: 'team@taxiassur.com',
        from_email: 'team@taxiassur.com'
      },
      {
        lead_id: lead.id,
        type: 'email',
        direction: 'outbound',
        subject: 'Votre demande de devis assurance taxi',
        content: 'Email de confirmation envoye au client',
        to_email: lead.email,
        from_email: 'team@taxiassur.com'
      }
    ]);

    if (account) {
      const { error: emailLogError } = await supabase.from('email_messages').insert([
        {
          account_id: account.id,
          lead_id: lead.id,
          message_id: `lead-notif-${lead.id}-${Date.now()}`,
          from_email: 'team@taxiassur.com',
          from_name: 'TaxiAssur Notifications',
          to_emails: ['team@taxiassur.com'],
          subject: `Nouveau Lead : ${lead.name} - ${lead.city}`,
          body_text: `Nouveau lead: ${lead.name} - ${lead.city}`,
          body_html: teamEmailBody,
          direction: 'outbound',
          status: 'sent',
          email_status: 'sent',
          provider: 'brevo',
          received_at: new Date().toISOString()
        },
        {
          account_id: account.id,
          lead_id: lead.id,
          message_id: `lead-client-${lead.id}-${Date.now() + 1}`,
          from_email: 'team@taxiassur.com',
          from_name: 'TaxiAssur',
          to_emails: [lead.email],
          subject: 'Votre demande de devis assurance taxi',
          body_text: 'Demande de devis recue',
          body_html: clientEmailBody,
          direction: 'outbound',
          status: 'sent',
          email_status: 'sent',
          provider: 'brevo',
          received_at: new Date().toISOString()
        }
      ]);

      if (emailLogError) {
        console.error('Failed to log emails in database:', emailLogError);
      }
    }

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