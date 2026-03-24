// CRM Moderne avec Auth Supabase - v2026.03.21
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Inbox,
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
  Home,
  LogOut,
  Menu,
  X,
  RefreshCw,
  Copy,
  Receipt,
  Building2,
  ClipboardList,
  ChevronDown,
  Layers,
  FileCheck,
  Sparkles,
} from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { usePendingDocumentsCount } from '@/hooks/usePendingDocumentsCount';
import { AdminSessionKeepAlive } from '@/components/AdminSessionKeepAlive';
import { CRMPushNotifications } from '@/components/CRMPushNotifications';
import AdminLogin from '@/components/AdminLogin';
import NavigationMenu from './NavigationMenu';

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
  const { count: pendingDocsCount } = usePendingDocumentsCount();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const [stats] = useState<CRMStats>({
    unread_messages: 0,
    pending_items: 0,
    at_risk_clients: 0,
    ai_decisions_pending: 0,
  });

  useEffect(() => {
    console.log('CRM Layout v2026.03.21');
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

  const menuItems = [
    { id: 'overview',            label: "Vue d'ensemble",   icon: LayoutDashboard, path: '/backoffice/crm',                     badge: null,                  color: '#f59e0b' },
    { id: 'pipeline',            label: 'Pipeline Kanban',  icon: Target,          path: '/backoffice/crm-killer/pipeline',     badge: null,                  color: '#3b82f6' },
    { id: 'inbox',               label: 'Inbox Multicanal', icon: Inbox,           path: '/backoffice/crm-killer/inbox',        badge: stats.unread_messages || null, color: '#10b981' },
    { id: 'clients',             label: 'Clients',          icon: Users,           path: '/backoffice/clients',                 badge: null,                  color: '#8b5cf6' },
    { id: 'invoicing',           label: 'Facturation Libre',icon: Receipt,         path: '/backoffice/invoicing',               badge: null,                  color: '#10b981' },
    { id: 'production',          label: 'Production',       icon: ClipboardList,   path: '/backoffice/production',              badge: null,                  color: '#06b6d4' },
    { id: 'insurance-companies', label: 'Compagnies',       icon: Building2,       path: '/backoffice/insurance-companies',     badge: null,                  color: '#f97316' },
    { id: 'retention',           label: 'Rétention',        icon: Shield,          path: '/backoffice/crm-killer/retention',    badge: stats.at_risk_clients || null, color: '#ef4444' },
    { id: 'duplicates',          label: 'Doublons',         icon: Copy,            path: '/backoffice/doublons',                badge: null,                  color: '#6b7280' },
    { id: 'pending-documents',   label: 'Docs à Valider',   icon: FileCheck,       path: '/backoffice/pending-documents',       badge: pendingDocsCount || null, color: '#f59e0b' },
    { id: 'ia',                  label: 'IA Governance',    icon: Bot,             path: '/backoffice/crm-killer/ia',           badge: stats.ai_decisions_pending || null, color: '#a78bfa' },
    { id: 'templates',           label: 'Templates',        icon: FileText,        path: '/backoffice/crm-killer/templates',    badge: null,                  color: '#64748b' },
    { id: 'email-marketing',     label: 'Email Marketing',  icon: Mail,            path: '/backoffice/email-marketing',         badge: null,                  color: '#0ea5e9' },
    { id: 'whatsapp',            label: 'WhatsApp',         icon: MessageSquare,   path: '/backoffice/whatsapp',                badge: null,                  color: '#22c55e' },
    { id: 'analytics',           label: 'Analytics',        icon: BarChart3,       path: '/backoffice/analytics',               badge: null,                  color: '#ec4899' },
    { id: 'automations',         label: 'Automations',      icon: Zap,             path: '/backoffice/automations',             badge: null,                  color: '#f59e0b' },
    { id: 'newsletter',          label: 'Newsletter',       icon: Send,            path: '/backoffice/newsletter',              badge: null,                  color: '#06b6d4' },
  ];

  const handleLogout = async () => {
    await signOut();
    navigate('/backoffice');
  };

  const currentPath = location.pathname;
  const userInitial = user?.full_name?.[0]?.toUpperCase() || 'A';

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#0f1117' }}>
      {/* SIDEBAR */}
      <aside
        className="flex flex-col flex-shrink-0 transition-all duration-300"
        style={{
          width: sidebarOpen ? 260 : 68,
          background: '#0d1017',
          borderRight: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Logo Header */}
        <div
          className="flex items-center flex-shrink-0"
          style={{
            height: 64,
            padding: sidebarOpen ? '0 16px' : '0 14px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
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
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    borderRadius: 10,
                    boxShadow: '0 0 18px rgba(245,158,11,0.35)',
                  }}
                >
                  <Sparkles size={18} style={{ color: '#000' }} />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-sm leading-tight truncate" style={{ color: '#fff' }}>TaxiAssur</div>
                  <div className="text-xs truncate" style={{ color: 'rgba(245,158,11,0.75)', letterSpacing: '0.04em' }}>CRM Admin</div>
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="flex-shrink-0 flex items-center justify-center transition-all"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 7,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.4)',
                }}
              >
                <X size={14} />
              </button>
            </>
          ) : (
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex items-center justify-center transition-all"
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                boxShadow: '0 0 18px rgba(245,158,11,0.35)',
                color: '#000',
              }}
            >
              <Sparkles size={18} />
            </button>
          )}
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto" style={{ padding: sidebarOpen ? '10px 10px' : '10px 8px' }}>

          {/* Quick Access section label */}
          {sidebarOpen && (
            <div
              className="flex items-center gap-2 mb-2"
              style={{ padding: '4px 8px' }}
            >
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.25)' }}>
                Accès Rapide
              </span>
            </div>
          )}

          {/* Flat CRM items */}
          <div className="space-y-0.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPath === item.path || currentPath.startsWith(item.path + '/');
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.path)}
                  title={!sidebarOpen ? item.label : undefined}
                  className="w-full flex items-center transition-all group"
                  style={{
                    gap: sidebarOpen ? 10 : 0,
                    padding: sidebarOpen ? '8px 10px' : '9px 0',
                    borderRadius: 9,
                    justifyContent: sidebarOpen ? 'flex-start' : 'center',
                    background: isActive
                      ? `rgba(${item.color === '#f59e0b' ? '245,158,11' : item.color === '#3b82f6' ? '59,130,246' : item.color === '#10b981' ? '16,185,129' : item.color === '#8b5cf6' ? '139,92,246' : item.color === '#06b6d4' ? '6,182,212' : item.color === '#f97316' ? '249,115,22' : item.color === '#ef4444' ? '239,68,68' : item.color === '#22c55e' ? '34,197,94' : item.color === '#ec4899' ? '236,72,153' : item.color === '#a78bfa' ? '167,139,250' : '245,158,11'},0.12)`
                      : 'transparent',
                    boxShadow: isActive ? `inset 3px 0 0 ${item.color}` : 'none',
                    position: 'relative',
                  }}
                >
                  <div
                    className="flex items-center justify-center flex-shrink-0"
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      background: isActive ? `${item.color}22` : 'transparent',
                      color: isActive ? item.color : 'rgba(255,255,255,0.35)',
                      transition: 'all 0.15s',
                    }}
                  >
                    <Icon size={15} />
                  </div>
                  {sidebarOpen && (
                    <>
                      <span
                        className="flex-1 text-left text-xs font-medium truncate"
                        style={{ color: isActive ? '#fff' : 'rgba(255,255,255,0.5)' }}
                      >
                        {item.label}
                      </span>
                      {item.badge && Number(item.badge) > 0 && (
                        <span
                          className="text-xs font-bold flex-shrink-0 flex items-center justify-center"
                          style={{
                            minWidth: 18,
                            height: 18,
                            borderRadius: 9,
                            padding: '0 5px',
                            background: isActive ? `${item.color}33` : '#ef444488',
                            color: isActive ? item.color : '#fff',
                            fontSize: 10,
                          }}
                        >
                          {Number(item.badge) > 9 ? '9+' : item.badge}
                        </span>
                      )}
                    </>
                  )}
                  {!sidebarOpen && item.badge && Number(item.badge) > 0 && (
                    <span
                      className="absolute flex items-center justify-center"
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
                      }}
                    >
                      {Number(item.badge) > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Advanced Dashboard section */}
          <div className="mt-3">
            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '0 4px 10px' }} />

            {sidebarOpen ? (
              <>
                <button
                  onClick={() => setAdvancedOpen(v => !v)}
                  className="w-full flex items-center transition-all"
                  style={{
                    gap: 10,
                    padding: '8px 10px',
                    borderRadius: 9,
                    background: advancedOpen ? 'rgba(245,158,11,0.08)' : 'transparent',
                    border: advancedOpen ? '1px solid rgba(245,158,11,0.15)' : '1px solid transparent',
                  }}
                >
                  <div
                    className="flex items-center justify-center flex-shrink-0"
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      background: advancedOpen ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.05)',
                      color: advancedOpen ? '#f59e0b' : 'rgba(255,255,255,0.35)',
                    }}
                  >
                    <Layers size={15} />
                  </div>
                  <span
                    className="flex-1 text-left text-xs font-medium"
                    style={{ color: advancedOpen ? '#f59e0b' : 'rgba(255,255,255,0.5)' }}
                  >
                    Menu Complet
                  </span>
                  <ChevronDown
                    size={13}
                    className="flex-shrink-0 transition-transform duration-200"
                    style={{
                      color: advancedOpen ? '#f59e0b' : 'rgba(255,255,255,0.25)',
                      transform: advancedOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                    }}
                  />
                </button>

                {advancedOpen && (
                  <div
                    className="mt-2"
                    style={{
                      borderRadius: 10,
                      background: 'rgba(0,0,0,0.2)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      padding: '8px 6px',
                    }}
                  >
                    <NavigationMenu />
                  </div>
                )}
              </>
            ) : (
              <button
                onClick={() => { setSidebarOpen(true); setAdvancedOpen(true); }}
                title="Menu Complet"
                className="w-full flex items-center justify-center transition-all"
                style={{
                  padding: '9px 0',
                  borderRadius: 9,
                  color: 'rgba(245,158,11,0.6)',
                }}
              >
                <Layers size={16} />
              </button>
            )}
          </div>
        </div>

        {/* User Section at bottom */}
        <div
          style={{
            borderTop: '1px solid rgba(255,255,255,0.06)',
            padding: sidebarOpen ? '12px 10px' : '12px 8px',
          }}
        >
          {sidebarOpen && (
            <div
              className="flex items-center gap-2.5 mb-3"
              style={{
                padding: '10px 12px',
                borderRadius: 10,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div
                className="flex items-center justify-center flex-shrink-0 font-bold text-sm"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: '#000',
                  boxShadow: '0 0 10px rgba(245,158,11,0.3)',
                }}
              >
                {userInitial}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold truncate" style={{ color: '#fff' }}>
                  {user?.full_name || 'Admin'}
                </div>
                <div className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>
                  {user?.email}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-0.5">
            <button
              onClick={() => navigate('/backoffice/crm-killer/settings')}
              title={!sidebarOpen ? 'Paramètres' : undefined}
              className="w-full flex items-center transition-all"
              style={{
                gap: sidebarOpen ? 10 : 0,
                padding: sidebarOpen ? '7px 10px' : '9px 0',
                borderRadius: 8,
                justifyContent: sidebarOpen ? 'flex-start' : 'center',
                color: 'rgba(255,255,255,0.35)',
              }}
            >
              <Settings size={15} />
              {sidebarOpen && <span className="text-xs">Paramètres</span>}
            </button>

            <button
              onClick={() => navigate('/backoffice')}
              title={!sidebarOpen ? 'Dashboard Principal' : undefined}
              className="w-full flex items-center transition-all"
              style={{
                gap: sidebarOpen ? 10 : 0,
                padding: sidebarOpen ? '7px 10px' : '9px 0',
                borderRadius: 8,
                justifyContent: sidebarOpen ? 'flex-start' : 'center',
                color: 'rgba(255,255,255,0.35)',
              }}
            >
              <Home size={15} />
              {sidebarOpen && <span className="text-xs">Dashboard Principal</span>}
            </button>

            <button
              onClick={handleLogout}
              title={!sidebarOpen ? 'Déconnexion' : undefined}
              className="w-full flex items-center transition-all"
              style={{
                gap: sidebarOpen ? 10 : 0,
                padding: sidebarOpen ? '7px 10px' : '9px 0',
                borderRadius: 8,
                justifyContent: sidebarOpen ? 'flex-start' : 'center',
                color: 'rgba(239,68,68,0.6)',
              }}
            >
              <LogOut size={15} />
              {sidebarOpen && <span className="text-xs">Déconnexion</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
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
