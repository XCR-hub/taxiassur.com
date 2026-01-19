import { supabase } from './supabase';

export interface PipelineActionResult {
  success: boolean;
  message: string;
  actionsQueued: number;
  details?: Record<string, unknown>;
}

export interface PendingAutomation {
  id: string;
  action_type: string;
  status: string;
  priority: number;
  scheduled_at: string;
  created_at: string;
}

export interface AutomationStats {
  action_type: string;
  total_count: number;
  success_count: number;
  failed_count: number;
  pending_count: number;
  success_rate: number;
}

// 🎯 PIPELINE TAXIASSUR UNIFIÉ - Workflow complet du lead au client actif
export type PipelineStatus =
  // 🔵 PHASE PROSPECTION (2 étapes)
  | 'NEW_LEAD'                          // 1. Lead entrant (formulaire, email, appel)
  | 'PREMIER_CONTACT'                   // 2. Premier contact établi

  // 🟡 PHASE QUALIFICATION (3 étapes)
  | 'COLLECTE_DOCUMENTS'                // 3. Documents standards en cours de collecte
  | 'DOCUMENTS_COMPLEMENTAIRES'         // 4. Documents complémentaires demandés (assureur)
  | 'PRET_DEVIS'                        // 5. Dossier complet, prêt pour devis

  // 🟠 PHASE COMMERCIALE (2 étapes)
  | 'DEVIS_EN_COURS'                    // 6. Devis en préparation/envoyé
  | 'NEGOCIATION'                       // 7. Négociation commerciale active

  // 🟢 PHASE CONTRACTUELLE (3 étapes)
  | 'SIGNATURE_EN_COURS'                // 8. Signature en attente
  | 'PAIEMENT_EN_ATTENTE'               // 9. Paiement comptant ou 1er mois
  | 'CLIENT_ACTIF'                      // 10. Contrat actif et payé

  // ⚫ STATUTS SPÉCIAUX
  | 'RELANCE'                           // Nécessite relance (inactivité détectée)
  | 'PERDU'                             // Perdu définitif
  | 'RECONTACT_PROGRAMME'               // Perdu avec recontact futur planifié

  // 🔄 GESTION CLIENT
  | 'CROSS_SELLING'                     // Opportunité de vente additionnelle
  | 'RISK_CHURN'                        // Risque de résiliation
  | 'SINISTER'                          // Dossier sinistre en cours
  | 'ATTESTATION_REQUEST'               // Demande d'attestation
  | 'SUPPORT_ASSISTANCE';               // Demande d'assistance

export interface PipelineTransition {
  from: PipelineStatus;
  to: PipelineStatus;
  label: string;
  requiresNote?: boolean;
  autoActions?: string[];
}

export const PIPELINE_STATUSES: Record<PipelineStatus, { label: string; color: string; icon: string }> = {
  // 🔵 PHASE PROSPECTION
  NEW_LEAD: { label: 'Nouveau Lead', color: 'blue', icon: '🆕' },
  PREMIER_CONTACT: { label: 'Premier Contact', color: 'indigo', icon: '📞' },

  // 🟡 PHASE QUALIFICATION
  COLLECTE_DOCUMENTS: { label: 'Collecte Documents', color: 'orange', icon: '📋' },
  DOCUMENTS_COMPLEMENTAIRES: { label: 'Docs Complémentaires', color: 'amber', icon: '📎' },
  PRET_DEVIS: { label: 'Prêt pour Devis', color: 'lime', icon: '🎯' },

  // 🟠 PHASE COMMERCIALE
  DEVIS_EN_COURS: { label: 'Devis en Cours', color: 'cyan', icon: '📨' },
  NEGOCIATION: { label: 'Négociation', color: 'purple', icon: '💬' },

  // 🟢 PHASE CONTRACTUELLE
  SIGNATURE_EN_COURS: { label: 'Signature en Cours', color: 'emerald', icon: '✍️' },
  PAIEMENT_EN_ATTENTE: { label: 'Paiement en Attente', color: 'yellow', icon: '💰' },
  CLIENT_ACTIF: { label: 'Client Actif', color: 'green', icon: '🎉' },

  // ⚫ STATUTS SPÉCIAUX
  RELANCE: { label: 'Relance', color: 'amber', icon: '🔔' },
  PERDU: { label: 'Perdu', color: 'gray', icon: '❌' },
  RECONTACT_PROGRAMME: { label: 'Recontact Programmé', color: 'slate', icon: '📅' },

  // 🔄 GESTION CLIENT
  CROSS_SELLING: { label: 'Cross-sell', color: 'purple', icon: '🎁' },
  RISK_CHURN: { label: 'Risque Churn', color: 'red', icon: '⚠️' },
  SINISTER: { label: 'Sinistre', color: 'red', icon: '🚨' },
  ATTESTATION_REQUEST: { label: 'Demande Attestation', color: 'blue', icon: '📜' },
  SUPPORT_ASSISTANCE: { label: 'Assistance', color: 'teal', icon: '💬' }
};

