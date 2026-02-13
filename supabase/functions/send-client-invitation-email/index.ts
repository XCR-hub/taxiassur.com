import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { lead_id, email, first_name, last_name, invitation_token } = await req.json();

    console.log('📧 Envoi invitation client pour:', email);

    const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
    if (!BREVO_API_KEY) {
      throw new Error("BREVO_API_KEY non configurée");
    }

    const siteUrl = Deno.env.get("SITE_URL") || "https://taxiassur.com";
    const invitationUrl = `${siteUrl}/espace-client/create-password?token=${invitation_token}`;

    // Email HTML professionnel
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; background: #eab308; color: #000; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
    .info-box { background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Bienvenue chez TaxiAssur !</h1>
    </div>
    <div class="content">
      <p>Bonjour ${first_name} ${last_name},</p>

      <p>Félicitations ! Votre contrat d'assurance TaxiAssur est maintenant <strong>actif</strong>.</p>

      <p>Pour accéder à votre <strong>Espace Client sécurisé</strong>, vous devez créer votre mot de passe personnel :</p>

      <div style="text-align: center;">
        <a href="${invitationUrl}" class="button">Créer mon mot de passe</a>
      </div>

      <div class="info-box">
        <strong>📧 Votre identifiant de connexion :</strong><br>
        ${email}
      </div>

      <p><strong>Dans votre Espace Client, vous pourrez :</strong></p>
      <ul>
        <li>Consulter votre contrat et vos documents</li>
        <li>Déclarer un sinistre</li>
        <li>Télécharger vos attestations</li>
        <li>Modifier vos informations</li>
        <li>Contacter votre conseiller</li>
      </ul>

      <p><strong>⏰ Ce lien est valable 7 jours.</strong></p>

      <p>Si vous n'avez pas demandé cette activation, contactez-nous au <strong>01 80 85 57 86</strong>.</p>

      <p>Cordialement,<br>
      <strong>L'équipe TaxiAssur</strong></p>
    </div>
    <div class="footer">
      <p>TaxiAssur - L'assurance taxi 100% digitale<br>
      01 80 85 57 86 | contact@taxiassur.com<br>
      <a href="${siteUrl}">www.taxiassur.com</a></p>
    </div>
  </div>
</body>
</html>
    `;

    // Envoyer via Brevo
    const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: "TaxiAssur",
          email: "contact@taxiassur.com",
        },
        to: [
          {
            email: email,
            name: `${first_name} ${last_name}`,
          },
        ],
        subject: "🎉 Activez votre Espace Client TaxiAssur",
        htmlContent: htmlContent,
      }),
    });

    if (!brevoResponse.ok) {
      const errorText = await brevoResponse.text();
      console.error('❌ Erreur Brevo:', errorText);
      throw new Error(`Erreur Brevo: ${brevoResponse.status}`);
    }

    console.log('✅ Email d\'invitation envoyé à:', email);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email d'invitation envoyé",
        email: email,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("❌ Erreur:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
