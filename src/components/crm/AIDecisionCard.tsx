import React, { useState } from 'react';
import {
  Bot, CheckCircle, XCircle, AlertTriangle, TrendingUp,
  Lightbulb, Clock, Zap, Database, ChevronDown, ChevronUp
} from 'lucide-react';
import { AIDecision, AI_AGENTS } from '@/lib/crm-ai-governance';
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
  },
  automation: {
    icon: Bot,
    label: 'Automation',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10 border-cyan-500/25',
  },
  alert: {
    icon: AlertTriangle,
    label: 'Alerte',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/25',
  },
  prediction: {
    icon: TrendingUp,
    label: 'Prédiction',
    color: 'text-green-400',
    bg: 'bg-green-500/10 border-green-500/25',
  },
};

const STATUS_CONFIG = {
  pending: { label: 'En attente', color: 'text-amber-400 bg-amber-500/10 border-amber-500/25' },
  approved: { label: 'Approuvée', color: 'text-green-400 bg-green-500/10 border-green-500/25' },
  rejected: { label: 'Rejetée', color: 'text-red-400 bg-red-500/10 border-red-500/25' },
  auto_applied: { label: 'Auto-appliquée', color: 'text-blue-400 bg-blue-500/10 border-blue-500/25' },
};

const normalizeScore = (score: number) => (score > 1 ? score / 100 : score);

const getConfidenceConfig = (score: number) => {
  const s = normalizeScore(score);
  if (s >= 0.8) return { color: 'text-green-400', bar: 'bg-green-500', bg: 'bg-green-500/10' };
  if (s >= 0.6) return { color: 'text-amber-400', bar: 'bg-amber-500', bg: 'bg-amber-500/10' };
  return { color: 'text-orange-400', bar: 'bg-orange-500', bg: 'bg-orange-500/10' };
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
  const confidenceConfig = getConfidenceConfig(decision.confidence_score);
  const TypeIcon = typeConfig.icon;
  const pct = Math.round(normalizeScore(decision.confidence_score) * 100);

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
          <div className={cn('text-xs font-bold px-2 py-1 rounded-lg', confidenceConfig.bg, confidenceConfig.color)}>
            {pct}%
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      'bg-gray-900 border rounded-2xl transition-all',
      decision.status === 'pending'
        ? 'border-amber-500/20 hover:border-amber-500/35'
        : 'border-gray-800 hover:border-gray-700'
    )}>
      {/* Card header */}
      <div className="p-5">
        <div className="flex items-start gap-4">

          {/* Type icon */}
          <div className={cn('w-11 h-11 rounded-xl border flex items-center justify-center flex-shrink-0 mt-0.5', typeConfig.bg)}>
            <TypeIcon size={20} className={typeConfig.color} />
          </div>

          {/* Title + meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 mb-1.5">
              <h3 className="font-semibold text-white leading-snug">{decision.title}</h3>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full border', statusConfig.color)}>
                  {statusConfig.label}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <span>{agent.icon}</span>
                <span>{agent.name}</span>
              </span>
              <span>·</span>
              <span className={cn('font-medium', typeConfig.color)}>{typeConfig.label}</span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Clock size={10} />
                {new Date(decision.created_at).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>

          {/* Confidence meter */}
          <div className={cn('flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl border', confidenceConfig.bg, 'border-gray-700/50')}>
            <div className={cn('text-xl font-bold tabular-nums leading-none', confidenceConfig.color)}>{pct}%</div>
            <div className="text-[10px] text-gray-600 whitespace-nowrap">confiance</div>
            <div className="w-10 h-1 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', confidenceConfig.bar)}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-400 mt-3 leading-relaxed">{decision.description}</p>

        {/* Suggested action pill */}
        {decision.suggested_action && (
          <div className="mt-3 flex items-start gap-2 bg-blue-500/8 border border-blue-500/20 rounded-xl px-4 py-3">
            <Zap size={14} className="text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-300">{decision.suggested_action}</p>
          </div>
        )}
      </div>

      {/* Expandable detail */}
      {(decision.rationale || (decision.data_sources && decision.data_sources.length > 0)) && (
        <>
          <button
            onClick={() => setExpanded(e => !e)}
            className="w-full flex items-center gap-2 px-5 py-2.5 text-xs text-gray-600 hover:text-gray-400 border-t border-gray-800/60 transition-colors"
          >
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {expanded ? 'Masquer le détail' : 'Voir le raisonnement IA'}
          </button>

          {expanded && (
            <div className="px-5 pb-4 space-y-3 border-t border-gray-800/60">
              {decision.rationale && (
                <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 mt-3">
                  <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-gray-400">
                    <Bot size={13} />
                    Raisonnement de l'IA
                  </div>
                  <p className="text-sm text-gray-400 leading-relaxed">{decision.rationale}</p>
                </div>
              )}

              {decision.data_sources && decision.data_sources.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-2">
                    <Database size={11} />
                    Sources de données
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {decision.data_sources.map((source, i) => (
                      <span key={i} className="text-xs bg-gray-800 border border-gray-700 text-gray-400 px-2.5 py-1 rounded-lg">
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

      {/* Action footer — only when pending */}
      {decision.status === 'pending' && (onApprove || onReject) && (
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-800/60">
          {onReject && (
            <button
              onClick={handleReject}
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-40"
            >
              <XCircle size={15} />
              Rejeter
            </button>
          )}
          {onApprove && (
            <button
              onClick={handleApprove}
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-40 shadow-sm"
            >
              <CheckCircle size={15} />
              Approuver
            </button>
          )}
        </div>
      )}
    </div>
  );
};
