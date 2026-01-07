import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey" };

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { event_id, lead_id, event_type, context } = await req.json();

    console.log(`IA Council convened for event: ${event_type}`);

    const { data: agents } = await supabase.from('ai_agents').select('*').eq('is_active', true);
    if (!agents || agents.length === 0) throw new Error('No active agents');

    const fullContext = await getFullContext(supabase, lead_id, context);

    const votes = [];
    for (const agent of agents) {
      const vote = await agentVote(agent, event_type, fullContext);
      votes.push(vote);
      console.log(`${agent.agent_name}: ${vote.recommended_action} (${vote.confidence}%)`);
    }

    const finalDecision = deliberateCouncil(votes, fullContext);

    const { data: councilRecord } = await supabase.from('ia_council_decisions').insert({ event_id, lead_id, agents_votes: votes, final_decision: finalDecision, consensus_score: finalDecision.consensus_score, reasoning: finalDecision.reasoning }).select().single();

    if (finalDecision.actions && finalDecision.actions.length > 0) {
      for (const action of finalDecision.actions) {
        await supabase.from('crm_actions').insert({ event_id, action_type: action.type, channel: action.channel, lead_id, content: action.content, status: 'pending' });
      }
    }

    await supabase.from('crm_audit_log').insert({ entity_type: 'ia_council_decision', entity_id: councilRecord?.id, action: 'council_decision', actor_type: 'ai_council', reasoning: finalDecision.reasoning });

    return new Response(JSON.stringify({ success: true, council_decision: finalDecision, agents_votes: votes, consensus_score: finalDecision.consensus_score, decision_id: councilRecord?.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
  } catch (error) {
    console.error("Error in IA Council:", error);
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

async function getFullContext(supabase: any, leadId: string, providedContext: any) {
  const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).single();
  const { data: interactions } = await supabase.from('crm_interactions').select('*').eq('lead_id', leadId).order('created_at', { ascending: false }).limit(20);
  const { data: documents } = await supabase.from('lead_documents').select('*').eq('lead_id', leadId);
  const { data: recentDecisions } = await supabase.from('ia_council_decisions').select('*').eq('lead_id', leadId).order('created_at', { ascending: false }).limit(5);
  const { data: patterns } = await supabase.from('ia_learned_patterns').select('*').eq('is_active', true).gte('confidence_score', 70).order('success_rate', { ascending: false });
  return { ...providedContext, lead, interactions: interactions || [], documents: documents || [], recent_decisions: recentDecisions || [], learned_patterns: patterns || [] };
}

async function agentVote(agent: any, eventType: string, context: any) {
  const voteFunction = agentVoteFunctions[agent.agent_type] || defaultVote;
  const vote = await voteFunction(agent, eventType, context);
  return { agent_id: agent.id, agent_name: agent.agent_name, agent_type: agent.agent_type, ...vote };
}

const agentVoteFunctions: Record<string, Function> = { commercial: voteCommercial, retention: voteRetention, quality: voteQuality, voice: voteVoice, cross_sell: voteCrossSell, decisional: voteDecisional };

function voteCommercial(agent: any, eventType: string, context: any) {
  const lead = context.lead;
  const interactions = context.interactions;
  const emailsOpened = interactions.filter((i: any) => i.type === 'email' && i.opened_at).length;

  if (eventType === 'LEAD_CREATED') return { recommended_action: 'send_welcome_email', channel: 'email', confidence: 95, reasoning: 'Lead nouveau : email immédiat = +60% engagement', timing: 'immediate', priority: 10 };
  if (eventType === 'EMAIL_OPENED' && emailsOpened > 0) return { recommended_action: 'make_phone_call', channel: 'voice', confidence: 90, reasoning: 'Email ouvert = appel = +45% conversion', timing: 'within_2_hours', priority: 9 };
  if (eventType === 'NO_RESPONSE_48H') return { recommended_action: 'send_sms_reminder', channel: 'sms', confidence: 75, reasoning: 'Pas de réponse. SMS pour réengager', timing: 'immediate', priority: 7 };
  if (eventType === 'DOCUMENTS_RECEIVED') return { recommended_action: 'send_quote', channel: 'email', confidence: 92, reasoning: 'Documents = devis immédiat = +85% conversion', timing: 'immediate', priority: 10 };
  return { recommended_action: 'monitor', channel: 'none', confidence: 30, reasoning: 'Pas d\'action urgente', timing: 'none', priority: 1 };
}

function voteRetention(agent: any, eventType: string, context: any) {
  const lead = context.lead;
  const daysSinceCreated = Math.floor((Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24));

  if (eventType === 'CLIENT_INACTIVE_90D') return { recommended_action: 'send_loyalty_offer', channel: 'email', confidence: 88, reasoning: 'Client inactif 90j. Offre fidélité urgente', timing: 'immediate', priority: 9 };
  if (eventType === 'CHURN_RISK_DETECTED') return { recommended_action: 'personal_call_retention', channel: 'voice', confidence: 92, reasoning: 'Risque résiliation. Appel responsable', timing: 'within_24_hours', priority: 10 };
  if (lead.status === 'client' && daysSinceCreated > 180) return { recommended_action: 'satisfaction_survey', channel: 'email', confidence: 60, reasoning: 'Client 6+ mois. Mesurer satisfaction', timing: 'within_week', priority: 5 };
  return { recommended_action: 'monitor', channel: 'none', confidence: 20, reasoning: 'Pas de risque détecté', timing: 'none', priority: 1 };
}

function voteQuality(agent: any, eventType: string, context: any) {
  const documents = context.documents;
  const requiredDocs = ['carte_grise', 'permis_conduire', 'justificatif_domicile'];
  const missingDocs = requiredDocs.filter(doc => !documents.some((d: any) => d.document_type === doc));

  if (eventType === 'DOCUMENTS_MISSING' || missingDocs.length > 0) return { recommended_action: 'request_missing_documents', channel: 'email', confidence: 95, reasoning: `Documents manquants: ${missingDocs.join(', ')}`, timing: 'immediate', priority: 10, metadata: { missing_documents: missingDocs } };
  if (eventType === 'QUOTE_SENT' && missingDocs.length === 0) return { recommended_action: 'validate_compliance', channel: 'internal', confidence: 85, reasoning: 'Devis envoyé. Vérifier conformité', timing: 'immediate', priority: 8 };
  return { recommended_action: 'none', channel: 'none', confidence: 30, reasoning: 'Conformité OK', timing: 'none', priority: 1 };
}

function voteVoice(agent: any, eventType: string, context: any) {
  const interactions = context.interactions;
  const calls = interactions.filter((i: any) => i.type === 'call').length;
  const emailsSent = interactions.filter((i: any) => i.type === 'email' && i.direction === 'outbound').length;

  if (eventType === 'NO_RESPONSE_72H' && calls === 0 && emailsSent >= 3) return { recommended_action: 'ai_voice_call', channel: 'voice', confidence: 80, reasoning: '3+ emails sans réponse. Appel IA', timing: 'immediate', priority: 8 };
  if (eventType === 'QUOTE_NOT_SIGNED_7D') return { recommended_action: 'human_call_urgent', channel: 'voice', confidence: 92, reasoning: 'Devis non signé 7j. Appel urgent = +40% conversion', timing: 'immediate', priority: 10 };
  return { recommended_action: 'none', channel: 'none', confidence: 20, reasoning: 'Appel pas nécessaire', timing: 'none', priority: 1 };
}

function voteCrossSell(agent: any, eventType: string, context: any) {
  const lead = context.lead;
  const daysSinceCreated = Math.floor((Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24));

  if (eventType === 'CONTRACT_ANNIVERSARY' || (lead.status === 'client' && daysSinceCreated > 180)) return { recommended_action: 'propose_additional_products', channel: 'email', confidence: 70, reasoning: 'Client fidèle. Opportunité Protection Juridique + Santé', timing: 'within_week', priority: 6, metadata: { products: ['protection_juridique', 'sante', 'prevoyance'] } };
  return { recommended_action: 'none', channel: 'none', confidence: 20, reasoning: 'Trop tôt pour cross-sell', timing: 'none', priority: 1 };
}

function voteDecisional(agent: any, eventType: string, context: any) {
  return { recommended_action: 'analyze_all_votes', channel: 'internal', confidence: 100, reasoning: 'Vote de synthèse', timing: 'immediate', priority: 5 };
}

function defaultVote(agent: any, eventType: string, context: any) {
  return { recommended_action: 'none', channel: 'none', confidence: 10, reasoning: 'Agent non configuré', timing: 'none', priority: 1 };
}

function deliberateCouncil(votes: any[], context: any) {
  const significantVotes = votes.filter(v => v.confidence >= 50);
  if (significantVotes.length === 0) return { recommended_action: 'monitor', channel: 'none', confidence: 20, consensus_score: 0, reasoning: 'Aucun agent fort', actions: [] };

  const sortedVotes = significantVotes.sort((a, b) => { if (b.priority !== a.priority) return b.priority - a.priority; return b.confidence - a.confidence; });
  const topVote = sortedVotes[0];

  const agreeingVotes = votes.filter(v => v.recommended_action === topVote.recommended_action || v.confidence < 50);
  const consensusScore = (agreeingVotes.length / votes.length) * 100;
  const autoExecute = consensusScore > 75 && topVote.confidence > 85;

  return { recommended_action: topVote.recommended_action, channel: topVote.channel, confidence: topVote.confidence, consensus_score: Math.round(consensusScore), reasoning: `${topVote.agent_name} recommande: ${topVote.reasoning}. Consensus: ${Math.round(consensusScore)}%`, auto_execute: autoExecute, timing: topVote.timing, priority: topVote.priority, actions: [{ type: topVote.recommended_action, channel: topVote.channel, content: topVote.metadata || {} }], minority_opinions: sortedVotes.slice(1, 3).map(v => ({ agent: v.agent_name, action: v.recommended_action, confidence: v.confidence, reasoning: v.reasoning })) };
}