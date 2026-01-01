import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import {
  Users,
  FileText,
  CheckCircle,
  Clock,
  Mail,
  Phone,
  MessageSquare,
  DollarSign,
  FileSignature,
  AlertCircle,
  TrendingUp,
  Calendar,
  Eye,
  Download
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface LeadWithStatus {
  lead_id: string;
  lead_name: string;
  lead_email: string;
  lead_phone: string;
  lead_status: string;
  current_stage: string;
  stage_category: string;
  documents_complete: boolean;
  info_complete: boolean;
  missing_documents: string[];
  missing_info: string[];
  days_in_current_stage: number;
  total_communications: number;
  last_communication_date: string;
  has_pending_reminders: boolean;
  created_at: string;
}

export default function PipelineCRMDashboard() {
  const [leads, setLeads] = useState<LeadWithStatus[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [selectedLead, setSelectedLead] = useState<LeadWithStatus | null>(null);
  const [communications, setCommunications] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStage, setFilterStage] = useState<string>('all');

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(loadDashboard, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedLead) {
      loadLeadDetails(selectedLead.lead_id);
    }
  }, [selectedLead]);

  const loadDashboard = async () => {
    try {
      const { data: leadsData } = await supabase.rpc('get_leads_with_pipeline_status');
      setLeads(leadsData || []);

      const { data: statsData } = await supabase.rpc('get_pipeline_statistics');
      setStatistics(statsData);

      setLoading(false);
    } catch (error) {
      logger.error('Error loading dashboard:', error);
      setLoading(false);
    }
  };

  const loadLeadDetails = async (leadId: string) => {
    const { data: commsData } = await supabase
      .from('lead_communications')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    setCommunications(commsData || []);

    const { data: docsData } = await supabase
      .from('lead_documents')
      .select('*')
      .eq('lead_id', leadId);

    setDocuments(docsData || []);
  };

  const getStageColor = (category: string) => {
    const colors: Record<string, string> = {
      acquisition: 'bg-blue-100 text-blue-700',
      qualification: 'bg-yellow-100 text-yellow-700',
      devis: 'bg-purple-100 text-purple-700',
      paiement: 'bg-orange-100 text-orange-700',
      contrat: 'bg-green-100 text-green-700',
      client: 'bg-emerald-100 text-emerald-700'
    };
    return colors[category] || 'bg-gray-100 text-gray-700';
  };

  const getStageLabel = (stage: string) => {
    const labels: Record<string, string> = {
      nouveau_lead: 'Nouveau Lead',
      informations_collecte: 'Collecte Infos',
      documents_attente: 'Docs en Attente',
      documents_complets: 'Docs Complets',
      verification_eligibilite: 'Vérification',
      devis_preparation: 'Préparation Devis',
      devis_envoye: 'Devis Envoyé',
      devis_accepte: 'Devis Accepté',
      paiement_attente: 'Attente Paiement',
      paiement_recu: 'Paiement Reçu',
      contrat_preparation: 'Préparation Contrat',
      contrat_signature: 'Signature en Cours',
      contrat_signe: 'Contrat Signé',
      client_actif: 'Client Actif'
    };
    return labels[stage] || stage;
  };

  const getDocumentLabel = (docType: string) => {
    const labels: Record<string, string> = {
      cni: 'CNI',
      kbis: 'Kbis',
      carte_pro: 'Carte Pro',
      carte_grise: 'Carte Grise',
      releve_sinistre: 'Relevé Sinistres',
      rib: 'RIB',
      autorisation_stationnement: 'Autorisation Stationnement'
    };
    return labels[docType] || docType;
  };

  const filteredLeads = filterStage === 'all'
    ? leads
    : leads.filter(l => l.current_stage === filterStage);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Pipeline CRM Commercial
        </h1>
        <p className="text-gray-600">
          Gestion complète du cycle de vie prospects → clients
        </p>
      </div>

      {/* Statistiques */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <Users className="w-8 h-8 text-blue-600" />
              <span className="text-sm text-gray-500">Total</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">{statistics.total_leads}</div>
            <div className="text-sm text-gray-600 mt-1">
              {statistics.new_leads_today} nouveaux aujourd'hui
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <FileText className="w-8 h-8 text-yellow-600" />
              <span className="text-sm text-gray-500">Documents</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">{statistics.documents_pending}</div>
            <div className="text-sm text-gray-600 mt-1">en attente</div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <DollarSign className="w-8 h-8 text-purple-600" />
              <span className="text-sm text-gray-500">Devis</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">{statistics.quotes_pending}</div>
            <div className="text-sm text-gray-600 mt-1">en attente réponse</div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <span className="text-sm text-gray-500">Clients</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">{statistics.active_clients}</div>
            <div className="text-sm text-gray-600 mt-1">
              Taux conversion: {statistics.conversion_rate_percent}%
            </div>
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
        <div className="flex gap-2 overflow-x-auto">
          <button
            onClick={() => setFilterStage('all')}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${
              filterStage === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Tous ({leads.length})
          </button>
          {Object.entries(statistics?.leads_by_stage || {}).map(([stage, count]: [string, any]) => (
            <button
              key={stage}
              onClick={() => setFilterStage(stage)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${
                filterStage === stage
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {getStageLabel(stage)} ({count})
            </button>
          ))}
        </div>
      </div>

      {/* Liste des leads */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-lg">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Leads</h2>
          </div>
          <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
            {filteredLeads.map((lead) => (
              <div
                key={lead.lead_id}
                onClick={() => setSelectedLead(lead)}
                className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                  selectedLead?.lead_id === lead.lead_id ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900">{lead.lead_name}</h3>
                    <p className="text-sm text-gray-600">{lead.lead_email}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStageColor(lead.stage_category)}`}>
                    {getStageLabel(lead.current_stage)}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {lead.days_in_current_stage}j dans cette étape
                  </span>
                  <span className="flex items-center gap-1">
                    <Mail className="w-4 h-4" />
                    {lead.total_communications} messages
                  </span>
                </div>

                {!lead.documents_complete && (
                  <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 px-2 py-1 rounded">
                    <AlertCircle className="w-4 h-4" />
                    {lead.missing_documents.length} document(s) manquant(s)
                  </div>
                )}

                {lead.has_pending_reminders && (
                  <div className="flex items-center gap-2 text-sm text-yellow-600 bg-yellow-50 px-2 py-1 rounded mt-2">
                    <Calendar className="w-4 h-4" />
                    Relance programmée
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Détail du lead sélectionné */}
        <div className="bg-white rounded-xl shadow-lg">
          {selectedLead ? (
            <>
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">
                    {selectedLead.lead_name}
                  </h2>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    <Eye className="w-4 h-4 inline mr-2" />
                    Voir le dossier complet
                  </button>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span>{selectedLead.lead_email}</span>
                  </div>
                  {selectedLead.lead_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span>{selectedLead.lead_phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Documents */}
              <div className="p-6 border-b border-gray-200">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Documents ({documents.length})
                </h3>
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {doc.status === 'validated' ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : doc.status === 'uploaded' ? (
                          <Clock className="w-5 h-5 text-yellow-600" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-red-600" />
                        )}
                        <div>
                          <div className="font-medium text-gray-900">
                            {getDocumentLabel(doc.document_type)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {doc.status === 'validated' ? 'Validé' :
                             doc.status === 'uploaded' ? 'En attente validation' :
                             'Manquant'}
                          </div>
                        </div>
                      </div>
                      {doc.file_url && (
                        <button className="text-blue-600 hover:text-blue-700">
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Historique des communications */}
              <div className="p-6">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Historique Communications ({communications.length})
                </h3>
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {communications.map((comm) => (
                    <div key={comm.id} className="border-l-4 border-blue-200 pl-4 py-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-900">
                          {comm.channel === 'email' ? '📧' :
                           comm.channel === 'sms' ? '📱' :
                           comm.channel === 'whatsapp' ? '💬' : '📞'}
                          {' '}{comm.communication_type}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(comm.created_at).toLocaleString('fr-FR')}
                        </span>
                      </div>
                      {comm.subject && (
                        <div className="text-sm font-medium text-gray-700 mb-1">
                          {comm.subject}
                        </div>
                      )}
                      <div className="text-sm text-gray-600 line-clamp-2">
                        {comm.content}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-xs px-2 py-1 rounded ${
                          comm.direction === 'inbound'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {comm.direction === 'inbound' ? '↓ Reçu' : '↑ Envoyé'}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          comm.status === 'delivered' ? 'bg-green-100 text-green-700' :
                          comm.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {comm.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-gray-500">
              Sélectionnez un lead pour voir les détails
            </div>
          )}
        </div>
      </div>

      {/* Stats supplémentaires */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="w-6 h-6 text-blue-600" />
              <h3 className="font-bold text-gray-900">Performance</h3>
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-gray-600">Délai moyen devis</div>
                <div className="text-2xl font-bold text-gray-900">
                  {statistics.average_time_to_quote_days?.toFixed(1) || 0} jours
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Taux de conversion</div>
                <div className="text-2xl font-bold text-gray-900">
                  {statistics.conversion_rate_percent}%
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="w-6 h-6 text-purple-600" />
              <h3 className="font-bold text-gray-900">Aujourd'hui</h3>
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-gray-600">Relances programmées</div>
                <div className="text-2xl font-bold text-gray-900">
                  {statistics.reminders_scheduled_today}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Communications envoyées</div>
                <div className="text-2xl font-bold text-gray-900">
                  {statistics.communications_sent_today}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <FileSignature className="w-6 h-6 text-green-600" />
              <h3 className="font-bold text-gray-900">En Cours</h3>
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-gray-600">Paiements en attente</div>
                <div className="text-2xl font-bold text-gray-900">
                  {statistics.payments_pending}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Contrats à signer</div>
                <div className="text-2xl font-bold text-gray-900">
                  {statistics.contracts_pending_signature}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
