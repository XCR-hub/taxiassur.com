import React, { useState } from 'react';
import { Bot, CheckCircle, XCircle, AlertTriangle, TrendingUp, Lightbulb, Clock } from 'lucide-react';
import { AIDecision, AI_AGENTS } from '@/lib/crm-ai-governance';
import { cn } from '@/lib/utils';

interface AIDecisionCardProps {
  decision: AIDecision;
  onApprove?: () => Promise<void>;
  onReject?: () => Promise<void>;
  compact?: boolean;
}

const DECISION_TYPE_ICONS = {
  suggestion: Lightbulb,
  automation: Bot,
  alert: AlertTriangle,
  prediction: TrendingUp
};

const DECISION_TYPE_COLORS = {
  suggestion: 'bg-blue-100 text-blue-700 border-blue-200',
  automation: 'bg-purple-100 text-purple-700 border-purple-200',
  alert: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  prediction: 'bg-green-100 text-green-700 border-green-200'
};

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  auto_applied: 'bg-blue-100 text-blue-800'
};

export const AIDecisionCard: React.FC<AIDecisionCardProps> = ({
  decision,
  onApprove,
  onReject,
  compact = false
}) => {
  const [loading, setLoading] = useState(false);
  const agent = AI_AGENTS[decision.agent];
  const TypeIcon = DECISION_TYPE_ICONS[decision.decision_type];
  const typeColor = DECISION_TYPE_COLORS[decision.decision_type];

  const handleApprove = async () => {
    if (!onApprove) return;
    setLoading(true);
    try {
      await onApprove();
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!onReject) return;
    setLoading(true);
    try {
      await onReject();
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600 bg-green-100';
    if (score >= 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-orange-600 bg-orange-100';
  };

  if (compact) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-3 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-2 flex-1">
            <div className={cn('w-8 h-8 rounded-lg border flex items-center justify-center', typeColor)}>
              <TypeIcon size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm text-gray-900 truncate">{decision.title}</h4>
              <p className="text-xs text-gray-600 mt-0.5">{agent.name}</p>
            </div>
          </div>
          <div className={cn('text-xs font-medium px-2 py-1 rounded-full', getConfidenceColor(decision.confidence_score))}>
            {Math.round(decision.confidence_score * 100)}%
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border-2 border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          <div className={cn('w-12 h-12 rounded-xl border-2 flex items-center justify-center', typeColor)}>
            <TypeIcon size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-gray-900">{decision.title}</h3>
              <span className={cn('text-xs font-medium px-2 py-1 rounded-full', STATUS_COLORS[decision.status])}>
                {decision.status === 'pending' && 'En attente'}
                {decision.status === 'approved' && 'Approuvé'}
                {decision.status === 'rejected' && 'Rejeté'}
                {decision.status === 'auto_applied' && 'Auto-appliqué'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>{agent.icon} {agent.name}</span>
              <span>•</span>
              <span className="capitalize">{decision.decision_type}</span>
            </div>
          </div>
        </div>

        <div className={cn('text-center px-3 py-2 rounded-lg border-2', getConfidenceColor(decision.confidence_score))}>
          <div className="text-xs font-medium">Confiance</div>
          <div className="text-lg font-bold">{Math.round(decision.confidence_score * 100)}%</div>
        </div>
      </div>

      <p className="text-gray-700 mb-4">{decision.description}</p>

      {decision.rationale && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
          <h4 className="font-semibold text-sm text-gray-900 mb-2 flex items-center">
            <Bot size={16} className="mr-2" />
            Raisonnement de l'IA
          </h4>
          <p className="text-sm text-gray-700">{decision.rationale}</p>
        </div>
      )}

      {decision.suggested_action && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <h4 className="font-semibold text-sm text-blue-900 mb-2">Action suggérée</h4>
          <p className="text-sm text-blue-800">{decision.suggested_action}</p>
        </div>
      )}

      {decision.data_sources && decision.data_sources.length > 0 && (
        <div className="mb-4">
          <h4 className="font-semibold text-xs text-gray-700 mb-2">Sources de données</h4>
          <div className="flex flex-wrap gap-2">
            {decision.data_sources.map((source, index) => (
              <span key={index} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                {source}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="flex items-center text-xs text-gray-500">
          <Clock size={12} className="mr-1" />
          {new Date(decision.created_at).toLocaleString('fr-FR')}
        </div>

        {decision.status === 'pending' && (onApprove || onReject) && (
          <div className="flex gap-2">
            {onReject && (
              <button
                onClick={handleReject}
                disabled={loading}
                className="px-4 py-2 bg-red-100 text-red-700 rounded-lg font-medium text-sm hover:bg-red-200 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <XCircle size={16} />
                Rejeter
              </button>
            )}
            {onApprove && (
              <button
                onClick={handleApprove}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium text-sm hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <CheckCircle size={16} />
                Approuver
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
