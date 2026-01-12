import React, { useEffect, useState } from 'react';
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Lightbulb,
  Target,
  Zap,
  ThermometerSun,
  PhoneCall,
  Mail,
  FileText,
  Calendar,
  ArrowRight
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface LeadIntelligencePanelProps {
  leadId: string;
  leadStatus: string;
  leadData: {
    created_at: string;
    last_contact_at?: string;
    email?: string;
    phone?: string;
    quality_score?: number;
  };
  documentsComplete: boolean;
  hasQuotes: boolean;
  onSuggestedAction?: (action: string) => void;
}

interface AIInsight {
  type: 'warning' | 'success' | 'info' | 'action';
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: string;
  actionLabel?: string;
  priority: number;
}

export const LeadIntelligencePanel: React.FC<LeadIntelligencePanelProps> = ({
  leadId,
  leadStatus,
  leadData,
  documentsComplete,
  hasQuotes,
  onSuggestedAction
}) => {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [nextBestAction, setNextBestAction] = useState<string>('');
  const [conversionProbability, setConversionProbability] = useState<number>(0);
  const [engagementScore, setEngagementScore] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyzeLeadIntelligence();
  }, [leadId, leadStatus, documentsComplete, hasQuotes]);

  const analyzeLeadIntelligence = async () => {
    setLoading(true);
    const newInsights: AIInsight[] = [];

    const daysSinceCreation = Math.floor(
      (Date.now() - new Date(leadData.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );

    const daysSinceLastContact = leadData.last_contact_at
      ? Math.floor(
          (Date.now() - new Date(leadData.last_contact_at).getTime()) / (1000 * 60 * 60 * 24)
        )
      : daysSinceCreation;

    let baseScore = leadData.quality_score || 50;
    let engagement = 50;

    if (daysSinceLastContact > 7) {
      newInsights.push({
        type: 'warning',
        icon: <Clock className="w-5 h-5" />,
        title: 'Relance urgente',
        description: `Pas de contact depuis ${daysSinceLastContact} jours. Risque de perte du lead.`,
        action: 'send_followup',
        actionLabel: 'Envoyer relance',
        priority: 1
      });
      baseScore -= 15;
      engagement -= 20;
    } else if (daysSinceLastContact > 3) {
      newInsights.push({
        type: 'info',
        icon: <PhoneCall className="w-5 h-5" />,
        title: 'Contact recommande',
        description: `${daysSinceLastContact} jours sans contact. Un appel ou email serait benefique.`,
        action: 'contact',
        actionLabel: 'Contacter',
        priority: 2
      });
    }

    if (leadStatus === 'new' && daysSinceCreation > 1) {
      newInsights.push({
        type: 'action',
        icon: <Zap className="w-5 h-5" />,
        title: 'Premier contact',
        description: 'Ce lead n\'a pas encore ete contacte. Priorite haute.',
        action: 'first_contact',
        actionLabel: 'Appeler maintenant',
        priority: 1
      });
      setNextBestAction('Premier contact telephonique');
    }

    if (leadStatus === 'contacted' && !documentsComplete) {
      newInsights.push({
        type: 'action',
        icon: <FileText className="w-5 h-5" />,
        title: 'Documents manquants',
        description: 'Demandez les documents pour avancer vers le devis.',
        action: 'request_docs',
        actionLabel: 'Demander documents',
        priority: 2
      });
      setNextBestAction('Collecter les documents');
      baseScore -= 10;
    }

    if (documentsComplete && !hasQuotes) {
      newInsights.push({
        type: 'success',
        icon: <Target className="w-5 h-5" />,
        title: 'Pret pour devis',
        description: 'Tous les documents sont complets. Contactez les compagnies !',
        action: 'create_quote',
        actionLabel: 'Generer devis',
        priority: 1
      });
      setNextBestAction('Contacter les compagnies pour devis');
      baseScore += 20;
      engagement += 30;
    }

    if (hasQuotes && leadStatus !== 'won' && leadStatus !== 'signed') {
      newInsights.push({
        type: 'info',
        icon: <Calendar className="w-5 h-5" />,
        title: 'Suivi devis',
        description: 'Des devis ont ete envoyes. Planifiez un suivi.',
        action: 'followup_quote',
        actionLabel: 'Planifier suivi',
        priority: 2
      });
      setNextBestAction('Relancer sur les devis');
      baseScore += 10;
    }

    if (leadStatus === 'qualified') {
      baseScore += 15;
      engagement += 15;
    }

    if (leadStatus === 'quote_sent') {
      baseScore += 25;
      engagement += 25;
    }

    if (leadStatus === 'negotiation') {
      baseScore += 35;
      engagement += 40;
      newInsights.push({
        type: 'success',
        icon: <TrendingUp className="w-5 h-5" />,
        title: 'Forte probabilite',
        description: 'Ce lead est en phase finale. Concentrez vos efforts !',
        priority: 3
      });
    }

    if (newInsights.length === 0) {
      newInsights.push({
        type: 'success',
        icon: <CheckCircle className="w-5 h-5" />,
        title: 'Tout est en ordre',
        description: 'Ce lead est bien suivi. Continuez ainsi !',
        priority: 5
      });
    }

    newInsights.sort((a, b) => a.priority - b.priority);
    setInsights(newInsights);
    setConversionProbability(Math.min(95, Math.max(5, baseScore)));
    setEngagementScore(Math.min(100, Math.max(0, engagement)));
    setLoading(false);
  };

  const getConversionColor = (prob: number) => {
    if (prob >= 70) return 'from-green-500 to-emerald-500';
    if (prob >= 40) return 'from-yellow-500 to-orange-500';
    return 'from-red-500 to-pink-500';
  };

  const getEngagementColor = (score: number) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <Brain className="w-6 h-6 text-cyan-400 animate-pulse" />
          <span className="font-semibold">Analyse en cours...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 text-white shadow-xl border border-slate-700">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-cyan-500/20 rounded-lg">
          <Brain className="w-6 h-6 text-cyan-400" />
        </div>
        <div>
          <h3 className="font-bold text-lg">Intelligence Lead</h3>
          <p className="text-slate-400 text-sm">Analyse et recommandations IA</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-700/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Probabilite conversion</span>
            <ThermometerSun className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold">{conversionProbability}%</span>
          </div>
          <div className="mt-2 h-2 bg-slate-600 rounded-full overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r ${getConversionColor(conversionProbability)} transition-all duration-500`}
              style={{ width: `${conversionProbability}%` }}
            />
          </div>
        </div>

        <div className="bg-slate-700/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Score engagement</span>
            <TrendingUp className={`w-4 h-4 ${getEngagementColor(engagementScore)}`} />
          </div>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold">{engagementScore}</span>
            <span className="text-slate-400 text-sm mb-1">/100</span>
          </div>
          <div className="mt-2 h-2 bg-slate-600 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500"
              style={{ width: `${engagementScore}%` }}
            />
          </div>
        </div>
      </div>

      {nextBestAction && (
        <div className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="w-5 h-5 text-cyan-400" />
            <span className="font-semibold text-cyan-300">Prochaine action recommandee</span>
          </div>
          <p className="text-white font-medium">{nextBestAction}</p>
        </div>
      )}

      <div className="space-y-3">
        <h4 className="font-semibold text-slate-300 flex items-center gap-2">
          <Target className="w-4 h-4" />
          Insights
        </h4>
        {insights.map((insight, index) => (
          <div
            key={index}
            className={`rounded-lg p-4 border ${
              insight.type === 'warning'
                ? 'bg-orange-500/10 border-orange-500/30'
                : insight.type === 'success'
                ? 'bg-green-500/10 border-green-500/30'
                : insight.type === 'action'
                ? 'bg-blue-500/10 border-blue-500/30'
                : 'bg-slate-700/50 border-slate-600'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded-lg ${
                  insight.type === 'warning'
                    ? 'bg-orange-500/20 text-orange-400'
                    : insight.type === 'success'
                    ? 'bg-green-500/20 text-green-400'
                    : insight.type === 'action'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-slate-600 text-slate-300'
                }`}
              >
                {insight.icon}
              </div>
              <div className="flex-1">
                <h5 className="font-semibold text-white mb-1">{insight.title}</h5>
                <p className="text-slate-400 text-sm">{insight.description}</p>
                {insight.action && insight.actionLabel && onSuggestedAction && (
                  <button
                    onClick={() => onSuggestedAction(insight.action!)}
                    className={`mt-3 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
                      insight.type === 'warning'
                        ? 'bg-orange-500 hover:bg-orange-600 text-white'
                        : insight.type === 'action'
                        ? 'bg-blue-500 hover:bg-blue-600 text-white'
                        : 'bg-green-500 hover:bg-green-600 text-white'
                    }`}
                  >
                    {insight.actionLabel}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LeadIntelligencePanel;
