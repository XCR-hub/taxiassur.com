import React, { useEffect, useState, useCallback } from 'react';
import {
  Brain, Bot, Sparkles, TrendingUp, CheckCircle, XCircle,
  Clock, Activity, Target, Mail, Briefcase, Search as SearchIcon,
  AlertTriangle, Gift, Smile, MessageSquare,
  Play, RefreshCw, Filter, Zap, Shield, BarChart2, Users,
  CheckSquare, X, Wand2, Timer, Cpu
} from 'lucide-react';
import { AIDecision, AI_AGENTS, AIAgent, AICouncilMeeting, AI_AGENT_MODELS, AI_PROVIDERS } from '@/lib/crm-ai-governance';
import { AIDecisionCard } from '@/components/crm/AIDecisionCard';
import AIGovernanceAgents from './AIGovernanceAgents';
import AIGovernanceSettings from './AIGovernanceSettings';
import { nativeAdminCall } from '@/lib/native-admin-data';
import { toast } from '@/lib/toast';

// ─── Constants ──────────────────────────────────────────────────────────────

const AGENT_ICONS: Record<AIAgent, React.ReactNode> = {
  lead_scorer: <Target size={14} className="text-blue-400" />,
  email_composer: <Mail size={14} className="text-sky-400" />,
  negotiation_assistant: <Briefcase size={14} className="text-amber-400" />,
  risk_analyzer: <SearchIcon size={14} className="text-orange-400" />,
  churn_predictor: <AlertTriangle size={14} className="text-red-400" />,
  cross_sell_recommender: <Gift size={14} className="text-green-400" />,
  sentiment_analyzer: <Smile size={14} className="text-teal-400" />,
  response_generator: <MessageSquare size={14} className="text-cyan-400" />,
};

const AGENT_ACTIVE_COLORS: Record<AIAgent, string> = {
  lead_scorer: 'border-blue-400 bg-blue-500/15 text-blue-300',
  email_composer: 'border-sky-400 bg-sky-500/15 text-sky-300',
  negotiation_assistant: 'border-amber-400 bg-amber-500/15 text-amber-300',
  risk_analyzer: 'border-orange-400 bg-orange-500/15 text-orange-300',
  churn_predictor: 'border-red-400 bg-red-500/15 text-red-300',
  cross_sell_recommender: 'border-green-400 bg-green-500/15 text-green-300',
  sentiment_analyzer: 'border-teal-400 bg-teal-500/15 text-teal-300',
  response_generator: 'border-cyan-400 bg-cyan-500/15 text-cyan-300',
};

const COUNCIL_ACTIONS = [
  {
    icon: <TrendingUp size={18} />,
    title: 'Qualification Lead',
    desc: "Analyse complète d'un lead par tous les agents pour maximiser le taux de conversion.",
    color: 'border-blue-500/30 hover:border-blue-500/60',
    iconBg: 'bg-blue-500/15 text-blue-400',
    type: 'qualification' as const,
  },
  {
    icon: <Shield size={18} />,
    title: 'Analyse de Risque',
    desc: "Évaluation collaborative des risques avant souscription.",
    color: 'border-orange-500/30 hover:border-orange-500/60',
    iconBg: 'bg-orange-500/15 text-orange-400',
    type: 'risk_assessment' as const,
  },
  {
    icon: <Users size={18} />,
    title: 'Rétention Client',
    desc: "Stratégies personnalisées pour retenir un client à risque de churn.",
    color: 'border-green-500/30 hover:border-green-500/60',
    iconBg: 'bg-green-500/15 text-green-400',
    type: 'retention' as const,
  },
  {
    icon: <BarChart2 size={18} />,
    title: 'Cross-Sell Strategy',
    desc: "Identifier les meilleures opportunités de vente additionnelle.",
    color: 'border-amber-500/30 hover:border-amber-500/60',
    iconBg: 'bg-amber-500/15 text-amber-400',
    type: 'cross_sell' as const,
  },
];

type ActiveTab = 'decisions' | 'agents' | 'council' | 'settings';

const TABS: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
  { id: 'decisions', label: 'Décisions IA', icon: <Bot size={15} /> },
  { id: 'agents', label: 'Agents', icon: <Activity size={15} /> },
  { id: 'council', label: 'IA Council', icon: <Brain size={15} /> },
  { id: 'settings', label: 'Gouvernance', icon: <Shield size={15} /> },
];

