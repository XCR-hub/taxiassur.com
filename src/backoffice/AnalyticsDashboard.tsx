import React, { useState, useEffect, useCallback } from 'react';
import { BarChart3, TrendingUp, Users, Eye, Loader2, RefreshCw, Calendar, Activity, Target } from 'lucide-react';
import {
  LeadsEvolutionChart,
  ConversionRateChart,
  CityDistributionChart,
  AutomationPerformanceChart,
  AIDecisionsChart,
} from '../components/charts';
import { nativeAdminCrmAnalytics } from '@/lib/native-admin-data';

interface DashboardMetrics {
  totalLeads: number;
  conversionRate: number;
  totalInteractions: number;
  qualityScore: number;
  leadsTrend: string;
  leadsTrendPositive: boolean;
  conversionTrend: string;
  interactionsTrend: string;
  interactionsTrendPositive: boolean;
  qualityTrend: string;
  activeLeads: number;
  closedLeads: number;
}

type Period = '7d' | '30d' | '90d' | '365d';

const PERIODS: { value: Period; label: string }[] = [
  { value: '7d', label: '7 jours' },
  { value: '30d', label: '30 jours' },
  { value: '90d', label: '90 jours' },
  { value: '365d', label: '12 mois' },
];

function getDaysBack(period: Period) {
  switch (period) {
    case '7d': return 7;
    case '30d': return 30;
    case '90d': return 90;
    case '365d': return 365;
  }
}

const accentMap = {
  blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: 'text-blue-400' },
  green: { bg: 'bg-green-500/10', border: 'border-green-500/20', icon: 'text-green-400' },
  cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', icon: 'text-cyan-400' },
  orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/20', icon: 'text-orange-400' },
};

interface KPICardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub: string;
  trend: string;
  trendPositive: boolean;
  accent: keyof typeof accentMap;
}

function KPICard({ icon: Icon, label, value, sub, trend, trendPositive, accent }: KPICardProps) {
  const a = accentMap[accent];
  return (
    <div className={`rounded-xl border ${a.border} ${a.bg} p-5 hover:scale-[1.01] transition-all duration-200`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg ${a.bg} border ${a.border} flex items-center justify-center`}>
          <Icon size={16} className={a.icon} />
        </div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
          trendPositive ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
        }`}>
          {trend}
        </span>
      </div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className="text-3xl font-bold text-white">{value}</p>
      <p className="text-xs text-gray-600 mt-1">{sub}</p>
    </div>
  );
}

interface SectionHeaderProps {
  icon: React.ElementType;
  title: string;
}

function SectionHeader({ icon: Icon, title }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon size={15} className="text-blue-400" />
      <h2 className="text-sm font-semibold text-gray-300">{title}</h2>
      <div className="flex-1 h-px bg-white/5 ml-2" />
    </div>
  );
}

const COLOR_BARS: Record<string, string> = {
  blue: 'bg-blue-500',
  cyan: 'bg-cyan-500',
  amber: 'bg-amber-500',
  orange: 'bg-orange-500',
  green: 'bg-green-500',
  emerald: 'bg-emerald-500',
};

