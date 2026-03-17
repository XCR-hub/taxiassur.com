import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import {
  FileText, AlertCircle, DollarSign, Download, Calendar, Shield,
  Car, Building2, Phone, Mail, Clock, CheckCircle2, Loader2, Eye,
  Bell, TrendingUp, AlertTriangle, User, MapPin, ChevronRight
} from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';

interface Contract {
  id: string;
  contract_type: string;
  insurer_name: string;
  contract_number?: string;
  premium_ttc: number;
  payment_frequency: string;
  effective_date: string;
  renewal_date: string;
  status: string;
  main_guarantees?: string;
  franchise_amount?: number;
}

interface Claim {
  id: string;
  claim_type: string;
  claim_date: string;
  status: string;
  insurer_claim_number?: string;
  estimated_amount?: number;
  circumstances: string;
}

interface Alert {
  id: string;
  title: string;
  message: string;
  severity: string;
  trigger_date: string;
}

type TabType = 'contracts' | 'claims' | 'documents' | 'profile';

export default function ClientInsuranceSpace() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('contracts');

  useEffect(() => {
    if (!currentUser) {
      navigate('/espace-client');
      return;
    }
    loadData();
  }, [currentUser, navigate]);

  async function loadData() {
    if (!currentUser?.email) return;

    try {
      setLoading(true);

      // Trouver le lead ID depuis l'email
      const { data: leadData } = await supabase
        .from('crm_leads')
        .select('id')
        .eq('email', currentUser.email)
        .eq('status', 'CLIENT_ACTIF')
        .single();

      if (!leadData) {
        setLoading(false);
        return;
      }

      const leadId = leadData.id;

      // Charger les contrats
      const { data: contractsData } = await supabase
        .from('insurance_contracts')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      setContracts(contractsData || []);

      // Charger les sinistres
      const { data: claimsData } = await supabase
        .from('insurance_claims')
        .select('*')
        .eq('lead_id', leadId)
        .order('claim_date', { ascending: false });

      setClaims(claimsData || []);

      // Charger les alertes non-dismissées
      const { data: alertsData } = await supabase
        .from('client_alerts')
        .select('*')
        .eq('lead_id', leadId)
        .eq('dismissed', false)
        .order('trigger_date', { ascending: true });

      setAlerts(alertsData || []);

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  const getContractTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'auto_taxi': 'Auto Taxi',
      'rc_pro_taxi': 'RC Pro Taxi',
      'protection_juridique': 'Protection Juridique',
      'prevoyance': 'Prévoyance',
      'sante_tns': 'Santé TNS',
      'multirisque_pro': 'Multirisque Pro'
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'active': 'bg-green-500/20 text-green-400 border-green-500/30',
      'suspended': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      'terminated': 'bg-red-500/20 text-red-400 border-red-500/30'
    };
    const labels: Record<string, string> = {
      'active': 'Actif',
      'suspended': 'Suspendu',
      'terminated': 'Résilié'
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${styles[status] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}>
        {labels[status] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Mon Espace Assurance</h1>
              <p className="text-gray-600 mt-1">Gérez vos contrats et sinistres en toute simplicité</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/espace-client')}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Retour
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Alerts Section */}
        {alerts.length > 0 && (
          <div className="mb-6 space-y-2">
            {alerts.map(alert => (
              <div
                key={alert.id}
                className={`p-4 rounded-lg border ${
                  alert.severity === 'critical'
                    ? 'bg-red-50 border-red-200'
                    : alert.severity === 'warning'
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-yellow-50 border-yellow-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  {alert.severity === 'critical' ? (
                    <AlertTriangle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                  ) : alert.severity === 'warning' ? (
                    <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
                  ) : (
                    <Bell className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
                  )}
                  <div>
                    <h4 className="font-semibold text-gray-900">{alert.title}</h4>
                    <p className="text-sm text-gray-600">{alert.message}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl p-6 text-black shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-black/70 text-sm font-medium">Contrats Actifs</p>
                <p className="text-3xl font-bold mt-2">
                  {contracts.filter(c => c.status === 'active').length}
                </p>
              </div>
              <FileText className="h-12 w-12 text-black/30" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Prime Totale/an</p>
                <p className="text-3xl font-bold mt-2">
                  {new Intl.NumberFormat('fr-FR', {
                    style: 'currency',
                    currency: 'EUR',
                    maximumFractionDigits: 0
                  }).format(
                    contracts
                      .filter(c => c.status === 'active')
                      .reduce((sum, c) => sum + c.premium_ttc, 0)
                  )}
                </p>
              </div>
              <DollarSign className="h-12 w-12 text-green-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Sinistres en Cours</p>
                <p className="text-3xl font-bold mt-2">
                  {claims.filter(c => !['settled', 'closed', 'rejected'].includes(c.status)).length}
                </p>
              </div>
              <AlertCircle className="h-12 w-12 text-gray-600" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px space-x-8">
              {[
                { id: 'contracts', label: 'Mes Contrats', icon: FileText },
                { id: 'claims', label: 'Mes Sinistres', icon: AlertCircle },
                { id: 'documents', label: 'Documents', icon: Download },
                { id: 'profile', label: 'Mon Profil', icon: User }
              ].map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className={`flex items-center gap-2 px-1 py-4 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-yellow-500 text-yellow-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon size={18} />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {activeTab === 'contracts' && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-6">Mes Contrats d'Assurance</h2>

              {contracts.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="mx-auto mb-3" size={48} />
                  <p>Aucun contrat actif</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {contracts.map(contract => (
                    <div
                      key={contract.id}
                      className="border border-gray-200 rounded-lg p-6 hover:border-yellow-300 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-bold text-gray-900">
                              {getContractTypeLabel(contract.contract_type)}
                            </h3>
                            {getStatusBadge(contract.status)}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Building2 size={16} />
                            <span>{contract.insurer_name}</span>
                            {contract.contract_number && (
                              <span className="text-gray-400">• N° {contract.contract_number}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-yellow-600">
                            {contract.premium_ttc.toFixed(2)} €
                          </p>
                          <p className="text-sm text-gray-600 capitalize">{contract.payment_frequency}</p>
                        </div>
                      </div>

                      {contract.main_guarantees && (
                        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-600 font-medium mb-1">Garanties principales</p>
                          <p className="text-sm text-gray-700">{contract.main_guarantees}</p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600 flex items-center gap-1">
                            <Calendar size={14} />
                            Date effet
                          </p>
                          <p className="font-semibold text-gray-900 mt-1">
                            {new Date(contract.effective_date).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600 flex items-center gap-1">
                            <TrendingUp size={14} />
                            Renouvellement
                          </p>
                          <p className="font-semibold text-gray-900 mt-1">
                            {new Date(contract.renewal_date).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                        {contract.franchise_amount && (
                          <div>
                            <p className="text-gray-600">Franchise</p>
                            <p className="font-semibold text-gray-900 mt-1">
                              {contract.franchise_amount.toFixed(2)} €
                            </p>
                          </div>
                        )}
                        <div className="flex items-center justify-end gap-2">
                          <button
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Télécharger le contrat"
                          >
                            <Download size={18} className="text-gray-600" />
                          </button>
                          <button
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Voir les détails"
                          >
                            <Eye size={18} className="text-gray-600" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'claims' && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-6">Mes Sinistres</h2>

              {claims.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <CheckCircle2 className="mx-auto mb-3 text-green-500" size={48} />
                  <p className="font-semibold text-gray-900 mb-1">Aucun sinistre déclaré</p>
                  <p className="text-sm">Vous n'avez aucun sinistre en cours</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {claims.map(claim => (
                    <div
                      key={claim.id}
                      className="border border-gray-200 rounded-lg p-6"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 mb-1">
                            {claim.claim_type.replace(/_/g, ' ').toUpperCase()}
                          </h3>
                          <div className="flex items-center gap-3 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Calendar size={14} />
                              {new Date(claim.claim_date).toLocaleDateString('fr-FR')}
                            </span>
                            {claim.insurer_claim_number && (
                              <span>N° {claim.insurer_claim_number}</span>
                            )}
                          </div>
                        </div>
                        {getStatusBadge(claim.status)}
                      </div>
                      <p className="text-sm text-gray-700 mb-3">{claim.circumstances}</p>
                      {claim.estimated_amount && (
                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign size={14} className="text-gray-400" />
                          <span className="text-gray-600">
                            Montant estimé: {claim.estimated_amount.toFixed(2)} €
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'documents' && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-6">Mes Documents</h2>
              <div className="text-center py-12 text-gray-500">
                <Download className="mx-auto mb-3" size={48} />
                <p>Aucun document disponible pour le moment</p>
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-6">Mon Profil</h2>
              <div className="max-w-2xl">
                <div className="space-y-4">
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <User className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-1">Informations personnelles</h4>
                        <p className="text-sm text-gray-600">
                          Pour modifier vos informations, veuillez contacter votre conseiller.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Email</p>
                      <p className="font-medium text-gray-900">{currentUser?.email}</p>
                    </div>
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Téléphone</p>
                      <p className="font-medium text-gray-900">-</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Contact Section */}
        <div className="mt-8 bg-black rounded-xl p-6 text-white border border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold mb-2">Besoin d'aide ?</h3>
              <p className="text-gray-400">Notre équipe est là pour vous accompagner</p>
            </div>
            <div className="flex gap-3">
              <a
                href="tel:0180855786"
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-semibold rounded-lg hover:from-yellow-600 hover:to-yellow-700 transition-colors"
              >
                <Phone size={18} />
                01 80 85 57 86
              </a>
              <a
                href="mailto:team@taxiassur.com"
                className="flex items-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors"
              >
                <Mail size={18} />
                Email
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
