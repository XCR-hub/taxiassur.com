import React, { useEffect, useState } from 'react';
import { FileText, CheckCircle, Clock, Upload, CreditCard, PenTool, AlertTriangle } from 'lucide-react';
import { pipelineService } from '@/lib/crm-pipeline';
import { productionService } from '@/lib/crm-production';
import { DocumentChecklist } from '@/components/crm/DocumentChecklist';

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
      const allLeads = await pipelineService.getLeads();
      const productionLeads = allLeads.filter(lead =>
        ['DOCUMENTS_REQUIRED', 'DOCUMENTS_PARTIAL', 'SIGNATURE_PENDING', 'PAYMENT_PENDING', 'SIGNED'].includes(lead.status)
      );
      setLeads(productionLeads);
      if (productionLeads.length > 0) {
        setSelectedLead(productionLeads[0]);
      }
    } catch (error) {
      console.error('Failed to load production leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLeadProduction = async (leadId: string) => {
    try {
      const [docsData, paymentsData, signaturesData, progressData] = await Promise.all([
        productionService.getDocuments(leadId),
        productionService.getPayments(leadId),
        productionService.getSignatures(leadId),
        productionService.getProductionProgress(leadId)
      ]);

      setDocuments(docsData);
      setPayments(paymentsData);
      setSignatures(signaturesData);
      setProgress(progressData);
    } catch (error) {
      console.error('Failed to load production data:', error);
    }
  };

  const stats = {
    pending_docs: leads.filter(l => l.status === 'DOCUMENTS_REQUIRED').length,
    pending_payments: leads.filter(l => l.status === 'PAYMENT_PENDING').length,
    pending_signatures: leads.filter(l => l.status === 'SIGNATURE_PENDING').length,
    in_production: leads.filter(l => l.status === 'SIGNED').length
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto animate-pulse">
          <div className="h-32 bg-gray-200 rounded-xl mb-6"></div>
          <div className="grid grid-cols-3 gap-6">
            <div className="h-96 bg-gray-200 rounded-xl"></div>
            <div className="col-span-2 h-96 bg-gray-200 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-4xl font-bold mb-4">Manager de Production</h1>
          <p className="text-orange-100 mb-6">Documents, Signatures et Paiements</p>

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
              {leads.map((lead) => (
                <button
                  key={lead.id}
                  onClick={() => setSelectedLead(lead)}
                  className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                    selectedLead?.id === lead.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold text-gray-900 mb-1">{lead.full_name}</div>
                  <div className="text-xs text-gray-600">{lead.email}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded-full">
                      {lead.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="col-span-2 space-y-6">
            {selectedLead ? (
              <>
                <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">{selectedLead.full_name}</h2>
                      <p className="text-gray-600">{selectedLead.email}</p>
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
                Sélectionnez un lead pour voir ses détails de production
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CRMProductionManager;
