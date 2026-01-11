import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface LeadData {
  id?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  city?: string;
  vehicle_type?: string;
  message?: string;
  source?: string;
  status?: string;
  score?: number;
  created_at?: string;
}

interface ConversionRequest {
  action: "analyze" | "score" | "generate_email" | "plan_followup" | "handle_objection" | "recommend_action" | "reactivate_cold_leads";
  lead_data?: LeadData;
  lead_id?: string;
  objection?: string;
  context?: any;
}

const CONVERSION_SYSTEM_PROMPT = `Tu es l'agent de conversion expert de TaxiAssur. Ta mission est de maximiser la conversion des leads en clients.

REGLES IMPORTANTES:
1. Toujours personnaliser les reponses avec le prenom du lead
2. Mettre en avant les 35% d'economies moyennes
3. Rassurer sur le professionnalisme (ORIAS, 15 assureurs partenaires)
4. Proposer des actions concretes avec des delais precis
5. Identifier les signaux d'achat et les objections

SCORING DES LEADS (0-100):
- Informations completes (nom, email, tel): +30 points
- Ville renseignee: +10 points
- Type de vehicule precise: +15 points
- Message detaille (>50 chars): +15 points
- Source Google/SEO: +15 points
- Mention "urgent": +15 points

PRIORITES D'ACTION:
- Score > 80: Rappel immediat + email personnalise
- Score 60-80: Email de bienvenue + rappel J+1
- Score 40-60: Sequence email automatique
- Score < 40: Nurturing long terme`;

async function callOpenAI(prompt: string, systemPrompt: string = CONVERSION_SYSTEM_PROMPT) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 1500,
    }),
  });
  
  const data = await response.json();
  return {
    content: data.choices[0].message.content,
    usage: data.usage,
  };
}

function calculateLeadScore(lead: LeadData): number {
  let score = 0;
  
  if (lead.name || (lead.first_name && lead.last_name)) score += 10;
  if (lead.email) score += 10;
  if (lead.phone) score += 10;
  if (lead.city) score += 10;
  if (lead.vehicle_type) score += 15;
  if (lead.message && lead.message.length > 50) score += 15;
  else if (lead.message && lead.message.length > 0) score += 5;
  
  if (lead.source === "google" || lead.source === "seo") score += 15;
  else if (lead.source === "referral") score += 20;
  else score += 5;
  
  if (lead.message?.toLowerCase().includes("urgent")) score += 15;
  if (lead.message?.toLowerCase().includes("devis")) score += 10;
  if (lead.message?.toLowerCase().includes("comparatif")) score += 5;
  
  return Math.min(100, score);
}

function getScoreCategory(score: number): string {
  if (score >= 80) return "hot";
  if (score >= 60) return "warm";
  if (score >= 40) return "cool";
  return "cold";
}

async function analyzeLead(supabase: any, lead: LeadData) {
  const score = calculateLeadScore(lead);
  const category = getScoreCategory(score);
  
  const analysisPrompt = `Analyse ce lead TaxiAssur et fournis des recommandations:

Lead:
- Nom: ${lead.name || lead.first_name || "Non renseigne"}
- Email: ${lead.email || "Non renseigne"}
- Telephone: ${lead.phone || "Non renseigne"}
- Ville: ${lead.city || "Non renseigne"}
- Type vehicule: ${lead.vehicle_type || "Non renseigne"}
- Message: ${lead.message || "Aucun message"}
- Source: ${lead.source || "Inconnue"}
- Score calcule: ${score}/100 (${category})

Fournis une analyse JSON avec:
{
  "profil_resume": "description courte du lead",
  "points_forts": ["liste des points positifs"],
  "points_attention": ["liste des points a surveiller"],
  "probabilite_conversion": "pourcentage estime",
  "delai_decision_estime": "estimation du delai",
  "actions_recommandees": [
    {"action": "description", "priorite": 1-5, "delai": "immediat/J+1/J+3"}
  ],
  "ton_communication": "formel/decontracte/technique",
  "arguments_cles": ["arguments a utiliser"]
}`;

  const response = await callOpenAI(analysisPrompt);
  
  let analysis;
  try {
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: response.content };
  } catch {
    analysis = { raw: response.content };
  }
  
  return {
    score,
    category,
    analysis,
    tokens_used: response.usage?.total_tokens || 0,
  };
}

