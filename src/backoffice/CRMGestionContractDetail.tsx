import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  ArrowLeft,
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  Car,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  Edit,
  Save,
  X,
  Plus,
  Download,
  Eye,
  TrendingUp,
  Activity,
  MessageSquare
} from 'lucide-react';
import LeadDocumentsComplete from '../components/crm/LeadDocumentsComplete';

interface Contract {
  id: string;
  contract_number: string;
  client_name: string;
  client_email: string;
  client_phone: string | null;
  company_name: string | null;
  siret: string | null;
  assigned_to: string | null;
  status: string;
  activation_date: string;
  expiry_date: string;
  renewal_date: string | null;
  annual_premium_ht: number;
  annual_premium_ttc: number;
  payment_frequency: string;
  next_payment_date: string | null;
  payment_status: string;
  vehicles_count: number;
  vehicles: any[];
  claims_count: number;
  last_claim_date: string | null;
  modifications_count: number;
  last_modification_date: string | null;
  client_satisfaction_score: number | null;
  renewal_probability: number;
  has_pending_actions: boolean;
  pending_actions: any[];
  alerts: any[];
  last_contact_date: string | null;
  next_followup_date: string | null;
  lead_id: string | null;
  company_id: string | null;
  created_at: string;
  updated_at: string;
  insurance_companies?: {
    name: string;
    logo_url: string | null;
  };
}

