import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? Deno.env.get("OpenAI_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const AGENTS = [
  { id: "lead_scorer", name: "Lead Scorer", focus: "score de qualification et potentiel de conversion du lead" },
  { id: "email_composer", name: "Email Composer", focus: "personnalisation et moment optimal pour l'envoi d'email de suivi" },
  { id: "negotiation_assistant", name: "Negotiation Assistant", focus: "stratégie de négociation et marge de manœuvre tarifaire" },
  { id: "risk_analyzer", name: "Risk Analyzer", focus: "risques de souscription et profil sinistralité" },
  { id: "churn_predictor", name: "Churn Predictor", focus: "risque de perte du lead et signaux d'attrition" },
  { id: "cross_sell_recommender", name: "Cross-Sell Recommender", focus: "opportunités de vente complémentaire (RC Pro, garanties additionnelles)" },
  { id: "sentiment_analyzer", name: "Sentiment Analyzer", focus: "sentiment et ton des échanges, satisfaction perçue" },
  { id: "response_generator", name: "Response Generator", focus: "contenu idéal de la prochaine réponse au lead" },
];

const DECISION_TYPES: Record<string, string[]> = {
  lead_scorer: ["prediction", "evaluation"],
  email_composer: ["automation", "suggestion"],
  negotiation_assistant: ["suggestion"],
  risk_analyzer: ["alert", "prediction"],
  churn_predictor: ["alert", "prediction"],
  cross_sell_recommender: ["suggestion"],
  sentiment_analyzer: ["alert", "suggestion"],
  response_generator: ["automation"],
};

async function callOpenAI(prompt: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.4,
      max_tokens: 600,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Tu es un moteur de décision IA pour TaxiAssur, un courtier en assurance taxi.
Tu analyses des leads (prospects taxi) et génères des décisions actionnables pour les commerciaux.
Réponds UNIQUEMENT en JSON valide selon le schéma demandé. Sois précis, concret et utile.
Utilise des données réalistes du secteur de l'assurance taxi en France.`,
        },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI error: ${res.status}`);
  const data = await res.json();
  return data.choices[0].message.content;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const limitLeads: number = body.limit ?? 5;
    const forceAgents: string[] | undefined = body.agents;

    const { data: leads, error: leadsErr } = await supabase
      .from("crm_leads")
      .select("id, first_name, last_name, email, phone, status, vehicle_type, created_at, pipeline_stage, city, notes")
      .order("created_at", { ascending: false })
      .limit(limitLeads);

    if (leadsErr) throw leadsErr;
    if (!leads || leads.length === 0) {
      return new Response(JSON.stringify({ success: true, generated: 0, message: "Aucun lead trouvé" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: existingDecisions } = await supabase
      .from("crm_ai_decisions")
      .select("lead_id, agent, created_at")
      .in("lead_id", leads.map((l: { id: string }) => l.id))
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const recentMap = new Set<string>(
      (existingDecisions ?? []).map((d: { lead_id: string; agent: string }) => `${d.lead_id}::${d.agent}`)
    );

    const agentsToRun = forceAgents ?? AGENTS.map((a) => a.id);
    const decisionsToInsert: Record<string, unknown>[] = [];

    for (const lead of leads) {
      const leadAge = Math.floor(
        (Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      const leadContext = `
Lead: ${lead.first_name ?? ""} ${lead.last_name ?? ""} (${lead.email ?? "email inconnu"})
Téléphone: ${lead.phone ?? "non renseigné"}
Statut pipeline: ${lead.pipeline_stage ?? lead.status ?? "nouveau"}
Type de véhicule: ${lead.vehicle_type ?? "taxi"}
Ville: ${lead.city ?? "France"}
Créé il y a: ${leadAge} jours
Notes: ${lead.notes ?? "aucune"}
`.trim();

      for (const agentId of agentsToRun) {
        const key = `${lead.id}::${agentId}`;
        if (recentMap.has(key)) continue;

        const agent = AGENTS.find((a) => a.id === agentId);
        if (!agent) continue;

        const types = DECISION_TYPES[agentId] ?? ["suggestion"];
        const decisionType = types[Math.floor(Math.random() * types.length)];

        const prompt = `
Analyse ce lead pour TaxiAssur en tant qu'agent "${agent.name}" spécialisé dans: ${agent.focus}.

${leadContext}

Génère UNE décision IA (type: "${decisionType}") en JSON avec exactement ce schéma:
{
  "title": "Titre court et percutant (max 60 chars)",
  "description": "Description claire de la situation et de l'opportunité (2-3 phrases, concrète)",
  "rationale": "Raisonnement analytique détaillé expliquant pourquoi cette décision est recommandée (3-4 phrases avec des données)",
  "confidence_score": 0.XX (entre 0.70 et 0.97, float),
  "suggested_action": "Action concrète et immédiate à effectuer (1 phrase)",
  "data_sources": ["table1", "table2"] (2-4 sources parmi: crm_leads, email_opens, crm_interactions, insurance_companies, crm_claims, email_messages)
}
`.trim();

        try {
          const raw = await callOpenAI(prompt);
          const parsed = JSON.parse(raw);

          decisionsToInsert.push({
            lead_id: lead.id,
            agent: agentId,
            decision_type: decisionType,
            title: parsed.title ?? `Analyse ${agent.name}`,
            description: parsed.description ?? "",
            rationale: parsed.rationale ?? "",
            confidence_score: Math.min(0.99, Math.max(0.5, parseFloat(parsed.confidence_score) || 0.8)),
            suggested_action: parsed.suggested_action ?? "",
            data_sources: Array.isArray(parsed.data_sources) ? parsed.data_sources : ["crm_leads"],
            status: "pending",
          });
        } catch (e) {
          console.error(`Agent ${agentId} for lead ${lead.id} failed:`, e);
        }
      }
    }

    let inserted = 0;
    if (decisionsToInsert.length > 0) {
      const { error: insertErr } = await supabase.from("crm_ai_decisions").insert(decisionsToInsert);
      if (insertErr) throw insertErr;
      inserted = decisionsToInsert.length;
    }

    return new Response(
      JSON.stringify({
        success: true,
        generated: inserted,
        leads_analyzed: leads.length,
        message: `${inserted} décisions générées pour ${leads.length} leads`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("generate-ai-decisions error:", err);
    return new Response(JSON.stringify({ success: false, error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
