import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Users, Search, Filter, ChevronRight, Phone, Mail, MapPin, Calendar, FileText, Receipt, Clock, CheckCircle2, AlertCircle, MoreVertical, TrendingUp, Shield, DollarSign, Car, Building2, Download, Send, MessageSquare, Eye, CreditCard as Edit, Loader2, ArrowUpDown, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  city: string;
  postal_code: string;
  vehicle_info: any;
  status: string;
  pipeline_stage: string;
  created_at: string;
  updated_at: string;
  last_contact_date: string;
  insurance_company: string;
  contract_start_date: string;
  contract_annual_premium: number;
}

interface Stats {
  total_clients: number;
  active_contracts: number;
  total_premium: number;
  renewal_due_30days: number;
}

export default function ClientsManager() {
  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCompany, setFilterCompany] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'premium'>('date');
  const [companies, setCompanies] = useState<string[]>([]);

  useEffect(() => {
    loadClientsAndStats();
    loadCompanies();
  }, []);

  async function loadClientsAndStats() {
    try {
      // Charger les clients actifs
      const { data: clientsData, error: clientsError } = await supabase
        .from('crm_leads')
        .select('*')
        .eq('status', 'CLIENT_ACTIF')
        .order('updated_at', { ascending: false });

      if (clientsError) throw clientsError;

      setClients(clientsData || []);

      // Calculer les stats
      const totalClients = clientsData?.length || 0;
      const totalPremium = clientsData?.reduce((sum, c) => sum + (c.contract_annual_premium || 0), 0) || 0;

      // Calculer les renouvellements dans 30 jours
      const now = new Date();
      const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const renewalDue = clientsData?.filter(c => {
        if (!c.contract_start_date) return false;
        const contractDate = new Date(c.contract_start_date);
        const renewalDate = new Date(contractDate.getTime() + 365 * 24 * 60 * 60 * 1000);
        return renewalDate >= now && renewalDate <= in30Days;
      }).length || 0;

      setStats({
        total_clients: totalClients,
        active_contracts: totalClients,
        total_premium: totalPremium,
        renewal_due_30days: renewalDue
      });

    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadCompanies() {
    try {
      const { data, error } = await supabase
        .from('insurance_companies')
        .select('name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setCompanies(data?.map(c => c.name) || []);
    } catch (error) {
      console.error('Error loading companies:', error);
    }
  }

  const filteredClients = clients
    .filter(client => {
      const matchesSearch =
        client.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.phone?.includes(searchTerm);

      const matchesCompany = filterCompany === 'all' || client.insurance_company === filterCompany;

      return matchesSearch && matchesCompany;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.last_name || '').localeCompare(b.last_name || '');
        case 'premium':
          return (b.contract_annual_premium || 0) - (a.contract_annual_premium || 0);
        case 'date':
        default:
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-yellow-50/10 to-gray-50">
      <div className="p-6 max-w-[1800px] mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-lg">
                  <Users className="h-8 w-8 text-black" />
                </div>
                Gestion des Clients Actifs
              </h1>
              <p className="text-gray-600 mt-2 text-lg">
                Suivi et gestion de votre portefeuille clients
              </p>
            </div>
            <button className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-yellow-600 to-yellow-500 text-black rounded-xl hover:from-yellow-700 hover:to-yellow-600 shadow-lg hover:shadow-xl transition-all font-semibold">
              <Download className="h-5 w-5" />
              Exporter
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all border border-gray-100 group">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-yellow-50 rounded-xl group-hover:bg-yellow-100 transition-colors">
                  <Users className="h-7 w-7 text-yellow-600" />
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-gray-900">{stats.total_clients}</p>
                </div>
              </div>
              <p className="text-sm font-semibold text-gray-700">Clients Actifs</p>
              <p className="text-xs text-gray-500 mt-1">Portefeuille total</p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all border border-gray-100 group">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-50 rounded-xl group-hover:bg-green-100 transition-colors">
                  <CheckCircle2 className="h-7 w-7 text-green-600" />
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-gray-900">{stats.active_contracts}</p>
                </div>
              </div>
              <p className="text-sm font-semibold text-gray-700">Contrats Actifs</p>
              <p className="text-xs text-gray-500 mt-1">En cours</p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all border border-gray-100 group">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-cyan-50 rounded-xl group-hover:bg-cyan-100 transition-colors">
                  <DollarSign className="h-7 w-7 text-cyan-600" />
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">
                    {new Intl.NumberFormat('fr-FR', {
                      style: 'currency',
                      currency: 'EUR',
                      maximumFractionDigits: 0
                    }).format(stats.total_premium)}
                  </p>
                </div>
              </div>
              <p className="text-sm font-semibold text-gray-700">Primes Annuelles</p>
              <p className="text-xs text-gray-500 mt-1">Volume total</p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all border border-gray-100 group">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-orange-50 rounded-xl group-hover:bg-orange-100 transition-colors">
                  <Clock className="h-7 w-7 text-orange-600" />
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-gray-900">{stats.renewal_due_30days}</p>
                </div>
              </div>
              <p className="text-sm font-semibold text-gray-700">Renouvellements 30j</p>
              <p className="text-xs text-gray-500 mt-1">À traiter</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher un client (nom, email, téléphone)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Company Filter */}
            <div className="w-full md:w-64">
              <div className="relative">
                <Building2 className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 z-10" />
                <select
                  value={filterCompany}
                  onChange={(e) => setFilterCompany(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 focus:bg-white appearance-none transition-all cursor-pointer"
                >
                  <option value="all">Toutes les compagnies</option>
                  {companies.map(company => (
                    <option key={company} value={company}>{company}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Sort */}
            <div className="w-full md:w-56">
              <div className="relative">
                <ArrowUpDown className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 z-10" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 focus:bg-white appearance-none transition-all cursor-pointer"
                >
                  <option value="date">Date mise à jour</option>
                  <option value="name">Nom (A-Z)</option>
                  <option value="premium">Prime (plus élevée)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4 text-sm font-medium text-gray-700 flex items-center gap-2">
          <div className="h-2 w-2 bg-yellow-500 rounded-full"></div>
          {filteredClients.length} client{filteredClients.length > 1 ? 's' : ''} trouvé{filteredClients.length > 1 ? 's' : ''}
        </div>

        {/* Clients Table */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-yellow-50/30 border-b-2 border-gray-200">
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Compagnie
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Prime Annuelle
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Date Contrat
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-yellow-50/30 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center shadow-md">
                          <span className="text-black font-bold text-sm">
                            {client.first_name?.[0]}{client.last_name?.[0]}
                          </span>
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 text-base">
                            {client.first_name} {client.last_name}
                          </div>
                          <div className="flex items-center gap-1 text-sm text-gray-500 mt-0.5">
                            <MapPin className="h-3.5 w-3.5" />
                            {client.city}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <Mail className="h-4 w-4 text-yellow-500" />
                          <a href={`mailto:${client.email}`} className="hover:text-yellow-600 hover:underline font-medium">
                            {client.email}
                          </a>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <Phone className="h-4 w-4 text-green-500" />
                          <a href={`tel:${client.phone}`} className="hover:text-green-600 hover:underline font-medium">
                            {client.phone}
                          </a>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-gray-100 rounded-lg">
                          <Building2 className="h-4 w-4 text-gray-600" />
                        </div>
                        <span className="text-sm font-semibold text-gray-900">
                          {client.insurance_company || 'Non renseigné'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-green-50 rounded-lg">
                          <DollarSign className="h-4 w-4 text-green-600" />
                        </div>
                        <span className="text-sm font-bold text-gray-900">
                          {client.contract_annual_premium
                            ? new Intl.NumberFormat('fr-FR', {
                                style: 'currency',
                                currency: 'EUR'
                              }).format(client.contract_annual_premium)
                            : '-'
                          }
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-yellow-50 rounded-lg">
                          <Calendar className="h-4 w-4 text-yellow-600" />
                        </div>
                        <span className="text-sm font-medium text-gray-700">
                          {client.contract_start_date
                            ? new Date(client.contract_start_date).toLocaleDateString('fr-FR')
                            : '-'
                          }
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/backoffice/clients/${client.id}`}
                          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 text-black rounded-xl transition-all text-sm font-semibold shadow-md hover:shadow-lg"
                          title="Gérer ce client"
                        >
                          <Shield className="h-4 w-4" />
                          Gérer
                        </Link>
                        <Link
                          to={`/backoffice/crm-killer/lead/${client.id}`}
                          className="p-2.5 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                          title="Voir la fiche CRM"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <button
                          className="p-2.5 text-green-600 hover:bg-green-50 rounded-xl transition-colors"
                          title="Contacter"
                        >
                          <MessageSquare className="h-4 w-4" />
                        </button>
                        <button
                          className="p-2.5 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                          title="Plus d'actions"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredClients.length === 0 && (
            <div className="text-center py-16 bg-gray-50">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-gray-100 rounded-2xl">
                  <Users className="h-12 w-12 text-gray-400" />
                </div>
              </div>
              <p className="text-gray-900 font-semibold text-lg">Aucun client trouvé</p>
              <p className="text-gray-500 text-sm mt-2 max-w-md mx-auto">
                {searchTerm || filterCompany !== 'all'
                  ? 'Essayez de modifier vos filtres de recherche'
                  : 'Les prospects finalisés apparaîtront ici automatiquement'
                }
              </p>
            </div>
          )}
        </div>

        {/* Quick Info */}
        <div className="mt-8 bg-gradient-to-br from-yellow-50 to-amber-50 border-2 border-yellow-200 rounded-2xl p-6 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-md flex-shrink-0">
              <Activity className="h-6 w-6 text-black" />
            </div>
            <div>
              <p className="font-bold text-yellow-900 text-lg mb-2">Gestion des Clients Actifs</p>
              <p className="text-yellow-800 leading-relaxed">
                Cette page affiche tous les prospects transformés en clients actifs (statut <span className="font-semibold bg-yellow-100 px-2 py-0.5 rounded">CLIENT_ACTIF</span>).
                Utilisez les filtres pour affiner votre recherche et cliquez sur un client pour accéder à sa fiche complète.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
