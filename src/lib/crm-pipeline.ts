import { supabase } from './supabase';

export type PipelineStatus =
  | 'nouveau_lead'
  | 'contact_initial'
  | 'qualification'
  | 'devis_envoye'
  | 'negociation'
  | 'documents_attente'
  | 'documents_recus'
  | 'analyse_risque'
  | 'validation_souscription'
  | 'signature_attente'
  | 'signature_obtenue'
  | 'paiement_attente'
  | 'paiement_confirme'
  | 'production_cours'
  | 'contrat_actif'
  | 'renouvellement_prevu'
  | 'resilie'
  | 'perdu'
  | 'archive';

export interface PipelineTransition {
  from: PipelineStatus;
  to: PipelineStatus;
  label: string;
  requiresNote?: boolean;
  autoActions?: string[];
}

export const PIPELINE_STATUSES: Record<PipelineStatus, { label: string; color: string; icon: string }> = {
  nouveau_lead: { label: 'Nouveau Lead', color: 'blue', icon: '🆕' },
  contact_initial: { label: 'Contact Initial', color: 'indigo', icon: '📞' },
  qualification: { label: 'Qualification', color: 'purple', icon: '🎯' },
  devis_envoye: { label: 'Devis Envoyé', color: 'yellow', icon: '📄' },
  negociation: { label: 'Négociation', color: 'amber', icon: '💬' },
  documents_attente: { label: 'Docs en Attente', color: 'orange', icon: '⏳' },
  documents_recus: { label: 'Docs Reçus', color: 'lime', icon: '📥' },
  analyse_risque: { label: 'Analyse Risque', color: 'cyan', icon: '🔍' },
  validation_souscription: { label: 'Validation Souscription', color: 'teal', icon: '✓' },
  signature_attente: { label: 'Signature en Attente', color: 'emerald', icon: '✍️' },
  signature_obtenue: { label: 'Signature Obtenue', color: 'green', icon: '✅' },
  paiement_attente: { label: 'Paiement en Attente', color: 'yellow', icon: '💰' },
  paiement_confirme: { label: 'Paiement Confirmé', color: 'lime', icon: '💳' },
  production_cours: { label: 'Production en Cours', color: 'blue', icon: '⚙️' },
  contrat_actif: { label: 'Contrat Actif', color: 'green', icon: '🎉' },
  renouvellement_prevu: { label: 'Renouvellement Prévu', color: 'purple', icon: '🔄' },
  resilie: { label: 'Résilié', color: 'red', icon: '❌' },
  perdu: { label: 'Perdu', color: 'gray', icon: '😢' },
  archive: { label: 'Archivé', color: 'gray', icon: '📦' }
};

export const PIPELINE_TRANSITIONS: PipelineTransition[] = [
  { from: 'nouveau_lead', to: 'contact_initial', label: 'Contacter', autoActions: ['send_welcome_email'] },
  { from: 'contact_initial', to: 'qualification', label: 'Qualifier' },
  { from: 'qualification', to: 'devis_envoye', label: 'Envoyer Devis', autoActions: ['generate_quote', 'send_quote_email'] },
  { from: 'devis_envoye', to: 'negociation', label: 'Négocier' },
  { from: 'negociation', to: 'documents_attente', label: 'Demander Docs', autoActions: ['send_documents_request'] },
  { from: 'documents_attente', to: 'documents_recus', label: 'Docs Reçus' },
  { from: 'documents_recus', to: 'analyse_risque', label: 'Analyser' },
  { from: 'analyse_risque', to: 'validation_souscription', label: 'Valider' },
  { from: 'validation_souscription', to: 'signature_attente', label: 'Demander Signature', autoActions: ['send_signature_request'] },
  { from: 'signature_attente', to: 'signature_obtenue', label: 'Signature OK' },
  { from: 'signature_obtenue', to: 'paiement_attente', label: 'Demander Paiement', autoActions: ['send_payment_link'] },
  { from: 'paiement_attente', to: 'paiement_confirme', label: 'Paiement Reçu' },
  { from: 'paiement_confirme', to: 'production_cours', label: 'Lancer Production', autoActions: ['notify_production_team'] },
  { from: 'production_cours', to: 'contrat_actif', label: 'Activer Contrat', autoActions: ['send_contract_confirmation', 'schedule_renewal'] },
  { from: 'contrat_actif', to: 'renouvellement_prevu', label: 'Renouveler' },
  { from: 'renouvellement_prevu', to: 'contrat_actif', label: 'Renouvellement OK', autoActions: ['extend_contract'] },
  { from: 'contrat_actif', to: 'resilie', label: 'Résilier', requiresNote: true },
  { from: 'devis_envoye', to: 'perdu', label: 'Marquer Perdu', requiresNote: true },
  { from: 'negociation', to: 'perdu', label: 'Marquer Perdu', requiresNote: true },
  { from: 'perdu', to: 'archive', label: 'Archiver' },
  { from: 'resilie', to: 'archive', label: 'Archiver' }
];

export interface CRMLead {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  company_name?: string;
  city?: string;
  pipeline_status: PipelineStatus;
  assigned_to?: string;
  source?: string;
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
      .from('leads')
      .select('*')
      .order('updated_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('pipeline_status', filters.status);
    }

    if (filters?.assignedTo) {
      query = query.eq('assigned_to', filters.assignedTo);
    }

    if (filters?.source) {
      query = query.eq('source', filters.source);
    }

    if (filters?.search) {
      query = query.or(`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as CRMLead[];
  },

  async getLead(id: string) {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as CRMLead;
  },

  async updateLeadStatus(
    leadId: string,
    newStatus: PipelineStatus,
    note?: string,
    userId?: string
  ) {
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .update({
        pipeline_status: newStatus,
        updated_at: new Date().toISOString()
      })
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
        metadata: { from_status: lead.pipeline_status, to_status: newStatus },
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
      .from('leads')
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
        lead => lead.pipeline_status === status
      );
    });

    return kanban;
  },

  getAvailableTransitions(currentStatus: PipelineStatus): PipelineTransition[] {
    return PIPELINE_TRANSITIONS.filter(t => t.from === currentStatus);
  }
};
