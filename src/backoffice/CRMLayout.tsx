import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Home,
  LogOut,
  RefreshCw,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
  Target,
  Inbox,
  Users,
  Building2,
  FileCheck,
  Mail,
  BarChart3,
  Brain,
  Search,
  Settings,
  ChevronRight,
  Terminal,
} from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { usePendingDocumentsCount } from '@/hooks/usePendingDocumentsCount';
import { AdminSessionKeepAlive } from '@/components/AdminSessionKeepAlive';
import { CRMPushNotifications } from '@/components/CRMPushNotifications';
import AdminLogin from '@/components/AdminLogin';
import NavigationMenu from './NavigationMenu';

const CRMLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut, isAuthenticated, loading } = useAdminAuth();
  const { count: pendingDocsCount } = usePendingDocumentsCount();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [hackerMode, setHackerMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('crm-hacker-mode') === '1';
  });

  useEffect(() => {
    console.log('CRM Layout v2026.03');
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (hackerMode) {
      root.classList.add('crm-hacker');
      localStorage.setItem('crm-hacker-mode', '1');
    } else {
      root.classList.remove('crm-hacker');
      localStorage.setItem('crm-hacker-mode', '0');
    }
    return () => { root.classList.remove('crm-hacker'); };
  }, [hackerMode]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0b0e14' }}>
        <div className="text-center">
          <RefreshCw className="animate-spin mx-auto mb-4" size={40} style={{ color: '#f59e0b' }} />
          <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>Chargement...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AdminLogin onSuccess={() => window.location.reload()} />;
  }

  const handleLogout = async () => {
    await signOut();
    navigate('/backoffice');
  };

  const currentPath = location.pathname;
  const userInitial = user?.full_name?.[0]?.toUpperCase() || 'A';
  const userName = user?.full_name || 'Admin';

  const railIcons = [
    { path: '/backoffice/crm',                 icon: LayoutDashboard, label: 'Dashboard',  color: '#f59e0b' },
    { path: '/backoffice/crm-killer/pipeline', icon: Target,          label: 'Pipeline',   color: '#3b82f6' },
    { path: '/backoffice/crm-killer/inbox',    icon: Inbox,           label: 'Inbox',      color: '#10b981' },
    { path: '/backoffice/clients',             icon: Users,           label: 'Clients',    color: '#14b8a6' },
    { path: '/backoffice/pending-documents',   icon: FileCheck,       label: 'Documents',  color: '#f59e0b', badge: pendingDocsCount },
    { path: '/backoffice/insurance-companies', icon: Building2,       label: 'Compagnies', color: '#0ea5e9' },
    { path: '/backoffice/email-marketing',     icon: Mail,            label: 'Email',      color: '#22c55e' },
    { path: '/backoffice/analytics',           icon: BarChart3,       label: 'Analytics',  color: '#ec4899' },
    { path: '/backoffice/ultron',              icon: Brain,           label: 'IA',         color: '#06b6d4' },
    { path: '/backoffice/seo',                 icon: Search,          label: 'SEO',        color: '#34d399' },
  ];

  const isDashboard = currentPath === '/backoffice/crm' || currentPath === '/backoffice' || currentPath === '/backoffice/dashboard';
  const isClientsSection = currentPath === '/backoffice/clients' || currentPath.startsWith('/backoffice/clients/');

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#0b0e14' }}>
      {!isClientsSection && (
      <aside
        className="crm-sidebar flex flex-col flex-shrink-0"
        style={{
          width: sidebarOpen ? 260 : 68,
          background: 'linear-gradient(180deg, #0d1018 0%, #080b12 100%)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'relative',
          zIndex: 20,
        }}
      >
        <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 1, background: 'linear-gradient(180deg, rgba(245,158,11,0.15) 0%, transparent 40%, transparent 60%, rgba(245,158,11,0.08) 100%)' }} />

        <div
          className="flex items-center flex-shrink-0"
          style={{
            height: 64,
            padding: sidebarOpen ? '0 16px' : '0 10px',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            justifyContent: sidebarOpen ? 'space-between' : 'center',
          }}
        >
          {sidebarOpen ? (
            <>
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="flex items-center justify-center flex-shrink-0"
                  style={{
                    width: 36,
                    height: 36,
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    borderRadius: 10,
                    boxShadow: '0 4px 16px rgba(245,158,11,0.25), inset 0 1px 0 rgba(255,255,255,0.2)',
                  }}
                >
                  <Sparkles size={17} style={{ color: '#000' }} />
                </div>
                <div className="min-w-0">
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#fff', lineHeight: 1.2, letterSpacing: '-0.01em' }}>TaxiAssur</div>
                  <div style={{ fontSize: 10, color: '#f59e0b', letterSpacing: '0.08em', fontWeight: 500, opacity: 0.8 }}>CRM ADMIN</div>
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="crm-sidebar-toggle"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 7,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.3)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                }}
              >
                <PanelLeftClose size={14} />
              </button>
            </>
          ) : (
            <button
              onClick={() => setSidebarOpen(true)}
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                boxShadow: '0 4px 16px rgba(245,158,11,0.25), inset 0 1px 0 rgba(255,255,255,0.2)',
                color: '#000',
                cursor: 'pointer',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
              }}
            >
              <PanelLeftOpen size={17} />
            </button>
          )}
        </div>

        <div
          className="flex-1 overflow-y-auto crm-sidebar-scroll"
          style={{ padding: sidebarOpen ? '10px 10px' : '10px 8px' }}
        >
          {sidebarOpen && (
            <>
              <Link
                to="/backoffice/crm"
                className="crm-nav-link"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 12px',
                  borderRadius: 10,
                  background: isDashboard ? 'rgba(245,158,11,0.1)' : 'transparent',
                  textDecoration: 'none',
                  marginBottom: 8,
                  transition: 'all 0.2s',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {isDashboard && (
                  <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: 3, borderRadius: '0 3px 3px 0', background: '#f59e0b', boxShadow: '0 0 8px rgba(245,158,11,0.5)' }} />
                )}
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: isDashboard ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.04)',
                    border: isDashboard ? '1px solid rgba(245,158,11,0.2)' : '1px solid rgba(255,255,255,0.04)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 0.2s',
                  }}
                >
                  <LayoutDashboard size={15} style={{ color: isDashboard ? '#f59e0b' : 'rgba(255,255,255,0.35)' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: isDashboard ? 600 : 500, color: isDashboard ? '#fff' : 'rgba(255,255,255,0.6)', lineHeight: 1.2 }}>
                    Vue d'ensemble
                  </div>
                  <div style={{ fontSize: 10, color: isDashboard ? 'rgba(245,158,11,0.7)' : 'rgba(255,255,255,0.2)', marginTop: 1 }}>
                    Tableau de bord
                  </div>
                </div>
                {isDashboard && (
                  <ChevronRight size={13} style={{ color: 'rgba(245,158,11,0.5)', flexShrink: 0 }} />
                )}
              </Link>

              <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)', margin: '0 8px 8px' }} />

              <NavigationMenu />
            </>
          )}

          {!sidebarOpen && (
            <div className="flex flex-col items-center gap-1.5">
              {railIcons.map((item, i) => {
                const active = currentPath === item.path || currentPath.startsWith(item.path + '/');
                const Icon = item.icon;
                return (
                  <button
                    key={i}
                    onClick={() => navigate(item.path)}
                    title={item.label}
                    className="crm-rail-icon"
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 10,
                      background: active ? `${item.color}15` : 'transparent',
                      border: active ? `1px solid ${item.color}25` : '1px solid transparent',
                      color: active ? item.color : 'rgba(255,255,255,0.28)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      transition: 'all 0.2s',
                    }}
                  >
                    <Icon size={17} />
                    {item.badge && Number(item.badge) > 0 && (
                      <span
                        style={{
                          position: 'absolute',
                          top: 3,
                          right: 3,
                          width: 16,
                          height: 16,
                          borderRadius: 8,
                          background: '#ef4444',
                          color: '#fff',
                          fontSize: 8,
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 2px 6px rgba(239,68,68,0.4)',
                        }}
                      >
                        {Number(item.badge) > 9 ? '9+' : item.badge}
                      </span>
                    )}
                    {active && (
                      <div style={{ position: 'absolute', left: -8, top: '25%', bottom: '25%', width: 3, borderRadius: '0 3px 3px 0', background: item.color, boxShadow: `0 0 8px ${item.color}80` }} />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: sidebarOpen ? '8px 10px' : '8px 8px', flexShrink: 0 }}>
          {sidebarOpen ? (
            <>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  marginBottom: 6,
                }}
              >
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    color: '#000',
                    fontWeight: 700,
                    fontSize: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 2px 8px rgba(245,158,11,0.2)',
                  }}
                >
                  {userInitial}
                </div>
                <div className="flex-1 min-w-0">
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#fff', lineHeight: 1.2 }} className="truncate">
                    {userName}
                  </div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', lineHeight: 1.2 }} className="truncate">
                    {user?.email}
                  </div>
                </div>
                <div style={{ padding: '2px 6px', borderRadius: 4, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.15)', fontSize: 8, fontWeight: 600, color: '#f59e0b', letterSpacing: '0.04em', flexShrink: 0 }}>
                  {user?.role === 'master' ? 'ADMIN' : 'USER'}
                </div>
              </div>

              <button
                onClick={() => setHackerMode(v => !v)}
                className="crm-nav-link"
                title={hackerMode ? 'Désactiver le mode Terminal' : 'Activer le mode Terminal'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '7px 12px',
                  borderRadius: 8,
                  color: hackerMode ? '#00ff9c' : 'rgba(255,255,255,0.55)',
                  background: hackerMode ? 'rgba(0,255,156,0.08)' : 'none',
                  border: hackerMode ? '1px solid rgba(0,255,156,0.25)' : '1px solid transparent',
                  cursor: 'pointer',
                  width: '100%',
                  transition: 'all 0.15s',
                  fontSize: 12,
                  marginBottom: 4,
                }}
              >
                <Terminal size={14} />
                <span>Mode Terminal</span>
                <span
                  style={{
                    marginLeft: 'auto',
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: hackerMode ? 'rgba(0,255,156,0.15)' : 'rgba(255,255,255,0.06)',
                    color: hackerMode ? '#00ff9c' : 'rgba(255,255,255,0.4)',
                  }}
                >
                  {hackerMode ? 'ON' : 'OFF'}
                </span>
              </button>

              <button
                onClick={handleLogout}
                className="crm-nav-link"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '7px 12px',
                  borderRadius: 8,
                  color: '#ef4444',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  width: '100%',
                  transition: 'all 0.15s',
                  fontSize: 12,
                }}
              >
                <LogOut size={14} />
                <span>Deconnexion</span>
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 9,
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: '#000',
                  fontWeight: 700,
                  fontSize: 13,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 6,
                  boxShadow: '0 2px 10px rgba(245,158,11,0.25)',
                }}
              >
                {userInitial}
              </div>
              {[
                { icon: Terminal, onClick: () => setHackerMode(v => !v), color: hackerMode ? '#00ff9c' : 'rgba(255,255,255,0.3)', label: hackerMode ? 'Terminal ON' : 'Terminal OFF' },
                { icon: Settings, onClick: () => navigate('/backoffice/crm-killer/settings'), color: 'rgba(255,255,255,0.3)', label: 'Parametres' },
                { icon: LogOut, onClick: handleLogout, color: 'rgba(239,68,68,0.5)', label: 'Deconnexion' },
              ].map(btn => (
                <button
                  key={btn.label}
                  onClick={btn.onClick}
                  title={btn.label}
                  className="crm-rail-icon"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    color: btn.color,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s',
                  }}
                >
                  <btn.icon size={15} />
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>
      )}

      <main className="flex-1 flex flex-col overflow-hidden min-w-0" style={{ background: '#0b0e14' }}>
        <CRMPushNotifications />
        <div className="flex-1 overflow-auto min-h-0">
          <Outlet />
        </div>
      </main>

      <AdminSessionKeepAlive />

      <style>{`
        .crm-sidebar-scroll::-webkit-scrollbar { width: 4px; }
        .crm-sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
        .crm-sidebar-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.06); border-radius: 4px; }
        .crm-sidebar-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.12); }
        .crm-sidebar-toggle:hover { background: rgba(255,255,255,0.08) !important; color: rgba(255,255,255,0.6) !important; }
        .crm-nav-link:hover { background: rgba(255,255,255,0.04) !important; }
        .crm-rail-icon:hover { background: rgba(255,255,255,0.06) !important; color: rgba(255,255,255,0.6) !important; }
        .crm-section-header:hover { background: rgba(255,255,255,0.03) !important; }
        .crm-menu-link:hover { background: rgba(255,255,255,0.04) !important; }
      `}</style>
    </div>
  );
};

export default CRMLayout;