export const PIPELINE_TRANSITIONS: PipelineTransition[] = [
  // 🔵 PHASE PROSPECTION
  { from: 'NEW_LEAD', to: 'PREMIER_CONTACT', label: 'Établir Contact', autoActions: ['send_welcome_email'] },
  { from: 'NEW_LEAD', to: 'RELANCE', label: 'Planifier Relance' },

  // 🟡 PHASE QUALIFICATION
  { from: 'PREMIER_CONTACT', to: 'COLLECTE_DOCUMENTS', label: 'Demander Documents', autoActions: ['send_documents_request'] },
  { from: 'COLLECTE_DOCUMENTS', to: 'DOCUMENTS_COMPLEMENTAIRES', label: 'Docs Complémentaires Requis' },
  { from: 'COLLECTE_DOCUMENTS', to: 'PRET_DEVIS', label: 'Documents Complets' },
  { from: 'DOCUMENTS_COMPLEMENTAIRES', to: 'PRET_DEVIS', label: 'Tous Docs Validés' },
  { from: 'DOCUMENTS_COMPLEMENTAIRES', to: 'COLLECTE_DOCUMENTS', label: 'Retour Collecte' },

  // 🟠 PHASE COMMERCIALE
  { from: 'PRET_DEVIS', to: 'DEVIS_EN_COURS', label: 'Générer Devis', autoActions: ['generate_quote', 'send_quote_email'] },
  { from: 'DEVIS_EN_COURS', to: 'NEGOCIATION', label: 'Négocier' },
  { from: 'DEVIS_EN_COURS', to: 'SIGNATURE_EN_COURS', label: 'Acceptation Directe', autoActions: ['send_signature_request'] },
  { from: 'DEVIS_EN_COURS', to: 'RELANCE', label: 'Sans Réponse' },
  { from: 'NEGOCIATION', to: 'DEVIS_EN_COURS', label: 'Nouveau Devis' },
  { from: 'NEGOCIATION', to: 'SIGNATURE_EN_COURS', label: 'Accord Trouvé', autoActions: ['send_signature_request'] },

  // 🟢 PHASE CONTRACTUELLE
  { from: 'SIGNATURE_EN_COURS', to: 'PAIEMENT_EN_ATTENTE', label: 'Signé - Attente Paiement', autoActions: ['send_payment_link'] },
  { from: 'PAIEMENT_EN_ATTENTE', to: 'CLIENT_ACTIF', label: 'Paiement Reçu', autoActions: ['send_contract_confirmation', 'send_client_access'] },

  // ⚫ RELANCE
  { from: 'RELANCE', to: 'PREMIER_CONTACT', label: 'Contact Reétabli' },
  { from: 'RELANCE', to: 'DEVIS_EN_COURS', label: 'Devis Relancé' },
  { from: 'RELANCE', to: 'NEGOCIATION', label: 'Retour Négociation' },
  { from: 'RELANCE', to: 'PERDU', label: 'Abandonner', requiresNote: true },
  { from: 'RELANCE', to: 'RECONTACT_PROGRAMME', label: 'Programmer Recontact', requiresNote: true },

  // ⚫ PERDU & RECONTACT
  { from: 'PERDU', to: 'RECONTACT_PROGRAMME', label: 'Planifier Recontact Futur', requiresNote: true },
  { from: 'RECONTACT_PROGRAMME', to: 'NEW_LEAD', label: 'Réactiver Lead', autoActions: ['send_recontact_email'] },
  { from: 'DEVIS_EN_COURS', to: 'PERDU', label: 'Perdu Définitif', requiresNote: true },
  { from: 'NEGOCIATION', to: 'PERDU', label: 'Perdu Définitif', requiresNote: true },
  { from: 'SIGNATURE_EN_COURS', to: 'PERDU', label: 'Perdu Définitif', requiresNote: true },

  // 🔄 GESTION CLIENT ACTIF
  { from: 'CLIENT_ACTIF', to: 'CROSS_SELLING', label: 'Opportunité Cross-sell' },
  { from: 'CLIENT_ACTIF', to: 'RISK_CHURN', label: 'Risque Départ' },
  { from: 'CLIENT_ACTIF', to: 'SINISTER', label: 'Déclarer Sinistre' },
  { from: 'CLIENT_ACTIF', to: 'ATTESTATION_REQUEST', label: 'Demande Attestation' },
  { from: 'CLIENT_ACTIF', to: 'SUPPORT_ASSISTANCE', label: 'Demande Assistance' },
  { from: 'CROSS_SELLING', to: 'CLIENT_ACTIF', label: 'Cross-sell Terminé' },
  { from: 'RISK_CHURN', to: 'CLIENT_ACTIF', label: 'Rétention OK' },
  { from: 'RISK_CHURN', to: 'PERDU', label: 'Client Perdu', requiresNote: true },
  { from: 'SINISTER', to: 'CLIENT_ACTIF', label: 'Sinistre Clos' },
  { from: 'ATTESTATION_REQUEST', to: 'CLIENT_ACTIF', label: 'Attestation Envoyée' },
  { from: 'SUPPORT_ASSISTANCE', to: 'CLIENT_ACTIF', label: 'Assistance Terminée' }
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
      .is('deleted_at', null)
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
      .is('deleted_at', null)
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
      .is('deleted_at', null)
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

  async triggerAutoActions(leadId: string, actions: string[]): Promise<PipelineActionResult> {
    try {
      const { data, error } = await supabase.functions.invoke('pipeline-action-executor', {
        body: {
          action: 'process_queue',
          lead_id: leadId,
          limit: 10
        }
      });

      if (error) {
        console.error('Auto-action trigger error:', error);
        return { success: false, message: error.message, actionsQueued: 0 };
      }

      return {
        success: true,
        message: 'Actions queued successfully',
        actionsQueued: actions.length,
        details: data
      };
    } catch (err) {
      console.error('triggerAutoActions error:', err);
      return { success: false, message: 'Failed to trigger actions', actionsQueued: 0 };
    }
  },

  async queueManualAction(
    leadId: string,
    actionType: string,
    params: Record<string, unknown> = {},
    userId?: string
  ): Promise<{ success: boolean; queueId?: string }> {
    const { data, error } = await supabase.rpc('queue_pipeline_action', {
      p_lead_id: leadId,
      p_action_type: actionType,
      p_action_params: params,
      p_triggered_by: 'manual',
      p_user_id: userId || null,
      p_priority: 8,
      p_delay_minutes: 0
    });

    if (error) {
      console.error('Queue action error:', error);
      return { success: false };
    }

    return { success: true, queueId: data };
  },

  async getPendingAutomations(leadId: string): Promise<PendingAutomation[]> {
    const { data, error } = await supabase
      .from('pipeline_action_queue')
      .select('id, action_type, status, priority, scheduled_at, created_at')
      .eq('lead_id', leadId)
      .in('status', ['pending', 'processing'])
      .order('priority', { ascending: false });

    if (error) {
      console.error('Get pending automations error:', error);
      return [];
    }

    return data || [];
  },

  async getAutomationHistory(leadId: string, limit = 20): Promise<any[]> {
    const { data, error } = await supabase
      .from('pipeline_action_logs')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Get automation history error:', error);
      return [];
    }

    return data || [];
  },

  async getAutomationStats(): Promise<AutomationStats[]> {
    const { data, error } = await supabase.rpc('get_pipeline_action_stats');

    if (error) {
      console.error('Get automation stats error:', error);
      return [];
    }

    return data || [];
  },

  async cancelPendingAction(actionId: string): Promise<boolean> {
    const { error } = await supabase
      .from('pipeline_action_queue')
      .update({ status: 'cancelled' })
      .eq('id', actionId)
      .eq('status', 'pending');

    return !error;
  },

  async retryFailedAction(actionId: string): Promise<boolean> {
    const { error } = await supabase
      .from('pipeline_action_queue')
      .update({ status: 'pending', attempts: 0 })
      .eq('id', actionId)
      .eq('status', 'failed');

    return !error;
  },

  async assignLead(leadId: string, userId: string) {
    const { data, error } = await supabase
      .from('crm_leads')
      .update({ assigned_to: userId })
      .eq('id', leadId)
      .is('deleted_at', null)
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
