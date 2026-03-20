import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Mail,
  LayoutDashboard,
  Send,
  Users,
  Sparkles,
  BarChart3,
  Beaker,
  Bell,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  path: string;
  badge?: number;
  group?: string;
}

const navItems: NavItem[] = [
  { id: 'hub', label: 'Vue d\'ensemble', icon: LayoutDashboard, path: '/backoffice/email-marketing', group: 'Principal' },
  { id: 'newsletter', label: 'Campagnes', icon: Send, path: '/backoffice/newsletter', group: 'Envois' },
  { id: 'subscribers', label: 'Abonnés', icon: Users, path: '/backoffice/email-subscribers', group: 'Envois' },
  { id: 'templates', label: 'Templates IA', icon: Sparkles, path: '/backoffice/smart-templates', group: 'Contenu' },
  { id: 'ab-testing', label: 'Tests A/B', icon: Beaker, path: '/backoffice/ab-testing', group: 'Contenu' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, path: '/backoffice/email-analytics', group: 'Mesure' },
  { id: 'notifications', label: 'Notifications', icon: Bell, path: '/backoffice/notifications', group: 'Mesure' },
];

const groups = ['Principal', 'Envois', 'Contenu', 'Mesure'];

const EmailMarketingLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (path: string) => {
    if (path === '/backoffice/email-marketing') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex h-full bg-gray-50 overflow-hidden">
      {/* Email Marketing Sidebar */}
      <aside
        className={`bg-gray-900 text-white flex flex-col flex-shrink-0 transition-all duration-300 ${
          collapsed ? 'w-16' : 'w-56'
        }`}
      >
        {/* Header */}
        <div className="p-3 border-b border-gray-800 flex items-center justify-between min-h-[56px]">
          {!collapsed && (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Mail size={14} className="text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white leading-tight truncate">Email Marketing</div>
                <div className="text-xs text-gray-500 truncate">Centre de contrôle</div>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="w-7 h-7 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center mx-auto">
              <Mail size={14} className="text-white" />
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto p-1 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-colors flex-shrink-0"
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
                            ? 'bg-green-500/20 text-green-400 font-medium'
                            : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                        }`}
                      >
                        <Icon size={16} className={`flex-shrink-0 ${active ? 'text-green-400' : ''}`} />
                        {!collapsed && (
                          <span className="text-xs flex-1 truncate">{item.label}</span>
                        )}
                        {!collapsed && item.badge && item.badge > 0 && (
                          <span className="text-xs bg-green-500 text-white rounded-full w-4 h-4 flex items-center justify-center font-bold">
                            {item.badge > 9 ? '9+' : item.badge}
                          </span>
                        )}
                        {active && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-green-400 rounded-r" />
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

        {/* Back to CRM */}
        <div className="border-t border-gray-800 p-2">
          <button
            onClick={() => navigate('/backoffice/crm')}
            title={collapsed ? 'Retour CRM' : undefined}
            className="w-full flex items-center gap-2.5 px-2 py-2 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
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

export default EmailMarketingLayout;
