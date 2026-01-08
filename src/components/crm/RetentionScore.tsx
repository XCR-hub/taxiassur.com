import React from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from 'lucide-react';
import { RetentionScore as RetentionScoreType } from '@/lib/crm-retention';
import { cn } from '@/lib/utils';

interface RetentionScoreProps {
  score: RetentionScoreType;
  compact?: boolean;
}

const RISK_LEVEL_CONFIG = {
  low: {
    icon: CheckCircle,
    color: 'text-green-600 bg-green-100 border-green-300',
    label: 'Risque Faible',
    gradient: 'from-green-500 to-emerald-600'
  },
  medium: {
    icon: AlertTriangle,
    color: 'text-yellow-600 bg-yellow-100 border-yellow-300',
    label: 'Risque Moyen',
    gradient: 'from-yellow-500 to-orange-500'
  },
  high: {
    icon: TrendingDown,
    color: 'text-orange-600 bg-orange-100 border-orange-300',
    label: 'Risque Élevé',
    gradient: 'from-orange-500 to-red-500'
  },
  critical: {
    icon: AlertTriangle,
    color: 'text-red-600 bg-red-100 border-red-300',
    label: 'Risque Critique',
    gradient: 'from-red-500 to-red-700'
  }
};

export const RetentionScore: React.FC<RetentionScoreProps> = ({ score, compact }) => {
  const riskConfig = RISK_LEVEL_CONFIG[score.churn_risk_level];
  const RiskIcon = riskConfig.icon;

  const getScoreColor = (value: number) => {
    if (value >= 80) return 'text-green-600';
    if (value >= 60) return 'text-yellow-600';
    if (value >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <div className="relative w-16 h-16">
          <svg className="w-16 h-16 transform -rotate-90">
            <circle
              cx="32"
              cy="32"
              r="28"
              stroke="currentColor"
              strokeWidth="6"
              fill="none"
              className="text-gray-200"
            />
            <circle
              cx="32"
              cy="32"
              r="28"
              stroke="currentColor"
              strokeWidth="6"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 28}`}
              strokeDashoffset={`${2 * Math.PI * 28 * (1 - score.overall_score / 100)}`}
              className={cn(
                getScoreColor(score.overall_score),
                'transition-all duration-500'
              )}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={cn('text-lg font-bold', getScoreColor(score.overall_score))}>
              {score.overall_score}
            </span>
          </div>
        </div>

        <div>
          <div className="font-semibold text-gray-900 mb-1">Score de Rétention</div>
          <div className={cn('flex items-center gap-1 text-sm font-medium', riskConfig.color)}>
            <RiskIcon size={14} />
            {riskConfig.label}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 p-6 shadow-sm">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-1">Score de Rétention</h3>
          <p className="text-sm text-gray-600">
            Mis à jour le {new Date(score.last_calculated).toLocaleDateString('fr-FR')}
          </p>
        </div>

        <div className={cn('flex items-center gap-2 px-4 py-2 rounded-lg border-2 font-semibold', riskConfig.color)}>
          <RiskIcon size={18} />
          {riskConfig.label}
        </div>
      </div>

      <div className="relative mb-6">
        <div className="flex items-center justify-center">
          <div className="relative w-40 h-40">
            <svg className="w-40 h-40 transform -rotate-90">
              <defs>
                <linearGradient id={`gradient-${score.lead_id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" className="text-blue-500" style={{ stopColor: 'currentColor' }} />
                  <stop offset="100%" className="text-green-500" style={{ stopColor: 'currentColor' }} />
                </linearGradient>
              </defs>
              <circle
                cx="80"
                cy="80"
                r="70"
                stroke="currentColor"
                strokeWidth="12"
                fill="none"
                className="text-gray-200"
              />
              <circle
                cx="80"
                cy="80"
                r="70"
                stroke={`url(#gradient-${score.lead_id})`}
                strokeWidth="12"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 70}`}
                strokeDashoffset={`${2 * Math.PI * 70 * (1 - score.overall_score / 100)}`}
                className="transition-all duration-1000"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn('text-4xl font-bold', getScoreColor(score.overall_score))}>
                {score.overall_score}
              </span>
              <span className="text-sm text-gray-600">/ 100</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className={cn('text-2xl font-bold mb-1', getScoreColor(score.engagement_score))}>
            {score.engagement_score}
          </div>
          <div className="text-xs text-gray-600">Engagement</div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className={cn('text-2xl font-bold mb-1', getScoreColor(score.satisfaction_score))}>
            {score.satisfaction_score}
          </div>
          <div className="text-xs text-gray-600">Satisfaction</div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className={cn('text-2xl font-bold mb-1', getScoreColor(score.payment_score))}>
            {score.payment_score}
          </div>
          <div className="text-xs text-gray-600">Paiements</div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className={cn('text-2xl font-bold mb-1', getScoreColor(score.claims_score))}>
            {score.claims_score}
          </div>
          <div className="text-xs text-gray-600">Sinistres</div>
        </div>
      </div>

      {score.factors && score.factors.length > 0 && (
        <div>
          <h4 className="font-semibold text-sm text-gray-900 mb-3">Facteurs Principaux</h4>
          <div className="space-y-2">
            {score.factors.slice(0, 5).map((factor, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {factor.positive ? (
                    <TrendingUp size={14} className="text-green-600" />
                  ) : (
                    <TrendingDown size={14} className="text-red-600" />
                  )}
                  <span className="text-sm text-gray-700">{factor.name}</span>
                </div>
                <span className={cn(
                  'text-sm font-medium',
                  factor.positive ? 'text-green-600' : 'text-red-600'
                )}>
                  {factor.positive ? '+' : ''}{factor.impact}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Probabilité de churn</span>
          <span className={cn('font-bold', getScoreColor(100 - score.churn_probability * 100))}>
            {Math.round(score.churn_probability * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
};
