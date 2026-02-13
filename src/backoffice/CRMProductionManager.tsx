import React, { useEffect, useState } from 'react';
import { FileText, CheckCircle, Clock, Upload, CreditCard, PenTool, AlertTriangle, ArrowLeft, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { DocumentChecklist } from '@/components/crm/DocumentChecklist';
import NavigationMenu from './NavigationMenu';

const CRMProductionManager: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<any[]>([]);
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [signatures, setSignatures] = useState<any[]>([]);
  const [progress, setProgress] = useState<any>(null);

  useEffect(() => {
    loadProductionLeads();
  }, []);

  useEffect(() => {
    if (selectedLead) {
      loadLeadProduction(selectedLead.id);
    }
  }, [selectedLead]);

  const loadProductionLeads = async () => {
    setLoading(true);
    try {
      // Récupérer les leads en production depuis crm_leads
      const { data, error } = await supabase
        .from('crm_leads')
        .select('*')
        .in('pipeline_stage', [
          'collecte_documents',
          'validation_documents',
          'signature_devis',
          'paiement_rib',
          'production'
        ])
        .order('updated_at', { ascending: false });

      if (error) throw error;

      setLeads(data || []);
      if (data && data.length > 0) {
        setSelectedLead(data[0]);
      }
    } catch (error) {
      console.error('Failed to load production leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLeadProduction = async (leadId: string) => {
    try {
      // Documents
      const { data: docsData } = await supabase
        .from('crm_lead_documents')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      // Paiements
      const { data: paymentsData } = await supabase
        .from('monetico_payments')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      // Signatures
      const { data: signaturesData } = await supabase
        .from('crm_lead_signatures')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      setDocuments(docsData || []);
      setPayments(paymentsData || []);
      setSignatures(signaturesData || []);

      // Calculer la progression
      const totalDocs = docsData?.length || 0;
      const validatedDocs = docsData?.filter(d => d.validated).length || 0;
      const totalSigs = signaturesData?.length || 0;
      const signedSigs = signaturesData?.filter(s => s.status === 'signed').length || 0;
      const totalPayments = paymentsData?.length || 0;
      const paidPayments = paymentsData?.filter(p => p.status === 'paid').length || 0;

      const docsProgress = totalDocs > 0 ? Math.round((validatedDocs / totalDocs) * 100) : 0;
      const sigsProgress = totalSigs > 0 ? Math.round((signedSigs / totalSigs) * 100) : 0;
      const paymentsProgress = totalPayments > 0 ? Math.round((paidPayments / totalPayments) * 100) : 0;
      const overall = Math.round((docsProgress + sigsProgress + paymentsProgress) / 3);

      setProgress({
        overall,
        documents: { percentage: docsProgress, completed: validatedDocs, total: totalDocs },
        signatures: { percentage: sigsProgress, completed: signedSigs, total: totalSigs },
        payments: { percentage: paymentsProgress, completed: paidPayments, total: totalPayments },
        checklist: { percentage: overall, completed: validatedDocs + signedSigs + paidPayments, total: totalDocs + totalSigs + totalPayments }
      });
    } catch (error) {
      console.error('Failed to load production data:', error);
    }
  };

  const stats = {
    pending_docs: leads.filter(l => l.pipeline_stage === 'collecte_documents' || l.pipeline_stage === 'validation_documents').length,
    pending_payments: leads.filter(l => l.pipeline_stage === 'paiement_rib').length,
    pending_signatures: leads.filter(l => l.pipeline_stage === 'signature_devis').length,
    in_production: leads.filter(l => l.pipeline_stage === 'production').length
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800">
        <div className="w-80 bg-gradient-to-b from-slate-800 to-gray-900 border-r border-gray-700 overflow-y-auto p-6">
          <NavigationMenu />
        </div>
        <div className="flex-1 overflow-y-auto p-8">
          <div className="animate-pulse">
            <div className="h-32 bg-gray-200 rounded-xl mb-6"></div>
            <div className="grid grid-cols-3 gap-6">
              <div className="h-96 bg-gray-200 rounded-xl"></div>
              <div className="col-span-2 h-96 bg-gray-200 rounded-xl"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800 overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 bg-gradient-to-b from-slate-800 to-gray-900 border-r border-gray-700 overflow-y-auto p-6">
        <div className="mb-6">
          <Link
            to="/backoffice"
            className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-medium transition-all shadow-lg mb-4"
          >
            <Home className="w-5 h-5" />
            Retour au Dashboard
          </Link>
        </div>
        <NavigationMenu />
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="min-h-full bg-gray-50">
          <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white">
            <div className="max-w-7xl mx-auto px-6 py-8">
              <div className="flex items-center gap-4 mb-4">
                <Link
                  to="/backoffice"
                  className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg font-medium transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Retour
                </Link>
                <div className="flex-1">
                  <h1 className="text-4xl font-bold">Manager de Production</h1>
                  <p className="text-orange-100">Documents, Signatures et Paiements</p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="bg-white/20 backdrop-blur rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <FileText size={24} />
                    <div className="text-3xl font-bold">{stats.pending_docs}</div>
                  </div>
                  <div className="text-orange-100 text-sm">Docs en Attente</div>
                </div>
                <div className="bg-white/20 backdrop-blur rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <PenTool size={24} />
                    <div className="text-3xl font-bold">{stats.pending_signatures}</div>
                  </div>
                  <div className="text-orange-100 text-sm">Signatures en Attente</div>
                </div>
                <div className="bg-white/20 backdrop-blur rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <CreditCard size={24} />
                    <div className="text-3xl font-bold">{stats.pending_payments}</div>
                  </div>
                  <div className="text-orange-100 text-sm">Paiements en Attente</div>
                </div>
                <div className="bg-white/20 backdrop-blur rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Clock size={24} />
                    <div className="text-3xl font-bold">{stats.in_production}</div>
                  </div>
                  <div className="text-orange-100 text-sm">En Production</div>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="grid grid-cols-3 gap-6">
              <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
                <h2 className="font-bold text-gray-900 mb-4">Leads en Production</h2>
                <div className="space-y-2 max-h-[calc(100vh-400px)] overflow-y-auto">
                  {leads.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Aucun lead en production</p>
                    </div>
                  ) : (
                    leads.map((lead) => (
                      <button
                        key={lead.id}
                        onClick={() => setSelectedLead(lead)}
                        className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                          selectedLead?.id === lead.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-semibold text-gray-900 mb-1">
                          {lead.prenom} {lead.nom}
                        </div>
                        <div className="text-xs text-gray-600">{lead.email}</div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded-full">
                            {lead.pipeline_stage?.replace(/_/g, ' ') || 'N/A'}
                          </span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className="col-span-2 space-y-6">
                {selectedLead ? (
                  <>
                    <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900">
                            {selectedLead.prenom} {selectedLead.nom}
                          </h2>
                          <p className="text-gray-600">{selectedLead.email}</p>
                          <p className="text-sm text-gray-500 mt-1">
                            Téléphone: {selectedLead.telephone || 'N/A'}
                          </p>
                        </div>
                    {progress && (
                      <div className="text-center">
                        <div className="text-4xl font-bold text-blue-600">{progress.overall}%</div>
                        <div className="text-sm text-gray-600">Progression</div>
                      </div>
                    )}
                  </div>

                  {progress && (
                    <div className="grid grid-cols-4 gap-4 mb-6">
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{progress.documents.percentage}%</div>
                        <div className="text-xs text-gray-600">Documents</div>
                        <div className="text-xs text-gray-500">
                          {progress.documents.completed}/{progress.documents.total}
                        </div>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">{progress.signatures.percentage}%</div>
                        <div className="text-xs text-gray-600">Signatures</div>
                        <div className="text-xs text-gray-500">
                          {progress.signatures.completed}/{progress.signatures.total}
                        </div>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{progress.payments.percentage}%</div>
                        <div className="text-xs text-gray-600">Paiements</div>
                        <div className="text-xs text-gray-500">
                          {progress.payments.completed}/{progress.payments.total}
                        </div>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-orange-600">{progress.checklist.percentage}%</div>
                        <div className="text-xs text-gray-600">Checklist</div>
                        <div className="text-xs text-gray-500">
                          {progress.checklist.completed}/{progress.checklist.total}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <FileText size={20} />
                    Documents
                  </h3>
                  <DocumentChecklist documents={documents} />
                </div>

                <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <PenTool size={20} />
                    Signatures Électroniques
                  </h3>
                  {signatures.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      Aucune signature en cours
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {signatures.map((sig) => (
                        <div key={sig.id} className="border-2 border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-semibold text-gray-900">{sig.document_name}</div>
                              <div className="text-sm text-gray-600">
                                {new Date(sig.sent_at).toLocaleDateString('fr-FR')}
                              </div>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              sig.status === 'signed' ? 'bg-green-100 text-green-700' :
                              sig.status === 'opened' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {sig.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <CreditCard size={20} />
                    Paiements
                  </h3>
                  {payments.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      Aucun paiement enregistré
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {payments.map((payment) => (
                        <div key={payment.id} className="border-2 border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-2xl font-bold text-gray-900">
                              {payment.amount} {payment.currency}
                            </div>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              payment.status === 'completed' ? 'bg-green-100 text-green-700' :
                              payment.status === 'failed' ? 'bg-red-100 text-red-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {payment.status}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600">
                            Méthode: {payment.payment_method}
                          </div>
                          {payment.due_date && (
                            <div className="text-sm text-gray-600">
                              Échéance: {new Date(payment.due_date).toLocaleDateString('fr-FR')}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                  </>
                ) : (
                  <div className="col-span-2 bg-white rounded-xl border-2 border-gray-200 p-12 text-center text-gray-500">
                    <Upload className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>Sélectionnez un lead pour voir ses détails de production</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CRMProductionManager;
