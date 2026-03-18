import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
  Brain, Zap, TrendingUp, CheckCircle, Clock, AlertCircle,
  Target, Sparkles, Search, RefreshCw, ArrowUp, ArrowDown,
  Minus, Globe, FileText, Link, AlertTriangle, Play,
  BarChart3, ChevronRight, Eye, MousePointer, Award, Layers,
  CalendarClock, Activity, XCircle
} from 'lucide-react';

interface AutonomousStats {
  pending_tasks: number;
  processing_tasks: number;
  completed_today: number;
  failed_today: number;
  success_rate_7d: number;
  learned_patterns: number;
  avg_ctr_improvement: number;
}

interface OptimizationTask {
  id: string;
  task_type: string;
  target_url: string;
  status: string;
  priority: number;
  current_metrics: { impressions?: number; ctr?: number; position?: number } | null;
  created_at: string;
  completed_at: string | null;
  error_message: string | null;
}

interface LearningPattern {
  id: string;
  pattern_name: string;
  pattern_type: string;
  success_rate: number;
  samples_count: number;
  is_active: boolean;
}

interface KeywordRanking {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  page_url: string;
}

interface IndexationIssue {
  id: string;
  issue_type: string;
  url: string;
  priority: number;
  detected_at: string;
  resolved_at: string | null;
}

interface CronLog {
  id: string;
  cron_name: string;
  mode: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  tasks_processed: number;
  tasks_succeeded: number;
  urls_indexed: number;
  new_tasks_created: number;
  error_message: string | null;
}

interface DominatorStats {
  top3_keywords: number;
  top10_keywords: number;
  avg_position: number;
  last_cron_run: string | null;
  tasks_succeeded_today: number;
  urls_indexed_today: number;
  pending_tasks: number;
}

const TARGET_KEYWORDS = [
  'assurance taxi', 'assurance taxi prix', 'meilleure assurance taxi',
  'assurance taxi pas cher', 'devis assurance taxi', 'assurance taxi vtc',
  'assurance taxi obligatoire', 'rc pro taxi', 'assurance taxi paris',
  'assurance taxi lyon', 'assurance taxi marseille', 'assurance flotte taxi',
  'assurance taxi jeune conducteur', 'assurance taxi electrique',
  'comparateur assurance taxi', 'assurance taxi moto', 'assurance vtc prix',
  'assurance professionnelle taxi', 'cotisation assurance taxi', 'taxiassur',
];

const TASK_LABELS: Record<string, string> = {
  enrich_content: 'Enrichir contenu',
  add_internal_links: 'Liens internes',
  submit_indexation: 'Soumettre indexation',
  optimize_metadata: 'Optimiser métadonnées',
  improve_ctr: 'Améliorer CTR',
  fix_content_gap: 'Combler lacune contenu',
  generate_faq_schema: 'Générer FAQ schema',
};

const CRON_DEFINITIONS = [
  { name: 'gsc-seo-dominator-2h', label: 'SEO Dominator Batch', schedule: 'Toutes les 2h', icon: '⚡', color: 'teal' },
  { name: 'gsc-detect-opportunities-4h', label: 'Détection opportunités', schedule: 'Toutes les 4h', icon: '🔍', color: 'blue' },
  { name: 'gsc-autonomous-engine-6h', label: 'Moteur autonome', schedule: 'Toutes les 6h', icon: '🤖', color: 'amber' },
  { name: 'gsc-indexnow-positions-12h', label: 'IndexNow + Positions', schedule: 'Toutes les 12h', icon: '🌐', color: 'green' },
  { name: 'gsc-learning-cleanup-3am', label: 'Apprentissage IA + Nettoyage', schedule: 'Quotidien 3h00', icon: '🧠', color: 'orange' },
  { name: 'gsc-keyword-snapshot-6am', label: 'Snapshot positions', schedule: 'Quotidien 6h00', icon: '📊', color: 'cyan' },
  { name: 'gsc-weekly-deep-audit', label: 'Audit hebdomadaire', schedule: 'Dimanche 2h00', icon: '🏆', color: 'red' },
];

type TabId = 'overview' | 'keywords' | 'tasks' | 'issues' | 'patterns' | 'crons';

