import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Users, DollarSign, Activity, Target } from 'lucide-react';

interface MetricCard {
  title: string;
  value: string | number;
  change: number;
  trend: 'up' | 'down';
  icon: React.ReactNode;
}

interface ChartDataPoint {
  label: string;
  value: number;
}

export const AdvancedAnalytics: React.FC = () => {
  const [metrics, setMetrics] = useState<MetricCard[]>([
    {
      title: 'Total Leads',
      value: '1,234',
      change: 12.5,
      trend: 'up',
      icon: <Users className="w-6 h-6" />,
    },
    {
      title: 'Conversion Rate',
      value: '23.5%',
      change: 5.2,
      trend: 'up',
      icon: <Target className="w-6 h-6" />,
    },
    {
      title: 'Revenue',
      value: '45,678€',
      change: -3.1,
      trend: 'down',
      icon: <DollarSign className="w-6 h-6" />,
    },
    {
      title: 'Active Users',
      value: '567',
      change: 8.3,
      trend: 'up',
      icon: <Activity className="w-6 h-6" />,
    },
  ]);

  const [chartData] = useState<ChartDataPoint[]>([
    { label: 'Jan', value: 65 },
    { label: 'Fév', value: 78 },
    { label: 'Mar', value: 90 },
    { label: 'Avr', value: 85 },
    { label: 'Mai', value: 95 },
    { label: 'Jun', value: 110 },
  ]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <div
            key={index}
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-lg text-blue-600">
                {metric.icon}
              </div>
              <div
                className={`flex items-center gap-1 text-sm font-medium ${
                  metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {metric.trend === 'up' ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                {Math.abs(metric.change)}%
              </div>
            </div>
            <h3 className="text-gray-600 text-sm font-medium mb-1">
              {metric.title}
            </h3>
            <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Performance mensuelle
          </h3>
          <div className="h-64">
            <SimpleBarChart data={chartData} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Répartition par source
          </h3>
          <div className="space-y-4">
            <SourceBar label="Google Ads" value={45} color="bg-blue-500" />
            <SourceBar label="Facebook" value={25} color="bg-indigo-500" />
            <SourceBar label="Direct" value={20} color="bg-green-500" />
            <SourceBar label="Référencement" value={10} color="bg-yellow-500" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          Activité récente
        </h3>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((_, index) => (
            <ActivityItem
              key={index}
              title={`Lead ${index + 1} créé`}
              time="Il y a 2 heures"
              type="success"
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const SimpleBarChart: React.FC<{ data: ChartDataPoint[] }> = ({ data }) => {
  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <div className="flex items-end justify-between h-full gap-4">
      {data.map((point, index) => {
        const height = (point.value / maxValue) * 100;
        return (
          <div key={index} className="flex-1 flex flex-col items-center gap-2">
            <div className="relative w-full flex items-end h-full">
              <div
                className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-all cursor-pointer"
                style={{ height: `${height}%` }}
                title={`${point.label}: ${point.value}`}
              />
            </div>
            <span className="text-xs text-gray-600 font-medium">
              {point.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

const SourceBar: React.FC<{ label: string; value: number; color: string }> = ({
  label,
  value,
  color,
}) => (
  <div>
    <div className="flex justify-between text-sm mb-1">
      <span className="font-medium text-gray-700">{label}</span>
      <span className="text-gray-600">{value}%</span>
    </div>
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div
        className={`${color} h-2 rounded-full transition-all duration-500`}
        style={{ width: `${value}%` }}
      />
    </div>
  </div>
);

const ActivityItem: React.FC<{ title: string; time: string; type: string }> = ({
  title,
  time,
  type,
}) => (
  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
    <div
      className={`w-2 h-2 rounded-full ${
        type === 'success' ? 'bg-green-500' : 'bg-blue-500'
      }`}
    />
    <div className="flex-1">
      <p className="text-sm font-medium text-gray-900">{title}</p>
      <p className="text-xs text-gray-500">{time}</p>
    </div>
  </div>
);
