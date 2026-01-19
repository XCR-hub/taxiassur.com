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

// 🎯 PIPELINE TAXIASSUR SIMPLIFIÉ - 7 Étapes Essentielles
export type PipelineStatus =
  // 📋 LES 7 ÉTAPES DU WORKFLOW
  | 'NOUVEAU_LEAD'                      // 1️⃣ Demande reçue (site, email, téléphone)
  | 'COLLECTE_DOCUMENTS'                // 2️⃣ Documents obligatoires + complémentaires
  | 'DEVIS'                             // 3️⃣ Devis envoyé (avec docs fixes: DG, IPID...)
  | 'DECISION_CLIENT'                   // 4️⃣ Accepté ✓ / Refusé ✗ / Inactif ⏳
  | 'PAIEMENT'                          // 5️⃣ CB/Prélèvement (compagnie ou TaxiAssur)
  | 'CONTRAT_SIGNATURE'                 // 6️⃣ Signature électronique + docs complémentaires
  | 'CLIENT_ACTIF'                      // 7️⃣ Contrat actif - Espace client

  // ⚫ STATUTS SPÉCIAUX
  | 'RELANCE'                           // Relance nécessaire (inactivité)
  | 'PERDU'                             // Perdu définitif
  | 'RECONTACT_PROGRAMME'               // Recontact futur planifié

  // 🔄 GESTION CLIENT
  | 'CROSS_SELLING'                     // Opportunité vente additionnelle
  | 'RISK_CHURN'                        // Risque de résiliation
  | 'SINISTRE'                          // Dossier sinistre en cours
  | 'ATTESTATION_REQUEST'               // Demande attestation
  | 'SUPPORT_ASSISTANCE';               // Support & assistance

export interface PipelineTransition {
  from: PipelineStatus;
  to: PipelineStatus;
  label: string;
  requiresNote?: boolean;
  autoActions?: string[];
}

export const PIPELINE_STATUSES: Record<PipelineStatus, { label: string; color: string; icon: string }> = {
  // 📋 LES 7 ÉTAPES DU PIPELINE
  NOUVEAU_LEAD: { label: 'Nouveau Lead', color: 'blue', icon: '🆕' },
  COLLECTE_DOCUMENTS: { label: 'Collecte Documents', color: 'orange', icon: '📋' },
  DEVIS: { label: 'Devis', color: 'cyan', icon: '📨' },
  DECISION_CLIENT: { label: 'Décision Client', color: 'purple', icon: '🤔' },
  PAIEMENT: { label: 'Paiement', color: 'yellow', icon: '💰' },
  CONTRAT_SIGNATURE: { label: 'Contrat & Signature', color: 'emerald', icon: '✍️' },
  CLIENT_ACTIF: { label: 'Client Actif', color: 'green', icon: '🎉' },

  // ⚫ STATUTS SPÉCIAUX
  RELANCE: { label: 'Relance', color: 'amber', icon: '🔔' },
  PERDU: { label: 'Perdu', color: 'gray', icon: '❌' },
  RECONTACT_PROGRAMME: { label: 'Recontact Programmé', color: 'slate', icon: '📅' },

  // 🔄 GESTION CLIENT
  CROSS_SELLING: { label: 'Cross-sell', color: 'purple', icon: '🎁' },
  RISK_CHURN: { label: 'Risque Churn', color: 'red', icon: '⚠️' },
  SINISTRE: { label: 'Sinistre', color: 'red', icon: '🚨' },
  ATTESTATION_REQUEST: { label: 'Demande Attestation', color: 'blue', icon: '📜' },
  SUPPORT_ASSISTANCE: { label: 'Assistance', color: 'teal', icon: '💬' }
};

