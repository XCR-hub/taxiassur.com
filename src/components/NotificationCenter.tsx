import { Bell, Check, X, ExternalLink, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNotifications } from '../lib/realtime-notifications';
import { supabase } from '../lib/supabase';

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [debugInfo, setDebugInfo] = useState('Chargement...');
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  // Test de connexion au chargement
  useEffect(() => {
    const testConnection = async () => {
      try {
        const { data, error, count } = await supabase
          .from('crm_event_notifications')
          .select('*', { count: 'exact', head: false })
          .limit(1);

        if (error) {
          setDebugInfo(`❌ Erreur: ${error.message}`);
          console.error('[NotificationCenter] Supabase Error:', error);
        } else {
          setDebugInfo(`✅ ${notifications.length} notifications (${unreadCount} non lues) - Total DB: ${count}`);
          console.log('[NotificationCenter] Data loaded:', { notifications, count, data });
        }
      } catch (err) {
        setDebugInfo(`❌ Exception: ${err}`);
        console.error('[NotificationCenter] Exception:', err);
      }
    };

    testConnection();
  }, [notifications, unreadCount]);

  const handleManualRefresh = async () => {
    console.log('[NotificationCenter] Manual refresh triggered');
    window.location.reload();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
        aria-label="Notifications"
        title={debugInfo}
      >
        <Bell className="h-5 w-5 text-gray-700 dark:text-gray-300" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full z-50 mt-2 w-96 rounded-lg bg-white shadow-xl dark:bg-gray-800">
            <div className="border-b border-gray-200 p-4 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Notifications
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleManualRefresh}
                    className="rounded p-1 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                    title="Recharger la page"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                    >
                      Tout marquer comme lu
                    </button>
                  )}
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500">{debugInfo}</p>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  Aucune notification
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`border-b border-gray-200 p-4 dark:border-gray-700 ${
                      !notification.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {notification.title}
                        </h4>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                          {notification.message}
                        </p>
                        <p className="mt-2 text-xs text-gray-500">
                          {new Date(notification.timestamp).toLocaleString('fr-FR')}
                        </p>
                        {notification.actionUrl && (
                          <a
                            href={notification.actionUrl}
                            className="mt-2 inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                          >
                            {notification.actionLabel || 'Voir plus'}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                      <div className="flex gap-1">
                        {!notification.read && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="rounded p-1 hover:bg-gray-200 dark:hover:bg-gray-700"
                            aria-label="Marquer comme lu"
                          >
                            <Check className="h-4 w-4 text-green-600" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
