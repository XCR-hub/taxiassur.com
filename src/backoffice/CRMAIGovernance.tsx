import React, { useEffect, useState } from 'react';
import {
  Brain, Bot, Sparkles, TrendingUp, CheckCircle, XCircle,
  AlertCircle, Clock, Activity, Target, Mail, Briefcase,
  Search, AlertTriangle, Gift, Smile, MessageSquare,
  ChevronRight, Play, RefreshCw, Filter, Zap, Shield,
  BarChart2, Users
} from 'lucide-react';
import { aiGovernanceService, AIDecision, AI_AGENTS, AIAgent } from '@/lib/crm-ai-governance';
import { AIDecisionCard } from '@/components/crm/AIDecisionCard';

const AGENT_ICONS: Record<AIAgent, React.ReactNode> = {
  lead_scorer: <Target size={20} className="text-blue-400" />,
  email_composer: <Mail size={20} className="text-sky-400" />,
  negotiation_assistant: <Briefcase size={20} className="text-amber-400" />,
  risk_analyzer: <Search size={20} className="text-orange-400" />,
  churn_predictor: <AlertTriangle size={20} className="text-red-400" />,
  cross_sell_recommender: <Gift size={20} className="text-green-400" />,
  sentiment_analyzer: <Smile size={20} className="text-teal-400" />,
  response_generator: <MessageSquare size={20} className="text-cyan-400" />,
};

const AGENT_COLORS: Record<AIAgent, string> = {
  lead_scorer: 'border-blue-500/30 bg-blue-500/5',
  email_composer: 'border-sky-500/30 bg-sky-500/5',
  negotiation_assistant: 'border-amber-500/30 bg-amber-500/5',
  risk_analyzer: 'border-orange-500/30 bg-orange-500/5',
  churn_predictor: 'border-red-500/30 bg-red-500/5',
  cross_sell_recommender: 'border-green-500/30 bg-green-500/5',
  sentiment_analyzer: 'border-teal-500/30 bg-teal-500/5',
  response_generator: 'border-cyan-500/30 bg-cyan-500/5',
};

const AGENT_ACTIVE_COLORS: Record<AIAgent, string> = {
  lead_scorer: 'border-blue-400 bg-blue-500/15 ring-1 ring-blue-400/30',
  email_composer: 'border-sky-400 bg-sky-500/15 ring-1 ring-sky-400/30',
  negotiation_assistant: 'border-amber-400 bg-amber-500/15 ring-1 ring-amber-400/30',
  risk_analyzer: 'border-orange-400 bg-orange-500/15 ring-1 ring-orange-400/30',
  churn_predictor: 'border-red-400 bg-red-500/15 ring-1 ring-red-400/30',
  cross_sell_recommender: 'border-green-400 bg-green-500/15 ring-1 ring-green-400/30',
  sentiment_analyzer: 'border-teal-400 bg-teal-500/15 ring-1 ring-teal-400/30',
  response_generator: 'border-cyan-400 bg-cyan-500/15 ring-1 ring-cyan-400/30',
};

const COUNCIL_ACTIONS = [
  {
    icon: <TrendingUp size={18} />,
    title: 'Qualification Lead',
    desc: "Analyse complète d'un lead par tous les agents pour maximiser le taux de conversion.",
    color: 'border-blue-500/30 hover:border-blue-400',
    iconBg: 'bg-blue-500/15 text-blue-400',
    type: 'qualification' as const,
  },
  {
    icon: <Shield size={18} />,
    title: 'Analyse de Risque',
    desc: 'Évaluation collaborative des risques avant souscription.',
    color: 'border-orange-500/30 hover:border-orange-400',
    iconBg: 'bg-orange-500/15 text-orange-400',
    type: 'risk_assessment' as const,
  },
  {
    icon: <Users size={18} />,
    title: 'Rétention Client',
    desc: 'Stratégies personnalisées pour retenir un client à risque de churn.',
    color: 'border-green-500/30 hover:border-green-400',
    iconBg: 'bg-green-500/15 text-green-400',
    type: 'retention' as const,
  },
  {
    icon: <BarChart2 size={18} />,
    title: 'Cross-Sell Strategy',
    desc: 'Identifier les meilleures opportunités de vente additionnelle.',
    color: 'border-amber-500/30 hover:border-amber-400',
    iconBg: 'bg-amber-500/15 text-amber-400',
    type: 'cross_sell' as const,
  },
];

const STATUS_TABS = [
  { value: 'all', label: 'Toutes', icon: <Activity size={14} /> },
  { value: 'pending', label: 'En attente', icon: <Clock size={14} /> },
  { value: 'approved', label: 'Approuvées', icon: <CheckCircle size={14} /> },
  { value: 'rejected', label: 'Rejetées', icon: <XCircle size={14} /> },
  { value: 'auto_applied', label: 'Auto', icon: <Zap size={14} /> },
] as const;

