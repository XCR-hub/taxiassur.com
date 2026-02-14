import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Bell, X, Check, AlertCircle, UserPlus } from 'lucide-react';

interface Notification {
  id: string;
  title?: string;
  message: string;
  priority: number;
  is_read: boolean;
  created_at: string;
  event_type: string;
  context_data?: {
    action_url?: string;
    lead_id?: string;
    email?: string;
    phone?: string;
  };
}

export default function RealtimeNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPanel, setShowPanel] = useState(false);
  const [activeToasts, setActiveToasts] = useState<Notification[]>([]);

  // Charger les notifications initiales
  const loadNotifications = useCallback(async () => {
    const { data } = await supabase
      .from('crm_event_notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.is_read).length);
    }
  }, []);

  useEffect(() => {
    loadNotifications();

    // Écouter les nouvelles notifications en temps réel
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'crm_event_notifications'
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications(prev => [newNotif, ...prev]);
          setUnreadCount(prev => prev + 1);

          // Afficher un toast persistant pour les nouveaux leads
          if (newNotif.event_type === 'new_lead') {
            setActiveToasts(prev => [...prev, newNotif]);
          }

          // Son de notification pour tous les types
          try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 800;
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
          } catch (error) {
            console.error('Error playing notification sound:', error);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'crm_event_notifications'
        },
        (payload) => {
          const updated = payload.new as Notification;
          setNotifications(prev =>
            prev.map(n => n.id === updated.id ? updated : n)
          );

          if (updated.is_read) {
            setUnreadCount(prev => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadNotifications]);

  const markAsRead = async (notificationId: string) => {
    await supabase.rpc('mark_notification_as_read', {
      p_notification_id: notificationId
    });
  };

  const markAllAsRead = async () => {
    await supabase.rpc('mark_all_notifications_as_read');
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    const actionUrl = notification.context_data?.action_url;
    if (actionUrl) {
      window.location.href = actionUrl;
    }
  };

  const handleToastClick = (notification: Notification) => {
    // Marquer comme lu
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    // Supprimer du tableau des toasts
    setActiveToasts(prev => prev.filter(t => t.id !== notification.id));

    // Naviguer vers l'action
    const actionUrl = notification.context_data?.action_url;
    if (actionUrl) {
      window.location.href = actionUrl;
    }
  };

  const dismissToast = (notificationId: string) => {
    setActiveToasts(prev => prev.filter(t => t.id !== notificationId));
    markAsRead(notificationId);
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 10) return 'text-red-600 bg-red-50 border-red-200';
    if (priority >= 5) return 'text-gray-700 bg-gray-100 border-gray-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  return (
    <>
      {/* Toasts persistants en haut de l'écran */}
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] flex flex-col gap-3 pointer-events-none w-full max-w-md px-4">
        {activeToasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl shadow-2xl border-2 border-blue-400 animate-slideDown"
            style={{
              animation: 'slideDown 0.3s ease-out'
            }}
          >
            <div className="p-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 bg-white bg-opacity-20 rounded-full p-2">
                  <UserPlus className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-lg mb-1">
                    {toast.title || 'Nouveau Lead !'}
                  </h4>
                  <p className="text-sm text-blue-50 mb-3">
                    {toast.message}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToastClick(toast)}
                      className="bg-white text-blue-600 font-bold px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors text-sm"
                    >
                      Voir le lead
                    </button>
                    <button
                      onClick={() => dismissToast(toast.id)}
                      className="bg-blue-700 bg-opacity-50 text-white px-4 py-2 rounded-lg hover:bg-opacity-70 transition-colors text-sm"
                    >
                      Fermer
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => dismissToast(toast.id)}
                  className="flex-shrink-0 text-white hover:text-blue-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bouton cloche avec badge */}
      <div className="relative">
        <button
          onClick={() => setShowPanel(!showPanel)}
          className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Bell className="w-6 h-6 text-gray-600" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Panel de notifications */}
        {showPanel && (
          <div className="absolute right-0 top-12 w-96 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 max-h-[600px] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <h3 className="font-semibold text-gray-900">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-gray-600 hover:text-gray-800 font-medium"
                  >
                    Tout marquer comme lu
                  </button>
                )}
                <button
                  onClick={() => setShowPanel(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Liste des notifications */}
            <div className="overflow-y-auto flex-1">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="w-12 h-12 mx-auto mb-2 opacity-20" />
                  <p>Aucune notification</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 border-b border-gray-100 cursor-pointer transition-colors hover:bg-gray-50 ${
                      !notification.is_read ? 'bg-gray-100' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`rounded-full p-2 ${getPriorityColor(notification.priority)}`}>
                        {notification.event_type === 'new_lead' ? (
                          <AlertCircle className="w-4 h-4" />
                        ) : notification.event_type === 'quote_validated' ? (
                          <Check className="w-4 h-4" />
                        ) : notification.event_type === 'quote_refused' ? (
                          <X className="w-4 h-4" />
                        ) : (
                          <Bell className="w-4 h-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className={`font-semibold text-sm ${
                            !notification.is_read ? 'text-gray-900' : 'text-gray-600'
                          }`}>
                            {notification.title || (
                              notification.event_type === 'new_lead' ? 'Nouveau Lead!' :
                              notification.event_type === 'status_change' ? 'Changement de statut' :
                              notification.event_type === 'document_uploaded' ? 'Document reçu' :
                              notification.event_type === 'quote_validated' ? '✅ Devis accepté' :
                              notification.event_type === 'quote_refused' ? '❌ Devis refusé' :
                              'Notification'
                            )}
                          </h4>
                          {!notification.is_read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1"></div>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(notification.created_at).toLocaleString('fr-FR')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
