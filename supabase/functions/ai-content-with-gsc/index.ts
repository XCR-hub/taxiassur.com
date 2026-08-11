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
 * 4. Genere le contenu via le premier fournisseur IA disponible
 * 5. Enregistre la performance pour tracking
 */
const SEO_SYSTEM_PROMPT = "Tu es un expert en redaction SEO pour l'assurance taxi/VTC en France. Tu ecris du contenu professionnel, informatif et optimise pour le referencement naturel.";

async function callOpenAIContent(apiKey: string, systemPrompt: string, prompt: string): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2000
    })
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`OpenAI API error: ${response.status} ${body.slice(0, 180)}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

async function callOpenRouterContent(apiKey: string, systemPrompt: string, prompt: string): Promise<string> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://taxiassur.com",
      "X-Title": "TaxiAssur"
    },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2000
    })
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`OpenRouter API error: ${response.status} ${body.slice(0, 180)}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

async function callGeminiContent(apiKey: string, systemPrompt: string, prompt: string): Promise<string> {
  const model = "gemini-2.0-flash";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `${systemPrompt}\n\n${prompt}` }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2500
        }
      })
    }
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Gemini API error: ${response.status} ${body.slice(0, 180)}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.map((part: any) => part.text || "").join("") || "";
}

async function callAnthropicContent(apiKey: string, systemPrompt: string, prompt: string): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 2500,
      temperature: 0.7,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }]
    })
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Anthropic API error: ${response.status} ${body.slice(0, 180)}`);
  }

  const data = await response.json();
  return data.content?.map((block: any) => block.text || "").join("") || "";
}

async function generateContentWithFallback(
  keys: { openai: string; openrouter: string; gemini: string; anthropic: string },
  systemPrompt: string,
  prompt: string
): Promise<{ content: string | null; provider: string; model: string; errors: string[] }> {
  const errors: string[] = [];
  const providers = [
    {
      id: "openai",
      model: "gpt-4o-mini",
      enabled: Boolean(keys.openai),
      call: () => callOpenAIContent(keys.openai, systemPrompt, prompt)
    },
    {
      id: "openrouter",
      model: "openai/gpt-4o-mini",
      enabled: Boolean(keys.openrouter),
      call: () => callOpenRouterContent(keys.openrouter, systemPrompt, prompt)
    },
    {
      id: "gemini",
      model: "gemini-2.0-flash",
      enabled: Boolean(keys.gemini),
      call: () => callGeminiContent(keys.gemini, systemPrompt, prompt)
    },
    {
      id: "anthropic",
      model: "claude-3-5-haiku-20241022",
      enabled: Boolean(keys.anthropic),
      call: () => callAnthropicContent(keys.anthropic, systemPrompt, prompt)
    }
  ];

  for (const provider of providers) {
    if (!provider.enabled) {
      continue;
    }

    try {
      const content = await provider.call();
      if (content.trim().length < 100) {
        throw new Error("reponse trop courte");
      }
      return { content, provider: provider.id, model: provider.model, errors };
    } catch (error: any) {
      const message = error?.message || String(error);
      console.warn(`Provider ${provider.id} failed:`, message);
      errors.push(`${provider.id}: ${message.slice(0, 220)}`);
    }
  }

  return { content: null, provider: "template", model: "template", errors };
}
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

    // 4. Generer le contenu avec le premier fournisseur IA disponible
    const aiResult = await generateContentWithFallback(
      {
        openai: Deno.env.get("OPENAI_API_KEY") || "",
        openrouter: Deno.env.get("OPENROUTER_API_KEY") || "",
        gemini: Deno.env.get("GEMINI_API_KEY") || "",
        anthropic: Deno.env.get("ANTHROPIC_API_KEY") || ""
      },
      SEO_SYSTEM_PROMPT,
      fullPrompt
    );

    const generatedContent = aiResult.content || generateTemplateContent(topic, topQueries);

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
      ai_model: `${aiResult.provider}:${aiResult.model}`,
      status: 'draft',
      metadata: {
        target_queries: topQueries.map(q => ({
          query: q.query,
          impressions: q.impressions,
          position: q.position
        })),
        ai_provider: aiResult.provider,
        ai_model: aiResult.model,
        provider_errors: aiResult.errors
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
          total_impressions: topQueries.reduce((sum, q) => sum + q.impressions, 0),
          ai_provider: aiResult.provider,
          ai_model: aiResult.model,
          provider_errors: aiResult.errors,
          template_mode: aiResult.provider === 'template'
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
  const query = supabase
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
 * Genere un contenu template si les fournisseurs IA ne sont pas disponibles
 */
function generateTemplateContent(topic: string, queries: any[]): string {
  const queriesList = queries.length > 0
    ? queries.map(q => `- ${q.query}`).join('\n')
    : '- Aucune requête GSC disponible';

  return `# ${topic}

## Contenu optimisé SEO

Ce contenu a ete genere en mode template car aucun fournisseur IA n'a repondu correctement.

### Requêtes SEO ciblées :
${queriesList}

### Instructions de génération :
1. Verifiez les credits et secrets IA dans Supabase
2. Le contenu sera généré automatiquement selon les requêtes GSC
3. Le système intégrera naturellement ces requêtes dans le contenu

### Métriques :
- Total impressions : ${queries.reduce((sum, q) => sum + q.impressions, 0)}
- Position moyenne : ${queries.length > 0 ? (queries.reduce((sum, q) => sum + q.position, 0) / queries.length).toFixed(1) : 'N/A'}
`;
}
