import { LucideIcon } from 'lucide-react';

interface MiniMetricCardProps {
  title: string;
  value: string | number;
  trend: string;
  icon: LucideIcon;
  color: 'blue' | 'green' | 'orange' | 'cyan' | 'red';
}

const colorMap = {
  blue: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    icon: 'text-blue-400',
    text: 'text-blue-400',
    value: 'text-white'
  },
  green: {
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    icon: 'text-green-400',
    text: 'text-green-400',
    value: 'text-white'
  },
  orange: {
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    icon: 'text-orange-400',
    text: 'text-orange-400',
    value: 'text-white'
  },
  cyan: {
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
    icon: 'text-cyan-400',
    text: 'text-cyan-400',
    value: 'text-white'
  },
  red: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    icon: 'text-red-400',
    text: 'text-red-400',
    value: 'text-white'
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
    <div className={`${colors.bg} rounded-xl border ${colors.border} p-6 hover:scale-[1.02] transition-all duration-300`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center`}>
              <Icon className={`${colors.icon} w-5 h-5`} />
            </div>
          </div>
          <p className="text-sm text-gray-400 mb-1">{title}</p>
          <p className={`text-3xl font-bold ${colors.value}`}>{value}</p>
          <p className={`text-xs font-medium mt-2 ${trendIsPositive ? 'text-green-400' : 'text-red-400'}`}>
            {trend} vs période précédente
          </p>
        </div>
      </div>
    </div>
  );
}
