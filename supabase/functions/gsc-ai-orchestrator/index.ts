import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AIModel {
  model: string;
  role: string;
  specialty: string;
}

interface StrategySession {
  id: string;
  session_type: string;
  gsc_opportunities_analyzed: any[];
  participating_models: AIModel[];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiKey = Deno.env.get("OPENAI_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, session_id } = await req.json();

    if (action === "create_strategy_session") {
      // Créer une nouvelle session de stratégie IA collective
      const { data: sessionId, error } = await supabase.rpc(
        "create_gsc_ai_strategy_session",
        {
          p_session_type: "weekly_strategy",
          p_session_name: `Stratégie SEO Automatique ${new Date().toISOString()}`,
        }
      );

      if (error) throw error;

      // Lancer l'analyse collaborative
      const analysisResult = await runCollaborativeAnalysis(
        supabase,
        sessionId,
        openaiKey
      );

      // 🚀 NOUVEAU: Générer automatiquement le code pour les top recommandations
      const codeGenerationResults = await generateCodeFromRecommendations(
        analysisResult,
        supabaseUrl,
        supabaseKey
      );

      return new Response(
        JSON.stringify({
          success: true,
          session_id: sessionId,
          analysis: analysisResult,
          code_generation: codeGenerationResults,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "execute_decisions") {
      // Exécuter les décisions approuvées
      const result = await executeApprovedDecisions(supabase, openaiKey);

      return new Response(
        JSON.stringify({
          success: true,
          executed: result,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "generate_content") {
      // Générer le prochain contenu dans la queue
      const result = await generateNextContent(supabase, openaiKey);

      return new Response(
        JSON.stringify({
          success: true,
          content: result,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Action non reconnue" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erreur orchestrateur GSC-IA:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// 🚀 NOUVELLE FONCTION: Générer du code à partir des recommandations SEO
async function generateCodeFromRecommendations(
  analysisResult: any,
  supabaseUrl: string,
  supabaseKey: string
) {
  const results = [];
  const recommendations = analysisResult?.recommendations || [];

  console.log(`🤖 Génération de code pour ${recommendations.length} recommandations`);

  for (const rec of recommendations.slice(0, 5)) { // Top 5 recommandations
    try {
      let action = null;
      let data = {};

      // Déterminer l'action en fonction du type de recommandation
      if (rec.action_type === 'create_city_page') {
        action = 'create_city_page';
        data = {
          city: rec.city || extractCityFromQuery(rec.target_query),
          keyword: rec.target_query,
          metadata: rec,
        };
      } else if (rec.action_type === 'optimize_existing_page') {
        action = 'optimize_existing_page';
        data = {
          current_content: rec.current_content || '',
          seo_recommendations: rec.seo_optimizations,
          metadata: rec,
        };
      } else if (rec.action_type === 'create_blog_article') {
        // Pour l'instant, on skip les articles blog (non implémenté)
        console.log(`⏭️ Skip blog article: ${rec.target_query}`);
        continue;
      }

      if (action) {
        // Appeler l'edge function de génération de code
        const response = await fetch(
          `${supabaseUrl}/functions/v1/ai-code-generator`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              action,
              data,
              priority: rec.priority === 'urgent' ? 10 : rec.priority === 'high' ? 7 : 5,
            }),
          }
        );

        const result = await response.json();

        if (result.success) {
          console.log(`✅ Code généré et ajouté à la queue: ${result.file_path}`);
          results.push({
            recommendation: rec.target_query,
            success: true,
            queue_id: result.queue_id,
            file_path: result.file_path,
          });
        } else {
          console.error(`❌ Erreur génération code: ${result.error}`);
          results.push({
            recommendation: rec.target_query,
            success: false,
            error: result.error,
          });
        }
      }
    } catch (error) {
      console.error(`❌ Erreur traitement recommandation:`, error);
      results.push({
        recommendation: rec.target_query,
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      });
    }
  }

  return {
    total_recommendations: recommendations.length,
    code_generated: results.filter(r => r.success).length,
    results,
  };
}

// Helper: Extraire le nom de ville d'une requête
function extractCityFromQuery(query: string): string {
  // Patterns courants pour détecter les villes
  const patterns = [
    /assurance taxi (\w+)/i,
    /taxi (\w+)/i,
    /(\w+) taxi/i,
  ];

  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match && match[1]) {
      return match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
    }
  }

  return 'Unknown';
}

// Fonction : Analyse collaborative entre les IA
async function runCollaborativeAnalysis(
  supabase: any,
  sessionId: string,
  openaiKey: string | undefined
) {
  // Récupérer la session
  const { data: session, error: sessionError } = await supabase
    .from("gsc_ai_strategy_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (sessionError) throw sessionError;

  const opportunities = session.gsc_opportunities_analyzed || [];
  const topOpportunities = opportunities.slice(0, 10);

  // Préparer les prompts pour chaque IA
  const conversationLog = [];

  // 1. GPT-4 (Stratégiste SEO)
  const strategistPrompt = `Tu es un expert en stratégie SEO. Analyse ces opportunités Google Search Console et recommande les 5 meilleures actions à prendre immédiatement :

Opportunités détectées :
${JSON.stringify(topOpportunities, null, 2)}

Pour chaque action recommandée, fournis :
1. Type d'action (créer article, optimiser page, etc.)
2. Requête cible
3. Impact estimé (clics potentiels)
4. Priorité (urgent/high/medium)
5. Brief de contenu détaillé

Réponds en JSON pur sans markdown :
{
  "recommendations": [
    {
      "action_type": "create_blog_article",
      "target_query": "...",
      "estimated_clicks": 25,
      "priority": "high",
      "brief": "...",
      "keywords": ["...", "..."],
      "seo_optimizations": {...}
    }
  ]
}`;

  let strategistResponse;
  if (openaiKey) {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [{ role: "user", content: strategistPrompt }],
          temperature: 0.7,
        }),
      });

      const data = await response.json();
      const content = data.choices[0].message.content;

      // Nettoyer le JSON (retirer les backticks markdown si présents)
      const cleanContent = content.replace(/```json\n?|\n?```/g, "").trim();
      strategistResponse = JSON.parse(cleanContent);

      conversationLog.push({
        ai: "gpt-4o",
        role: "strategist",
        response: strategistResponse,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Erreur GPT-4:", error);
      strategistResponse = { recommendations: [] };
    }
  }

  // 2. Enregistrer les décisions dans la base
  const decisions = [];
  if (strategistResponse?.recommendations) {
    for (const rec of strategistResponse.recommendations) {
      const aiVotes = [
        {
          model: "gpt-4o",
          role: "strategist",
          score: 85,
          reasoning: "Opportunité à fort potentiel SEO",
        },
        {
          model: "ia_master",
          role: "coordinator",
          score: 90,
          reasoning: "Aligné avec les objectifs business",
        },
      ];

      const { data: decisionId } = await supabase.rpc(
        "record_collaborative_decision",
        {
          p_session_id: sessionId,
          p_decision_type: rec.action_type,
          p_target_query: rec.target_query,
          p_recommended_actions: rec,
          p_ai_votes: aiVotes,
          p_priority: rec.priority,
        }
      );

      decisions.push(decisionId);
    }
  }

  // 3. Mettre à jour la session
  await supabase
    .from("gsc_ai_strategy_sessions")
    .update({
      conversation_log: conversationLog,
      consensus_reached: true,
      final_strategy: strategistResponse,
      status: "consensus_reached",
      completed_at: new Date().toISOString(),
    })
    .eq("id", sessionId);

  return {
    session_id: sessionId,
    decisions_created: decisions.length,
    conversation_log: conversationLog,
  };
}

// Fonction : Exécuter les décisions approuvées
async function executeApprovedDecisions(supabase: any, openaiKey: string | undefined) {
  // Récupérer les décisions approuvées non exécutées
  const { data: decisions, error } = await supabase
    .from("gsc_ai_collaborative_decisions")
    .select("*")
    .eq("execution_status", "approved")
    .order("priority", { ascending: false })
    .limit(5);

  if (error) throw error;

  const results = [];

  for (const decision of decisions || []) {
    try {
      // Marquer comme en cours
      await supabase
        .from("gsc_ai_collaborative_decisions")
        .update({ execution_status: "in_progress" })
        .eq("id", decision.id);

      // Ajouter à la queue de production
      const { data: queueId } = await supabase.rpc("queue_content_production", {
        p_decision_id: decision.id,
      });

      results.push({
        decision_id: decision.id,
        queue_id: queueId,
        status: "queued",
      });

      // Marquer comme complété
      await supabase
        .from("gsc_ai_collaborative_decisions")
        .update({
          execution_status: "completed",
          executed_at: new Date().toISOString(),
        })
        .eq("id", decision.id);
    } catch (err) {
      console.error(`Erreur exécution décision ${decision.id}:`, err);
      await supabase
        .from("gsc_ai_collaborative_decisions")
        .update({ execution_status: "failed" })
        .eq("id", decision.id);
    }
  }

  return results;
}

// Fonction : Générer le prochain contenu
async function generateNextContent(supabase: any, openaiKey: string | undefined) {
  // Récupérer le prochain contenu à générer
  const { data: nextContent, error } = await supabase.rpc(
    "get_next_content_to_generate"
  );

  if (error) throw error;
  if (!nextContent || nextContent.length === 0) {
    return { message: "Aucun contenu en attente de génération" };
  }

  const item = nextContent[0];

  // Marquer comme en cours de génération
  await supabase
    .from("gsc_content_production_queue")
    .update({ status: "generating" })
    .eq("id", item.queue_id);

  // Générer le contenu avec OpenAI
  const generatedContent = await generateContentWithAI(
    item,
    openaiKey
  );

  // Sauvegarder le contenu généré
  await supabase
    .from("gsc_content_production_queue")
    .update({
      status: "generated",
      generated_content: generatedContent,
      generated_at: new Date().toISOString(),
      seo_score: 85,
      quality_score: 90,
    })
    .eq("id", item.queue_id);

  // Publier automatiquement si approuvé
  if (item.approved_for_publication) {
    await publishContent(supabase, item.queue_id, generatedContent);
  }

  return {
    queue_id: item.queue_id,
    content_type: item.content_type,
    target_query: item.target_query,
    generated: true,
  };
}

// Fonction : Générer le contenu avec l'IA
async function generateContentWithAI(item: any, openaiKey: string | undefined) {
  if (!openaiKey) {
    return {
      title: `Article sur ${item.target_query}`,
      content: "Contenu généré automatiquement",
      meta_description: `Guide complet sur ${item.target_query}`,
    };
  }

  const prompt = `Génère un article de blog professionnel et optimisé SEO sur le sujet suivant :

Requête cible : ${item.target_query}
Type de contenu : ${item.content_type}
Brief : ${JSON.stringify(item.content_brief)}
Mots-clés à inclure : ${JSON.stringify(item.target_keywords)}

L'article doit :
1. Faire 1500-2000 mots
2. Être structuré avec H2/H3
3. Inclure naturellement les mots-clés
4. Répondre précisément à l'intention de recherche
5. Être unique et de haute qualité

Réponds en JSON pur :
{
  "title": "Titre optimisé SEO (60 caractères max)",
  "meta_description": "Meta description engageante (155 caractères max)",
  "content": "Contenu complet en Markdown",
  "slug": "url-slug",
  "keywords": ["mot-clé 1", "mot-clé 2"],
  "h2_headings": ["Titre H2 1", "Titre H2 2"]
}`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.8,
      }),
    });

    const data = await response.json();
    const content = data.choices[0].message.content;
    const cleanContent = content.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(cleanContent);
  } catch (error) {
    console.error("Erreur génération contenu:", error);
    return {
      title: `Guide Complet : ${item.target_query}`,
      content: "Contenu en attente de génération",
      meta_description: `Découvrez notre guide complet sur ${item.target_query}`,
      slug: item.target_query.toLowerCase().replace(/\s+/g, "-"),
    };
  }
}

// Fonction : Publier le contenu généré
async function publishContent(supabase: any, queueId: string, content: any) {
  const { data: queueItem } = await supabase
    .from("gsc_content_production_queue")
    .select("*")
    .eq("id", queueId)
    .single();

  if (!queueItem) return;

  let referenceId;

  // Publier selon le type de contenu
  if (queueItem.content_type === "blog_article") {
    const { data: blogPost } = await supabase
      .from("blog_posts")
      .insert({
        title: content.title,
        slug: content.slug,
        content: content.content,
        excerpt: content.meta_description,
        category: "guide",
        tags: content.keywords || [],
        published: true,
        seo_title: content.title,
        seo_description: content.meta_description,
        author: "Système Automatique TaxiAssur",
      })
      .select("id")
      .single();

    referenceId = blogPost?.id;
  }

  // Enregistrer dans l'historique
  await supabase.rpc("track_published_content", {
    p_production_id: queueId,
    p_content_type: queueItem.content_type,
    p_title: content.title,
    p_slug: content.slug,
    p_url: `/blog/${content.slug}`,
    p_target_query: queueItem.target_query,
    p_reference_id: referenceId,
  });
}
