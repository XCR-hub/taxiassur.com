import { supabase } from './supabase';

export type PipelineStatus =
  | 'NEW_LEAD'
  | 'CONTACT_ATTEMPTED'
  | 'CONTACT_CONFIRMED'
  | 'DOCUMENTS_REQUIRED'
  | 'DOCUMENTS_PARTIAL'
  | 'READY_FOR_QUOTE'
  | 'QUOTE_SENT'
  | 'NO_RESPONSE'
  | 'RELANCE_ACTIVE'
  | 'SIGNATURE_PENDING'
  | 'SIGNED'
  | 'PAYMENT_PENDING'
  | 'ACTIVE_CLIENT'
  | 'CROSS_SELLING'
  | 'RISK_CHURN'
  | 'CLIENT_LOST'
  | 'LOST_RECONTACT_SCHEDULED'
  | 'SINISTER'
  | 'ATTESTATION_REQUEST'
  | 'SUPPORT_ASSISTANCE';

export interface PipelineTransition {
  from: PipelineStatus;
  to: PipelineStatus;
  label: string;
  requiresNote?: boolean;
  autoActions?: string[];
}

export const PIPELINE_STATUSES: Record<PipelineStatus, { label: string; color: string; icon: string }> = {
  NEW_LEAD: { label: 'Nouveau Lead', color: 'blue', icon: '🆕' },
  CONTACT_ATTEMPTED: { label: 'Contact Tenté', color: 'indigo', icon: '📞' },
  CONTACT_CONFIRMED: { label: 'Contact Confirmé', color: 'purple', icon: '✅' },
  DOCUMENTS_REQUIRED: { label: 'Docs Requis', color: 'orange', icon: '📋' },
  DOCUMENTS_PARTIAL: { label: 'Docs Partiels', color: 'yellow', icon: '📄' },
  READY_FOR_QUOTE: { label: 'Prêt pour Devis', color: 'lime', icon: '🎯' },
  QUOTE_SENT: { label: 'Devis Envoyé', color: 'cyan', icon: '📨' },
  NO_RESPONSE: { label: 'Sans Réponse', color: 'gray', icon: '❓' },
  RELANCE_ACTIVE: { label: 'Relance Active', color: 'amber', icon: '🔔' },
  SIGNATURE_PENDING: { label: 'Signature en Attente', color: 'emerald', icon: '✍️' },
  SIGNED: { label: 'Signé', color: 'green', icon: '✅' },
  PAYMENT_PENDING: { label: 'Paiement en Attente', color: 'yellow', icon: '💰' },
  ACTIVE_CLIENT: { label: 'Client Actif', color: 'green', icon: '🎉' },
  CROSS_SELLING: { label: 'Cross-sell', color: 'purple', icon: '🎁' },
  RISK_CHURN: { label: 'Risque Churn', color: 'red', icon: '⚠️' },
  CLIENT_LOST: { label: 'Perdu Définitif', color: 'gray', icon: '❌' },
  LOST_RECONTACT_SCHEDULED: { label: 'Perdu - Recontact Programmé', color: 'slate', icon: '📅' },
  SINISTER: { label: 'Sinistre', color: 'red', icon: '🚨' },
  ATTESTATION_REQUEST: { label: 'Demande Attestation', color: 'blue', icon: '📜' },
  SUPPORT_ASSISTANCE: { label: 'Assistance', color: 'teal', icon: '💬' }
};

export const PIPELINE_TRANSITIONS: PipelineTransition[] = [
  { from: 'NEW_LEAD', to: 'CONTACT_ATTEMPTED', label: 'Tenter Contact', autoActions: ['send_welcome_email'] },
  { from: 'CONTACT_ATTEMPTED', to: 'CONTACT_CONFIRMED', label: 'Confirmer Contact' },
  { from: 'CONTACT_CONFIRMED', to: 'DOCUMENTS_REQUIRED', label: 'Demander Docs', autoActions: ['send_documents_request'] },
  { from: 'DOCUMENTS_REQUIRED', to: 'DOCUMENTS_PARTIAL', label: 'Docs Partiels' },
  { from: 'DOCUMENTS_PARTIAL', to: 'READY_FOR_QUOTE', label: 'Compléter Docs' },
  { from: 'READY_FOR_QUOTE', to: 'QUOTE_SENT', label: 'Envoyer Devis', autoActions: ['generate_quote', 'send_quote_email'] },
  { from: 'QUOTE_SENT', to: 'SIGNATURE_PENDING', label: 'Demander Signature', autoActions: ['send_signature_request'] },
  { from: 'QUOTE_SENT', to: 'NO_RESPONSE', label: 'Sans Réponse' },
  { from: 'NO_RESPONSE', to: 'RELANCE_ACTIVE', label: 'Relancer', autoActions: ['send_followup'] },
  { from: 'RELANCE_ACTIVE', to: 'QUOTE_SENT', label: 'Relance OK' },
  { from: 'SIGNATURE_PENDING', to: 'SIGNED', label: 'Signature Obtenue' },
  { from: 'SIGNED', to: 'PAYMENT_PENDING', label: 'Demander Paiement', autoActions: ['send_payment_link'] },
  { from: 'PAYMENT_PENDING', to: 'ACTIVE_CLIENT', label: 'Activer Client', autoActions: ['send_contract_confirmation'] },
  { from: 'ACTIVE_CLIENT', to: 'CROSS_SELLING', label: 'Cross-sell' },
  { from: 'ACTIVE_CLIENT', to: 'RISK_CHURN', label: 'Risque Départ' },
  { from: 'RISK_CHURN', to: 'ACTIVE_CLIENT', label: 'Rétention OK' },
  { from: 'RISK_CHURN', to: 'CLIENT_LOST', label: 'Perdu Définitif', requiresNote: true },
  { from: 'RISK_CHURN', to: 'LOST_RECONTACT_SCHEDULED', label: 'Programmer Recontact', requiresNote: true },
  { from: 'ACTIVE_CLIENT', to: 'SINISTER', label: 'Déclarer Sinistre' },
  { from: 'ACTIVE_CLIENT', to: 'ATTESTATION_REQUEST', label: 'Demande Attestation' },
  { from: 'ACTIVE_CLIENT', to: 'SUPPORT_ASSISTANCE', label: 'Demande Assistance' },
  { from: 'QUOTE_SENT', to: 'CLIENT_LOST', label: 'Perdu Définitif', requiresNote: true },
  { from: 'QUOTE_SENT', to: 'LOST_RECONTACT_SCHEDULED', label: 'Programmer Recontact', requiresNote: true },
  { from: 'NO_RESPONSE', to: 'LOST_RECONTACT_SCHEDULED', label: 'Programmer Recontact', requiresNote: true },
  { from: 'RELANCE_ACTIVE', to: 'LOST_RECONTACT_SCHEDULED', label: 'Programmer Recontact', requiresNote: true },
  { from: 'LOST_RECONTACT_SCHEDULED', to: 'NEW_LEAD', label: 'Réactiver (Auto)', autoActions: ['send_recontact_email'] },
  { from: 'LOST_RECONTACT_SCHEDULED', to: 'CLIENT_LOST', label: 'Abandonner Définitivement' }
];

