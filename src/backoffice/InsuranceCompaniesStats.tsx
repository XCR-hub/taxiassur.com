import React, { useState, useEffect } from 'react';
import {
  Building2,
  TrendingUp,
  Send,
  Eye,
  CheckCircle,
  BarChart3,
  Calendar,
  Mail,
  Phone,
  MessageSquare,
  ArrowUpRight,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface InsuranceCompany {
  id: string;
  name: string;
  code: string;
  description: string | null;
  is_active: boolean;
}

interface CompanyStats {
  company_id: string;
  company_name: string;
  company_code: string;
  total_sent: number;
  total_opened: number;
  total_replied: number;
  total_converted: number;
  open_rate: number;
  reply_rate: number;
  conversion_rate: number;
  by_channel: {
    email: number;
    sms: number;
    whatsapp: number;
  };
}

interface QuoteHistory {
  id: string;
  lead_id: string;
  sent_via: string;
  sent_to: string;
  subject: string | null;
  status: string;
  sent_at: string;
  opened_at: string | null;
  replied_at: string | null;
  lead_status_at_send: string;
  crm_leads?: {
    full_name: string;
    email: string;
    phone: string | null;
    status: string;
  };
}

const InsuranceCompaniesStats: React.FC = () => {
  const [companies, setCompanies] = useState<InsuranceCompany[]>([]);
  const [stats, setStats] = useState<CompanyStats[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [companyHistory, setCompanyHistory] = useState<QuoteHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview');

  useEffect(() => {
    loadData();
  }, [dateFilter]);

  useEffect(() => {
    if (selectedCompany) {
      loadCompanyHistory(selectedCompany);
    }
  }, [selectedCompany, dateFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadCompanies(),
        loadStats()
      ]);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCompanies = async () => {
    const { data, error } = await supabase
      .from('insurance_companies')
      .select('id, name, code, description, is_active')
      .order('priority_order');

    if (error) throw error;
    setCompanies(data || []);
  };

  const loadStats = async () => {
    const dateCondition = getDateCondition();

    const { data: history, error } = await supabase
      .from('crm_quote_history')
      .select(`
        insurance_company_id,
        sent_via,
        status,
        opened_at,
        replied_at,
        sent_at,
        insurance_companies(id, name, code)
      `)
      .not('insurance_company_id', 'is', null)
      .gte('sent_at', dateCondition);

    if (error) throw error;

    const statsByCompany: Record<string, CompanyStats> = {};

    history?.forEach((item: any) => {
      const companyId = item.insurance_company_id;
      if (!companyId || !item.insurance_companies) return;

      if (!statsByCompany[companyId]) {
        statsByCompany[companyId] = {
          company_id: companyId,
          company_name: item.insurance_companies.name,
          company_code: item.insurance_companies.code,
          total_sent: 0,
          total_opened: 0,
          total_replied: 0,
          total_converted: 0,
          open_rate: 0,
          reply_rate: 0,
          conversion_rate: 0,
          by_channel: {
            email: 0,
            sms: 0,
            whatsapp: 0
          }
        };
      }

      const stats = statsByCompany[companyId];
      stats.total_sent++;

      if (item.sent_via === 'email') stats.by_channel.email++;
      else if (item.sent_via === 'sms') stats.by_channel.sms++;
      else if (item.sent_via === 'whatsapp') stats.by_channel.whatsapp++;

      if (item.opened_at) stats.total_opened++;
      if (item.replied_at) stats.total_replied++;
      if (item.status === 'converted' || item.status === 'replied') stats.total_converted++;
    });

    Object.values(statsByCompany).forEach(stat => {
      stat.open_rate = stat.total_sent > 0 ? (stat.total_opened / stat.total_sent) * 100 : 0;
      stat.reply_rate = stat.total_sent > 0 ? (stat.total_replied / stat.total_sent) * 100 : 0;
      stat.conversion_rate = stat.total_sent > 0 ? (stat.total_converted / stat.total_sent) * 100 : 0;
    });

    setStats(Object.values(statsByCompany).sort((a, b) => b.total_sent - a.total_sent));
  };

  const loadCompanyHistory = async (companyId: string) => {
    const dateCondition = getDateCondition();

    const { data, error } = await supabase
      .from('crm_quote_history')
      .select(`
        *,
        crm_leads(full_name, email, phone, status)
      `)
      .eq('insurance_company_id', companyId)
      .gte('sent_at', dateCondition)
      .order('sent_at', { ascending: false });

    if (error) throw error;
    setCompanyHistory(data || []);
  };

  const getDateCondition = () => {
    const now = new Date();
    switch (dateFilter) {
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
      default:
        return '2000-01-01';
    }
  };

  const totalStats = stats.reduce((acc, stat) => ({
    total_sent: acc.total_sent + stat.total_sent,
    total_opened: acc.total_opened + stat.total_opened,
    total_converted: acc.total_converted + stat.total_converted
  }), { total_sent: 0, total_opened: 0, total_converted: 0 });

  const globalOpenRate = totalStats.total_sent > 0
    ? (totalStats.total_opened / totalStats.total_sent) * 100
    : 0;

  const globalConversionRate = totalStats.total_sent > 0
    ? (totalStats.total_converted / totalStats.total_sent) * 100
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <BarChart3 className="text-orange-600" size={32} />
              Statistiques Devis par Compagnie
            </h1>
            <p className="text-gray-600 mt-1">
              Performances et analyses des devis envoyes
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-orange-500"
            >
              <option value="7d">7 derniers jours</option>
              <option value="30d">30 derniers jours</option>
              <option value="90d">90 derniers jours</option>
              <option value="all">Tout</option>
            </select>
            <button
              onClick={loadData}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2"
            >
              <RefreshCw size={18} />
              Actualiser
            </button>
          </div>
        </div>

        {/* Global Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Devis Envoyes</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {totalStats.total_sent}
                </p>
              </div>
              <Send className="text-blue-600" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Taux d'Ouverture</p>
                <p className="text-3xl font-bold text-green-600 mt-1">
                  {globalOpenRate.toFixed(1)}%
                </p>
              </div>
              <Eye className="text-green-600" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Taux de Conversion</p>
                <p className="text-3xl font-bold text-orange-600 mt-1">
                  {globalConversionRate.toFixed(1)}%
                </p>
              </div>
              <CheckCircle className="text-orange-600" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Compagnies Actives</p>
                <p className="text-3xl font-bold text-purple-600 mt-1">
                  {companies.filter(c => c.is_active).length}
                </p>
              </div>
              <Building2 className="text-purple-600" size={32} />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-6 py-4 text-sm font-medium ${
                  activeTab === 'overview'
                    ? 'border-b-2 border-orange-600 text-orange-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <BarChart3 className="inline mr-2" size={18} />
                Vue d'ensemble
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-6 py-4 text-sm font-medium ${
                  activeTab === 'history'
                    ? 'border-b-2 border-orange-600 text-orange-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                disabled={!selectedCompany}
              >
                <Calendar className="inline mr-2" size={18} />
                Historique Detaille
              </button>
            </nav>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="p-6">
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
                  <p className="text-gray-600 mt-4">Chargement...</p>
                </div>
              ) : stats.length === 0 ? (
                <div className="text-center py-12">
                  <Building2 className="mx-auto text-gray-400 mb-4" size={48} />
                  <p className="text-gray-600">Aucun devis envoye pour cette periode</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {stats.map((stat) => {
                    const company = companies.find(c => c.id === stat.company_id);
                    return (
                      <div
                        key={stat.company_id}
                        className={`border-2 rounded-lg p-6 transition-all cursor-pointer ${
                          selectedCompany === stat.company_id
                            ? 'border-orange-600 bg-orange-50'
                            : 'border-gray-200 hover:border-orange-300'
                        }`}
                        onClick={() => {
                          setSelectedCompany(stat.company_id);
                          setActiveTab('history');
                        }}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <div className="flex items-center gap-3">
                              <h3 className="text-xl font-bold text-gray-900">
                                {stat.company_name}
                              </h3>
                              <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                                {stat.company_code}
                              </span>
                              {company && !company.is_active && (
                                <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                                  Inactive
                                </span>
                              )}
                            </div>
                            {company?.description && (
                              <p className="text-sm text-gray-600 mt-1">
                                {company.description.substring(0, 100)}...
                              </p>
                            )}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCompany(stat.company_id);
                              setActiveTab('history');
                            }}
                            className="text-orange-600 hover:text-orange-700"
                          >
                            <ArrowUpRight size={24} />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                          <div className="bg-white rounded-lg p-4">
                            <p className="text-xs text-gray-600 mb-1">Envoyes</p>
                            <p className="text-2xl font-bold text-blue-600">
                              {stat.total_sent}
                            </p>
                          </div>

                          <div className="bg-white rounded-lg p-4">
                            <p className="text-xs text-gray-600 mb-1">Taux Ouverture</p>
                            <p className="text-2xl font-bold text-green-600">
                              {stat.open_rate.toFixed(1)}%
                            </p>
                            <p className="text-xs text-gray-500">
                              {stat.total_opened} ouverts
                            </p>
                          </div>

                          <div className="bg-white rounded-lg p-4">
                            <p className="text-xs text-gray-600 mb-1">Taux Reponse</p>
                            <p className="text-2xl font-bold text-purple-600">
                              {stat.reply_rate.toFixed(1)}%
                            </p>
                            <p className="text-xs text-gray-500">
                              {stat.total_replied} reponses
                            </p>
                          </div>

                          <div className="bg-white rounded-lg p-4">
                            <p className="text-xs text-gray-600 mb-1">Conversions</p>
                            <p className="text-2xl font-bold text-orange-600">
                              {stat.conversion_rate.toFixed(1)}%
                            </p>
                            <p className="text-xs text-gray-500">
                              {stat.total_converted} convertis
                            </p>
                          </div>

                          <div className="bg-white rounded-lg p-4">
                            <p className="text-xs text-gray-600 mb-1">Canaux</p>
                            <div className="flex items-center gap-2 mt-1">
                              {stat.by_channel.email > 0 && (
                                <div className="flex items-center gap-1">
                                  <Mail size={14} className="text-blue-600" />
                                  <span className="text-sm font-medium">{stat.by_channel.email}</span>
                                </div>
                              )}
                              {stat.by_channel.sms > 0 && (
                                <div className="flex items-center gap-1">
                                  <MessageSquare size={14} className="text-green-600" />
                                  <span className="text-sm font-medium">{stat.by_channel.sms}</span>
                                </div>
                              )}
                              {stat.by_channel.whatsapp > 0 && (
                                <div className="flex items-center gap-1">
                                  <Phone size={14} className="text-emerald-600" />
                                  <span className="text-sm font-medium">{stat.by_channel.whatsapp}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && selectedCompany && (
            <div className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Historique - {stats.find(s => s.company_id === selectedCompany)?.company_name}
                </h3>
                <button
                  onClick={() => setActiveTab('overview')}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  ← Retour
                </button>
              </div>

              {companyHistory.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="mx-auto text-gray-400 mb-4" size={48} />
                  <p className="text-gray-600">Aucun devis envoye</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {companyHistory.map((item) => (
                    <div key={item.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold text-gray-900">
                              {item.crm_leads?.full_name || 'Lead inconnu'}
                            </span>
                            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                              {item.sent_via.toUpperCase()}
                            </span>
                            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                              {item.lead_status_at_send}
                            </span>
                          </div>

                          <p className="text-sm text-gray-600">
                            Envoye a : <span className="font-medium">{item.sent_to}</span>
                          </p>

                          {item.subject && (
                            <p className="text-sm text-gray-700 mt-1">
                              Sujet : {item.subject}
                            </p>
                          )}

                          <p className="text-xs text-gray-500 mt-2">
                            {new Date(item.sent_at).toLocaleString('fr-FR')}
                          </p>
                        </div>

                        <div className="text-right">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            item.status === 'failed' ? 'bg-red-100 text-red-700' :
                            item.status === 'replied' ? 'bg-green-100 text-green-700' :
                            item.status === 'opened' || item.status === 'downloaded' ? 'bg-purple-100 text-purple-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {item.status}
                          </span>

                          {item.opened_at && (
                            <p className="text-xs text-gray-500 mt-2">
                              Ouvert : {new Date(item.opened_at).toLocaleString('fr-FR', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InsuranceCompaniesStats;
