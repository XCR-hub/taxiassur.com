import { useState, useEffect, useCallback } from 'react';
import { internalFunctionHeaders } from '@/lib/internal-function-auth';
import {
  Brain, Zap, Users, Activity, RefreshCw,
  CheckCircle, AlertTriangle, Code, Rocket,
  Clock, X, Shield,
  Cpu, GitBranch, Database, Sparkles,
  ArrowUp, ArrowDown, Minus,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

/* ── Types ── */
interface AIMetrics {
  total_leads: number;
  conversion_rate: number;
  avg_response_time: number;
  active_decisions: number;
  successful_deployments: number;
  code_suggestions_pending: number;
  learning_data_points: number;
}

interface AIDecision {
  id: string;
  decision_type: string;
  context: Record<string, unknown>;
  decision: Record<string, unknown>;
  confidence_score: number;
  status: string;
  created_at: string;
}

interface CodeSuggestion {
  id: string;
  file_path: string;
  suggestion_type: string;
  reason: string;
  priority: string;
  status: string;
  created_at: string;
}

interface Deployment {
  id: string;
  deployment_type: string;
  changes_summary: string;
  status: string;
  deployed_at: string;
  performance_before: Record<string, unknown>;
  performance_after: Record<string, unknown>;
}

/* ── Helpers ── */
function fmtRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `il y a ${d}j`;
  if (h > 0) return `il y a ${h}h`;
  if (m > 0) return `il y a ${m}m`;
  return 'à l\'instant';
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const DECISION_TYPE_LABELS: Record<string, string> = {
  performance_optimization: 'Optimisation perf.',
  lead_scoring: 'Scoring leads',
  content_generation: 'Génération contenu',
  email_automation: 'Automatisation email',
  pipeline_adjustment: 'Ajustement pipeline',
};

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  executed:  { bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500'  },
  pending:   { bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-500'  },
  approved:  { bg: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-500'   },
  applied:   { bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500'  },
  success:   { bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500'  },
  failed:    { bg: 'bg-red-50',    text: 'text-red-700',    dot: 'bg-red-500'    },
  rejected:  { bg: 'bg-red-50',    text: 'text-red-700',    dot: 'bg-red-500'    },
  default:   { bg: 'bg-gray-50',   text: 'text-gray-600',   dot: 'bg-gray-400'   },
};

const PRIORITY_META: Record<string, { label: string; color: string; bg: string }> = {
  high:   { label: 'Haute',   color: 'text-red-700',    bg: 'bg-red-100'    },
  medium: { label: 'Moyenne', color: 'text-amber-700',  bg: 'bg-amber-100'  },
  low:    { label: 'Faible',  color: 'text-gray-600',   bg: 'bg-gray-100'   },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.default;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${s.bg} ${s.text}`}>
      <span className={`w-1 h-1 rounded-full ${s.dot}`} />
      {status}
    </span>
  );
}

function ConfidenceBar({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score));
  const color = pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-gray-600 w-8 text-right">{pct.toFixed(0)}%</span>
    </div>
  );
}

/* ── Confirm Modal ── */
function ConfirmModal({
  open, title, description, confirmLabel, onConfirm, onClose, danger = false
}: {
  open: boolean; title: string; description: string;
  confirmLabel: string; onConfirm: () => void; onClose: () => void; danger?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${danger ? 'bg-red-100' : 'bg-orange-100'}`}>
            <Shield size={18} className={danger ? 'text-red-600' : 'text-orange-600'} />
          </div>
          <div>
            <div className="font-bold text-gray-900 text-sm">{title}</div>
            <div className="text-xs text-gray-500 mt-1">{description}</div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onConfirm}
            className={`flex-1 py-2 text-sm font-semibold rounded-xl text-white transition-colors ${danger ? 'bg-red-500 hover:bg-red-600' : 'bg-orange-500 hover:bg-orange-600'}`}>
            {confirmLabel}
          </button>
          <button onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-xl transition-colors">
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════ */
export default function AIAutonomousDashboard() {
  const [metrics, setMetrics]       = useState<AIMetrics | null>(null);
  const [decisions, setDecisions]   = useState<AIDecision[]>([]);
  const [suggestions, setSuggestions] = useState<CodeSuggestion[]>([]);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading]       = useState(true);
  const [aiRunning, setAiRunning]   = useState(false);
  const [deploying, setDeploying]   = useState(false);
  const [toast, setToast]           = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
  const [confirm, setConfirm]       = useState<null | 'analyze' | 'deploy'>(null);
  const [activeTab, setActiveTab]   = useState<'decisions' | 'deployments'>('decisions');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = useCallback(async () => {
    try {
      const [metricsRes, decisionsRes, suggestionsRes, deploymentsRes] = await Promise.all([
        supabase.rpc('calculate_ai_metrics'),
        supabase.from('ai_decisions').select('*').order('created_at', { ascending: false }).limit(15),
        supabase.from('ai_code_suggestions').select('*').order('created_at', { ascending: false }).limit(10),
        supabase.from('ai_deployments').select('*').order('created_at', { ascending: false }).limit(10),
      ]);
      if (metricsRes.data) setMetrics(metricsRes.data);
      if (decisionsRes.data) setDecisions(decisionsRes.data);
      if (suggestionsRes.data) setSuggestions(suggestionsRes.data);
      if (deploymentsRes.data) setDeployments(deploymentsRes.data);
      setLastRefresh(new Date());
    } catch (err) {
      logger.error('loadData', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const iv = setInterval(loadData, 30000);
    return () => clearInterval(iv);
  }, [loadData]);

  const doAnalyze = async () => {
    setConfirm(null);
    setAiRunning(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/autonomous-ai-engine`, {
        method: 'POST',
        headers: { Authorization: (await internalFunctionHeaders()).Authorization, 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: { currentMetrics: metrics, timestamp: new Date().toISOString() }, decisionType: 'performance_optimization' }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Analyse IA terminée avec succès');
        await loadData();
      } else {
        showToast('Analyse terminée avec avertissements', 'err');
      }
    } catch (err) {
      logger.error('analyze', err);
      showToast('Erreur lors de l\'analyse IA', 'err');
    } finally {
      setAiRunning(false);
    }
  };

  const doDeploy = async () => {
    setConfirm(null);
    setDeploying(true);
    try {
      await supabase.from('ai_code_suggestions').update({ status: 'approved' }).eq('status', 'pending').in('priority', ['high', 'medium']);
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auto-deploy-improvements`, {
        method: 'POST',
        headers: { Authorization: (await internalFunctionHeaders()).Authorization, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success) {
        showToast(`${data.changesApplied ?? 0} modification(s) déployée(s)`);
        await loadData();
      } else {
        showToast('Déploiement partiel', 'err');
      }
    } catch (err) {
      logger.error('deploy', err);
      showToast('Erreur lors du déploiement', 'err');
    } finally {
      setDeploying(false);
    }
  };

  const approveSuggestion = async (id: string) => {
    await supabase.from('ai_code_suggestions').update({ status: 'approved' }).eq('id', id);
    await loadData();
    showToast('Suggestion approuvée');
  };

  const rejectSuggestion = async (id: string) => {
    await supabase.from('ai_code_suggestions').update({ status: 'rejected' }).eq('id', id);
    await loadData();
    showToast('Suggestion rejetée');
  };

  /* ── Derived ── */
  const pendingCount  = suggestions.filter(s => s.status === 'pending').length;
  const executedCount = decisions.filter(d => d.status === 'executed').length;
  const successRate   = decisions.length > 0 ? Math.round((executedCount / decisions.length) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-orange-500" size={28} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 max-w-6xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Cpu size={20} className="text-orange-500" />
            IA Autonome
          </h1>
          <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse inline-block" />
            Système actif · Actualisation {fmtRelative(lastRefresh.toISOString())}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setConfirm('analyze')} disabled={aiRunning}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-50 shadow-sm">
            {aiRunning
              ? <><RefreshCw size={14} className="animate-spin" /> Analyse…</>
              : <><Brain size={14} /> Lancer analyse</>}
          </button>
          <button onClick={() => setConfirm('deploy')} disabled={deploying || pendingCount === 0}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-40 shadow-sm">
            {deploying
              ? <><RefreshCw size={14} className="animate-spin" /> Déploiement…</>
              : <><Rocket size={14} /> Déployer ({pendingCount})</>}
          </button>
          <button onClick={loadData} className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl transition-colors">
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-4 gap-3">
        {[
          {
            label: 'Leads totaux', value: metrics?.total_leads ?? 0, icon: Users,
            sub: `Conv. ${metrics?.conversion_rate?.toFixed(1) ?? 0}%`,
            subIcon: metrics?.conversion_rate && metrics.conversion_rate > 10 ? ArrowUp : Minus,
            color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200',
          },
          {
            label: 'Décisions actives', value: metrics?.active_decisions ?? 0, icon: Brain,
            sub: `${metrics?.learning_data_points ?? 0} points appris`,
            subIcon: ArrowUp,
            color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200',
          },
          {
            label: 'Taux de succès', value: `${successRate}%`, icon: Activity,
            sub: `${executedCount}/${decisions.length} exécutées`,
            subIcon: successRate >= 80 ? ArrowUp : ArrowDown,
            color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200',
          },
          {
            label: 'Déploiements OK', value: metrics?.successful_deployments ?? 0, icon: Rocket,
            sub: `${pendingCount} en attente`,
            subIcon: pendingCount > 0 ? AlertTriangle : CheckCircle,
            color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200',
          },
        ].map(k => (
          <div key={k.label} className={`${k.bg} border ${k.border} rounded-xl px-4 py-3`}>
            <div className="flex items-center justify-between mb-1">
              <k.icon size={16} className={k.color} />
              <k.subIcon size={12} className={k.color} />
            </div>
            <div className="text-2xl font-bold text-gray-900 leading-tight">{k.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{k.label}</div>
            <div className={`text-[10px] font-medium mt-1 ${k.color}`}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-5 gap-5">

        {/* ── Left: decisions + deployments tabs ── */}
        <div className="col-span-3 space-y-4">

          {/* Tab bar */}
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl w-fit">
            {([
              { id: 'decisions', label: 'Décisions IA', icon: Brain },
              { id: 'deployments', label: 'Déploiements', icon: Rocket },
            ] as const).map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                <t.icon size={13} />
                {t.label}
              </button>
            ))}
          </div>

          {/* Decisions list */}
          {activeTab === 'decisions' && (
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
              {decisions.length === 0 ? (
                <div className="py-16 flex flex-col items-center text-gray-400">
                  <Brain size={28} className="mb-2 opacity-30" />
                  <p className="text-sm">Aucune décision enregistrée</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {decisions.map(d => (
                    <div key={d.id} className="p-3.5 hover:bg-gray-50/60 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Sparkles size={13} className="text-orange-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-sm font-semibold text-gray-900 truncate">
                              {DECISION_TYPE_LABELS[d.decision_type] || d.decision_type.replace(/_/g, ' ')}
                            </span>
                            <StatusBadge status={d.status} />
                          </div>
                          <ConfidenceBar score={d.confidence_score} />
                          <div className="flex items-center gap-2 mt-1.5">
                            <Clock size={10} className="text-gray-400" />
                            <span className="text-[10px] text-gray-400">{fmtRelative(d.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Deployments list */}
          {activeTab === 'deployments' && (
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
              {deployments.length === 0 ? (
                <div className="py-16 flex flex-col items-center text-gray-400">
                  <Rocket size={28} className="mb-2 opacity-30" />
                  <p className="text-sm">Aucun déploiement</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {deployments.map(d => (
                    <div key={d.id} className="p-3.5 hover:bg-gray-50/60 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          d.status === 'success' ? 'bg-green-100' : d.status === 'failed' ? 'bg-red-100' : 'bg-amber-100'}`}>
                          {d.status === 'success'
                            ? <CheckCircle size={13} className="text-green-600" />
                            : d.status === 'failed'
                              ? <AlertTriangle size={13} className="text-red-600" />
                              : <Clock size={13} className="text-amber-600" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <span className="text-sm font-semibold text-gray-900 capitalize">
                              {d.deployment_type.replace(/_/g, ' ')}
                            </span>
                            <StatusBadge status={d.status} />
                          </div>
                          <p className="text-xs text-gray-600 leading-relaxed">{d.changes_summary}</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <Clock size={10} className="text-gray-400" />
                            <span className="text-[10px] text-gray-400">
                              {d.deployed_at ? fmtDate(d.deployed_at) : '—'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Right: Suggestions + Capabilities ── */}
        <div className="col-span-2 space-y-4">

          {/* Code suggestions */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Code size={14} className="text-orange-500" />
                Suggestions de code
              </h3>
              {pendingCount > 0 && (
                <span className="text-xs font-bold px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                  {pendingCount} en attente
                </span>
              )}
            </div>
            {suggestions.length === 0 ? (
              <div className="py-10 flex flex-col items-center text-gray-400">
                <Code size={24} className="mb-2 opacity-30" />
                <p className="text-xs">Aucune suggestion</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
                {suggestions.map(s => {
                  const pm = PRIORITY_META[s.priority] || PRIORITY_META.low;
                  return (
                    <div key={s.id} className="p-3 hover:bg-gray-50/60 transition-colors">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="text-xs font-semibold text-gray-800 truncate flex-1">{s.file_path}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0 ${pm.bg} ${pm.color}`}>
                          {pm.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-600 leading-relaxed mb-2">{s.reason}</p>
                      <div className="flex items-center justify-between">
                        <StatusBadge status={s.status} />
                        {s.status === 'pending' && (
                          <div className="flex items-center gap-1">
                            <button onClick={() => approveSuggestion(s.id)}
                              className="p-1 rounded-md bg-green-100 hover:bg-green-200 transition-colors" title="Approuver">
                              <CheckCircle size={12} className="text-green-600" />
                            </button>
                            <button onClick={() => rejectSuggestion(s.id)}
                              className="p-1 rounded-md bg-red-100 hover:bg-red-200 transition-colors" title="Rejeter">
                              <X size={12} className="text-red-600" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Capabilities */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Zap size={14} className="text-orange-500" />
              Capacités du moteur
            </h3>
            <div className="space-y-2.5">
              {[
                { icon: Activity,  title: 'Analyse continue',      sub: 'Surveillance métriques 24/7 et détection d\'anomalies' },
                { icon: Database,  title: 'Apprentissage auto',     sub: `${metrics?.learning_data_points ?? 0} points de données` },
                { icon: GitBranch, title: 'Multi-modèles',          sub: 'Consensus entre plusieurs LLMs' },
                { icon: Shield,    title: 'Déploiement sécurisé',   sub: 'Rollback automatique si nécessaire' },
              ].map((c, i) => (
                <div key={i} className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="w-7 h-7 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <c.icon size={13} className="text-orange-600" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-800">{c.title}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">{c.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Learning data */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-4 text-white">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                <span className="text-xs font-bold">Système opérationnel</span>
              </div>
              <span className="text-[10px] text-slate-400">{fmtRelative(lastRefresh.toISOString())}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Taux succès',  value: `${successRate}%` },
                { label: 'Décisions',    value: decisions.length },
                { label: 'Déploiements', value: deployments.length },
                { label: 'Suggestions',  value: suggestions.length },
              ].map((m, i) => (
                <div key={i} className="bg-white/5 rounded-lg px-2.5 py-1.5">
                  <div className="text-lg font-bold text-white leading-tight">{m.value}</div>
                  <div className="text-[10px] text-slate-400">{m.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      <ConfirmModal
        open={confirm === 'analyze'}
        title="Lancer l'analyse IA ?"
        description="Le moteur va analyser les métriques actuelles et générer des recommandations d'optimisation."
        confirmLabel="Lancer l'analyse"
        onConfirm={doAnalyze}
        onClose={() => setConfirm(null)}
      />
      <ConfirmModal
        open={confirm === 'deploy'}
        title={`Déployer ${pendingCount} suggestion(s) ?`}
        description="Les suggestions de priorité haute et moyenne seront approuvées et déployées automatiquement."
        confirmLabel="Déployer automatiquement"
        onConfirm={doDeploy}
        onClose={() => setConfirm(null)}
      />

      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-medium
          ${toast.type === 'ok' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.type === 'ok' ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
