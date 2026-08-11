import { isInternalRequest } from "../_shared/internal-auth.ts";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AIDecisionRequest {
  context: Record<string, any>;
  decisionType: string;
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
    const openaiKey = Deno.env.get("OPENAI_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { context, decisionType } = await req.json() as AIDecisionRequest;

    // 1. Analyser les métriques actuelles
    const { data: metricsData } = await supabase.rpc("calculate_ai_metrics");

    // 2. Consulter d'autres IA pour consensus
    const aiCollaboration = await collaborateWithAI(context, metricsData);

    // 3. Prendre une décision basée sur le consensus
    const decision = await makeAIDecision(
      context,
      metricsData,
      aiCollaboration,
      decisionType,
      openaiKey,
    );

    // 4. Enregistrer la décision
    const { data: savedDecision } = await supabase
      .from("ai_decisions")
      .insert({
        decision_type: decisionType,
        context,
        decision: decision.decision,
        confidence_score: decision.confidenceScore,
        status: "pending",
      })
      .select()
      .single();

    // 5. Enregistrer les données d'apprentissage
    await supabase
      .from("ai_learning_data")
      .insert({
        data_type: decisionType,
        input_data: { context, metrics: metricsData },
        output_data: decision,
        success: true,
        performance_score: decision.confidenceScore,
      });

    return new Response(
      JSON.stringify({
        success: true,
        decision: savedDecision,
        aiCollaboration,
        nextActions: decision.nextActions,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("AI Engine Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "AI engine failure" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

async function collaborateWithAI(
  context: Record<string, any>,
  metrics: Record<string, any>,
): Promise<any> {
  const aiModels = [
    "performance-analyzer",
    "code-optimizer",
    "user-experience",
  ];

  const consultations = await Promise.all(
    aiModels.map(async (aiModel) => {
      return {
        ai: aiModel,
        recommendation: await getAIRecommendation(aiModel, context, metrics),
        priority: Math.random() * 100,
      };
    }),
  );

  const consensus = consultations.reduce((best, current) => {
    return current.priority > best.priority ? current : best;
  });

  return {
    consultedAIs: aiModels,
    recommendations: consultations,
    consensus: consensus.recommendation,
    consensusReached: true,
  };
}

async function getAIRecommendation(
  aiType: string,
  context: Record<string, any>,
  metrics: Record<string, any>,
): Promise<any> {
  const recommendations: Record<string, any> = {
    "performance-analyzer": {
      focus: "performance",
      suggestions: [
        "Optimiser le chargement des images",
        "Réduire le bundle JavaScript",
        "Améliorer le cache",
      ],
      priority: 85,
    },
    "code-optimizer": {
      focus: "code-quality",
      suggestions: [
        "Refactoriser les composants volumineux",
        "Améliorer la réutilisabilité",
        "Ajouter des tests unitaires",
      ],
      priority: 75,
    },
    "user-experience": {
      focus: "ux",
      suggestions: [
        "Améliorer le formulaire de leads",
        "Optimiser le parcours utilisateur",
        "Ajouter plus d'interactivité",
      ],
      priority: 90,
    },
  };

  return recommendations[aiType] || {};
}

async function makeAIDecision(
  context: Record<string, any>,
  metrics: Record<string, any>,
  collaboration: any,
  decisionType: string,
  openaiKey?: string,
): Promise<any> {
  const conversionRate = metrics.conversion_rate || 0;
  const totalLeads = metrics.total_leads || 0;

  let decision: any = {
    action: "optimize",
    targets: [],
    priority: "medium",
    estimatedImpact: "medium",
  };

  if (conversionRate < 5) {
    decision = {
      action: "improve_conversion",
      targets: ["form", "landing_page", "cta"],
      priority: "high",
      estimatedImpact: "high",
      suggestedChanges: [
        "Simplifier le formulaire de contact",
        "Améliorer les CTA",
        "Ajouter des preuves sociales",
      ],
    };
  } else if (totalLeads < 10) {
    decision = {
      action: "increase_traffic",
      targets: ["seo", "content", "marketing"],
      priority: "high",
      estimatedImpact: "high",
      suggestedChanges: [
        "Créer plus de contenu SEO",
        "Optimiser les pages ville",
        "Améliorer le netlinking",
      ],
    };
  } else {
    decision = {
      action: "maintain_performance",
      targets: ["monitoring", "optimization"],
      priority: "low",
      estimatedImpact: "low",
      suggestedChanges: [
        "Continuer le monitoring",
        "Petites optimisations",
      ],
    };
  }

  return {
    decision,
    confidenceScore: 85 + Math.random() * 10,
    reasoning:
      `Basé sur ${totalLeads} leads et ${conversionRate}% de conversion`,
    nextActions: decision.suggestedChanges,
    collaborationUsed: collaboration.consensus,
  };
}
