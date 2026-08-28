import { supabase } from './supabase';
import { NATIVE_ADMIN_TOKEN_KEY } from './native-admin-auth';
import { nativeAdminDashboard, nativeAdminLead, nativeAdminUpdateLead } from './native-admin-data';

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

export const PIPELINE_STATUSES: Record<string, { label: string; color: string; icon: string }> = {
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
  SUPPORT_ASSISTANCE: { label: 'Assistance', color: 'teal', icon: '💬' },

  // 🔄 ANCIENS STATUTS (Rétrocompatibilité temporaire)
  NEW_LEAD: { label: 'Nouveau Lead', color: 'blue', icon: '🆕' },
  CONTACT_ATTEMPTED: { label: 'Contact Tenté', color: 'blue', icon: '📞' },
  CONTACT_CONFIRMED: { label: 'Contact Confirmé', color: 'blue', icon: '✓' },
  DOCUMENTS_REQUIRED: { label: 'Documents Requis', color: 'orange', icon: '📋' },
  DOCUMENTS_RECEIVED: { label: 'Documents Reçus', color: 'orange', icon: '📥' },
  READY_FOR_QUOTE: { label: 'Prêt Devis', color: 'cyan', icon: '📨' },
  QUOTE_SENT: { label: 'Devis Envoyé', color: 'cyan', icon: '📨' },
  QUOTE_ACCEPTED: { label: 'Devis Accepté', color: 'green', icon: '✓' },
  PAYMENT_PENDING: { label: 'Paiement En Attente', color: 'yellow', icon: '💰' },
  CONTRACT_PENDING: { label: 'Contrat En Attente', color: 'emerald', icon: '✍️' },
  ACTIVE_CLIENT: { label: 'Client Actif', color: 'green', icon: '🎉' },
  LOST: { label: 'Perdu', color: 'gray', icon: '❌' },
  LOST_RECONTACT_SCHEDULED: { label: 'Recontact Programmé', color: 'slate', icon: '📅' }
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
  { from: 'SUPPORT_ASSISTANCE', to: 'CLIENT_ACTIF', label: 'Assistance Terminée' },

  // 🔄 TRANSITIONS DE MIGRATION (Anciens statuts → Nouveaux statuts)
  { from: 'NEW_LEAD', to: 'NOUVEAU_LEAD', label: 'Migrer vers nouveau système' },
  { from: 'CONTACT_ATTEMPTED', to: 'NOUVEAU_LEAD', label: 'Migrer vers nouveau système' },
  { from: 'CONTACT_CONFIRMED', to: 'COLLECTE_DOCUMENTS', label: 'Migrer - Demander Documents' },
  { from: 'DOCUMENTS_REQUIRED', to: 'COLLECTE_DOCUMENTS', label: 'Migrer vers nouveau système' },
  { from: 'DOCUMENTS_RECEIVED', to: 'DEVIS', label: 'Migrer - Générer Devis' },
  { from: 'READY_FOR_QUOTE', to: 'DEVIS', label: 'Migrer vers nouveau système' },
  { from: 'QUOTE_SENT', to: 'DECISION_CLIENT', label: 'Migrer vers nouveau système' },
  { from: 'QUOTE_ACCEPTED', to: 'PAIEMENT', label: 'Migrer - Paiement' },
  { from: 'PAYMENT_PENDING', to: 'PAIEMENT', label: 'Migrer vers nouveau système' },
  { from: 'CONTRACT_PENDING', to: 'CONTRAT_SIGNATURE', label: 'Migrer vers nouveau système' },
  { from: 'ACTIVE_CLIENT', to: 'CLIENT_ACTIF', label: 'Migrer vers nouveau système' },
  { from: 'LOST', to: 'PERDU', label: 'Migrer vers nouveau système' },
  { from: 'LOST_RECONTACT_SCHEDULED', to: 'RECONTACT_PROGRAMME', label: 'Migrer vers nouveau système' },

  // Transitions normales depuis les anciens statuts
  { from: 'DOCUMENTS_REQUIRED', to: 'DEVIS', label: 'Documents OK - Passer au Devis' },
  { from: 'DOCUMENTS_RECEIVED', to: 'DECISION_CLIENT', label: 'En attente décision' },
  { from: 'READY_FOR_QUOTE', to: 'DECISION_CLIENT', label: 'Devis envoyé' },
  { from: 'QUOTE_SENT', to: 'PAIEMENT', label: 'Client accepte' },
  { from: 'QUOTE_ACCEPTED', to: 'CONTRAT_SIGNATURE', label: 'Paiement OK' },
  { from: 'PAYMENT_PENDING', to: 'CONTRAT_SIGNATURE', label: 'Paiement reçu' },
  { from: 'CONTRACT_PENDING', to: 'CLIENT_ACTIF', label: 'Contrat signé' }
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
  assigned_at?: string;
  source?: string;
  lead_score?: number;
  quality_score?: number;
  retention_score?: number;
  last_contact?: string;
  next_followup?: string;
  notes?: string;
  tags?: string[];
  vehicle_type?: string;
  recontact_scheduled_date?: string | null;
  lost_reason?: string | null;
  recontact_attempts?: number;
  created_at: string;
  updated_at: string;
  first_request_at?: string;
}

