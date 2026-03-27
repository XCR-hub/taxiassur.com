import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const PROVIDER_KEYS: Record<string, string> = {
  openai: Deno.env.get("OPENAI_API_KEY") ?? Deno.env.get("OpenAI_API_KEY") ?? "",
  anthropic: Deno.env.get("ANTHROPIC_API_KEY") ?? "",
  gemini: Deno.env.get("GEMINI_API_KEY") ?? "",
  huggingface: Deno.env.get("HUGGINGFACE_API_KEY") ?? "",
  openrouter: Deno.env.get("OPENROUTER_API_KEY") ?? "",
};

type ProviderID = "openai" | "anthropic" | "gemini" | "huggingface" | "openrouter";

interface ProviderConfig {
  id: ProviderID;
  model: string;
  label: string;
}

interface AgentConfig {
  id: string;
  name: string;
  focus: string;
  provider: ProviderConfig;
  fallbacks: ProviderConfig[];
}

const OPENAI_GPT4O: ProviderConfig = { id: "openai", model: "gpt-4o", label: "GPT-4o" };
const OPENAI_GPT4O_MINI: ProviderConfig = { id: "openai", model: "gpt-4o-mini", label: "GPT-4o Mini" };
const ANTHROPIC_SONNET: ProviderConfig = { id: "anthropic", model: "claude-sonnet-4-20250514", label: "Claude Sonnet" };
const ANTHROPIC_HAIKU: ProviderConfig = { id: "anthropic", model: "claude-3-5-haiku-20241022", label: "Claude Haiku" };
const GEMINI_PRO: ProviderConfig = { id: "gemini", model: "gemini-2.0-flash", label: "Gemini 2.0 Flash" };
const GEMINI_FLASH: ProviderConfig = { id: "gemini", model: "gemini-1.5-flash", label: "Gemini 1.5 Flash" };
const HF_MISTRAL: ProviderConfig = { id: "huggingface", model: "mistralai/Mistral-7B-Instruct-v0.3", label: "Mistral 7B" };

const AGENTS: AgentConfig[] = [
  {
    id: "lead_scorer",
    name: "Lead Scorer",
    focus: "score de qualification et potentiel de conversion",
    provider: ANTHROPIC_SONNET,
    fallbacks: [OPENAI_GPT4O, GEMINI_PRO],
  },
  {
    id: "email_composer",
    name: "Email Composer",
    focus: "moment et contenu optimal pour le prochain email",
    provider: OPENAI_GPT4O,
    fallbacks: [ANTHROPIC_SONNET, GEMINI_PRO],
  },
  {
    id: "negotiation_assistant",
    name: "Negotiation Assistant",
    focus: "strategie de negociation tarifaire",
    provider: ANTHROPIC_SONNET,
    fallbacks: [OPENAI_GPT4O, GEMINI_PRO],
  },
  {
    id: "risk_analyzer",
    name: "Risk Analyzer",
    focus: "risques de souscription et profil sinistralite taxi",
    provider: GEMINI_PRO,
    fallbacks: [ANTHROPIC_SONNET, OPENAI_GPT4O],
  },
  {
    id: "churn_predictor",
    name: "Churn Predictor",
    focus: "risque de perte et signaux d'attrition",
    provider: GEMINI_FLASH,
    fallbacks: [OPENAI_GPT4O_MINI, ANTHROPIC_HAIKU],
  },
  {
    id: "cross_sell_recommender",
    name: "Cross-Sell Recommender",
    focus: "RC Pro, garanties additionnelles, assurance flotte",
    provider: OPENAI_GPT4O_MINI,
    fallbacks: [GEMINI_FLASH, ANTHROPIC_HAIKU],
  },
  {
    id: "sentiment_analyzer",
    name: "Sentiment Analyzer",
    focus: "satisfaction percue et ton des echanges",
    provider: HF_MISTRAL,
    fallbacks: [GEMINI_FLASH, OPENAI_GPT4O_MINI],
  },
  {
    id: "response_generator",
    name: "Response Generator",
    focus: "contenu ideal de la prochaine reponse commerciale",
    provider: ANTHROPIC_HAIKU,
    fallbacks: [OPENAI_GPT4O_MINI, GEMINI_FLASH],
  },
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

const SYSTEM_PROMPT = `Tu es un moteur de decision IA multi-agents pour TaxiAssur, courtier en assurance taxi en France.
Tu analyses des leads (prospects chauffeurs de taxi) et generes des decisions actionnables pour les commerciaux.
Reponds UNIQUEMENT en JSON valide selon le schema demande. Sois precis, concret et utile.
Contexte metier: assurance taxi (RC, tous risques, conducteur designe), marche francais, leads B2B et B2C.`;

async function callOpenAI(prompt: string, model: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${PROVIDER_KEYS.openai}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      max_tokens: 2000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`OpenAI ${model} error ${res.status}: ${errBody.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.choices[0].message.content;
}

async function callAnthropic(prompt: string, model: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": PROVIDER_KEYS.anthropic,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2000,
      temperature: 0.4,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt + "\n\nReponds UNIQUEMENT en JSON valide." }],
    }),
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Anthropic ${model} error ${res.status}: ${errBody.slice(0, 200)}`);
  }
  const data = await res.json();
  const text = data.content?.[0]?.text ?? "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Anthropic: no JSON found in response");
  return jsonMatch[0];
}