export default function CRMGestionContractDetail() {
  const { contractId } = useParams<{ contractId: string }>();
  const navigate = useNavigate();
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'claims' | 'modifications' | 'communications'>('overview');

  useEffect(() => {
    if (contractId) {
      loadContract();
    }
  }, [contractId]);

  const loadContract = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('contract_portfolio')
        .select(`
          *,
          insurance_companies (
            name,
            logo_url
          )
        `)
        .eq('id', contractId)
        .single();

      if (error) throw error;
      setContract(data);
    } catch (error) {
      console.error('Error loading contract:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      active: { label: 'Actif', className: 'bg-green-100 text-green-800' },
      suspended: { label: 'Suspendu', className: 'bg-orange-100 text-orange-800' },
      pending_cancellation: { label: 'Résiliation en cours', className: 'bg-yellow-100 text-yellow-800' },
      cancelled: { label: 'Résilié', className: 'bg-red-100 text-red-800' },
      expired: { label: 'Expiré', className: 'bg-gray-100 text-gray-800' }
    };
    const badge = badges[status] || badges.active;
    return (
      <span className={`px-3 py-1 text-sm font-medium rounded-lg ${badge.className}`}>
        {badge.label}
      </span>
    );
  };

  const getPaymentStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; className: string; icon: any }> = {
      up_to_date: { label: 'À jour', className: 'bg-green-100 text-green-800', icon: CheckCircle },
      late: { label: 'Retard', className: 'bg-orange-100 text-orange-800', icon: Clock },
      very_late: { label: 'Retard important', className: 'bg-red-100 text-red-800', icon: AlertCircle }
    };
    const badge = badges[status] || badges.up_to_date;
    const Icon = badge.icon;
    return (
      <span className={`flex items-center gap-2 px-3 py-1 text-sm font-medium rounded-lg ${badge.className}`}>
        <Icon className="w-4 h-4" />
        {badge.label}
      </span>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const getDaysUntilRenewal = (renewalDate: string | null) => {
    if (!renewalDate) return null;
    const today = new Date();
    const renewal = new Date(renewalDate);
    const diffTime = renewal.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Chargement du contrat...</p>
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Contrat introuvable</h2>
          <p className="text-gray-600 mb-6">Le contrat demandé n'existe pas ou a été supprimé.</p>
          <Link
            to="/backoffice/crm-gestion"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Retour au portefeuille
          </Link>
        </div>
      </div>
    );
  }

  const daysUntilRenewal = getDaysUntilRenewal(contract.renewal_date);
  const isRenewalSoon = daysUntilRenewal !== null && daysUntilRenewal <= 60 && daysUntilRenewal >= 0;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            to="/backoffice/crm-gestion"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Retour au portefeuille
          </Link>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                {contract.insurance_companies?.logo_url ? (
                  <img
                    src={contract.insurance_companies.logo_url}
                    alt={contract.insurance_companies.name}
                    className="w-16 h-16 object-contain"
                  />
                ) : (
                  <Building2 className="w-16 h-16 text-gray-400" />
                )}
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{contract.client_name}</h1>
                  <p className="text-gray-600 mt-1">Contrat N° {contract.contract_number}</p>
                  <div className="flex items-center gap-3 mt-3">
                    {getStatusBadge(contract.status)}
                    {getPaymentStatusBadge(contract.payment_status)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  <MessageSquare className="w-5 h-5" />
                </button>
                <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  <Edit className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Alerts */}
            {(isRenewalSoon || contract.has_pending_actions) && (
              <div className="mt-6 flex flex-wrap gap-3">
                {isRenewalSoon && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-200 rounded-lg">
                    <Clock className="w-5 h-5 text-orange-600" />
                    <span className="font-medium text-orange-900">
                      Renouvellement dans {daysUntilRenewal} jours
                    </span>
                  </div>
                )}
                {contract.has_pending_actions && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 border border-purple-200 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-purple-600" />
                    <span className="font-medium text-purple-900">
                      {contract.pending_actions.length} action(s) pendante(s)
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Prime Annuelle TTC</span>
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(contract.annual_premium_ttc)}</p>
            <p className="text-xs text-gray-500 mt-1">HT: {formatCurrency(contract.annual_premium_ht)}</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Véhicules</span>
              <Car className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{contract.vehicles_count}</p>
            <p className="text-xs text-gray-500 mt-1">Assurés</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Sinistres</span>
              <AlertCircle className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{contract.claims_count}</p>
            <p className="text-xs text-gray-500 mt-1">
              {contract.last_claim_date
                ? `Dernier: ${new Date(contract.last_claim_date).toLocaleDateString('fr-FR')}`
                : 'Aucun'}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Renouvellement</span>
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{contract.renewal_probability}%</p>
            <p className="text-xs text-gray-500 mt-1">Probabilité</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex gap-2 p-2">
              {[
                { id: 'overview', label: 'Vue d\'ensemble', icon: Activity },
                { id: 'documents', label: 'Documents', icon: FileText },
                { id: 'claims', label: 'Sinistres', icon: AlertCircle },
                { id: 'modifications', label: 'Modifications', icon: Edit },
                { id: 'communications', label: 'Communications', icon: MessageSquare }
              ].map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Informations client */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Informations Client</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-start gap-3">
                      <User className="w-5 h-5 text-gray-400 mt-1" />
                      <div>
                        <p className="text-sm text-gray-600">Nom</p>
                        <p className="font-medium text-gray-900">{contract.client_name}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Mail className="w-5 h-5 text-gray-400 mt-1" />
                      <div>
                        <p className="text-sm text-gray-600">Email</p>
                        <a href={`mailto:${contract.client_email}`} className="font-medium text-blue-600 hover:underline">
                          {contract.client_email}
                        </a>
                      </div>
                    </div>
                    {contract.client_phone && (
                      <div className="flex items-start gap-3">
                        <Phone className="w-5 h-5 text-gray-400 mt-1" />
                        <div>
                          <p className="text-sm text-gray-600">Téléphone</p>
                          <a href={`tel:${contract.client_phone}`} className="font-medium text-blue-600 hover:underline">
                            {contract.client_phone}
                          </a>
                        </div>
                      </div>
                    )}
                    {contract.company_name && (
                      <div className="flex items-start gap-3">
                        <Building2 className="w-5 h-5 text-gray-400 mt-1" />
                        <div>
                          <p className="text-sm text-gray-600">Société</p>
                          <p className="font-medium text-gray-900">{contract.company_name}</p>
                          {contract.siret && (
                            <p className="text-xs text-gray-500">SIRET: {contract.siret}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Informations contrat */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Informations Contrat</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Compagnie</p>
                      <p className="font-medium text-gray-900">{contract.insurance_companies?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Date d'activation</p>
                      <p className="font-medium text-gray-900">
                        {new Date(contract.activation_date).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Date d'échéance</p>
                      <p className="font-medium text-gray-900">
                        {new Date(contract.expiry_date).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Fréquence de paiement</p>
                      <p className="font-medium text-gray-900 capitalize">{contract.payment_frequency}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Prochain paiement</p>
                      <p className="font-medium text-gray-900">
                        {contract.next_payment_date
                          ? new Date(contract.next_payment_date).toLocaleDateString('fr-FR')
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Modifications</p>
                      <p className="font-medium text-gray-900">{contract.modifications_count} avenant(s)</p>
                    </div>
                  </div>
                </div>

                {/* Véhicules */}
                {contract.vehicles && contract.vehicles.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Véhicules Assurés</h3>
                    <div className="space-y-3">
                      {contract.vehicles.map((vehicle: any, index: number) => (
                        <div key={index} className="p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Car className="w-5 h-5 text-gray-600" />
                              <div>
                                <p className="font-medium text-gray-900">
                                  {vehicle.brand} {vehicle.model}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {vehicle.immatriculation} • {vehicle.year}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'documents' && contract.lead_id && (
              <LeadDocumentsComplete leadId={contract.lead_id} />
            )}

            {activeTab === 'claims' && (
              <div className="text-center py-12">
                <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Gestion des Sinistres</h3>
                <p className="text-gray-600">
                  {contract.claims_count > 0
                    ? `${contract.claims_count} sinistre(s) enregistré(s)`
                    : 'Aucun sinistre enregistré pour ce contrat'}
                </p>
              </div>
            )}

            {activeTab === 'modifications' && (
              <div className="text-center py-12">
                <Edit className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Modifications et Avenants</h3>
                <p className="text-gray-600">
                  {contract.modifications_count > 0
                    ? `${contract.modifications_count} modification(s) enregistrée(s)`
                    : 'Aucune modification pour ce contrat'}
                </p>
              </div>
            )}

            {activeTab === 'communications' && (
              <div className="text-center py-12">
                <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Historique des Communications</h3>
                <p className="text-gray-600">
                  {contract.last_contact_date
                    ? `Dernier contact: ${new Date(contract.last_contact_date).toLocaleDateString('fr-FR')}`
                    : 'Aucune communication enregistrée'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
