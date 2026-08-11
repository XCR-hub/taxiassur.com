import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { isInternalRequest } from "../_shared/internal-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ContentTemplate {
  type: string;
  prompts: string[];
}

const LINKEDIN_TEMPLATES: ContentTemplate[] = [
  {
    type: "educational",
    prompts: [
      "Crée un post LinkedIn éducatif sur les 5 erreurs à éviter en assurance taxi. Utilise un ton professionnel mais accessible. Inclus des statistiques et des conseils pratiques. Maximum 1300 caractères. Ajoute 5 hashtags pertinents à la fin.",
      "Rédige un post LinkedIn expliquant comment économiser sur son assurance taxi en 2026. Donne 3 astuces concrètes avec des exemples chiffrés. Ton expert mais amical. Maximum 1300 caractères avec hashtags.",
      "Écris un post LinkedIn sur les nouvelles réglementations assurance taxi 2026. Explique l'impact pour les chauffeurs. Ton informatif et rassurant. Maximum 1300 caractères + hashtags.",
    ],
  },
  {
    type: "promotional",
    prompts: [
      "Crée un post LinkedIn promotionnel pour TaxiAssur. Met en avant nos 3 avantages principaux : devis en 2 minutes, couverture complète, prix compétitifs. Ton commercial mais pas agressif. Maximum 1300 caractères avec CTA et hashtags.",
      "Rédige un post LinkedIn annonçant une offre spéciale assurance taxi (-15% pour les nouveaux clients). Crée de l'urgence sans être insistant. Maximum 1300 caractères avec hashtags.",
    ],
  },
  {
    type: "testimonial",
    prompts: [
      "Crée un post LinkedIn avec un témoignage fictif mais réaliste d'un chauffeur de taxi satisfait. Prénom + ville. Parle d'économies réalisées et de service client. Ton authentique. Maximum 1300 caractères + hashtags.",
    ],
  },
  {
    type: "stats",
    prompts: [
      "Écris un post LinkedIn avec une statistique choc sur l'assurance taxi (ex: '73% des taxis payent trop cher'). Développe avec des explications et solutions. Ton expert. Maximum 1300 caractères + hashtags.",
    ],
  },
];

const PINTEREST_TEMPLATES: ContentTemplate[] = [
  {
    type: "infographic",
    prompts: [
      "Crée une description Pinterest pour une épingle infographique sur les prix moyens d'assurance taxi par ville. Ton informatif et engageant. Maximum 500 caractères. Inclus un call-to-action clair. Ajoute hashtags.",
      "Rédige une description Pinterest pour un comparatif visuel des garanties assurance taxi. Ton clair et utile. Maximum 500 caractères avec CTA et hashtags.",
    ],
  },
  {
    type: "guide",
    prompts: [
      "Écris une description Pinterest pour un guide 'Comment choisir son assurance taxi'. Ton pédagogique. Maximum 500 caractères. CTA vers notre site. Hashtags pertinents.",
      "Crée une description Pinterest pour un guide des garanties obligatoires taxi. Ton expert mais accessible. Maximum 500 caractères + CTA + hashtags.",
    ],
  },
  {
    type: "tips",
    prompts: [
      "Rédige une description Pinterest pour 5 astuces économies assurance taxi. Ton pratique et actionnable. Maximum 500 caractères avec CTA et hashtags.",
    ],
  },
];

function getRandomTemplate(platform: string): string {
  const templates = platform === "linkedin"
    ? LINKEDIN_TEMPLATES
    : PINTEREST_TEMPLATES;
  const randomCategory =
    templates[Math.floor(Math.random() * templates.length)];
  const randomPrompt = randomCategory
    .prompts[Math.floor(Math.random() * randomCategory.prompts.length)];
  return randomPrompt;
}

async function generateContentWithOpenAI(
  platform: string,
  contentType?: string,
): Promise<string> {
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const prompt = getRandomTemplate(platform);

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Tu es un expert en marketing digital pour le secteur de l'assurance taxi. Tu crées du contenu engageant, professionnel et optimisé pour les réseaux sociaux. Évite les clichés et les formules trop marketing. Sois authentique et utile.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.8,
      max_tokens: 800,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
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

    const { platform, content_type } = await req.json();

    if (!platform) {
      throw new Error("Platform is required");
    }

    console.log(`Generating content for ${platform}...`);

    // Vérifier que le compte est connecté et actif
    const { data: network, error: networkError } = await supabase
      .from("social_networks")
      .select("*")
      .eq("platform", platform)
      .single();

    if (networkError || !network) {
      throw new Error(`Network ${platform} not found`);
    }

    if (!network.is_connected || !network.is_active || !network.auto_publish) {
      throw new Error(`Network ${platform} is not ready for auto-publish`);
    }

    // Générer le contenu avec OpenAI
    const content = await generateContentWithOpenAI(platform, content_type);

    console.log(`Content generated: ${content.substring(0, 100)}...`);

    // Créer le post dans la DB
    const { data: post, error: postError } = await supabase
      .from("social_posts")
      .insert({
        platform,
        content,
        status: "scheduled",
        scheduled_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (postError) {
      throw new Error(`Failed to create post: ${postError.message}`);
    }

    console.log(`Post created with ID: ${post.id}`);

    // Appeler la fonction de publication spécifique
    const publisherUrl = `${supabaseUrl}/functions/v1/${platform}-publisher`;
    const publishResponse = await fetch(publisherUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        post_id: post.id,
        content: post.content,
        network_id: network.id,
      }),
    });

    if (!publishResponse.ok) {
      const error = await publishResponse.text();
      console.error(`Publication failed: ${error}`);

      // Mettre à jour le statut en erreur
      await supabase
        .from("social_posts")
        .update({
          status: "failed",
          error_message: error.substring(0, 500),
        })
        .eq("id", post.id);

      throw new Error(`Publication failed: ${error}`);
    }

    const publishResult = await publishResponse.json();

    // Logger le succès
    await supabase.from("automation_logs").insert({
      automation_name: `social_publish_${platform}`,
      status: "success",
      message: `Successfully published to ${platform}. Post ID: ${post.id}`,
      metadata: { post_id: post.id, platform },
    });

    return new Response(
      JSON.stringify({
        success: true,
        post,
        publish_result: publishResult,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    console.error("Error in social-media-publisher:", error);

    // Logger l'erreur
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      await supabase.from("automation_logs").insert({
        automation_name: "social_publish_error",
        status: "error",
        message: error.message,
        metadata: { error: error.toString() },
      });
    } catch (logError) {
      console.error("Failed to log error:", logError);
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }
});
