import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Templates d'emails
const EMAIL_TEMPLATES = {
  welcome: {
    subject: "Bienvenue sur TaxiAssur - Votre demande de devis",
    template: (lead: any) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; padding: 12px 30px; background: #f59e0b; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .info-box { background: white; padding: 20px; border-left: 4px solid #f59e0b; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚕 TaxiAssur</h1>
      <p>L'assurance taxi en toute confiance</p>
    </div>
    <div class="content">
      <h2>Bonjour ${lead.name},</h2>

      <p>Merci d'avoir choisi TaxiAssur pour votre assurance taxi/VTC !</p>

      <p>Nous avons bien reçu votre demande de devis. Notre équipe d'experts analyse actuellement votre profil pour vous proposer la meilleure offre adaptée à vos besoins.</p>

      <div class="info-box">
        <h3>📋 Récapitulatif de votre demande</h3>
        <p><strong>Ville :</strong> ${lead.city}</p>
        <p><strong>Type :</strong> ${lead.status === 'taxi' ? 'Taxi' : lead.status === 'vtc' ? 'VTC' : 'Autre'}</p>
        <p><strong>Date de demande :</strong> ${new Date(lead.created_at).toLocaleDateString('fr-FR')}</p>
      </div>

      <p><strong>Prochaines étapes :</strong></p>
      <ol>
        <li>Notre équipe analyse votre demande (1-2h)</li>
        <li>Vous recevez votre devis personnalisé par email</li>
        <li>Vous validez et signez électroniquement</li>
        <li>Vous êtes assuré sous 24h !</li>
      </ol>

      <div style="text-align: center;">
        <a href="https://taxiassur.com/contact" class="button">Nous contacter</a>
      </div>

      <p>Une question ? Notre équipe est disponible du lundi au vendredi de 9h à 18h.</p>

      <p>Cordialement,<br><strong>L'équipe TaxiAssur</strong></p>
    </div>
    <div class="footer">
      <p>TaxiAssur - L'assurance taxi et VTC nouvelle génération</p>
      <p>📧 contact@taxiassur.com | 📞 01 XX XX XX XX</p>
      <p><a href="https://taxiassur.com">www.taxiassur.com</a></p>
    </div>
  </div>
</body>
</html>
    `
  },

  devis_ready: {
    subject: "✅ Votre devis TaxiAssur est prêt !",
    template: (lead: any, devisUrl?: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; padding: 15px 40px; background: #10b981; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
    .price-box { background: white; padding: 30px; text-align: center; border: 3px solid #10b981; border-radius: 10px; margin: 20px 0; }
    .price { font-size: 36px; color: #10b981; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Votre devis est prêt !</h1>
    </div>
    <div class="content">
      <h2>Bonjour ${lead.name},</h2>

      <p>Excellente nouvelle ! Nous avons le plaisir de vous présenter votre devis personnalisé TaxiAssur.</p>

      <div class="price-box">
        <p style="margin: 0; color: #666;">Votre tarif</p>
        <div class="price">${lead.prime_realisee || 'XXX'}€/mois</div>
        <p style="margin: 0; color: #666;">Tous risques inclus</p>
      </div>

      <p><strong>Ce devis comprend :</strong></p>
      <ul>
        <li>✅ Responsabilité Civile obligatoire</li>
        <li>✅ Protection juridique incluse</li>
        <li>✅ Assistance 24/7</li>
        <li>✅ Véhicule de remplacement</li>
        <li>✅ Protection du conducteur</li>
      </ul>

      ${devisUrl ? `
      <div style="text-align: center;">
        <a href="${devisUrl}" class="button">📄 Télécharger mon devis</a>
      </div>
      ` : ''}

      <p>🎯 <strong>Offre valable 30 jours</strong> - Ne laissez pas passer cette opportunité !</p>

      <p><strong>Pour souscrire, c'est simple :</strong></p>
      <ol>
        <li>Consultez votre devis détaillé</li>
        <li>Signez électroniquement en 2 minutes</li>
        <li>Recevez votre attestation sous 24h</li>
      </ol>

      <p>Une question sur votre devis ? Notre équipe est à votre disposition !</p>

      <p>Cordialement,<br><strong>L'équipe TaxiAssur</strong></p>
    </div>
  </div>
</body>
</html>
    `
  },

  follow_up: {
    subject: "🔔 N'oubliez pas votre devis TaxiAssur",
    template: (lead: any) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; padding: 12px 30px; background: #f59e0b; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔔 Un petit rappel</h1>
    </div>
    <div class="content">
      <h2>Bonjour ${lead.name},</h2>

      <p>Nous remarquons que vous n'avez pas encore finalisé votre souscription.</p>

      <p>Votre devis personnalisé vous attend ! Ne manquez pas cette opportunité de protéger votre activité avec une assurance adaptée.</p>

      <p><strong>Pourquoi choisir TaxiAssur ?</strong></p>
      <ul>
        <li>🚀 Souscription en ligne en 5 minutes</li>
        <li>💰 Tarifs compétitifs garantis</li>
        <li>📞 Service client réactif 7j/7</li>
        <li>✅ Attestation immédiate</li>
      </ul>

      <div style="text-align: center;">
        <a href="https://taxiassur.com/contact" class="button">Je reprends ma demande</a>
      </div>

      <p>Des questions ? Besoin d'aide ? Notre équipe est là pour vous accompagner.</p>

      <p>Cordialement,<br><strong>L'équipe TaxiAssur</strong></p>
    </div>
  </div>
</body>
</html>
    `
  }
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { leadId, emailType, customData } = await req.json();

    // Récupérer les infos du lead
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .single();

    if (leadError || !lead) {
      throw new Error("Lead not found");
    }

    // Sélectionner le template
    const template = EMAIL_TEMPLATES[emailType as keyof typeof EMAIL_TEMPLATES];
    if (!template) {
      throw new Error("Unknown email type");
    }

    const htmlContent = template.template(lead, customData?.devisUrl);
    const subject = template.subject;

    // TODO: Intégrer avec votre service d'envoi d'emails (SendGrid, etc.)
    // Pour l'instant, on log et on retourne un succès
    console.log(`📧 Sending email to ${lead.email}`);
    console.log(`Subject: ${subject}`);

    // Enregistrer l'envoi dans la base
    await supabase.from("email_logs").insert({
      lead_id: leadId,
      email_type: emailType,
      recipient: lead.email,
      subject: subject,
      sent_at: new Date().toISOString(),
      status: "sent"
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Email ${emailType} envoyé à ${lead.email}`,
        preview: htmlContent.substring(0, 200)
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
