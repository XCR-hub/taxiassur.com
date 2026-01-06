import { BarChart3, TrendingUp, Users, Eye } from 'lucide-react';
import {
  LeadsEvolutionChart,
  ConversionRateChart,
  CityDistributionChart,
  AutomationPerformanceChart,
  AIDecisionsChart,
  MiniMetricCard
} from '../components/charts';

export default function AnalyticsDashboard() {
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
            value="1,234"
            trend="+12.5%"
            icon={Users}
            color="blue"
          />
          <MiniMetricCard
            title="Taux de Conversion"
            value="28.4%"
            trend="+3.2%"
            icon={TrendingUp}
            color="green"
          />
          <MiniMetricCard
            title="Vues Uniques"
            value="45.2K"
            trend="+18.7%"
            icon={Eye}
            color="purple"
          />
          <MiniMetricCard
            title="Score Qualité"
            value="92/100"
            trend="+5pts"
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
