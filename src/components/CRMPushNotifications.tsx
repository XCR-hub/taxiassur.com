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
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);

  // Charger la préférence de son depuis localStorage
  useEffect(() => {
    const soundPref = localStorage.getItem('crm_notification_sound');
    // Si pas de préférence ou si c'était désactivé, on réactive par défaut
    if (soundPref === null || soundPref === 'false') {
      setSoundEnabled(true);
      localStorage.setItem('crm_notification_sound', 'true');
    } else {
      setSoundEnabled(soundPref === 'true');
    }
  }, []);

  // Initialiser l'AudioContext (appelé lors de la première interaction)
  const initAudioContext = useCallback(() => {
    if (!audioContext) {
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        setAudioContext(ctx);
        console.log('🔊 AudioContext initialisé');
        return ctx;
      } catch (error) {
        console.error('❌ Erreur AudioContext:', error);
        return null;
      }
    }
    return audioContext;
  }, [audioContext]);

  // Jouer un son de notification (double bip plus audible)
  const playNotificationSound = useCallback(() => {
    if (!soundEnabled) {
      console.log('🔇 Son désactivé');
      return;
    }

    console.log('🔊 Lecture du son de notification...');

    try {
      // Utiliser l'AudioContext existant ou en créer un nouveau
      const ctx = audioContext || initAudioContext();
      if (!ctx) {
        console.warn('⚠️ AudioContext non disponible');
        return;
      }

      // Premier bip
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.frequency.value = 800;
      osc1.type = 'sine';
      gain1.gain.setValueAtTime(0.4, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.15);

      // Deuxième bip (plus aigu)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.frequency.value = 1000;
      osc2.type = 'sine';
      gain2.gain.setValueAtTime(0.4, ctx.currentTime + 0.2);
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc2.start(ctx.currentTime + 0.2);
      osc2.stop(ctx.currentTime + 0.35);

      console.log('✅ Son joué avec succès');
    } catch (error) {
      console.error('❌ Erreur lors de la lecture du son:', error);
    }
  }, [soundEnabled, audioContext, initAudioContext]);

  // Afficher une notification toast
  const showToast = useCallback((notification: PushNotification) => {
    console.log('📢 showToast called with:', notification.title);

    const toastNotif: ToastNotification = {
      ...notification,
      showTime: Date.now()
    };

    setToasts(prev => [toastNotif, ...prev].slice(0, 5)); // Max 5 toasts

    // Jouer le son
    console.log('🔊 Calling playNotificationSound...');
    console.log('🔊 soundEnabled:', soundEnabled);
    playNotificationSound();

    // Auto-dismiss après 8 secondes
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== notification.id));
    }, 8000);
  }, [playNotificationSound, soundEnabled]);

  // Tester le son
  const testSound = () => {
    console.log('🎵 Test du son manuellement...');

    // Initialiser l'AudioContext en premier (interaction utilisateur garantie)
    if (!audioContext) {
      initAudioContext();
    }

    playNotificationSound();

    // Afficher une notification de test aussi
    const testNotif: PushNotification = {
      id: 'test-' + Date.now(),
      title: 'Test de notification',
      message: 'Si vous voyez ceci et entendez un son, tout fonctionne !',
      type: 'info',
      created_at: new Date().toISOString()
    };
    showToast(testNotif);
  };

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
          console.log('🔊 About to play sound for notification...');
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

    // Feedback visuel
    console.log(newValue ? '🔊 Son activé' : '🔇 Son désactivé');

    // Test de son si on active
    if (newValue) {
      setTimeout(() => playNotificationSound(), 100);
    }
  };

  const getIcon = (eventType: string, priority: string) => {
    // Toutes les icônes en blanc pour un design cohérent gris
    switch (eventType) {
      case 'new_lead':
        return <CheckCircle className="w-5 h-5 text-white" />;
      case 'document_uploaded':
        return <Info className="w-5 h-5 text-white" />;
      case 'status_change':
        return <AlertTriangle className="w-5 h-5 text-white" />;
      case 'email_received':
        return <Bell className="w-5 h-5 text-white" />;
      default:
        return <Info className="w-5 h-5 text-white" />;
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
    // Toujours gris, quelle que soit la priorité
    return 'bg-gradient-to-r from-gray-700 to-gray-800 border-gray-600';
  };

  return (
    <>
      {/* Boutons de contrôle (toujours visibles) */}
      <div className="fixed top-4 right-4 z-[100] flex gap-2">
        {/* Bouton test du son */}
        <button
          onClick={testSound}
          className="p-3 bg-green-600 hover:bg-green-700 rounded-full shadow-lg hover:shadow-xl transition-all"
          title="Tester le son et la notification"
        >
          <Bell className="w-5 h-5 text-white animate-pulse" />
        </button>

        {/* Bouton toggle son */}
        <button
          onClick={toggleSound}
          className={`
            p-3 rounded-full shadow-lg hover:shadow-xl transition-all
            ${soundEnabled
              ? 'bg-blue-600 hover:bg-blue-700'
              : 'bg-gray-300 hover:bg-gray-400'
            }
          `}
          title={soundEnabled ? 'Son activé - Cliquer pour désactiver' : 'Son désactivé - Cliquer pour activer'}
        >
          {soundEnabled ? (
            <Bell className="w-5 h-5 text-white" />
          ) : (
            <Bell className="w-5 h-5 text-gray-600 line-through" />
          )}
        </button>
      </div>

      {/* Container des toasts */}
      {toasts.length > 0 && (
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
      )}

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