const CRMAIGovernance: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [decisions, setDecisions] = useState<AIDecision[]>([]);
  const [statusFilter, setStatusFilter] = useState<AIDecision['status'] | 'all'>('pending');
  const [selectedAgent, setSelectedAgent] = useState<AIAgent | 'all'>('all');
  const [activeView, setActiveView] = useState<'decisions' | 'council'>('decisions');

  useEffect(() => {
    loadAIData();
  }, [statusFilter, selectedAgent]);

  const loadAIData = async () => {
    setLoading(true);
    try {
      let decisionsData = await aiGovernanceService.getDecisions(
        undefined,
        statusFilter === 'all' ? undefined : statusFilter
      );
      if (selectedAgent !== 'all') {
        decisionsData = decisionsData.filter(d => d.agent === selectedAgent);
      }
      setDecisions(decisionsData);
    } catch (error) {
      console.error('Failed to load AI data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAIData();
    setRefreshing(false);
  };

  const handleApproveDecision = async (decisionId: string) => {
    await aiGovernanceService.approveDecision(decisionId, 'admin');
    await loadAIData();
  };

  const handleRejectDecision = async (decisionId: string) => {
    await aiGovernanceService.rejectDecision(decisionId);
    await loadAIData();
  };

  const allDecisions = decisions;
  const stats = {
    pending: allDecisions.filter(d => d.status === 'pending').length,
    approved: allDecisions.filter(d => d.status === 'approved').length,
    rejected: allDecisions.filter(d => d.status === 'rejected').length,
    auto_applied: allDecisions.filter(d => d.status === 'auto_applied').length,
    total: allDecisions.length,
  };

  const decisionsByAgent = Object.keys(AI_AGENTS).reduce((acc, agent) => {
    acc[agent as AIAgent] = allDecisions.filter(d => d.agent === agent).length;
    return acc;
  }, {} as Record<AIAgent, number>);

  const avgConfidence = allDecisions.length
    ? Math.round(allDecisions.reduce((s, d) => s + d.confidence_score, 0) / allDecisions.length * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
                <Brain size={24} className="text-blue-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">IA Governance</h1>
                <p className="text-gray-400 text-sm mt-0.5">Système de décisions collaboratives multi-agents</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 rounded-full px-3 py-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-green-400 text-xs font-medium">8 agents actifs</span>
              </div>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm text-gray-300 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                Actualiser
              </button>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6">
            {[
              { label: 'En attente', value: stats.pending, icon: <Clock size={16} />, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
              { label: 'Approuvées', value: stats.approved, icon: <CheckCircle size={16} />, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
              { label: 'Rejetées', value: stats.rejected, icon: <XCircle size={16} />, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
              { label: 'Auto-appliquées', value: stats.auto_applied, icon: <Zap size={16} />, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
              { label: 'Confiance moy.', value: `${avgConfidence}%`, icon: <Sparkles size={16} />, color: 'text-teal-400', bg: 'bg-teal-500/10 border-teal-500/20' },
            ].map((stat, i) => (
              <div key={i} className={`border rounded-xl p-4 ${stat.bg}`}>
                <div className={`flex items-center gap-2 mb-1 ${stat.color}`}>
                  {stat.icon}
                  <span className="text-xs font-medium">{stat.label}</span>
                </div>
                <div className="text-2xl font-bold text-white">{stat.value}</div>
              </div>
            ))}
          </div>

          {/* View tabs */}
          <div className="flex gap-1 mt-5 border-b border-gray-800">
            {([
              { id: 'decisions', label: 'Décisions IA', icon: <Bot size={15} /> },
              { id: 'council', label: 'IA Council', icon: <Brain size={15} /> },
            ] as const).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeView === tab.id
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-300'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">

        {activeView === 'decisions' && (
          <div className="flex gap-6">

            {/* Sidebar — Agent selector */}
            <aside className="w-64 flex-shrink-0">
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-1">
                  Agents IA
                </h3>

                <div className="space-y-1">
                  <button
                    onClick={() => setSelectedAgent('all')}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all ${
                      selectedAgent === 'all'
                        ? 'bg-blue-500/15 border border-blue-500/30 text-blue-300'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-gray-700 flex items-center justify-center">
                        <Activity size={13} className="text-gray-400" />
                      </div>
                      <span>Tous les agents</span>
                    </div>
                    <span className="text-xs bg-gray-800 px-2 py-0.5 rounded-full">{stats.total}</span>
                  </button>

                  {Object.entries(AI_AGENTS).map(([key, agent]) => {
                    const agentKey = key as AIAgent;
                    const count = decisionsByAgent[agentKey] || 0;
                    const isActive = selectedAgent === agentKey;
                    return (
                      <button
                        key={key}
                        onClick={() => setSelectedAgent(agentKey)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all border ${
                          isActive
                            ? AGENT_ACTIVE_COLORS[agentKey]
                            : 'border-transparent text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${isActive ? 'bg-gray-800' : 'bg-gray-800'}`}>
                            {React.cloneElement(AGENT_ICONS[agentKey] as React.ReactElement, { size: 13 })}
                          </div>
                          <span className="truncate">{agent.name}</span>
                        </div>
                        {count > 0 && (
                          <span className="text-xs bg-gray-800 px-2 py-0.5 rounded-full flex-shrink-0">{count}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </aside>

            {/* Main content */}
            <div className="flex-1 min-w-0">

              {/* Filter bar */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1">
                  {STATUS_TABS.map(tab => (
                    <button
                      key={tab.value}
                      onClick={() => setStatusFilter(tab.value as any)}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        statusFilter === tab.value
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                      }`}
                    >
                      {tab.icon}
                      {tab.label}
                      {tab.value === 'pending' && stats.pending > 0 && (
                        <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                          {stats.pending}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Filter size={12} />
                  {decisions.length} décision{decisions.length !== 1 ? 's' : ''}
                </div>
              </div>

              {/* Decision list */}
              {loading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 animate-pulse">
                      <div className="flex gap-4">
                        <div className="w-12 h-12 bg-gray-800 rounded-xl" />
                        <div className="flex-1 space-y-3">
                          <div className="h-4 bg-gray-800 rounded w-1/3" />
                          <div className="h-3 bg-gray-800 rounded w-2/3" />
                          <div className="h-3 bg-gray-800 rounded w-1/2" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : decisions.length === 0 ? (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-16 text-center">
                  <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Bot size={28} className="text-gray-600" />
                  </div>
                  <h3 className="text-gray-400 font-medium mb-1">Aucune décision</h3>
                  <p className="text-gray-600 text-sm">
                    {statusFilter === 'pending'
                      ? 'Aucune décision en attente de validation.'
                      : 'Aucune décision correspondant aux filtres sélectionnés.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {decisions.map(decision => (
                    <AIDecisionCard
                      key={decision.id}
                      decision={decision}
                      onApprove={decision.status === 'pending' ? () => handleApproveDecision(decision.id) : undefined}
                      onReject={decision.status === 'pending' ? () => handleRejectDecision(decision.id) : undefined}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeView === 'council' && (
          <div>
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
                  <Brain size={16} className="text-blue-400" />
                </div>
                <h2 className="text-lg font-bold text-white">IA Council</h2>
                <span className="text-xs bg-gray-800 border border-gray-700 text-gray-400 px-2 py-1 rounded-full">
                  8 agents disponibles
                </span>
              </div>
              <p className="text-gray-500 text-sm ml-11">
                Convoquez plusieurs agents IA simultanément pour obtenir des recommandations collaboratives sur un dossier.
              </p>
            </div>

            {/* Participating agents visualization */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
              <h3 className="text-sm font-semibold text-gray-400 mb-4">Agents disponibles pour le conseil</h3>
              <div className="grid grid-cols-4 gap-3">
                {Object.entries(AI_AGENTS).map(([key, agent]) => {
                  const agentKey = key as AIAgent;
                  return (
                    <div key={key} className={`border rounded-xl p-3 ${AGENT_COLORS[agentKey]}`}>
                      <div className="flex items-center gap-2 mb-2">
                        {AGENT_ICONS[agentKey]}
                        <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                      </div>
                      <div className="text-xs font-semibold text-white">{agent.name}</div>
                      <div className="text-[11px] text-gray-500 mt-0.5 leading-tight">{agent.description}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Council action cards */}
            <div className="grid grid-cols-2 gap-4">
              {COUNCIL_ACTIONS.map((action, i) => (
                <div key={i} className={`bg-gray-900 border rounded-2xl p-6 transition-all cursor-pointer group ${action.color}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${action.iconBg}`}>
                      {action.icon}
                    </div>
                    <ChevronRight size={16} className="text-gray-600 group-hover:text-gray-400 transition-colors mt-2" />
                  </div>

                  <h3 className="font-bold text-white mb-2">{action.title}</h3>
                  <p className="text-sm text-gray-500 mb-5 leading-relaxed">{action.desc}</p>

                  <div className="flex items-center justify-between">
                    <div className="flex -space-x-2">
                      {Object.keys(AI_AGENTS).slice(0, 4).map((key, j) => (
                        <div
                          key={j}
                          className={`w-7 h-7 rounded-full border-2 border-gray-900 flex items-center justify-center text-[10px] ${
                            ['bg-blue-500/30', 'bg-green-500/30', 'bg-amber-500/30', 'bg-red-500/30'][j]
                          }`}
                        >
                          {AI_AGENTS[key as AIAgent].icon}
                        </div>
                      ))}
                      <div className="w-7 h-7 rounded-full border-2 border-gray-900 bg-gray-800 flex items-center justify-center text-[10px] text-gray-400">
                        +4
                      </div>
                    </div>
                    <button className="flex items-center gap-1.5 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm text-gray-300 transition-colors group-hover:border-gray-600">
                      <Play size={12} />
                      Convoquer
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Recent council history placeholder */}
            <div className="mt-6 bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Clock size={15} className="text-gray-400" />
                Historique des réunions
              </h3>
              <div className="text-center py-10 text-gray-600">
                <Brain size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">Aucune réunion IA Council enregistrée.</p>
                <p className="text-xs mt-1">Convocez votre premier conseil pour commencer.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CRMAIGovernance;
