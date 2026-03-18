import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Bell, FileText, CreditCard, CheckCircle, Clock, AlertCircle,
  RefreshCw, Package, Shield, MessageSquare, Info
} from 'lucide-react';
import ClientLayout from '../../components/client/ClientLayout';
import SEOHead from '../../components/SEOHead';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

interface Notification {
  id: string;
  title: string;
  message: string | null;
  type: string | null;
  created_at: string;
  dismissed: boolean;
  read_at: string | null;
}

const TYPE_CONFIG: Record<string, { icon: any; bg: string; color: string }> = {
  document:      { icon: FileText,      bg: 'bg-yellow-100', color: 'text-yellow-600' },
  payment:       { icon: CreditCard,    bg: 'bg-green-100',  color: 'text-green-600'  },
  quote:         { icon: Package,       bg: 'bg-gray-100',   color: 'text-gray-600'   },
  claim:         { icon: Shield,        bg: 'bg-red-100',    color: 'text-red-600'    },
  message:       { icon: MessageSquare, bg: 'bg-gray-100',   color: 'text-gray-600'   },
  reminder:      { icon: Clock,         bg: 'bg-amber-100',  color: 'text-amber-600'  },
  info:          { icon: Info,          bg: 'bg-gray-100',   color: 'text-gray-500'   },
  default:       { icon: Bell,          bg: 'bg-gray-100',   color: 'text-gray-500'   },
};

function formatRelativeDate(iso: string): string {
  const now = new Date();
  const date = new Date(iso);
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 2) return "À l'instant";
  if (minutes < 60) return `Il y a ${minutes} min`;
  if (hours < 24) return `Il y a ${hours}h`;
  if (days === 1) return 'Hier';
  if (days < 7) return `Il y a ${days} jours`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function ClientNotifications() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const email = searchParams.get('email') || sessionStorage.getItem('client_email') || '';

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    if (!email) {
      navigate('/espace-client');
      return;
    }
    sessionStorage.setItem('client_email', email);
    loadNotifications();
  }, [email, navigate]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const { data: portal } = await supabase
        .from('client_portal_users')
        .select('lead_id')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();

      let leadId = portal?.lead_id;

      if (!leadId) {
        const { data: lead } = await supabase
          .from('crm_leads')
          .select('id')
          .eq('email', email.toLowerCase().trim())
          .maybeSingle();
        leadId = lead?.id;
      }

      if (!leadId) {
        setNotifications([]);
        return;
      }

      const { data, error } = await supabase
        .from('crm_event_notifications')
        .select('id, title, message, type, created_at, dismissed, read_at')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications((data || []) as Notification[]);
    } catch (err) {
      logger.error('Error loading notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      const unread = notifications.filter(n => !n.read_at).map(n => n.id);
      if (unread.length === 0) return;

      await supabase
        .from('crm_event_notifications')
        .update({ read_at: new Date().toISOString() })
        .in('id', unread);

      setNotifications(prev => prev.map(n => ({
        ...n,
        read_at: n.read_at || new Date().toISOString()
      })));
    } catch (err) {
      logger.error('Error marking all read:', err);
    } finally {
      setMarkingAll(false);
    }
  };

  const markRead = async (id: string) => {
    try {
      await supabase
        .from('crm_event_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', id);

      setNotifications(prev => prev.map(n =>
        n.id === id ? { ...n, read_at: new Date().toISOString() } : n
      ));
    } catch (err) {
      logger.error('Error marking read:', err);
    }
  };

  const unreadCount = notifications.filter(n => !n.read_at).length;

  return (
    <>
      <SEOHead
        title="Mes Notifications - Espace Client TaxiAssur"
        description="Consultez vos notifications"
        noIndex={true}
      />

      <ClientLayout email={email}>
        <div className="space-y-6">

          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                Notifications
                {unreadCount > 0 && (
                  <span className="inline-flex items-center justify-center w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full">
                    {unreadCount}
                  </span>
                )}
              </h1>
              <p className="text-gray-500 text-sm mt-0.5">
                Toute l'activité de votre dossier d'assurance
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  disabled={markingAll}
                  className="text-sm text-yellow-600 hover:text-yellow-700 font-medium transition-colors"
                >
                  {markingAll ? 'En cours...' : 'Tout marquer comme lu'}
                </button>
              )}
              <button
                onClick={loadNotifications}
                disabled={loading}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded-lg px-3 py-2 transition-colors hover:bg-gray-50"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
              <div className="w-10 h-10 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ border: '3px solid', borderTopColor: 'transparent', borderRadius: '50%', width: 40, height: 40 }} />
              <p className="text-sm text-gray-500">Chargement des notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
              <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bell size={24} className="text-gray-300" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-1">Aucune notification</h3>
              <p className="text-sm text-gray-500">
                Vous serez notifié des mises à jour importantes concernant votre dossier.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
              {notifications.map((notif) => {
                const typeKey = notif.type && TYPE_CONFIG[notif.type] ? notif.type : 'default';
                const cfg = TYPE_CONFIG[typeKey];
                const Icon = cfg.icon;
                const isUnread = !notif.read_at;

                return (
                  <div
                    key={notif.id}
                    onClick={() => isUnread && markRead(notif.id)}
                    className={`p-5 transition-colors cursor-default ${
                      isUnread ? 'bg-yellow-50/40 hover:bg-yellow-50/60 cursor-pointer' : 'hover:bg-gray-50/50'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-11 h-11 ${cfg.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                        <Icon size={20} className={cfg.color} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className={`font-semibold text-sm ${isUnread ? 'text-gray-900' : 'text-gray-700'}`}>
                            {notif.title}
                          </h3>
                          {isUnread && (
                            <span className="w-2 h-2 bg-yellow-500 rounded-full flex-shrink-0" />
                          )}
                        </div>
                        {notif.message && (
                          <p className="text-sm text-gray-500 mb-1 leading-relaxed">{notif.message}</p>
                        )}
                        <p className="text-xs text-gray-400">{formatRelativeDate(notif.created_at)}</p>
                      </div>

                      {isUnread && (
                        <button
                          onClick={(e) => { e.stopPropagation(); markRead(notif.id); }}
                          className="text-xs text-gray-400 hover:text-gray-600 flex-shrink-0 transition-colors"
                        >
                          <CheckCircle size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="bg-gradient-to-r from-yellow-600 to-yellow-500 rounded-xl p-5 text-black">
            <div className="flex items-start gap-4">
              <Bell size={28} className="flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="font-bold mb-1">Restez informé</h2>
                <p className="text-sm opacity-90 mb-3">
                  Toutes les mises à jour de votre dossier apparaissent ici : validation de documents, devis disponibles, échéances...
                </p>
                <a
                  href="mailto:team@taxiassur.com"
                  className="inline-block px-4 py-2 bg-black/20 hover:bg-black/30 text-black rounded-lg font-semibold text-sm transition-all"
                >
                  Contacter mon conseiller
                </a>
              </div>
            </div>
          </div>

        </div>
      </ClientLayout>
    </>
  );
}