export default function AnalyticsDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('30d');
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [pipelineStats, setPipelineStats] = useState<{ status: string; count: number; color: string }[]>([]);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const days = getDaysBack(period);
      const response = await nativeAdminCrmAnalytics(days) as { analytics?: { currentLeads?: number; previousLeads?: number; currentInteractions?: number; previousInteractions?: number; totalLeads?: number; statusCounts?: Record<string, number> } };
      const analytics = response.analytics || {};
      const currentLeads = analytics.currentLeads || 0;
      const previousLeads = analytics.previousLeads || 0;
      const currentInteractions = analytics.currentInteractions || 0;
      const previousInteractions = analytics.previousInteractions || 0;
      const statusCounts = analytics.statusCounts || {};
      const totalLeads = analytics.totalLeads || 0;
      const convertedLeads =
        (statusCounts['ACTIVE_CLIENT'] || 0) +
        (statusCounts['QUOTE_ACCEPTED'] || 0) +
        (statusCounts['contrat_signe'] || 0);
      const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;

      const qualifiedLeads =
        (statusCounts['QUOTE_SENT'] || 0) +
        (statusCounts['QUOTE_ACCEPTED'] || 0) +
        (statusCounts['ACTIVE_CLIENT'] || 0) +
        (statusCounts['DOCUMENTS_RECEIVED'] || 0) +
        (statusCounts['devis_envoye'] || 0) +
        (statusCounts['documents_reçus'] || 0) +
        (statusCounts['contrat_signe'] || 0);
      const qualityScore = totalLeads > 0 ? Math.round((qualifiedLeads / totalLeads) * 100) : 0;

      const leadsDiff = previousLeads > 0 ? Math.round(((currentLeads - previousLeads) / previousLeads) * 100) : currentLeads > 0 ? 100 : 0;
      const interactionsDiff = previousInteractions > 0 ? Math.round(((currentInteractions - previousInteractions) / previousInteractions) * 100) : currentInteractions > 0 ? 100 : 0;

      const activeLeads =
        (statusCounts['NOUVEAU_LEAD'] || 0) +
        (statusCounts['nouveau_lead'] || 0) +
        (statusCounts['RDV_PLANIFIE'] || 0) +
        (statusCounts['QUOTE_SENT'] || 0) +
        (statusCounts['devis_envoye'] || 0);
      const closedLeads = (statusCounts['ACTIVE_CLIENT'] || 0) + (statusCounts['contrat_signe'] || 0);

      setMetrics({
        totalLeads,
        conversionRate,
        totalInteractions: currentInteractions,
        qualityScore,
        leadsTrend: `${leadsDiff >= 0 ? '+' : ''}${leadsDiff}%`,
        leadsTrendPositive: leadsDiff >= 0,
        conversionTrend: `${conversionRate >= 5 ? '+' : ''}${Math.max(0, conversionRate - 5)}%`,
        interactionsTrend: `${interactionsDiff >= 0 ? '+' : ''}${interactionsDiff}%`,
        interactionsTrendPositive: interactionsDiff >= 0,
        qualityTrend: `+${Math.max(0, qualityScore - 10)}pts`,
        activeLeads,
        closedLeads,
      });

      setPipelineStats([
        { status: 'Nouveaux leads', count: (statusCounts['NOUVEAU_LEAD'] || 0) + (statusCounts['nouveau_lead'] || 0), color: 'blue' },
        { status: 'RDV planifiés', count: statusCounts['RDV_PLANIFIE'] || 0, color: 'cyan' },
        { status: 'Devis envoyés', count: (statusCounts['QUOTE_SENT'] || 0) + (statusCounts['devis_envoye'] || 0), color: 'amber' },
        { status: 'Documents reçus', count: (statusCounts['DOCUMENTS_RECEIVED'] || 0) + (statusCounts['documents_reçus'] || 0), color: 'orange' },
        { status: 'Devis acceptés', count: (statusCounts['QUOTE_ACCEPTED'] || 0) + (statusCounts['devis_accepte'] || 0), color: 'green' },
        { status: 'Clients actifs', count: (statusCounts['ACTIVE_CLIENT'] || 0) + (statusCounts['contrat_signe'] || 0), color: 'emerald' },
      ]);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const maxPipeline = Math.max(...pipelineStats.map((s) => s.count), 1);

  return (
    <div className="h-full overflow-auto" style={{ background: '#030712' }}>
      {/* Top bar */}
      <div
        className="sticky top-0 z-20 px-6 py-3.5 border-b border-white/5 flex items-center justify-between"
        style={{ background: '#030712' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
            <BarChart3 size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white leading-tight">Tableau de Bord Analytics</h1>
            <p className="text-[11px] text-gray-600">
              Actualisé à {lastRefresh.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1 border border-white/10">
            <Calendar size={12} className="text-gray-600 ml-1" />
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                  period === p.value
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-500 hover:text-white hover:bg-white/10'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            onClick={fetchMetrics}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white border border-white/10 rounded-lg px-3 py-1.5 hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Actualiser
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {loading && !metrics ? (
          <div className="flex items-center justify-center h-56">
            <div className="text-center">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Chargement des données…</p>
            </div>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard
                icon={Users}
                label="Leads Total"
                value={metrics?.totalLeads ?? 0}
                sub={`${metrics?.activeLeads ?? 0} actifs`}
                trend={metrics?.leadsTrend ?? '+0%'}
                trendPositive={metrics?.leadsTrendPositive ?? true}
                accent="blue"
              />
              <KPICard
                icon={Target}
                label="Taux Conversion"
                value={`${metrics?.conversionRate ?? 0}%`}
                sub={`${metrics?.closedLeads ?? 0} convertis`}
                trend={metrics?.conversionTrend ?? '+0%'}
                trendPositive
                accent="green"
              />
              <KPICard
                icon={Activity}
                label="Interactions"
                value={metrics?.totalInteractions ?? 0}
                sub={`sur les ${getDaysBack(period)}j`}
                trend={metrics?.interactionsTrend ?? '+0%'}
                trendPositive={metrics?.interactionsTrendPositive ?? true}
                accent="cyan"
              />
              <KPICard
                icon={Eye}
                label="Score Qualité"
                value={`${metrics?.qualityScore ?? 0}/100`}
                sub="leads qualifiés"
                trend={metrics?.qualityTrend ?? '+0pts'}
                trendPositive
                accent="orange"
              />
            </div>

            {/* Pipeline snapshot */}
            <div className="rounded-xl border border-white/5 p-5" style={{ background: '#0a0f1e' }}>
              <div className="flex items-center gap-2 mb-4">
                <Activity size={15} className="text-blue-400" />
                <h2 className="text-sm font-semibold text-white">Pipeline Commercial</h2>
                <span className="text-xs text-gray-600 ml-auto">Vue d'ensemble · tous statuts</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {pipelineStats.map((stage) => (
                  <div key={stage.status} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-28 flex-shrink-0 truncate">{stage.status}</span>
                    <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${COLOR_BARS[stage.color]} rounded-full transition-all duration-700`}
                        style={{ width: `${(stage.count / maxPipeline) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-gray-400 w-6 text-right">{stage.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Charts — row 1 */}
            <div>
              <SectionHeader icon={TrendingUp} title="Évolution & Conversions" />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <LeadsEvolutionChart />
                <ConversionRateChart />
              </div>
            </div>

            {/* Charts — row 2 */}
            <div>
              <SectionHeader icon={BarChart3} title="Automatisations & Intelligence IA" />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <AutomationPerformanceChart />
                <AIDecisionsChart />
              </div>
            </div>

            {/* Charts — row 3 */}
            <div>
              <SectionHeader icon={Users} title="Répartition Géographique" />
              <CityDistributionChart />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