const PIPELINE_STATUS_ALIASES: Record<string, PipelineStatus> = {
  nouveau: 'NOUVEAU_LEAD', nouveau_lead: 'NOUVEAU_LEAD', new: 'NOUVEAU_LEAD', new_lead: 'NOUVEAU_LEAD',
  contact_attempted: 'NOUVEAU_LEAD', contact_confirmed: 'NOUVEAU_LEAD', taxi: 'NOUVEAU_LEAD', vtc: 'NOUVEAU_LEAD', autre: 'NOUVEAU_LEAD',
  collecte_documents: 'COLLECTE_DOCUMENTS', document_collection: 'COLLECTE_DOCUMENTS', documents_required: 'COLLECTE_DOCUMENTS',
  documents_received: 'COLLECTE_DOCUMENTS', documents_partial: 'COLLECTE_DOCUMENTS',
  devis: 'DEVIS', saisie_devis: 'DEVIS', ready_for_quote: 'DEVIS', quote_pending: 'DEVIS', quote_sent: 'DEVIS',
  decision_client: 'DECISION_CLIENT', validation_devis_prospect: 'DECISION_CLIENT', signature_devis: 'DECISION_CLIENT',
  paiement: 'PAIEMENT', paiement_rib: 'PAIEMENT', payment_pending: 'PAIEMENT', quote_accepted: 'PAIEMENT',
  contrat_signature: 'CONTRAT_SIGNATURE', contract_pending: 'CONTRAT_SIGNATURE', signature_pending: 'CONTRAT_SIGNATURE',
  client_actif: 'CLIENT_ACTIF', active_client: 'CLIENT_ACTIF', signed: 'CLIENT_ACTIF',
  relance: 'RELANCE', relance_active: 'RELANCE', no_response: 'RELANCE',
  perdu: 'PERDU', lost: 'PERDU', client_lost: 'PERDU',
  recontact_programme: 'RECONTACT_PROGRAMME', lost_recontact_scheduled: 'RECONTACT_PROGRAMME',
};

const PIPELINE_STAGE_KEYS: Record<PipelineStatus, string> = {
  NOUVEAU_LEAD: 'nouveau_lead', COLLECTE_DOCUMENTS: 'collecte_documents', DEVIS: 'saisie_devis',
  DECISION_CLIENT: 'validation_devis_prospect', PAIEMENT: 'paiement_rib', CONTRAT_SIGNATURE: 'contrat_signature',
  CLIENT_ACTIF: 'active_client', RELANCE: 'relance', PERDU: 'perdu', RECONTACT_PROGRAMME: 'recontact_programme',
  CROSS_SELLING: 'cross_selling', RISK_CHURN: 'risk_churn', SINISTRE: 'sinistre',
  ATTESTATION_REQUEST: 'attestation_request', SUPPORT_ASSISTANCE: 'support_assistance',
};

