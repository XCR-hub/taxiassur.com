import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { sendSmtpHtmlEmail } from "../_shared/smtp.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function sendEmailSMTP(
  to: string,
  toName: string,
  subject: string,
  htmlBody: string,
  fromEmail: string = "team@taxiassur.com",
  fromName: string = "TaxiAssur"
): Promise<void> {
  await sendSmtpHtmlEmail({
    to,
    toName,
    subject,
    htmlBody,
    fromEmail,
    fromName,
    headers: {
      "X-Mailer": "TaxiAssur-hMail",
    },
  });
}

const MISSING_TEXT_VALUES = new Set(["undefined", "null", "nan"]);
const NEW_LEAD_TEAM_TEMPLATES = new Set(["new_lead_team", "new_lead_commercial"]);
const NEW_LEAD_CLIENT_TEMPLATES = new Set(["new_lead_prospect", "new_lead_confirmation"]);

type QueueVars = Record<string, string>;
type QueueSource = Record<string, unknown>;

function cleanText(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = String(value).trim();
  if (!text || MISSING_TEXT_VALUES.has(text.toLowerCase())) return "";
  return text;
}

function firstText(...values: unknown[]): string {
  for (const value of values) {
    const text = cleanText(value);
    if (text) return text;
  }
  return "";
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function normalizeQueueVars(input: unknown): QueueVars {
  const source = input && typeof input === "object" ? input as QueueSource : {};
  const firstName = firstText(source.first_name, source.firstName, source.firstname);
  const lastName = firstText(source.last_name, source.lastName, source.lastname);
  const combinedName = [firstName, lastName].filter(Boolean).join(" ");
  const leadName = firstText(
    source.lead_name,
    source.full_name,
    source.fullName,
    source.name,
    combinedName,
  ) || "Prospect";
  const accessToken = firstText(source.access_token, source.accessToken);
  const uploadLink = firstText(source.upload_link, source.uploadLink)
    || (accessToken
      ? `https://taxiassur.com/espace-prospect?token=${encodeURIComponent(accessToken)}`
      : "https://taxiassur.com/espace-documents");

  return {
    first_name: firstName || leadName.split(/\s+/)[0] || "Prospect",
    lead_name: leadName,
    lead_email: firstText(source.lead_email, source.email, source.mail),
    lead_phone: firstText(source.lead_phone, source.phone, source.telephone, source.mobile),
    lead_city: firstText(source.lead_city, source.city, source.ville) || "Non renseigne",
    lead_id: firstText(source.lead_id, source.id, source.leadId),
    access_token: accessToken,
    upload_link: uploadLink,
  };
}

function getInvalidNotificationReason(templateKey: string, recipient: string, vars: QueueVars): string {
  if (NEW_LEAD_TEAM_TEMPLATES.has(templateKey) && !vars.lead_email && !vars.lead_phone) {
    return "missing lead phone and email";
  }

  if (NEW_LEAD_CLIENT_TEMPLATES.has(templateKey) && !isValidEmail(cleanText(recipient))) {
    return "missing or invalid recipient email";
  }

  return "";
}

function buildTeamEmail(vars: any): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: #f3f4f6; margin: 0; padding: 20px; }
    .container { max-width: 650px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; padding: 25px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
    .alert-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
    .info-grid { display: grid; gap: 15px; margin: 20px 0; }
    .info-item { background: #f9fafb; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb; }
    .info-label { color: #6b7280; font-size: 12px; text-transform: uppercase; margin-bottom: 5px; }
    .info-value { color: #1f2937; font-weight: bold; font-size: 16px; }
    .cta-button { background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; }
    .footer { background: #1f2937; color: white; padding: 20px; text-align: center; font-size: 12px; border-radius: 0 0 10px 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 28px;">NOUVEAU LEAD TAXIASSUR</h1>
      <p style="margin: 10px 0 0 0;">Traitement prioritaire requis</p>
    </div>
    <div class="content">
      <div class="alert-box">
        <strong>ACTION REQUISE :</strong> Contactez ce prospect dans les <strong>15 minutes</strong>
      </div>
      <h2 style="color: #1f2937; margin-top: 0;">Informations du prospect</h2>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Nom complet</div>
          <div class="info-value">${vars.lead_name}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Telephone</div>
          <div class="info-value"><a href="tel:${vars.lead_phone}" style="color: #10b981; text-decoration: none;">${vars.lead_phone}</a></div>
        </div>
        <div class="info-item">
          <div class="info-label">Email</div>
          <div class="info-value"><a href="mailto:${vars.lead_email}" style="color: #3b82f6; text-decoration: none;">${vars.lead_email}</a></div>
        </div>
        <div class="info-item">
          <div class="info-label">Ville</div>
          <div class="info-value">${vars.lead_city || 'Non renseignée'}</div>
        </div>
      </div>
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://taxiassur.com/backoffice/crm-commercial" class="cta-button">OUVRIR LE CRM</a>
      </div>
    </div>
    <div class="footer">
      <strong>TaxiAssur CRM</strong> - Notification automatique
    </div>
  </div>
</body>
</html>`;
}

function buildProspectConfirmEmail(vars: any): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; background: #f3f4f6; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center; color: white; }
    .header h1 { margin: 0 0 10px 0; font-size: 28px; }
    .content { padding: 30px; }
    .success-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 8px; }
    .docs-section { background: #f0f9ff; border: 2px solid #3b82f6; padding: 25px; border-radius: 15px; margin: 25px 0; }
    .doc-item { background: white; padding: 12px 15px; margin: 8px 0; border-radius: 8px; border-left: 4px solid #10b981; }
    .cta-button { background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; padding: 18px 35px; text-decoration: none; border-radius: 50px; display: inline-block; font-weight: bold; font-size: 16px; }
    .contact-box { background: #dbeafe; padding: 25px; border-radius: 15px; margin: 25px 0; text-align: center; }
    .footer { background: #1f2937; color: white; padding: 30px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>DEMANDE RECUE !</h1>
      <p style="margin: 0; font-size: 18px;">Bonjour ${vars.first_name}</p>
    </div>
    <div class="content">
      <div class="success-box">
        <strong>Excellente nouvelle !</strong><br>
        Votre demande de devis d'assurance taxi a ete confirmee avec succes.
      </div>
      <h2 style="color: #1f2937;">Prochaines etapes</h2>
      <ul style="color: #4b5563;">
        <li>Votre expert TaxiAssur vous recontacte <strong>sous 15 minutes</strong></li>
        <li>Analyse personnalisee de vos besoins</li>
        <li>Proposition des meilleures offres du marche</li>
        <li>Economies moyennes constatees : <strong>580 €/an</strong></li>
      </ul>
      <div class="docs-section">
        <h3 style="color: #1e40af; margin-top: 0; text-align: center;">7 Documents requis</h3>
        <div class="doc-item"><strong>1.</strong> Licence de taxi professionnelle</div>
        <div class="doc-item"><strong>2.</strong> Permis de conduire (recto-verso)</div>
        <div class="doc-item"><strong>3.</strong> Piece d'identite (CNI/passeport)</div>
        <div class="doc-item"><strong>4.</strong> Carte grise du vehicule</div>
        <div class="doc-item"><strong>5.</strong> Releve d'information assureur</div>
        <div class="doc-item"><strong>6.</strong> Autorisation de stationnement</div>
        <div class="doc-item"><strong>7.</strong> RIB - Releve d'Identite Bancaire</div>
      </div>
      <div style="text-align: center; background: #fef3c7; padding: 25px; border-radius: 15px; margin: 25px 0;">
        <p style="color: #92400e; font-weight: bold; margin-bottom: 15px;">Uploadez vos documents maintenant !</p>
        <a href="${vars.upload_link}" class="cta-button">ACCEDER A MON ESPACE</a>
      </div>
      <div class="contact-box">
        <h3 style="color: #1e40af; margin-top: 0;">Besoin d'aide ?</h3>
        <p style="margin: 10px 0;">
          <strong>01 80 85 57 86</strong><br>
          <a href="mailto:team@taxiassur.com" style="color: #1e40af;">team@taxiassur.com</a>
        </p>
      </div>
    </div>
    <div class="footer">
      <div style="font-size: 22px; font-weight: bold; color: #10b981; margin-bottom: 10px;">TaxiAssur</div>
      <p>Courtier specialise en assurance taxi et VTC</p>
      <p style="margin-top: 10px; font-size: 12px;">ORIAS 11 061 425 - Excellence Coverage Risks</p>
    </div>
  </div>
</body>
</html>`;
}

function buildDocumentReminderEmail(vars: any): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f3f4f6; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; text-align: center; color: white; }
    .content { padding: 30px; }
    .reminder-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 8px; }
    .cta-button { background: #f97316; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; }
    .footer { background: #1f2937; color: #9ca3af; padding: 20px; text-align: center; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">Rappel : Documents en attente</h1>
    </div>
    <div class="content">
      <p>Bonjour ${vars.first_name},</p>
      <div class="reminder-box">
        <strong>Votre dossier est incomplet.</strong><br>
        Nous attendons vos documents pour etablir votre devis personnalise.
      </div>
      <p>Pour que notre equipe puisse vous proposer les meilleures offres, merci de deposer vos documents dans votre espace prospect :</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${vars.upload_link}" class="cta-button">Deposer mes documents</a>
      </div>
      <p style="color: #6b7280; font-size: 14px;">Des questions ? Appelez-nous au <strong>01 80 85 57 86</strong></p>
    </div>
    <div class="footer">TaxiAssur - ORIAS 11 061 425</div>
  </div>
</body>
</html>`;
}

function buildQuoteReminderEmail(vars: any): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f3f4f6; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 30px; text-align: center; color: white; }
    .content { padding: 30px; }
    .quote-box { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 20px 0; border-radius: 8px; }
    .cta-button { background: #10b981; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; }
    .footer { background: #1f2937; color: #9ca3af; padding: 20px; text-align: center; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">Votre devis vous attend</h1>
    </div>
    <div class="content">
      <p>Bonjour ${vars.first_name},</p>
      <div class="quote-box">
        <strong>Votre devis d'assurance taxi est disponible !</strong><br>
        Notre offre exclusive est valable encore quelques jours.
      </div>
      <p>Consultez et acceptez votre devis personnalise depuis votre espace prospect :</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${vars.upload_link}" class="cta-button">Voir mon devis</a>
      </div>
      <p style="color: #6b7280; font-size: 14px;">Besoin d'aide pour choisir ? Appelez-nous au <strong>01 80 85 57 86</strong></p>
    </div>
    <div class="footer">TaxiAssur - ORIAS 11 061 425</div>
  </div>
</body>
</html>`;
}

function buildPaymentReminderEmail(vars: any): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f3f4f6; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; color: white; }
    .content { padding: 30px; }
    .payment-box { background: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 8px; }
    .cta-button { background: #f97316; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; }
    .footer { background: #1f2937; color: #9ca3af; padding: 20px; text-align: center; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">Finalisez votre souscription</h1>
    </div>
    <div class="content">
      <p>Bonjour ${vars.first_name},</p>
      <div class="payment-box">
        <strong>Votre devis est accepte !</strong><br>
        Il ne reste plus qu'a finaliser le paiement pour activer votre assurance.
      </div>
      <p>Votre couverture demarre des reception du paiement :</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${vars.upload_link}" class="cta-button">Proceder au paiement</a>
      </div>
      <p style="color: #6b7280; font-size: 14px;">Questions ? <strong>01 80 85 57 86</strong></p>
    </div>
    <div class="footer">TaxiAssur - ORIAS 11 061 425</div>
  </div>
</body>
</html>`;
}

function buildSignatureReminderEmail(vars: any): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f3f4f6; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 30px; text-align: center; color: white; }
    .content { padding: 30px; }
    .signature-box { background: #f5f3ff; border-left: 4px solid #8b5cf6; padding: 20px; margin: 20px 0; border-radius: 8px; }
    .cta-button { background: #8b5cf6; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; }
    .footer { background: #1f2937; color: #9ca3af; padding: 20px; text-align: center; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">Signez votre contrat</h1>
    </div>
    <div class="content">
      <p>Bonjour ${vars.first_name},</p>
      <div class="signature-box">
        <strong>Votre contrat est pret a etre signe !</strong><br>
        La signature electronique est securisee et prend moins de 2 minutes.
      </div>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${vars.upload_link}" class="cta-button">Signer mon contrat</a>
      </div>
      <p style="color: #6b7280; font-size: 14px;">Besoin d'aide ? <strong>01 80 85 57 86</strong></p>
    </div>
    <div class="footer">TaxiAssur - ORIAS 11 061 425</div>
  </div>
</body>
</html>`;
}

function buildWelcomeClientEmail(vars: any): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f3f4f6; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center; color: white; }
    .content { padding: 30px; }
    .welcome-box { background: #f0fdf4; border: 2px solid #10b981; padding: 25px; margin: 20px 0; border-radius: 12px; text-align: center; }
    .feature-item { background: #f9fafb; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 3px solid #10b981; }
    .cta-button { background: #10b981; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; }
    .footer { background: #1f2937; color: #9ca3af; padding: 20px; text-align: center; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">Bienvenue chez TaxiAssur !</h1>
      <p style="margin: 10px 0 0 0;">Bonjour ${vars.first_name}</p>
    </div>
    <div class="content">
      <div class="welcome-box">
        <h2 style="color: #059669; margin: 0 0 10px 0;">Votre contrat est actif !</h2>
        <p style="color: #4b5563; margin: 0;">Vous etes maintenant protege par TaxiAssur.</p>
      </div>
      <h3 style="color: #1f2937;">Votre espace client vous permet de :</h3>
      <div class="feature-item">Consulter et telecharger vos documents</div>
      <div class="feature-item">Declarer un sinistre en ligne</div>
      <div class="feature-item">Modifier vos informations personnelles</div>
      <div class="feature-item">Contacter votre conseiller dedie</div>
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://taxiassur.com/espace-client" class="cta-button">Acceder a mon espace client</a>
      </div>
      <p style="color: #6b7280; font-size: 14px; text-align: center;">Service client : <strong>01 80 85 57 86</strong></p>
    </div>
    <div class="footer">TaxiAssur - ORIAS 11 061 425</div>
  </div>
</body>
</html>`;
}

function buildQuoteReadyEmail(vars: any): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f3f4f6; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 30px; text-align: center; color: white; }
    .content { padding: 30px; }
    .quote-box { background: #fff7ed; border-left: 4px solid #f97316; padding: 20px; margin: 20px 0; border-radius: 8px; }
    .cta-button { background: #f97316; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; }
    .footer { background: #1f2937; color: #9ca3af; padding: 20px; text-align: center; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">Votre devis est pret !</h1>
    </div>
    <div class="content">
      <p>Bonjour ${vars.first_name},</p>
      <div class="quote-box">
        <strong>Bonne nouvelle !</strong><br>
        Notre equipe a prepare votre devis d'assurance taxi personnalise.
      </div>
      <p>Consultez les offres selectionnees pour vous et choisissez la meilleure protection :</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${vars.upload_link}" class="cta-button">Voir mes devis</a>
      </div>
      <p style="color: #6b7280; font-size: 14px;">Des questions ? <strong>01 80 85 57 86</strong></p>
    </div>
    <div class="footer">TaxiAssur - ORIAS 11 061 425</div>
  </div>
</body>
</html>`;
}

const TEMPLATE_BUILDERS: Record<string, (vars: any) => { subject: string; html: string }> = {
  new_lead_team: (vars) => ({
    subject: `[TAXIASSUR] Nouveau Lead - ${vars.lead_name} - ${vars.lead_city || ''}`.trim(),
    html: buildTeamEmail(vars),
  }),
  new_lead_commercial: (vars) => ({
    subject: `[TAXIASSUR] Nouveau Lead - ${vars.lead_name} - ${vars.lead_city || ''}`.trim(),
    html: buildTeamEmail(vars),
  }),
  new_lead_prospect: (vars) => ({
    subject: "Demande confirmee ! Votre expert TaxiAssur vous recontacte rapidement",
    html: buildProspectConfirmEmail(vars),
  }),
  new_lead_confirmation: (vars) => ({
    subject: "Demande confirmee ! Votre expert TaxiAssur vous recontacte rapidement",
    html: buildProspectConfirmEmail(vars),
  }),
  relance_documents: (vars) => ({
    subject: "Rappel : Documents manquants pour votre devis TaxiAssur",
    html: buildDocumentReminderEmail(vars),
  }),
  document_reminder: (vars) => ({
    subject: "Rappel : Documents manquants pour votre devis TaxiAssur",
    html: buildDocumentReminderEmail(vars),
  }),
  relance_devis: (vars) => ({
    subject: "Votre devis TaxiAssur vous attend",
    html: buildQuoteReminderEmail(vars),
  }),
  quote_reminder: (vars) => ({
    subject: "Votre devis TaxiAssur vous attend",
    html: buildQuoteReminderEmail(vars),
  }),
  quote_ready: (vars) => ({
    subject: "Votre devis est pret !",
    html: buildQuoteReadyEmail(vars),
  }),
  devis_envoye: (vars) => ({
    subject: "Votre devis est pret !",
    html: buildQuoteReadyEmail(vars),
  }),
  relance_paiement: (vars) => ({
    subject: "Finalisez votre souscription TaxiAssur",
    html: buildPaymentReminderEmail(vars),
  }),
  payment_reminder: (vars) => ({
    subject: "Finalisez votre souscription TaxiAssur",
    html: buildPaymentReminderEmail(vars),
  }),
  relance_signature: (vars) => ({
    subject: "Signez votre contrat TaxiAssur",
    html: buildSignatureReminderEmail(vars),
  }),
  signature_reminder: (vars) => ({
    subject: "Signez votre contrat TaxiAssur",
    html: buildSignatureReminderEmail(vars),
  }),
  welcome_client: (vars) => ({
    subject: "Bienvenue chez TaxiAssur !",
    html: buildWelcomeClientEmail(vars),
  }),
  client_actif: (vars) => ({
    subject: "Bienvenue chez TaxiAssur !",
    html: buildWelcomeClientEmail(vars),
  }),
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Processing notification queue...");

    const { data: pending, error: fetchError } = await supabase
      .from("notification_queue")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_for", new Date().toISOString())
      .order("priority", { ascending: false })
      .limit(20);

    if (fetchError) throw fetchError;

    if (!pending || pending.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: "No pending notifications" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${pending.length} pending notifications`);

    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const notif of pending) {
      try {
        await supabase
          .from("notification_queue")
          .update({ status: "processing" })
          .eq("id", notif.id);

        const vars = normalizeQueueVars(notif.variables || notif.data || {});
        const builder = TEMPLATE_BUILDERS[notif.template_key];

        if (!builder) {
          throw new Error(`Unknown template: ${notif.template_key}`);
        }

        const invalidReason = getInvalidNotificationReason(notif.template_key, notif.recipient, vars);
        if (invalidReason) {
          await supabase
            .from("notification_queue")
            .update({
              status: "failed",
              error_message: `Skipped invalid lead notification: ${invalidReason}`,
              attempts: (notif.attempts || 0) + 1,
            })
            .eq("id", notif.id);

          skipped++;
          console.warn(`Skipped invalid notification ${notif.id}: ${invalidReason}`);
          continue;
        }

        const { subject, html } = builder(vars);
        const recipientName = vars.lead_name || vars.first_name || "Client";

        await sendEmailSMTP(notif.recipient, recipientName, subject, html);

        await supabase
          .from("notification_queue")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            attempts: (notif.attempts || 0) + 1,
          })
          .eq("id", notif.id);

        sent++;
        console.log(`Email sent to ${notif.recipient} (template: ${notif.template_key})`);
      } catch (err) {
        console.error(`Failed to send notification ${notif.id}:`, err);

        await supabase
          .from("notification_queue")
          .update({
            status: "failed",
            error_message: errorMessage(err),
            attempts: (notif.attempts || 0) + 1,
          })
          .eq("id", notif.id);

        failed++;
      }
    }

    console.log(`Processed: ${pending.length}, Sent: ${sent}, Failed: ${failed}, Skipped: ${skipped}`);

    return new Response(
      JSON.stringify({ success: true, processed: pending.length, sent, failed, skipped }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Queue processor error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