async function callGemini(prompt: string, model: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${PROVIDER_KEYS.gemini}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: `${SYSTEM_PROMPT}\n\n${prompt}\n\nReponds UNIQUEMENT en JSON valide, sans markdown, sans backticks.` },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 2000,
        responseMimeType: "application/json",
      },
    }),
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Gemini ${model} error ${res.status}: ${errBody.slice(0, 200)}`);
  }
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Gemini: no JSON found in response");
  return jsonMatch[0];
}

async function callHuggingFace(prompt: string, model: string): Promise<string> {
  const res = await fetch(`https://api-inference.huggingface.co/models/${model}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${PROVIDER_KEYS.huggingface}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      max_tokens: 2000,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt + "\n\nReponds UNIQUEMENT en JSON valide, sans texte avant ni apres." },
      ],
    }),
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`HuggingFace ${model} error ${res.status}: ${errBody.slice(0, 200)}`);
  }
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("HuggingFace: no JSON found in response");
  return jsonMatch[0];
}

async function callProvider(provider: ProviderConfig, prompt: string): Promise<string> {
  if (!PROVIDER_KEYS[provider.id]) {
    throw new Error(`No API key for provider ${provider.id}`);
  }

  switch (provider.id) {
    case "openai":
      return callOpenAI(prompt, provider.model);
    case "anthropic":
      return callAnthropic(prompt, provider.model);
    case "gemini":
      return callGemini(prompt, provider.model);
    case "huggingface":
      return callHuggingFace(prompt, provider.model);
    default:
      throw new Error(`Unknown provider: ${provider.id}`);
  }
}

