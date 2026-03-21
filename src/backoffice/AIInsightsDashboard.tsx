import React, { useEffect, useState } from 'react';
import { toast } from '@/lib/toast';
import {
  Brain,
  TrendingUp,
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  BarChart3,
  Lightbulb,
  Target,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Play,
  Pause,
  Eye,
  ArrowRight
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface AIPattern {
  id: string;
  pattern_name: string;
  pattern_type: string;
  title: string;
  description: string;
  confidence_score: number;
  success_rate: number;
  sample_size: number;
  status: string;
  times_observed: number;
  created_at: string;
}

interface AIWorkflowSuggestion {
  id: string;
  title: string;
  description: string;
  trigger_event: string;
  suggested_actions: any[];
  predicted_success_rate: number;
  workflow_priority: number;
  status: string;
  times_triggered: number;
  times_successful: number;
  created_at: string;
}

interface AIStats {
  events_captured: number;
  events_analyzed: number;
  patterns_detected: number;
  suggestions_pending: number;
  suggestions_active: number;
}

const AIInsightsDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [patterns, setPatterns] = useState<AIPattern[]>([]);
  const [suggestions, setSuggestions] = useState<AIWorkflowSuggestion[]>([]);
  const [stats, setStats] = useState<AIStats | null>(null);
  const [selectedTab, setSelectedTab] = useState<'patterns' | 'suggestions'>('suggestions');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Stats
      const { data: statsData } = await supabase.rpc('get_crm_ai_learning_stats');
      setStats(statsData);

      // Patterns
      const { data: patternsData } = await supabase
        .from('crm_ai_patterns')
        .select('*')
        .order('confidence_score', { ascending: false })
        .limit(20);
      setPatterns(patternsData || []);

      // Suggestions
      const { data: suggestionsData } = await supabase
        .from('crm_ai_workflow_suggestions')
        .select('*')
        .order('workflow_priority', { ascending: false })
        .limit(20);
      setSuggestions(suggestionsData || []);
    } catch (error) {
      console.error('Error loading AI data:', error);
    } finally {
      setLoading(false);
    }
  };

  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-pattern-analyzer', {
        body: {}
      });

      if (error) throw error;

      toast.success(`✅ Analyse terminée !\n\n${data.patterns_detected} patterns détectés\n${data.suggestions_created} suggestions créées`);
      await loadData();
    } catch (error) {
      console.error('Error running analysis:', error);
      toast.error('❌ Erreur lors de l\'analyse');
    } finally {
      setAnalyzing(false);
    }
  };

  const acceptSuggestion = async (id: string) => {
    try {
      await supabase
        .from('crm_ai_workflow_suggestions')
        .update({ status: 'approved' })
        .eq('id', id);

      toast.success('✅ Suggestion acceptée ! Vous pouvez maintenant l\'implémenter dans les automatisations.');
      await loadData();
    } catch (error) {
      console.error('Error accepting suggestion:', error);
    }
  };

  const rejectSuggestion = async (id: string) => {
    const reason = prompt('Pourquoi rejeter cette suggestion ?');
    if (!reason) return;

    try {
      await supabase
        .from('crm_ai_workflow_suggestions')
        .update({ status: 'rejected', rejection_reason: reason })
        .eq('id', id);

      await loadData();
    } catch (error) {
      console.error('Error rejecting suggestion:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'detected': return 'bg-blue-100 text-blue-700';
      case 'validated': return 'bg-green-100 text-green-700';
      case 'active': return 'bg-emerald-100 text-emerald-700';
      case 'suggested': return 'bg-yellow-100 text-yellow-700';
      case 'approved': return 'bg-green-100 text-green-700';
      case 'implemented': return 'bg-emerald-100 text-emerald-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getPatternTypeIcon = (type: string) => {
    switch (type) {
      case 'timing': return <Clock className="w-5 h-5" />;
      case 'sequence': return <ArrowRight className="w-5 h-5" />;
      case 'behavior': return <Target className="w-5 h-5" />;
      default: return <Brain className="w-5 h-5" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Brain className="w-8 h-8 text-purple-600" />
              IA Autoapprenante - Insights Commerciaux
            </h1>
            <p className="text-gray-600 mt-1">
              L'IA analyse vos interactions et propose des automatisations intelligentes
            </p>
          </div>
          <button
            onClick={runAnalysis}
            disabled={analyzing}
            className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 font-medium"
          >
            <RefreshCw className={`w-5 h-5 ${analyzing ? 'animate-spin' : ''}`} />
            {analyzing ? 'Analyse en cours...' : 'Analyser maintenant'}
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-5 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Événements capturés</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.events_captured.toLocaleString()}</p>
                </div>
                <BarChart3 className="w-8 h-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Événements analysés</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.events_analyzed.toLocaleString()}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Patterns détectés</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.patterns_detected}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Suggestions IA</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.suggestions_pending}</p>
                </div>
                <Lightbulb className="w-8 h-8 text-yellow-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Actives</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.suggestions_active}</p>
                </div>
                <Zap className="w-8 h-8 text-emerald-600" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setSelectedTab('suggestions')}
          className={`px-6 py-3 rounded-lg font-medium transition ${
            selectedTab === 'suggestions'
              ? 'bg-white text-purple-600 border-2 border-purple-600'
              : 'bg-white text-gray-700 border border-gray-300 hover:border-purple-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5" />
            Suggestions de workflows ({suggestions.filter(s => s.status === 'suggested').length})
          </div>
        </button>
        <button
          onClick={() => setSelectedTab('patterns')}
          className={`px-6 py-3 rounded-lg font-medium transition ${
            selectedTab === 'patterns'
              ? 'bg-white text-purple-600 border-2 border-purple-600'
              : 'bg-white text-gray-700 border border-gray-300 hover:border-purple-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Patterns détectés ({patterns.length})
          </div>
        </button>
      </div>

      {/* Content */}
      {selectedTab === 'suggestions' ? (
        <div className="space-y-4">
          {suggestions.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <Lightbulb className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucune suggestion pour l'instant</h3>
              <p className="text-gray-600 mb-4">
                L'IA a besoin de plus de données pour détecter des patterns et proposer des automatisations.
              </p>
              <button
                onClick={runAnalysis}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
              >
                Lancer l'analyse
              </button>
            </div>
          ) : (
            suggestions.map((suggestion) => (
              <div key={suggestion.id} className="bg-white rounded-lg border-2 border-purple-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Lightbulb className="w-6 h-6 text-yellow-500" />
                      <h3 className="text-xl font-bold text-gray-900">{suggestion.title}</h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(suggestion.status)}`}>
                        {suggestion.status}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-sm font-medium">
                          Priorité {suggestion.workflow_priority}/10
                        </span>
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm font-medium">
                          {suggestion.predicted_success_rate?.toFixed(0)}% succès prévu
                        </span>
                      </div>
                    </div>
                    <p className="text-gray-700 mb-3">{suggestion.description}</p>

                    {/* Actions suggérées */}
                    <div className="bg-purple-50 rounded-lg p-4 mb-3">
                      <p className="text-sm font-semibold text-gray-700 mb-2">Actions automatiques suggérées :</p>
                      <ul className="space-y-2">
                        {suggestion.suggested_actions.map((action: any, idx: number) => (
                          <li key={idx} className="flex items-start gap-2">
                            <Zap className="w-4 h-4 text-purple-600 mt-0.5" />
                            <span className="text-sm text-gray-700">
                              <strong>{action.type}</strong> : {action.reason || JSON.stringify(action)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Trigger */}
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Play className="w-4 h-4" />
                      <span>Déclenché par : <strong>{suggestion.trigger_event}</strong></span>
                    </div>
                  </div>
                </div>

                {suggestion.status === 'suggested' && (
                  <div className="flex gap-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => acceptSuggestion(suggestion.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
                    >
                      <ThumbsUp className="w-4 h-4" />
                      Accepter et implémenter
                    </button>
                    <button
                      onClick={() => rejectSuggestion(suggestion.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
                    >
                      <ThumbsDown className="w-4 h-4" />
                      Rejeter
                    </button>
                  </div>
                )}

                {suggestion.status === 'approved' && (
                  <div className="pt-4 border-t border-gray-200">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <p className="text-sm text-blue-800">
                        ✅ Suggestion approuvée ! Allez dans "Automatisations" pour créer la règle.
                      </p>
                    </div>
                  </div>
                )}

                {suggestion.times_triggered > 0 && (
                  <div className="pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{suggestion.times_triggered}</p>
                        <p className="text-sm text-gray-600">Fois déclenchée</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-600">{suggestion.times_successful}</p>
                        <p className="text-sm text-gray-600">Succès</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-purple-600">
                          {suggestion.times_triggered > 0
                            ? ((suggestion.times_successful / suggestion.times_triggered) * 100).toFixed(0)
                            : 0}%
                        </p>
                        <p className="text-sm text-gray-600">Taux de succès réel</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {patterns.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucun pattern détecté</h3>
              <p className="text-gray-600">L'IA a besoin de plus de données pour identifier des patterns.</p>
            </div>
          ) : (
            patterns.map((pattern) => (
              <div key={pattern.id} className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {getPatternTypeIcon(pattern.pattern_type)}
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{pattern.title}</h3>
                      <p className="text-sm text-gray-600">Type : {pattern.pattern_type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(pattern.status)}`}>
                      {pattern.status}
                    </span>
                  </div>
                </div>

                <p className="text-gray-700 mb-4">{pattern.description}</p>

                <div className="grid grid-cols-4 gap-4 bg-gray-50 rounded-lg p-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Confiance</p>
                    <p className="text-xl font-bold text-blue-600">{pattern.confidence_score.toFixed(0)}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Taux de succès</p>
                    <p className="text-xl font-bold text-green-600">{pattern.success_rate.toFixed(0)}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Échantillon</p>
                    <p className="text-xl font-bold text-gray-900">{pattern.sample_size} cas</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Observations</p>
                    <p className="text-xl font-bold text-purple-600">{pattern.times_observed}x</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default AIInsightsDashboard;