export default function GSCAutonomousDashboard() {
  const [tab, setTab] = useState<TabId>('overview');
  const [stats, setStats] = useState<AutonomousStats | null>(null);
  const [dominatorStats, setDominatorStats] = useState<DominatorStats | null>(null);
  const [tasks, setTasks] = useState<OptimizationTask[]>([]);
  const [patterns, setPatterns] = useState<LearningPattern[]>([]);
  const [keywords, setKeywords] = useState<KeywordRanking[]>([]);
  const [issues, setIssues] = useState<IndexationIssue[]>([]);
  const [cronLogs, setCronLogs] = useState<CronLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [executingTask, setExecutingTask] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const loadData = useCallback(async () => {
    try {
      const [statsRes, domStatsRes, tasksRes, patternsRes, kwRes, issuesRes, syncRes, cronRes] = await Promise.all([
        supabase.rpc('get_autonomous_system_stats').maybeSingle(),
        supabase.rpc('get_seo_dominator_stats').maybeSingle(),
        supabase.from('gsc_autonomous_tasks').select('*').order('priority', { ascending: false }).order('created_at', { ascending: false }).limit(30),
        supabase.from('gsc_learning_patterns').select('*').eq('is_active', true).order('success_rate', { ascending: false }),
        supabase.from('gsc_performance_data').select('query,clicks,impressions,ctr,position,page_url').order('impressions', { ascending: false }).limit(200),
        supabase.from('gsc_indexation_issues').select('*').is('resolved_at', null).order('priority', { ascending: false }).limit(30),
        supabase.from('gsc_sync_history').select('synced_at').order('synced_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('gsc_seo_cron_log').select('*').order('started_at', { ascending: false }).limit(50),
      ]);

      if (statsRes.data) setStats(statsRes.data);
      if (domStatsRes.data) setDominatorStats(domStatsRes.data as DominatorStats);
      setTasks(tasksRes.data || []);
      setPatterns(patternsRes.data || []);
      setKeywords(kwRes.data || []);
      setIssues(issuesRes.data || []);
      setCronLogs(cronRes.data || []);
      if (syncRes.data) setLastSync((syncRes.data as { synced_at: string }).synced_at);
    } catch (err) {
      console.error('GSC load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const executeAll = async () => {
    setExecuting(true);
    try {
      const { error } = await supabase.functions.invoke('gsc-seo-dominator', { body: { mode: 'auto' } });
      if (error) throw error;
      showToast('Moteur SEO Dominator lancé — batch de 5 tâches !');
      await loadData();
    } catch {
      showToast('Erreur lors du lancement');
    } finally {
      setExecuting(false);
    }
  };

  const createTasks = async () => {
    setExecuting(true);
    try {
      const { data, error } = await supabase.rpc('auto_create_optimization_tasks');
      if (error) throw error;
      showToast(`${data || 0} nouvelles tâches créées !`);
      await loadData();
    } catch {
      showToast('Erreur création tâches');
    } finally {
      setExecuting(false);
    }
  };

  const executeTask = async (taskId: string) => {
    setExecutingTask(taskId);
    try {
      const { error } = await supabase.functions.invoke('gsc-ultra-autonomous-engine', { body: { task_id: taskId } });
      if (error) throw error;
      showToast('Tâche exécutée !');
      await loadData();
    } catch {
      showToast('Erreur exécution tâche');
    } finally {
      setExecutingTask(null);
    }
  };

  const submitIndexNow = async () => {
    setExecuting(true);
    try {
      const { error } = await supabase.functions.invoke('indexnow-ping', { body: {} });
      if (error) throw error;
      showToast('Pages soumises à IndexNow !');
    } catch {
      showToast('Erreur IndexNow');
    } finally {
      setExecuting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === 'completed') return <CheckCircle size={14} className="text-green-500" />;
    if (status === 'processing') return <RefreshCw size={14} className="text-blue-500 animate-spin" />;
    if (status === 'failed') return <AlertCircle size={14} className="text-red-500" />;
    return <Clock size={14} className="text-amber-500" />;
  };

  const getPositionIcon = (pos: number) => {
    if (pos <= 3) return <Award size={14} className="text-green-600" />;
    if (pos <= 10) return <ArrowUp size={14} className="text-amber-500" />;
    if (pos <= 20) return <Minus size={14} className="text-orange-500" />;
    return <ArrowDown size={14} className="text-red-400" />;
  };

  const getPositionColor = (pos: number) => {
    if (pos <= 3) return 'text-green-700 bg-green-50 border-green-200';
    if (pos <= 10) return 'text-amber-700 bg-amber-50 border-amber-200';
    if (pos <= 20) return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const targetKeywordsWithData = TARGET_KEYWORDS.map((kw) => {
    const found = keywords.find((k) => k.query?.toLowerCase().trim() === kw.toLowerCase().trim());
    return { kw, data: found || null };
  });

  const quickWins = keywords
    .filter((k) => k.position >= 4 && k.position <= 15 && k.impressions > 50)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 15);

  const totalClicks = keywords.reduce((s, k) => s + (k.clicks || 0), 0);
  const totalImpressions = keywords.reduce((s, k) => s + (k.impressions || 0), 0);
  const avgPosition = keywords.length > 0 ? keywords.reduce((s, k) => s + (k.position || 0), 0) / keywords.length : 0;
  const avgCtr = keywords.length > 0 ? keywords.reduce((s, k) => s + (k.ctr || 0), 0) / keywords.length : 0;
  const top3Count = keywords.filter((k) => k.position <= 3).length;
  const pendingTasks = tasks.filter((t) => t.status === 'pending').length;

  const activeRunningCrons = cronLogs.filter(
    (c) => c.status === 'running' && new Date(c.started_at) > new Date(Date.now() - 10 * 60 * 1000)
  ).length;

  const tabs: { id: TabId; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: <BarChart3 size={15} /> },
    { id: 'keywords', label: 'Mots-clés', icon: <Search size={15} />, badge: dominatorStats?.top3_keywords ?? top3Count },
    { id: 'tasks', label: 'Tâches IA', icon: <Zap size={15} />, badge: pendingTasks },
    { id: 'issues', label: 'Indexation', icon: <AlertTriangle size={15} />, badge: issues.length },
    { id: 'patterns', label: 'Apprentissage', icon: <Brain size={15} /> },
    { id: 'crons', label: 'Crons IA', icon: <CalendarClock size={15} />, badge: activeRunningCrons },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto" />
          <p className="mt-4 text-gray-500 text-sm">Chargement du moteur SEO...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-6">
      {toastMsg && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white px-4 py-3 rounded-lg shadow-xl text-sm flex items-center gap-2 animate-fade-in">
          <CheckCircle size={16} className="text-green-400" />
          {toastMsg}
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="bg-teal-600 p-2 rounded-lg">
                <Target size={22} className="text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">SEO #1 — Assurance Taxi</h1>
            </div>
            <p className="text-gray-500 text-sm ml-12">
              Moteur IA autonome — Google Search Console
              {lastSync && (
                <span className="ml-2 text-xs text-gray-400">
                  Sync: {new Date(lastSync).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={createTasks} disabled={executing} className="px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2 text-sm font-medium shadow-sm">
              <Layers size={15} />
              Détecter tâches
            </button>
            <button onClick={submitIndexNow} disabled={executing} className="px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2 text-sm font-medium shadow-sm">
              <Globe size={15} />
              IndexNow
            </button>
            <button onClick={executeAll} disabled={executing} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2 text-sm font-semibold shadow-sm">
              <Zap size={15} />
              {executing ? 'En cours...' : 'Tout optimiser'}
            </button>
          </div>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {[
            { label: 'Clics totaux', value: totalClicks.toLocaleString('fr'), icon: <MousePointer size={18} />, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Impressions', value: totalImpressions.toLocaleString('fr'), icon: <Eye size={18} />, color: 'text-teal-600', bg: 'bg-teal-50' },
            { label: 'Position moy.', value: avgPosition > 0 ? avgPosition.toFixed(1) : 'N/A', icon: <TrendingUp size={18} />, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'CTR moyen', value: avgCtr > 0 ? `${(avgCtr * 100).toFixed(1)}%` : 'N/A', icon: <Target size={18} />, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Top 3', value: (dominatorStats?.top3_keywords ?? top3Count).toString(), icon: <Award size={18} />, color: 'text-emerald-700', bg: 'bg-emerald-50' },
            { label: 'Tâches IA', value: (dominatorStats?.pending_tasks ?? stats?.pending_tasks ?? 0).toString(), icon: <Brain size={18} />, color: 'text-gray-700', bg: 'bg-gray-100' },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-2">
              <div className={`${kpi.bg} ${kpi.color} p-2 rounded-lg w-fit`}>{kpi.icon}</div>
              <p className="text-xs text-gray-500">{kpi.label}</p>
              <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="flex overflow-x-auto border-b border-gray-200">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  tab === t.id
                    ? 'border-teal-600 text-teal-700 bg-teal-50/50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {t.icon}
                {t.label}
                {t.badge !== undefined && t.badge > 0 && (
                  <span className="bg-teal-100 text-teal-700 text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                    {t.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="p-5">
            {tab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <Sparkles size={16} className="text-amber-500" />
                    Victoires rapides — Pages en positions 4–15
                    <span className="text-xs font-normal text-gray-400 ml-1">(à pousser en top 3)</span>
                  </h2>
                  {quickWins.length === 0 ? (
                    <p className="text-gray-400 text-sm py-4 text-center">Pas encore de données GSC synchronisées</p>
                  ) : (
                    <div className="space-y-2">
                      {quickWins.map((kw, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-teal-200 transition-colors">
                          <div className={`flex items-center gap-1 px-2 py-1 rounded border text-xs font-bold min-w-[52px] justify-center ${getPositionColor(kw.position)}`}>
                            {getPositionIcon(kw.position)}
                            #{kw.position.toFixed(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{kw.query}</p>
                            <p className="text-xs text-gray-400 truncate">{kw.page_url}</p>
                          </div>
                          <div className="hidden sm:flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1"><Eye size={11} />{kw.impressions.toLocaleString('fr')}</span>
                            <span className="flex items-center gap-1"><MousePointer size={11} />{kw.clicks}</span>
                            <span>{(kw.ctr * 100).toFixed(1)}% CTR</span>
                          </div>
                          <ChevronRight size={14} className="text-gray-300" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-100 pt-5">
                  <h2 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <Brain size={16} className="text-teal-600" />
                    Moteur autonome — Comment ça fonctionne
                  </h2>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    {[
                      { step: '1', title: 'Détection', desc: 'Analyse GSC toutes les 6h, identifie pages sous-performantes', icon: <Search size={18} />, color: 'bg-blue-50 border-blue-200 text-blue-700' },
                      { step: '2', title: 'Stratégie IA', desc: 'Génère du contenu enrichi, optimise balises, densifie les mots-clés cibles', icon: <Brain size={18} />, color: 'bg-teal-50 border-teal-200 text-teal-700' },
                      { step: '3', title: 'Liens internes', desc: 'Tisse des maillages inter-pages pour renforcer l\'autorité thématique', icon: <Link size={18} />, color: 'bg-amber-50 border-amber-200 text-amber-700' },
                      { step: '4', title: 'Soumission', desc: 'Envoie IndexNow + demande de réindexation Google Search Console', icon: <Globe size={18} />, color: 'bg-green-50 border-green-200 text-green-700' },
                      { step: '5', title: 'Auto-apprentissage', desc: 'Mémorise les succès, adapte les stratégies en temps réel', icon: <Sparkles size={18} />, color: 'bg-orange-50 border-orange-200 text-orange-700' },
                    ].map((s) => (
                      <div key={s.step} className={`border rounded-xl p-4 ${s.color}`}>
                        <div className="flex items-center gap-2 mb-2">
                          {s.icon}
                          <span className="font-bold text-sm">{s.title}</span>
                        </div>
                        <p className="text-xs opacity-80 leading-relaxed">{s.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {tab === 'keywords' && (
              <div>
                <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Search size={16} className="text-teal-600" />
                  Positionnement — 20 mots-clés cibles assurance taxi
                </h2>
                <div className="grid sm:grid-cols-2 gap-2">
                  {targetKeywordsWithData.map(({ kw, data }) => (
                    <div key={kw} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50 hover:bg-white transition-colors">
                      <div className="flex items-center gap-2 min-w-0">
                        {data ? getPositionIcon(data.position) : <Minus size={14} className="text-gray-300" />}
                        <span className="text-sm text-gray-800 truncate">{kw}</span>
                      </div>
                      <div className="flex items-center gap-3 ml-2 shrink-0">
                        {data ? (
                          <>
                            <span className="text-xs text-gray-400 hidden sm:block">{data.impressions.toLocaleString('fr')} imp.</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded border ${getPositionColor(data.position)}`}>
                              #{data.position.toFixed(0)}
                            </span>
                          </>
                        ) : (
                          <span className="text-xs text-gray-300 italic">Non classé</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {keywords.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Top 20 requêtes par impressions</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                            <th className="pb-2 font-medium">Requête</th>
                            <th className="pb-2 font-medium text-right">Pos.</th>
                            <th className="pb-2 font-medium text-right">CTR</th>
                            <th className="pb-2 font-medium text-right">Clics</th>
                            <th className="pb-2 font-medium text-right">Impr.</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {keywords.slice(0, 20).map((k, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="py-2 pr-4 max-w-[200px] truncate text-gray-800">{k.query}</td>
                              <td className="py-2 text-right">
                                <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${getPositionColor(k.position)}`}>
                                  #{k.position.toFixed(0)}
                                </span>
                              </td>
                              <td className="py-2 text-right text-gray-600">{(k.ctr * 100).toFixed(1)}%</td>
                              <td className="py-2 text-right text-gray-800 font-medium">{k.clicks}</td>
                              <td className="py-2 text-right text-gray-500">{k.impressions.toLocaleString('fr')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === 'tasks' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                    <Zap size={16} className="text-amber-500" />
                    Tâches d'optimisation IA
                  </h2>
                  <div className="flex gap-2 text-xs text-gray-500">
                    <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded">{tasks.filter(t => t.status === 'pending').length} en attente</span>
                    <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded">{tasks.filter(t => t.status === 'completed').length} terminées</span>
                  </div>
                </div>
                {tasks.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Layers size={40} className="mx-auto mb-3 opacity-30" />
                    <p>Aucune tâche — cliquez "Détecter tâches" pour analyser</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {tasks.map((task) => (
                      <div key={task.id} className="border border-gray-200 rounded-xl p-4 hover:border-teal-200 transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="mt-0.5">{getStatusIcon(task.status)}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <span className="text-sm font-medium text-gray-900">
                                  {TASK_LABELS[task.task_type] || task.task_type}
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                                  task.priority >= 8 ? 'bg-red-50 text-red-700 border-red-200' :
                                  task.priority >= 5 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                  'bg-gray-50 text-gray-600 border-gray-200'
                                }`}>
                                  P{task.priority}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 truncate">{task.target_url}</p>
                              {task.current_metrics && (
                                <div className="flex gap-4 mt-2 text-xs text-gray-400">
                                  {task.current_metrics.position && <span>Pos. #{task.current_metrics.position.toFixed(1)}</span>}
                                  {task.current_metrics.impressions && <span>{task.current_metrics.impressions.toFixed(0)} imp.</span>}
                                  {task.current_metrics.ctr && <span>{(task.current_metrics.ctr * 100).toFixed(1)}% CTR</span>}
                                </div>
                              )}
                              {task.error_message && <p className="text-xs text-red-500 mt-1">{task.error_message}</p>}
                            </div>
                          </div>
                          {task.status === 'pending' && (
                            <button
                              onClick={() => executeTask(task.id)}
                              disabled={executingTask === task.id}
                              className="shrink-0 flex items-center gap-1 px-3 py-1.5 bg-teal-600 text-white text-xs rounded-lg hover:bg-teal-700 disabled:opacity-50 font-medium"
                            >
                              <Play size={11} />
                              {executingTask === task.id ? '...' : 'Exécuter'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === 'issues' && (
              <div>
                <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <AlertTriangle size={16} className="text-red-500" />
                  Problèmes d'indexation non résolus
                </h2>
                {issues.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <CheckCircle size={40} className="mx-auto mb-3 text-green-400 opacity-60" />
                    <p className="text-green-600 font-medium">Aucun problème d'indexation détecté</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {issues.map((issue) => (
                      <div key={issue.id} className="flex items-start gap-3 p-4 border border-red-100 bg-red-50/50 rounded-xl">
                        <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-gray-900">{issue.issue_type}</span>
                            {issue.priority >= 8 && (
                              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-medium">Urgent</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 truncate">{issue.url}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            Détecté {new Date(issue.detected_at).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === 'patterns' && (
              <div>
                <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Brain size={16} className="text-teal-600" />
                  Patterns appris par l'IA — Base de connaissance SEO
                </h2>
                {patterns.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Brain size={40} className="mx-auto mb-3 opacity-30" />
                    <p>L'IA apprendra des patterns au fil des optimisations</p>
                    <p className="text-xs mt-1">Lancez "Tout optimiser" pour commencer l'apprentissage</p>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {patterns.map((p) => (
                      <div key={p.id} className="border border-gray-200 rounded-xl p-4 hover:border-teal-200 transition-colors">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-gray-900 text-sm">{p.pattern_name}</h3>
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded mt-1 inline-block">{p.pattern_type}</span>
                          </div>
                          <div className={`text-right ${p.success_rate >= 70 ? 'text-green-600' : p.success_rate >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                            <p className="text-2xl font-bold">{p.success_rate.toFixed(0)}%</p>
                            <p className="text-xs">succès</p>
                          </div>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${p.success_rate >= 70 ? 'bg-green-500' : p.success_rate >= 50 ? 'bg-amber-500' : 'bg-red-400'}`}
                            style={{ width: `${p.success_rate}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-400 mt-2">{p.samples_count} échantillons analysés</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === 'crons' && (
              <div className="space-y-6">
                {/* Planning des 7 crons */}
                <div>
                  <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <CalendarClock size={16} className="text-teal-600" />
                    Planning automatique — 7 crons IA actifs
                  </h2>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-2">
                    {CRON_DEFINITIONS.map((cron) => {
                      const lastLog = cronLogs.find((l) => l.cron_name === cron.name);
                      const isRunning = lastLog?.status === 'running';
                      const isOk = lastLog?.status === 'completed';
                      const isFailed = lastLog?.status === 'failed';
                      return (
                        <div
                          key={cron.name}
                          className={`border rounded-xl p-4 transition-colors ${
                            isRunning ? 'border-teal-300 bg-teal-50/50' :
                            isFailed ? 'border-red-200 bg-red-50/30' :
                            'border-gray-200 bg-white hover:border-teal-200'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{cron.icon}</span>
                              <div>
                                <p className="text-sm font-semibold text-gray-900">{cron.label}</p>
                                <p className="text-xs text-gray-400">{cron.schedule}</p>
                              </div>
                            </div>
                            <div>
                              {isRunning && <RefreshCw size={14} className="text-teal-500 animate-spin" />}
                              {isOk && <CheckCircle size={14} className="text-green-500" />}
                              {isFailed && <XCircle size={14} className="text-red-500" />}
                              {!lastLog && <Clock size={14} className="text-gray-300" />}
                            </div>
                          </div>
                          {lastLog && (
                            <div className="mt-2 pt-2 border-t border-gray-100 space-y-1">
                              <p className="text-xs text-gray-500">
                                Dernier lancement: {new Date(lastLog.started_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </p>
                              {lastLog.duration_ms && (
                                <p className="text-xs text-gray-400">Durée: {(lastLog.duration_ms / 1000).toFixed(1)}s</p>
                              )}
                              <div className="flex gap-3 text-xs">
                                {lastLog.tasks_succeeded > 0 && (
                                  <span className="text-green-600 font-medium">{lastLog.tasks_succeeded} tâches OK</span>
                                )}
                                {lastLog.urls_indexed > 0 && (
                                  <span className="text-blue-600">{lastLog.urls_indexed} URLs indexées</span>
                                )}
                                {lastLog.new_tasks_created > 0 && (
                                  <span className="text-amber-600">+{lastLog.new_tasks_created} tâches</span>
                                )}
                              </div>
                              {lastLog.error_message && (
                                <p className="text-xs text-red-500 truncate">{lastLog.error_message}</p>
                              )}
                            </div>
                          )}
                          {!lastLog && (
                            <p className="text-xs text-gray-300 mt-2">Pas encore exécuté</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Stats aujourd'hui */}
                {dominatorStats && (
                  <div className="border border-teal-200 bg-teal-50/40 rounded-xl p-5">
                    <h3 className="text-sm font-semibold text-teal-900 mb-4 flex items-center gap-2">
                      <Activity size={15} className="text-teal-600" />
                      Performance aujourd'hui
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {[
                        { label: 'Mots-clés Top 3', value: dominatorStats.top3_keywords, color: 'text-green-700' },
                        { label: 'Mots-clés Top 10', value: dominatorStats.top10_keywords, color: 'text-teal-700' },
                        { label: 'Position moyenne', value: dominatorStats.avg_position ? `#${dominatorStats.avg_position}` : 'N/A', color: 'text-amber-700' },
                        { label: 'URLs indexées', value: dominatorStats.urls_indexed_today, color: 'text-blue-700' },
                      ].map((s) => (
                        <div key={s.label} className="text-center">
                          <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                          <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Historique des exécutions */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Activity size={14} className="text-gray-400" />
                    Historique des 50 dernières exécutions
                  </h3>
                  {cronLogs.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <CalendarClock size={36} className="mx-auto mb-2 opacity-30" />
                      <p>Aucune exécution enregistrée</p>
                      <p className="text-xs mt-1">Les crons démarreront automatiquement selon le planning</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-left text-gray-500 border-b border-gray-100">
                            <th className="pb-2 font-medium">Cron</th>
                            <th className="pb-2 font-medium">Statut</th>
                            <th className="pb-2 font-medium">Démarré</th>
                            <th className="pb-2 font-medium text-right">Durée</th>
                            <th className="pb-2 font-medium text-right">Tâches</th>
                            <th className="pb-2 font-medium text-right">URLs</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {cronLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-gray-50">
                              <td className="py-2 pr-4">
                                <span className="font-medium text-gray-800">
                                  {CRON_DEFINITIONS.find((c) => c.name === log.cron_name)?.label || log.cron_name}
                                </span>
                              </td>
                              <td className="py-2 pr-4">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium text-xs ${
                                  log.status === 'completed' ? 'bg-green-50 text-green-700' :
                                  log.status === 'running' ? 'bg-blue-50 text-blue-700' :
                                  log.status === 'failed' ? 'bg-red-50 text-red-700' :
                                  'bg-gray-50 text-gray-600'
                                }`}>
                                  {log.status === 'completed' && <CheckCircle size={10} />}
                                  {log.status === 'running' && <RefreshCw size={10} className="animate-spin" />}
                                  {log.status === 'failed' && <XCircle size={10} />}
                                  {log.status}
                                </span>
                              </td>
                              <td className="py-2 pr-4 text-gray-500">
                                {new Date(log.started_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="py-2 pr-4 text-right text-gray-500">
                                {log.duration_ms ? `${(log.duration_ms / 1000).toFixed(1)}s` : '—'}
                              </td>
                              <td className="py-2 pr-4 text-right">
                                {log.tasks_succeeded > 0 ? (
                                  <span className="text-green-600 font-medium">{log.tasks_succeeded}/{log.tasks_processed}</span>
                                ) : '—'}
                              </td>
                              <td className="py-2 text-right text-blue-600">
                                {log.urls_indexed > 0 ? log.urls_indexed : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {stats?.avg_ctr_improvement && stats.avg_ctr_improvement > 0 && (
          <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-4">
            <div className="bg-emerald-500 text-white p-2.5 rounded-lg">
              <TrendingUp size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Amélioration moyenne du CTR (7 derniers jours)</p>
              <p className="text-2xl font-bold text-emerald-600">+{stats.avg_ctr_improvement.toFixed(1)}%</p>
            </div>
            <div className="ml-auto text-sm text-emerald-700 font-medium flex items-center gap-1">
              <FileText size={14} />
              {stats.completed_today} pages optimisées aujourd'hui
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
