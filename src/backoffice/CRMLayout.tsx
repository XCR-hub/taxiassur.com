import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Settings,
  Home,
  LogOut,
  RefreshCw,
  Sparkles,
  X,
  Target,
  Inbox,
  Users,
  Building2,
  FileCheck,
  Mail,
  BarChart3,
  Brain,
  Search,
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

  useEffect(() => {
    console.log('CRM Layout v2026.03');
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f1117' }}>
        <div className="text-center">
          <RefreshCw className="animate-spin mx-auto mb-4" size={40} style={{ color: '#f59e0b' }} />
          <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>Vérification de la session...</p>
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

  /* icons shown in collapsed rail mode */
  const railIcons = [
    { path: '/backoffice/crm',                   icon: <LayoutDashboard size={16} />, label: 'Dashboard',      color: '#f59e0b' },
    { path: '/backoffice/crm-killer/pipeline',   icon: <Target size={16} />,          label: 'Pipeline',       color: '#3b82f6' },
    { path: '/backoffice/crm-killer/inbox',      icon: <Inbox size={16} />,           label: 'Inbox',          color: '#10b981' },
    { path: '/backoffice/clients',               icon: <Users size={16} />,           label: 'Clients',        color: '#14b8a6' },
    { path: '/backoffice/pending-documents',     icon: <FileCheck size={16} />,       label: 'Documents',      color: '#f59e0b', badge: pendingDocsCount },
    { path: '/backoffice/insurance-companies',   icon: <Building2 size={16} />,       label: 'Compagnies',     color: '#0ea5e9' },
    { path: '/backoffice/email-marketing',       icon: <Mail size={16} />,            label: 'Email',          color: '#22c55e' },
    { path: '/backoffice/analytics',             icon: <BarChart3 size={16} />,       label: 'Analytics',      color: '#ec4899' },
    { path: '/backoffice/ultron',                icon: <Brain size={16} />,           label: 'IA',             color: '#06b6d4' },
    { path: '/backoffice/seo',                   icon: <Search size={16} />,          label: 'SEO',            color: '#34d399' },
  ];

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#0f1117' }}>

      {/* ── SIDEBAR ── */}
      <aside
        className="flex flex-col flex-shrink-0 transition-all duration-300"
        style={{
          width: sidebarOpen ? 256 : 64,
          background: '#0a0d14',
          borderRight: '1px solid rgba(255,255,255,0.055)',
          position: 'relative',
        }}
      >
        {/* ── Logo / Header ── */}
        <div
          className="flex items-center flex-shrink-0"
          style={{
            height: 60,
            padding: sidebarOpen ? '0 14px' : '0 14px',
            borderBottom: '1px solid rgba(255,255,255,0.055)',
            justifyContent: sidebarOpen ? 'space-between' : 'center',
          }}
        >
          {sidebarOpen ? (
            <>
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="flex items-center justify-center flex-shrink-0"
                  style={{
                    width: 32,
                    height: 32,
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    borderRadius: 9,
                    boxShadow: '0 0 16px rgba(245,158,11,0.3)',
                  }}
                >
                  <Sparkles size={16} style={{ color: '#000' }} />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-sm leading-tight" style={{ color: '#fff' }}>TaxiAssur</div>
                  <div className="text-xs" style={{ color: 'rgba(245,158,11,0.7)', letterSpacing: '0.04em' }}>CRM Admin</div>
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="flex items-center justify-center flex-shrink-0 transition-all"
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 6,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  color: 'rgba(255,255,255,0.3)',
                  cursor: 'pointer',
                }}
              >
                <X size={13} />
              </button>
            </>
          ) : (
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex items-center justify-center transition-all"
              style={{
                width: 34,
                height: 34,
                borderRadius: 9,
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                boxShadow: '0 0 16px rgba(245,158,11,0.3)',
                color: '#000',
                cursor: 'pointer',
                border: 'none',
              }}
            >
              <Sparkles size={16} />
            </button>
          )}
        </div>

        {/* ── Navigation area ── */}
        <div className="flex-1 overflow-y-auto" style={{ padding: sidebarOpen ? '8px 8px' : '8px 6px' }}>

          {/* EXPANDED: unified NavigationMenu */}
          {sidebarOpen && (
            <>
              {/* Dashboard — standalone top link */}
              {(() => {
                const a = currentPath === '/backoffice/crm' || currentPath === '/backoffice';
                return (
                  <Link
                    to="/backoffice/crm"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 9,
                      padding: '7px 10px',
                      borderRadius: 8,
                      background: a ? 'rgba(245,158,11,0.12)' : 'transparent',
                      boxShadow: a ? 'inset 3px 0 0 #f59e0b' : 'none',
                      textDecoration: 'none',
                      marginBottom: 6,
                      transition: 'all 0.15s',
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 7,
                        background: a ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.04)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        color: a ? '#f59e0b' : 'rgba(255,255,255,0.3)',
                      }}
                    >
                      <LayoutDashboard size={14} />
                    </div>
                    <span style={{ fontSize: 12.5, fontWeight: a ? 600 : 500, color: a ? '#fff' : 'rgba(255,255,255,0.55)' }}>
                      Vue d'ensemble
                    </span>
                  </Link>
                );
              })()}

              {/* All grouped sections */}
              <NavigationMenu />
            </>
          )}

          {/* COLLAPSED: icon rail */}
          {!sidebarOpen && (
            <div className="flex flex-col items-center gap-1">
              {railIcons.map((item, i) => {
                const active = currentPath === item.path || currentPath.startsWith(item.path + '/');
                return (
                  <button
                    key={i}
                    onClick={() => navigate(item.path)}
                    title={item.label}
                    className="relative flex items-center justify-center transition-all"
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: active ? `${item.color}20` : 'transparent',
                      color: active ? item.color : 'rgba(255,255,255,0.28)',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {item.icon}
                    {item.badge && Number(item.badge) > 0 && (
                      <span
                        className="absolute"
                        style={{
                          top: 4,
                          right: 4,
                          width: 14,
                          height: 14,
                          borderRadius: 7,
                          background: '#ef4444',
                          color: '#fff',
                          fontSize: 8,
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {Number(item.badge) > 9 ? '9+' : item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── User / Bottom ── */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.055)', padding: sidebarOpen ? '10px 8px' : '10px 6px' }}>

          {/* User card */}
          {sidebarOpen && (
            <div
              className="flex items-center gap-2.5 mb-2"
              style={{
                padding: '8px 10px',
                borderRadius: 9,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.055)',
              }}
            >
              <div
                className="flex items-center justify-center flex-shrink-0 font-bold text-sm"
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 7,
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: '#000',
                  boxShadow: '0 0 8px rgba(245,158,11,0.25)',
                }}
              >
                {userInitial}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold truncate" style={{ color: '#fff' }}>
                  {user?.full_name || 'Admin'}
                </div>
                <div className="truncate" style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>
                  {user?.email}
                </div>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {[
              { label: 'Paramètres',          icon: <Settings size={14} />,  onClick: () => navigate('/backoffice/crm-killer/settings'), color: 'rgba(255,255,255,0.35)' },
              { label: 'Dashboard Principal', icon: <Home size={14} />,      onClick: () => navigate('/backoffice'),                     color: 'rgba(255,255,255,0.35)' },
              { label: 'Déconnexion',         icon: <LogOut size={14} />,    onClick: handleLogout,                                      color: 'rgba(239,68,68,0.55)'   },
            ].map(btn => (
              <button
                key={btn.label}
                onClick={btn.onClick}
                title={!sidebarOpen ? btn.label : undefined}
                className="flex items-center transition-all"
                style={{
                  gap: sidebarOpen ? 9 : 0,
                  padding: sidebarOpen ? '6px 10px' : '9px 0',
                  borderRadius: 7,
                  justifyContent: sidebarOpen ? 'flex-start' : 'center',
                  color: btn.color,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  width: '100%',
                }}
              >
                {btn.icon}
                {sidebarOpen && <span style={{ fontSize: 11.5 }}>{btn.label}</span>}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0" style={{ background: '#0f1117' }}>
        <CRMPushNotifications />
        <div className="flex-1 overflow-auto min-h-0">
          <Outlet />
        </div>
      </main>

      <AdminSessionKeepAlive />
    </div>
  );
};

export default CRMLayout;
