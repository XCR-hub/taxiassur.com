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
  { id: "lead_scorer", name: "Lead Scorer", focus: "score de qualification et potentiel de conversion" },
  { id: "email_composer", name: "Email Composer", focus: "moment et contenu optimal pour le prochain email" },
  { id: "negotiation_assistant", name: "Negotiation Assistant", focus: "stratégie de négociation tarifaire" },
  { id: "risk_analyzer", name: "Risk Analyzer", focus: "risques de souscription et profil sinistralité taxi" },
  { id: "churn_predictor", name: "Churn Predictor", focus: "risque de perte et signaux d'attrition" },
  { id: "cross_sell_recommender", name: "Cross-Sell Recommender", focus: "RC Pro, garanties additionnelles, assurance flotte" },
  { id: "sentiment_analyzer", name: "Sentiment Analyzer", focus: "satisfaction perçue et ton des échanges" },
  { id: "response_generator", name: "Response Generator", focus: "contenu idéal de la prochaine réponse commerciale" },
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
      max_tokens: 2000,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Tu es un moteur de décision IA multi-agents pour TaxiAssur, courtier en assurance taxi en France.
Tu analyses des leads (prospects chauffeurs de taxi) et génères des décisions actionnables pour les commerciaux.
Réponds UNIQUEMENT en JSON valide selon le schéma demandé. Sois précis, concret et utile.
Contexte métier: assurance taxi (RC, tous risques, conducteur désigné), marché français, leads B2B et B2C.`,
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
    const limitLeads: number = Math.min(body.limit ?? 5, 10);
    const forceAgents: string[] | undefined = body.agents;
    const agentsToRun = forceAgents ?? AGENTS.map((a) => a.id);

    const { data: leads, error: leadsErr } = await supabase
      .from("crm_leads")
      .select(
        "id, first_name, last_name, email, phone, status, pipeline_stage, city, " +
        "lead_score, temperature, source, quality_score, internal_notes, immatriculation, " +
        "needs_followup, documents_complete, ai_lead_score, ai_risk_level, ai_conversion_probability, " +
        "contact_established, needs_human_intervention, created_at, last_contact_at, email_count, " +
        "quote_amount, documents_complementaires_pending, total_uploaded_files, validated_files"
      )
      .is("deleted_at", null)
      .is("is_archived", false)
      .order("created_at", { ascending: false })
      .limit(limitLeads);

    if (leadsErr) throw leadsErr;
    if (!leads || leads.length === 0) {
      return new Response(
        JSON.stringify({ success: true, generated: 0, leads_analyzed: 0, message: "Aucun lead trouvé" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: existingDecisions } = await supabase
      .from("crm_ai_decisions")
      .select("lead_id, agent, created_at")
      .in("lead_id", leads.map((l: { id: string }) => l.id))
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const recentMap = new Set<string>(
      (existingDecisions ?? []).map((d: { lead_id: string; agent: string }) => `${d.lead_id}::${d.agent}`)
    );

    const allDecisions: Record<string, unknown>[] = [];
    const leadUpdates: Array<{ id: string; ai_lead_score?: number; ai_conversion_probability?: number; ai_risk_level?: string }> = [];

    for (const lead of leads) {
      const pendingAgents = agentsToRun.filter((agentId) => !recentMap.has(`${lead.id}::${agentId}`));
      if (pendingAgents.length === 0) continue;

      const leadAge = Math.floor((Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24));
      const daysSinceContact = lead.last_contact_at
        ? Math.floor((Date.now() - new Date(lead.last_contact_at).getTime()) / (1000 * 60 * 60 * 24))
        : null;

      const leadContext = `
