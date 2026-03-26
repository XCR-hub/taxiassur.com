import { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  ArrowUpRight,
  RefreshCw,
  FileText,
  TrendingUp,
  ArrowLeft,
  Euro,
  User
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface CompanyQuote {
  id: string;
  lead_id: string;
  company_id: string;
  status: string;
  quote_amount: number | null;
  quote_file_url: string | null;
  created_at: string;
  sent_at: string | null;
  validated_at: string | null;
  quote_accepted_at: string | null;
  refused_at: string | null;
  refusal_reason: string | null;
  notes: string | null;
  insurance_companies: {
    id: string;
    name: string;
    code: string;
    logo_url: string | null;
    is_active: boolean;
  } | null;
  crm_leads: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    status: string | null;
    pipeline_stage: string | null;
    vehicle_type: string | null;
  } | null;
}

interface CompanyAgg {
  company_id: string;
  company_name: string;
  company_code: string;
  logo_url: string | null;
  is_active: boolean;
  total: number;
  validated: number;
  refused: number;
  pending: number;
  quote_submitted: number;
  with_amount: number;
  total_amount: number;
  avg_amount: number;
  conversion_rate: number;
  unique_leads: Set<string>;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof CheckCircle }> = {
  validated: { label: 'Valide', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: CheckCircle },
  quote_submitted: { label: 'Devis soumis', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', icon: FileText },
  pending: { label: 'En attente', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: Clock },
  refused: { label: 'Refuse', color: 'text-red-700', bg: 'bg-red-50 border-red-200', icon: XCircle },
};

export default function InsuranceCompaniesStats() {
  const [quotes, setQuotes] = useState<CompanyQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<'30d' | '90d' | '6m' | 'all'>('all');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  useEffect(() => {
    loadQuotes();
  }, [dateFilter]);

  const loadQuotes = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('lead_company_quotes')
        .select(`
          id, lead_id, company_id, status, quote_amount, quote_file_url,
          created_at, sent_at, validated_at, quote_accepted_at, refused_at,
          refusal_reason, notes,
          insurance_companies(id, name, code, logo_url, is_active),
          crm_leads(first_name, last_name, email, phone, status, pipeline_stage, vehicle_type)
        `)
        .order('created_at', { ascending: false });

      if (dateFilter !== 'all') {
        const now = new Date();
        const ms = dateFilter === '30d' ? 30 * 86400000 : dateFilter === '90d' ? 90 * 86400000 : 180 * 86400000;
        query = query.gte('created_at', new Date(now.getTime() - ms).toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      setQuotes(data || []);
    } catch (err) {
      console.error('Error loading quotes:', err);
    } finally {
      setLoading(false);
    }
  };

  const companyStats = useMemo(() => {
    const map: Record<string, CompanyAgg> = {};

    quotes.forEach(q => {
      const c = q.insurance_companies;
      if (!c) return;

      if (!map[c.id]) {
        map[c.id] = {
          company_id: c.id,
          company_name: c.name,
          company_code: c.code,
          logo_url: c.logo_url,
          is_active: c.is_active,
          total: 0,
          validated: 0,
          refused: 0,
          pending: 0,
          quote_submitted: 0,
          with_amount: 0,
          total_amount: 0,
          avg_amount: 0,
          conversion_rate: 0,
          unique_leads: new Set(),
        };
      }

      const s = map[c.id];
      s.total++;
      s.unique_leads.add(q.lead_id);

      if (q.status === 'validated') s.validated++;
      else if (q.status === 'refused') s.refused++;
      else if (q.status === 'quote_submitted') s.quote_submitted++;
      else s.pending++;

      if (q.quote_amount && q.quote_amount > 0) {
        s.with_amount++;
        s.total_amount += Number(q.quote_amount);
      }
    });

    return Object.values(map)
      .map(s => ({
        ...s,
        avg_amount: s.with_amount > 0 ? s.total_amount / s.with_amount : 0,
        conversion_rate: s.total > 0 ? (s.validated / s.total) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [quotes]);

  const globalStats = useMemo(() => {
    const total = quotes.length;
    const validated = quotes.filter(q => q.status === 'validated').length;
    const refused = quotes.filter(q => q.status === 'refused').length;
    const pending = quotes.filter(q => q.status === 'pending' || q.status === 'quote_submitted').length;
    const uniqueLeads = new Set(quotes.map(q => q.lead_id)).size;
    const withAmount = quotes.filter(q => q.quote_amount && Number(q.quote_amount) > 0);
    const totalAmount = withAmount.reduce((sum, q) => sum + Number(q.quote_amount), 0);

    return {
      total,
      validated,
      refused,
      pending,
      uniqueLeads,
      conversionRate: total > 0 ? (validated / total) * 100 : 0,
      avgAmount: withAmount.length > 0 ? totalAmount / withAmount.length : 0,
      activeCompanies: companyStats.filter(c => c.is_active).length,
    };
  }, [quotes, companyStats]);

  const selectedCompany = companyStats.find(c => c.company_id === selectedCompanyId);
  const selectedQuotes = useMemo(
    () => quotes.filter(q => q.company_id === selectedCompanyId),
    [quotes, selectedCompanyId]
  );

  const formatDate = (d: string | null) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatAmount = (n: number) => {
    if (n === 0) return '-';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
  };

  if (selectedCompanyId && selectedCompany) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => setSelectedCompanyId(null)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
          >
            <ArrowLeft size={18} />
            <span className="text-sm font-medium">Retour aux statistiques</span>
          </button>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center gap-4">
              {selectedCompany.logo_url ? (
                <img src={selectedCompany.logo_url} alt={selectedCompany.company_name} className="h-12 w-auto object-contain" />
              ) : (
                <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Building2 className="text-gray-400" size={24} />
                </div>
              )}
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900">{selectedCompany.company_name}</h1>
                <p className="text-sm text-gray-500">Code: {selectedCompany.company_code}</p>
              </div>
              {!selectedCompany.is_active && (
                <span className="px-3 py-1 bg-red-50 text-red-700 text-xs font-medium rounded-full border border-red-200">Inactive</span>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-xs text-gray-500 mb-1">Total devis</p>
                <p className="text-2xl font-bold text-gray-900">{selectedCompany.total}</p>
              </div>
              <div className="bg-emerald-50 rounded-lg p-4 text-center">
                <p className="text-xs text-emerald-600 mb-1">Valides</p>
                <p className="text-2xl font-bold text-emerald-700">{selectedCompany.validated}</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-4 text-center">
                <p className="text-xs text-amber-600 mb-1">En attente</p>
                <p className="text-2xl font-bold text-amber-700">{selectedCompany.pending + selectedCompany.quote_submitted}</p>
              </div>
              <div className="bg-red-50 rounded-lg p-4 text-center">
                <p className="text-xs text-red-600 mb-1">Refuses</p>
                <p className="text-2xl font-bold text-red-700">{selectedCompany.refused}</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <p className="text-xs text-blue-600 mb-1">Taux conversion</p>
                <p className="text-2xl font-bold text-blue-700">{selectedCompany.conversion_rate.toFixed(0)}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Historique des devis</h2>
              <p className="text-sm text-gray-500 mt-0.5">{selectedQuotes.length} devis pour {selectedCompany.unique_leads.size} prospect(s)</p>
            </div>

            {selectedQuotes.length === 0 ? (
              <div className="text-center py-16">
                <FileText className="mx-auto text-gray-300 mb-3" size={48} />
                <p className="text-gray-500">Aucun devis pour cette periode</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {selectedQuotes.map(q => {
                  const sc = STATUS_CONFIG[q.status] || STATUS_CONFIG.pending;
                  const StatusIcon = sc.icon;
                  const leadName = [q.crm_leads?.first_name, q.crm_leads?.last_name].filter(Boolean).join(' ') || 'Prospect';

                  return (
                    <div key={q.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className={`mt-0.5 p-1.5 rounded-lg border ${sc.bg}`}>
                            <StatusIcon size={16} className={sc.color} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-gray-900 text-sm">{leadName}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${sc.bg} ${sc.color}`}>
                                {sc.label}
                              </span>
                              {q.crm_leads?.vehicle_type && (
                                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                                  {q.crm_leads.vehicle_type}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {q.crm_leads?.email || '-'}
                              {q.crm_leads?.phone ? ` | ${q.crm_leads.phone}` : ''}
                            </p>
                            {q.refusal_reason && (
                              <p className="text-xs text-red-600 mt-1">Motif: {q.refusal_reason}</p>
                            )}
                            {q.notes && (
                              <p className="text-xs text-gray-500 mt-1 italic">{q.notes}</p>
                            )}
                          </div>
                        </div>

                        <div className="text-right ml-4 shrink-0">
                          {q.quote_amount && Number(q.quote_amount) > 0 ? (
                            <p className="text-sm font-bold text-gray-900">{formatAmount(Number(q.quote_amount))}</p>
                          ) : (
                            <p className="text-xs text-gray-400">Montant non renseigne</p>
                          )}
                          <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                            <p>Cree: {formatDate(q.created_at)}</p>
                            {q.sent_at && <p>Envoye: {formatDate(q.sent_at)}</p>}
                            {q.quote_accepted_at && <p className="text-emerald-600 font-medium">Accepte: {formatDate(q.quote_accepted_at)}</p>}
                            {q.refused_at && <p className="text-red-600">Refuse: {formatDate(q.refused_at)}</p>}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <BarChart3 className="text-orange-600" size={32} />
              Statistiques Compagnies
            </h1>
            <p className="text-gray-500 mt-1">
              Suivi des devis et performances par compagnie d'assurance
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as typeof dateFilter)}
              className="px-4 py-2.5 border border-gray-200 rounded-lg bg-white text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="30d">30 derniers jours</option>
              <option value="90d">90 derniers jours</option>
              <option value="6m">6 derniers mois</option>
              <option value="all">Depuis le debut</option>
            </select>
            <button
              onClick={loadQuotes}
              disabled={loading}
              className="px-4 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2 text-sm font-medium transition-colors disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Actualiser
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          <StatCard
            label="Total Devis"
            value={globalStats.total}
            icon={<FileText size={20} />}
            color="text-gray-700"
            bgIcon="bg-gray-100"
          />
          <StatCard
            label="Valides"
            value={globalStats.validated}
            icon={<CheckCircle size={20} />}
            color="text-emerald-700"
            bgIcon="bg-emerald-100"
          />
          <StatCard
            label="En Attente"
            value={globalStats.pending}
            icon={<Clock size={20} />}
            color="text-amber-700"
            bgIcon="bg-amber-100"
          />
          <StatCard
            label="Refuses"
            value={globalStats.refused}
            icon={<XCircle size={20} />}
            color="text-red-700"
            bgIcon="bg-red-100"
          />
          <StatCard
            label="Taux Conversion"
            value={`${globalStats.conversionRate.toFixed(0)}%`}
            icon={<TrendingUp size={20} />}
            color="text-blue-700"
            bgIcon="bg-blue-100"
          />
          <StatCard
            label="Prospects"
            value={globalStats.uniqueLeads}
            icon={<User size={20} />}
            color="text-teal-700"
            bgIcon="bg-teal-100"
          />
        </div>

        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-16 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-orange-600 border-t-transparent mx-auto" />
            <p className="text-gray-500 mt-4 text-sm">Chargement des statistiques...</p>
          </div>
        ) : companyStats.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-16 text-center">
            <Building2 className="mx-auto text-gray-300 mb-4" size={56} />
            <p className="text-gray-600 font-medium">Aucun devis pour cette periode</p>
            <p className="text-gray-400 text-sm mt-1">Les devis apparaitront ici une fois crees dans le CRM</p>
          </div>
        ) : (
          <div className="space-y-4">
            {companyStats.map((stat) => (
              <CompanyCard
                key={stat.company_id}
                stat={stat}
                onSelect={() => setSelectedCompanyId(stat.company_id)}
                formatAmount={formatAmount}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color, bgIcon }: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  bgIcon: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
        <div className={`p-2 rounded-lg ${bgIcon}`}>
          <span className={color}>{icon}</span>
        </div>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function CompanyCard({ stat, onSelect, formatAmount }: {
  stat: CompanyAgg;
  onSelect: () => void;
  formatAmount: (n: number) => string;
}) {
  const pendingTotal = stat.pending + stat.quote_submitted;
  const barTotal = stat.total || 1;

  return (
    <div
      onClick={onSelect}
      className="bg-white rounded-xl shadow-sm border border-gray-200 hover:border-orange-300 hover:shadow-md transition-all cursor-pointer group"
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-4">
            {stat.logo_url ? (
              <img src={stat.logo_url} alt={stat.company_name} className="h-10 w-auto object-contain" />
            ) : (
              <div className="h-10 w-10 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
                <Building2 className="text-gray-400" size={20} />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-gray-900">{stat.company_name}</h3>
                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded font-mono">{stat.company_code}</span>
                {!stat.is_active && (
                  <span className="text-xs px-2 py-0.5 bg-red-50 text-red-600 rounded-full border border-red-200">Inactive</span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{stat.unique_leads.size} prospect(s) concerne(s)</p>
            </div>
          </div>

          <button className="text-gray-400 group-hover:text-orange-600 transition-colors p-2">
            <ArrowUpRight size={20} />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
          <div className="bg-gray-50 rounded-lg px-4 py-3">
            <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wide">Total</p>
            <p className="text-xl font-bold text-gray-900 mt-0.5">{stat.total}</p>
          </div>
          <div className="bg-emerald-50 rounded-lg px-4 py-3">
            <p className="text-[11px] text-emerald-600 font-medium uppercase tracking-wide">Valides</p>
            <p className="text-xl font-bold text-emerald-700 mt-0.5">{stat.validated}</p>
          </div>
          <div className="bg-amber-50 rounded-lg px-4 py-3">
            <p className="text-[11px] text-amber-600 font-medium uppercase tracking-wide">En attente</p>
            <p className="text-xl font-bold text-amber-700 mt-0.5">{pendingTotal}</p>
          </div>
          <div className="bg-red-50 rounded-lg px-4 py-3">
            <p className="text-[11px] text-red-600 font-medium uppercase tracking-wide">Refuses</p>
            <p className="text-xl font-bold text-red-700 mt-0.5">{stat.refused}</p>
          </div>
          <div className="bg-blue-50 rounded-lg px-4 py-3">
            <p className="text-[11px] text-blue-600 font-medium uppercase tracking-wide">Conversion</p>
            <p className="text-xl font-bold text-blue-700 mt-0.5">{stat.conversion_rate.toFixed(0)}%</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden flex">
            {stat.validated > 0 && (
              <div
                className="bg-emerald-500 h-full transition-all"
                style={{ width: `${(stat.validated / barTotal) * 100}%` }}
                title={`${stat.validated} valide(s)`}
              />
            )}
            {pendingTotal > 0 && (
              <div
                className="bg-amber-400 h-full transition-all"
                style={{ width: `${(pendingTotal / barTotal) * 100}%` }}
                title={`${pendingTotal} en attente`}
              />
            )}
            {stat.refused > 0 && (
              <div
                className="bg-red-400 h-full transition-all"
                style={{ width: `${(stat.refused / barTotal) * 100}%` }}
                title={`${stat.refused} refuse(s)`}
              />
            )}
          </div>
          <div className="flex items-center gap-3 text-[11px] text-gray-500 shrink-0">
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500 rounded-full" />Valides</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-amber-400 rounded-full" />Attente</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-400 rounded-full" />Refuses</span>
          </div>
        </div>

        {stat.avg_amount > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 text-sm text-gray-600">
            <Euro size={14} className="text-gray-400" />
            <span>Prime moyenne: <strong className="text-gray-900">{formatAmount(stat.avg_amount)}</strong></span>
            <span className="text-gray-300 mx-1">|</span>
            <span>Total: <strong className="text-gray-900">{formatAmount(stat.total_amount)}</strong></span>
          </div>
        )}
      </div>
    </div>
  );
}
