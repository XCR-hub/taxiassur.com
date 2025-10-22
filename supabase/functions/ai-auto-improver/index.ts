import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ImprovementRequest {
  page_url: string;
  page_type: string;
  current_content?: string;
  improvement_type: string;
  auto_deploy?: boolean;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { page_url, page_type, current_content, improvement_type, auto_deploy = true }: ImprovementRequest = await req.json();

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY manquante");
    }

    const { createClient } = await import("npm:@supabase/supabase-js@2");
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);

    let analysisPrompt = "";
    let improvedContent = "";

    if (improvement_type === "seo_content_rewrite") {
      analysisPrompt = `Tu es un expert SEO et rédacteur web spécialisé en assurance taxi.

Analyse ce contenu et réécris-le pour maximiser:
- SEO (mots-clés naturels, densité optimale)
- Conversions (CTA clairs, bénéfices mis en avant)
- Lisibilité (phrases courtes, structure claire)
- Autorité (données chiffrées, expertise démontrée)

URL: ${page_url}
Type: ${page_type}

Contenu actuel:
${current_content || "Contenu de base à générer"}

IMPORTANT:
- Garde le même format HTML/React
- Ajoute des mots-clés LSI (Latent Semantic Indexing)
- Intègre des données chiffrées crédibles
- Crée 2-3 CTA stratégiquement placés
- Optimise pour intention de recherche locale
- Ajoute schema markup si pertinent

Retourne UNIQUEMENT le contenu amélioré, prêt à être intégré.`;

    } else if (improvement_type === "cta_optimization") {
      analysisPrompt = `Analyse cette page et crée 3 variantes de CTA optimisées pour conversions maximales.

URL: ${page_url}
Contexte: Page ville assurance taxi

Pour chaque CTA, fournis:
1. Texte bouton (court, action-oriented)
2. Couleur recommandée (psychologie des couleurs)
3. Placement optimal (heatmap virtuel)
4. Micro-copy autour (renforcement confiance)

Format JSON:
{
  "cta_variants": [
    {
      "text": "...",
      "color": "...",
      "placement": "...",
      "microcopy": "..."
    }
  ],
  "reasoning": "Pourquoi ces CTAs vont convertir davantage"
}`;

    } else if (improvement_type === "meta_optimization") {
      analysisPrompt = `Génère meta title et description optimisées pour cette page.

URL: ${page_url}
Type: ${page_type}

Critères:
- Title: 50-60 caractères, mot-clé principal au début
- Description: 150-160 caractères, inclut CTA, bénéfice clair
- Intégration naturelle ville + mots-clés
- Évite keyword stuffing
- Crée urgence/désirabilité

Format JSON:
{
  "title": "...",
  "description": "...",
  "keywords": ["...", "..."],
  "reasoning": "Pourquoi ces metas vont améliorer CTR"
}`;
    }

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: "Tu es un expert SEO, copywriting et conversion optimization pour le secteur assurance taxi en France.",
          },
          {
            role: "user",
            content: analysisPrompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const openaiData = await openaiResponse.json();
    improvedContent = openaiData.choices[0]?.message?.content || "";

    const { data: improvement, error: dbError } = await supabase
      .from("ai_page_improvements")
      .insert({
        page_url,
        page_type,
        current_version: current_content || "original",
        improved_version: improvedContent,
        improvement_type,
        status: auto_deploy ? "testing" : "draft",
        metrics_before: {
          generated_at: new Date().toISOString(),
          openai_model: "gpt-4-turbo-preview",
        },
      })
      .select()
      .single();

    if (dbError) {
      throw dbError;
    }

    if (auto_deploy) {
      const testDuration = 7;
      const { data: abTest, error: testError } = await supabase
        .from("ai_ab_tests")
        .insert({
          test_name: `${improvement_type} - ${page_url}`,
          page_url,
          variant_a: "original",
          variant_b: "ai_improved",
          status: "running",
          duration_days: testDuration,
          auto_deploy_winner: true,
        })
        .select()
        .single();

      if (!testError) {
        await supabase
          .from("ai_page_improvements")
          .update({ ab_test_id: abTest.id })
          .eq("id", improvement.id);
      }
    }

    const { data: optimizationLog } = await supabase
      .from("ai_optimizations")
      .insert({
        title: `Amélioration ${improvement_type}: ${page_url}`,
        description: `IA a généré amélioration. ${auto_deploy ? 'Test A/B lancé pour 7 jours.' : 'En attente validation manuelle.'}`,
        priority: "haute",
        status: "en_cours",
        auto_execute: true,
        progress: 50,
      })
      .select()
      .single();

    return new Response(
      JSON.stringify({
        success: true,
        improvement_id: improvement.id,
        status: auto_deploy ? "testing" : "draft",
        improved_content: improvedContent,
        message: auto_deploy
          ? "Amélioration générée et test A/B lancé pour 7 jours"
          : "Amélioration générée, en attente de validation",
        next_steps: auto_deploy
          ? "L'IA validera automatiquement le gagnant après 7 jours et déploiera si +10% conversion"
          : "Valider manuellement dans le dashboard",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in ai-auto-improver:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
