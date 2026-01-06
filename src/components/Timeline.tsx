import { ReactNode } from 'react';

export interface TimelineItem {
  id: string;
  title: string;
  description?: string;
  timestamp: Date | string;
  icon?: ReactNode;
  iconColor?: string;
  content?: ReactNode;
  user?: {
    name: string;
    avatar?: string;
  };
}

interface TimelineProps {
  items: TimelineItem[];
  variant?: 'default' | 'minimal';
  className?: string;
}

export function Timeline({ items, variant = 'default', className = '' }: TimelineProps) {
  const formatDate = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `Il y a ${minutes} min`;
    if (hours < 24) return `Il y a ${hours}h`;
    if (days < 7) return `Il y a ${days}j`;

    return d.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  if (variant === 'minimal') {
    return (
      <div className={`space-y-4 ${className}`}>
        {items.map((item, index) => (
          <div key={item.id} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                  ${item.iconColor || 'bg-blue-500'}
                `}
              >
                {item.icon || (
                  <div className="w-2 h-2 bg-white rounded-full" />
                )}
              </div>
              {index < items.length - 1 && (
                <div className="w-0.5 flex-1 bg-gray-800 mt-2" style={{ minHeight: '40px' }} />
              )}
            </div>
            <div className="flex-1 pb-8">
              <div className="font-semibold text-white">{item.title}</div>
              {item.description && (
                <div className="text-sm text-gray-400 mt-1">{item.description}</div>
              )}
              <div className="text-xs text-gray-500 mt-2">{formatDate(item.timestamp)}</div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {items.map((item, index) => (
        <div key={item.id} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div
              className={`
                w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0
                text-white shadow-lg
                ${item.iconColor || 'bg-blue-500'}
              `}
            >
              {item.icon}
            </div>
            {index < items.length - 1 && (
              <div className="w-0.5 flex-1 bg-gray-800 mt-4" style={{ minHeight: '60px' }} />
            )}
          </div>

          <div className="flex-1 pb-8">
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="font-semibold text-white text-lg">{item.title}</h3>
                  {item.description && (
                    <p className="text-gray-400 text-sm mt-1">{item.description}</p>
                  )}
                </div>
                {item.user && (
                  <div className="flex items-center gap-2 ml-4">
                    {item.user.avatar ? (
                      <img
                        src={item.user.avatar}
                        alt={item.user.name}
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                        {item.user.name.charAt(0)}
                      </div>
                    )}
                    <span className="text-sm text-gray-400">{item.user.name}</span>
                  </div>
                )}
              </div>

              {item.content && (
                <div className="mt-3 text-gray-300">{item.content}</div>
              )}

              <div className="mt-3 text-xs text-gray-500">{formatDate(item.timestamp)}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

interface ActivityTimelineProps {
  activities: Array<{
    id: string;
    type: 'created' | 'updated' | 'completed' | 'commented' | 'assigned';
    title: string;
    description?: string;
    timestamp: Date | string;
    user: {
      name: string;
      avatar?: string;
    };
    metadata?: Record<string, any>;
  }>;
  className?: string;
}

export function ActivityTimeline({ activities, className = '' }: ActivityTimelineProps) {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'created':
        return '✨';
      case 'updated':
        return '✏️';
      case 'completed':
        return '✅';
      case 'commented':
        return '💬';
      case 'assigned':
        return '👤';
      default:
        return '📝';
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'created':
        return 'bg-green-500';
      case 'updated':
        return 'bg-blue-500';
      case 'completed':
        return 'bg-purple-500';
      case 'commented':
        return 'bg-yellow-500';
      case 'assigned':
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatDate = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `Il y a ${minutes} min`;
    if (hours < 24) return `Il y a ${hours}h`;
    if (days < 7) return `Il y a ${days}j`;

    return d.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {activities.map((activity, index) => (
        <div key={activity.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div
              className={`
                w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                text-white text-sm ${getActivityColor(activity.type)}
              `}
            >
              {getActivityIcon(activity.type)}
            </div>
            {index < activities.length - 1 && (
              <div className="w-0.5 flex-1 bg-gray-800 mt-2" style={{ minHeight: '30px' }} />
            )}
          </div>

          <div className="flex-1 pb-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {activity.user.avatar ? (
                    <img
                      src={activity.user.avatar}
                      alt={activity.user.name}
                      className="w-6 h-6 rounded-full"
                    />
                  ) : (
                    <div className="w-6 h-6 bg-gray-700 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                      {activity.user.name.charAt(0)}
                    </div>
                  )}
                  <span className="font-semibold text-white">{activity.user.name}</span>
                  <span className="text-gray-500">•</span>
                  <span className="text-sm text-gray-400">{activity.title}</span>
                </div>
                {activity.description && (
                  <p className="text-sm text-gray-400 mt-1 ml-8">{activity.description}</p>
                )}
              </div>
              <span className="text-xs text-gray-500 ml-4">{formatDate(activity.timestamp)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