async function generateEmail(supabase: any, lead: LeadData, emailType: string = "welcome") {
  const score = calculateLeadScore(lead);
  const firstName = lead.first_name || lead.name?.split(" ")[0] || "Cher client";
  
  const emailPrompts: Record<string, string> = {
    welcome: `Redige un email de bienvenue pour ${firstName} qui vient de demander un devis assurance taxi.
Ville: ${lead.city || "France"}
Score: ${score}/100

L'email doit:
- Etre chaleureux et professionnel
- Mentionner les 35% d'economies
- Proposer un rappel telephonique
- Maximum 150 mots
- Inclure un CTA clair`,
    
    followup: `Redige un email de relance pour ${firstName} qui n'a pas repondu depuis 2 jours.
Ville: ${lead.city || "France"}

L'email doit:
- Rappeler sa demande initiale
- Creer un sentiment d'urgence leger
- Proposer une alternative (email ou tel)
- Maximum 100 mots`,
    
    reactivation: `Redige un email de reactivation pour ${firstName}, lead inactif depuis 7+ jours.

L'email doit:
- Ne pas etre culpabilisant
- Offrir quelque chose de nouveau (actualite, promo)
- Demander si les besoins ont change
- Maximum 120 mots`,
  };
  
  const prompt = emailPrompts[emailType] || emailPrompts.welcome;
  const response = await callOpenAI(prompt);
  
  return {
    email_type: emailType,
    subject: extractSubject(response.content),
    body: cleanEmailBody(response.content),
    recipient: lead.email,
    tokens_used: response.usage?.total_tokens || 0,
  };
}

function extractSubject(content: string): string {
  const subjectMatch = content.match(/Objet:\s*(.+?)\n/i) || 
                       content.match(/Subject:\s*(.+?)\n/i);
  return subjectMatch ? subjectMatch[1].trim() : "Votre devis assurance taxi TaxiAssur";
}

function cleanEmailBody(content: string): string {
  return content
    .replace(/Objet:.+?\n/i, "")
    .replace(/Subject:.+?\n/i, "")
    .trim();
}

async function handleObjection(objection: string, lead: LeadData) {
  const prompt = `Un lead (${lead.name || "client potentiel"}) presente cette objection:
"${objection}"

Contexte: Lead taxi a ${lead.city || "France"}, score ${calculateLeadScore(lead)}/100

Fournis une reponse structuree:
1. Reformulation empathique de l'objection
2. Reponse factuelle
3. Argument de valeur TaxiAssur
4. Question de relance pour continuer la conversation`;

  const response = await callOpenAI(prompt);
  
  return {
    objection_received: objection,
    response: response.content,
    tokens_used: response.usage?.total_tokens || 0,
  };
}

async function planFollowup(supabase: any, lead: LeadData) {
  const score = calculateLeadScore(lead);
  const category = getScoreCategory(score);
  
  const followupPlans: Record<string, any[]> = {
    hot: [
      { action: "call", delay_hours: 0.25, message: "Rappel immediat" },
      { action: "email", delay_hours: 1, type: "welcome" },
      { action: "sms", delay_hours: 24, message: "Rappel devis" },
    ],
    warm: [
      { action: "email", delay_hours: 1, type: "welcome" },
      { action: "call", delay_hours: 24, message: "Premier appel" },
      { action: "email", delay_hours: 72, type: "followup" },
    ],
    cool: [
      { action: "email", delay_hours: 1, type: "welcome" },
      { action: "email", delay_hours: 48, type: "followup" },
      { action: "email", delay_hours: 168, type: "reactivation" },
    ],
    cold: [
      { action: "email", delay_hours: 24, type: "welcome" },
      { action: "email", delay_hours: 168, type: "reactivation" },
    ],
  };
  
  const plan = followupPlans[category];
  
  if (lead.id) {
    for (const step of plan) {
      await supabase.from("llm_agent_tasks").insert({
        agent_id: await getConversionAgentId(supabase),
        task_type: `followup_${step.action}`,
        input_data: {
          lead_id: lead.id,
          lead_email: lead.email,
          action_type: step.action,
          email_type: step.type,
          message: step.message,
        },
        scheduled_at: new Date(Date.now() + step.delay_hours * 3600000).toISOString(),
        status: "pending",
      });
    }
  }
  
  return {
    lead_score: score,
    lead_category: category,
    followup_plan: plan,
    tasks_created: plan.length,
  };
}

