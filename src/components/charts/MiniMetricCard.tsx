import { LucideIcon } from 'lucide-react';

interface MiniMetricCardProps {
  title: string;
  value: string | number;
  trend: string;
  icon: LucideIcon;
  color: 'blue' | 'green' | 'orange' | 'purple' | 'red';
}

const colorMap = {
  blue: {
    bg: 'from-blue-50 to-blue-100',
    border: 'border-blue-300',
    icon: 'text-blue-700',
    text: 'text-blue-900'
  },
  green: {
    bg: 'from-green-50 to-green-100',
    border: 'border-green-300',
    icon: 'text-green-700',
    text: 'text-green-900'
  },
  orange: {
    bg: 'from-orange-50 to-orange-100',
    border: 'border-orange-300',
    icon: 'text-orange-700',
    text: 'text-orange-900'
  },
  purple: {
    bg: 'from-purple-50 to-purple-100',
    border: 'border-purple-300',
    icon: 'text-purple-700',
    text: 'text-purple-900'
  },
  red: {
    bg: 'from-red-50 to-red-100',
    border: 'border-red-300',
    icon: 'text-red-700',
    text: 'text-red-900'
  }
};

export function MiniMetricCard({
  title,
  value,
  trend,
  icon: Icon,
  color
}: MiniMetricCardProps) {
  const colors = colorMap[color];
  const trendIsPositive = trend.startsWith('+');

  return (
    <div className={`bg-gradient-to-br ${colors.bg} rounded-xl shadow-lg border-2 ${colors.border} p-6 hover:shadow-xl transition-all`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Icon className={`${colors.icon} w-5 h-5`} />
            <p className={`text-sm font-semibold ${colors.text}`}>{title}</p>
          </div>
          <p className={`text-3xl font-bold ${colors.text}`}>{value}</p>
          <p className={`text-xs font-semibold ${trendIsPositive ? 'text-green-700' : 'text-red-700'} mt-1`}>
            {trend} vs période précédente
          </p>
        </div>
      </div>
    </div>
  );
}
