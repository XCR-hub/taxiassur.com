import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { CRMLead } from '@/lib/crm-pipeline';
import CRMLayout from './CRMLayout';
import {
  LeadHeader,
  LeadWorkflowTabs,
  WorkflowTab
} from '@/components/crm';

export default function CRMLeadDetail() {
  const { leadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  const [lead, setLead] = useState<CRMLead | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<WorkflowTab>('overview');

  const loadLeadData = useCallback(async (showLoader = true) => {
    if (!leadId) return;

    if (showLoader) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('crm_leads')
        .select(`
          *,
          crm_lead_vehicles (*),
          crm_interactions (
            id,
            interaction_type,
            subject,
            notes,
            created_at,
            created_by
          ),
          prospect_documents (
            id,
            document_type,
            file_name,
            status,
            uploaded_at
          ),
          lead_company_quotes (
            id,
            company_id,
            status,
            quote_amount,
            quote_file_url,
            submitted_at,
            insurance_companies (
              code,
              name
            )
          )
        `)
        .eq('id', leadId)
        .single();

      if (fetchError) throw fetchError;

      setLead(data as CRMLead);
    } catch (err) {
      console.error('Error loading lead:', err);
      setError('Erreur lors du chargement du lead. Veuillez réessayer.');
    } finally {
      if (showLoader) setLoading(false);
      else setRefreshing(false);
    }
  }, [leadId]);

  useEffect(() => {
    loadLeadData();
  }, [loadLeadData]);

  useEffect(() => {
    if (!leadId) return;

    const channel = supabase
      .channel(`lead_${leadId}_changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'crm_leads',
          filter: `id=eq.${leadId}`
        },
        (payload) => {
          console.log('Lead updated:', payload);
          loadLeadData(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [leadId, loadLeadData]);

  const handleRefresh = () => {
    loadLeadData(false);
  };

  const handleStatusChange = () => {
    loadLeadData(false);
  };

  const handleBack = () => {
    navigate('/backoffice/crm');
  };

  if (loading) {
    return (
      <CRMLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto text-blue-600 mb-4" />
            <p className="text-gray-600">Chargement du lead...</p>
          </div>
        </div>
      </CRMLayout>
    );
  }

  if (error || !lead) {
    return (
      <CRMLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center max-w-md">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Erreur de chargement
            </h2>
            <p className="text-gray-600 mb-6">
              {error || 'Lead introuvable'}
            </p>
            <button
              onClick={handleBack}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour au CRM
            </button>
          </div>
        </div>
      </CRMLayout>
    );
  }

  return (
    <CRMLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <button
                onClick={handleBack}
                className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Retour au CRM
              </button>

              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex items-center px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Actualiser
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <LeadHeader lead={lead} onStatusChange={handleStatusChange} />

          <div className="mt-6">
            <LeadWorkflowTabs
              leadId={lead.id}
              lead={lead}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onUpdate={handleStatusChange}
            />
          </div>
        </div>
      </div>
    </CRMLayout>
  );
}
