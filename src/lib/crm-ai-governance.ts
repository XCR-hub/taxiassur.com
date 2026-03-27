import { supabase } from './supabase';

export type AIAgent =
  | 'lead_scorer'
  | 'email_composer'
  | 'negotiation_assistant'
  | 'risk_analyzer'
  | 'churn_predictor'
  | 'cross_sell_recommender'
  | 'sentiment_analyzer'
  | 'response_generator';

export interface AIDecision {
  id: string;
  lead_id: string;
  agent: AIAgent;
  decision_type: 'suggestion' | 'automation' | 'alert' | 'prediction';
  title: string;
  description: string;
  rationale: string;
  confidence_score: number;
  suggested_action?: string;
  data_sources: string[];
  status: 'pending' | 'approved' | 'rejected' | 'auto_applied';
  applied_at?: string;
  approved_by?: string;
  created_at: string;
  model_used?: string;
  model_provider?: string;
}

export type AIProvider = 'openai' | 'anthropic' | 'gemini' | 'huggingface' | 'openrouter';

export const AI_PROVIDERS: Record<AIProvider, { name: string; color: string; icon: string }> = {
  openai: { name: 'OpenAI', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25', icon: 'O' },
  anthropic: { name: 'Anthropic', color: 'text-orange-300 bg-orange-500/10 border-orange-500/25', icon: 'A' },
  gemini: { name: 'Google', color: 'text-blue-400 bg-blue-500/10 border-blue-500/25', icon: 'G' },
  huggingface: { name: 'HuggingFace', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/25', icon: 'H' },
  openrouter: { name: 'OpenRouter', color: 'text-rose-400 bg-rose-500/10 border-rose-500/25', icon: 'R' },
};

export const AI_AGENT_MODELS: Record<AIAgent, { provider: AIProvider; model: string; label: string }> = {
  lead_scorer: { provider: 'anthropic', model: 'claude-sonnet-4', label: 'Claude Sonnet' },
  email_composer: { provider: 'openai', model: 'gpt-4o', label: 'GPT-4o' },
  negotiation_assistant: { provider: 'anthropic', model: 'claude-sonnet-4', label: 'Claude Sonnet' },
  risk_analyzer: { provider: 'gemini', model: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
  churn_predictor: { provider: 'gemini', model: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
  cross_sell_recommender: { provider: 'openai', model: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  sentiment_analyzer: { provider: 'huggingface', model: 'mistral-7b', label: 'Mistral 7B' },
  response_generator: { provider: 'anthropic', model: 'claude-3.5-haiku', label: 'Claude Haiku' },
};

export interface AICouncilMeeting {
  id: string;
  lead_id: string;
  meeting_type: 'qualification' | 'risk_assessment' | 'retention' | 'cross_sell';
  agents_participating: AIAgent[];
  decisions_made: string[];
  consensus_reached: boolean;
  final_recommendation: string;
  confidence_level: number;
  created_at: string;
}

export const AI_AGENTS: Record<AIAgent, { name: string; description: string; icon: string }> = {
  lead_scorer: {
    name: 'Lead Scorer',
    description: 'Évalue la qualité et le potentiel de conversion des leads',
    icon: '🎯'
  },
  email_composer: {
    name: 'Email Composer',
    description: 'Génère des emails personnalisés ultra-humains',
    icon: '✉️'
  },
  negotiation_assistant: {
    name: 'Negotiation Assistant',
    description: 'Suggère des stratégies de négociation optimales',
    icon: '💼'
  },
  risk_analyzer: {
    name: 'Risk Analyzer',
    description: 'Analyse les risques de souscription',
    icon: '🔍'
  },
  churn_predictor: {
    name: 'Churn Predictor',
    description: 'Prédit les risques de résiliation',
    icon: '⚠️'
  },
  cross_sell_recommender: {
    name: 'Cross-Sell Recommender',
    description: 'Recommande des opportunités de vente additionnelle',
    icon: '🎁'
  },
  sentiment_analyzer: {
    name: 'Sentiment Analyzer',
    description: 'Analyse le sentiment des communications',
    icon: '😊'
  },
  response_generator: {
    name: 'Response Generator',
    description: 'Génère des réponses automatiques contextuelles',
    icon: '🤖'
  }
};

export const aiGovernanceService = {
  async getDecisions(leadId?: string, status?: AIDecision['status']) {
    let query = supabase
      .from('crm_ai_decisions')
      .select('*')
      .order('created_at', { ascending: false });

    if (leadId) {
      query = query.eq('lead_id', leadId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as AIDecision[];
  },

  async createDecision(decision: Omit<AIDecision, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('crm_ai_decisions')
      .insert({
        ...decision,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data as AIDecision;
  },

  async approveDecision(decisionId: string, userId: string) {
    const { data, error } = await supabase
      .from('crm_ai_decisions')
      .update({
        status: 'approved',
        approved_by: userId,
        applied_at: new Date().toISOString()
      })
      .eq('id', decisionId)
      .select()
      .single();

    if (error) throw error;

    supabase.functions.invoke('apply-ai-decision', {
      body: { decision_id: decisionId, approved_by: userId }
    }).catch(e => console.warn('apply-ai-decision (non-blocking):', e));

    return data;
  },

  async rejectDecision(decisionId: string, reason?: string) {
    const { data, error } = await supabase
      .from('crm_ai_decisions')
      .update({
        status: 'rejected',
        rationale: reason || ''
      })
      .eq('id', decisionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async conveneCouncil(leadId: string, meetingType: AICouncilMeeting['meeting_type']) {
    const { data, error } = await supabase.functions.invoke('ia-council', {
      body: {
        lead_id: leadId,
        meeting_type: meetingType
      }
    });

    if (error) throw error;
    return data as AICouncilMeeting;
  },

  async getCouncilMeetings(leadId: string) {
    const { data, error } = await supabase
      .from('crm_ai_council_meetings')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as AICouncilMeeting[];
  },

  async requestAIAction(leadId: string, agent: AIAgent, action: string, context?: Record<string, unknown>) {
    const { data, error } = await supabase.functions.invoke('crm-ai-assistant', {
      body: {
        lead_id: leadId,
        agent,
        action,
        context
      }
    });

    if (error) throw error;
    return data;
  },

  async generateEmail(leadId: string, emailType: string, context?: Record<string, unknown>) {
    const { data, error } = await supabase.functions.invoke('crm-ai-assistant', {
      body: {
        lead_id: leadId,
        agent: 'email_composer',
        action: 'generate_email',
        context: {
          email_type: emailType,
          ...context
        }
      }
    });

    if (error) throw error;
    return data;
  },

  async analyzeSentiment(text: string) {
    const { data, error } = await supabase.functions.invoke('crm-ai-assistant', {
      body: {
        agent: 'sentiment_analyzer',
        action: 'analyze',
        context: { text }
      }
    });

    if (error) throw error;
    return data;
  },

  async predictChurn(leadId: string) {
    const { data, error } = await supabase.functions.invoke('crm-ai-assistant', {
      body: {
        lead_id: leadId,
        agent: 'churn_predictor',
        action: 'predict'
      }
    });

    if (error) throw error;
    return data;
  },

  async getRecommendations(leadId: string) {
    const { data, error } = await supabase.functions.invoke('crm-ai-assistant', {
      body: {
        lead_id: leadId,
        agent: 'cross_sell_recommender',
        action: 'recommend'
      }
    });

    if (error) throw error;
    return data;
  },

  async getPendingDecisionsCount() {
    const { count, error } = await supabase
      .from('crm_ai_decisions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    if (error) throw error;
    return count || 0;
  }
};
