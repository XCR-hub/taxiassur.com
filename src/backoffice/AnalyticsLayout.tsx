import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  BarChart3,
  Target,
  Mail,
  Globe,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  LayoutDashboard,
  BotMessageSquare,
  Cpu,
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  path: string;
  group: string;
  external?: boolean;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Vue d\'ensemble', icon: LayoutDashboard, path: '/backoffice/analytics', group: 'Principal' },
  { id: 'conversion', label: 'Conversion', icon: Target, path: '/backoffice/conversion', group: 'Performance' },
  { id: 'email-analytics', label: 'Email', icon: Mail, path: '/backoffice/email-analytics', group: 'Performance' },
  { id: 'seo', label: 'SEO & GSC', icon: Globe, path: '/backoffice/seo-strategy', group: 'SEO' },
  { id: 'leads-trend', label: 'Tendances', icon: TrendingUp, path: '/backoffice/crm', group: 'CRM' },
  { id: 'ai-insights', label: 'Insights IA', icon: BotMessageSquare, path: '/backoffice/ai-master', group: 'Intelligence' },
  { id: 'automation', label: 'Automatisations', icon: Cpu, path: '/backoffice/automation', group: 'Intelligence' },
];

const groups = ['Principal', 'Performance', 'SEO', 'CRM', 'Intelligence'];

const AnalyticsLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (path: string) => {
    if (path === '/backoffice/analytics') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex h-full overflow-hidden" style={{ background: '#030712' }}>
      {/* Analytics Sidebar */}
      <aside
        className={`flex flex-col flex-shrink-0 transition-all duration-300 border-r border-white/5 ${
          collapsed ? 'w-16' : 'w-56'
        }`}
        style={{ background: '#0a0f1e' }}
      >
        {/* Header */}
        <div className="p-3 border-b border-white/5 flex items-center justify-between min-h-[56px]">
          {!collapsed && (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <BarChart3 size={14} className="text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white leading-tight truncate">Analytics</div>
                <div className="text-xs text-gray-600 truncate">Tableau de bord</div>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center mx-auto">
              <BarChart3 size={14} className="text-white" />
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto p-1 rounded-lg text-gray-600 hover:text-white hover:bg-white/5 transition-colors flex-shrink-0"
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2 px-1.5 space-y-4">
          {groups.map((group) => {
            const items = navItems.filter((item) => item.group === group);
            return (
              <div key={group}>
                {!collapsed && (
                  <div className="px-2 mb-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-600">
                      {group}
                    </span>
                  </div>
                )}
                <div className="space-y-0.5">
                  {items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);
                    return (
                      <button
                        key={item.id}
                        onClick={() => navigate(item.path)}
                        title={collapsed ? item.label : undefined}
                        className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg transition-all text-left relative group ${
                          active
                            ? 'bg-blue-500/20 text-blue-400 font-medium'
                            : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
                        }`}
                      >
                        <Icon size={16} className={`flex-shrink-0 ${active ? 'text-blue-400' : ''}`} />
                        {!collapsed && (
                          <span className="text-xs flex-1 truncate">{item.label}</span>
                        )}
                        {active && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-400 rounded-r" />
                        )}
                        {collapsed && (
                          <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                            {item.label}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Period indicator */}
        {!collapsed && (
          <div className="mx-2 mb-2 px-2 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
              <span className="text-[10px] text-blue-400 font-medium">Données en temps réel</span>
            </div>
          </div>
        )}

        {/* Back to CRM */}
        <div className="border-t border-white/5 p-2">
          <button
            onClick={() => navigate('/backoffice/crm')}
            title={collapsed ? 'Retour CRM' : undefined}
            className="w-full flex items-center gap-2.5 px-2 py-2 text-gray-600 hover:text-gray-400 hover:bg-white/5 rounded-lg transition-colors"
          >
            <ArrowLeft size={15} className="flex-shrink-0" />
            {!collapsed && <span className="text-xs">Retour CRM</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto min-w-0">
        <Outlet />
      </main>
    </div>
  );
};

export default AnalyticsLayout;
