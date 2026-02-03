import { useEffect, useState } from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnimatedStatCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  color?: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'cyan';
  trend?: {
    value: number;
    label: string;
    direction: 'up' | 'down';
  };
  suffix?: string;
  prefix?: string;
  decimals?: number;
  animationDuration?: number;
}

export default function AnimatedStatCard({
  title,
  value,
  icon: Icon,
  color = 'blue',
  trend,
  suffix = '',
  prefix = '',
  decimals = 0,
  animationDuration = 1500
}: AnimatedStatCardProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    setIsAnimating(true);
    const startTime = Date.now();
    const startValue = displayValue;
    const difference = value - startValue;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / animationDuration, 1);

      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = startValue + (difference * easeOutQuart);

      setDisplayValue(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
      }
    };

    animate();
  }, [value, animationDuration]);

  const colorClasses = {
    blue: {
      bg: 'from-blue-50 to-blue-100',
      icon: 'bg-blue-100 text-blue-600',
      text: 'text-blue-600',
      border: 'border-blue-200'
    },
    green: {
      bg: 'from-green-50 to-green-100',
      icon: 'bg-green-100 text-green-600',
      text: 'text-green-600',
      border: 'border-green-200'
    },
    amber: {
      bg: 'from-amber-50 to-amber-100',
      icon: 'bg-amber-100 text-amber-600',
      text: 'text-amber-600',
      border: 'border-amber-200'
    },
    red: {
      bg: 'from-red-50 to-red-100',
      icon: 'bg-red-100 text-red-600',
      text: 'text-red-600',
      border: 'border-red-200'
    },
    purple: {
      bg: 'from-purple-50 to-purple-100',
      icon: 'bg-purple-100 text-purple-600',
      text: 'text-purple-600',
      border: 'border-purple-200'
    },
    cyan: {
      bg: 'from-cyan-50 to-cyan-100',
      icon: 'bg-cyan-100 text-cyan-600',
      text: 'text-cyan-600',
      border: 'border-cyan-200'
    }
  };

  const colors = colorClasses[color];

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-gradient-to-br border rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 group',
        colors.bg,
        colors.border
      )}
    >
      {/* Background Icon */}
      <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <Icon className="w-32 h-32" />
      </div>

      {/* Content */}
      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className={cn('p-3 rounded-xl', colors.icon)}>
            <Icon className="w-6 h-6" />
          </div>
          {trend && (
            <div className={cn(
              'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full',
              trend.direction === 'up'
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            )}>
              <span>{trend.direction === 'up' ? '↑' : '↓'}</span>
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>

        {/* Value */}
        <div className="mb-2">
          <span className={cn(
            'text-4xl font-bold transition-all',
            colors.text,
            isAnimating && 'animate-pulse'
          )}>
            {prefix}
            {displayValue.toFixed(decimals)}
            {suffix}
          </span>
        </div>

        {/* Title */}
        <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>

        {/* Trend Label */}
        {trend && (
          <p className="text-xs text-gray-500">{trend.label}</p>
        )}

        {/* Progress Bar */}
        <div className="mt-4 h-1 bg-white/50 rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-1000 ease-out', colors.icon.split(' ')[0])}
            style={{ width: `${Math.min((displayValue / value) * 100, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
