import { useState, useEffect, useCallback } from 'react';
import { X, Bell, CheckCircle, AlertCircle, Info, AlertTriangle, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

interface PushNotification {
  id: string;
  event_type: string;
  message: string;
  lead_id?: string;
  created_at: string;
  priority: string;
  metadata?: {
    lead_name?: string;
    document_type?: string;
    [key: string]: any;
  };
}

interface ToastNotification extends PushNotification {
  showTime: number;
}

export function CRMPushNotifications() {
  const navigate = useNavigate();
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Charger la préférence de son depuis localStorage
  useEffect(() => {
    const soundPref = localStorage.getItem('crm_notification_sound');
    if (soundPref !== null) {
      setSoundEnabled(soundPref === 'true');
    }
  }, []);

  // Jouer un son de notification
  const playNotificationSound = useCallback(() => {
    if (!soundEnabled) return;

    try {
      // Créer un son simple avec Web Audio API
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
  }, [soundEnabled]);

  // Afficher une notification toast
  const showToast = useCallback((notification: PushNotification) => {
    const toastNotif: ToastNotification = {
      ...notification,
      showTime: Date.now()
    };

    setToasts(prev => [toastNotif, ...prev].slice(0, 5)); // Max 5 toasts

    // Jouer le son
    playNotificationSound();

    // Auto-dismiss après 8 secondes
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== notification.id));
    }, 8000);
  }, [playNotificationSound]);

  // Écouter les nouvelles notifications en temps réel
  useEffect(() => {
    console.log('🔔 [CRMPushNotifications] Setting up realtime subscription...');

    const channel = supabase
      .channel('push_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'crm_event_notifications',
        },
        (payload) => {
          console.log('🆕 [CRMPushNotifications] New notification received:', payload.new);
          showToast(payload.new as PushNotification);
        }
      )
      .subscribe((status) => {
        console.log('📡 [CRMPushNotifications] Subscription status:', status);
      });

    return () => {
      console.log('🔌 [CRMPushNotifications] Unsubscribing...');
      channel.unsubscribe();
    };
  }, [showToast]);

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const handleToastClick = async (notification: ToastNotification) => {
    if (notification.lead_id) {
      // Marquer comme lu
      await supabase
        .from('crm_event_notifications')
        .update({ is_read: true })
        .eq('id', notification.id);

      // Naviguer vers le lead
      dismissToast(notification.id);
      navigate(`/backoffice/crm-killer/lead/${notification.lead_id}`);
    }
  };

  const toggleSound = () => {
    const newValue = !soundEnabled;
    setSoundEnabled(newValue);
    localStorage.setItem('crm_notification_sound', String(newValue));
  };

  const getIcon = (eventType: string, priority: string) => {
    if (priority === 'high' || priority === 'urgent') {
      return <AlertCircle className="w-5 h-5 text-red-500" />;
    }

    switch (eventType) {
      case 'new_lead':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'document_uploaded':
        return <Info className="w-5 h-5 text-blue-500" />;
      case 'status_change':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'email_received':
        return <Bell className="w-5 h-5 text-cyan-500" />;
      default:
        return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  const getTitle = (eventType: string) => {
    const titles: Record<string, string> = {
      new_lead: '🎉 Nouveau Prospect',
      document_uploaded: '📄 Document Reçu',
      status_change: '🔄 Changement de Statut',
      email_received: '📧 Nouvel Email',
      ai_decision: '🤖 Décision IA',
      document_validated: '✅ Document Validé',
      quote_requested: '💰 Demande de Devis'
    };
    return titles[eventType] || '🔔 Notification';
  };

  const getBgColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-gradient-to-r from-red-500 to-red-600 border-red-700';
      case 'high':
        return 'bg-gradient-to-r from-orange-500 to-orange-600 border-orange-700';
      case 'medium':
        return 'bg-gradient-to-r from-blue-500 to-blue-600 border-blue-700';
      default:
        return 'bg-gradient-to-r from-gray-700 to-gray-800 border-gray-600';
    }
  };

  if (toasts.length === 0) return null;

  return (
    <>
      {/* Bouton toggle son (fixe en haut à droite) */}
      <button
        onClick={toggleSound}
        className="fixed top-4 right-20 z-[100] p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:shadow-xl transition-all"
        title={soundEnabled ? 'Désactiver le son' : 'Activer le son'}
      >
        {soundEnabled ? (
          <Bell className="w-5 h-5 text-blue-600" />
        ) : (
          <Bell className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {/* Container des toasts */}
      <div className="fixed top-20 right-4 z-[999] space-y-3 pointer-events-none">
        {toasts.map((toast, index) => (
          <div
            key={toast.id}
            className={`
              pointer-events-auto w-96 rounded-xl shadow-2xl border-2
              ${getBgColor(toast.priority)}
              transform transition-all duration-300 ease-out
              animate-slide-in-right
            `}
            style={{
              animation: `slideInRight 0.4s ease-out ${index * 0.1}s both`
            }}
          >
            <div className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {getIcon(toast.event_type, toast.priority)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-white text-sm">
                      {getTitle(toast.event_type)}
                    </h4>
                    <button
                      onClick={() => dismissToast(toast.id)}
                      className="flex-shrink-0 p-1 hover:bg-white/20 rounded transition-colors"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>

                  <p className="mt-1 text-sm text-white/90 line-clamp-2">
                    {toast.message}
                  </p>

                  {toast.metadata?.lead_name && (
                    <p className="mt-1 text-xs text-white/70">
                      👤 {toast.metadata.lead_name}
                    </p>
                  )}

                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs text-white/60">
                      {new Date(toast.created_at).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>

                    {toast.lead_id && (
                      <button
                        onClick={() => handleToastClick(toast)}
                        className="ml-auto flex items-center gap-1 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-medium text-white transition-colors"
                      >
                        Voir
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Barre de progression */}
            <div className="h-1 bg-white/20 overflow-hidden">
              <div
                className="h-full bg-white/50"
                style={{
                  animation: 'shrink 8s linear forwards'
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Animations CSS */}
      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }

        .animate-slide-in-right {
          animation: slideInRight 0.4s ease-out;
        }
      `}</style>
    </>
  );
}

export default CRMPushNotifications;