export const PIPELINE_TRANSITIONS: PipelineTransition[] = [
  // 📋 WORKFLOW PRINCIPAL (7 ÉTAPES)
  // 1→2: Nouveau Lead → Collecte Documents
  { from: 'NOUVEAU_LEAD', to: 'COLLECTE_DOCUMENTS', label: 'Demander Documents', autoActions: ['send_welcome_email', 'send_documents_request'] },

  // 2→3: Collecte Documents → Devis (quand documents OK)
  { from: 'COLLECTE_DOCUMENTS', to: 'DEVIS', label: 'Documents OK - Générer Devis', autoActions: ['generate_quote', 'send_quote_email'] },

  // 3→4: Devis → Décision Client
  { from: 'DEVIS', to: 'DECISION_CLIENT', label: 'En Attente Décision Client' },

  // 4→5: Décision Client → Paiement (si accepté)
  { from: 'DECISION_CLIENT', to: 'PAIEMENT', label: 'Client Accepte - Paiement', autoActions: ['send_payment_instructions'] },

  // 5→6: Paiement → Contrat & Signature
  { from: 'PAIEMENT', to: 'CONTRAT_SIGNATURE', label: 'Paiement OK - Signature', autoActions: ['send_signature_request'] },

  // 6→7: Contrat & Signature → Client Actif
  { from: 'CONTRAT_SIGNATURE', to: 'CLIENT_ACTIF', label: 'Contrat Signé - Activation', autoActions: ['send_client_access', 'send_welcome_pack'] },

  // ⚫ RELANCES & RETOURS
  { from: 'NOUVEAU_LEAD', to: 'RELANCE', label: 'Programmer Relance' },
  { from: 'COLLECTE_DOCUMENTS', to: 'RELANCE', label: 'Documents Manquants' },
  { from: 'DEVIS', to: 'RELANCE', label: 'Sans Réponse' },
  { from: 'DECISION_CLIENT', to: 'RELANCE', label: 'Relancer Client' },
  { from: 'RELANCE', to: 'NOUVEAU_LEAD', label: 'Contact Reétabli' },
  { from: 'RELANCE', to: 'COLLECTE_DOCUMENTS', label: 'Retour Collecte' },
  { from: 'RELANCE', to: 'DEVIS', label: 'Retour Devis' },
  { from: 'RELANCE', to: 'DECISION_CLIENT', label: 'Retour Décision' },

  // ⚫ PERDU & RECONTACT
  { from: 'DECISION_CLIENT', to: 'PERDU', label: 'Client Refuse', requiresNote: true },
  { from: 'DEVIS', to: 'PERDU', label: 'Perdu Définitif', requiresNote: true },
  { from: 'RELANCE', to: 'PERDU', label: 'Abandonner', requiresNote: true },
  { from: 'PERDU', to: 'RECONTACT_PROGRAMME', label: 'Planifier Recontact', requiresNote: true },
  { from: 'RECONTACT_PROGRAMME', to: 'NOUVEAU_LEAD', label: 'Réactiver Lead', autoActions: ['send_recontact_email'] },

  // 🔄 GESTION CLIENT ACTIF
  { from: 'CLIENT_ACTIF', to: 'CROSS_SELLING', label: 'Opportunité Cross-sell' },
  { from: 'CLIENT_ACTIF', to: 'RISK_CHURN', label: 'Risque Départ' },
  { from: 'CLIENT_ACTIF', to: 'SINISTRE', label: 'Déclarer Sinistre' },
  { from: 'CLIENT_ACTIF', to: 'ATTESTATION_REQUEST', label: 'Demande Attestation' },
  { from: 'CLIENT_ACTIF', to: 'SUPPORT_ASSISTANCE', label: 'Demande Assistance' },
  { from: 'CROSS_SELLING', to: 'CLIENT_ACTIF', label: 'Cross-sell Terminé' },
  { from: 'RISK_CHURN', to: 'CLIENT_ACTIF', label: 'Rétention OK' },
  { from: 'RISK_CHURN', to: 'PERDU', label: 'Client Perdu', requiresNote: true },
  { from: 'SINISTRE', to: 'CLIENT_ACTIF', label: 'Sinistre Clos' },
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
