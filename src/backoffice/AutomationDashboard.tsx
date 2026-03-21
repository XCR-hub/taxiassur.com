import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';
import {
  Zap, Activity, Clock, TrendingUp,
  Play, Settings, BarChart3, Target, Sparkles,
  Mail, MessageSquare, FileText, Calendar, Users,
  RefreshCw, Brain, Bot,
  Workflow, Timer, Database, Globe, Search,
  ChevronDown, ChevronUp, Shield,
  Cpu, Server, GitBranch, Rocket,
  type LucideIcon
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface CronJob {
  jobname: string;
  schedule: string;
  active: boolean;
  last_run?: string;
  next_run?: string;
  category?: string;
}

interface AutomationRule {
  id: string;
  name: string;
  description: string;
  category: string;
  trigger_type: string;
  is_active: boolean;
  execution_count: number;
  success_count: number;
  last_executed_at: string;
  priority: number;
}

interface PipelineStage {
  id: string;
  stage_key: string;
  stage_name: string;
  stage_order: number;
  is_automated: boolean;
  requires_human: boolean;
  auto_actions: Record<string, unknown>;
}

interface AutomationTask {
  id: string;
  lead_id: string;
  task_type: string;
  status: string;
  scheduled_at: string;
  executed_at?: string;
  execution_result?: Record<string, unknown>;
}

interface AutomationHistory {
  id: string;
  action_type: string;
  status: string;
  executed_at: string;
  execution_time_ms: number;
  lead_id?: string;
  details?: Record<string, unknown>;
}

interface ROIData {
  automation_name: string;
  total_executions: number;
  successful_executions: number;
  value_generated: number;
  cost_per_execution: number;
  roi_percent: number;
  efficiency_score: number;
  recommendation: string;
}

interface Stats {
  total_cron_jobs: number;
  active_cron_jobs: number;
  total_rules: number;
  active_rules: number;
  pending_tasks: number;
  completed_today: number;
  success_rate: number;
  pipeline_stages: number;
  automated_stages: number;
}

type TabType = 'overview' | 'crons' | 'rules' | 'pipeline' | 'tasks' | 'history' | 'roi';

interface KPICardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  accent: 'yellow' | 'green' | 'blue' | 'orange' | 'rose' | 'teal' | 'cyan' | 'amber';
}

const accentMap: Record<string, { border: string; bg: string; icon: string; text: string }> = {
  yellow: { border: 'border-yellow-500/20', bg: 'bg-yellow-500/5', icon: 'text-yellow-400', text: 'text-yellow-400' },
  green:  { border: 'border-green-500/20',  bg: 'bg-green-500/5',  icon: 'text-green-400',  text: 'text-green-400'  },
  blue:   { border: 'border-blue-500/20',   bg: 'bg-blue-500/5',   icon: 'text-blue-400',   text: 'text-blue-400'   },
  orange: { border: 'border-orange-500/20', bg: 'bg-orange-500/5', icon: 'text-orange-400', text: 'text-orange-400' },
  rose:   { border: 'border-rose-500/20',   bg: 'bg-rose-500/5',   icon: 'text-rose-400',   text: 'text-rose-400'   },
  teal:   { border: 'border-teal-500/20',   bg: 'bg-teal-500/5',   icon: 'text-teal-400',   text: 'text-teal-400'   },
  cyan:   { border: 'border-cyan-500/20',   bg: 'bg-cyan-500/5',   icon: 'text-cyan-400',   text: 'text-cyan-400'   },
  amber:  { border: 'border-amber-500/20',  bg: 'bg-amber-500/5',  icon: 'text-amber-400',  text: 'text-amber-400'  },
};