async function callWithFallback(
  agent: AgentConfig,
  prompt: string
): Promise<{ content: string; provider: ProviderConfig }> {
  const providers = [agent.provider, ...agent.fallbacks];

  for (const provider of providers) {
    try {
      const content = await callProvider(provider, prompt);
      return { content, provider };
    } catch (err) {
      console.warn(`[${agent.id}] ${provider.label} failed: ${err}. Trying next provider...`);
    }
  }

  throw new Error(`All providers failed for agent ${agent.id}`);
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
        JSON.stringify({ success: true, generated: 0, leads_analyzed: 0, message: "Aucun lead trouve" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: existingDecisions } = await supabase
      .from("crm_ai_decisions")
      .select("lead_id, agent, created_at")
      .in(
        "lead_id",
        leads.map((l: { id: string }) => l.id)
      )
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const recentMap = new Set<string>(
      (existingDecisions ?? []).map((d: { lead_id: string; agent: string }) => `${d.lead_id}::${d.agent}`)
    );

    const allDecisions: Record<string, unknown>[] = [];
    const leadUpdates: Array<{
      id: string;
      ai_lead_score?: number;
      ai_conversion_probability?: number;
      ai_risk_level?: string;
    }> = [];
    const providerStats: Record<string, number> = {};

    for (const lead of leads) {
      const pendingAgentIds = agentsToRun.filter((agentId) => !recentMap.has(`${lead.id}::${agentId}`));
      if (pendingAgentIds.length === 0) continue;

      const leadAge = Math.floor((Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24));
      const daysSinceContact = lead.last_contact_at
        ? Math.floor((Date.now() - new Date(lead.last_contact_at).getTime()) / (1000 * 60 * 60 * 24))
        : null;

      const leadContext = `
Lead: ${lead.first_name ?? ""} ${lead.last_name ?? ""} (${lead.email ?? "email inconnu"})
Telephone: ${lead.phone ?? "non renseigne"}
Ville: ${lead.city ?? "France"}
Statut pipeline: ${lead.pipeline_stage ?? lead.status ?? "nouveau_lead"}
Score lead: ${lead.lead_score ?? "non calcule"}/100
Score qualite: ${lead.quality_score ?? "non calcule"}/100
Temperature: ${lead.temperature ?? "COLD"}
Source acquisition: ${lead.source ?? "inconnue"}
Immatriculation: ${lead.immatriculation ?? "non renseignee"}
Montant devis: ${lead.quote_amount ? `${lead.quote_amount}EUR` : "non calcule"}
Cree il y a: ${leadAge} jours
Dernier contact: ${daysSinceContact !== null ? `il y a ${daysSinceContact} jours` : "jamais"}
Nombre d'emails echanges: ${lead.email_count ?? 0}
Contact etabli: ${lead.contact_established ? "oui" : "non"}
Documents complets: ${lead.documents_complete ? "oui" : "non"}
Fichiers uploades: ${lead.total_uploaded_files ?? 0} (${lead.validated_files ?? 0} valides)
Documents complementaires en attente: ${lead.documents_complementaires_pending ?? 0}
Necessite suivi: ${lead.needs_followup ? "oui" : "non"}
Intervention humaine requise: ${lead.needs_human_intervention ? "oui" : "non"}
Notes internes: ${lead.internal_notes ?? "aucune"}
`.trim();

      const pendingAgents = pendingAgentIds
        .map((id) => AGENTS.find((a) => a.id === id))
        .filter((a): a is AgentConfig => a !== undefined);

      const agentDescriptions = pendingAgents
        .map((agent) => {
          const types = DECISION_TYPES[agent.id] ?? ["suggestion"];
          const decisionType = types[Math.floor(Math.random() * types.length)];
          return `- Agent "${agent.id}" (${agent.name}): ${agent.focus} -> type de decision: "${decisionType}"`;
        })
        .join("\n");

      const prompt = `
Analyse ce lead TaxiAssur avec les agents IA suivants et genere une decision par agent:

${leadContext}

Agents a executer:
${agentDescriptions}

Genere une decision par agent en JSON avec ce schema exact:
{
  "decisions": [
    {
      "agent": "id_de_l_agent",
      "decision_type": "type_selon_agent",
      "title": "Titre court et percutant (max 60 chars)",
      "description": "Situation et opportunite concrete (2-3 phrases)",
      "rationale": "Raisonnement analytique avec donnees du secteur taxi (3-4 phrases)",
      "confidence_score": 0.XX,
      "suggested_action": "Action immediate en 1 phrase",
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

      const agentResults = await Promise.allSettled(
        pendingAgents.map(async (agent) => {
          const singleAgentPrompt = prompt.replace(
            `Agents a executer:\n${agentDescriptions}`,
            `Agent a executer:\n- Agent "${agent.id}" (${agent.name}): ${agent.focus} -> type de decision: "${(DECISION_TYPES[agent.id] ?? ["suggestion"])[0]}"`
          );

          const { content, provider } = await callWithFallback(agent, singleAgentPrompt);
          return { agent, content, provider };
        })
      );

      const leadScores: Array<{
        ai_lead_score?: number;
        ai_conversion_probability?: number;
        ai_risk_level?: string;
      }> = [];

      for (const result of agentResults) {
        if (result.status === "rejected") {
          console.error(`Agent failed:`, result.reason);
          continue;
        }

        const { agent, content, provider } = result.value;

        try {
          const parsed = JSON.parse(content);

          const decisions = Array.isArray(parsed.decisions) ? parsed.decisions : [parsed];

          for (const d of decisions) {
            const agentId = d.agent ?? agent.id;
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
              model_used: provider.label,
              model_provider: provider.id,
            });

            providerStats[provider.label] = (providerStats[provider.label] ?? 0) + 1;
          }

          if (parsed.lead_assessment) {
            const la = parsed.lead_assessment;
            leadScores.push({
              ai_lead_score:
                typeof la.ai_lead_score === "number"
                  ? Math.min(100, Math.max(0, Math.round(la.ai_lead_score)))
                  : undefined,
              ai_conversion_probability:
                typeof la.ai_conversion_probability === "number"
                  ? Math.min(1, Math.max(0, parseFloat(la.ai_conversion_probability)))
                  : undefined,
              ai_risk_level: ["LOW", "MEDIUM", "HIGH"].includes(la.ai_risk_level) ? la.ai_risk_level : undefined,
            });
          }
        } catch (parseErr) {
          console.error(`[${agent.id}] JSON parse error from ${provider.label}:`, parseErr);
        }
      }

      if (leadScores.length > 0) {
        const scores = leadScores.filter((s) => s.ai_lead_score !== undefined);
        const probs = leadScores.filter((s) => s.ai_conversion_probability !== undefined);
        const risks = leadScores.filter((s) => s.ai_risk_level !== undefined);

        const avgScore =
          scores.length > 0
            ? Math.round(scores.reduce((s, v) => s + (v.ai_lead_score ?? 0), 0) / scores.length)
            : undefined;

        const avgProb =
          probs.length > 0
            ? parseFloat(
                (probs.reduce((s, v) => s + (v.ai_conversion_probability ?? 0), 0) / probs.length).toFixed(2)
              )
            : undefined;

        const riskVotes: Record<string, number> = {};
        risks.forEach((r) => {
          if (r.ai_risk_level) riskVotes[r.ai_risk_level] = (riskVotes[r.ai_risk_level] ?? 0) + 1;
        });
        const consensusRisk = Object.entries(riskVotes).sort((a, b) => b[1] - a[1])[0]?.[0];

        leadUpdates.push({
          id: lead.id,
          ai_lead_score: avgScore,
          ai_conversion_probability: avgProb,
          ai_risk_level: consensusRisk,
        });
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
      const fieldsToUpdate = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));
      if (Object.keys(fieldsToUpdate).length > 0) {
        await supabase.from("crm_leads").update(fieldsToUpdate).eq("id", id);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        generated: inserted,
        leads_analyzed: leads.length,
        providers_used: providerStats,
        message: `${inserted} decisions generees pour ${leads.length} leads via ${Object.keys(providerStats).length} modeles IA`,
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
