import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface LeadNotificationRequest {
  lead_id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  status: string;
  immatriculation?: string;
  access_token?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const lead: LeadNotificationRequest = await req.json();
    console.log("Sending notification for lead:", lead.lead_id);

    const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
    
    if (!BREVO_API_KEY) {
      console.error("BREVO_API_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const prospectSpaceUrl = lead.access_token 
      ? `https://taxiassur.com/espace-prospect/${lead.access_token}`
      : "https://taxiassur.com/espace-documents";

    const teamEmailHtml = `
<!DOCTYPE html>
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
          <div class="info-value">${lead.name}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Telephone</div>
          <div class="info-value"><a href="tel:${lead.phone}" style="color: #10b981; text-decoration: none;">${lead.phone}</a></div>
        </div>
        <div class="info-item">
          <div class="info-label">Email</div>
          <div class="info-value"><a href="mailto:${lead.email}" style="color: #3b82f6; text-decoration: none;">${lead.email}</a></div>
        </div>
        <div class="info-item">
          <div class="info-label">Ville</div>
          <div class="info-value">${lead.city}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Statut</div>
          <div class="info-value">${lead.status}</div>
        </div>
        ${lead.immatriculation ? `<div class="info-item"><div class="info-label">Immatriculation</div><div class="info-value">${lead.immatriculation}</div></div>` : ""}
      </div>
      <h3 style="color: #1f2937;">Prochaines actions</h3>
      <ol style="color: #4b5563; line-height: 1.8;">
        <li>Appeler le prospect au <strong>${lead.phone}</strong></li>
        <li>Qualifier le besoin et confirmer les informations</li>
        <li>Verifier l'envoi des 7 documents requis</li>
        <li>Preparer et envoyer le devis sous 24h</li>
      </ol>
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

    const clientEmailHtml = `
<!DOCTYPE html>
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
      <p style="margin: 0; font-size: 18px;">Bonjour ${lead.name}</p>
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
        <li>Economies moyennes constatees : <strong>580 euros/an</strong></li>
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
        <a href="${prospectSpaceUrl}" class="cta-button">ACCEDER A MON ESPACE</a>
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

    const emailPromises = [
      sendBrevoEmail(BREVO_API_KEY, {
        to: "team@taxiassur.com",
        toName: "Equipe TaxiAssur",
        subject: `[TAXIASSUR] Nouveau Lead - ${lead.name} - ${lead.city}`,
        html: teamEmailHtml
      }),
      sendBrevoEmail(BREVO_API_KEY, {
        to: "commercial@xcr.fr",
        toName: "Commercial XCR",
        subject: `[TAXIASSUR] Nouveau Lead - ${lead.name} - ${lead.city}`,
        html: teamEmailHtml
      }),
      sendBrevoEmail(BREVO_API_KEY, {
        to: lead.email,
        toName: lead.name,
        subject: "Demande confirmee ! Votre expert TaxiAssur vous recontacte rapidement",
        html: clientEmailHtml
      })
    ];

    const results = await Promise.allSettled(emailPromises);
    const sent = results.filter(r => r.status === "fulfilled").length;
    const failed = results.filter(r => r.status === "rejected");

    console.log(`Emails sent: ${sent}/3`);
    if (failed.length > 0) {
      console.error("Failed emails:", failed.map(r => r.status === "rejected" ? r.reason : ""));
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    await supabase.from("crm_interactions").insert([
      {
        lead_id: lead.lead_id,
        type: "email",
        direction: "outbound",
        subject: `[TAXIASSUR] Nouveau Lead - ${lead.name}`,
        content: "Email de notification interne envoye a l'equipe",
        to_email: "team@taxiassur.com",
        from_email: "team@taxiassur.com"
      },
      {
        lead_id: lead.lead_id,
        type: "email",
        direction: "outbound",
        subject: "Demande confirmee ! Votre expert TaxiAssur vous recontacte rapidement",
        content: "Email de confirmation envoye au prospect",
        to_email: lead.email,
        from_email: "team@taxiassur.com"
      }
    ]);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${sent} emails sent successfully`,
        emails_sent: sent,
        emails_failed: failed.length
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Send notification error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function sendBrevoEmail(apiKey: string, params: {
  to: string;
  toName: string;
  subject: string;
  html: string;
}): Promise<void> {
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "api-key": apiKey
    },
    body: JSON.stringify({
      sender: { name: "TaxiAssur", email: "contact@em5892.taxiassur.com" },
      to: [{ email: params.to, name: params.toName }],
      subject: params.subject,
      htmlContent: params.html
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Brevo error for ${params.to}:`, errorText);
    throw new Error(`Brevo API error: ${response.status}`);
  }

  console.log(`Email sent to ${params.to}`);
}