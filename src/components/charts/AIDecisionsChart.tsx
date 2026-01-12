import { useState, useEffect } from 'react';
import { Brain, Loader2, Sparkles, Target, TrendingUp, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AIMetric {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  description: string;
}

interface ActionBreakdown {
  action: string;
  count: number;
  percentage: number;
}

export function AIDecisionsChart() {
  const [metrics, setMetrics] = useState<AIMetric[]>([]);
  const [actions, setActions] = useState<ActionBreakdown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: leads, error } = await supabase
          .from('crm_leads')
          .select('ai_recommended_action, ai_score, needs_followup, status');

        if (error) throw error;

        const withRecommendations = leads?.filter(l => l.ai_recommended_action) || [];
        const withScore = leads?.filter(l => l.ai_score !== null) || [];
        const needsFollowup = leads?.filter(l => l.needs_followup) || [];
        const avgScore = withScore.length > 0
          ? Math.round(withScore.reduce((sum, l) => sum + (l.ai_score || 0), 0) / withScore.length)
          : 0;

        setMetrics([
          {
            label: 'Recommandations IA',
            value: withRecommendations.length,
            icon: Sparkles,
            color: 'text-cyan-400',
            description: 'Leads avec actions recommandées',
          },
          {
            label: 'Score moyen',
            value: avgScore,
            icon: Target,
            color: 'text-green-400',
            description: 'Score de qualification IA',
          },
          {
            label: 'Suivis requis',
            value: needsFollowup.length,
            icon: TrendingUp,
            color: 'text-orange-400',
            description: 'Leads nécessitant un suivi',
          },
          {
            label: 'Taux analyse',
            value: leads?.length ? Math.round((withRecommendations.length / leads.length) * 100) : 0,
            icon: AlertCircle,
            color: 'text-blue-400',
            description: '% de leads analysés par IA',
          },
        ]);

        const actionCounts: Record<string, number> = {};
        withRecommendations.forEach(lead => {
          const action = lead.ai_recommended_action || 'unknown';
          actionCounts[action] = (actionCounts[action] || 0) + 1;
        });

        const total = withRecommendations.length || 1;
        const actionBreakdown: ActionBreakdown[] = Object.entries(actionCounts)
          .map(([action, count]) => ({
            action: formatAction(action),
            count,
            percentage: Math.round((count / total) * 100),
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        setActions(actionBreakdown);
      } catch (err) {
        console.error('Error fetching AI decisions:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  function formatAction(action: string): string {
    const actionLabels: Record<string, string> = {
      'call_back': 'Rappeler',
      'send_quote': 'Envoyer devis',
      'request_documents': 'Demander documents',
      'schedule_followup': 'Planifier suivi',
      'send_email': 'Envoyer email',
      'mark_qualified': 'Qualifier',
      'escalate': 'Escalader',
    };
    return actionLabels[action] || action.replace(/_/g, ' ');
  }

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <div className="flex items-center gap-3 mb-6">
          <Brain className="w-5 h-5 text-cyan-500" />
          <h3 className="text-lg font-semibold text-white">Décisions IA</h3>
        </div>
        <div className="h-80 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Brain className="w-5 h-5 text-cyan-500" />
          <h3 className="text-lg font-semibold text-white">Décisions IA</h3>
        </div>
        <span className="px-3 py-1 bg-cyan-500/20 text-cyan-400 text-xs font-medium rounded-full">
          Actif
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div
              key={metric.label}
              className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50"
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-4 h-4 ${metric.color}`} />
                <span className="text-xs text-gray-400">{metric.label}</span>
              </div>
              <p className={`text-2xl font-bold ${metric.color}`}>
                {metric.value}{metric.label.includes('Taux') || metric.label.includes('Score') ? '%' : ''}
              </p>
              <p className="text-xs text-gray-500 mt-1">{metric.description}</p>
            </div>
          );
        })}
      </div>

      {actions.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-3">Actions recommandées</h4>
          <div className="space-y-2">
            {actions.map((action, index) => (
              <div key={action.action} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center text-xs font-bold text-white">
                  {index + 1}
                </div>
                <span className="text-sm text-gray-300 flex-1">{action.action}</span>
                <span className="text-sm font-medium text-white">{action.count}</span>
                <div className="w-16 h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                    style={{ width: `${action.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {actions.length === 0 && (
        <div className="text-center py-6">
          <Brain className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">Aucune action IA enregistrée</p>
          <p className="text-xs text-gray-500 mt-1">Les recommandations apparaîtront ici</p>
        </div>
      )}
    </div>
  );
}
