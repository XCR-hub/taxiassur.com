// CRM Moderne avec Auth Supabase - v2026.02.19
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Inbox,
  FileCheck,
  Shield,
  Settings,
  Bot,
  Mail,
  BarChart3,
  Zap,
  MessageSquare,
  Target,
  Send,
  FileText,
  Bell,
  Home,
  LogOut,
  Menu,
  X,
  Search,
  RefreshCw,
  Copy,
  Receipt,
  Building2
} from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { ThemeToggle } from '@/components/ThemeToggle';
import { AdminSessionKeepAlive } from '@/components/AdminSessionKeepAlive';
import RealtimeNotifications from '@/components/crm/RealtimeNotifications';
import { CRMPushNotifications } from '@/components/CRMPushNotifications';
import AdminLogin from '@/components/AdminLogin';

interface CRMStats {
  unread_messages: number;
  pending_items: number;
  at_risk_clients: number;
  ai_decisions_pending: number;
}

const CRMLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut, isAuthenticated, loading } = useAdminAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Log pour vérifier la version déployée
  useEffect(() => {
    console.log('🚀 CRM Layout v2026.02.19 - Auth Supabase Moderne');
  }, []);

  // Afficher le loader pendant le chargement
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <RefreshCw className="animate-spin mx-auto mb-4 text-orange-600" size={48} />
          <p className="text-gray-700 font-medium">Vérification de la session...</p>
        </div>
      </div>
    );
  }

  // Afficher le login si pas authentifié
  if (!isAuthenticated) {
    return <AdminLogin onSuccess={() => window.location.reload()} />;
  }

  const [stats] = useState<CRMStats>({
    unread_messages: 0,
    pending_items: 0,
    at_risk_clients: 0,
    ai_decisions_pending: 0
  });

  const menuItems = [
    {
      id: 'overview',
      label: 'Vue d\'ensemble',
      icon: LayoutDashboard,
      path: '/backoffice/crm',
      badge: null
    },
    {
      id: 'pipeline',
      label: 'Pipeline Kanban',
      icon: Target,
      path: '/backoffice/crm-killer/pipeline',
      badge: null
    },
    {
      id: 'inbox',
      label: 'Inbox Multicanal',
      icon: Inbox,
      path: '/backoffice/crm-killer/inbox',
      badge: stats.unread_messages || null
    },
    {
      id: 'clients',
      label: 'Clients',
      icon: Users,
      path: '/backoffice/clients',
      badge: null
    },
    {
      id: 'invoicing',
      label: 'Facturation Libre',
      icon: Receipt,
      path: '/backoffice/invoicing',
      badge: null
    },
    {
      id: 'production',
      label: 'Production & Compagnies',
      icon: Building2,
      path: '/backoffice/production',
      badge: null
    },
    {
      id: 'retention',
      label: 'Rétention',
      icon: Shield,
      path: '/backoffice/crm-killer/retention',
      badge: stats.at_risk_clients || null
    },
    {
      id: 'duplicates',
      label: 'Doublons',
      icon: Copy,
      path: '/backoffice/doublons',
      badge: null
    },
    {
      id: 'ia',
      label: 'IA Governance',
      icon: Bot,
      path: '/backoffice/crm-killer/ia',
      badge: stats.ai_decisions_pending || null
    },
    {
      id: 'templates',
      label: 'Templates',
      icon: FileText,
      path: '/backoffice/crm-killer/templates',
      badge: null
    },
    {
      id: 'email-marketing',
      label: 'Email Marketing',
      icon: Mail,
      path: '/backoffice/email-marketing',
      badge: null
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      icon: MessageSquare,
      path: '/backoffice/whatsapp',
      badge: null
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      path: '/backoffice/analytics',
      badge: null
    },
    {
      id: 'automations',
      label: 'Automations',
      icon: Zap,
      path: '/backoffice/automations',
      badge: null
    },
    {
      id: 'newsletter',
      label: 'Newsletter',
      icon: Send,
      path: '/backoffice/newsletter',
      badge: null
    }
  ];

  const handleLogout = async () => {
    await signOut();
    navigate('/backoffice');
  };

  const currentPath = location.pathname;

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* SIDEBAR À GAUCHE - FIXE */}
      <aside className={`bg-gradient-to-b from-gray-900 via-blue-900 to-purple-900 text-white transition-all duration-300 flex flex-col flex-shrink-0 ${sidebarOpen ? 'w-64' : 'w-20'}`}>
        {/* Logo & Toggle */}
        <div className="p-4 flex items-center justify-between border-b border-white/10">
          {sidebarOpen ? (
            <>
              <div className="flex items-center gap-2">
                <Zap className="text-yellow-400" size={28} />
                <div>
                  <div className="font-bold text-lg">CRM Killer</div>
                  <div className="text-xs text-blue-200">by TaxiAssur</div>
                </div>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="hover:bg-white/10 p-2 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </>
          ) : (
            <button onClick={() => setSidebarOpen(true)} className="hover:bg-white/10 p-2 rounded-lg transition-colors mx-auto">
              <Menu size={24} />
            </button>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto py-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.path || currentPath.startsWith(item.path + '/');

            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 transition-all relative group ${
                  isActive
                    ? 'bg-white/20 text-white border-r-4 border-yellow-400'
                    : 'text-blue-100 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon size={22} className="flex-shrink-0" />
                {sidebarOpen && (
                  <>
                    <span className="font-medium flex-1 text-left">{item.label}</span>
                    {item.badge && item.badge > 0 && (
                      <span className="bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
                {!sidebarOpen && item.badge && item.badge > 0 && (
                  <span className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Section en bas */}
        <div className="border-t border-white/10 p-4">
          <button
            onClick={() => navigate('/backoffice/crm-killer/settings')}
            className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-white/10 rounded-lg transition-colors mb-2 ${!sidebarOpen && 'justify-center'}`}
          >
            <Settings size={20} />
            {sidebarOpen && <span>Paramètres</span>}
          </button>

          {sidebarOpen && (
            <div className="bg-white/10 rounded-lg p-3 mb-2">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-gray-900 font-bold">
                  {user?.full_name?.[0] || 'A'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{user?.full_name || 'Admin'}</div>
                  <div className="text-xs text-blue-200 truncate">{user?.email}</div>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={() => navigate('/backoffice')}
            className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-white/10 rounded-lg transition-colors mb-2 ${!sidebarOpen && 'justify-center'}`}
          >
            <Home size={20} />
            {sidebarOpen && <span>Dashboard Principal</span>}
          </button>

          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors ${!sidebarOpen && 'justify-center'}`}
          >
            <LogOut size={20} />
            {sidebarOpen && <span>Déconnexion</span>}
          </button>
        </div>
      </aside>

      {/* CONTENU PRINCIPAL À DROITE */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header avec Search */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="relative flex-1 max-w-lg">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={20} />
              <input
                type="text"
                placeholder="Rechercher un lead, contact, email..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={() => setRefreshing(!refreshing)}
              disabled={refreshing}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
              title="Actualiser"
            >
              <RefreshCw size={20} className={`text-gray-600 dark:text-gray-300 ${refreshing ? 'animate-spin' : ''}`} />
            </button>

            <ThemeToggle />

            <RealtimeNotifications />
          </div>
        </header>

        {/* Notifications push qui glissent de droite à gauche */}
        <CRMPushNotifications />

        {/* Contenu - ICI ON AFFICHE LES PAGES ENFANTS */}
        <div className="flex-1 overflow-auto min-h-0">
          <Outlet />
        </div>
      </main>

      {/* Maintien de la session active */}
      <AdminSessionKeepAlive />
    </div>
  );
};

export default CRMLayout;
