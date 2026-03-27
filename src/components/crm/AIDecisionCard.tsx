import React, { useState } from 'react';
import {
  Bot, CheckCircle, XCircle, AlertTriangle, TrendingUp,
  Lightbulb, Clock, Zap, Database, ChevronDown, ChevronUp,
  Sparkles, ArrowRight
} from 'lucide-react';
import { AIDecision, AI_AGENTS, AI_PROVIDERS, AI_AGENT_MODELS, AIProvider } from '@/lib/crm-ai-governance';
import { cn } from '@/lib/utils';

interface AIDecisionCardProps {
  decision: AIDecision;
  onApprove?: () => Promise<void>;
  onReject?: () => Promise<void>;
  compact?: boolean;
}

const DECISION_TYPE_CONFIG = {
  suggestion: {
    icon: Lightbulb,
    label: 'Suggestion',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/25',
    accent: '#3b82f6',
  },
  automation: {
    icon: Bot,
    label: 'Automation',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10 border-cyan-500/25',
    accent: '#06b6d4',
  },
  alert: {
    icon: AlertTriangle,
    label: 'Alerte',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/25',
    accent: '#f59e0b',
  },
  prediction: {
    icon: TrendingUp,
    label: 'Prédiction',
    color: 'text-green-400',
    bg: 'bg-green-500/10 border-green-500/25',
    accent: '#22c55e',
  },
};

const STATUS_CONFIG = {
  pending:      { label: 'En attente',    color: 'text-amber-400 bg-amber-500/10 border-amber-500/25' },
  approved:     { label: 'Approuvée',     color: 'text-green-400 bg-green-500/10 border-green-500/25' },
  rejected:     { label: 'Rejetée',       color: 'text-red-400 bg-red-500/10 border-red-500/25' },
  auto_applied: { label: 'Auto-appliquée', color: 'text-blue-400 bg-blue-500/10 border-blue-500/25' },
};

const AGENT_COLOR: Record<string, string> = {
  lead_scorer:            'text-blue-400 bg-blue-500/12 border-blue-500/25',
  email_composer:         'text-sky-400 bg-sky-500/12 border-sky-500/25',
  negotiation_assistant:  'text-amber-400 bg-amber-500/12 border-amber-500/25',
  risk_analyzer:          'text-orange-400 bg-orange-500/12 border-orange-500/25',
  churn_predictor:        'text-red-400 bg-red-500/12 border-red-500/25',
  cross_sell_recommender: 'text-green-400 bg-green-500/12 border-green-500/25',
  sentiment_analyzer:     'text-teal-400 bg-teal-500/12 border-teal-500/25',
  response_generator:     'text-cyan-400 bg-cyan-500/12 border-cyan-500/25',
};

const normalizeScore = (score: number) => (score > 1 ? score / 100 : score);

const getConfidenceConfig = (score: number) => {
  const s = normalizeScore(score);
  if (s >= 0.85) return { color: 'text-emerald-400', ring: '#10b981', bg: 'bg-emerald-500/10', label: 'Élevée' };
  if (s >= 0.7)  return { color: 'text-green-400',   ring: '#22c55e', bg: 'bg-green-500/10',   label: 'Bonne' };
  if (s >= 0.5)  return { color: 'text-amber-400',   ring: '#f59e0b', bg: 'bg-amber-500/10',   label: 'Moyenne' };
  return               { color: 'text-orange-400',  ring: '#f97316', bg: 'bg-orange-500/10',  label: 'Faible' };
};

const ConfidenceRing: React.FC<{ pct: number; color: string; size?: number }> = ({ pct, color, size = 52 }) => {
  const strokeW = 4;
  const r = (size - strokeW * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1f2937" strokeWidth={strokeW} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={strokeW} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)' }}
      />
    </svg>
  );
};

