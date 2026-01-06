import { ReactNode } from 'react';
import { X } from 'lucide-react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  rounded?: boolean;
  removable?: boolean;
  onRemove?: () => void;
  className?: string;
  icon?: ReactNode;
  pulse?: boolean;
}

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  rounded = false,
  removable = false,
  onRemove,
  className = '',
  icon,
  pulse = false
}: BadgeProps) {
  const variantClasses = {
    default: 'bg-gray-700 text-gray-300 border-gray-600',
    primary: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
    success: 'bg-green-500/10 text-green-500 border-green-500/30',
    warning: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
    danger: 'bg-red-500/10 text-red-500 border-red-500/30',
    info: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
    outline: 'bg-transparent text-gray-400 border-gray-700'
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base'
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 font-semibold border
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${rounded ? 'rounded-full' : 'rounded-md'}
        ${pulse ? 'animate-pulse' : ''}
        ${className}
      `}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
      {removable && (
        <button
          onClick={onRemove}
          className="flex-shrink-0 hover:opacity-70 transition-opacity"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
}

interface StatusBadgeProps {
  status: 'online' | 'offline' | 'away' | 'busy';
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function StatusBadge({ status, showText = true, size = 'md' }: StatusBadgeProps) {
  const statusConfig = {
    online: { color: 'bg-green-500', text: 'En ligne' },
    offline: { color: 'bg-gray-500', text: 'Hors ligne' },
    away: { color: 'bg-yellow-500', text: 'Absent' },
    busy: { color: 'bg-red-500', text: 'Occupé' }
  };

  const config = statusConfig[status];
  const sizeClass = size === 'sm' ? 'w-2 h-2' : size === 'md' ? 'w-3 h-3' : 'w-4 h-4';

  return (
    <span className="inline-flex items-center gap-2">
      <span className={`${sizeClass} ${config.color} rounded-full animate-pulse`} />
      {showText && <span className="text-sm text-gray-400">{config.text}</span>}
    </span>
  );
}

interface CountBadgeProps {
  count: number;
  max?: number;
  variant?: 'primary' | 'danger';
  size?: 'sm' | 'md';
  className?: string;
}

export function CountBadge({
  count,
  max = 99,
  variant = 'primary',
  size = 'md',
  className = ''
}: CountBadgeProps) {
  const displayCount = count > max ? `${max}+` : count;

  const variantClasses = {
    primary: 'bg-blue-500 text-white',
    danger: 'bg-red-500 text-white'
  };

  const sizeClasses = {
    sm: 'w-4 h-4 text-[10px]',
    md: 'w-5 h-5 text-xs'
  };

  if (count === 0) return null;

  return (
    <span
      className={`
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        inline-flex items-center justify-center
        rounded-full font-bold
        ${className}
      `}
    >
      {displayCount}
    </span>
  );
}
