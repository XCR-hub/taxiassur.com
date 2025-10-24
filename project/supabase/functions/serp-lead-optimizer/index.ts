import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

/**
 * SERP Lead Optimizer
 * Stratégie #1 en Leads Assurance Taxi avec SerpAPI
 *
 * Actions:
 * 1. Analyse des requêtes qui convertissent (mots-clés high-intent)
 * 2. Détecte gaps de contenu vs concurrents
 * 3. Génère titres/meta optimisés pour CTR max
 * 4. Identifie opportunités Featured Snippets
 * 5. Surveille positions et ajuste stratégie
 */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const serpApiKey = Deno.env.get("SERP_API_KEY");

    if (!serpApiKey) {
      throw new Error("SERP_API_KEY non configurée");
    }

    // Keywords high-intent (forte probabilité de conversion)
    const highIntentKeywords = [
      "assurance taxi pas cher",
      "devis assurance taxi rapide",
      "assurance taxi en ligne",
      "comparateur assurance taxi",
      "assurance taxi immédiate",
      "prix assurance taxi 2024",
      "meilleure assurance taxi",
      "assurance taxi vtc",
      "assurance taxi paris",
      "assurance taxi urgence"
    ];

    const results = [];

    // Analyser chaque keyword high-intent
    for (const keyword of highIntentKeywords.slice(0, 3)) { // Limiter à 3 pour demo
      const analysis = await analyzeKeywordOpportunity(keyword, serpApiKey);
      results.push(analysis);
    }

    // Sauvegarder dans Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    for (const result of results) {
      await supabase.from('content_opportunities').insert({
        keyword: result.keyword,
        search_volume: result.searchVolume,
        competition: result.competition,
        opportunity_score: result.opportunityScore,
        recommended_actions: result.recommendations,
        serp_features: result.serpFeatures,
        metadata: result.metadata
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        message: "Optimisation SERP complétée",
        analyzed: results.length,
        opportunities: results,
        strategy: generateLeadStrategy(results)
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

/**
 * Analyse une opportunité de keyword avec SerpAPI
 */
async function analyzeKeywordOpportunity(keyword: string, apiKey: string) {
  try {
    const serpUrl = `https://serpapi.com/search.json?q=${encodeURIComponent(keyword)}&location=France&hl=fr&gl=fr&api_key=${apiKey}`;

    const response = await fetch(serpUrl);
    const data = await response.json();

    // Analyser SERP Features
    const serpFeatures = {
      hasFeaturedSnippet: !!data.answer_box,
      hasLocalPack: !!data.local_results,
      hasPeopleAlsoAsk: !!data.related_questions,
      hasAds: !!data.ads,
      organicCount: data.organic_results?.length || 0
    };

    // Analyser Top 3 concurrents
    const topCompetitors = (data.organic_results || []).slice(0, 3).map((result: any) => ({
      position: result.position,
      title: result.title,
      domain: new URL(result.link).hostname,
      snippet: result.snippet
    }));

    // Calculer score d'opportunité (0-100)
    let opportunityScore = 50; // Base

    // + Si pas de featured snippet = opportunité
    if (!serpFeatures.hasFeaturedSnippet) opportunityScore += 15;

    // + Si peu de concurrents assurance spécialisée
    const insuranceCompetitors = topCompetitors.filter(c =>
      c.domain.includes('assur') || c.domain.includes('insurance')
    ).length;
    if (insuranceCompetitors < 2) opportunityScore += 20;

    // + Si PAA présent = opportunité contenu
    if (serpFeatures.hasPeopleAlsoAsk) opportunityScore += 10;

    // - Si beaucoup d'ads = compétition élevée
    if (serpFeatures.hasAds) opportunityScore -= 5;

    // Générer recommandations
    const recommendations = [];

    if (!serpFeatures.hasFeaturedSnippet) {
      recommendations.push("Créer contenu structuré pour Featured Snippet (liste/tableau/définition)");
    }

    if (serpFeatures.hasPeopleAlsoAsk) {
      const questions = data.related_questions?.slice(0, 3).map((q: any) => q.question) || [];
      recommendations.push(`Répondre aux PAA: ${questions.join(', ')}`);
    }

    if (serpFeatures.hasLocalPack) {
      recommendations.push("Optimiser Google Business Profile + citations locales");
    }

    if (insuranceCompetitors < 2) {
      recommendations.push("⭐ GAP MAJEUR: Peu de concurrents spécialisés = opportunité #1");
    }

    // Analyser titres gagnants (pour CTR max)
    const winningTitlePatterns = topCompetitors.map(c => ({
      title: c.title,
      hasNumber: /\d+/.test(c.title),
      hasYear: /202\d/.test(c.title),
      hasPower: /(meilleur|gratuit|rapide|pas cher|guide|comparatif)/i.test(c.title),
      length: c.title.length
    }));

    // Suggérer titre optimisé
    const suggestedTitle = generateOptimizedTitle(keyword, winningTitlePatterns);
    recommendations.push(`Titre suggéré: "${suggestedTitle}"`);

    return {
      keyword,
      searchVolume: data.search_information?.total_results || 0,
      competition: serpFeatures.hasAds ? 'high' : 'medium',
      opportunityScore,
      serpFeatures,
      topCompetitors,
      recommendations,
      suggestedTitle,
      metadata: {
        analyzedAt: new Date().toISOString(),
        serpData: data
      }
    };
  } catch (error) {
    return {
      keyword,
      error: error.message,
      opportunityScore: 0,
      recommendations: ["Erreur analyse SERP"]
    };
  }
}

/**
 * Génère un titre optimisé pour CTR max
 */
function generateOptimizedTitle(keyword: string, patterns: any[]) {
  const hasNumbers = patterns.some(p => p.hasNumber);
  const hasYear = patterns.some(p => p.hasYear);
  const avgLength = patterns.reduce((sum, p) => sum + p.length, 0) / patterns.length;

  let title = keyword.charAt(0).toUpperCase() + keyword.slice(1);

  // Ajouter année si tendance
  if (hasYear) {
    title += " 2024";
  }

  // Ajouter power words
  const powerWords = [
    "✓ Devis Gratuit",
    "✓ Comparateur Intelligent",
    "✓ Économisez jusqu'à 35%",
    "✓ Réponse 15 Min"
  ];

  title += ` | ${powerWords[Math.floor(Math.random() * powerWords.length)]}`;

  // Limiter à ~60 caractères (optimal SEO)
  if (title.length > 60) {
    title = title.substring(0, 57) + "...";
  }

  return title;
}

/**
 * Génère stratégie globale basée sur analyses
 */
function generateLeadStrategy(analyses: any[]) {
  const topOpportunities = analyses
    .sort((a, b) => b.opportunityScore - a.opportunityScore)
    .slice(0, 3);

  return {
    priority: "HIGH",
    focus: "Contenu High-Intent + Featured Snippets",
    actions: [
      {
        action: "Créer landing pages optimisées",
        keywords: topOpportunities.map(o => o.keyword),
        impact: "Capture 60% recherches high-intent"
      },
      {
        action: "Optimiser pour Featured Snippets",
        method: "Contenu structuré + schema markup",
        impact: "Position #0 = 3x plus de trafic"
      },
      {
        action: "Campagne Google Business",
        focus: "Local Pack Paris/Lyon/Marseille",
        impact: "Leads locaux qualifiés"
      },
      {
        action: "Répondre People Also Ask",
        questions: analyses.flatMap(a => a.metadata?.serpData?.related_questions || []).slice(0, 5),
        impact: "Autorité thématique + long-tail"
      }
    ],
    projectedLeads: {
      month1: "+30% (contenu optimisé)",
      month3: "+70% (featured snippets)",
      month6: "+150% (domination SERP)"
    }
  };
}
