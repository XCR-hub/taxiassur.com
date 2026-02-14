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
            <h1>DEMANDE RECUE !</h1>
            <div class="subtitle">Felicitations ${lead.name} !</div>
          </div>

          <div class="content">
            <h2 style="color: #1e293b; font-size: 24px; margin-bottom: 15px;">Merci pour votre confiance</h2>
            <p style="color: #475569; font-size: 16px; margin-bottom: 20px;">
              Nous avons bien recu votre demande de devis pour une <strong style="color: #10b981;">assurance taxi a ${lead.city}</strong>.
            </p>

            <div class="success-banner">
              <strong>Reponse rapide garantie</strong>
              Notre expert vous contacte dans les <strong>15 minutes</strong> au <strong>${lead.phone}</strong>
            </div>

            <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border: 3px solid #10b981; padding: 30px; border-radius: 20px; margin: 30px 0;">
              <h3 style="color: #065f46; font-size: 24px; font-weight: 800; margin-bottom: 20px; text-align: center;">
                Votre Espace Personnel Securise
              </h3>
              <p style="color: #065f46; text-align: center; margin-bottom: 25px; font-weight: 600;">
                Un espace dedie a ete cree pour vous permettre de :
              </p>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px;">
                <div style="background: white; padding: 15px; border-radius: 12px; text-align: center;">
                  <div style="color: #10b981; font-size: 32px; margin-bottom: 10px;">📤</div>
                  <strong style="color: #065f46; display: block;">Uploader vos documents</strong>
                </div>
                <div style="background: white; padding: 15px; border-radius: 12px; text-align: center;">
                  <div style="color: #3b82f6; font-size: 32px; margin-bottom: 10px;">📄</div>
                  <strong style="color: #065f46; display: block;">Consulter vos devis</strong>
                </div>
                <div style="background: white; padding: 15px; border-radius: 12px; text-align: center;">
                  <div style="color: #f59e0b; font-size: 32px; margin-bottom: 10px;">⏱️</div>
                  <strong style="color: #065f46; display: block;">Suivre votre dossier</strong>
                </div>
                <div style="background: white; padding: 15px; border-radius: 12px; text-align: center;">
                  <div style="color: #10b981; font-size: 32px; margin-bottom: 10px;">🛡️</div>
                  <strong style="color: #065f46; display: block;">Signer votre contrat</strong>
                </div>
              </div>
            </div>

            <div class="documents-section">
              <h3>Documents requis pour votre devis</h3>
              <p style="color: #1e40af; text-align: center; margin-bottom: 20px; font-weight: 600;">
                Pour obtenir votre devis <strong>sous 24h</strong>, merci de nous transmettre ces <strong>7 pieces</strong>
              </p>

              <div class="document-item">
                <strong>1. Licence de taxi professionnelle</strong>
                <span>En cours de validite</span>
              </div>
              <div class="document-item">
                <strong>2. Permis de conduire</strong>
                <span>Recto-verso, lisible</span>
              </div>
              <div class="document-item">
                <strong>3. Piece d'identite</strong>
                <span>CNI ou passeport valide</span>
              </div>
              <div class="document-item">
                <strong>4. Carte grise du vehicule</strong>
                <span>Certificat d'immatriculation</span>
              </div>
              <div class="document-item">
                <strong>5. Releve d'information</strong>
                <span>De votre assureur precedent (si applicable)</span>
              </div>
              <div class="document-item">
                <strong>6. Autorisation de stationnement</strong>
                <span>Autorisation prefectorale de stationnement taxi</span>
              </div>
              <div class="document-item">
                <strong>7. RIB - Releve d'Identite Bancaire</strong>
                <span>Coordonnees bancaires completes</span>
              </div>
            </div>

            <div class="cta-section">
              <p style="color: #92400e; font-size: 18px; font-weight: 700; margin-bottom: 15px;">VOTRE ESPACE PERSONNEL SECURISE</p>
              <p style="color: #92400e; margin-bottom: 20px;">Uploadez vos documents et suivez votre dossier en temps reel</p>
              <a href="https://taxiassur.com/espace-prospect?token=${lead.access_token}" class="cta-button" style="text-decoration: none; color: #ffffff !important;">
                ACCEDER A MON ESPACE
              </a>
              <p style="color: #92400e; font-size: 13px; margin-top: 15px;">
                Lien securise et personnel - Conservez ce lien pour acceder a votre espace a tout moment
              </p>
              <p style="color: #92400e; font-size: 14px; margin-top: 10px;">
                Vous pouvez aussi envoyer vos documents par email a <a href="mailto:team@taxiassur.com" style="color: #db2777; font-weight: 600;">team@taxiassur.com</a>
              </p>
            </div>

            <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 3px solid #f59e0b; padding: 30px; border-radius: 20px; margin: 30px 0;">
              <h3 style="color: #92400e; font-size: 24px; font-weight: 800; margin-bottom: 20px; text-align: center;">
                Ce qui va se passer
              </h3>
              <div style="background: white; padding: 20px; border-radius: 15px; margin: 15px 0;">
                <div style="display: flex; align-items: start; gap: 20px;">
                  <div style="background: #10b981; color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 20px; flex-shrink: 0;">1</div>
                  <div>
                    <strong style="color: #1e293b; display: block; margin-bottom: 5px; font-size: 18px;">Appel de votre expert (sous 15 min)</strong>
                    <span style="color: #64748b;">Analyse de vos besoins specifiques</span>
                  </div>
                </div>
              </div>
              <div style="background: white; padding: 20px; border-radius: 15px; margin: 15px 0;">
                <div style="display: flex; align-items: start; gap: 20px;">
                  <div style="background: #f59e0b; color: black; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 20px; flex-shrink: 0;">2</div>
                  <div>
                    <strong style="color: #1e293b; display: block; margin-bottom: 5px; font-size: 18px;">Devis personnalise</strong>
                    <span style="color: #64748b;">Jusqu'a 35% d'economies garanties</span>
                  </div>
                </div>
              </div>
              <div style="background: white; padding: 20px; border-radius: 15px; margin: 15px 0;">
                <div style="display: flex; align-items: start; gap: 20px;">
                  <div style="background: #3b82f6; color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 20px; flex-shrink: 0;">3</div>
                  <div>
                    <strong style="color: #1e293b; display: block; margin-bottom: 5px; font-size: 18px;">Souscription rapide</strong>
                    <span style="color: #64748b;">Attestation sous 24h apres validation</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="info-box">
              <strong>Vos informations enregistrees</strong>
              <ul>
                <li>Telephone : ${lead.phone}</li>
                <li>Email : ${lead.email}</li>
                <li>Ville : ${lead.city}</li>
                <li>Statut : ${lead.status}</li>
                ${lead.immatriculation ? `<li>Immatriculation : ${lead.immatriculation}</li>` : ""}
              </ul>
            </div>

            <div class="contact-banner">
              <h3>Besoin d'aide ?</h3>
              <p style="color: #0e7490; margin-bottom: 15px;">
                Notre equipe est disponible pour repondre a toutes vos questions
              </p>
              <p><a href="tel:0180855786" style="color: #164e63; text-decoration: none; font-weight: 700;">01 80 85 57 86</a> | <a href="mailto:team@taxiassur.com" style="color: #164e63; text-decoration: none; font-weight: 700;">team@taxiassur.com</a></p>
            </div>
          </div>

          <div class="footer">
            <div class="footer-logo">TaxiAssur</div>
            <p><strong>Courtier specialise en assurance taxi et VTC</strong></p>
            <p style="margin-top: 15px;">01 80 85 57 86 | team@taxiassur.com</p>
            <p style="margin-top: 10px;">2026 TaxiAssur - Tous droits reserves</p>
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