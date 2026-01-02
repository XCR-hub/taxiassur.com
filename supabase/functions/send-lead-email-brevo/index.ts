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

    // Email à l'équipe TaxiAssur
    const teamEmailBody = `
      <h2>🎯 Nouveau Lead Reçu</h2>
      <p><strong>Nom :</strong> ${lead.nom_prenom}</p>
      <p><strong>Téléphone :</strong> ${lead.telephone}</p>
      <p><strong>Email :</strong> ${lead.email}</p>
      <p><strong>Ville :</strong> ${lead.ville}</p>
      <p><strong>Statut :</strong> ${lead.statut}</p>
      ${lead.immatriculation ? `<p><strong>Immatriculation :</strong> ${lead.immatriculation}</p>` : ""}
      <p><strong>Date :</strong> ${new Date(lead.created_at).toLocaleString("fr-FR")}</p>
      <hr>
      <p><a href="https://taxiassur.com/backoffice/leads">Voir dans le CRM</a></p>
    `;

    // Email de confirmation au client
    const clientEmailBody = `
      <h2>Merci pour votre demande de devis !</h2>
      <p>Bonjour ${lead.nom_prenom},</p>
      <p>Nous avons bien reçu votre demande de devis pour une assurance taxi à ${lead.ville}.</p>
      <p>Notre équipe d'experts va analyser votre profil et vous recontactera dans les <strong>15 minutes</strong> au <strong>${lead.telephone}</strong>.</p>
      <h3>Vos informations :</h3>
      <ul>
        <li><strong>Téléphone :</strong> ${lead.telephone}</li>
        <li><strong>Email :</strong> ${lead.email}</li>
        <li><strong>Ville :</strong> ${lead.ville}</li>
        <li><strong>Statut :</strong> ${lead.statut}</li>
        ${lead.immatriculation ? `<li><strong>Immatriculation :</strong> ${lead.immatriculation}</li>` : ""}
      </ul>
      <p>À très bientôt,<br>L'équipe TaxiAssur</p>
      <hr>
      <p style="font-size: 12px; color: #666;">TaxiAssur.com - Courtier spécialisé en assurance taxi</p>
    `;

    // Envoi email à l'équipe
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

    // Envoi email de confirmation au client
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
