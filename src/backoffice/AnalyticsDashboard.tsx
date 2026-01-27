import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, Eye, Loader2 } from 'lucide-react';
import {
  LeadsEvolutionChart,
  ConversionRateChart,
  CityDistributionChart,
  AutomationPerformanceChart,
  AIDecisionsChart,
  MiniMetricCard
} from '../components/charts';
import { supabase } from '../lib/supabase';

interface DashboardMetrics {
  totalLeads: number;
  conversionRate: number;
  totalInteractions: number;
  qualityScore: number;
  leadsTrend: string;
  conversionTrend: string;
  interactionsTrend: string;
  qualityTrend: string;
}

export default function AnalyticsDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

        const [
          currentLeadsResult,
          previousLeadsResult,
          currentInteractionsResult,
          previousInteractionsResult,
          statusResult
        ] = await Promise.all([
          supabase
            .from('crm_leads')
            .select('id', { count: 'exact' })
            .gte('created_at', thirtyDaysAgo.toISOString()),
          supabase
            .from('crm_leads')
            .select('id', { count: 'exact' })
            .gte('created_at', sixtyDaysAgo.toISOString())
            .lt('created_at', thirtyDaysAgo.toISOString()),
          supabase
            .from('crm_interactions')
            .select('id', { count: 'exact' })
            .gte('created_at', thirtyDaysAgo.toISOString()),
          supabase
            .from('crm_interactions')
            .select('id', { count: 'exact' })
            .gte('created_at', sixtyDaysAgo.toISOString())
            .lt('created_at', thirtyDaysAgo.toISOString()),
          supabase
            .from('crm_leads')
            .select('status')
        ]);

        const currentLeads = currentLeadsResult.count || 0;
        const previousLeads = previousLeadsResult.count || 1;
        const currentInteractions = currentInteractionsResult.count || 0;
        const previousInteractions = previousInteractionsResult.count || 1;

        const statusCounts: Record<string, number> = {};
        statusResult.data?.forEach(lead => {
          const status = lead.status || 'NOUVEAU_LEAD';
          statusCounts[status] = (statusCounts[status] || 0) + 1;
        });

        const totalLeads = statusResult.data?.length || 0;
        const convertedLeads = (statusCounts['ACTIVE_CLIENT'] || 0) + (statusCounts['QUOTE_ACCEPTED'] || 0);
        const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;

        const qualifiedLeads = (statusCounts['QUOTE_SENT'] || 0) +
                              (statusCounts['QUOTE_ACCEPTED'] || 0) +
                              (statusCounts['ACTIVE_CLIENT'] || 0) +
                              (statusCounts['DOCUMENTS_RECEIVED'] || 0);
        const qualityScore = totalLeads > 0 ? Math.round((qualifiedLeads / totalLeads) * 100) : 0;

        const leadsTrendValue = previousLeads > 0
          ? Math.round(((currentLeads - previousLeads) / previousLeads) * 100)
          : currentLeads > 0 ? 100 : 0;

        const interactionsTrendValue = previousInteractions > 0
          ? Math.round(((currentInteractions - previousInteractions) / previousInteractions) * 100)
          : currentInteractions > 0 ? 100 : 0;

        setMetrics({
          totalLeads,
          conversionRate,
          totalInteractions: currentInteractions,
          qualityScore,
          leadsTrend: `${leadsTrendValue >= 0 ? '+' : ''}${leadsTrendValue}%`,
          conversionTrend: `+${Math.max(0, conversionRate - 5)}%`,
          interactionsTrend: `${interactionsTrendValue >= 0 ? '+' : ''}${interactionsTrendValue}%`,
          qualityTrend: `+${Math.max(0, qualityScore - 10)}pts`,
        });
      } catch (err) {
        console.error('Error fetching dashboard metrics:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 p-8 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Chargement des analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 p-8">
      <div className="max-w-[1800px] mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <BarChart3 className="w-10 h-10 text-blue-500" />
            Tableau de Bord Analytics
          </h1>
          <p className="text-gray-400 text-lg">
            Vue d'ensemble des performances et statistiques détaillées
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MiniMetricCard
            title="Leads Totaux"
            value={metrics?.totalLeads || 0}
            trend={metrics?.leadsTrend || '+0%'}
            icon={Users}
            color="blue"
          />
          <MiniMetricCard
            title="Taux de Conversion"
            value={`${metrics?.conversionRate || 0}%`}
            trend={metrics?.conversionTrend || '+0%'}
            icon={TrendingUp}
            color="green"
          />
          <MiniMetricCard
            title="Interactions"
            value={metrics?.totalInteractions || 0}
            trend={metrics?.interactionsTrend || '+0%'}
            icon={Eye}
            color="cyan"
          />
          <MiniMetricCard
            title="Score Qualité"
            value={`${metrics?.qualityScore || 0}/100`}
            trend={metrics?.qualityTrend || '+0pts'}
            icon={BarChart3}
            color="orange"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <LeadsEvolutionChart />
          <ConversionRateChart />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <AutomationPerformanceChart />
          <AIDecisionsChart />
        </div>

        <div className="mb-6">
          <CityDistributionChart />
        </div>
      </div>
    </div>
  );
}
