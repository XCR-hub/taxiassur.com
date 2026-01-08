import { supabase } from './supabase';

export interface RetentionScore {
  lead_id: string;
  overall_score: number;
  engagement_score: number;
  satisfaction_score: number;
  payment_score: number;
  claims_score: number;
  churn_probability: number;
  churn_risk_level: 'low' | 'medium' | 'high' | 'critical';
  factors: {
    name: string;
    impact: number;
    positive: boolean;
  }[];
  last_calculated: string;
}

export interface ChurnAlert {
  id: string;
  lead_id: string;
  alert_type: 'low_engagement' | 'payment_issue' | 'negative_sentiment' | 'competitor_inquiry' | 'renewal_risk';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  suggested_actions: string[];
  auto_executed_actions: string[];
  status: 'new' | 'acknowledged' | 'in_progress' | 'resolved' | 'dismissed';
  created_at: string;
  resolved_at?: string;
}

export interface CrossSellOpportunity {
  id: string;
  lead_id: string;
  product_type: 'rc_pro' | 'flotte' | 'vtc' | 'garanties_supplementaires' | 'assistance_premium';
  product_name: string;
  confidence_score: number;
  reasoning: string;
  estimated_value: number;
  best_approach: string;
  status: 'suggested' | 'contacted' | 'interested' | 'declined' | 'converted';
  suggested_at: string;
}

export interface RenewalReminder {
  id: string;
  lead_id: string;
  contract_id: string;
  renewal_date: string;
  days_until_renewal: number;
  status: 'pending' | 'contacted' | 'confirmed' | 'declined' | 'cancelled';
  last_contact_date?: string;
  notes?: string;
  created_at: string;
}

export const retentionService = {
  async getRetentionScore(leadId: string) {
    const { data, error } = await supabase
      .from('crm_retention_scores')
      .select('*')
      .eq('lead_id', leadId)
      .order('last_calculated', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return await this.calculateRetentionScore(leadId);
    }

    return data as RetentionScore;
  },

  async calculateRetentionScore(leadId: string) {
    const { data, error } = await supabase.functions.invoke('crm-ai-assistant', {
      body: {
        lead_id: leadId,
        agent: 'churn_predictor',
        action: 'calculate_score'
      }
    });

    if (error) throw error;

    const { data: scoreRecord, error: insertError } = await supabase
      .from('crm_retention_scores')
      .insert({
        lead_id: leadId,
        ...data,
        last_calculated: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) throw insertError;

    if (data.churn_probability > 0.5) {
      await this.createChurnAlert(leadId, data);
    }

    return scoreRecord as RetentionScore;
  },

  async getChurnAlerts(filters?: {
    leadId?: string;
    severity?: ChurnAlert['severity'];
    status?: ChurnAlert['status'];
  }) {
    let query = supabase
      .from('crm_churn_alerts')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.leadId) {
      query = query.eq('lead_id', filters.leadId);
    }

    if (filters?.severity) {
      query = query.eq('severity', filters.severity);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as ChurnAlert[];
  },

  async createChurnAlert(leadId: string, scoreData: any) {
    const severity = scoreData.churn_probability > 0.8 ? 'critical' :
                     scoreData.churn_probability > 0.6 ? 'high' :
                     scoreData.churn_probability > 0.4 ? 'medium' : 'low';

    const { data, error } = await supabase
      .from('crm_churn_alerts')
      .insert({
        lead_id: leadId,
        alert_type: 'renewal_risk',
        severity,
        title: `Risque de churn détecté (${Math.round(scoreData.churn_probability * 100)}%)`,
        description: `Score de rétention faible détecté pour ce client`,
        suggested_actions: [
          'Appeler le client pour un point',
          'Proposer une offre de fidélité',
          'Organiser un rendez-vous personnalisé'
        ],
        auto_executed_actions: [],
        status: 'new',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    await supabase.functions.invoke('crm-automation-engine', {
      body: {
        lead_id: leadId,
        actions: ['send_retention_email', 'notify_account_manager']
      }
    });

    return data;
  },

  async updateAlertStatus(alertId: string, status: ChurnAlert['status']) {
    const { data, error } = await supabase
      .from('crm_churn_alerts')
      .update({
        status,
        resolved_at: status === 'resolved' ? new Date().toISOString() : null
      })
      .eq('id', alertId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getCrossSellOpportunities(leadId?: string) {
    let query = supabase
      .from('crm_cross_sell_opportunities')
      .select('*')
      .order('confidence_score', { ascending: false });

    if (leadId) {
      query = query.eq('lead_id', leadId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as CrossSellOpportunity[];
  },

  async generateCrossSellOpportunities(leadId: string) {
    const { data, error } = await supabase.functions.invoke('crm-ai-assistant', {
      body: {
        lead_id: leadId,
        agent: 'cross_sell_recommender',
        action: 'generate_opportunities'
      }
    });

    if (error) throw error;

    const opportunities = data.opportunities || [];

    const { data: records, error: insertError } = await supabase
      .from('crm_cross_sell_opportunities')
      .insert(
        opportunities.map((opp: any) => ({
          lead_id: leadId,
          ...opp,
          status: 'suggested',
          suggested_at: new Date().toISOString()
        }))
      )
      .select();

    if (insertError) throw insertError;
    return records as CrossSellOpportunity[];
  },

  async updateOpportunityStatus(opportunityId: string, status: CrossSellOpportunity['status']) {
    const { data, error } = await supabase
      .from('crm_cross_sell_opportunities')
      .update({ status })
      .eq('id', opportunityId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getRenewalReminders(filters?: {
    daysUntil?: number;
    status?: RenewalReminder['status'];
  }) {
    let query = supabase
      .from('crm_renewal_reminders')
      .select('*')
      .order('renewal_date', { ascending: true });

    if (filters?.daysUntil) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + filters.daysUntil);
      query = query.lte('renewal_date', targetDate.toISOString());
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as RenewalReminder[];
  },

  async createRenewalReminder(reminder: Omit<RenewalReminder, 'id' | 'created_at' | 'days_until_renewal'>) {
    const renewalDate = new Date(reminder.renewal_date);
    const today = new Date();
    const daysUntil = Math.ceil((renewalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    const { data, error } = await supabase
      .from('crm_renewal_reminders')
      .insert({
        ...reminder,
        days_until_renewal: daysUntil,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateRenewalStatus(reminderId: string, status: RenewalReminder['status'], notes?: string) {
    const { data, error } = await supabase
      .from('crm_renewal_reminders')
      .update({
        status,
        notes,
        last_contact_date: new Date().toISOString()
      })
      .eq('id', reminderId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getRetentionStats() {
    const { data, error } = await supabase.rpc('get_crm_retention_stats');

    if (error) {
      return {
        at_risk_count: 0,
        avg_retention_score: 0,
        renewal_rate: 0,
        cross_sell_conversion_rate: 0
      };
    }

    return data;
  },

  async getCriticalAlertsCount() {
    const { count, error } = await supabase
      .from('crm_churn_alerts')
      .select('*', { count: 'exact', head: true })
      .eq('severity', 'critical')
      .neq('status', 'resolved')
      .neq('status', 'dismissed');

    if (error) throw error;
    return count || 0;
  }
};
