import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Users, Search, Filter, ChevronRight, Phone, Mail, MapPin, Calendar,
  FileText, Receipt, Clock, CheckCircle2, AlertCircle, MoreVertical,
  TrendingUp, Shield, DollarSign, Car, Building2, Download, Send,
  MessageSquare, Eye, Edit, Loader2, ArrowUpDown, Activity
} from 'lucide-react';
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
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1800px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-600" />
              Gestion des Clients Actifs
            </h1>
            <p className="text-gray-600 mt-1">
              Suivi et gestion de votre portefeuille clients
            </p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Download className="h-4 w-4" />
            Exporter
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Clients Actifs</p>
                <p className="text-3xl font-bold mt-2">{stats.total_clients}</p>
              </div>
              <Users className="h-12 w-12 text-blue-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Contrats Actifs</p>
                <p className="text-3xl font-bold mt-2">{stats.active_contracts}</p>
              </div>
              <CheckCircle2 className="h-12 w-12 text-green-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Primes Annuelles</p>
                <p className="text-3xl font-bold mt-2">
                  {new Intl.NumberFormat('fr-FR', {
                    style: 'currency',
                    currency: 'EUR',
                    maximumFractionDigits: 0
                  }).format(stats.total_premium)}
                </p>
              </div>
              <DollarSign className="h-12 w-12 text-purple-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">Renouvellements 30j</p>
                <p className="text-3xl font-bold mt-2">{stats.renewal_due_30days}</p>
              </div>
              <Clock className="h-12 w-12 text-orange-200" />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un client (nom, email, téléphone)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Company Filter */}
          <div className="w-full md:w-64">
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={filterCompany}
                onChange={(e) => setFilterCompany(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              >
                <option value="all">Toutes les compagnies</option>
                {companies.map(company => (
                  <option key={company} value={company}>{company}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Sort */}
          <div className="w-full md:w-48">
            <div className="relative">
              <ArrowUpDown className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
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
      <div className="mb-4 text-sm text-gray-600">
        {filteredClients.length} client{filteredClients.length > 1 ? 's' : ''} trouvé{filteredClients.length > 1 ? 's' : ''}
      </div>

      {/* Clients Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Compagnie
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Prime Annuelle
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Date Contrat
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 font-semibold">
                          {client.first_name?.[0]}{client.last_name?.[0]}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {client.first_name} {client.last_name}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <MapPin className="h-3 w-3" />
                          {client.city}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <a href={`mailto:${client.email}`} className="hover:text-blue-600">
                          {client.email}
                        </a>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <a href={`tel:${client.phone}`} className="hover:text-blue-600">
                          {client.phone}
                        </a>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">
                        {client.insurance_company || 'Non renseigné'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-semibold text-gray-900">
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
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      {client.contract_start_date
                        ? new Date(client.contract_start_date).toLocaleDateString('fr-FR')
                        : '-'
                      }
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/backoffice/clients/${client.id}`}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                        title="Gérer ce client"
                      >
                        <Shield className="h-4 w-4" />
                        Gérer
                      </Link>
                      <Link
                        to={`/backoffice/crm-killer/lead/${client.id}`}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Voir la fiche CRM"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <button
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Contacter"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </button>
                      <button
                        className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
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
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">Aucun client trouvé</p>
            <p className="text-gray-500 text-sm mt-1">
              {searchTerm || filterCompany !== 'all'
                ? 'Essayez de modifier vos filtres de recherche'
                : 'Les prospects finalisés apparaîtront ici automatiquement'
              }
            </p>
          </div>
        )}
      </div>

      {/* Quick Info */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Activity className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">Gestion des Clients Actifs</p>
            <p className="text-blue-800">
              Cette page affiche tous les prospects transformés en clients actifs (statut CLIENT_ACTIF).
              Utilisez les filtres pour affiner votre recherche et cliquez sur un client pour accéder à sa fiche complète.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