export const AIDecisionCard: React.FC<AIDecisionCardProps> = ({
  decision,
  onApprove,
  onReject,
  compact = false,
}) => {
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const agent = AI_AGENTS[decision.agent] || { name: decision.agent, description: '', icon: '🤖' };
  const typeConfig = DECISION_TYPE_CONFIG[decision.decision_type as keyof typeof DECISION_TYPE_CONFIG] || DECISION_TYPE_CONFIG.suggestion;
  const statusConfig = STATUS_CONFIG[decision.status];
  const pct = Math.round(normalizeScore(decision.confidence_score) * 100);
  const confConfig = getConfidenceConfig(decision.confidence_score);
  const agentColor = AGENT_COLOR[decision.agent] || 'text-gray-400 bg-gray-500/10 border-gray-500/25';
  const TypeIcon = typeConfig.icon;

  const handleApprove = async () => {
    if (!onApprove) return;
    setLoading(true);
    try { await onApprove(); } finally { setLoading(false); }
  };

  const handleReject = async () => {
    if (!onReject) return;
    setLoading(true);
    try { await onReject(); } finally { setLoading(false); }
  };

  if (compact) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 hover:border-gray-700 transition-colors">
        <div className="flex items-center gap-3">
          <div className={cn('w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0', typeConfig.bg)}>
            <TypeIcon size={15} className={typeConfig.color} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white truncate">{decision.title}</div>
            <div className="text-xs text-gray-500">{agent.icon} {agent.name}</div>
          </div>
          <div className={cn('text-xs font-bold px-2 py-1 rounded-lg', confConfig.bg, confConfig.color)}>
            {pct}%
          </div>
        </div>
      </div>
    );
  }

  const isPending = decision.status === 'pending';

  return (
    <div className={cn(
      'bg-gray-900 border rounded-2xl transition-all duration-200 group',
      isPending
        ? 'border-amber-500/20 hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/5'
        : 'border-gray-800 hover:border-gray-700'
    )}>
      <div className="p-5">
        <div className="flex items-start gap-4">

          {/* Left: confidence ring */}
          <div className="flex-shrink-0 flex flex-col items-center gap-0.5 relative">
            <ConfidenceRing pct={pct} color={confConfig.ring} size={52} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn('text-sm font-bold tabular-nums leading-none', confConfig.color)}>{pct}%</span>
            </div>
            <span className="text-[9px] text-gray-600 mt-1 whitespace-nowrap">{confConfig.label}</span>
          </div>

          {/* Middle: content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-semibold text-white text-sm leading-snug">{decision.title}</h3>
              <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded-full border whitespace-nowrap flex-shrink-0', statusConfig.color)}>
                {statusConfig.label}
              </span>
            </div>

            {/* Badges row */}
            <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
              <span className={cn('inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border', agentColor)}>
                <span className="text-[11px] leading-none">{agent.icon}</span>
                {agent.name}
              </span>
              <span className={cn('inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border', typeConfig.bg, typeConfig.color)}>
                <TypeIcon size={9} />
                {typeConfig.label}
              </span>
              {(() => {
                const provider = (decision.model_provider as AIProvider) || AI_AGENT_MODELS[decision.agent]?.provider;
                const providerInfo = provider ? AI_PROVIDERS[provider] : null;
                const modelLabel = decision.model_used || AI_AGENT_MODELS[decision.agent]?.label;
                if (providerInfo && modelLabel) {
                  return (
                    <span className={cn('inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border', providerInfo.color)}>
                      <span className="text-[10px] font-bold leading-none">{providerInfo.icon}</span>
                      {modelLabel}
                    </span>
                  );
                }
                return null;
              })()}
              <span className="inline-flex items-center gap-1 text-[11px] text-gray-600 px-1">
                <Clock size={9} />
                {new Date(decision.created_at).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <p className="text-sm text-gray-400 leading-relaxed line-clamp-2">{decision.description}</p>

            {/* Suggested action */}
            {decision.suggested_action && (
              <div className="mt-3 flex items-start gap-2 bg-gray-800/60 border border-gray-700/60 rounded-xl px-3 py-2.5">
                <ArrowRight size={13} className="text-gray-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-gray-300 leading-relaxed">{decision.suggested_action}</p>
              </div>
            )}
          </div>

          {/* Right: actions for pending */}
          {isPending && (onApprove || onReject) && (
            <div className="flex flex-col gap-2 flex-shrink-0">
              {onApprove && (
                <button
                  onClick={handleApprove}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-all disabled:opacity-40 shadow-sm whitespace-nowrap"
                >
                  <CheckCircle size={13} />
                  Approuver
                </button>
              )}
              {onReject && (
                <button
                  onClick={handleReject}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-800 hover:bg-red-500/15 border border-gray-700 hover:border-red-500/30 text-gray-400 hover:text-red-400 rounded-xl text-xs font-medium transition-all disabled:opacity-40 whitespace-nowrap"
                >
                  <XCircle size={13} />
                  Rejeter
                </button>
              )}
            </div>
          )}

          {/* Right: status icon for non-pending */}
          {!isPending && (
            <div className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-xl border border-gray-800">
              {decision.status === 'approved' && <CheckCircle size={16} className="text-green-400" />}
              {decision.status === 'auto_applied' && <Sparkles size={16} className="text-blue-400" />}
              {decision.status === 'rejected' && <XCircle size={16} className="text-red-400" />}
            </div>
          )}
        </div>
      </div>

      {/* Expandable detail */}
      {(decision.rationale || (decision.data_sources && decision.data_sources.length > 0)) && (
        <>
          <button
            onClick={() => setExpanded(e => !e)}
            className="w-full flex items-center gap-2 px-5 py-2 text-[11px] text-gray-600 hover:text-gray-400 border-t border-gray-800/60 transition-colors"
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {expanded ? 'Masquer le raisonnement' : 'Voir le raisonnement IA'}
          </button>

          {expanded && (
            <div className="px-5 pb-4 space-y-3 border-t border-gray-800/40">
              {decision.rationale && (
                <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 mt-3">
                  <div className="flex items-center gap-2 mb-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    <Zap size={11} className="text-blue-400" />
                    Raisonnement de l'IA
                  </div>
                  <p className="text-sm text-gray-400 leading-relaxed">{decision.rationale}</p>
                </div>
              )}
              {decision.data_sources && decision.data_sources.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-600 mb-2 font-medium uppercase tracking-wider">
                    <Database size={10} />
                    Sources utilisées
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {decision.data_sources.map((source, i) => (
                      <span key={i} className="text-[11px] bg-gray-800 border border-gray-700 text-gray-400 px-2.5 py-1 rounded-lg">
                        {source}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
