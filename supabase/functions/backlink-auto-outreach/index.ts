import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AutoOutreachRequest {
  campaignId: string;
  maxEmailsPerRun?: number;
  testMode?: boolean;
}

/**
 * Backlink Auto Outreach
 * Automation complète : détection opportunités + envoi emails + suivi réponses
 */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sendgridKey = Deno.env.get("SENDGRID_API_KEY");

    if (!sendgridKey) {
      throw new Error("SENDGRID_API_KEY not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));
    const { campaignId, maxEmailsPerRun = 5, testMode = false } = body;

    // Si pas de campaignId, chercher ou créer une campagne par défaut
    let activeCampaignId = campaignId;
    if (!activeCampaignId) {
      const { data: campaigns } = await supabase
        .from("backlink_campaigns")
        .select("id")
        .eq("status", "active")
        .limit(1);

      if (campaigns && campaigns.length > 0) {
        activeCampaignId = campaigns[0].id;
      } else {
        // Créer une campagne par défaut
        const { data: newCampaign } = await supabase
          .from("backlink_campaigns")
          .insert({
            name: "Campagne Auto " + new Date().toLocaleDateString(),
            status: "active",
            target_min_da: 20
          })
          .select("id")
          .single();

        activeCampaignId = newCampaign?.id;
      }
    }

    // 1. Récupérer les opportunités en attente (status = 'pending' OU 'new' avec email)
    const { data: opportunities, error: oppError } = await supabase
      .from("backlink_opportunities")
      .select("*")
      .in("status", ["pending", "new"])
      .not("contact_email", "is", null)
      .order("quality_score", { ascending: false })
      .limit(maxEmailsPerRun);

    if (oppError) throw oppError;

    if (!opportunities || opportunities.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Aucune nouvelle opportunité à contacter",
          sent: 0
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const results = [];
    let sentCount = 0;

    // 2. Envoyer emails pour chaque opportunité
    for (const opp of opportunities) {
      try {
        const emailTemplate = generateOutreachEmail(opp);

        if (!testMode) {
          // Envoi via SendGrid
          const emailSent = await sendEmail(sendgridKey, {
            to: opp.contact_email,
            subject: emailTemplate.subject,
            html: emailTemplate.html
          });

          if (emailSent) {
            // Mettre à jour l'opportunité
            await supabase
              .from("backlink_opportunities")
              .update({
                status: "contacted",
                contacted_at: new Date().toISOString()
              })
              .eq("id", opp.id);

            // Logger l'action
            await supabase
              .from("backlink_outreach_log")
              .insert({
                campaign_id: activeCampaignId,
                opportunity_id: opp.id,
                action_type: "email_sent",
                recipient_email: opp.contact_email,
                subject: emailTemplate.subject,
                message_sent: emailTemplate.html,
                status: "success"
              });

            sentCount++;
          }
        }

        results.push({
          domain: opp.domain,
          email: opp.contact_email,
          sent: !testMode,
          testMode
        });

      } catch (error) {
        console.error(`Erreur envoi à ${opp.domain}:`, error);
        results.push({
          domain: opp.domain,
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }

    // 3. Mettre à jour la campagne
    if (!testMode && sentCount > 0 && activeCampaignId) {
      const { data: campaign } = await supabase
        .from("backlink_campaigns")
        .select("sent_count")
        .eq("id", activeCampaignId)
        .single();

      if (campaign) {
        await supabase
          .from("backlink_campaigns")
          .update({
            sent_count: (campaign.sent_count || 0) + sentCount,
            updated_at: new Date().toISOString()
          })
          .eq("id", activeCampaignId);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `${sentCount} emails envoyés avec succès`,
        sent: sentCount,
        total: opportunities.length,
        results,
        testMode
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Backlink Auto Outreach Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

/**
 * Génère un email personnalisé pour l'opportunité
 */
function generateOutreachEmail(opportunity: any) {
  const subject = `Collaboration TaxiAssur x ${opportunity.domain} - Contenu Assurance Taxi`;

  const html = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #f97316;">Bonjour,</h2>

  <p>Je m'appelle Marie, et je gère le contenu chez <strong>TaxiAssur.com</strong>, le spécialiste de l'assurance taxi en France.</p>

  <p>J'ai remarqué votre excellent article sur <strong>${opportunity.domain}</strong> concernant l'assurance taxi :</p>
  <p style="background: #f3f4f6; padding: 15px; border-left: 4px solid #f97316;">
    <a href="${opportunity.url}" style="color: #1e40af; text-decoration: none;">${opportunity.page_title}</a>
  </p>

  <p><strong>Proposition de collaboration :</strong></p>
  <ul>
    <li>Nous pourrions enrichir votre article avec des données actualisées 2025</li>
    <li>Ajouter un lien vers notre guide complet de l'assurance taxi</li>
    <li>Partager votre contenu auprès de notre communauté de professionnels du taxi</li>
  </ul>

  <p>Nos contenus sont régulièrement mis à jour et optimisés SEO, ce qui pourrait améliorer le référencement de votre page.</p>

  <p><strong>Intéressé(e) par cette collaboration mutuelle ?</strong></p>

  <p>Cordialement,<br>
  Marie Dubois<br>
  Content Manager - TaxiAssur.com<br>
  <a href="https://taxiassur.com" style="color: #f97316;">taxiassur.com</a>
  </p>

  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
  <p style="font-size: 12px; color: #6b7280;">
    TaxiAssur - Courtier ORIAS agréé - Assurance taxi professionnelle<br>
    <a href="https://taxiassur.com/unsubscribe" style="color: #6b7280;">Se désabonner</a>
  </p>
</div>
`;

  return { subject, html };
}

/**
 * Envoie un email via SendGrid
 */
async function sendEmail(apiKey: string, email: { to: string; subject: string; html: string }): Promise<boolean> {
  try {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: email.to }] }],
        from: {
          email: "contact@em5892.taxiassur.com",
          name: "TaxiAssur - Partenariats"
        },
        reply_to: { email: "team@taxiassur.com" },
        subject: email.subject,
        content: [{ type: "text/html", value: email.html }]
      })
    });

    return response.ok;
  } catch (error) {
    console.error("SendGrid error:", error);
    return false;
  }
}