async function getConversionAgentId(supabase: any): Promise<string | null> {
  const { data } = await supabase
    .from("llm_agents")
    .select("id")
    .eq("slug", "conversion")
    .maybeSingle();
  return data?.id || null;
}

async function reactivateColdLeads(supabase: any) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600000).toISOString();
  
  const { data: coldLeads } = await supabase
    .from("leads")
    .select("*")
    .lt("created_at", sevenDaysAgo)
    .in("status", ["new", "contacted"])
    .limit(10);
  
  if (!coldLeads || coldLeads.length === 0) {
    return { message: "No cold leads to reactivate", count: 0 };
  }
  
  const reactivations = [];
  for (const lead of coldLeads) {
    const email = await generateEmail(supabase, lead, "reactivation");
    reactivations.push({
      lead_id: lead.id,
      email_generated: email.subject,
    });
  }
  
  return {
    cold_leads_found: coldLeads.length,
    reactivations_planned: reactivations,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const request: ConversionRequest = await req.json();
    
    let result;
    
    switch (request.action) {
      case "analyze": {
        if (!request.lead_data) {
          return new Response(
            JSON.stringify({ success: false, error: "lead_data required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        result = await analyzeLead(supabase, request.lead_data);
        break;
      }
      
      case "score": {
        if (!request.lead_data) {
          return new Response(
            JSON.stringify({ success: false, error: "lead_data required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const score = calculateLeadScore(request.lead_data);
        result = {
          score,
          category: getScoreCategory(score),
          breakdown: {
            has_contact: !!(request.lead_data.email || request.lead_data.phone),
            has_details: !!(request.lead_data.city || request.lead_data.vehicle_type),
            has_message: !!request.lead_data.message,
          },
        };
        break;
      }
      
      case "generate_email": {
        if (!request.lead_data) {
          return new Response(
            JSON.stringify({ success: false, error: "lead_data required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const emailType = request.context?.email_type || "welcome";
        result = await generateEmail(supabase, request.lead_data, emailType);
        break;
      }
      
      case "plan_followup": {
        if (!request.lead_data) {
          return new Response(
            JSON.stringify({ success: false, error: "lead_data required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        result = await planFollowup(supabase, request.lead_data);
        break;
      }
      
      case "handle_objection": {
        if (!request.objection) {
          return new Response(
            JSON.stringify({ success: false, error: "objection required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        result = await handleObjection(request.objection, request.lead_data || {});
        break;
      }
      
      case "recommend_action": {
        if (!request.lead_data) {
          return new Response(
            JSON.stringify({ success: false, error: "lead_data required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const analysis = await analyzeLead(supabase, request.lead_data);
        result = {
          score: analysis.score,
          category: analysis.category,
          recommended_actions: analysis.analysis.actions_recommandees || [],
          priority: analysis.score >= 70 ? "high" : analysis.score >= 40 ? "medium" : "low",
        };
        break;
      }
      
      case "reactivate_cold_leads": {
        result = await reactivateColdLeads(supabase);
        break;
      }
      
      default:
        return new Response(
          JSON.stringify({ success: false, error: `Unknown action: ${request.action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
    
    const agentId = await getConversionAgentId(supabase);
    if (agentId && result.tokens_used) {
      await supabase.rpc("update_llm_agent_stats", {
        p_agent_id: agentId,
        p_tokens_used: result.tokens_used,
        p_response_time_ms: 0,
        p_success: true,
      });
    }
    
    return new Response(
      JSON.stringify({ success: true, agent: "conversion", ...result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error("Conversion Agent error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
