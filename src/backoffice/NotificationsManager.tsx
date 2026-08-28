import React, { useState, useEffect } from 'react';
import { nativeAdminCall } from '@/lib/native-admin-data';
import { Bell, BellOff, Mail, Smartphone, Star, Eye, MousePointer, MessageCircle, TrendingDown } from 'lucide-react';

interface NotificationConfig {
  id: string;
  user_id: string;
  notification_type: 'vip_open' | 'first_open' | 'click' | 'reply' | 'engagement_drop';
  enabled: boolean;
  conditions: Record<string, unknown>;
  channels: string[];
}

export default function NotificationsManager() {
  const [configs, setConfigs] = useState<NotificationConfig[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initUser();
  }, []);

  const initUser = async () => {
    try {
      await loadConfigs();
      setCurrentUserId('native-session');
    } catch (error) {
      console.error('Erreur chargement notifications:', error);
      setCurrentUserId(null);
    }
    setLoading(false);
  };

  const loadConfigs = async () => {
    const data = await nativeAdminCall<{ configs?: NotificationConfig[] }>(
      '/v1/admin/notification-configs',
    );
    setConfigs(data.configs || []);
  };

  const toggleNotification = async (configId: string, currentState: boolean) => {
    try {
      await nativeAdminCall(`/v1/admin/notification-configs/${encodeURIComponent(configId)}`, {
        method: 'PATCH',
        body: JSON.stringify({ enabled: !currentState }),
      });
      await loadConfigs();
    } catch (error) {
      console.error('Erreur mise à jour notification:', error);
    }
  };

  const getNotificationInfo = (type: string) => {
    switch (type) {
      case 'vip_open':
        return {
          icon: <Star className="w-6 h-6" />,
          color: 'from-yellow-500 to-orange-500',
          title: 'Lead VIP Ouvre Email',
          description: 'Alertes quand un lead à fort potentiel (score 70+) ouvre votre email',
          emoji: '⭐'
        };
      case 'first_open':
        return {
          icon: <Eye className="w-6 h-6" />,
          color: 'from-blue-500 to-cyan-500',
          title: 'Première Ouverture',
          description: 'Notification lors de la première interaction d\'un lead avec vos emails',
          emoji: '👀'
        };
      case 'click':
        return {
          icon: <MousePointer className="w-6 h-6" />,
          color: 'from-green-500 to-emerald-500',
          title: 'Clic sur Lien',
          description: 'Alerte instantanée quand un lead clique sur un lien dans votre email',
          emoji: '👆'
        };
      case 'reply':
        return {
          icon: <MessageCircle className="w-6 h-6" />,
          color: 'from-purple-500 to-pink-500',
          title: 'Réponse Reçue',
          description: 'Notification immédiate lorsqu\'un lead répond à votre email',
          emoji: '✉️'
        };
      case 'engagement_drop':
        return {
          icon: <TrendingDown className="w-6 h-6" />,
          color: 'from-red-500 to-rose-500',
          title: 'Baisse d\'Engagement',
          description: 'Alerte quand le score d\'engagement d\'un lead chute sous 30',
          emoji: '⚠️'
        };
      default:
        return {
          icon: <Bell className="w-6 h-6" />,
          color: 'from-gray-500 to-gray-600',
          title: type,
          description: 'Notification',
          emoji: '🔔'
        };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!currentUserId) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-800">Vous devez être connecté pour gérer vos notifications.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Bell className="w-8 h-8" />
              <h1 className="text-3xl font-bold">Notifications Intelligentes</h1>
            </div>
            <p className="text-indigo-100">Recevez des alertes temps réel sur les interactions importantes</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{configs.filter(c => c.enabled).length}</div>
            <div className="text-sm text-indigo-100">actives sur {configs.length}</div>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Mail className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 mb-1">Comment ça marche ?</h3>
            <p className="text-sm text-blue-800">
              Activez les notifications que vous souhaitez recevoir. Vous recevrez un email instantané
              dès qu'un événement important se produit. Vous pourrez réagir rapidement aux opportunités !
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {configs.map((config) => {
          const info = getNotificationInfo(config.notification_type);

          return (
            <div
              key={config.id}
              className={`bg-white rounded-lg shadow-md overflow-hidden border-2 transition ${
                config.enabled ? 'border-green-300' : 'border-gray-200'
              }`}
            >
              <div className={`bg-gradient-to-r ${info.color} p-4 text-white`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {info.icon}
                    <div>
                      <h3 className="font-bold text-lg">{info.emoji} {info.title}</h3>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleNotification(config.id, config.enabled)}
                    className={`p-2 rounded-lg transition ${
                      config.enabled
                        ? 'bg-white bg-opacity-20 hover:bg-opacity-30'
                        : 'bg-black bg-opacity-20 hover:bg-opacity-30'
                    }`}
                  >
                    {config.enabled ? (
                      <Bell className="w-6 h-6" />
                    ) : (
                      <BellOff className="w-6 h-6" />
                    )}
                  </button>
                </div>
              </div>

              <div className="p-4">
                <p className="text-sm text-gray-700 mb-4">{info.description}</p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${config.enabled ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    <span className={`text-sm font-semibold ${config.enabled ? 'text-green-700' : 'text-gray-500'}`}>
                      {config.enabled ? 'Activée' : 'Désactivée'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {config.channels.includes('email') && (
                      <div className="p-1 bg-blue-100 rounded" title="Email">
                        <Mail className="w-4 h-4 text-blue-600" />
                      </div>
                    )}
                    {config.channels.includes('push') && (
                      <div className="p-1 bg-purple-100 rounded" title="Push">
                        <Smartphone className="w-4 h-4 text-purple-600" />
                      </div>
                    )}
                  </div>
                </div>

                {Object.keys(config.conditions).length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-xs text-gray-500 mb-2">Conditions:</p>
                    <div className="text-sm text-gray-700">
                      {config.notification_type === 'vip_open' && (
                        <span>Score minimum: {config.conditions.min_score}</span>
                      )}
                      {config.notification_type === 'engagement_drop' && (
                        <span>Seuil: {config.conditions.threshold}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">📧 Exemple de Notification</h2>
        <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-green-600 rounded-lg text-white">
              <Star className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 mb-1">⭐ Un lead VIP a ouvert votre email</h3>
              <div className="space-y-1 text-sm text-gray-700">
                <p><strong>Lead :</strong> Jean Dupont</p>
                <p><strong>Email :</strong> jean.dupont@exemple.fr</p>
                <p><strong>Événement :</strong> Un lead VIP a ouvert votre email</p>
              </div>
              <p className="text-sm text-gray-600 mt-3">
                Cet email vient d'être ouvert. Consultez le CRM pour plus de détails.
              </p>
              <button className="mt-4 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition">
                📊 Ouvrir le CRM
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">📊 Statistiques</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-3xl font-bold text-green-600">{configs.filter(c => c.enabled).length}</div>
            <div className="text-sm text-gray-600 mt-1">Activées</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-3xl font-bold text-gray-600">{configs.filter(c => !c.enabled).length}</div>
            <div className="text-sm text-gray-600 mt-1">Désactivées</div>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-3xl font-bold text-blue-600">{configs.filter(c => c.channels.includes('email')).length}</div>
            <div className="text-sm text-gray-600 mt-1">Par Email</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-3xl font-bold text-purple-600">
              {configs.length ? Math.round(configs.filter(c => c.enabled).length / configs.length * 100) : 0}%
            </div>
            <div className="text-sm text-gray-600 mt-1">Taux activation</div>
          </div>
        </div>
      </div>
    </div>
  );
}
