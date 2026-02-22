import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ContentRequest {
  category: string; // 'blog', 'city_page', 'faq', etc.
  topic: string;
  variables?: Record<string, string>;
  max_queries?: number;
}

/**
 * Génère du contenu IA enrichi avec les requêtes GSC pertinentes
 *
 * Processus :
 * 1. Récupère le prompt template selon la catégorie
 * 2. Identifie les top requêtes GSC liées au sujet
 * 3. Enrichit le prompt avec ces requêtes
 * 4. Génère le contenu via OpenAI
 * 5. Enregistre la performance pour tracking
 */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { category, topic, variables = {}, max_queries = 5 }: ContentRequest = await req.json();

    console.log(`🎨 Génération contenu: ${category} - ${topic}`);

    // 1. Récupérer le prompt template
    const { data: promptTemplate } = await supabase
      .from('ai_content_prompts')
      .select('*')
      .eq('category', category)
      .eq('is_active', true)
      .single();

    if (!promptTemplate) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Pas de prompt template pour la catégorie: ${category}`
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Trouver les requêtes GSC pertinentes
    const topQueries = await findRelevantQueries(supabase, topic, category, max_queries);

    console.log(`📊 ${topQueries.length} requêtes GSC pertinentes trouvées`);

    // 3. Construire le prompt enrichi
    const targetQueriesStr = topQueries.map(q =>
      `"${q.query}" (${q.impressions} imp., pos. ${q.position.toFixed(1)})`
    ).join(', ');

    let fullPrompt = promptTemplate.base_prompt;

    // Remplacer les variables
    fullPrompt = fullPrompt.replace('{topic}', topic);
    for (const [key, value] of Object.entries(variables)) {
      fullPrompt = fullPrompt.replace(`{${key}}`, value);
    }

    // Ajouter l'enrichissement SEO
    if (promptTemplate.seo_enhancement && topQueries.length > 0) {
      const seoEnhancement = promptTemplate.seo_enhancement
        .replace('{target_queries}', targetQueriesStr);
      fullPrompt += '\n\n' + seoEnhancement;
    }

    console.log(`📝 Prompt final: ${fullPrompt.substring(0, 200)}...`);

    // 4. Générer le contenu avec OpenAI
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");

    if (!openaiApiKey) {
      console.warn("⚠️ OPENAI_API_KEY non configuré - retour de contenu template");

      return new Response(
        JSON.stringify({
          success: true,
          content: generateTemplateContent(topic, topQueries),
          metadata: {
            target_queries: topQueries.map(q => q.query),
            template_mode: true
          }
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "Tu es un expert en rédaction SEO pour l'assurance taxi/VTC en France. Tu écris du contenu professionnel, informatif et optimisé pour le référencement naturel."
          },
          {
            role: "user",
            content: fullPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const openaiData = await openaiResponse.json();
    const generatedContent = openaiData.choices[0].message.content;

    // 5. Incrémenter le compteur d'utilisation du prompt
    await supabase
      .from('ai_content_prompts')
      .update({
        usage_count: (promptTemplate.usage_count || 0) + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', promptTemplate.id);

    // 6. Enregistrer pour tracking (optionnel)
    await supabase.from('seo_content_improvements').insert({
      query: topQueries[0]?.query || topic,
      improvement_type: category === 'blog' ? 'new_page' : 'optimize_existing',
      suggested_content: generatedContent,
      ai_prompt_used: fullPrompt,
      ai_model: 'gpt-4',
      status: 'draft',
      metadata: {
        target_queries: topQueries.map(q => ({
          query: q.query,
          impressions: q.impressions,
          position: q.position
        }))
      }
    });

    console.log(`✅ Contenu généré avec succès`);

    return new Response(
      JSON.stringify({
        success: true,
        content: generatedContent,
        metadata: {
          prompt_template: promptTemplate.name,
          target_queries: topQueries.map(q => q.query),
          total_impressions: topQueries.reduce((sum, q) => sum + q.impressions, 0)
        }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("❌ Erreur génération contenu:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/**
 * Trouve les requêtes GSC pertinentes pour un sujet
 */
async function findRelevantQueries(
  supabase: any,
  topic: string,
  category: string,
  maxQueries: number
) {
  // Extraire les mots-clés du sujet
  const keywords = topic.toLowerCase().split(' ').filter(w => w.length > 3);

  // Construire la requête de recherche
  let query = supabase
    .from('gsc_queries')
    .select('query, impressions, clicks, ctr, position')
    .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    .gt('impressions', 10)
    .order('impressions', { ascending: false })
    .limit(100);

  const { data: allQueries } = await query;

  if (!allQueries || allQueries.length === 0) {
    return [];
  }

  // Scorer les requêtes par pertinence
  const scoredQueries = allQueries
    .map(q => {
      let score = 0;
      const queryLower = q.query.toLowerCase();

      // Points pour chaque mot-clé trouvé
      for (const keyword of keywords) {
        if (queryLower.includes(keyword)) {
          score += 10;
        }
      }

      // Points pour catégorie
      if (category === 'city_page' && /paris|lyon|marseille|toulouse|nice|nantes|strasbourg|montpellier|bordeaux/i.test(queryLower)) {
        score += 15;
      }
      if (category === 'blog' && /comment|pourquoi|conseil|guide|astuce/i.test(queryLower)) {
        score += 10;
      }

      // Points pour les métriques
      score += Math.min(20, q.impressions / 50);
      if (q.position >= 5 && q.position <= 15) {
        score += 10; // Sweet spot
      }

      return { ...q, relevance_score: score };
    })
    .filter(q => q.relevance_score > 5)
    .sort((a, b) => b.relevance_score - a.relevance_score)
    .slice(0, maxQueries);

  return scoredQueries;
}

/**
 * Génère un contenu template si OpenAI n'est pas disponible
 */
function generateTemplateContent(topic: string, queries: any[]): string {
  const queriesList = queries.length > 0
    ? queries.map(q => `- ${q.query}`).join('\n')
    : '- Aucune requête GSC disponible';

  return `# ${topic}

## Contenu optimisé SEO

Ce contenu a été généré en mode template car l'API OpenAI n'est pas configurée.

### Requêtes SEO ciblées :
${queriesList}

### Instructions de génération :
1. Configurez OPENAI_API_KEY dans les secrets Supabase
2. Le contenu sera généré automatiquement selon les requêtes GSC
3. Le système intégrera naturellement ces requêtes dans le contenu

### Métriques :
- Total impressions : ${queries.reduce((sum, q) => sum + q.impressions, 0)}
- Position moyenne : ${queries.length > 0 ? (queries.reduce((sum, q) => sum + q.position, 0) / queries.length).toFixed(1) : 'N/A'}
`;
}