export interface CRMLead {
  id: string;
  first_name?: string;
  last_name?: string;
  full_name: string;
  email: string;
  phone: string;
  company_name?: string;
  city?: string;
  status: PipelineStatus;
  assigned_to?: string;
  source?: string;
  lead_score?: number;
  quality_score?: number;
  retention_score?: number;
  last_contact?: string;
  next_followup?: string;
  notes?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface TimelineEvent {
  id: string;
  lead_id: string;
  event_type: 'status_change' | 'note' | 'email_sent' | 'email_received' | 'call' | 'meeting' | 'document_uploaded' | 'ai_decision' | 'payment';
  title: string;
  description?: string;
  metadata?: Record<string, any>;
  created_by?: string;
  created_at: string;
}

export const pipelineService = {
  async getLeads(filters?: {
    status?: PipelineStatus;
    assignedTo?: string;
    source?: string;
    search?: string;
  }) {
    let query = supabase
      .from('crm_leads')
      .select('*')
      .order('updated_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.assignedTo) {
      query = query.eq('assigned_to', filters.assignedTo);
    }

    if (filters?.source) {
      query = query.eq('source', filters.source);
    }

    if (filters?.search) {
      query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(lead => ({
      ...lead,
      full_name: `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || lead.email
    })) as CRMLead[];
  },

  async getLead(id: string) {
    const { data, error } = await supabase
      .from('crm_leads')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    return {
      ...data,
      full_name: `${data.first_name || ''} ${data.last_name || ''}`.trim() || data.email
    } as CRMLead;
  },

  async updateLeadStatus(
    leadId: string,
    newStatus: PipelineStatus,
    note?: string,
    userId?: string,
    recontactDate?: string
  ) {
    const updateData: any = {
      status: newStatus,
      updated_at: new Date().toISOString()
    };

    if (newStatus === 'LOST_RECONTACT_SCHEDULED' && recontactDate) {
      updateData.recontact_scheduled_date = recontactDate;
      updateData.lost_reason = note || 'Non spécifié';
    }

    const { data: lead, error: leadError } = await supabase
      .from('crm_leads')
      .update(updateData)
      .eq('id', leadId)
      .select()
      .single();

    if (leadError) throw leadError;

    const { error: timelineError } = await supabase
      .from('crm_timeline')
      .insert({
        lead_id: leadId,
        event_type: 'status_change',
        title: `Statut changé vers ${PIPELINE_STATUSES[newStatus].label}`,
        description: note,
        metadata: {
          from_status: lead.status,
          to_status: newStatus,
          recontact_date: recontactDate
        },
        created_by: userId,
        created_at: new Date().toISOString()
      });

    if (timelineError) throw timelineError;

    const transition = PIPELINE_TRANSITIONS.find(
      t => t.to === newStatus && t.autoActions
    );

    if (transition?.autoActions) {
      await this.triggerAutoActions(leadId, transition.autoActions);
    }

    return lead;
  },

  async getTimeline(leadId: string) {
    const { data, error } = await supabase
      .from('crm_timeline')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as TimelineEvent[];
  },

  async addTimelineEvent(event: Omit<TimelineEvent, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('crm_timeline')
      .insert({
        ...event,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async triggerAutoActions(leadId: string, actions: string[]) {
    const { data, error } = await supabase.functions.invoke('crm-automation-engine', {
      body: {
        lead_id: leadId,
        actions
      }
    });

    if (error) throw error;
    return data;
  },

  async assignLead(leadId: string, userId: string) {
    const { data, error } = await supabase
      .from('crm_leads')
      .update({ assigned_to: userId })
      .eq('id', leadId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getKanbanData() {
    const leads = await this.getLeads();
    const kanban: Record<PipelineStatus, CRMLead[]> = {} as any;

    Object.keys(PIPELINE_STATUSES).forEach(status => {
      kanban[status as PipelineStatus] = leads.filter(
        lead => lead.status === status
      );
    });

    return kanban;
  },

  getAvailableTransitions(currentStatus: PipelineStatus): PipelineTransition[] {
    return PIPELINE_TRANSITIONS.filter(t => t.from === currentStatus);
  }
};
