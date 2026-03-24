import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Users,
  Shield,
  FileText,
  BarChart3,
  Bell,
  Settings,
  ChevronLeft,
  TrendingUp,
  Clock,
  AlertTriangle,
  Building2,
  CreditCard,
  Activity,
  Menu,
  X,
} from 'lucide-react';

const ClientsLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(true);

  const menuGroups = [
    {
      label: 'Portefeuille',
      items: [
        { id: 'clients-list', label: 'Tous les Clients',   icon: Users,         path: '/backoffice/clients',             exact: true,  description: "Vue d'ensemble" },
        { id: 'renewals',     label: 'Renouvellements',    icon: Clock,         path: '/backoffice/clients?tab=renewals',              description: 'Prochains 30 jours' },
        { id: 'at-risk',      label: 'Clients à Risque',   icon: AlertTriangle, path: '/backoffice/clients?tab=at_risk',               description: 'Attention requise' },
        { id: 'activity',     label: 'Activité Récente',   icon: Activity,      path: '/backoffice/clients?tab=activity',              description: 'Dernières interactions' },
      ],
    },
    {
      label: 'Contrats & Finances',
      items: [
        { id: 'contracts', label: 'Contrats',          icon: FileText,  path: '/backoffice/clients?tab=contracts', description: 'Gestion contrats' },
        { id: 'premiums',  label: 'Primes & Paiements', icon: CreditCard, path: '/backoffice/clients?tab=premiums', description: 'Suivi financier' },
        { id: 'companies', label: 'Compagnies',         icon: Building2, path: '/backoffice/production',           description: 'Assureurs partenaires' },
      ],
    },
    {
      label: 'Suivi & Reporting',
      items: [
        { id: 'analytics',     label: 'Statistiques',   icon: BarChart3,  path: '/backoffice/clients?tab=stats',  description: 'KPIs portefeuille' },
        { id: 'trends',        label: 'Tendances',       icon: TrendingUp, path: '/backoffice/clients?tab=trends', description: 'Évolution' },
        { id: 'notifications', label: 'Alertes Clients', icon: Bell,       path: '/backoffice/clients?tab=alerts', description: 'Notifications' },
      ],
    },
    {
      label: 'Administration',
      items: [
        { id: 'retention', label: 'Rétention',   icon: Shield,   path: '/backoffice/crm-killer/retention', description: 'Anti-churn' },
        { id: 'settings',  label: 'Paramètres',  icon: Settings, path: '/backoffice/crm-killer/settings',  description: 'Configuration' },
      ],
    },
  ];

  const isActive = (path: string, exact?: boolean) => {
    const basePath = path.split('?')[0];
    if (exact) return location.pathname === basePath;
    return location.pathname.startsWith(basePath);
  };

  return (
    <div className="flex h-full overflow-hidden" style={{ background: '#0f1117' }}>

      {/* Secondary sidebar */}
      <aside
        className="flex flex-col flex-shrink-0 transition-all duration-300"
        style={{
          width: open ? 220 : 52,
          background: '#0a0d14',
          borderRight: '1px solid rgba(255,255,255,0.055)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center flex-shrink-0"
          style={{
            height: 52,
            padding: '0 10px',
            borderBottom: '1px solid rgba(255,255,255,0.055)',
            justifyContent: open ? 'space-between' : 'center',
          }}
        >
          {open ? (
            <>
              <div className="flex items-center gap-2">
                <div
                  className="flex items-center justify-center flex-shrink-0"
                  style={{
                    width: 26, height: 26, borderRadius: 7,
                    background: 'rgba(245,158,11,0.15)',
                    color: '#f59e0b',
                  }}
                >
                  <Users size={13} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>Clients</span>
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{ color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
              >
                <X size={13} />
              </button>
            </>
          ) : (
            <button
              onClick={() => setOpen(true)}
              style={{ color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer' }}
              title="Ouvrir"
            >
              <Menu size={14} />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto" style={{ padding: '8px 6px' }}>
          {menuGroups.map((group) => (
            <div key={group.label} style={{ marginBottom: 12 }}>
              {open && (
                <div style={{ padding: '0 6px 4px', fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {group.label}
                </div>
              )}
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path, item.exact);
                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.path)}
                    title={!open ? item.label : undefined}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: open ? 8 : 0,
                      width: '100%',
                      padding: open ? '6px 8px' : '9px 0',
                      justifyContent: open ? 'flex-start' : 'center',
                      borderRadius: 7,
                      background: active ? 'rgba(245,158,11,0.12)' : 'transparent',
                      boxShadow: active ? 'inset 2px 0 0 #f59e0b' : 'none',
                      border: 'none',
                      cursor: 'pointer',
                      marginBottom: 1,
                      transition: 'all 0.12s',
                    }}
                  >
                    <div
                      style={{
                        width: 22, height: 22, borderRadius: 5, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: active ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.04)',
                        color: active ? '#f59e0b' : 'rgba(255,255,255,0.28)',
                      }}
                    >
                      <Icon size={12} />
                    </div>
                    {open && (
                      <div style={{ minWidth: 0, textAlign: 'left' }}>
                        <div style={{ fontSize: 11.5, fontWeight: active ? 600 : 500, color: active ? '#fff' : 'rgba(255,255,255,0.55)', lineHeight: 1.2 }}>
                          {item.label}
                        </div>
                        <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.22)', marginTop: 1 }}>
                          {item.description}
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Back to CRM */}
        <div style={{ padding: '8px 6px', borderTop: '1px solid rgba(255,255,255,0.055)' }}>
          <button
            onClick={() => navigate('/backoffice/crm')}
            title={!open ? 'Retour CRM' : undefined}
            style={{
              display: 'flex', alignItems: 'center', gap: open ? 8 : 0,
              justifyContent: open ? 'flex-start' : 'center',
              width: '100%', padding: open ? '6px 8px' : '9px 0',
              borderRadius: 7, background: 'none', border: 'none',
              cursor: 'pointer', color: 'rgba(255,255,255,0.3)',
              transition: 'all 0.12s',
            }}
          >
            <ChevronLeft size={13} />
            {open && <span style={{ fontSize: 11 }}>Menu Principal</span>}
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-auto min-h-0 min-w-0">
        <Outlet />
      </main>
    </div>
  );
};

export default ClientsLayout;
