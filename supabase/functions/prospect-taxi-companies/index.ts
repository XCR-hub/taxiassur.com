import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { max_emails = 20 } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Récupérer prospects non contactés avec email
    const { data: prospects, error } = await supabase
      .from("taxi_prospects")
      .select("*")
      .eq("status", "new")
      .not("email", "is", null)
      .order("created_at", { ascending: true })
      .limit(max_emails);

    if (error || !prospects || prospects.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Aucun nouveau prospect à contacter",
          sent: 0,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    console.log(`📧 Envoi emails à ${prospects.length} taxis...`);

    const results = [];

    for (const prospect of prospects) {
      // Générer email personnalisé avec GPT
      const emailContent = await generatePersonalizedEmail(prospect);

      // Envoyer email
      const sent = await sendEmail(
        prospect.email,
        "Assurance Taxi - Devis personnalisé en 5 minutes",
        emailContent,
        prospect.company_name
      );

      if (sent) {
        // Marquer comme contacté
        await supabase
          .from("taxi_prospects")
          .update({
            status: "contacted",
            last_contact_date: new Date().toISOString(),
            next_contact_date: new Date(
              Date.now() + 3 * 24 * 60 * 60 * 1000
            ).toISOString(), // J+3
          })
          .eq("id", prospect.id);

        // Logger
        await supabase.from("email_logs").insert({
          type: "taxi_prospection",
          recipient_email: prospect.email,
          subject: "Assurance Taxi - Devis personnalisé",
          body: emailContent,
          status: "sent",
          sent_at: new Date().toISOString(),
        });

        results.push(prospect);
      }

      // Pause entre envois
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: results.length,
        prospects: results,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Erreur prospection:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});

// ============================================================================
// GÉNÉRATION EMAIL PERSONNALISÉ
// ============================================================================

async function generatePersonalizedEmail(prospect: any): Promise<string> {
  const openaiKey = Deno.env.get("OPENAI_API_KEY");

  if (!openaiKey) {
    // Template par défaut si pas d'OpenAI
    return getDefaultEmailTemplate(prospect);
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content:
              "Tu es un expert en prospection commerciale pour assurances taxis. Écris des emails courts, personnalisés et percutants.",
          },
          {
            role: "user",
            content: `Écris un email de prospection pour ${prospect.company_name}, compagnie de taxis à ${prospect.city}.

Objectif: Leur proposer un devis d'assurance taxi personnalisé.

Points clés:
- Court (150 mots max)
- Personnalisé avec leur nom/ville
- Mettre en avant: devis instantané, prix compétitifs, expertise taxis
- CTA clair: "Obtenez votre devis gratuit en 5 min"
- Ton professionnel mais chaleureux

Format HTML simple.`,
          },
        ],
        temperature: 0.8,
        max_tokens: 500,
      }),
    });

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error("Erreur GPT:", error);
    return getDefaultEmailTemplate(prospect);
  }
}

// ============================================================================
// TEMPLATE EMAIL PAR DÉFAUT
// ============================================================================

function getDefaultEmailTemplate(prospect: any): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #2563eb;">Bonjour ${prospect.company_name || ""},</h2>

    <p>
      Je m'appelle Thomas, je travaille chez <strong>TaxiAssur</strong>, spécialiste de l'assurance pour taxis et VTC.
    </p>

    <p>
      Nous avons récemment aidé plusieurs compagnies de taxis à <strong>${prospect.city}</strong> à économiser
      <strong>jusqu'à 30%</strong> sur leur assurance professionnelle.
    </p>

    <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <strong>✓</strong> Devis personnalisé en 5 minutes<br>
      <strong>✓</strong> Prix compétitifs garantis<br>
      <strong>✓</strong> Expertise assurance taxi depuis 15 ans<br>
      <strong>✓</strong> Service client dédié 6j/7
    </div>

    <p>
      <strong>Seriez-vous intéressé par un devis gratuit et sans engagement ?</strong>
    </p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="https://taxiassur.com/devis?utm_source=prospection&utm_medium=email&utm_campaign=taxi"
         style="background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
        Obtenir mon devis gratuit
      </a>
    </div>

    <p style="font-size: 14px; color: #666;">
      Vous pouvez aussi simplement répondre à cet email, je me ferai un plaisir de vous conseiller.
    </p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

    <p style="font-size: 12px; color: #999;">
      Thomas Martin<br>
      Conseiller Assurance Taxis<br>
      <strong>TaxiAssur</strong><br>
      📞 01 XX XX XX XX<br>
      📧 thomas@taxiassur.com<br>
      🌐 <a href="https://taxiassur.com" style="color: #2563eb;">taxiassur.com</a>
    </p>

    <p style="font-size: 11px; color: #999; margin-top: 20px;">
      Si vous ne souhaitez plus recevoir nos emails, <a href="#" style="color: #999;">cliquez ici</a>.
    </p>
  </div>
</body>
</html>
  `.trim();
}

// ============================================================================
// ENVOI EMAIL VIA SENDGRID
// ============================================================================

async function sendEmail(
  to: string,
  subject: string,
  html: string,
  companyName: string
): Promise<boolean> {
  const sendgridKey = Deno.env.get("SENDGRID_API_KEY");
  const fromEmail = Deno.env.get("SENDGRID_FROM_EMAIL") || "contact@taxiassur.com";

  if (!sendgridKey) {
    console.error("SendGrid API Key manquante");
    return false;
  }

  try {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sendgridKey}`,
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: to, name: companyName }],
            subject,
          },
        ],
        from: {
          email: fromEmail,
          name: "Thomas - TaxiAssur",
        },
        content: [
          {
            type: "text/html",
            value: html,
          },
        ],
        tracking_settings: {
          click_tracking: { enable: true },
          open_tracking: { enable: true },
        },
      }),
    });

    return response.ok;
  } catch (error) {
    console.error("Erreur envoi email:", error);
    return false;
  }
}
