import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiKey = Deno.env.get("OPENAI_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { lead_id, force_agent } = await req.json();

    const { data: lead } = await supabase.from('leads').select('*').eq('id', lead_id).single();
    if (!lead) throw new Error('Lead not found');

    const { data: agents } = await supabase.from('ai_agents').select('*').eq('is_active', true);
    if (!agents || agents.length === 0) throw new Error('No active agents found');

    const context = await getLeadContext(supabase, lead_id, lead);
    const agentDecisions = [];

    for (const agent of agents) {
      if (force_agent && agent.agent_type !== force_agent) continue;
      const decision = await evaluateWithAgent(agent, lead, context, openaiKey);
      agentDecisions.push(decision);
    }

    const finalDecision = await decisionalAI(agentDecisions, lead, context, openaiKey);

    for (const decision of agentDecisions) {
      await supabase.from('ai_decisions').insert({
        agent_id: decision.agent_id,
        lead_id: lead_id,
        decision_type: decision.decision_type,
        action_taken: decision.action_recommended,
        reasoning: decision.reasoning,
        confidence_score: decision.confidence,
        alternative_actions: decision.alternatives,
        context_data: context,
        outcome: 'pending'
      });
    }

    const { data: finalDecisionRecord } = await supabase.from('ai_decisions').insert({
      agent_id: finalDecision.agent_id,
      lead_id: lead_id,
      decision_type: 'final_decision',
      action_taken: finalDecision.action,
      reasoning: finalDecision.reasoning,
      confidence_score: finalDecision.confidence,
      alternative_actions: agentDecisions.map(d => ({ agent: d.agent_name, action: d.action_recommended, confidence: d.confidence })),
      context_data: context,
      outcome: 'pending'
    }).select().single();

    if (finalDecision.confidence > 80 && finalDecision.auto_execute) {
      await executeAction(supabase, lead_id, finalDecision.action, context);
    }

    return new Response(JSON.stringify({
      success: true,
      lead_id,
      agent_decisions: agentDecisions,
      final_decision: finalDecision,
      decision_id: finalDecisionRecord?.id,
      executed: finalDecision.confidence > 80 && finalDecision.auto_execute
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
  } catch (error) {
    console.error("Error in AI Decision Engine:", error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

async function getLeadContext(supabase: any, leadId: string, lead: any) {
  const now = Date.now();
  const createdAt = new Date(lead.created_at).getTime();
  const { data: interactions } = await supabase.from('crm_interactions').select('*').eq('lead_id', leadId).order('created_at', { ascending: false });
  const { data: documents } = await supabase.from('lead_documents').select('*').eq('lead_id', leadId);
  const daysSinceCreated = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));
  const hoursSinceCreated = Math.floor((now - createdAt) / (1000 * 60 * 60));
  return { lead, daysSinceCreated, hoursSinceCreated, interactions: interactions || [], documents: documents || [], emailsSent: (interactions || []).filter((i: any) => i.type === 'email' && i.direction === 'outbound').length, emailsOpened: (interactions || []).filter((i: any) => i.type === 'email' && i.opened_at).length, smsSent: (interactions || []).filter((i: any) => i.type === 'sms').length, calls: (interactions || []).filter((i: any) => i.type === 'call').length, hasDocuments: (documents || []).length > 0, documentsComplete: checkDocumentsComplete(documents || []) };
}

function checkDocumentsComplete(documents: any[]) {
  const required = ['carte_grise', 'permis_conduire', 'justificatif_domicile'];
  return required.every(type => documents.some(doc => doc.document_type === type));
}

async function evaluateWithAgent(agent: any, lead: any, context: any, openaiKey?: string) {
  const agentEvaluations: any = { commercial: evaluateCommercial, retention: evaluateRetention, quality: evaluateQuality, voice: evaluateVoice, cross_sell: evaluateCrossSell };
  const evaluator = agentEvaluations[agent.agent_type] || evaluateGeneric;
  const decision = await evaluator(lead, context, agent.config);
  decision.agent_id = agent.id;
  decision.agent_name = agent.agent_name;
  decision.agent_type = agent.agent_type;
  return decision;
}

function evaluateCommercial(lead: any, context: any, config: any) {
  const decisions = [];
  if (context.hoursSinceCreated < 2 && context.emailsSent === 0) decisions.push({ action: 'send_immediate_email', confidence: 95, reasoning: 'Lead ultra-chaud créé il y a moins de 2h.' });
  if (context.emailsOpened > 0 && context.calls === 0 && context.daysSinceCreated < 3) decisions.push({ action: 'make_phone_call', confidence: 90, reasoning: 'Lead a ouvert l\'email, appel = +45% conversion.' });
  if (context.emailsSent > 0 && context.daysSinceCreated > 3 && context.emailsOpened === 0) decisions.push({ action: 'send_sms', confidence: 75, reasoning: 'Email non ouvert. SMS pour réengager.' });
  if (context.hasDocuments && lead.status !== 'devis_envoyé') decisions.push({ action: 'send_quote', confidence: 92, reasoning: 'Documents reçus = +85% conversion.' });
  const topAction = decisions.reduce((max, d) => d.confidence > max.confidence ? d : max, { confidence: 0 });
  return { decision_type: 'commercial_optimization', action_recommended: topAction.action || 'wait', confidence: topAction.confidence || 30, reasoning: topAction.reasoning || 'Pas d\'action prioritaire', alternatives: decisions.slice(0, 3) };
}

function evaluateRetention(lead: any, context: any, config: any) {
  const churnRisk = calculateChurnRisk(lead, context);
  if (churnRisk > 70 && lead.status === 'client') return { decision_type: 'churn_prevention', action_recommended: 'loyalty_offer', confidence: 88, reasoning: `Risque résiliation ${churnRisk}%. Offre urgente.`, alternatives: [{ action: 'personal_call', confidence: 85 }] };
  if (lead.status === 'client' && context.daysSinceCreated > 180) return { decision_type: 'retention_check', action_recommended: 'satisfaction_survey', confidence: 60, reasoning: 'Client 6+ mois. Vérifier satisfaction.', alternatives: [] };
  return { decision_type: 'retention_monitoring', action_recommended: 'monitor', confidence: 40, reasoning: 'Aucun risque détecté.', alternatives: [] };
}

function evaluateQuality(lead: any, context: any, config: any) {
  if (!context.documentsComplete && lead.status === 'qualifié') return { decision_type: 'quality_check', action_recommended: 'request_missing_documents', confidence: 95, reasoning: 'Documents incomplets.', alternatives: [{ action: 'voice_call_reminder', confidence: 85 }] };
  return { decision_type: 'quality_ok', action_recommended: 'none', confidence: 30, reasoning: 'Conformité OK', alternatives: [] };
}

function evaluateVoice(lead: any, context: any, config: any) {
  if (context.calls === 0 && context.emailsSent > 2 && context.daysSinceCreated > 2) return { decision_type: 'voice_contact', action_recommended: 'ai_voice_call', confidence: 80, reasoning: '3+ emails sans réponse.', alternatives: [{ action: 'human_call', confidence: 85 }] };
  return { decision_type: 'voice_not_needed', action_recommended: 'none', confidence: 20, reasoning: 'Appel pas nécessaire', alternatives: [] };
}

function evaluateCrossSell(lead: any, context: any, config: any) {
  if (lead.status === 'client' && context.daysSinceCreated > 180) return { decision_type: 'cross_sell_opportunity', action_recommended: 'propose_additional_products', confidence: 70, reasoning: 'Client fidèle 6+ mois. Opportunité Protection Juridique.', alternatives: [{ action: 'propose_health_insurance', confidence: 65 }] };
  return { decision_type: 'cross_sell_not_ready', action_recommended: 'wait', confidence: 30, reasoning: 'Trop tôt pour cross-sell', alternatives: [] };
}

function evaluateGeneric(lead: any, context: any, config: any) {
  return { decision_type: 'generic', action_recommended: 'none', confidence: 20, reasoning: 'Aucune action spécifique', alternatives: [] };
}

function calculateChurnRisk(lead: any, context: any): number {
  let risk = 0;
  if (context.daysSinceCreated > 365) risk += 30;
  if (context.interactions.length === 0 && context.daysSinceCreated > 90) risk += 40;
  if (lead.lead_score && lead.lead_score < 30) risk += 30;
  return Math.min(risk, 100);
}

async function decisionalAI(agentDecisions: any[], lead: any, context: any, openaiKey?: string) {
  const sortedByConfidence = agentDecisions.sort((a, b) => b.confidence - a.confidence);
  const topDecision = sortedByConfidence[0];
  if (topDecision.confidence > 85) return { agent_id: topDecision.agent_id, action: topDecision.action_recommended, confidence: topDecision.confidence, reasoning: `Consensus fort : ${topDecision.reasoning}`, auto_execute: true };
  const highConfidenceDecisions = sortedByConfidence.filter(d => d.confidence > 70);
  if (highConfidenceDecisions.length > 1) return { agent_id: sortedByConfidence[0].agent_id, action: highConfidenceDecisions[0].action_recommended, confidence: 75, reasoning: `Priorité : ${highConfidenceDecisions[0].reasoning}`, auto_execute: false };
  return { agent_id: topDecision.agent_id, action: topDecision.action_recommended, confidence: topDecision.confidence, reasoning: topDecision.reasoning, auto_execute: false };
}

async function executeAction(supabase: any, leadId: string, action: string, context: any) {
  console.log(`Executing action: ${action} for lead ${leadId}`);
  const actionMap: any = { 'send_immediate_email': 'send_email', 'make_phone_call': 'call', 'send_sms': 'send_sms', 'send_quote': 'send_quote', 'request_missing_documents': 'request_documents', 'loyalty_offer': 'send_loyalty_offer' };
  const mappedAction = actionMap[action] || action;
  try {
    await supabase.functions.invoke('ia-auto-executor', { body: { action: mappedAction, lead_id: leadId, context: context } });
  } catch (error) {
    console.error(`Failed to execute action ${action}:`, error);
  }
}