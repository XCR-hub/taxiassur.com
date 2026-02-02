import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  Briefcase,
  TrendingUp,
  AlertCircle,
  Calendar,
  DollarSign,
  Users,
  FileText,
  CheckCircle,
  Clock,
  Search,
  Filter,
  Download,
  ArrowRight,
  Car,
  Phone,
  Mail,
  Building2
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface ContractPortfolio {
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
  payment_status: string;
  vehicles_count: number;
  claims_count: number;
  last_claim_date: string | null;
  modifications_count: number;
  renewal_probability: number;
  has_pending_actions: boolean;
  pending_actions: any[];
  alerts: any[];
  last_contact_date: string | null;
  next_followup_date: string | null;
  created_at: string;
  insurance_company?: {
    name: string;
    logo_url: string | null;
  };
}

interface PortfolioStats {
  total_contracts: number;
  active_contracts: number;
  total_premium: number;
  pending_renewals: number;
  late_payments: number;
  pending_actions: number;
}

export default function CRMGestionPortfolio() {
  const [contracts, setContracts] = useState<ContractPortfolio[]>([]);
  const [stats, setStats] = useState<PortfolioStats>({
    total_contracts: 0,
    active_contracts: 0,
    total_premium: 0,
    pending_renewals: 0,
    late_payments: 0,
    pending_actions: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const { data: contractsData, error: contractsError } = await supabase
        .from('contract_portfolio')
        .select(`
          *,
          insurance_companies (
            name,
            logo_url
          )
        `)
        .order('created_at', { ascending: false });

      if (contractsError) throw contractsError;

      const portfolioContracts = (contractsData || []).map(contract => ({
        ...contract,
        insurance_company: contract.insurance_companies
      }));

      setContracts(portfolioContracts);

      const activeContracts = portfolioContracts.filter(c => c.status === 'active');
      const totalPremium = activeContracts.reduce((sum, c) => sum + (c.annual_premium_ttc || 0), 0);

      const today = new Date();
      const next60Days = new Date(today.getTime() + (60 * 24 * 60 * 60 * 1000));
      const pendingRenewals = activeContracts.filter(c => {
        if (!c.renewal_date) return false;
        const renewalDate = new Date(c.renewal_date);
        return renewalDate >= today && renewalDate <= next60Days;
      }).length;

      const latePayments = portfolioContracts.filter(c =>
        c.payment_status === 'late' || c.payment_status === 'very_late'
      ).length;

      const pendingActions = portfolioContracts.filter(c => c.has_pending_actions).length;

      setStats({
        total_contracts: portfolioContracts.length,
        active_contracts: activeContracts.length,
        total_premium: totalPremium,
        pending_renewals: pendingRenewals,
        late_payments: latePayments,
        pending_actions: pendingActions
      });

    } catch (error) {
      console.error('Error loading portfolio:', error);
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
      <span className={`px-2 py-1 text-xs font-medium rounded ${badge.className}`}>
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
      <span className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded ${badge.className}`}>
        <Icon className="w-3 h-3" />
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

  const filteredContracts = contracts.filter(contract => {
    const matchesSearch = searchTerm === '' ||
      contract.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.contract_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.client_email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || contract.status === statusFilter;
    const matchesPayment = paymentFilter === 'all' || contract.payment_status === paymentFilter;

    return matchesSearch && matchesStatus && matchesPayment;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Chargement du portefeuille...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Briefcase className="w-8 h-8 text-blue-600" />
            CRM Gestion - Portefeuille de Contrats
          </h1>
          <p className="text-gray-600 mt-2">
            Gérez vos contrats actifs, suivez les renouvellements et les paiements
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Contrats Actifs</p>
                <p className="text-3xl font-bold text-gray-900">{stats.active_contracts}</p>
                <p className="text-xs text-gray-500 mt-1">sur {stats.total_contracts} total</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <FileText className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Prime Totale Annuelle</p>
                <p className="text-3xl font-bold text-gray-900">{formatCurrency(stats.total_premium)}</p>
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  Portefeuille actif
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Renouvellements à Venir</p>
                <p className="text-3xl font-bold text-gray-900">{stats.pending_renewals}</p>
                <p className="text-xs text-orange-600 mt-1">Dans les 60 prochains jours</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <Calendar className="w-8 h-8 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Paiements en Retard</p>
                <p className="text-3xl font-bold text-gray-900">{stats.late_payments}</p>
                <p className="text-xs text-red-600 mt-1">Nécessite action</p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Actions Pendantes</p>
                <p className="text-3xl font-bold text-gray-900">{stats.pending_actions}</p>
                <p className="text-xs text-purple-600 mt-1">À traiter</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Clock className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-sm p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 mb-1">Taux de Rétention</p>
                <p className="text-3xl font-bold">94%</p>
                <p className="text-xs text-blue-100 mt-1">Moyenne des 12 derniers mois</p>
              </div>
              <div className="p-3 bg-white/20 rounded-lg">
                <TrendingUp className="w-8 h-8" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Rechercher par nom, email, n° contrat..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tous les statuts</option>
              <option value="active">Actifs</option>
              <option value="suspended">Suspendus</option>
              <option value="pending_cancellation">En résiliation</option>
              <option value="cancelled">Résiliés</option>
            </select>

            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tous les paiements</option>
              <option value="up_to_date">À jour</option>
              <option value="late">En retard</option>
              <option value="very_late">Retard important</option>
            </select>
          </div>
        </div>

        {/* Contracts List */}
        {filteredContracts.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <Briefcase className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucun contrat trouvé</h3>
            <p className="text-gray-600">
              {searchTerm || statusFilter !== 'all' || paymentFilter !== 'all'
                ? 'Essayez de modifier vos filtres de recherche'
                : 'Les contrats apparaîtront ici une fois que les prospects seront convertis en clients'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredContracts.map(contract => {
              const daysUntilRenewal = getDaysUntilRenewal(contract.renewal_date);
              const isRenewalSoon = daysUntilRenewal !== null && daysUntilRenewal <= 60 && daysUntilRenewal >= 0;

              return (
                <div
                  key={contract.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        {contract.insurance_company?.logo_url ? (
                          <img
                            src={contract.insurance_company.logo_url}
                            alt={contract.insurance_company.name}
                            className="w-10 h-10 object-contain"
                          />
                        ) : (
                          <Building2 className="w-10 h-10 text-gray-400" />
                        )}
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {contract.client_name}
                          </h3>
                          <p className="text-sm text-gray-600">
                            Contrat N° {contract.contract_number}
                          </p>
                        </div>
                        {getStatusBadge(contract.status)}
                        {getPaymentStatusBadge(contract.payment_status)}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Compagnie</p>
                          <p className="text-sm font-medium text-gray-900">
                            {contract.insurance_company?.name || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Prime Annuelle TTC</p>
                          <p className="text-sm font-medium text-gray-900">
                            {formatCurrency(contract.annual_premium_ttc)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Véhicules</p>
                          <p className="text-sm font-medium text-gray-900 flex items-center gap-1">
                            <Car className="w-4 h-4 text-gray-400" />
                            {contract.vehicles_count}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Échéance</p>
                          <p className="text-sm font-medium text-gray-900">
                            {new Date(contract.expiry_date).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        {contract.client_email && (
                          <a
                            href={`mailto:${contract.client_email}`}
                            className="flex items-center gap-1 hover:text-blue-600"
                          >
                            <Mail className="w-4 h-4" />
                            {contract.client_email}
                          </a>
                        )}
                        {contract.client_phone && (
                          <a
                            href={`tel:${contract.client_phone}`}
                            className="flex items-center gap-1 hover:text-blue-600"
                          >
                            <Phone className="w-4 h-4" />
                            {contract.client_phone}
                          </a>
                        )}
                        {contract.claims_count > 0 && (
                          <span className="flex items-center gap-1 text-orange-600">
                            <AlertCircle className="w-4 h-4" />
                            {contract.claims_count} sinistre(s)
                          </span>
                        )}
                      </div>

                      {/* Alerts */}
                      {(isRenewalSoon || contract.has_pending_actions) && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {isRenewalSoon && (
                            <div className="px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg text-sm">
                              <span className="font-medium text-orange-900">
                                Renouvellement dans {daysUntilRenewal} jours
                              </span>
                            </div>
                          )}
                          {contract.has_pending_actions && (
                            <div className="px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg text-sm">
                              <span className="font-medium text-purple-900">
                                {contract.pending_actions.length} action(s) pendante(s)
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <Link
                      to={`/admin/crm-gestion/contrat/${contract.id}`}
                      className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      Ouvrir
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
