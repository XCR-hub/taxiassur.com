import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import CRMLayout from './CRMLayout';
import LeadHeader from '../components/crm/LeadHeader';
import LeadWorkflowTabs from '../components/crm/LeadWorkflowTabs';
import DocumentChecklistPanelV2 from '../components/crm/DocumentChecklistPanelV2';
import LeadQuotesManager from '../components/crm/LeadQuotesManager';
import DocumentRequestsManager from '../components/crm/DocumentRequestsManager';
import CommunicationTimeline from '../components/crm/CommunicationTimeline';
import DynamicCommercialWorkflow from '../components/crm/DynamicCommercialWorkflow';
import { ArrowLeft, Loader2 } from 'lucide-react';

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  status: string;
  pipeline_stage: string;
  score: number;
  created_at: string;
  updated_at: string;
  last_interaction_at: string | null;
  access_token: string;
  immatriculation: string | null;
  vehicle_type: string | null;
  city: string | null;
  notes: string | null;
  assigned_to: string | null;
}

export default function CRMLeadDetail() {
  const { leadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (leadId) {
      loadLead();
      subscribeToChanges();
    }
  }, [leadId]);

  const loadLead = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('crm_leads')
        .select('*')
        .eq('id', leadId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!data) {
        setError('Lead non trouvé');
        return;
      }

      setLead(data);
    } catch (err) {
      console.error('Error loading lead:', err);
      setError('Erreur lors du chargement du lead');
    } finally {
      setLoading(false);
    }
  };

  const subscribeToChanges = () => {
    const subscription = supabase
      .channel(`lead-${leadId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'crm_leads',
          filter: `id=eq.${leadId}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setLead(payload.new as Lead);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const handleLeadUpdate = async (updates: Partial<Lead>) => {
    try {
      const { error: updateError } = await supabase
        .from('crm_leads')
        .update(updates)
        .eq('id', leadId);

      if (updateError) throw updateError;

      await loadLead();
    } catch (err) {
      console.error('Error updating lead:', err);
      throw err;
    }
  };

  if (loading) {
    return (
      <CRMLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </CRMLayout>
    );
  }

  if (error || !lead) {
    return (
      <CRMLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={() => navigate('/admin/crm/pipeline')}
            className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour au pipeline
          </button>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error || 'Lead non trouvé'}
          </div>
        </div>
      </CRMLayout>
    );
  }

  return (
    <CRMLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate('/admin/crm/pipeline')}
          className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour au pipeline
        </button>

        <LeadHeader lead={lead} onUpdate={handleLeadUpdate} />

        <div className="mt-6">
          <LeadWorkflowTabs activeTab={activeTab} onTabChange={setActiveTab} />

          <div className="mt-6">
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <DynamicCommercialWorkflow leadId={lead.id} />
                  <CommunicationTimeline leadId={lead.id} />
                </div>
                <div className="space-y-6">
                  <DocumentChecklistPanelV2 leadId={lead.id} />
                </div>
              </div>
            )}

            {activeTab === 'documents' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <DocumentRequestsManager leadId={lead.id} />
                </div>
                <div>
                  <DocumentChecklistPanelV2 leadId={lead.id} />
                </div>
              </div>
            )}

            {activeTab === 'quotes' && (
              <LeadQuotesManager leadId={lead.id} />
            )}

            {activeTab === 'timeline' && (
              <CommunicationTimeline leadId={lead.id} />
            )}
          </div>
        </div>
      </div>
    </CRMLayout>
  );
}
