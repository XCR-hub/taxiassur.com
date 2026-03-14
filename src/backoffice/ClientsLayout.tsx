import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Users,
  Shield,
  FileText,
  BarChart3,
  Bell,
  RefreshCw,
  Settings,
  ChevronLeft,
  Menu,
  X,
  Home,
  LogOut,
  TrendingUp,
  Clock,
  AlertTriangle,
  Building2,
  CreditCard,
  Activity
} from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import AdminLogin from '@/components/AdminLogin';

const ClientsLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut, isAuthenticated, loading } = useAdminAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <RefreshCw className="animate-spin mx-auto mb-4 text-blue-600" size={48} />
          <p className="text-gray-700 font-medium">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AdminLogin onSuccess={() => window.location.reload()} />;
  }

  const menuGroups = [
    {
      label: 'Portefeuille',
      items: [
        {
          id: 'clients-list',
          label: 'Tous les Clients',
          icon: Users,
          path: '/backoffice/clients',
          exact: true,
          description: 'Vue d\'ensemble'
        },
        {
          id: 'renewals',
          label: 'Renouvellements',
          icon: Clock,
          path: '/backoffice/clients?tab=renewals',
          description: 'Prochains 30 jours'
        },
        {
          id: 'at-risk',
          label: 'Clients à Risque',
          icon: AlertTriangle,
          path: '/backoffice/clients?tab=at_risk',
          description: 'Attention requise'
        },
        {
          id: 'activity',
          label: 'Activité Récente',
          icon: Activity,
          path: '/backoffice/clients?tab=activity',
          description: 'Dernières interactions'
        }
      ]
    },
    {
      label: 'Contrats & Finances',
      items: [
        {
          id: 'contracts',
          label: 'Contrats',
          icon: FileText,
          path: '/backoffice/clients?tab=contracts',
          description: 'Gestion contrats'
        },
        {
          id: 'premiums',
          label: 'Primes & Paiements',
          icon: CreditCard,
          path: '/backoffice/clients?tab=premiums',
          description: 'Suivi financier'
        },
        {
          id: 'companies',
          label: 'Compagnies',
          icon: Building2,
          path: '/backoffice/production',
          description: 'Assureurs partenaires'
        }
      ]
    },
    {
      label: 'Suivi & Reporting',
      items: [
        {
          id: 'analytics',
          label: 'Statistiques',
          icon: BarChart3,
          path: '/backoffice/clients?tab=stats',
          description: 'KPIs portefeuille'
        },
        {
          id: 'trends',
          label: 'Tendances',
          icon: TrendingUp,
          path: '/backoffice/clients?tab=trends',
          description: 'Évolution'
        },
        {
          id: 'notifications',
          label: 'Alertes Clients',
          icon: Bell,
          path: '/backoffice/clients?tab=alerts',
          description: 'Notifications'
        }
      ]
    },
    {
      label: 'Administration',
      items: [
        {
          id: 'retention',
          label: 'Rétention',
          icon: Shield,
          path: '/backoffice/crm-killer/retention',
          description: 'Anti-churn'
        },
        {
          id: 'settings',
          label: 'Paramètres',
          icon: Settings,
          path: '/backoffice/crm-killer/settings',
          description: 'Configuration'
        }
      ]
    }
  ];

  const isActive = (path: string, exact?: boolean) => {
    const basePath = path.split('?')[0];
    if (exact) return location.pathname === basePath;
    return location.pathname.startsWith(basePath);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/backoffice');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo / Titre section */}
      <div className="px-4 py-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
            <Users size={20} className="text-white" />
          </div>
          {sidebarOpen && (
            <div className="min-w-0">
              <div className="font-bold text-gray-900 text-sm leading-tight">Gestion Clients</div>
              <div className="text-xs text-blue-600 font-medium mt-0.5">Portefeuille actif</div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {menuGroups.map((group) => (
          <div key={group.label}>
            {sidebarOpen && (
              <div className="px-3 mb-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                {group.label}
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path, item.exact);
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      navigate(item.path);
                      setMobileOpen(false);
                    }}
                    title={!sidebarOpen ? item.label : undefined}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left group relative ${
                      active
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <Icon size={18} className={`flex-shrink-0 ${active ? 'text-white' : 'text-gray-500 group-hover:text-gray-700'}`} />
                    {sidebarOpen && (
                      <div className="min-w-0 flex-1">
                        <div className={`text-sm font-medium leading-tight ${active ? 'text-white' : 'text-gray-700'}`}>
                          {item.label}
                        </div>
                        <div className={`text-[11px] mt-0.5 ${active ? 'text-blue-100' : 'text-gray-400'}`}>
                          {item.description}
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer sidebar */}
      <div className="border-t border-gray-100 p-3 space-y-1">
        {/* Retour menu principal */}
        <button
          onClick={() => navigate('/backoffice/crm')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-orange-50 hover:text-orange-700 transition-all group ${!sidebarOpen && 'justify-center'}`}
          title={!sidebarOpen ? 'Menu Principal CRM' : undefined}
        >
          <ChevronLeft size={18} className="flex-shrink-0 group-hover:text-orange-600" />
          {sidebarOpen && <span className="text-sm font-semibold">Menu Principal CRM</span>}
        </button>

        <button
          onClick={() => navigate('/')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-100 transition-all ${!sidebarOpen && 'justify-center'}`}
          title={!sidebarOpen ? 'Site public' : undefined}
        >
          <Home size={18} className="flex-shrink-0" />
          {sidebarOpen && <span className="text-sm font-medium">Site public</span>}
        </button>

        {/* Utilisateur */}
        {sidebarOpen && user && (
          <div className="mt-2 px-3 py-3 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {user.full_name?.[0]?.toUpperCase() || 'A'}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-900 truncate">{user.full_name || 'Admin'}</div>
                <div className="text-xs text-gray-500 truncate">{user.email}</div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors text-xs font-medium"
            >
              <LogOut size={14} />
              Déconnexion
            </button>
          </div>
        )}

        {!sidebarOpen && (
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center px-3 py-2.5 rounded-xl text-red-500 hover:bg-red-50 transition-colors"
            title="Déconnexion"
          >
            <LogOut size={18} />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* Sidebar desktop */}
      <aside
        className={`hidden lg:flex flex-col bg-white border-r border-gray-200 shadow-sm transition-all duration-300 flex-shrink-0 ${
          sidebarOpen ? 'w-64' : 'w-[68px]'
        }`}
      >
        {/* Toggle collapse */}
        <div className={`flex items-center border-b border-gray-100 px-3 py-3 ${sidebarOpen ? 'justify-end' : 'justify-center'}`}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-700"
            title={sidebarOpen ? 'Réduire' : 'Agrandir'}
          >
            <Menu size={18} />
          </button>
        </div>
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar mobile */}
      <aside
        className={`fixed left-0 top-0 h-full w-72 bg-white border-r border-gray-200 shadow-xl z-50 lg:hidden transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <span className="font-bold text-gray-900 text-sm">Gestion Clients</span>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <SidebarContent />
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top bar mobile */}
        <header className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 flex-shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <Users size={14} className="text-white" />
            </div>
            <span className="font-bold text-gray-900 text-sm">Gestion Clients</span>
          </div>
          <button
            onClick={() => navigate('/backoffice/crm')}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors"
          >
            <ChevronLeft size={14} />
            CRM
          </button>
        </header>

        <div className="flex-1 overflow-auto min-h-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default ClientsLayout;
