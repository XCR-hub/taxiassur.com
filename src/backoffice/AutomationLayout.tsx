import React, { useState, useEffect } from 'react';
import { internalFunctionHeaders } from '@/lib/internal-function-auth';
import { withTimeout } from '@/lib/promise-timeout';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Zap,
  BarChart3,
  Timer,
  Play,
  Bot,
  Globe,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Cpu,
  Workflow,
  FlaskConical,
  SlidersHorizontal,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  path: string;
  badge?: number;
  group: string;
}

const navItems: NavItem[] = [
  { id: 'overview', label: 'Vue d\'ensemble', icon: BarChart3, path: '/backoffice/automations', group: 'Principal' },
  { id: 'scheduler', label: 'Planificateur', icon: Calendar, path: '/backoffice/automation-scheduler', group: 'Orchestration' },
  { id: 'ai-autonomous', label: 'IA Autonome', icon: Cpu, path: '/backoffice/ai-autonomous', group: 'Orchestration' },
  { id: 'pipeline', label: 'Pipeline IA', icon: Workflow, path: '/backoffice/pipeline-crm', group: 'Orchestration' },
  { id: 'tests', label: 'Tests', icon: FlaskConical, path: '/backoffice/test-automations', group: 'Contrôle' },
  { id: 'optimizer', label: 'Optimiseur', icon: SlidersHorizontal, path: '/backoffice/auto-optimizer', group: 'Contrôle' },
  { id: 'backlinks', label: 'Backlinks Auto', icon: Globe, path: '/backoffice/backlink-automation', group: 'Acquisition' },
];

const groups = ['Principal', 'Orchestration', 'Contrôle', 'Acquisition'];

const AutomationLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [activeCrons, setActiveCrons] = useState(0);
  const [pendingTasks, setPendingTasks] = useState(0);

  useEffect(() => {
    const fetchStats = async () => {
      const [cronData, taskData] = await Promise.all([
        supabase.from('cron_jobs_config').select('is_active').eq('is_active', true),
        supabase.from('ai_autonomous_tasks').select('status').eq('status', 'pending'),
      ]);
      setActiveCrons(cronData.data?.length || 0);
      setPendingTasks(taskData.data?.length || 0);
    };
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const isActive = (path: string) => {
    if (path === '/backoffice/automations') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex h-full overflow-hidden" style={{ background: '#030712' }}>
      <aside
        className={`flex flex-col flex-shrink-0 transition-all duration-300 ${collapsed ? 'w-16' : 'w-56'}`}
        style={{ background: '#0a0f1e', borderRight: '1px solid rgba(234,179,8,0.1)' }}
      >
        {/* Header */}
        <div className="p-3 flex items-center justify-between min-h-[56px]" style={{ borderBottom: '1px solid rgba(234,179,8,0.1)' }}>
          {!collapsed && (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Zap size={14} className="text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white leading-tight truncate">Automatisations</div>
                <div className="text-xs truncate" style={{ color: '#6b7280' }}>Centre de contrôle</div>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="w-7 h-7 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-lg flex items-center justify-center mx-auto">
              <Zap size={14} className="text-white" />
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto p-1 rounded-lg transition-colors flex-shrink-0"
            style={{ color: '#6b7280' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
            onMouseLeave={e => (e.currentTarget.style.color = '#6b7280')}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* Live stats strip */}
        {!collapsed && (
          <div className="px-3 py-2 flex gap-2" style={{ borderBottom: '1px solid rgba(234,179,8,0.08)' }}>
            <div className="flex items-center gap-1.5 flex-1">
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
              <span className="text-xs" style={{ color: '#9ca3af' }}>
                <span className="text-yellow-400 font-semibold">{activeCrons}</span> crons actifs
              </span>
            </div>
            {pendingTasks > 0 && (
              <div className="flex items-center gap-1">
                <Bot size={10} className="text-orange-400" />
                <span className="text-xs text-orange-400 font-semibold">{pendingTasks}</span>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2 px-1.5 space-y-4">
          {groups.map(group => {
            const items = navItems.filter(item => item.group === group);
            return (
              <div key={group}>
                {!collapsed && (
                  <div className="px-2 mb-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#374151' }}>
                      {group}
                    </span>
                  </div>
                )}
                <div className="space-y-0.5">
                  {items.map(item => {
                    const Icon = item.icon;
                    const active = isActive(item.path);
                    return (
                      <button
                        key={item.id}
                        onClick={() => navigate(item.path)}
                        title={collapsed ? item.label : undefined}
                        className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg transition-all text-left relative group"
                        style={{
                          background: active ? 'rgba(234,179,8,0.15)' : 'transparent',
                          color: active ? '#eab308' : '#9ca3af',
                        }}
                        onMouseEnter={e => {
                          if (!active) {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                            e.currentTarget.style.color = '#e5e7eb';
                          }
                        }}
                        onMouseLeave={e => {
                          if (!active) {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = '#9ca3af';
                          }
                        }}
                      >
                        <Icon size={16} className="flex-shrink-0" />
                        {!collapsed && (
                          <span className="text-xs flex-1 truncate font-medium">{item.label}</span>
                        )}
                        {!collapsed && item.badge && item.badge > 0 && (
                          <span className="text-xs bg-yellow-500 text-black rounded-full w-4 h-4 flex items-center justify-center font-bold">
                            {item.badge > 9 ? '9+' : item.badge}
                          </span>
                        )}
                        {active && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-yellow-400 rounded-r" />
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

        {/* Run now shortcut */}
        {!collapsed && (
          <div className="px-2 pb-2">
            <button
              onClick={async () => {
                try {
                  const headers = await internalFunctionHeaders();
                  const response = await withTimeout(fetch(
                    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crm-automation-engine`,
                    {
                      method: 'POST',
                      headers: { Authorization: headers.Authorization, 'Content-Type': 'application/json' },
                      body: JSON.stringify({}),
                    },
                  ), 30_000);
                  if (!response.ok) throw new Error(`Automation HTTP ${response.status}`);
                } catch (error) {
                  console.error('CRM automation execution failed', error);
                }
              }}
              className="w-full flex items-center gap-2 px-2 py-2 rounded-lg transition-all text-xs font-medium"
              style={{ background: 'rgba(234,179,8,0.1)', color: '#eab308', border: '1px solid rgba(234,179,8,0.2)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(234,179,8,0.2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(234,179,8,0.1)')}
            >
              <Play size={12} />
              Exécuter CRM Auto
            </button>
          </div>
        )}

        {/* Back to CRM */}
        <div className="p-2" style={{ borderTop: '1px solid rgba(234,179,8,0.1)' }}>
          <button
            onClick={() => navigate('/backoffice/crm')}
            title={collapsed ? 'Retour CRM' : undefined}
            className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg transition-colors"
            style={{ color: '#6b7280' }}
            onMouseEnter={e => {
              e.currentTarget.style.color = '#d1d5db';
              e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = '#6b7280';
              e.currentTarget.style.background = 'transparent';
            }}
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

export default AutomationLayout;
