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

// Fonction pour ajouter le tracking aux liens
function addLinkTracking(html: string, trackingId: string, supabaseUrl: string): string {
  const urlRegex = /href="([^"]+)"/gi;
  return html.replace(urlRegex, (match, url) => {
    // Ne pas tracker les liens mailto: et tel:
    if (url.startsWith('mailto:') || url.startsWith('tel:') || url.startsWith('#')) {
      return match;
    }
    // Créer l'URL de tracking
    const trackedUrl = `${supabaseUrl}/functions/v1/track-email-click?id=${trackingId}&url=${encodeURIComponent(url)}`;
    return `href="${trackedUrl}"`;
  });
}

// Fonction pour ajouter le pixel de tracking
function addTrackingPixel(html: string, trackingId: string, supabaseUrl: string): string {
  const pixelUrl = `${supabaseUrl}/functions/v1/track-email-open?id=${trackingId}`;
  const pixel = `<img src="${pixelUrl}" width="1" height="1" style="display:none;" alt="" />`;
  // Ajouter le pixel juste avant la fermeture du body
  return html.replace('</body>', `${pixel}</body>`);
}

async function sendEmailSMTP(
  to: string,
  toName: string,
  subject: string,
  htmlBody: string,
  fromEmail: string = "team@taxiassur.com",
  fromName: string = "TaxiAssur"
): Promise<void> {
  const SMTP_HOST = Deno.env.get("IONOS_SMTP_HOST") || "smtp.ionos.fr";
  const SMTP_PORT = parseInt(Deno.env.get("IONOS_SMTP_PORT") || "587");
  const SMTP_USER = Deno.env.get("IONOS_EMAIL_USER") || "team@taxiassur.com";
  const SMTP_PASS = Deno.env.get("IONOS_EMAIL_PASSWORD");

  if (!SMTP_PASS) {
    throw new Error("IONOS_EMAIL_PASSWORD not configured");
  }

  // Port 465 utilise SSL/TLS direct, pas STARTTLS
  const conn = await Deno.connectTls({
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
    // Lire le banner du serveur
    await readResponse();

    // Envoi de EHLO
    await sendCommand(`EHLO taxiassur.com`);

    // Authentification
    await sendCommand("AUTH LOGIN");
    await sendCommand(base64Encode(SMTP_USER));
    await sendCommand(base64Encode(SMTP_PASS));

    // Envoi de l'email
    await sendCommand(`MAIL FROM:<${fromEmail}>`);
    await sendCommand(`RCPT TO:<${to}>`);
    await sendCommand("DATA");

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

    await sendCommand(emailContent);
    await sendCommand("QUIT");
    conn.close();
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
    const payload: any = await req.json();

    // Format 1: Appel direct pour notification de document (depuis le trigger)
    if (payload.to && payload.subject && payload.htmlBody) {
      console.log(`📧 Envoi email direct à ${payload.to}`);

      await sendEmailSMTP(
        payload.to,
        payload.toName || payload.to,
        payload.subject,
        payload.htmlBody,
        payload.fromEmail || "team@taxiassur.com",
        payload.fromName || "TaxiAssur"
      );

      return new Response(
        JSON.stringify({
          success: true,
          message: "Email envoyé",
          recipient: payload.to
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format 2: Webhook de nouveau lead (format existant)
    const lead = payload.record;
    if (!lead) {
      throw new Error("Format invalide: ni format direct ni webhook lead");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Créer un tracking_id unique pour l'email équipe
    const { data: teamEmailRecord } = await supabase
      .from('email_sends')
      .insert({
        lead_id: lead.id,
        email_to: 'team@taxiassur.com',
        email_from: 'team@taxiassur.com',
        subject: `🎯 Nouveau Lead : ${lead.name} - ${lead.city}`,
        status: 'sent'
      })
      .select('tracking_id')
      .single();

    const teamTrackingId = teamEmailRecord?.tracking_id;

    // Créer un tracking_id unique pour l'email client
    const { data: clientEmailRecord } = await supabase
      .from('email_sends')
      .insert({
        lead_id: lead.id,
        email_to: lead.email,
        email_from: 'team@taxiassur.com',
        subject: 'Votre demande de devis assurance taxi',
        status: 'sent'
      })
      .select('tracking_id')
      .single();

    const clientTrackingId = clientEmailRecord?.tracking_id;

    let teamEmailBody = `
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

    // Utiliser le nouveau design moderne TaxiAssur
    let clientEmailBody = `
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
          }
          .logo {
            color: white;
            font-size: 28px;
            font-weight: 900;
            margin-bottom: 20px;
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
          .highlight-box {
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            border-left: 6px solid #f59e0b;
            padding: 25px;
            border-radius: 12px;
            margin: 30px 0;
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
          .documents-section {
            background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
            border: 3px solid #3b82f6;
            padding: 30px;
            border-radius: 16px;
            margin: 30px 0;
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
          .steps-section {
            background: white;
            border: 2px solid #e5e7eb;
            padding: 30px;
            border-radius: 16px;
            margin: 30px 0;
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
          .contact-box {
            background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
            border-radius: 12px;
            padding: 25px;
            text-align: center;
            margin: 30px 0;
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

            <p style="color: #475569; font-size: 16px; line-height: 1.8; margin-bottom: 30px;">
              Merci de nous avoir choisi pour votre <strong>assurance taxi professionnel a ${lead.city}</strong>.
              Votre demande a ete enregistree avec succes et notre equipe d'experts est deja mobilisee pour vous proposer
              les meilleures offres du marche.
            </p>

            <div class="highlight-box">
              <h3 style="color: #92400e; font-size: 20px; font-weight: 800; margin-bottom: 12px;">⚡ Reponse sous 15 minutes</h3>
              <p style="color: #78350f; font-size: 16px;">
                Notre expert vous contactera au <strong>${lead.phone}</strong> dans les <strong>15 prochaines minutes</strong>
                pour analyser vos besoins specifiques.
              </p>
            </div>

            <div class="urgent-action">
              <h2>📤 Action Immediate Requise</h2>
              <p style="color: #d1fae5; font-size: 17px; margin-bottom: 25px; font-weight: 500;">
                Accelerez le traitement de votre dossier en uploadant vos documents des maintenant
              </p>
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
              <div class="benefits-grid">
                <div class="benefit-card">
                  <div style="font-size: 36px; margin-bottom: 10px;">📤</div>
                  <div style="color: #065f46; font-weight: 700; font-size: 15px;">Upload Documents<br>Drag & Drop</div>
                </div>
                <div class="benefit-card">
                  <div style="font-size: 36px; margin-bottom: 10px;">📊</div>
                  <div style="color: #065f46; font-weight: 700; font-size: 15px;">Suivi Dossier<br>Temps Reel</div>
                </div>
                <div class="benefit-card">
                  <div style="font-size: 36px; margin-bottom: 10px;">💰</div>
                  <div style="color: #065f46; font-weight: 700; font-size: 15px;">Consultation Devis<br>Comparaison Offres</div>
                </div>
                <div class="benefit-card">
                  <div style="font-size: 36px; margin-bottom: 10px;">✍️</div>
                  <div style="color: #065f46; font-weight: 700; font-size: 15px;">Signature Electronique<br>Validation Rapide</div>
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
              <h3 style="color: #1e40af; font-size: 24px; font-weight: 800; margin-bottom: 15px; text-align: center;">📋 7 Documents Requis</h3>
              <p style="color: #1e40af; text-align: center; margin-bottom: 25px; font-size: 16px; font-weight: 600;">
                Pour etablir votre devis personnalise <strong>sous 24h</strong>, merci de nous fournir ces pieces
              </p>

              <div class="document-item">
                <div class="document-number">1</div>
                <div style="flex: 1;">
                  <strong style="color: #1e293b; font-size: 15px; display: block; margin-bottom: 3px;">Licence de taxi professionnelle</strong>
                  <span style="color: #64748b; font-size: 13px;">En cours de validite</span>
                </div>
              </div>
              <div class="document-item">
                <div class="document-number">2</div>
                <div style="flex: 1;">
                  <strong style="color: #1e293b; font-size: 15px; display: block; margin-bottom: 3px;">Permis de conduire</strong>
                  <span style="color: #64748b; font-size: 13px;">Recto-verso, lisible</span>
                </div>
              </div>
              <div class="document-item">
                <div class="document-number">3</div>
                <div style="flex: 1;">
                  <strong style="color: #1e293b; font-size: 15px; display: block; margin-bottom: 3px;">Piece d'identite</strong>
                  <span style="color: #64748b; font-size: 13px;">CNI ou passeport valide</span>
                </div>
              </div>
              <div class="document-item">
                <div class="document-number">4</div>
                <div style="flex: 1;">
                  <strong style="color: #1e293b; font-size: 15px; display: block; margin-bottom: 3px;">Carte grise du vehicule</strong>
                  <span style="color: #64748b; font-size: 13px;">Certificat d'immatriculation</span>
                </div>
              </div>
              <div class="document-item">
                <div class="document-number">5</div>
                <div style="flex: 1;">
                  <strong style="color: #1e293b; font-size: 15px; display: block; margin-bottom: 3px;">Releve d'information</strong>
                  <span style="color: #64748b; font-size: 13px;">De votre assureur precedent (si applicable)</span>
                </div>
              </div>
              <div class="document-item">
                <div class="document-number">6</div>
                <div style="flex: 1;">
                  <strong style="color: #1e293b; font-size: 15px; display: block; margin-bottom: 3px;">Autorisation de stationnement</strong>
                  <span style="color: #64748b; font-size: 13px;">Autorisation prefectorale de stationnement taxi</span>
                </div>
              </div>
              <div class="document-item">
                <div class="document-number">7</div>
                <div style="flex: 1;">
                  <strong style="color: #1e293b; font-size: 15px; display: block; margin-bottom: 3px;">RIB - Releve d'Identite Bancaire</strong>
                  <span style="color: #64748b; font-size: 13px;">Coordonnees bancaires completes</span>
                </div>
              </div>

              <div style="background: #f1f5f9; border: 2px dashed #cbd5e1; padding: 20px; border-radius: 12px; margin: 20px 0; text-align: center;">
                <p style="color: #1e293b; font-weight: 600; margin-bottom: 8px; font-size: 14px;">💡 Methode alternative</p>
                <p style="color: #475569; font-size: 14px; margin: 5px 0;">Vous pouvez aussi envoyer vos documents par email a</p>
                <p style="color: #475569; font-size: 14px;"><a href="mailto:team@taxiassur.com" style="color: #10b981; font-weight: 700; text-decoration: none;">team@taxiassur.com</a></p>
              </div>
            </div>

            <div class="steps-section">
              <h3 style="color: #1e293b; font-size: 22px; font-weight: 800; margin-bottom: 25px; text-align: center;">📍 Les Prochaines Etapes</h3>

              <div class="step-item">
                <div class="step-number">1</div>
                <div>
                  <strong style="color: #1e293b; display: block; margin-bottom: 5px; font-size: 17px;">Appel de votre expert (sous 15 min)</strong>
                  <span style="color: #64748b; font-size: 15px;">Qualification precise de vos besoins et analyse de votre situation</span>
                </div>
              </div>

              <div class="step-item">
                <div class="step-number">2</div>
                <div>
                  <strong style="color: #1e293b; display: block; margin-bottom: 5px; font-size: 17px;">Upload de vos documents</strong>
                  <span style="color: #64748b; font-size: 15px;">Via votre espace securise ou par email</span>
                </div>
              </div>

              <div class="step-item">
                <div class="step-number">3</div>
                <div>
                  <strong style="color: #1e293b; display: block; margin-bottom: 5px; font-size: 17px;">Reception de votre devis (sous 24h)</strong>
                  <span style="color: #64748b; font-size: 15px;">Comparaison des meilleures offres avec jusqu'a 35% d'economie</span>
                </div>
              </div>

              <div class="step-item">
                <div class="step-number">4</div>
                <div>
                  <strong style="color: #1e293b; display: block; margin-bottom: 5px; font-size: 17px;">Souscription en ligne</strong>
                  <span style="color: #64748b; font-size: 15px;">Signature electronique et attestation immediate</span>
                </div>
              </div>
            </div>

            <div style="background: #f8fafc; border: 2px solid #e2e8f0; padding: 20px; border-radius: 12px; margin: 25px 0;">
              <h4 style="color: #1e293b; font-size: 16px; margin-bottom: 12px; font-weight: 700;">✅ Vos Informations Enregistrees</h4>
              <ul style="list-style: none; padding: 0;">
                <li style="color: #475569; padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px;"><strong>Nom :</strong> ${lead.name}</li>
                <li style="color: #475569; padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px;"><strong>Telephone :</strong> ${lead.phone}</li>
                <li style="color: #475569; padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px;"><strong>Email :</strong> ${lead.email}</li>
                <li style="color: #475569; padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px;"><strong>Ville :</strong> ${lead.city}</li>
                <li style="color: #475569; padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px;"><strong>Statut professionnel :</strong> ${lead.status}</li>
                ${lead.immatriculation ? `<li style="color: #475569; padding: 8px 0; font-size: 14px;"><strong>Immatriculation :</strong> ${lead.immatriculation}</li>` : ""}
              </ul>
            </div>

            <div class="contact-box">
              <h3 style="color: white; font-size: 20px; font-weight: 700; margin-bottom: 12px;">💬 Une Question ? Nous Sommes La</h3>
              <p style="color: #e0f2fe; margin-bottom: 15px; font-size: 15px;">
                Notre equipe d'experts est disponible pour vous accompagner
              </p>
              <p>
                <a href="tel:0180855786" style="color: white; text-decoration: none; font-weight: 700; font-size: 16px; margin: 0 10px;">📞 01 80 85 57 86</a> |
                <a href="mailto:team@taxiassur.com" style="color: white; text-decoration: none; font-weight: 700; font-size: 16px; margin: 0 10px;">📧 team@taxiassur.com</a>
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

    // Ajouter le tracking aux emails
    if (teamTrackingId) {
      teamEmailBody = addLinkTracking(teamEmailBody, teamTrackingId, supabaseUrl);
      teamEmailBody = addTrackingPixel(teamEmailBody, teamTrackingId, supabaseUrl);
    }

    if (clientTrackingId) {
      clientEmailBody = addLinkTracking(clientEmailBody, clientTrackingId, supabaseUrl);
      clientEmailBody = addTrackingPixel(clientEmailBody, clientTrackingId, supabaseUrl);
    }

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
        message: "Emails sent via IONOS SMTP with tracking",
        lead_id: lead.id,
        tracking: {
          team_tracking_id: teamTrackingId,
          client_tracking_id: clientTrackingId
        }
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