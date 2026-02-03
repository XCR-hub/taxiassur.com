import { useState, useEffect } from 'react';
import {
  Bell,
  CheckCircle,
  AlertCircle,
  Clock,
  FileText,
  Mail,
  DollarSign,
  TrendingUp,
  X,
  Check,
  Trash2,
  Filter,
  Loader2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import ContextualTooltip from '@/components/ContextualTooltip';

interface Notification {
  id: string;
  type: 'document' | 'quote' | 'lead' | 'system' | 'reminder';
  title: string;
  message: string;
  lead_id?: string;
  lead_name?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  read: boolean;
  dismissed: boolean;
  created_at: string;
  action_url?: string;
}

interface NotificationCenterEnhancedProps {
  userId?: string;
  onNotificationClick?: (notification: Notification) => void;
}

export default function NotificationCenterEnhanced({
  userId,
  onNotificationClick
}: NotificationCenterEnhancedProps) {
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    loadNotifications();

    // Real-time subscription
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'crm_event_notifications'
      }, () => {
        loadNotifications();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('crm_event_notifications')
        .select('*')
        .eq('dismissed', false)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotifications(data || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('crm_event_notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;

      await loadNotifications();
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('crm_event_notifications')
        .update({ read: true })
        .eq('dismissed', false)
        .eq('read', false);

      if (error) throw error;

      await loadNotifications();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const dismissNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('crm_event_notifications')
        .update({ dismissed: true })
        .eq('id', notificationId);

      if (error) throw error;

      await loadNotifications();
    } catch (error) {
      console.error('Error dismissing:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    onNotificationClick?.(notification);
  };

  const getNotificationIcon = (type: string) => {
    const iconMap = {
      document: FileText,
      quote: DollarSign,
      lead: TrendingUp,
      system: Bell,
      reminder: Clock
    };
    return iconMap[type as keyof typeof iconMap] || Bell;
  };

  const getNotificationColor = (priority: string, read: boolean) => {
    if (read) return 'bg-gray-50 border-gray-200';

    const colorMap = {
      urgent: 'bg-red-50 border-red-200',
      high: 'bg-orange-50 border-orange-200',
      medium: 'bg-blue-50 border-blue-200',
      low: 'bg-gray-50 border-gray-200'
    };
    return colorMap[priority as keyof typeof colorMap] || 'bg-gray-50 border-gray-200';
  };

  const getPriorityBadge = (priority: string) => {
    const badgeMap = {
      urgent: 'bg-red-100 text-red-700',
      high: 'bg-orange-100 text-orange-700',
      medium: 'bg-blue-100 text-blue-700',
      low: 'bg-gray-100 text-gray-700'
    };
    return badgeMap[priority as keyof typeof badgeMap] || 'bg-gray-100 text-gray-700';
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread' && n.read) return false;
    if (typeFilter !== 'all' && n.type !== typeFilter) return false;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Bell className="w-6 h-6 text-gray-700" />
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Notifications</h2>
            <p className="text-sm text-gray-600">
              {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {unreadCount > 0 && (
            <ContextualTooltip content="Tout marquer comme lu" type="tip">
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm"
              >
                <Check className="w-4 h-4" />
                <span>Tout marquer comme lu</span>
              </button>
            </ContextualTooltip>
          )}
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('all')}
          className={cn(
            "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
            filter === 'all'
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          )}
        >
          Toutes ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={cn(
            "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
            filter === 'unread'
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          )}
        >
          Non lues ({unreadCount})
        </button>

        <div className="h-6 w-px bg-gray-300 mx-2" />

        {['all', 'document', 'quote', 'lead', 'reminder'].map((type) => (
          <button
            key={type}
            onClick={() => setTypeFilter(type)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              typeFilter === type
                ? "bg-purple-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            )}
          >
            {type === 'all' ? 'Tous types' : type}
          </button>
        ))}
      </div>

      {/* Liste des notifications */}
      <div className="space-y-2">
        {filteredNotifications.map((notification) => {
          const Icon = getNotificationIcon(notification.type);

          return (
            <div
              key={notification.id}
              className={cn(
                "relative rounded-xl shadow-sm border p-4 transition-all cursor-pointer hover:shadow-md",
                getNotificationColor(notification.priority, notification.read)
              )}
              onClick={() => handleNotificationClick(notification)}
            >
              {!notification.read && (
                <div className="absolute top-2 right-2 w-2 h-2 bg-blue-600 rounded-full" />
              )}

              <div className="flex items-start gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                  notification.type === 'document' && "bg-blue-100 text-blue-600",
                  notification.type === 'quote' && "bg-green-100 text-green-600",
                  notification.type === 'lead' && "bg-purple-100 text-purple-600",
                  notification.type === 'reminder' && "bg-orange-100 text-orange-600",
                  notification.type === 'system' && "bg-gray-100 text-gray-600"
                )}>
                  <Icon className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="font-medium text-gray-900 text-sm">
                      {notification.title}
                    </h4>
                    <div className="flex items-center gap-1">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-xs font-medium",
                        getPriorityBadge(notification.priority)
                      )}>
                        {notification.priority}
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 mb-2">
                    {notification.message}
                  </p>

                  {notification.lead_name && (
                    <div className="text-xs text-gray-500 mb-2">
                      Lead : {notification.lead_name}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {new Date(notification.created_at).toLocaleString('fr-FR')}
                    </span>

                    <div className="flex gap-1">
                      {!notification.read && (
                        <ContextualTooltip content="Marquer comme lu" type="tip">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification.id);
                            }}
                            className="p-1 hover:bg-blue-100 rounded transition-colors"
                          >
                            <Check className="w-4 h-4 text-blue-600" />
                          </button>
                        </ContextualTooltip>
                      )}
                      <ContextualTooltip content="Supprimer" type="warning">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            dismissNotification(notification.id);
                          }}
                          className="p-1 hover:bg-red-100 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </ContextualTooltip>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {filteredNotifications.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
            <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">
              {filter === 'unread'
                ? 'Aucune notification non lue'
                : 'Aucune notification'}
            </p>
            <p className="text-sm text-gray-500">
              Vous serez notifié ici des événements importants
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