export function normalizePipelineStatus(lead: Record<string, unknown>): PipelineStatus {
  const candidates = [lead.current_stage_key, lead.pipeline_stage, lead.status];
  for (const value of candidates) {
    const key = String(value || '').trim().toLowerCase();
    if (!key) continue;
    if (PIPELINE_STATUS_ALIASES[key]) return PIPELINE_STATUS_ALIASES[key];
    const upper = key.toUpperCase();
    if (PIPELINE_STATUSES[upper]) return upper as PipelineStatus;
  }
  return 'NOUVEAU_LEAD';
}

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
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
    if (localStorage.getItem(NATIVE_ADMIN_TOKEN_KEY)) {
      const result = await nativeAdminDashboard();
      let rows = (result.leads || []).filter((lead: any) => !lead.deleted_at);
      if (filters?.status) rows = rows.filter((lead: any) => lead.status === filters.status);
      if (filters?.assignedTo) rows = rows.filter((lead: any) => lead.assigned_to === filters.assignedTo);
      if (filters?.source) rows = rows.filter((lead: any) => lead.source === filters.source);
      if (filters?.search) { const needle=filters.search.toLowerCase(); rows=rows.filter((lead:any)=>[lead.first_name,lead.last_name,lead.email,lead.phone].some(value=>String(value||'').toLowerCase().includes(needle))); }
      return rows.map((lead:any)=>{
        const status=normalizePipelineStatus(lead);
        return {...lead,status,full_name:`${lead.first_name||''} ${lead.last_name||''}`.trim()||lead.email,vehicle_type:lead.vehicle_type||lead.metadata?.vehicle_type||null};
      }) as CRMLead[];
    }
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
      full_name: `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || lead.email,
      vehicle_type: lead.metadata?.vehicle_type || null
    })) as CRMLead[];
  },

  async getLead(id: string) {
    if (localStorage.getItem(NATIVE_ADMIN_TOKEN_KEY)) {
      const result=await nativeAdminLead(id); const data=result.lead;
      return {...data,full_name:`${data.first_name||''} ${data.last_name||''}`.trim()||data.email,vehicle_type:data.vehicle_type||data.metadata?.vehicle_type||null} as CRMLead;
    }
    const { data, error } = await supabase
      .from('crm_leads')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) throw error;

    return {
      ...data,
      full_name: `${data.first_name || ''} ${data.last_name || ''}`.trim() || data.email,
      vehicle_type: data.metadata?.vehicle_type || null
    } as CRMLead;
  },

  async updateLeadStatus(
    leadId: string,
    newStatus: PipelineStatus,
    note?: string,
    userId?: string,
    recontactDate?: string
  ): Promise<PipelineActionResult> {
    try {
      const updateData: Record<string, unknown> = {
        status: newStatus,
        pipeline_stage: PIPELINE_STAGE_KEYS[newStatus] || newStatus.toLowerCase(),
        current_stage_key: PIPELINE_STAGE_KEYS[newStatus] || newStatus.toLowerCase(),
        updated_at: new Date().toISOString()
      };

      if (newStatus === 'LOST_RECONTACT_SCHEDULED' && recontactDate) {
        updateData.recontact_scheduled_date = recontactDate;
        updateData.lost_reason = note || 'Non spécifié';
      }

      if (localStorage.getItem(NATIVE_ADMIN_TOKEN_KEY)) {
        const result=await nativeAdminUpdateLead(leadId,updateData);
        return {success:true,message:`Statut mis à jour vers ${PIPELINE_STATUSES[newStatus].label}`,actionsQueued:0,details:{lead:result.lead}};
      }

      const { data: lead, error: leadError } = await supabase
        .from('crm_leads')
        .update(updateData)
        .eq('id', leadId)
        .is('deleted_at', null)
        .select()
        .single();

      if (leadError) {
        console.error('Lead update error:', leadError);
        return {
          success: false,
          message: `Erreur lors de la mise à jour : ${leadError.message}`,
          actionsQueued: 0
        };
      }

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

      if (timelineError) {
        console.error('Timeline error:', timelineError);
      }

      const transition = PIPELINE_TRANSITIONS.find(
        t => t.to === newStatus && t.autoActions
      );

      let actionsQueued = 0;
      if (transition?.autoActions) {
        const result = await this.triggerAutoActions(leadId, transition.autoActions);
        actionsQueued = result.actionsQueued;
      }

      return {
        success: true,
        message: `Statut mis à jour vers ${PIPELINE_STATUSES[newStatus].label}`,
        actionsQueued,
        details: { lead }
      };
    } catch (error) {
      console.error('updateLeadStatus error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erreur inconnue',
        actionsQueued: 0
      };
    }
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
    if (localStorage.getItem(NATIVE_ADMIN_TOKEN_KEY)) return (await nativeAdminUpdateLead(leadId,{assigned_to:userId})).lead;
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
  },

  async getAdminUsers(): Promise<AdminUser[]> {
    if (localStorage.getItem(NATIVE_ADMIN_TOKEN_KEY)) return (await nativeAdminDashboard()).admin_users || [];
    const { data, error } = await supabase
      .from('admin_users')
      .select('id, email, full_name, role')
      .eq('is_active', true)
      .order('full_name');

    if (error) {
      console.error('getAdminUsers error:', error);
      return [];
    }
    return data || [];
  },

  async autoAssignLead(leadId: string, userId: string): Promise<boolean> {
    if (localStorage.getItem(NATIVE_ADMIN_TOKEN_KEY)) { await nativeAdminUpdateLead(leadId,{assigned_to:userId}); return true; }
    const { error } = await supabase
      .from('crm_leads')
      .update({ assigned_to: userId, assigned_at: new Date().toISOString() })
      .eq('id', leadId)
      .is('assigned_to', null);

    return !error;
  }
};
