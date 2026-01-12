import React, { useEffect, useState } from 'react';
import {
  Shield,
  FileText,
  AlertTriangle,
  Calendar,
  CreditCard,
  User,
  MessageSquare,
  Bell,
  TrendingUp,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ClientCompleteDocuments } from './ClientCompleteDocuments';
import { ClientClaimsManager } from './ClientClaimsManager';
import { ModificationRequests } from '@/components/crm/ModificationRequests';
import { AttestationManager } from '@/components/crm/AttestationManager';
import { SmartChatBot } from '@/components/SmartChatBot';

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  workflow_stage: string;
  created_at: string;
}

interface Contract {
  id: string;
  contract_number: string;
  status: string;
  choice_id: string;
}

interface ClientChoice {
  effective_date: string;
  debit_day: number;
}

interface Attestation {
  valid_from: string;
  valid_until: string;
}

interface ClientUnifiedDashboardProps {
  leadId: string;
  accessToken: string;
}

export const ClientUnifiedDashboard: React.FC<ClientUnifiedDashboardProps> = ({
  leadId,
  accessToken
}) => {
  const [lead, setLead] = useState<Lead | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  const [choice, setChoice] = useState<ClientChoice | null>(null);
  const [attestation, setAttestation] = useState<Attestation | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'claims' | 'modifications'>('overview');
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    loadData();
  }, [leadId]);

  const loadData = async () => {
    try {
      const [leadData, contractData, choiceData, attestationData] = await Promise.all([
        supabase.from('crm_leads').select('*').eq('id', leadId).single(),
        supabase.from('contracts').select('*').eq('lead_id', leadId).maybeSingle(),
        supabase.from('client_choices').select('*').eq('lead_id', leadId).maybeSingle(),
        supabase
          .from('attestations')
          .select('valid_from, valid_until')
          .eq('lead_id', leadId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      ]);

      if (leadData.data) setLead(leadData.data);
      if (contractData.data) setContract(contractData.data);
      if (choiceData.data) setChoice(choiceData.data);
      if (attestationData.data) setAttestation(attestationData.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWorkflowStageLabel = (stage: string) => {
    const stages: Record<string, string> = {
      new: 'Nouvelle demande',
      docs_requested: 'Documents demandés',
      docs_complete: 'Documents validés',
      quoting: 'Devis en cours',
      quotes_ready: 'Devis disponibles',
      client_choice: 'Choix enregistré',
      contract_ready: 'Contrat prêt',
      signing: 'Signature en cours',
      signed: 'Contrat signé',
      active: 'Contrat actif'
    };
    return stages[stage] || stage;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Accès non autorisé</h2>
          <p className="text-gray-600">Impossible de charger vos informations.</p>
        </div>
      </div>
    );
  }

  const isActive = lead.workflow_stage === 'active';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <Shield className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Bonjour {lead.first_name} !
                </h1>
                <p className="text-sm text-gray-600">
                  Statut : {getWorkflowStageLabel(lead.workflow_stage)}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowChat(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <MessageSquare className="w-5 h-5" />
              <span>Chat avec Léa</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Carte de statut principale */}
        {!isActive && (
          <div className="mb-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="w-8 h-8" />
              <div>
                <h2 className="text-xl font-bold">Votre dossier est en cours de traitement</h2>
                <p className="text-blue-100">
                  {getWorkflowStageLabel(lead.workflow_stage)}
                </p>
              </div>
            </div>
            <div className="text-sm text-blue-100">
              Nous travaillons activement sur votre dossier. Vous serez notifié à chaque étape importante.
            </div>
          </div>
        )}

        {isActive && contract && (
          <div className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <div className="text-sm text-gray-600">Contrat</div>
              </div>
              <div className="text-2xl font-bold text-gray-900">{contract.contract_number}</div>
              <div className="text-xs text-green-600 mt-1">Actif</div>
            </div>

            {choice && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-sm text-gray-600">Date d'effet</div>
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {new Date(choice.effective_date).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  })}
                </div>
              </div>
            )}

            {attestation && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Shield className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="text-sm text-gray-600">Validité</div>
                </div>
                <div className="text-lg font-bold text-gray-900">
                  Jusqu'au{' '}
                  {new Date(attestation.valid_until).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  })}
                </div>
              </div>
            )}

            {choice && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="text-sm text-gray-600">Prélèvement</div>
                </div>
                <div className="text-2xl font-bold text-gray-900">Le {choice.debit_day}</div>
                <div className="text-xs text-gray-600 mt-1">de chaque mois</div>
              </div>
            )}
          </div>
        )}

        {/* Navigation tabs */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          {[
            { key: 'overview', label: 'Vue d\'ensemble', icon: <TrendingUp className="w-4 h-4" /> },
            { key: 'documents', label: 'Documents', icon: <FileText className="w-4 h-4" /> },
            { key: 'claims', label: 'Sinistres', icon: <AlertTriangle className="w-4 h-4" /> },
            { key: 'modifications', label: 'Modifications', icon: <User className="w-4 h-4" /> }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="space-y-6">
          {activeTab === 'overview' && (
            <>
              {isActive && contract && (
                <>
                  <AttestationManager
                    leadId={leadId}
                    contractId={contract.id}
                    viewMode="client"
                  />
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Accès rapide</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <button
                        onClick={() => setActiveTab('documents')}
                        className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-center"
                      >
                        <FileText className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                        <div className="text-sm font-medium text-gray-900">Documents</div>
                      </button>
                      <button
                        onClick={() => setActiveTab('claims')}
                        className="p-4 border border-gray-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-colors text-center"
                      >
                        <AlertTriangle className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                        <div className="text-sm font-medium text-gray-900">Déclarer un sinistre</div>
                      </button>
                      <button
                        onClick={() => setActiveTab('modifications')}
                        className="p-4 border border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors text-center"
                      >
                        <User className="w-8 h-8 text-green-600 mx-auto mb-2" />
                        <div className="text-sm font-medium text-gray-900">Modifier mon contrat</div>
                      </button>
                      <button
                        onClick={() => setShowChat(true)}
                        className="p-4 border border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors text-center"
                      >
                        <MessageSquare className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                        <div className="text-sm font-medium text-gray-900">Contacter Léa</div>
                      </button>
                    </div>
                  </div>
                </>
              )}

              {!isActive && (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                  <Clock className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Votre contrat est en cours de traitement
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Nous préparons votre dossier. Vous serez notifié par email et SMS à chaque étape.
                  </p>
                  <button
                    onClick={() => setShowChat(true)}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  >
                    Besoin d'aide ? Contactez Léa
                  </button>
                </div>
              )}
            </>
          )}

          {activeTab === 'documents' && contract && (
            <ClientCompleteDocuments leadId={leadId} contractId={contract.id} />
          )}

          {activeTab === 'claims' && contract && isActive && (
            <ClientClaimsManager leadId={leadId} contractId={contract.id} />
          )}

          {activeTab === 'modifications' && contract && isActive && (
            <ModificationRequests
              leadId={leadId}
              contractId={contract.id}
              viewMode="client"
            />
          )}
        </div>
      </div>

      {/* Chat Léa Modal */}
      {showChat && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Léa - Assistance TaxiAssur</h3>
                  <p className="text-xs text-gray-500">Disponible 24h/24</p>
                </div>
              </div>
              <button
                onClick={() => setShowChat(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <SmartChatBot leadId={leadId} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientUnifiedDashboard;
