import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ViralTemplate {
  id: string;
  name: string;
  template_text: string;
  hashtags: string[];
  emoji_pattern: string;
  engagement_tactics: any;
  avg_views: number;
}

interface GenerationRequest {
  category?: string;
  topic: string;
  target_audience?: string;
  platforms: string[];
  auto_publish?: boolean;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiKey = Deno.env.get("OPENAI_API_KEY");

    if (!openaiKey) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: GenerationRequest = await req.json();
    const { category, topic, target_audience, platforms, auto_publish } = body;

    // 1. Récupérer un template viral performant
    const { data: templates, error: templateError } = await supabase
      .rpc("get_viral_template", { p_category: category || null });

    if (templateError || !templates || templates.length === 0) {
      throw new Error("No viral template found");
    }

    const template: ViralTemplate = templates[0];

    // 2. Créer le prompt anti-AI pour générer du contenu naturel
    const prompt = generateViralPrompt(template, topic, target_audience || "chauffeurs de taxi");

    // 3. Appeler OpenAI pour générer le contenu
    const startTime = Date.now();
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `Tu es un expert en création de contenu viral pour les réseaux sociaux.
Tu dois créer du contenu qui génère 7M+ de vues.
IMPÉRATIF: Le contenu doit être 100% HUMAIN, pas détectable comme IA.
Utilise des transitions naturelles, des expressions humaines, des émojis stratégiques.`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.9, // Haute créativité pour contenu unique
        max_tokens: 500,
        presence_penalty: 0.6, // Évite les répétitions
        frequency_penalty: 0.4, // Encourage la diversité
      }),
    });

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text();
      throw new Error(`OpenAI error: ${error}`);
    }

    const openaiData = await openaiResponse.json();
    const generationTime = Date.now() - startTime;
    const generatedContent = openaiData.choices[0].message.content;
    const tokensUsed = openaiData.usage.total_tokens;

    // 4. Appliquer les techniques anti-détection IA
    const humanizedContent = humanizeContent(generatedContent);

    // 5. Générer hashtags optimisés
    const hashtags = generateOptimizedHashtags(template.hashtags, topic);

    // 6. Extraire les mentions suggérées
    const mentions = extractMentions(humanizedContent);

    // 7. Déterminer le meilleur moment de publication
    const bestTime = calculateBestPostingTime();

    // 8. Créer les posts pour chaque plateforme
    const posts = [];
    for (const platform of platforms) {
      const platformContent = adaptContentForPlatform(
        humanizedContent,
        platform,
        hashtags
      );

      // Récupérer network_id
      const { data: network } = await supabase
        .from("social_networks")
        .select("id")
        .ilike("platform", platform)
        .single();

      if (!network) continue;

      const { data: post, error: postError } = await supabase
        .from("social_posts")
        .insert({
          network_id: network.id,
          content: platformContent,
          hashtags: hashtags,
          mentions: mentions,
          ai_generated: true,
          ai_model: "gpt-4",
          scheduled_at: auto_publish ? null : bestTime,
          published_at: auto_publish ? new Date().toISOString() : null,
          status: auto_publish ? "published" : "scheduled",
          best_time_to_post: bestTime,
          target_audience: {
            primary: target_audience,
            demographics: "chauffeurs taxi, VTC, entrepreneurs"
          },
        })
        .select()
        .single();

      if (postError) {
        console.error("Error creating post:", postError);
        continue;
      }

      // Logger la génération
      await supabase.from("post_generation_logs").insert({
        post_id: post.id,
        template_id: template.id,
        generation_prompt: prompt,
        ai_model: "gpt-4",
        tokens_used: tokensUsed,
        generation_time_ms: generationTime,
        humanization_applied: true,
        anti_ai_techniques: {
          transitions: true,
          connectors: true,
          emojis: true,
          variability: true,
        },
        quality_score: calculateQualityScore(humanizedContent),
      });

      posts.push({
        ...post,
        platform,
        viral_potential: template.avg_views,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        posts: posts,
        template_used: template.name,
        viral_potential: `${(template.avg_views / 1000000).toFixed(1)}M+ vues`,
        humanization_score: calculateHumanizationScore(humanizedContent),
        best_posting_time: bestTime,
        hashtags: hashtags,
        message: `${posts.length} publication(s) générée(s) avec succès`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in ai-viral-content-generator:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ====== FONCTIONS UTILITAIRES ======

function generateViralPrompt(
  template: ViralTemplate,
  topic: string,
  audience: string
): string {
  return `Crée une publication VIRALE en suivant ce template testé (${(template.avg_views / 1000000).toFixed(1)}M+ vues moyennes):

${template.template_text}

RÈGLES STRICTES ANTI-DÉTECTION IA:
1. Écris comme un HUMAIN qui partage son expérience
2. Utilise "je", "mon", "mes" (ton personnel)
3. Ajoute des transitions naturelles ("En fait,", "D'ailleurs,", "Notamment,")
4. Varie les longueurs de phrases (courtes ET longues)
5. Inclus des chiffres PRÉCIS (pas ronds: 1847€, pas 2000€)
6. Ajoute des nuances ("souvent", "généralement", "dans mon cas")
7. Utilise des expressions humaines ("il faut savoir que", "ce que j'ai appris c'est")

Sujet: ${topic}
Public cible: ${audience}

Emojis suggérés: ${template.emoji_pattern}
Tactiques d'engagement: ${JSON.stringify(template.engagement_tactics)}

IMPORTANT:
- Crée du contenu qui incite au partage massif
- Utilise des hooks psychologiques forts
- Intègre un call-to-action puissant
- Le contenu doit paraître écrit par un expert du terrain
- ZERO détection IA possible

Génère UNIQUEMENT le contenu final, sans métadonnées.`;
}

function humanizeContent(content: string): string {
  const transitions = ["En fait,", "D'ailleurs,", "Notamment,", "Par exemple,"];
  const connectors = ["ce qui signifie que", "dans le but de", "c'est pourquoi"];

  let humanized = content;

  // Ajouter des transitions naturelles aléatoirement
  const paragraphs = humanized.split("\n\n");
  const modifiedParagraphs = paragraphs.map((para, index) => {
    if (index > 0 && Math.random() > 0.7 && !para.match(/^[#\d]/)) {
      const transition = transitions[Math.floor(Math.random() * transitions.length)];
      return `${transition} ${para.charAt(0).toLowerCase()}${para.slice(1)}`;
    }
    return para;
  });

  humanized = modifiedParagraphs.join("\n\n");

  // Remplacer certains connecteurs basiques
  if (Math.random() > 0.5) {
    const connector = connectors[Math.floor(Math.random() * connectors.length)];
    humanized = humanized.replace(/qui permet de/i, connector);
  }

  return humanized;
}

function generateOptimizedHashtags(baseHashtags: string[], topic: string): string[] {
  const optimized = [...baseHashtags];

  // Ajouter hashtags spécifiques au topic
  const topicWords = topic.toLowerCase().split(" ");
  topicWords.forEach(word => {
    if (word.length > 3) {
      optimized.push(`#${word.charAt(0).toUpperCase() + word.slice(1)}`);
    }
  });

  // Limiter à 10 hashtags maximum (optimal pour engagement)
  return optimized.slice(0, 10);
}

function extractMentions(content: string): string[] {
  const mentionRegex = /@(\w+)/g;
  const mentions: string[] = [];
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[1]);
  }

  return mentions;
}

function calculateBestPostingTime(): string {
  const now = new Date();
  const bestHours = [9, 12, 14, 17, 19, 21]; // Heures optimales engagement

  // Trouver la prochaine heure optimale
  let targetHour = bestHours.find(h => h > now.getHours()) || bestHours[0];

  const nextPost = new Date(now);
  if (targetHour <= now.getHours()) {
    nextPost.setDate(nextPost.getDate() + 1);
  }
  nextPost.setHours(targetHour, Math.floor(Math.random() * 60), 0, 0);

  return nextPost.toISOString();
}

function adaptContentForPlatform(
  content: string,
  platform: string,
  hashtags: string[]
): string {
  let adapted = content;

  switch (platform.toLowerCase()) {
    case "twitter":
    case "x":
      // Twitter: 280 caractères max, hashtags intégrés
      adapted = content.substring(0, 240);
      adapted += "\n\n" + hashtags.slice(0, 3).join(" ");
      break;

    case "linkedin":
      // LinkedIn: Ton plus professionnel, hashtags à la fin
      adapted += "\n\n" + hashtags.join(" ");
      break;

    case "instagram":
      // Instagram: Hashtags en commentaire séparé (simulation)
      adapted += "\n\n.\n.\n.\n" + hashtags.join(" ");
      break;

    case "facebook":
      // Facebook: Hashtags modérés
      adapted += "\n\n" + hashtags.slice(0, 5).join(" ");
      break;

    default:
      adapted += "\n\n" + hashtags.join(" ");
  }

  return adapted;
}

function calculateQualityScore(content: string): number {
  let score = 50;

  // +10 si contient des chiffres précis
  if (/\d{3,4}/.test(content)) score += 10;

  // +10 si contient des emojis
  if (/[\u{1F300}-\u{1F9FF}]/u.test(content)) score += 10;

  // +10 si contient des transitions
  if (/En fait|D'ailleurs|Notamment/i.test(content)) score += 10;

  // +10 si contient un CTA
  if (/commentez|partagez|identifiez|enregistrez/i.test(content)) score += 10;

  // +10 si longueur optimale
  const wordCount = content.split(/\s+/).length;
  if (wordCount >= 50 && wordCount <= 150) score += 10;

  return Math.min(100, score);
}

function calculateHumanizationScore(content: string): number {
  let score = 60;

  // Vérifier présence de marqueurs humains
  if (/\bje\b|\bmon\b|\bmes\b/i.test(content)) score += 10;
  if (/souvent|généralement|parfois/i.test(content)) score += 10;
  if (/En fait|D'ailleurs/i.test(content)) score += 10;
  if (/\d{3}[^0]\d/.test(content)) score += 10; // Chiffres non ronds

  return Math.min(100, score);
}
