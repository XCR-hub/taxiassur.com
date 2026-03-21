// CRM Moderne avec Auth Supabase - v2026.03.21
import React, { useState, useEffect } from 'react';
import { useNavigate, Outlet, Link } from 'react-router-dom';
import {
  Settings,
  Home,
  LogOut,
  Menu,
  X,
  RefreshCw,
  Zap,
  ChevronRight,
} from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { AdminSessionKeepAlive } from '@/components/AdminSessionKeepAlive';
import { CRMPushNotifications } from '@/components/CRMPushNotifications';
import AdminLogin from '@/components/AdminLogin';
import NavigationMenu from './NavigationMenu';


const CRMLayout: React.FC = () => {
  const navigate = useNavigate();
  const { user, signOut, isAuthenticated, loading } = useAdminAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    console.log('CRM Layout v2026.03.21 - NavigationMenu Unifiée');
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

  const handleLogout = async () => {
    await signOut();
    navigate('/backoffice');
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* SIDEBAR PRINCIPALE */}
      <aside className={`bg-slate-900 border-r border-slate-700/60 text-white transition-all duration-300 flex flex-col flex-shrink-0 ${sidebarOpen ? 'w-60' : 'w-14'}`}>

        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-3 py-3.5 border-b border-slate-700/50">
          {sidebarOpen ? (
            <>
              <Link to="/backoffice/crm" className="flex items-center gap-2.5 group min-w-0">
                <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/30">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="text-white font-bold text-sm leading-tight truncate">TaxiAssur</div>
                  <div className="text-slate-500 text-xs truncate">CRM Admin</div>
                </div>
              </Link>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0 ml-1"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              onClick={() => setSidebarOpen(true)}
              className="w-full flex items-center justify-center p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* NavigationMenu ou icones collapsed */}
        {sidebarOpen ? (
          <div className="flex-1 overflow-y-auto py-3 px-2">
            <NavigationMenu />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center py-3 gap-1">
            <Link to="/backoffice/crm" title="Vue d'ensemble" className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
              <Home className="w-5 h-5" />
            </Link>
            <button
              onClick={() => setSidebarOpen(true)}
              title="Afficher la navigation"
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Footer: user + actions */}
        <div className="flex-shrink-0 border-t border-slate-700/50 p-2 space-y-0.5">
          {sidebarOpen && (
            <div className="bg-slate-800/60 rounded-lg px-3 py-2 mb-1.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-amber-500 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                  {user?.full_name?.[0]?.toUpperCase() || 'A'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-white truncate">{user?.full_name || 'Admin'}</div>
                  <div className="text-xs text-slate-500 truncate">{user?.email}</div>
                </div>
              </div>
            </div>
          )}

          <Link
            to="/backoffice/crm-killer/settings"
            title={!sidebarOpen ? 'Paramètres' : undefined}
            className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors text-xs ${!sidebarOpen ? 'justify-center' : ''}`}
          >
            <Settings className="w-4 h-4 flex-shrink-0" />
            {sidebarOpen && <span>Paramètres</span>}
          </Link>

          <Link
            to="/backoffice"
            title={!sidebarOpen ? 'Dashboard Principal' : undefined}
            className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors text-xs ${!sidebarOpen ? 'justify-center' : ''}`}
          >
            <Home className="w-4 h-4 flex-shrink-0" />
            {sidebarOpen && <span>Dashboard Principal</span>}
          </Link>

          <button
            onClick={handleLogout}
            title={!sidebarOpen ? 'Déconnexion' : undefined}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition-colors text-xs ${!sidebarOpen ? 'justify-center' : ''}`}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {sidebarOpen && <span>Déconnexion</span>}
          </button>
        </div>
      </aside>

      {/* CONTENU PRINCIPAL À DROITE */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Notifications push only — no header bar */}

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
