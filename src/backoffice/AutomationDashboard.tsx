import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { logger } from '@/lib/logger';
import {
  Zap, Activity, CheckCircle, XCircle, Clock, TrendingUp,
  Play, Pause, Settings, BarChart3, Target, Sparkles,
  Mail, MessageSquare, Phone, FileText, Calendar, Users,
  RefreshCw, AlertCircle, ArrowRight, Eye, Brain, Bot,
  Workflow, Timer, Database, Globe, Search, Filter,
  ChevronDown, ChevronUp, MoreVertical, Home, Shield,
  AlertTriangle, Cpu, Server, Layers, GitBranch, Rocket
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
  auto_actions: any;
}

interface AutomationTask {
  id: string;
  lead_id: string;
  task_type: string;
  status: string;
  scheduled_at: string;
  executed_at?: string;
  execution_result?: any;
}

interface AutomationHistory {
  id: string;
  action_type: string;
  status: string;
  executed_at: string;
  execution_time_ms: number;
  lead_id?: string;
  details?: any;
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

const AutomationDashboard: React.FC = () => {
  const navigate = useNavigate();
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
  const [isExecuting, setIsExecuting] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [cronFilter, setCronFilter] = useState<string>('all');
  const [expandedCrons, setExpandedCrons] = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadCronJobs(),
        loadRules(),
        loadPipelineStages(),
        loadTasks(),
        loadHistory(),
        loadROI(),
        loadStats()
      ]);
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

  const loadCronJobs = async () => {
    const { data } = await supabase
      .from('cron_jobs_config')
      .select('*')
      .order('job_name');

    if (data) {
      const jobs: CronJob[] = data.map(j => ({
        jobname: j.job_name,
        schedule: j.schedule || '* * * * *',
        active: j.is_active !== false,
        category: categorizeJob(j.job_name)
      }));
      setCronJobs(jobs);
    }
  };

  const loadRules = async () => {
    const { data } = await supabase
      .from('crm_automation_rules')
      .select('*')
      .order('priority', { ascending: false });

    if (data) setRules(data);
  };

  const loadPipelineStages = async () => {
    const { data } = await supabase
      .from('pipeline_stages')
      .select('*')
      .order('stage_order');

    if (data) setPipelineStages(data);
  };

  const loadTasks = async () => {
    const { data } = await supabase
      .from('ai_autonomous_tasks')
      .select('*')
      .order('scheduled_at', { ascending: false })
      .limit(100);

    if (data) setTasks(data);
  };

  const loadHistory = async () => {
    const { data } = await supabase
      .from('crm_automation_history')
      .select('*')
      .order('executed_at', { ascending: false })
      .limit(100);

    if (data) setHistory(data);
  };

  const loadROI = async () => {
    const { data } = await supabase
      .from('automation_roi_tracking')
      .select('*')
      .order('roi_percent', { ascending: false });

    if (data) setRoiData(data);
  };

  const loadStats = async () => {
    const [cronData, rulesData, tasksData, pipelineData, historyData] = await Promise.all([
      supabase.from('cron_jobs_config').select('job_name, is_active'),
      supabase.from('crm_automation_rules').select('id, is_active'),
      supabase.from('ai_autonomous_tasks').select('status, executed_at'),
      supabase.from('pipeline_stages').select('id, is_automated, requires_human'),
      supabase.from('crm_automation_history').select('status, executed_at')
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayCompleted = tasksData.data?.filter(
      t => t.status === 'completed' && new Date(t.executed_at) >= today
    ).length || 0;

    const successCount = historyData.data?.filter(h => h.status === 'success').length || 0;
    const totalExec = historyData.data?.length || 0;

    setStats({
      total_cron_jobs: cronData.data?.length || 0,
      active_cron_jobs: cronData.data?.filter(c => c.is_active !== false).length || 0,
      total_rules: rulesData.data?.length || 0,
      active_rules: rulesData.data?.filter(r => r.is_active).length || 0,
      pending_tasks: tasksData.data?.filter(t => t.status === 'pending').length || 0,
      completed_today: todayCompleted,
      success_rate: totalExec > 0 ? (successCount / totalExec) * 100 : 100,
      pipeline_stages: pipelineData.data?.length || 0,
      automated_stages: pipelineData.data?.filter(p => p.is_automated && !p.requires_human).length || 0
    });
  };

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

    const [min, hour, day, month, weekday] = parts;

    if (min === '*' && hour === '*') return 'Chaque minute';
    if (min.startsWith('*/')) return `Toutes les ${min.slice(2)} minutes`;
    if (hour.startsWith('*/')) return `Toutes les ${hour.slice(2)} heures`;
    if (min === '0' && hour === '*') return 'Chaque heure';
    if (min === '0' && hour !== '*' && day === '*') {
      const hours = hour.includes(',') ? hour.split(',').join('h, ') + 'h' : `${hour}h`;
      return `Chaque jour a ${hours}`;
    }
    if (weekday !== '*' && weekday !== '0-6') {
      const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
      const dayNames = weekday.split(',').map(d => days[parseInt(d)] || d).join(', ');
      return `${dayNames} a ${hour}h${min !== '0' ? min : ''}`;
    }

    return schedule;
  };

  const toggleRule = async (ruleId: string, currentStatus: boolean) => {
    await supabase
      .from('crm_automation_rules')
      .update({ is_active: !currentStatus })
      .eq('id', ruleId);
    loadRules();
  };

  const executeFunction = async (functionName: string) => {
    setIsExecuting(true);
    try {
      const response = await fetch(
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
      const data = await response.json();
      alert(`Fonction ${functionName} executee avec succes!`);
      loadData();
    } catch (error) {
      logger.error('Error executing function:', error);
      alert('Erreur lors de l\'execution');
    } finally {
      setIsExecuting(false);
    }
  };

  const filteredCrons = cronJobs.filter(job =>
    cronFilter === 'all' || job.category === cronFilter
  );

  const cronCategories = [...new Set(cronJobs.map(j => j.category || 'other'))];

  const tabs: { key: TabType; label: string; icon: any }[] = [
    { key: 'overview', label: 'Vue d\'ensemble', icon: BarChart3 },
    { key: 'crons', label: 'Cron Jobs', icon: Timer },
    { key: 'rules', label: 'Regles', icon: Settings },
    { key: 'pipeline', label: 'Pipeline', icon: GitBranch },
    { key: 'tasks', label: 'Taches IA', icon: Bot },
    { key: 'history', label: 'Historique', icon: Clock },
    { key: 'roi', label: 'ROI', icon: TrendingUp }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Zap className="mx-auto mb-4 animate-pulse text-yellow-500" size={48} />
          <p className="text-gray-400">Chargement des automatisations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-20">
        <div className="max-w-[1900px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center">
                <Zap className="text-white" size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Centre d'Automatisations</h1>
                <p className="text-gray-400 text-sm">
                  {stats.active_cron_jobs} crons actifs | {stats.active_rules} regles | {stats.automated_stages}/{stats.pipeline_stages} etapes auto
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => executeFunction('pipeline-ia-orchestrator')}
                disabled={isExecuting}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition disabled:opacity-50"
              >
                <Workflow size={18} />
                Pipeline IA
              </button>
              <button
                onClick={() => executeFunction('crm-automation-engine')}
                disabled={isExecuting}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition disabled:opacity-50"
              >
                {isExecuting ? <RefreshCw size={18} className="animate-spin" /> : <Play size={18} />}
                Executer CRM
              </button>
              <button
                onClick={() => executeFunction('master-ai-decision-engine')}
                disabled={isExecuting}
                className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-lg transition disabled:opacity-50"
              >
                <Brain size={18} />
                IA Master
              </button>
              <button
                onClick={loadData}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
              >
                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              </button>
              <button
                onClick={() => navigate('/backoffice')}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition"
              >
                <Home size={18} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-8 gap-3 mt-4">
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg p-3">
              <div className="text-2xl font-black text-white">{stats.total_cron_jobs}</div>
              <div className="text-xs text-blue-200">Cron Jobs</div>
            </div>
            <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-lg p-3">
              <div className="text-2xl font-black text-white">{stats.active_cron_jobs}</div>
              <div className="text-xs text-green-200">Actifs</div>
            </div>
            <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-lg p-3">
              <div className="text-2xl font-black text-white">{stats.active_rules}</div>
              <div className="text-xs text-emerald-200">Regles CRM</div>
            </div>
            <div className="bg-gradient-to-br from-cyan-600 to-cyan-700 rounded-lg p-3">
              <div className="text-2xl font-black text-white">{stats.pipeline_stages}</div>
              <div className="text-xs text-cyan-200">Etapes Pipeline</div>
            </div>
            <div className="bg-gradient-to-br from-orange-600 to-orange-700 rounded-lg p-3">
              <div className="text-2xl font-black text-white">{stats.automated_stages}</div>
              <div className="text-xs text-orange-200">Auto Sans Humain</div>
            </div>
            <div className="bg-gradient-to-br from-yellow-600 to-amber-600 rounded-lg p-3">
              <div className="text-2xl font-black text-white">{stats.pending_tasks}</div>
              <div className="text-xs text-yellow-200">Taches En Attente</div>
            </div>
            <div className="bg-gradient-to-br from-rose-600 to-rose-700 rounded-lg p-3">
              <div className="text-2xl font-black text-white">{stats.completed_today}</div>
              <div className="text-xs text-rose-200">Terminees Aujourd'hui</div>
            </div>
            <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-lg p-3">
              <div className="text-2xl font-black text-white">{stats.success_rate.toFixed(0)}%</div>
              <div className="text-xs text-teal-200">Taux Succes</div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-[1900px] mx-auto px-6 py-6">
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-3 rounded-lg font-medium whitespace-nowrap transition ${
                activeTab === tab.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Timer className="text-yellow-500" size={20} />
                  Cron Jobs par Categorie
                </h3>
                <div className="space-y-3">
                  {cronCategories.map(cat => {
                    const count = cronJobs.filter(j => j.category === cat).length;
                    const Icon = getCategoryIcon(cat);
                    return (
                      <div key={cat} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 ${getCategoryColor(cat)} rounded-lg flex items-center justify-center`}>
                            <Icon className="text-white" size={20} />
                          </div>
                          <span className="text-white font-medium capitalize">{cat}</span>
                        </div>
                        <div className="text-2xl font-bold text-white">{count}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <GitBranch className="text-cyan-500" size={20} />
                  Pipeline Autonome
                </h3>
                <div className="space-y-2">
                  {pipelineStages.slice(0, 8).map(stage => (
                    <div key={stage.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          stage.requires_human ? 'bg-orange-500' : 'bg-green-500'
                        } text-white`}>
                          {stage.stage_order}
                        </div>
                        <span className="text-white text-sm">{stage.stage_name}</span>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
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

            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Rocket className="text-rose-500" size={20} />
                Actions Rapides
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {[
                  { name: 'pipeline-ia-orchestrator', label: 'Pipeline IA', icon: Workflow, color: 'blue' },
                  { name: 'document-collector-ia', label: 'Collecteur Docs', icon: FileText, color: 'green' },
                  { name: 'master-ai-decision-engine', label: 'IA Master', icon: Brain, color: 'rose' },
                  { name: 'crm-automation-engine', label: 'CRM Auto', icon: Users, color: 'emerald' },
                  { name: 'auto-generate-blog-post', label: 'Gen Blog', icon: FileText, color: 'blue' },
                  { name: 'news-aggregator-master', label: 'News', icon: Globe, color: 'orange' },
                  { name: 'seo-booster', label: 'SEO Boost', icon: Search, color: 'yellow' },
                  { name: 'sync-all-emails-complete', label: 'Sync Emails', icon: Mail, color: 'cyan' },
                  { name: 'emergency-lead-recovery', label: 'Recovery Leads', icon: Shield, color: 'red' },
                  { name: 'ultra-autonomous-self-healer', label: 'Self Healer', icon: Cpu, color: 'teal' },
                  { name: 'pattern-learning-engine', label: 'Pattern IA', icon: Bot, color: 'pink' },
                  { name: 'realtime-monitoring-engine', label: 'Monitoring', icon: Activity, color: 'amber' }
                ].map(action => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.name}
                      onClick={() => executeFunction(action.name)}
                      disabled={isExecuting}
                      className={`flex flex-col items-center gap-2 p-4 bg-gray-800 hover:bg-gray-700 rounded-xl transition disabled:opacity-50`}
                    >
                      <div className={`w-10 h-10 bg-${action.color}-500/20 rounded-lg flex items-center justify-center`}>
                        <Icon className={`text-${action.color}-400`} size={20} />
                      </div>
                      <span className="text-xs text-gray-300 text-center">{action.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'crons' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-gray-400 text-sm">Filtrer:</span>
              <button
                onClick={() => setCronFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  cronFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                Tous ({cronJobs.length})
              </button>
              {cronCategories.map(cat => {
                const count = cronJobs.filter(j => j.category === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => setCronFilter(cat)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition ${
                      cronFilter === cat ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    {cat} ({count})
                  </button>
                );
              })}
            </div>

            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-800">
                    <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Job</th>
                    <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Categorie</th>
                    <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Planning</th>
                    <th className="text-center px-4 py-3 text-gray-400 text-sm font-medium">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {filteredCrons.map(job => {
                    const Icon = getCategoryIcon(job.category || 'other');
                    return (
                      <tr key={job.jobname} className="hover:bg-gray-800/50 transition">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 ${getCategoryColor(job.category || 'other')} rounded-lg flex items-center justify-center`}>
                              <Icon className="text-white" size={16} />
                            </div>
                            <span className="text-white font-medium text-sm">{job.jobname}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-gray-400 text-sm capitalize">{job.category}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-gray-300 text-sm">{parseSchedule(job.schedule)}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            job.active
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {job.active ? 'Actif' : 'Inactif'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'rules' && (
          <div className="space-y-3">
            {rules.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <Settings className="mx-auto mb-4 text-gray-600" size={48} />
                <p className="text-lg">Aucune regle d'automatisation</p>
              </div>
            ) : (
              rules.map(rule => (
                <div
                  key={rule.id}
                  className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-white font-bold">{rule.name}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          rule.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-500'
                        }`}>
                          {rule.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-400">
                          {rule.category}
                        </span>
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-700 text-gray-400">
                          P{rule.priority}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm mb-3">{rule.description}</p>
                      <div className="flex items-center gap-6 text-xs text-gray-500">
                        <span>{rule.execution_count} executions</span>
                        <span>{rule.success_count} succes</span>
                        <span>
                          {rule.execution_count > 0
                            ? `${((rule.success_count / rule.execution_count) * 100).toFixed(0)}% taux succes`
                            : 'N/A'}
                        </span>
                        {rule.last_executed_at && (
                          <span>Derniere: {new Date(rule.last_executed_at).toLocaleString('fr-FR')}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => toggleRule(rule.id, rule.is_active)}
                      className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
                        rule.is_active
                          ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                          : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                      }`}
                    >
                      {rule.is_active ? 'Desactiver' : 'Activer'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'pipeline' && (
          <div className="space-y-4">
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
              <h3 className="text-lg font-bold text-white mb-4">Pipeline de Conversion Autonome</h3>
              <p className="text-gray-400 mb-6">
                Seules les etapes "Devis" et "Contrat" necessitent une intervention humaine.
                Tout le reste est automatise par l'IA.
              </p>

              <div className="relative">
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-700" />
                <div className="space-y-4">
                  {pipelineStages.map((stage, idx) => (
                    <div key={stage.id} className="relative flex items-center gap-4 pl-12">
                      <div className={`absolute left-4 w-5 h-5 rounded-full border-2 ${
                        stage.requires_human
                          ? 'bg-orange-500 border-orange-400'
                          : 'bg-green-500 border-green-400'
                      }`} />

                      <div className="flex-1 bg-gray-800 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <span className="text-gray-500 text-sm">Etape {stage.stage_order}</span>
                            <h4 className="text-white font-medium">{stage.stage_name}</h4>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            stage.requires_human
                              ? 'bg-orange-500/20 text-orange-400'
                              : 'bg-green-500/20 text-green-400'
                          }`}>
                            {stage.requires_human ? 'Action Humaine' : 'Automatise'}
                          </span>
                        </div>

                        {stage.auto_actions && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {Object.entries(stage.auto_actions).map(([key, value]) => (
                              <span key={key} className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-400">
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
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-800">
                  <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Type</th>
                  <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Lead</th>
                  <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Planifie</th>
                  <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Execute</th>
                  <th className="text-center px-4 py-3 text-gray-400 text-sm font-medium">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {tasks.slice(0, 50).map(task => (
                  <tr key={task.id} className="hover:bg-gray-800/50">
                    <td className="px-4 py-3 text-white text-sm">{task.task_type}</td>
                    <td className="px-4 py-3 text-gray-400 text-sm">{task.lead_id?.slice(0, 8)}...</td>
                    <td className="px-4 py-3 text-gray-400 text-sm">
                      {new Date(task.scheduled_at).toLocaleString('fr-FR')}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-sm">
                      {task.executed_at ? new Date(task.executed_at).toLocaleString('fr-FR') : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        task.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                        task.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                        task.status === 'failed' ? 'bg-red-500/20 text-red-400' :
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
              <div className="text-center py-12 text-gray-500">
                <Bot className="mx-auto mb-3 text-gray-600" size={40} />
                <p>Aucune tache en cours</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-800">
                  <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Action</th>
                  <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Date</th>
                  <th className="text-left px-4 py-3 text-gray-400 text-sm font-medium">Duree</th>
                  <th className="text-center px-4 py-3 text-gray-400 text-sm font-medium">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {history.map(item => (
                  <tr key={item.id} className="hover:bg-gray-800/50">
                    <td className="px-4 py-3 text-white text-sm">{item.action_type}</td>
                    <td className="px-4 py-3 text-gray-400 text-sm">
                      {new Date(item.executed_at).toLocaleString('fr-FR')}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-sm">{item.execution_time_ms}ms</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        item.status === 'success' ? 'bg-green-500/20 text-green-400' :
                        item.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {history.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Clock className="mx-auto mb-3 text-gray-600" size={40} />
                <p>Aucun historique</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'roi' && (
          <div className="space-y-4">
            {roiData.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <TrendingUp className="mx-auto mb-4 text-gray-600" size={48} />
                <p className="text-lg">Donnees ROI non disponibles</p>
              </div>
            ) : (
              roiData.map(roi => (
                <div
                  key={roi.automation_name}
                  className="bg-gray-900 border border-gray-800 rounded-xl p-5"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-bold">{roi.automation_name}</h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      roi.roi_percent >= 200 ? 'bg-green-500/20 text-green-400' :
                      roi.roi_percent >= 100 ? 'bg-blue-500/20 text-blue-400' :
                      roi.roi_percent >= 0 ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      ROI: {roi.roi_percent.toFixed(0)}%
                    </span>
                  </div>

                  <div className="grid grid-cols-5 gap-4 mb-4">
                    <div>
                      <div className="text-2xl font-bold text-white">{roi.total_executions}</div>
                      <div className="text-xs text-gray-500">Executions</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-400">{roi.successful_executions}</div>
                      <div className="text-xs text-gray-500">Succes</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-white">{roi.efficiency_score.toFixed(0)}%</div>
                      <div className="text-xs text-gray-500">Efficacite</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-cyan-400">{roi.value_generated.toFixed(0)}EUR</div>
                      <div className="text-xs text-gray-500">Valeur Generee</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-orange-400">{roi.cost_per_execution.toFixed(2)}EUR</div>
                      <div className="text-xs text-gray-500">Cout/Execution</div>
                    </div>
                  </div>

                  <div className={`p-3 rounded-lg text-sm ${
                    roi.recommendation.includes('Excellent') ? 'bg-green-500/10 text-green-400' :
                    roi.recommendation.includes('Maintenir') ? 'bg-blue-500/10 text-blue-400' :
                    roi.recommendation.includes('Optimiser') ? 'bg-yellow-500/10 text-yellow-400' :
                    'bg-red-500/10 text-red-400'
                  }`}>
                    {roi.recommendation}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AutomationDashboard;
