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
  const [stats] = useState<CRMStats>({
    unread_messages: 0,
    pending_items: 0,
    at_risk_clients: 0,
    ai_decisions_pending: 0
  });

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
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* SIDEBAR À GAUCHE - FIXE */}
      <aside className={`bg-black text-white transition-all duration-300 flex flex-col flex-shrink-0 ${sidebarOpen ? 'w-64' : 'w-20'}`}>
        {/* Logo & Toggle */}
        <div className="p-4 flex items-center justify-between border-b border-gray-800">
          {sidebarOpen ? (
            <>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Zap size={20} className="text-black" />
                </div>
                <div>
                  <div className="font-bold text-base leading-tight">CRM Admin</div>
                  <div className="text-xs text-gray-400">TaxiAssur</div>
                </div>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="hover:bg-gray-800 p-1.5 rounded-lg transition-colors text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </>
          ) : (
            <button onClick={() => setSidebarOpen(true)} className="hover:bg-gray-800 p-2 rounded-lg transition-colors mx-auto text-gray-400 hover:text-white">
              <Menu size={22} />
            </button>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.path || currentPath.startsWith(item.path + '/');

            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                title={!sidebarOpen ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all relative group mb-0.5 ${
                  isActive
                    ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-semibold shadow-md'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <Icon size={20} className="flex-shrink-0" />
                {sidebarOpen && (
                  <>
                    <span className="text-sm flex-1 text-left">{item.label}</span>
                    {item.badge && item.badge > 0 && (
                      <span className={`text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center ${isActive ? 'bg-black/20 text-black' : 'bg-red-500 text-white'}`}>
                        {item.badge > 9 ? '9+' : item.badge}
                      </span>
                    )}
                  </>
                )}
                {!sidebarOpen && item.badge && item.badge > 0 && (
                  <span className="absolute top-1.5 right-1.5 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Section en bas */}
        <div className="border-t border-gray-800 p-3 space-y-1">
          {sidebarOpen && (
            <div className="bg-gray-900 rounded-xl p-3 mb-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-full flex items-center justify-center text-black font-bold text-sm flex-shrink-0">
                  {user?.full_name?.[0]?.toUpperCase() || 'A'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">{user?.full_name || 'Admin'}</div>
                  <div className="text-xs text-gray-500 truncate">{user?.email}</div>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={() => navigate('/backoffice/crm-killer/settings')}
            title={!sidebarOpen ? 'Paramètres' : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2 text-gray-400 hover:bg-gray-800 hover:text-white rounded-xl transition-colors ${!sidebarOpen && 'justify-center'}`}
          >
            <Settings size={18} />
            {sidebarOpen && <span className="text-sm">Paramètres</span>}
          </button>

          <button
            onClick={() => navigate('/backoffice')}
            title={!sidebarOpen ? 'Dashboard Principal' : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2 text-gray-400 hover:bg-gray-800 hover:text-white rounded-xl transition-colors ${!sidebarOpen && 'justify-center'}`}
          >
            <Home size={18} />
            {sidebarOpen && <span className="text-sm">Dashboard Principal</span>}
          </button>

          <button
            onClick={handleLogout}
            title={!sidebarOpen ? 'Déconnexion' : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2 text-red-400 hover:bg-red-950 hover:text-red-300 rounded-xl transition-colors ${!sidebarOpen && 'justify-center'}`}
          >
            <LogOut size={18} />
            {sidebarOpen && <span className="text-sm">Déconnexion</span>}
          </button>
        </div>
      </aside>

      {/* CONTENU PRINCIPAL À DROITE */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-3.5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="relative flex-1 max-w-lg">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Rechercher un lead, contact, email..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-yellow-400 focus:border-transparent bg-gray-50 placeholder-gray-400"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setRefreshing(!refreshing)}
              disabled={refreshing}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
              title="Actualiser"
            >
              <RefreshCw size={18} className={`text-gray-500 ${refreshing ? 'animate-spin' : ''}`} />
            </button>

            <RealtimeNotifications />
          </div>
        </header>

        {/* Notifications push */}
        <CRMPushNotifications />

        {/* Contenu - pages enfants */}
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