Lead: ${lead.first_name ?? ""} ${lead.last_name ?? ""} (${lead.email ?? "email inconnu"})
Téléphone: ${lead.phone ?? "non renseigné"}
Ville: ${lead.city ?? "France"}
Statut pipeline: ${lead.pipeline_stage ?? lead.status ?? "nouveau_lead"}
Score lead: ${lead.lead_score ?? "non calculé"}/100
Score qualité: ${lead.quality_score ?? "non calculé"}/100
Température: ${lead.temperature ?? "COLD"}
Source acquisition: ${lead.source ?? "inconnue"}
Immatriculation: ${lead.immatriculation ?? "non renseignée"}
Montant devis: ${lead.quote_amount ? `${lead.quote_amount}€` : "non calculé"}
Créé il y a: ${leadAge} jours
Dernier contact: ${daysSinceContact !== null ? `il y a ${daysSinceContact} jours` : "jamais"}
Nombre d'emails échangés: ${lead.email_count ?? 0}
Contact établi: ${lead.contact_established ? "oui" : "non"}
Documents complets: ${lead.documents_complete ? "oui" : "non"}
Fichiers uploadés: ${lead.total_uploaded_files ?? 0} (${lead.validated_files ?? 0} validés)
Documents complémentaires en attente: ${lead.documents_complementaires_pending ?? 0}
Nécessite suivi: ${lead.needs_followup ? "oui" : "non"}
Intervention humaine requise: ${lead.needs_human_intervention ? "oui" : "non"}
Notes internes: ${lead.internal_notes ?? "aucune"}
`.trim();

      const agentDescriptions = pendingAgents
        .map((id) => {
          const agent = AGENTS.find((a) => a.id === id);
          if (!agent) return null;
          const types = DECISION_TYPES[id] ?? ["suggestion"];
          const decisionType = types[Math.floor(Math.random() * types.length)];
          return `- Agent "${agent.id}" (${agent.name}): ${agent.focus} → type de décision: "${decisionType}"`;
        })
        .filter(Boolean)
        .join("\n");

      const prompt = `
Analyse ce lead TaxiAssur avec les agents IA suivants et génère une décision par agent:

${leadContext}

Agents à exécuter:
${agentDescriptions}

Génère une décision par agent en JSON avec ce schéma exact:
{
  "decisions": [
    {
      "agent": "id_de_l_agent",
      "decision_type": "type_selon_agent",
      "title": "Titre court et percutant (max 60 chars)",
      "description": "Situation et opportunité concrète (2-3 phrases)",
      "rationale": "Raisonnement analytique avec données du secteur taxi (3-4 phrases)",
      "confidence_score": 0.XX,
      "suggested_action": "Action immédiate en 1 phrase",
      "data_sources": ["crm_leads", "crm_interactions"]
    }
  ],
  "lead_assessment": {
    "ai_lead_score": 0-100,
    "ai_conversion_probability": 0.00-1.00,
    "ai_risk_level": "LOW|MEDIUM|HIGH"
  }
}
`.trim();

      try {
        const raw = await callOpenAI(prompt);
        const parsed = JSON.parse(raw);

        if (Array.isArray(parsed.decisions)) {
          for (const d of parsed.decisions) {
            const agentId = d.agent;
            if (!agentsToRun.includes(agentId)) continue;
            const types = DECISION_TYPES[agentId] ?? ["suggestion"];
            const validType = types.includes(d.decision_type) ? d.decision_type : types[0];

            allDecisions.push({
              lead_id: lead.id,
              agent: agentId,
              decision_type: validType,
              title: String(d.title ?? `Analyse ${agentId}`).slice(0, 255),
              description: String(d.description ?? ""),
              rationale: String(d.rationale ?? ""),
              confidence_score: Math.min(0.99, Math.max(0.5, parseFloat(d.confidence_score) || 0.8)),
              suggested_action: String(d.suggested_action ?? ""),
              data_sources: Array.isArray(d.data_sources) ? d.data_sources : ["crm_leads"],
              status: "pending",
            });
          }
        }

        if (parsed.lead_assessment) {
          const la = parsed.lead_assessment;
          leadUpdates.push({
            id: lead.id,
            ai_lead_score: typeof la.ai_lead_score === "number" ? Math.min(100, Math.max(0, Math.round(la.ai_lead_score))) : undefined,
            ai_conversion_probability: typeof la.ai_conversion_probability === "number"
              ? Math.min(1, Math.max(0, parseFloat(la.ai_conversion_probability)))
              : undefined,
            ai_risk_level: ["LOW", "MEDIUM", "HIGH"].includes(la.ai_risk_level) ? la.ai_risk_level : undefined,
          });
        }
      } catch (e) {
        console.error(`Lead ${lead.id} AI analysis failed:`, e);
      }
    }

    let inserted = 0;
    if (allDecisions.length > 0) {
      const { error: insertErr } = await supabase.from("crm_ai_decisions").insert(allDecisions);
      if (insertErr) throw insertErr;
      inserted = allDecisions.length;
    }

    for (const update of leadUpdates) {
      const { id, ...fields } = update;
      const fieldsToUpdate = Object.fromEntries(
        Object.entries(fields).filter(([, v]) => v !== undefined)
      );
      if (Object.keys(fieldsToUpdate).length > 0) {
        await supabase.from("crm_leads").update(fieldsToUpdate).eq("id", id);
      }
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
