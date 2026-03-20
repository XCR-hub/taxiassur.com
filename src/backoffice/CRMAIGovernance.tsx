import React, { useEffect, useState, useCallback } from 'react';
import {
  Brain, Bot, Sparkles, TrendingUp, CheckCircle, XCircle,
  Clock, Activity, Target, Mail, Briefcase, Search as SearchIcon,
  AlertTriangle, Gift, Smile, MessageSquare, ChevronRight,
  Play, RefreshCw, Filter, Zap, Shield, BarChart2, Users,
  FlaskConical, CheckSquare, X
} from 'lucide-react';
import { aiGovernanceService, AIDecision, AI_AGENTS, AIAgent, AICouncilMeeting } from '@/lib/crm-ai-governance';
import { AIDecisionCard } from '@/components/crm/AIDecisionCard';
import AIGovernanceAgents from './AIGovernanceAgents';
import AIGovernanceSettings from './AIGovernanceSettings';
import { supabase } from '@/lib/supabase';

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

// Demo seed data for simulation
const SEED_DECISIONS: Omit<AIDecision, 'id' | 'created_at'>[] = [
  {
    lead_id: '00000000-0000-0000-0000-000000000001',
    agent: 'lead_scorer',
    decision_type: 'prediction',
    title: 'Lead qualifié A+ détecté',
    description: 'Ce lead présente un score de conversion de 94%. Historique de recherches assurance taxi sur 3 semaines, formulaire complet soumis.',
    rationale: 'Score basé sur : ancienneté du lead (3 semaines), complétude du profil (100%), interactions email (4 ouvertures), budget déclaré (>1500€/an).',
    confidence_score: 0.94,
    suggested_action: 'Contacter dans les 2h pour maximiser les chances de conversion.',
    data_sources: ['crm_leads', 'email_opens', 'form_data'],
    status: 'pending',
  },
  {
    lead_id: '00000000-0000-0000-0000-000000000002',
    agent: 'churn_predictor',
    decision_type: 'alert',
    title: '3 clients à risque de résiliation élevé',
    description: 'Les clients Dupont (exp. Mars), Martin (exp. Fév), Bernard (exp. Mars) montrent des signaux de churn critique.',
    rationale: 'Absence de réponse depuis 45 jours, échéance contrat dans moins de 60 jours, réclamation non résolue pour 2 d\'entre eux.',
    confidence_score: 0.89,
    suggested_action: 'Lancer la séquence de rétention prioritaire dès aujourd\'hui.',
    data_sources: ['crm_clients', 'crm_claims', 'email_engagement'],
    status: 'pending',
  },
  {
    lead_id: '00000000-0000-0000-0000-000000000003',
    agent: 'email_composer',
    decision_type: 'automation',
    title: 'Campagne relance personnalisée générée',
    description: '12 emails de relance hyper-personnalisés créés pour les leads en attente depuis plus de 7 jours.',
    rationale: 'Segmentation basée sur le type de véhicule, la ville et l\'historique d\'interaction. A/B test sur 3 variantes d\'objet.',
    confidence_score: 0.91,
    suggested_action: 'Approuver l\'envoi pour déclenchement automatique à 9h00 demain.',
    data_sources: ['crm_leads', 'email_templates', 'crm_ai_patterns'],
    status: 'pending',
  },
  {
    lead_id: '00000000-0000-0000-0000-000000000004',
    agent: 'cross_sell_recommender',
    decision_type: 'suggestion',
    title: 'Opportunité RC Pro sur 8 clients actifs',
    description: 'Ces clients ont une assurance taxi mais pas de RC Professionnelle. Potentiel de vente additionnelle estimé à 4 800€.',
    rationale: 'Analyse du portefeuille : 8 clients taxi artisanal sans RC Pro, profil compatible avec les offres actuelles.',
    confidence_score: 0.82,
    suggested_action: 'Inclure une offre RC Pro dans le prochain email mensuel.',
    data_sources: ['crm_clients', 'insurance_companies', 'product_catalog'],
    status: 'pending',
  },
  {
    lead_id: '00000000-0000-0000-0000-000000000005',
    agent: 'risk_analyzer',
    decision_type: 'alert',
    title: 'Profil à risque modéré détecté',
    description: 'Le dossier #FR-2026-0847 présente 2 sinistres au cours des 18 derniers mois. Prime suggérée à revoir.',
    rationale: 'CRM : 2 sinistres (1 matériel, 1 corporel). Malus de 0.25. Comparaison avec la grille tarifaire Generali.',
    confidence_score: 0.87,
    suggested_action: 'Appliquer majoration de 15% ou orientation vers une compagnie spécialisée.',
    data_sources: ['crm_leads', 'crm_claims', 'insurance_grid'],
    status: 'auto_applied',
  },
  {
    lead_id: '00000000-0000-0000-0000-000000000006',
    agent: 'sentiment_analyzer',
    decision_type: 'alert',
    title: 'Ton négatif détecté dans 5 échanges récents',
    description: 'Analyse des 48 dernières heures : 5 conversations montrent un sentiment négatif croissant (frustration, délais).',
    rationale: 'NLP score : -0.72 en moyenne. Mots clés détectés : "attente", "rappel jamais reçu", "délai inacceptable".',
    confidence_score: 0.93,
    suggested_action: 'Transmettre ces leads au manager pour contact téléphonique prioritaire.',
    data_sources: ['email_messages', 'crm_interactions'],
    status: 'approved',
  },
];

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
  const [seeding, setSeeding] = useState(false);
  const [councilLeadId, setCouncilLeadId] = useState('');
  const [councilType, setCouncilType] = useState<AICouncilMeeting['meeting_type']>('qualification');
  const [councilRunning, setCouncilRunning] = useState(false);
  const [councilResult, setCouncilResult] = useState<string | null>(null);

  useEffect(() => { loadAllDecisions(); }, []);

  const loadAllDecisions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await aiGovernanceService.getDecisions();
      setAllDecisions(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAllDecisions();
    setRefreshing(false);
  };

  const handleSeedData = async () => {
    setSeeding(true);
    try {
      for (const d of SEED_DECISIONS) {
        await aiGovernanceService.createDecision(d);
      }
      await loadAllDecisions();
    } catch (e) {
      console.error(e);
    } finally {
      setSeeding(false);
    }
  };

  const handleApprove = async (id: string) => {
    await aiGovernanceService.approveDecision(id, 'admin');
    await loadAllDecisions();
    setSelectedDecisions(prev => { const n = new Set(prev); n.delete(id); return n; });
  };

  const handleReject = async (id: string) => {
    await aiGovernanceService.rejectDecision(id);
    await loadAllDecisions();
    setSelectedDecisions(prev => { const n = new Set(prev); n.delete(id); return n; });
  };

  const handleBulkApprove = async () => {
    for (const id of selectedDecisions) {
      await aiGovernanceService.approveDecision(id, 'admin');
    }
    setSelectedDecisions(new Set());
    await loadAllDecisions();
  };

  const handleBulkReject = async () => {
    for (const id of selectedDecisions) {
      await aiGovernanceService.rejectDecision(id);
    }
    setSelectedDecisions(new Set());
    await loadAllDecisions();
  };

  const handleConveneCouncil = async () => {
    if (!councilLeadId.trim()) return;
    setCouncilRunning(true);
    setCouncilResult(null);
    try {
      await aiGovernanceService.conveneCouncil(councilLeadId.trim(), councilType);
      setCouncilResult('success');
      await loadAllDecisions();
    } catch (e) {
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
      return d.title.toLowerCase().includes(q) || d.description.toLowerCase().includes(q);
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
              <div className="flex items-center gap-1.5 bg-green-500/8 border border-green-500/20 rounded-full px-3 py-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-green-400 text-xs font-medium">8 agents actifs</span>
              </div>
              {allDecisions.length === 0 && !loading && (
                <button
                  onClick={handleSeedData}
                  disabled={seeding}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  <FlaskConical size={14} className={seeding ? 'animate-pulse' : ''} />
                  {seeding ? 'Simulation...' : 'Simuler activité IA'}
                </button>
              )}
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
                {s.badge && s.value > 0 && (
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
                {/* Search */}
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

                {/* Status filter */}
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
              ) : filteredDecisions.length === 0 ? (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-16 text-center">
                  <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Bot size={28} className="text-gray-600" />
                  </div>
                  <h3 className="text-gray-400 font-medium mb-1">Aucune décision</h3>
                  <p className="text-gray-600 text-sm mb-5">
                    {allDecisions.length === 0
                      ? 'Aucune décision IA n\'a encore été générée.'
                      : 'Aucun résultat pour ces filtres.'}
                  </p>
                  {allDecisions.length === 0 && (
                    <button
                      onClick={handleSeedData}
                      disabled={seeding}
                      className="flex items-center gap-2 px-5 py-2.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 rounded-xl text-sm font-medium transition-colors mx-auto disabled:opacity-50"
                    >
                      <FlaskConical size={15} className={seeding ? 'animate-pulse' : ''} />
                      {seeding ? 'Génération en cours...' : 'Simuler des décisions IA'}
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
                            n.has(decision.id) ? n.delete(decision.id) : n.add(decision.id);
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

            {/* Convene form */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
                  <Brain size={17} className="text-blue-400" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Convoquer le Conseil IA</h2>
                  <p className="text-xs text-gray-500">Faites collaborer les 8 agents sur un dossier spécifique</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-5">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2">ID du lead / dossier</label>
                  <input
                    type="text"
                    placeholder="ex: a1b2c3d4-..."
                    value={councilLeadId}
                    onChange={e => setCouncilLeadId(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-blue-500/60"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2">Type de réunion</label>
                  <select
                    value={councilType}
                    onChange={e => setCouncilType(e.target.value as AICouncilMeeting['meeting_type'])}
                    className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-blue-500/60"
                  >
                    <option value="qualification">Qualification Lead</option>
                    <option value="risk_assessment">Analyse de Risque</option>
                    <option value="retention">Rétention Client</option>
                    <option value="cross_sell">Cross-Sell Strategy</option>
                  </select>
                </div>
              </div>

              {councilResult === 'success' && (
                <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/25 rounded-xl px-4 py-3 mb-4 text-sm text-green-400">
                  <CheckCircle size={15} />
                  Conseil convoqué avec succès — les décisions apparaîtront dans quelques instants.
                </div>
              )}
              {councilResult === 'error' && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3 mb-4 text-sm text-red-400">
                  <AlertTriangle size={15} />
                  Erreur lors de la convocation. Vérifiez l'ID du lead et les credentials IA.
                </div>
              )}

              <button
                onClick={handleConveneCouncil}
                disabled={councilRunning || !councilLeadId.trim()}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {councilRunning
                  ? <><RefreshCw size={14} className="animate-spin" /> Délibération en cours...</>
                  : <><Play size={14} /> Convoquer le Conseil</>
                }
              </button>
            </div>

            {/* Council scenarios */}
            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-3">Scénarios disponibles</h3>
              <div className="grid grid-cols-2 gap-4">
                {COUNCIL_ACTIONS.map((action, i) => (
                  <button
                    key={i}
                    onClick={() => setCouncilType(action.type)}
                    className={`bg-gray-900 border rounded-2xl p-5 text-left transition-all group ${action.color} ${
                      councilType === action.type ? 'ring-1 ring-current' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${action.iconBg}`}>
                        {action.icon}
                      </div>
                      {councilType === action.type && (
                        <CheckCircle size={15} className="text-green-400 mt-1" />
                      )}
                    </div>
                    <div className="text-sm font-semibold text-white mb-1">{action.title}</div>
                    <p className="text-xs text-gray-500 leading-relaxed">{action.desc}</p>
                    <div className="flex -space-x-1.5 mt-3">
                      {(Object.keys(AI_AGENTS) as AIAgent[]).slice(0, 5).map((k, j) => (
                        <div key={j} className="w-5 h-5 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-[9px]">
                          {AI_AGENTS[k].icon}
                        </div>
                      ))}
                      <div className="w-5 h-5 rounded-full bg-gray-700 border border-gray-600 flex items-center justify-center text-[9px] text-gray-400">+3</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Participating agents */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-gray-400 mb-4">Agents disponibles ({Object.keys(AI_AGENTS).length}/8)</h3>
              <div className="grid grid-cols-4 gap-3">
                {(Object.entries(AI_AGENTS) as [AIAgent, typeof AI_AGENTS[AIAgent]][]).map(([key, agent]) => (
                  <div key={key} className="bg-gray-950 border border-gray-800 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-base">{agent.icon}</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
                    </div>
                    <div className="text-xs font-semibold text-white leading-tight">{agent.name}</div>
                    <div className="text-[10px] text-gray-600 mt-0.5 leading-tight">{agent.description}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ──── TAB: SETTINGS ──── */}
        {activeTab === 'settings' && <AIGovernanceSettings />}
      </div>
    </div>
  );
};

export default CRMAIGovernance;