function KPICard({ icon: Icon, label, value, sub, accent }: KPICardProps) {
  const a = accentMap[accent];
  return (
    <div className={`rounded-xl border ${a.border} ${a.bg} p-4 flex items-start gap-3`}>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${a.bg} border ${a.border}`}>
        <Icon size={18} className={a.icon} />
      </div>
      <div className="min-w-0">
        <div className={`text-2xl font-black ${a.text} leading-none mb-0.5`}>{value}</div>
        <div className="text-xs text-gray-500 truncate">{label}</div>
        {sub && <div className="text-xs text-gray-600 truncate mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

const AutomationDashboard: React.FC = () => {
  const [cronJobs, setCronJobs] = useState<CronJob[]>([]);
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([]);
  const [tasks, setTasks] = useState<AutomationTask[]>([]);
  const [history, setHistory] = useState<AutomationHistory[]>([]);
  const [roiData, setRoiData] = useState<ROIData[]>([]);
  const [stats, setStats] = useState<Stats>({
    total_cron_jobs: 0,
    active_cron_jobs: 0,
    total_rules: 0,
    active_rules: 0,
    pending_tasks: 0,
    completed_today: 0,
    success_rate: 0,
    pipeline_stages: 0,
    automated_stages: 0
  });

  const [loading, setLoading] = useState(true);
  const [isExecuting, setIsExecuting] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [cronFilter, setCronFilter] = useState<string>('all');
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const categorizeJob = (name: string): string => {
    if (name.includes('blog') || name.includes('city') || name.includes('faq') || name.includes('content')) return 'content';
    if (name.includes('email') || name.includes('notification')) return 'email';
    if (name.includes('seo') || name.includes('sitemap') || name.includes('indexnow')) return 'seo';
    if (name.includes('backlink') || name.includes('outreach')) return 'backlink';
    if (name.includes('lead') || name.includes('pipeline') || name.includes('crm')) return 'crm';
    if (name.includes('ai') || name.includes('ia') || name.includes('master')) return 'ai';
    if (name.includes('cleanup') || name.includes('backup')) return 'maintenance';
    if (name.includes('news') || name.includes('social')) return 'social';
    return 'other';
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [cronData, rulesData, pipelineData, tasksData, historyData, roiD] = await Promise.all([
        supabase.from('cron_jobs_config').select('*').order('job_name'),
        supabase.from('crm_automation_rules').select('*').order('priority', { ascending: false }),
        supabase.from('pipeline_stages').select('*').order('stage_order'),
        supabase.from('ai_autonomous_tasks').select('*').order('scheduled_at', { ascending: false }).limit(100),
        supabase.from('crm_automation_history').select('*').order('executed_at', { ascending: false }).limit(100),
        supabase.from('automation_roi_tracking').select('*').order('roi_percent', { ascending: false }),
      ]);

      if (cronData.data) {
        const jobs: CronJob[] = cronData.data.map(j => ({
          jobname: j.job_name,
          schedule: j.schedule || '* * * * *',
          active: j.is_active !== false,
          category: categorizeJob(j.job_name)
        }));
        setCronJobs(jobs);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayCompleted = tasksData.data?.filter(
          t => t.status === 'completed' && new Date(t.executed_at) >= today
        ).length || 0;
        const successCount = historyData.data?.filter(h => h.status === 'success').length || 0;
        const totalExec = historyData.data?.length || 0;

        setStats({
          total_cron_jobs: cronData.data.length,
          active_cron_jobs: cronData.data.filter(c => c.is_active !== false).length,
          total_rules: rulesData.data?.length || 0,
          active_rules: rulesData.data?.filter(r => r.is_active).length || 0,
          pending_tasks: tasksData.data?.filter(t => t.status === 'pending').length || 0,
          completed_today: todayCompleted,
          success_rate: totalExec > 0 ? (successCount / totalExec) * 100 : 100,
          pipeline_stages: pipelineData.data?.length || 0,
          automated_stages: pipelineData.data?.filter(p => p.is_automated && !p.requires_human).length || 0
        });
      }

      if (rulesData.data) setRules(rulesData.data);
      if (pipelineData.data) setPipelineStages(pipelineData.data);
      if (tasksData.data) setTasks(tasksData.data);
      if (historyData.data) setHistory(historyData.data);
      if (roiD.data) setRoiData(roiD.data);

      setLastRefresh(new Date());
    } catch (error) {
      logger.error('Error loading automation data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, [loadData]);

  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      content: 'bg-blue-500',
      email: 'bg-green-500',
      seo: 'bg-orange-500',
      backlink: 'bg-cyan-500',
      crm: 'bg-emerald-500',
      ai: 'bg-rose-500',
      maintenance: 'bg-gray-500',
      social: 'bg-pink-500',
      other: 'bg-slate-500'
    };
    return colors[category] || 'bg-gray-500';
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, any> = {
      content: FileText,
      email: Mail,
      seo: Search,
      backlink: Globe,
      crm: Users,
      ai: Brain,
      maintenance: Database,
      social: MessageSquare,
      other: Settings
    };
    return icons[category] || Settings;
  };

  const parseSchedule = (schedule: string): string => {
    const parts = schedule.trim().split(' ');
    if (parts.length < 5) return schedule;
    const [min, hour, , , weekday] = parts;
    if (min === '*' && hour === '*') return 'Chaque minute';
    if (min.startsWith('*/')) return `Toutes les ${min.slice(2)} min`;
    if (hour.startsWith('*/')) return `Toutes les ${hour.slice(2)}h`;
    if (min === '0' && hour === '*') return 'Chaque heure';
    if (min === '0' && hour !== '*') {
      const hours = hour.includes(',') ? hour.split(',').join('h, ') + 'h' : `${hour}h`;
      return `Chaque jour à ${hours}`;
    }
    if (weekday !== '*' && weekday !== '0-6') {
      const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
      const dayNames = weekday.split(',').map(d => days[parseInt(d)] || d).join(', ');
      return `${dayNames} à ${hour}h`;
    }
    return schedule;
  };

  const toggleRule = async (ruleId: string, currentStatus: boolean) => {
    await supabase
      .from('crm_automation_rules')
      .update({ is_active: !currentStatus })
      .eq('id', ruleId);
    loadData();
  };

  const executeFunction = async (functionName: string) => {
    setIsExecuting(functionName);
    try {
      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({})
        }
      );
      loadData();
    } catch (error) {
      logger.error('Error executing function:', error);
    } finally {
      setIsExecuting(null);
    }
  };

  const filteredCrons = cronJobs.filter(job =>
    cronFilter === 'all' || job.category === cronFilter
  );

  const cronCategories = [...new Set(cronJobs.map(j => j.category || 'other'))];

  const tabs: { key: TabType; label: string; icon: LucideIcon }[] = [
    { key: 'overview', label: 'Vue d\'ensemble', icon: BarChart3 },
    { key: 'crons', label: 'Cron Jobs', icon: Timer },
    { key: 'rules', label: 'Règles', icon: Settings },
    { key: 'pipeline', label: 'Pipeline', icon: GitBranch },
    { key: 'tasks', label: 'Tâches IA', icon: Bot },
    { key: 'history', label: 'Historique', icon: Clock },
    { key: 'roi', label: 'ROI', icon: TrendingUp }
  ];

  return (
    <div className="h-full overflow-auto" style={{ background: '#030712' }}>
      {/* Sticky header */}
      <header className="sticky top-0 z-20" style={{ background: '#0a0f1e', borderBottom: '1px solid rgba(234,179,8,0.12)' }}>
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center">
              <Zap className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-base font-bold text-white leading-tight">Centre d'Automatisations</h1>
              <p className="text-xs text-gray-500">
                {stats.active_cron_jobs} crons actifs · {stats.active_rules} règles · {stats.automated_stages}/{stats.pipeline_stages} étapes auto
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600 hidden lg:block">
              {lastRefresh.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <button
              onClick={() => executeFunction('pipeline-ia-orchestrator')}
              disabled={!!isExecuting}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition disabled:opacity-50"
            >
              <Workflow size={14} />
              Pipeline IA
            </button>
            <button
              onClick={() => executeFunction('master-ai-decision-engine')}
              disabled={!!isExecuting}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium rounded-lg transition disabled:opacity-50"
            >
              <Brain size={14} />
              IA Master
            </button>
            <button
              onClick={loadData}
              className="p-1.5 rounded-lg transition"
              style={{ background: 'rgba(255,255,255,0.05)', color: '#9ca3af' }}
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* KPI strip */}
        <div className="px-6 pb-3 grid grid-cols-4 lg:grid-cols-8 gap-2">
          {[
            { label: 'Cron Jobs',      value: stats.total_cron_jobs,          color: 'from-blue-600 to-blue-700' },
            { label: 'Actifs',         value: stats.active_cron_jobs,          color: 'from-green-600 to-green-700' },
            { label: 'Règles CRM',     value: stats.active_rules,              color: 'from-emerald-600 to-emerald-700' },
            { label: 'Étapes Pipeline',value: stats.pipeline_stages,           color: 'from-cyan-600 to-cyan-700' },
            { label: 'Auto',           value: stats.automated_stages,          color: 'from-orange-600 to-orange-700' },
            { label: 'En Attente',     value: stats.pending_tasks,             color: 'from-yellow-600 to-amber-600' },
            { label: 'Aujourd\'hui',   value: stats.completed_today,           color: 'from-rose-600 to-rose-700' },
            { label: 'Taux Succès',    value: `${stats.success_rate.toFixed(0)}%`, color: 'from-teal-600 to-teal-700' },
          ].map((kpi, i) => (
            <div key={i} className={`bg-gradient-to-br ${kpi.color} rounded-lg px-3 py-2`}>
              <div className="text-lg font-black text-white leading-none">{kpi.value}</div>
              <div className="text-[10px] text-white/70 mt-0.5 truncate">{kpi.label}</div>
            </div>
          ))}
        </div>
      </header>

      <div className="px-6 py-4">
        {/* Tabs */}
        <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition text-sm ${
                activeTab === tab.key
                  ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                  : 'text-gray-500 hover:text-gray-300 border border-transparent'
              }`}
              style={{ background: activeTab === tab.key ? undefined : 'rgba(255,255,255,0.03)' }}
            >
              <tab.icon size={15} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Zap className="mx-auto mb-3 animate-pulse text-yellow-500" size={36} />
              <p className="text-gray-500 text-sm">Chargement des automatisations...</p>
            </div>
          </div>
        )}

        {!loading && (
          <>
            {/* OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <KPICard icon={Timer} label="Cron Jobs actifs" value={stats.active_cron_jobs} sub={`/ ${stats.total_cron_jobs} total`} accent="yellow" />
                  <KPICard icon={Settings} label="Règles actives" value={stats.active_rules} sub={`/ ${stats.total_rules} total`} accent="blue" />
                  <KPICard icon={Bot} label="Tâches en attente" value={stats.pending_tasks} sub={`${stats.completed_today} terminées aujourd'hui`} accent="orange" />
                  <KPICard icon={Target} label="Taux de succès" value={`${stats.success_rate.toFixed(0)}%`} sub="Historique complet" accent="teal" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-gray-800 p-5" style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                      <Timer className="text-yellow-400" size={16} />
                      Cron Jobs par catégorie
                    </h3>
                    <div className="space-y-2">
                      {cronCategories.map(cat => {
                        const count = cronJobs.filter(j => j.category === cat).length;
                        const active = cronJobs.filter(j => j.category === cat && j.active).length;
                        const Icon = getCategoryIcon(cat);
                        return (
                          <div key={cat} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-gray-800/60">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-7 h-7 ${getCategoryColor(cat)} rounded-lg flex items-center justify-center`}>
                                <Icon className="text-white" size={14} />
                              </div>
                              <span className="text-gray-300 text-sm capitalize">{cat}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">{active} actifs</span>
                              <span className="text-white font-bold text-sm">{count}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-800 p-5" style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                      <GitBranch className="text-cyan-400" size={16} />
                      Pipeline Autonome
                    </h3>
                    <div className="space-y-1.5">
                      {pipelineStages.slice(0, 8).map(stage => (
                        <div key={stage.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-800/60">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${
                              stage.requires_human ? 'bg-orange-500' : 'bg-green-500'
                            }`}>
                              {stage.stage_order}
                            </div>
                            <span className="text-gray-300 text-xs">{stage.stage_name}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            stage.requires_human
                              ? 'bg-orange-500/20 text-orange-400'
                              : 'bg-green-500/20 text-green-400'
                          }`}>
                            {stage.requires_human ? 'Humain' : 'Auto'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-800 p-5" style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    <Rocket className="text-rose-400" size={16} />
                    Actions Rapides
                  </h3>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                    {[
                      { name: 'pipeline-ia-orchestrator', label: 'Pipeline IA', icon: Workflow },
                      { name: 'document-collector-ia', label: 'Docs IA', icon: FileText },
                      { name: 'master-ai-decision-engine', label: 'IA Master', icon: Brain },
                      { name: 'crm-automation-engine', label: 'CRM Auto', icon: Users },
                      { name: 'auto-generate-blog-post', label: 'Blog', icon: FileText },
                      { name: 'news-aggregator-master', label: 'News', icon: Globe },
                      { name: 'seo-booster', label: 'SEO Boost', icon: Search },
                      { name: 'sync-all-emails-complete', label: 'Emails', icon: Mail },
                      { name: 'emergency-lead-recovery', label: 'Recovery', icon: Shield },
                      { name: 'ultra-autonomous-self-healer', label: 'Self Heal', icon: Cpu },
                      { name: 'pattern-learning-engine', label: 'Pattern IA', icon: Bot },
                      { name: 'realtime-monitoring-engine', label: 'Monitor', icon: Activity },
                    ].map(action => {
                      const Icon = action.icon;
                      const running = isExecuting === action.name;
                      return (
                        <button
                          key={action.name}
                          onClick={() => executeFunction(action.name)}
                          disabled={!!isExecuting}
                          className="flex flex-col items-center gap-1.5 p-3 rounded-xl transition disabled:opacity-40"
                          style={{ background: running ? 'rgba(234,179,8,0.15)' : 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                        >
                          {running
                            ? <RefreshCw size={18} className="text-yellow-400 animate-spin" />
                            : <Icon size={18} className="text-gray-400" />
                          }
                          <span className="text-[10px] text-gray-400 text-center leading-tight">{action.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* CRONS */}
            {activeTab === 'crons' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-gray-500 text-xs">Filtrer :</span>
                  <button
                    onClick={() => setCronFilter('all')}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                      cronFilter === 'all' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'text-gray-500 border border-gray-800 hover:border-gray-700'
                    }`}
                  >
                    Tous ({cronJobs.length})
                  </button>
                  {cronCategories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setCronFilter(cat)}
                      className={`px-2.5 py-1 rounded text-xs font-medium capitalize transition ${
                        cronFilter === cat ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'text-gray-500 border border-gray-800 hover:border-gray-700'
                      }`}
                    >
                      {cat} ({cronJobs.filter(j => j.category === cat).length})
                    </button>
                  ))}
                </div>

                <div className="rounded-xl border border-gray-800 overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                        <th className="text-left px-4 py-3 text-gray-500 text-xs font-semibold uppercase tracking-wide">Job</th>
                        <th className="text-left px-4 py-3 text-gray-500 text-xs font-semibold uppercase tracking-wide">Catégorie</th>
                        <th className="text-left px-4 py-3 text-gray-500 text-xs font-semibold uppercase tracking-wide">Planning</th>
                        <th className="text-center px-4 py-3 text-gray-500 text-xs font-semibold uppercase tracking-wide">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/60">
                      {filteredCrons.map(job => {
                        const Icon = getCategoryIcon(job.category || 'other');
                        return (
                          <tr key={job.jobname} className="hover:bg-white/[0.02] transition">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className={`w-7 h-7 ${getCategoryColor(job.category || 'other')} rounded-lg flex items-center justify-center flex-shrink-0`}>
                                  <Icon className="text-white" size={13} />
                                </div>
                                <span className="text-gray-300 text-xs font-medium">{job.jobname}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-gray-500 text-xs capitalize">{job.category}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-gray-400 text-xs">{parseSchedule(job.schedule)}</span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                job.active ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'
                              }`}>
                                {job.active ? 'Actif' : 'Inactif'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {filteredCrons.length === 0 && (
                    <div className="text-center py-10 text-gray-600">
                      <Timer className="mx-auto mb-2" size={28} />
                      <p className="text-sm">Aucun cron dans cette catégorie</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* RULES */}
            {activeTab === 'rules' && (
              <div className="space-y-2">
                {rules.length === 0 ? (
                  <div className="text-center py-16 text-gray-600">
                    <Settings className="mx-auto mb-3" size={40} />
                    <p>Aucune règle d'automatisation</p>
                  </div>
                ) : (
                  rules.map(rule => (
                    <div key={rule.id} className="rounded-xl border border-gray-800 p-4 hover:border-gray-700 transition" style={{ background: 'rgba(255,255,255,0.02)' }}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <h3 className="text-white font-semibold text-sm">{rule.name}</h3>
                            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                              rule.is_active ? 'bg-green-500/15 text-green-400' : 'bg-gray-700 text-gray-500'
                            }`}>
                              {rule.is_active ? 'Active' : 'Inactive'}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-blue-500/15 text-blue-400">{rule.category}</span>
                            <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-gray-800 text-gray-500">P{rule.priority}</span>
                          </div>
                          <p className="text-gray-500 text-xs mb-2">{rule.description}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-600">
                            <span>{rule.execution_count} exécutions</span>
                            <span>{rule.success_count} succès</span>
                            <span>
                              {rule.execution_count > 0
                                ? `${((rule.success_count / rule.execution_count) * 100).toFixed(0)}% succès`
                                : 'N/A'}
                            </span>
                            {rule.last_executed_at && (
                              <span>Dernière : {new Date(rule.last_executed_at).toLocaleDateString('fr-FR')}</span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => toggleRule(rule.id, rule.is_active)}
                          className={`ml-4 px-3 py-1.5 rounded-lg text-xs font-medium transition flex-shrink-0 ${
                            rule.is_active
                              ? 'bg-red-500/15 text-red-400 hover:bg-red-500/25'
                              : 'bg-green-500/15 text-green-400 hover:bg-green-500/25'
                          }`}
                        >
                          {rule.is_active ? 'Désactiver' : 'Activer'}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* PIPELINE */}
            {activeTab === 'pipeline' && (
              <div className="rounded-xl border border-gray-800 p-5" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                  <GitBranch className="text-cyan-400" size={16} />
                  Pipeline de Conversion Autonome
                </h3>
                <p className="text-gray-500 text-xs mb-5">
                  Seules les étapes "Devis" et "Contrat" nécessitent une intervention humaine. Tout le reste est automatisé par l'IA.
                </p>
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-800" />
                  <div className="space-y-3">
                    {pipelineStages.map(stage => (
                      <div key={stage.id} className="relative flex items-start gap-3 pl-10">
                        <div className={`absolute left-2.5 w-3 h-3 rounded-full mt-3.5 border-2 flex-shrink-0 ${
                          stage.requires_human
                            ? 'bg-orange-500 border-orange-400'
                            : 'bg-green-500 border-green-400'
                        }`} />
                        <div className="flex-1 rounded-lg px-4 py-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <span className="text-gray-600 text-xs">Étape {stage.stage_order}</span>
                              <span className="text-white text-sm font-medium">{stage.stage_name}</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              stage.requires_human
                                ? 'bg-orange-500/15 text-orange-400'
                                : 'bg-green-500/15 text-green-400'
                            }`}>
                              {stage.requires_human ? 'Action Humaine' : 'Automatisé'}
                            </span>
                          </div>
                          {stage.auto_actions && Object.keys(stage.auto_actions).length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {Object.entries(stage.auto_actions).map(([key, value]) => (
                                <span key={key} className="px-2 py-0.5 rounded text-xs bg-gray-800 text-gray-500">
                                  {key}: {String(value)}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TASKS */}
            {activeTab === 'tasks' && (
              <div className="rounded-xl border border-gray-800 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                      <th className="text-left px-4 py-3 text-gray-500 text-xs font-semibold uppercase tracking-wide">Type</th>
                      <th className="text-left px-4 py-3 text-gray-500 text-xs font-semibold uppercase tracking-wide">Lead</th>
                      <th className="text-left px-4 py-3 text-gray-500 text-xs font-semibold uppercase tracking-wide">Planifié</th>
                      <th className="text-left px-4 py-3 text-gray-500 text-xs font-semibold uppercase tracking-wide">Exécuté</th>
                      <th className="text-center px-4 py-3 text-gray-500 text-xs font-semibold uppercase tracking-wide">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60">
                    {tasks.slice(0, 50).map(task => (
                      <tr key={task.id} className="hover:bg-white/[0.02] transition">
                        <td className="px-4 py-2.5 text-gray-300 text-xs">{task.task_type}</td>
                        <td className="px-4 py-2.5 text-gray-500 text-xs font-mono">{task.lead_id?.slice(0, 8)}…</td>
                        <td className="px-4 py-2.5 text-gray-500 text-xs">{new Date(task.scheduled_at).toLocaleString('fr-FR')}</td>
                        <td className="px-4 py-2.5 text-gray-500 text-xs">{task.executed_at ? new Date(task.executed_at).toLocaleString('fr-FR') : '—'}</td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            task.status === 'completed' ? 'bg-green-500/15 text-green-400' :
                            task.status === 'pending'   ? 'bg-yellow-500/15 text-yellow-400' :
                            task.status === 'failed'    ? 'bg-red-500/15 text-red-400' :
                            'bg-gray-700 text-gray-400'
                          }`}>
                            {task.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {tasks.length === 0 && (
                  <div className="text-center py-12 text-gray-600">
                    <Bot className="mx-auto mb-2" size={32} />
                    <p className="text-sm">Aucune tâche en cours</p>
                  </div>
                )}
              </div>
            )}

            {/* HISTORY */}
            {activeTab === 'history' && (
              <div className="rounded-xl border border-gray-800 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                      <th className="text-left px-4 py-3 text-gray-500 text-xs font-semibold uppercase tracking-wide">Action</th>
                      <th className="text-left px-4 py-3 text-gray-500 text-xs font-semibold uppercase tracking-wide">Date</th>
                      <th className="text-left px-4 py-3 text-gray-500 text-xs font-semibold uppercase tracking-wide">Durée</th>
                      <th className="text-center px-4 py-3 text-gray-500 text-xs font-semibold uppercase tracking-wide">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60">
                    {history.map(item => (
                      <tr key={item.id} className="hover:bg-white/[0.02] transition">
                        <td className="px-4 py-2.5 text-gray-300 text-xs">{item.action_type}</td>
                        <td className="px-4 py-2.5 text-gray-500 text-xs">{new Date(item.executed_at).toLocaleString('fr-FR')}</td>
                        <td className="px-4 py-2.5 text-gray-500 text-xs">{item.execution_time_ms}ms</td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            item.status === 'success' ? 'bg-green-500/15 text-green-400' :
                            item.status === 'failed'  ? 'bg-red-500/15 text-red-400' :
                            'bg-yellow-500/15 text-yellow-400'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {history.length === 0 && (
                  <div className="text-center py-12 text-gray-600">
                    <Clock className="mx-auto mb-2" size={32} />
                    <p className="text-sm">Aucun historique</p>
                  </div>
                )}
              </div>
            )}

            {/* ROI */}
            {activeTab === 'roi' && (
              <div className="space-y-3">
                {roiData.length === 0 ? (
                  <div className="text-center py-16 text-gray-600">
                    <TrendingUp className="mx-auto mb-3" size={40} />
                    <p>Données ROI non disponibles</p>
                  </div>
                ) : (
                  roiData.map(roi => (
                    <div key={roi.automation_name} className="rounded-xl border border-gray-800 p-5" style={{ background: 'rgba(255,255,255,0.02)' }}>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-white font-semibold text-sm">{roi.automation_name}</h3>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          roi.roi_percent >= 200 ? 'bg-green-500/15 text-green-400' :
                          roi.roi_percent >= 100 ? 'bg-blue-500/15 text-blue-400' :
                          roi.roi_percent >= 0   ? 'bg-yellow-500/15 text-yellow-400' :
                          'bg-red-500/15 text-red-400'
                        }`}>
                          ROI : {roi.roi_percent.toFixed(0)}%
                        </span>
                      </div>
                      <div className="grid grid-cols-5 gap-3 mb-3">
                        {[
                          { label: 'Exécutions', value: roi.total_executions, cls: 'text-white' },
                          { label: 'Succès', value: roi.successful_executions, cls: 'text-green-400' },
                          { label: 'Efficacité', value: `${roi.efficiency_score.toFixed(0)}%`, cls: 'text-white' },
                          { label: 'Valeur', value: `${roi.value_generated.toFixed(0)}€`, cls: 'text-cyan-400' },
                          { label: 'Coût/Ex', value: `${roi.cost_per_execution.toFixed(2)}€`, cls: 'text-orange-400' },
                        ].map(col => (
                          <div key={col.label}>
                            <div className={`text-xl font-black ${col.cls} leading-none`}>{col.value}</div>
                            <div className="text-xs text-gray-600 mt-0.5">{col.label}</div>
                          </div>
                        ))}
                      </div>
                      <div className={`px-3 py-2 rounded-lg text-xs ${
                        roi.recommendation.includes('Excellent') ? 'bg-green-500/8 text-green-400' :
                        roi.recommendation.includes('Maintenir') ? 'bg-blue-500/8 text-blue-400' :
                        roi.recommendation.includes('Optimiser') ? 'bg-yellow-500/8 text-yellow-400' :
                        'bg-red-500/8 text-red-400'
                      }`}>
                        {roi.recommendation}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AutomationDashboard;
