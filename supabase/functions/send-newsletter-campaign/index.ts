import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { isInternalRequest } from "../_shared/internal-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface Article {
  id: string;
  title: string;
  excerpt: string;
  slug: string;
  category: string;
  featured_image: string;
}

function generateNewsletterHTML(
  articles: Article[],
  subscriberName: string,
): string {
  const articleHTML = articles.map((article) => `
    <div style="margin-bottom: 30px; border-bottom: 1px solid #eee; padding-bottom: 20px;">
      <img src="${article.featured_image}" alt="${article.title}" style="width: 100%; max-width: 600px; height: auto; border-radius: 8px; margin-bottom: 15px;" />
      <h2 style="color: #333; font-size: 20px; margin: 0 0 10px 0;">${article.title}</h2>
      <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 0 0 15px 0;">${article.excerpt}</p>
      <a href="https://taxiassur.com/blog/${article.slug}" style="display: inline-block; background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-size: 14px;">Lire l'article →</a>
    </div>
  `).join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Newsletter TaxiAssur</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <div style="max-width: 600px; margin: 0 auto; background: white; padding: 40px;">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #2563eb; font-size: 28px; margin: 0;">🚕 TaxiAssur</h1>
      <p style="color: #666; font-size: 14px; margin: 10px 0 0 0;">Votre actualité assurance taxi</p>
    </div>

    <!-- Greeting -->
    <p style="color: #333; font-size: 16px; margin: 0 0 20px 0;">Bonjour ${
    subscriberName || "cher lecteur"
  },</p>
    <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 0 0 30px 0;">
      Découvrez les derniers articles publiés sur TaxiAssur. Restez informé des actualités et conseils pour votre assurance taxi.
    </p>

    <!-- Articles -->
    ${articleHTML}

    <!-- Footer -->
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
      <p style="color: #999; font-size: 12px; margin: 0 0 10px 0;">
        Vous recevez cet email car vous êtes abonné à la newsletter TaxiAssur.
      </p>
      <p style="color: #999; font-size: 12px; margin: 0;">
        <a href="https://taxiassur.com" style="color: #2563eb;">Visiter le site</a> |
        <a href="{{unsubscribe_link}}" style="color: #999;">Se désabonner</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

async function sendEmailBrevo(
  to: string,
  toName: string,
  subject: string,
  htmlContent: string,
): Promise<boolean> {
  const brevoApiKey = Deno.env.get("BREVO_API_KEY");
  if (!brevoApiKey) {
    console.error("BREVO_API_KEY manquant");
    return false;
  }

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": brevoApiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: "TaxiAssur",
          email: "contact@taxiassur.com",
        },
        to: [{ email: to, name: toName }],
        subject: subject,
        htmlContent: htmlContent,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Erreur Brevo:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Erreur envoi email:", error);
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (!(await isInternalRequest(req))) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { campaign_id } = await req.json();

    if (!campaign_id) {
      return new Response(
        JSON.stringify({ error: "campaign_id requis" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Récupérer la campagne
    const { data: campaign, error: campaignError } = await supabase
      .from("newsletter_campaigns")
      .select("*")
      .eq("id", campaign_id)
      .eq("status", "scheduled")
      .single();

    if (campaignError || !campaign) {
      return new Response(
        JSON.stringify({ error: "Campagne introuvable ou déjà envoyée" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Récupérer les envois en attente
    const { data: sends, error: sendsError } = await supabase
      .from("newsletter_sends")
      .select(`
        id,
        subscriber:newsletter_subscribers!inner(
          id,
          email,
          first_name,
          unsubscribe_token
        )
      `)
      .eq("campaign_id", campaign_id)
      .eq("status", "pending");

    if (sendsError || !sends || sends.length === 0) {
      return new Response(
        JSON.stringify({ error: "Aucun envoi en attente" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    let sentCount = 0;
    let failedCount = 0;

    // Envoyer à chaque abonné
    for (const send of sends) {
      try {
        const subscriber = send.subscriber;
        const articles = campaign.articles as Article[];

        // Générer le HTML personnalisé
        let htmlContent = generateNewsletterHTML(
          articles,
          subscriber.first_name || "",
        );

        // Ajouter le lien de désabonnement
        const unsubscribeLink =
          `https://taxiassur.com/newsletter/unsubscribe?token=${subscriber.unsubscribe_token}`;
        htmlContent = htmlContent.replace(
          "{{unsubscribe_link}}",
          unsubscribeLink,
        );

        // Envoyer l'email
        const sent = await sendEmailBrevo(
          subscriber.email,
          subscriber.first_name || "",
          campaign.subject,
          htmlContent,
        );

        if (sent) {
          // Marquer comme envoyé
          await supabase
            .from("newsletter_sends")
            .update({
              status: "sent",
              sent_at: new Date().toISOString(),
            })
            .eq("id", send.id);

          sentCount++;
        } else {
          // Marquer comme échoué
          await supabase
            .from("newsletter_sends")
            .update({
              status: "failed",
              error_message: "Erreur envoi email",
            })
            .eq("id", send.id);

          failedCount++;
        }

        // Pause pour éviter rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error("Erreur traitement envoi:", error);
        failedCount++;
      }
    }

    // Mettre à jour les stats de la campagne
    await supabase
      .from("newsletter_campaigns")
      .update({
        sent_count: sentCount,
        failed_count: failedCount,
      })
      .eq("id", campaign_id);

    console.log(
      `✅ Campagne ${campaign_id}: ${sentCount} envoyés, ${failedCount} échecs`,
    );

    return new Response(
      JSON.stringify({
        success: true,
        campaign_id,
        sent_count: sentCount,
        failed_count: failedCount,
        total: sends.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("❌ Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
