import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  MessageSquare,
  Users,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  BarChart2,
  Wifi,
} from 'lucide-react';
import { nativeAdminCall } from '@/lib/native-admin-data';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  path: string;
  badge?: number;
  group: string;
}

const WhatsAppLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [whatsappConfigured, setWhatsappConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const data = await nativeAdminCall<{ conversations?: Array<{ unread_count?: number }>; whatsapp_configured?: boolean }>('/v1/admin/whatsapp?filter=unread');
        const total = (data.conversations || []).reduce((sum, conversation) => sum + Number(conversation.unread_count || 0), 0);
        setUnreadCount(total);
        setWhatsappConfigured(data.whatsapp_configured === true);
      } catch {
        setWhatsappConfigured(false);
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 10000);
    return () => clearInterval(interval);
  }, []);

  const navItems: NavItem[] = [
    { id: 'conversations', label: 'Conversations', icon: MessageSquare, path: '/backoffice/whatsapp', group: 'Principal', badge: unreadCount },
    { id: 'contacts', label: 'Contacts', icon: Users, path: '/backoffice/whatsapp-contacts', group: 'Gestion' },
    { id: 'templates', label: 'Templates', icon: FileText, path: '/backoffice/whatsapp-templates', group: 'Gestion' },
    { id: 'analytics', label: 'Statistiques', icon: BarChart2, path: '/backoffice/whatsapp-analytics', group: 'Analyse' },
    { id: 'settings', label: 'Paramètres', icon: Settings, path: '/backoffice/whatsapp-settings', group: 'Configuration' },
    { id: 'webhook', label: 'Webhook', icon: Wifi, path: '/backoffice/whatsapp-webhook', group: 'Configuration' },
  ];

  const groups = ['Principal', 'Gestion', 'Analyse', 'Configuration'];

  const isActive = (path: string) => {
    if (path === '/backoffice/whatsapp') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex h-full bg-gray-50 overflow-hidden">
      <aside
        className={`bg-gray-900 text-white flex flex-col flex-shrink-0 transition-all duration-300 ${
          collapsed ? 'w-16' : 'w-56'
        }`}
      >
        {/* Header */}
        <div className="p-3 border-b border-gray-800 flex items-center justify-between min-h-[56px]">
          {!collapsed && (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <MessageSquare size={14} className="text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white leading-tight truncate">WhatsApp</div>
                <div className="text-xs text-gray-500 truncate">Business</div>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="w-7 h-7 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center mx-auto">
              <MessageSquare size={14} className="text-white" />
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
                          <span className="text-xs bg-green-500 text-white rounded-full min-w-[16px] h-4 flex items-center justify-center font-bold px-1">
                            {item.badge > 99 ? '99+' : item.badge}
                          </span>
                        )}
                        {collapsed && item.badge && item.badge > 0 && (
                          <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-green-500 rounded-full" />
                        )}
                        {active && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-green-400 rounded-r" />
                        )}
                        {collapsed && (
                          <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                            {item.label}
                            {item.badge && item.badge > 0 ? ` (${item.badge})` : ''}
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

        {/* Connection status */}
        {!collapsed && (
          <div className={`mx-2 mb-2 px-2 py-1.5 rounded-lg border ${whatsappConfigured ? 'bg-green-500/10 border-green-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${whatsappConfigured ? 'bg-green-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className={`text-[10px] font-medium ${whatsappConfigured ? 'text-green-400' : 'text-amber-400'}`}>
                {whatsappConfigured === null ? 'Vérification…' : whatsappConfigured ? 'Configuration active' : 'Configuration requise'}
              </span>
            </div>
          </div>
        )}

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

export default WhatsAppLayout;