const normalizeScore = (s: number) => (s > 1 ? s / 100 : s);

interface RecentLead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
}

// ─── Main Component ──────────────────────────────────────────────────────────

const CRMAIGovernance: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [allDecisions, setAllDecisions] = useState<AIDecision[]>([]);
  const [statusFilter, setStatusFilter] = useState<AIDecision['status'] | 'all'>('all');
  const [selectedAgent, setSelectedAgent] = useState<AIAgent | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<ActiveTab>('decisions');
  const [selectedDecisions, setSelectedDecisions] = useState<Set<string>>(new Set());

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [generateResult, setGenerateResult] = useState<{ generated: number; leads: number; providers_used?: Record<string, number> } | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Approve action feedback
  const [approveResult, setApproveResult] = useState<{ id: string; message: string } | null>(null);

  // Council
  const [recentLeads, setRecentLeads] = useState<RecentLead[]>([]);
  const [councilLeadId, setCouncilLeadId] = useState('');
  const [councilType, setCouncilType] = useState<AICouncilMeeting['meeting_type']>('qualification');
  const [councilRunning, setCouncilRunning] = useState(false);
  const [councilResult, setCouncilResult] = useState<string | null>(null);

  // Auto-mode status
  const [autoStatus, setAutoStatus] = useState<{
    crons_active: boolean;
    last_generate: string | null;
    last_approve: string | null;
    next_generate_in_minutes: number;
  } | null>(null);

  useEffect(() => {
    if (activeTab === 'council') loadRecentLeads();
  }, [activeTab]);

  const loadAutoStatus = useCallback(async () => {
    try {
      const data = await nativeAdminCall<{ status?: typeof autoStatus }>('/v1/admin/ai-governance');
      if (data.status) setAutoStatus(data.status);
    } catch (e) {
      console.warn('loadAutoStatus:', e);
    }
  }, []);

  const loadAllDecisions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await nativeAdminCall<{ decisions?: AIDecision[] }>('/v1/admin/ai-governance');
      setAllDecisions(data.decisions || []);
    } catch (e) {
      console.error(e);
      toast.error('Impossible de charger les décisions IA');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllDecisions();
    loadAutoStatus();
    const interval = setInterval(loadAutoStatus, 60_000);
    return () => clearInterval(interval);
  }, [loadAllDecisions, loadAutoStatus]);

  const loadRecentLeads = async () => {
    try {
      const data = await nativeAdminCall<{ recent_leads?: RecentLead[] }>('/v1/admin/ai-governance');
      setRecentLeads(data.recent_leads || []);
    } catch { toast.error('Impossible de charger les leads récents'); }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAllDecisions();
    setRefreshing(false);
  };

  const handleGenerateDecisions = async () => {
    setGenerating(true);
    setGenerateResult(null);
    setGenerateError(null);
    try {
      const data = await nativeAdminCall<{ generated: number; leads_analyzed: number; providers_used?: Record<string, number> }>('/v1/admin/ai-governance/generate', {
        method: 'POST',
        body: JSON.stringify({ limit: 5 }),
      });
      setGenerateResult({ generated: data.generated, leads: data.leads_analyzed, providers_used: data.providers_used });
      await loadAllDecisions();
      setTimeout(() => setGenerateResult(null), 6000);
    } catch (e: unknown) {
      setGenerateError(e instanceof Error ? e.message : String(e));
      setTimeout(() => setGenerateError(null), 5000);
    } finally {
      setGenerating(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await nativeAdminCall(`/v1/admin/ai-decisions/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ status: 'approved' }) });
      setApproveResult({ id, message: 'Décision approuvée et action appliquée.' });
      setTimeout(() => setApproveResult(null), 4000);
    } catch (e) {
      console.error(e);
    }
    await loadAllDecisions();
    setSelectedDecisions(prev => { const n = new Set(prev); n.delete(id); return n; });
  };

  const handleReject = async (id: string) => {
    await nativeAdminCall(`/v1/admin/ai-decisions/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ status: 'rejected' }) });
    await loadAllDecisions();
    setSelectedDecisions(prev => { const n = new Set(prev); n.delete(id); return n; });
  };

  const handleBulkApprove = async () => {
    for (const id of selectedDecisions) {
      await nativeAdminCall(`/v1/admin/ai-decisions/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ status: 'approved' }) });
    }
    setSelectedDecisions(new Set());
    await loadAllDecisions();
  };

  const handleBulkReject = async () => {
    for (const id of selectedDecisions) {
      await nativeAdminCall(`/v1/admin/ai-decisions/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ status: 'rejected' }) });
    }
    setSelectedDecisions(new Set());
    await loadAllDecisions();
  };

  const handleConveneCouncil = async () => {
    if (!councilLeadId.trim()) return;
    setCouncilRunning(true);
    setCouncilResult(null);
    try {
      await nativeAdminCall('/v1/admin/ai-governance/generate', {
        method: 'POST',
        body: JSON.stringify({ lead_id: councilLeadId, limit: 1 }),
      });
      setCouncilResult('success');
      await loadAllDecisions();
    } catch {
      setCouncilResult('error');
    } finally {
      setCouncilRunning(false);
    }
  };

  // ─── Computed values ───────────────────────────────────────────────────────

  const stats = {
    pending: allDecisions.filter(d => d.status === 'pending').length,
    approved: allDecisions.filter(d => d.status === 'approved').length,
    rejected: allDecisions.filter(d => d.status === 'rejected').length,
    auto_applied: allDecisions.filter(d => d.status === 'auto_applied').length,
    total: allDecisions.length,
  };

  const avgConfidence = allDecisions.length
    ? Math.round(allDecisions.reduce((s, d) => s + normalizeScore(d.confidence_score), 0) / allDecisions.length * 100)
    : 0;

  const decisionsByAgent = (Object.keys(AI_AGENTS) as AIAgent[]).reduce((acc, agent) => {
    acc[agent] = allDecisions.filter(d => d.agent === agent).length;
    return acc;
  }, {} as Record<AIAgent, number>);

  const filteredDecisions = allDecisions
    .filter(d => statusFilter === 'all' || d.status === statusFilter)
    .filter(d => selectedAgent === 'all' || d.agent === selectedAgent)
    .filter(d => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return String(d.title || '').toLowerCase().includes(q) || String(d.description || '').toLowerCase().includes(q);
    });

  const pendingFiltered = filteredDecisions.filter(d => d.status === 'pending');

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* ── Header ── */}
      <div className="border-b border-gray-800 bg-gray-900 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-5">

          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
                <Brain size={22} className="text-blue-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white leading-tight">IA Governance</h1>
                <p className="text-gray-500 text-xs mt-0.5">Système de décisions collaboratives multi-agents</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {autoStatus?.crons_active ? (
                <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/25 rounded-full px-3 py-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <Cpu size={11} className="text-emerald-400" />
                  <span className="text-emerald-400 text-xs font-semibold">Mode Auto: ON</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 bg-gray-500/10 border border-gray-500/25 rounded-full px-3 py-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                  <span className="text-gray-400 text-xs font-medium">Mode manuel sécurisé</span>
                </div>
              )}

              {autoStatus?.crons_active && autoStatus.next_generate_in_minutes !== undefined && (
                <div className="flex items-center gap-1.5 bg-blue-500/8 border border-blue-500/20 rounded-full px-3 py-1.5">
                  <Timer size={11} className="text-blue-400" />
                  <span className="text-blue-400 text-xs">
                    {autoStatus.next_generate_in_minutes < 1
                      ? 'Analyse imminente'
                      : `Prochain run: ${Math.round(autoStatus.next_generate_in_minutes)}min`}
                  </span>
                </div>
              )}

              <button
                onClick={handleGenerateDecisions}
                disabled={generating}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
              >
                {generating
                  ? <RefreshCw size={13} className="animate-spin" />
                  : <Wand2 size={13} />
                }
                {generating ? 'Analyse en cours...' : 'Forcer analyse'}
              </button>

              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-3.5 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm text-gray-400 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
                Actualiser
              </button>
            </div>
          </div>

          {/* Generation feedback banners */}
          {generateResult && (
            <div className="flex items-center gap-2 flex-wrap bg-green-500/10 border border-green-500/25 rounded-xl px-4 py-2.5 mb-3 text-sm text-green-400">
              <Sparkles size={14} />
              <span><strong>{generateResult.generated} décisions</strong> générées pour {generateResult.leads} leads</span>
              {generateResult.providers_used && Object.keys(generateResult.providers_used).length > 0 && (
                <span className="flex items-center gap-1.5 ml-1">
                  <span className="text-green-500/60">via</span>
                  {Object.entries(generateResult.providers_used).map(([provider, count]) => {
                    const info = AI_PROVIDERS[provider as keyof typeof AI_PROVIDERS];
                    return info ? (
                      <span key={provider} className="inline-flex items-center gap-0.5 text-xs bg-gray-800/80 border border-gray-700 rounded-full px-2 py-0.5 text-gray-300">
                        <span className="font-bold text-[10px]">{info.icon}</span>
                        {info.name} ({count})
                      </span>
                    ) : null;
                  })}
                </span>
              )}
            </div>
          )}
          {generateError && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-2.5 mb-3 text-sm text-red-400">
              <AlertTriangle size={14} />
              Erreur : {generateError}
            </div>
          )}
          {approveResult && (
            <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/25 rounded-xl px-4 py-2.5 mb-3 text-sm text-blue-400">
              <CheckCircle size={14} />
              {approveResult.message}
            </div>
          )}

          {/* Automation schedule info */}
          {autoStatus?.crons_active && (
            <div className="flex items-center gap-4 bg-gray-800/60 border border-gray-700/60 rounded-xl px-4 py-2.5 mb-3 text-xs text-gray-400">
              <div className="flex items-center gap-1.5">
                <Zap size={11} className="text-emerald-400" />
                <span className="text-emerald-400 font-medium">Automatisation active</span>
              </div>
              <span className="text-gray-600">·</span>
              <div className="flex items-center gap-1.5">
                <Clock size={11} />
                <span>Génération: <strong className="text-gray-300">toutes les 2h</strong></span>
              </div>
              <span className="text-gray-600">·</span>
              <div className="flex items-center gap-1.5">
                <CheckCircle size={11} />
                <span>Auto-approbation <strong className="text-gray-300">&gt;85% confiance</strong>: toutes les heures</span>
              </div>
              {autoStatus.last_generate && (
                <>
                  <span className="text-gray-600">·</span>
                  <div className="flex items-center gap-1.5">
                    <Activity size={11} />
                    <span>Dernier run: <strong className="text-gray-300">{new Date(autoStatus.last_generate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</strong></span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Stats strip */}
          <div className="grid grid-cols-5 gap-3 mb-4">
            {[
              { label: 'En attente', value: stats.pending, color: 'text-amber-400', bg: 'bg-amber-500/8 border-amber-500/20', badge: stats.pending > 0 },
              { label: 'Approuvées', value: stats.approved, color: 'text-green-400', bg: 'bg-green-500/8 border-green-500/20', badge: false },
              { label: 'Rejetées', value: stats.rejected, color: 'text-red-400', bg: 'bg-red-500/8 border-red-500/20', badge: false },
              { label: 'Auto-appliquées', value: stats.auto_applied, color: 'text-blue-400', bg: 'bg-blue-500/8 border-blue-500/20', badge: false },
              { label: 'Confiance moy.', value: `${avgConfidence}%`, color: 'text-teal-400', bg: 'bg-teal-500/8 border-teal-500/20', badge: false },
            ].map((s, i) => (
              <div key={i} className={`relative border rounded-xl px-4 py-3 ${s.bg}`}>
                {s.badge && (s.value as number) > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {s.value}
                  </span>
                )}
                <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-[11px] text-gray-600 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Tab bar */}
          <div className="flex gap-1 border-b border-gray-800">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-700'
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.id === 'decisions' && stats.pending > 0 && (
                  <span className="bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                    {stats.pending}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-7xl mx-auto px-6 py-6">

        {/* ──── TAB: DECISIONS ──── */}
        {activeTab === 'decisions' && (
          <div className="flex gap-6">

            {/* Agent sidebar */}
            <aside className="w-56 flex-shrink-0">
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-3 sticky top-40">
                <p className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider mb-2 px-1">Filtrer par agent</p>
                <div className="space-y-0.5">
                  <button
                    onClick={() => setSelectedAgent('all')}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-sm transition-all ${
                      selectedAgent === 'all'
                        ? 'bg-blue-500/15 border border-blue-500/30 text-blue-300'
                        : 'text-gray-500 hover:bg-gray-800 hover:text-gray-200 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Activity size={13} className="text-gray-500" />
                      <span>Tous</span>
                    </div>
                    <span className="text-xs bg-gray-800 px-2 py-0.5 rounded-full text-gray-400">{stats.total}</span>
                  </button>

                  {(Object.keys(AI_AGENTS) as AIAgent[]).map(agent => {
                    const count = decisionsByAgent[agent] || 0;
                    const isActive = selectedAgent === agent;
                    return (
                      <button
                        key={agent}
                        onClick={() => setSelectedAgent(agent)}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-sm transition-all border ${
                          isActive ? AGENT_ACTIVE_COLORS[agent] + ' border-current' : 'border-transparent text-gray-500 hover:bg-gray-800 hover:text-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {AGENT_ICONS[agent]}
                          <span className="truncate text-xs">{AI_AGENTS[agent].name.split(' ')[0]}</span>
                        </div>
                        {count > 0 && (
                          <span className="text-xs bg-gray-800 px-1.5 py-0.5 rounded-full text-gray-400 flex-shrink-0">{count}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </aside>

            {/* Main decisions pane */}
            <div className="flex-1 min-w-0">

              {/* Toolbar */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 relative">
                  <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                  <input
                    type="text"
                    placeholder="Rechercher une décision..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-9 pr-4 py-2 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-blue-500/50"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400">
                      <X size={13} />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1">
                  {([
                    { v: 'all', l: 'Toutes' },
                    { v: 'pending', l: 'En attente' },
                    { v: 'approved', l: 'Approuvées' },
                    { v: 'rejected', l: 'Rejetées' },
                    { v: 'auto_applied', l: 'Auto' },
                  ] as const).map(({ v, l }) => (
                    <button
                      key={v}
                      onClick={() => setStatusFilter(v)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                        statusFilter === v
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
                      }`}
                    >
                      {l}
                      {v === 'pending' && stats.pending > 0 && statusFilter !== 'pending' && (
                        <span className="ml-1.5 bg-amber-500 text-white text-[9px] px-1 py-0.5 rounded-full">{stats.pending}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bulk action bar */}
              {selectedDecisions.size > 0 && (
                <div className="flex items-center justify-between bg-blue-500/10 border border-blue-500/25 rounded-xl px-4 py-2.5 mb-4">
                  <span className="text-sm text-blue-300 font-medium">
                    {selectedDecisions.size} décision{selectedDecisions.size > 1 ? 's' : ''} sélectionnée{selectedDecisions.size > 1 ? 's' : ''}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleBulkReject}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/25 text-red-400 rounded-lg text-xs font-medium hover:bg-red-500/20 transition-colors"
                    >
                      <XCircle size={13} /> Rejeter tout
                    </button>
                    <button
                      onClick={handleBulkApprove}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-500 transition-colors"
                    >
                      <CheckCircle size={13} /> Approuver tout
                    </button>
                    <button
                      onClick={() => setSelectedDecisions(new Set())}
                      className="text-gray-600 hover:text-gray-400 ml-1"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* Select all pending shortcut */}
              {pendingFiltered.length > 1 && selectedDecisions.size === 0 && (
                <button
                  onClick={() => setSelectedDecisions(new Set(pendingFiltered.map(d => d.id)))}
                  className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-400 mb-3 transition-colors"
                >
                  <CheckSquare size={12} />
                  Sélectionner toutes les décisions en attente ({pendingFiltered.length})
                </button>
              )}

              {/* Count + results */}
              <div className="flex items-center gap-2 text-xs text-gray-600 mb-3">
                <Filter size={11} />
                {filteredDecisions.length} résultat{filteredDecisions.length !== 1 ? 's' : ''}
                {searchQuery && <span>· Recherche: "<span className="text-gray-400">{searchQuery}</span>"</span>}
              </div>

              {/* Decision list */}
              {loading ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 animate-pulse">
                      <div className="flex gap-4">
                        <div className="w-11 h-11 bg-gray-800 rounded-xl flex-shrink-0" />
                        <div className="flex-1 space-y-2.5">
                          <div className="h-4 bg-gray-800 rounded w-2/5" />
                          <div className="h-3 bg-gray-800 rounded w-3/4" />
                          <div className="h-3 bg-gray-800 rounded w-1/2" />
                        </div>
                        <div className="w-16 h-14 bg-gray-800 rounded-xl flex-shrink-0" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : generating ? (
                <div className="bg-gray-900 border border-blue-500/25 rounded-2xl p-12 text-center">
                  <div className="w-16 h-16 bg-blue-500/15 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-500/25">
                    <Brain size={28} className="text-blue-400 animate-pulse" />
                  </div>
                  <h3 className="text-white font-semibold mb-2">Analyse multi-IA en cours...</h3>
                  <p className="text-gray-500 text-sm mb-3">8 agents specialises via OpenAI, Anthropic, Gemini et HuggingFace</p>
                  <div className="flex justify-center gap-2 mb-4">
                    {Object.entries(AI_PROVIDERS).filter(([k]) => k !== 'openrouter').map(([key, p]) => (
                      <span key={key} className={`inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full border ${p.color}`}>
                        <span className="font-bold text-[10px] animate-pulse">{p.icon}</span>
                        {p.name}
                      </span>
                    ))}
                  </div>
                  <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
                    {(Object.entries(AI_AGENTS) as [AIAgent, typeof AI_AGENTS[AIAgent]][]).map(([key, a], i) => {
                      const model = AI_AGENT_MODELS[key as AIAgent];
                      return (
                        <span
                          key={key}
                          className="flex items-center gap-1 text-xs bg-gray-800 border border-gray-700 rounded-full px-2.5 py-1 text-gray-400"
                          style={{ animationDelay: `${i * 0.15}s` }}
                        >
                          <span className="animate-pulse">{a.icon}</span>
                          {a.name}
                          {model && <span className="text-gray-600 text-[10px]">({model.label})</span>}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ) : filteredDecisions.length === 0 ? (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-16 text-center">
                  <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Bot size={28} className="text-gray-600" />
                  </div>
                  <h3 className="text-gray-400 font-medium mb-1">Aucune décision</h3>
                  <p className="text-gray-600 text-sm mb-5">
                    {allDecisions.length === 0
                      ? 'Aucune décision IA générée pour le moment.'
                      : 'Aucun résultat pour ces filtres.'}
                  </p>
                  {allDecisions.length === 0 && (
                    <button
                      onClick={handleGenerateDecisions}
                      disabled={generating}
                      className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition-colors mx-auto disabled:opacity-50"
                    >
                      <Wand2 size={15} />
                      Lancer l'analyse IA sur vos leads
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredDecisions.map(decision => (
                    <div key={decision.id} className="relative group">
                      {decision.status === 'pending' && (
                        <button
                          onClick={() => setSelectedDecisions(prev => {
                            const n = new Set(prev);
                            if (n.has(decision.id)) {
                              n.delete(decision.id);
                            } else {
                              n.add(decision.id);
                            }
                            return n;
                          })}
                          className={`absolute -left-7 top-5 w-5 h-5 rounded border flex items-center justify-center transition-all ${
                            selectedDecisions.has(decision.id)
                              ? 'bg-blue-600 border-blue-500'
                              : 'border-gray-700 bg-gray-800 opacity-0 group-hover:opacity-100'
                          }`}
                        >
                          {selectedDecisions.has(decision.id) && <CheckCircle size={11} className="text-white" />}
                        </button>
                      )}
                      <AIDecisionCard
                        decision={decision}
                        onApprove={decision.status === 'pending' ? () => handleApprove(decision.id) : undefined}
                        onReject={decision.status === 'pending' ? () => handleReject(decision.id) : undefined}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ──── TAB: AGENTS ──── */}
        {activeTab === 'agents' && (
          <AIGovernanceAgents decisions={allDecisions} />
        )}

        {/* ──── TAB: COUNCIL ──── */}
        {activeTab === 'council' && (
          <div className="space-y-6">

            {/* ── Scenario selector ── */}
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">Choisir un scénario</p>
              <div className="grid grid-cols-4 gap-3">
                {COUNCIL_ACTIONS.map((action, i) => (
                  <button
                    key={i}
                    onClick={() => setCouncilType(action.type)}
                    className={`relative bg-gray-900 border rounded-2xl p-4 text-left transition-all ${
                      councilType === action.type
                        ? `${action.color} ring-1 ring-current shadow-lg`
                        : 'border-gray-800 hover:border-gray-700'
                    }`}
                  >
                    {councilType === action.type && (
                      <span className="absolute top-3 right-3">
                        <CheckCircle size={13} className="text-green-400" />
                      </span>
                    )}
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${action.iconBg}`}>
                      {action.icon}
                    </div>
                    <div className="text-sm font-semibold text-white mb-1">{action.title}</div>
                    <p className="text-[11px] text-gray-500 leading-relaxed">{action.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Parliament chamber ── */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
              <div className="px-6 pt-5 pb-4 border-b border-gray-800 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-white">Chambre du Conseil IA</h2>
                  <p className="text-[11px] text-gray-500 mt-0.5">8 agents spécialisés · Analyse collaborative</p>
                </div>
                {councilRunning && (
                  <div className="flex items-center gap-2 text-blue-400 text-xs">
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                    Délibération en cours...
                  </div>
                )}
              </div>

              <div className="p-6">
                {/* Agent seats grid (4+4 with center) */}
                <div className="flex gap-4 items-stretch">

                  {/* Left column: 4 agents */}
                  <div className="flex flex-col gap-3 w-44">
                    {(Object.entries(AI_AGENTS) as [AIAgent, typeof AI_AGENTS[AIAgent]][]).slice(0, 4).map(([key, agent], idx) => {
                      const isDeliberating = councilRunning && idx < 2;
                      return (
                        <div
                          key={key}
                          className={`flex items-center gap-2.5 bg-gray-950 border rounded-xl px-3 py-2.5 transition-all ${
                            isDeliberating ? 'border-blue-500/40 shadow-sm shadow-blue-500/10' : 'border-gray-800'
                          }`}
                        >
                          <span className="text-base leading-none flex-shrink-0">{agent.icon}</span>
                          <div className="min-w-0">
                            <div className="text-[11px] font-semibold text-white leading-tight truncate">{agent.name}</div>
                            {isDeliberating && (
                              <div className="flex gap-0.5 mt-1">
                                {[0,1,2].map(i => (
                                  <span key={i} className="w-1 h-1 rounded-full bg-blue-400 animate-bounce"
                                    style={{ animationDelay: `${i * 0.15}s` }} />
                                ))}
                              </div>
                            )}
                          </div>
                          <span className={`ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                            isDeliberating ? 'bg-blue-400 animate-pulse' : 'bg-emerald-400 animate-pulse'
                          }`} />
                        </div>
                      );
                    })}
                  </div>

                  {/* Center: meeting info + lead selector + launch */}
                  <div className="flex-1 flex flex-col items-center justify-center gap-4">
                    {/* Circular council badge */}
                    <div className={`w-20 h-20 rounded-full border-2 flex items-center justify-center transition-all ${
                      councilRunning
                        ? 'border-blue-500 shadow-lg shadow-blue-500/20 bg-blue-500/10'
                        : 'border-gray-700 bg-gray-800'
                    }`}>
                      {councilRunning
                        ? <RefreshCw size={28} className="text-blue-400 animate-spin" />
                        : <Brain size={28} className="text-gray-400" />
                      }
                    </div>

                    {/* Meeting type badge */}
                    <div className="text-center">
                      <span className="text-xs font-semibold text-gray-300 block">
                        {COUNCIL_ACTIONS.find(a => a.type === councilType)?.title}
                      </span>
                      <span className="text-[10px] text-gray-600">Session collaborative</span>
                    </div>

                    {/* Lead selector */}
                    <div className="w-full">
                      <label className="block text-[10px] font-medium text-gray-600 mb-1.5 uppercase tracking-wider text-center">Lead à analyser</label>
                      {recentLeads.length > 0 ? (
                        <select
                          value={councilLeadId}
                          onChange={e => setCouncilLeadId(e.target.value)}
                          className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-blue-500/60"
                        >
                          <option value="">— Sélectionner un lead —</option>
                          {recentLeads.map(l => (
                            <option key={l.id} value={l.id}>
                              {l.first_name} {l.last_name} · {l.email}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          placeholder="ID du lead..."
                          value={councilLeadId}
                          onChange={e => setCouncilLeadId(e.target.value)}
                          className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-2 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-blue-500/60"
                        />
                      )}
                    </div>

                    {/* Launch button */}
                    <button
                      onClick={handleConveneCouncil}
                      disabled={councilRunning || !councilLeadId.trim()}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                    >
                      {councilRunning
                        ? <><RefreshCw size={13} className="animate-spin" /> Délibération...</>
                        : <><Play size={13} /> Convoquer le Conseil</>
                      }
                    </button>

                    {/* Result feedback */}
                    {councilResult === 'success' && (
                      <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/25 rounded-xl px-3 py-2 text-xs text-green-400 w-full">
                        <CheckCircle size={13} />
                        Décisions générées → onglet "Décisions IA"
                      </div>
                    )}
                    {councilResult === 'error' && (
                      <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/25 rounded-xl px-3 py-2 text-xs text-red-400 w-full">
                        <AlertTriangle size={13} />
                        Erreur — vérifiez le lead sélectionné
                      </div>
                    )}
                  </div>

                  {/* Right column: 4 agents */}
                  <div className="flex flex-col gap-3 w-44">
                    {(Object.entries(AI_AGENTS) as [AIAgent, typeof AI_AGENTS[AIAgent]][]).slice(4, 8).map(([key, agent], idx) => {
                      const isDeliberating = councilRunning && idx < 2;
                      return (
                        <div
                          key={key}
                          className={`flex items-center gap-2.5 bg-gray-950 border rounded-xl px-3 py-2.5 transition-all ${
                            isDeliberating ? 'border-blue-500/40 shadow-sm shadow-blue-500/10' : 'border-gray-800'
                          }`}
                        >
                          <span className="text-base leading-none flex-shrink-0">{agent.icon}</span>
                          <div className="min-w-0">
                            <div className="text-[11px] font-semibold text-white leading-tight truncate">{agent.name}</div>
                            {isDeliberating && (
                              <div className="flex gap-0.5 mt-1">
                                {[0,1,2].map(i => (
                                  <span key={i} className="w-1 h-1 rounded-full bg-blue-400 animate-bounce"
                                    style={{ animationDelay: `${i * 0.15}s` }} />
                                ))}
                              </div>
                            )}
                          </div>
                          <span className={`ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                            isDeliberating ? 'bg-blue-400 animate-pulse' : 'bg-emerald-400 animate-pulse'
                          }`} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* ── How it works ── */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { step: '1', title: 'Sélection', desc: 'Choisissez un lead et un scénario d\'analyse', icon: <Filter size={14} /> },
                { step: '2', title: 'Délibération', desc: 'Les 8 agents analysent le dossier en parallèle', icon: <Brain size={14} /> },
                { step: '3', title: 'Consensus', desc: 'Chaque agent génère sa décision et son raisonnement', icon: <Users size={14} /> },
                { step: '4', title: 'Résultats', desc: 'Les décisions apparaissent dans l\'onglet Décisions IA', icon: <CheckCircle size={14} /> },
              ].map((s, i) => (
                <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-5 h-5 rounded-full bg-gray-800 border border-gray-700 text-[10px] font-bold text-gray-400 flex items-center justify-center">{s.step}</span>
                    <span className="text-gray-500">{s.icon}</span>
                  </div>
                  <div className="text-xs font-semibold text-white mb-1">{s.title}</div>
                  <p className="text-[11px] text-gray-600 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>

            {/* ── Recent council decisions ── */}
            {allDecisions.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">Dernières décisions du conseil</p>
                <div className="space-y-2">
                  {allDecisions.slice(0, 5).map(decision => (
                    <AIDecisionCard
                      key={decision.id}
                      decision={decision}
                      onApprove={decision.status === 'pending' ? () => handleApprove(decision.id) : undefined}
                      onReject={decision.status === 'pending' ? () => handleReject(decision.id) : undefined}
                      compact
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ──── TAB: SETTINGS ──── */}
        {activeTab === 'settings' && <AIGovernanceSettings />}
      </div>
    </div>
  );
};

export default CRMAIGovernance;
