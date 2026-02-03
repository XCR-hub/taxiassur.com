import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { LeadWorkflowTabs, WorkflowTab } from '@/components/crm/LeadWorkflowTabs';
import { PipelineStepWorkflow } from '@/components/crm/PipelineStepWorkflow';
import DocumentChecklistPanelV2 from '@/components/crm/DocumentChecklistPanelV2';
import LeadCompanyQuotes from '@/backoffice/LeadCompanyQuotes';
import ContractSignatureManager from '@/components/crm/ContractSignatureManager';
import CommunicationTimeline from '@/components/crm/CommunicationTimeline';
import TimelineCard from '@/components/crm/TimelineCard';

interface Lead {
  id: string;
  email: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  city?: string;
  status: string;
  created_at: string;
  updated_at?: string;
  lead_score?: number;
  current_stage_key?: string;
  notes?: string;
  company_name?: string;
  vehicle_type?: string;
  immatriculation?: string;
}

const CRMLeadDetail: React.FC = () => {
  const { leadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<WorkflowTab>('overview');
  const [stats, setStats] = useState({
    documentsComplete: false,
    documentsMissing: 0,
    basketCount: 0,
    quotesCount: 0,
    hasContract: false,
    unreadMessages: 0,
    totalInteractions: 0,
  });

  useEffect(() => {
    if (leadId) {
      loadLeadData();
      loadStats();
    }
  }, [leadId]);

  const loadLeadData = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('crm_leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (fetchError) {
        logger.error('Error loading lead:', fetchError);
        setError('Impossible de charger les données du lead');
        return;
      }

      setLead(data);
    } catch (err) {
      logger.error('Error:', err);
      setError('Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!leadId) return;

    try {
      // Documents
      const { data: documents } = await supabase
        .from('crm_lead_documents')
        .select('*')
        .eq('lead_id', leadId);

      const totalDocs = documents?.length || 0;
      const validatedDocs = documents?.filter(d => d.validation_status === 'validated').length || 0;
      const pendingDocs = documents?.filter(d => d.validation_status === 'pending').length || 0;

      // Devis
      const { data: quotes } = await supabase
        .from('lead_company_quotes')
        .select('id')
        .eq('lead_id', leadId);

      // Contrat
      const { data: contracts } = await supabase
        .from('crm_production_contracts')
        .select('id')
        .eq('lead_id', leadId)
        .limit(1);

      // Messages
      const { data: messages } = await supabase
        .from('crm_interactions')
        .select('id')
        .eq('lead_id', leadId);

      setStats({
        documentsComplete: totalDocs > 0 && validatedDocs === totalDocs,
        documentsMissing: totalDocs > 0 ? (totalDocs - validatedDocs) : 5,
        basketCount: pendingDocs,
        quotesCount: quotes?.length || 0,
        hasContract: (contracts?.length || 0) > 0,
        unreadMessages: 0,
        totalInteractions: messages?.length || 0,
      });
    } catch (err) {
      logger.error('Error loading stats:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Erreur</h2>
          <p className="text-gray-600 mb-4">{error || 'Lead introuvable'}</p>
          <button
            onClick={() => navigate('/backoffice/crm-killer/pipeline')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retour au pipeline
          </button>
        </div>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    'nouveau_lead': 'bg-blue-100 text-blue-800',
    'en_cours_de_traitement': 'bg-yellow-100 text-yellow-800',
    'documents_en_attente': 'bg-orange-100 text-orange-800',
    'pret_pour_devis': 'bg-purple-100 text-purple-800',
    'devis_envoye': 'bg-indigo-100 text-indigo-800',
    'acompte_requis': 'bg-pink-100 text-pink-800',
    'contrat_en_cours': 'bg-cyan-100 text-cyan-800',
    'won': 'bg-green-100 text-green-800',
    'lost': 'bg-red-100 text-red-800',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <button
            onClick={() => navigate('/backoffice/crm-killer/pipeline')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-5 w-5" />
            Retour au pipeline
          </button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {lead.first_name || lead.last_name
                  ? `${lead.first_name || ''} ${lead.last_name || ''}`.trim()
                  : 'Lead sans nom'}
              </h1>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                {lead.email && (
                  <div className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    {lead.email}
                  </div>
                )}
                {lead.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    {lead.phone}
                  </div>
                )}
              </div>
            </div>
            <div>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  statusColors[lead.status] || 'bg-gray-100 text-gray-800'
                }`}
              >
                {lead.status?.replace(/_/g, ' ').toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <LeadWorkflowTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        stats={stats}
      />

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <PipelineStepWorkflow
              leadId={leadId!}
              onStageChanged={() => {
                loadLeadData();
                loadStats();
              }}
            />
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="space-y-6">
            <DocumentChecklistPanelV2 leadId={leadId!} />
          </div>
        )}

        {activeTab === 'quotes' && (
          <div className="space-y-6">
            <LeadCompanyQuotes leadId={leadId!} />
          </div>
        )}

        {activeTab === 'contract' && (
          <div className="space-y-6">
            <ContractSignatureManager leadId={leadId!} />
          </div>
        )}

        {activeTab === 'communication' && (
          <div className="space-y-6">
            <CommunicationTimeline leadId={leadId!} />
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-6">
            <TimelineCard leadId={leadId!} />
          </div>
        )}
      </div>
    </div>
  );
};

export default CRMLeadDetail;
