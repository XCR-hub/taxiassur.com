import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, Zap, TrendingUp, Users, Target, Activity, RefreshCw, CheckCircle, AlertTriangle, Code, Rocket, Database, BarChart3, Home } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Card from '../components/Card';
import { logger } from '@/lib/logger';

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
  context: any;
  decision: any;
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
  performance_before: any;
  performance_after: any;
}

export default function AIAutonomousDashboard() {
  const navigate = useNavigate();
const [metrics, setMetrics] = useState<AIMetrics | null>(null);
  const [decisions, setDecisions] = useState<AIDecision[]>([]);
  const [suggestions, setSuggestions] = useState<CodeSuggestion[]>([]);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiRunning, setAiRunning] = useState(false);

  useEffect(() => {
    loadAIData();
    const interval = setInterval(loadAIData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadAIData = async () => {
    try {
      const [metricsRes, decisionsRes, suggestionsRes, deploymentsRes] = await Promise.all([
        supabase.rpc('calculate_ai_metrics'),
        supabase.from('ai_decisions').select('*').order('created_at', { ascending: false }).limit(10),
        supabase.from('ai_code_suggestions').select('*').order('created_at', { ascending: false }).limit(10),
        supabase.from('ai_deployments').select('*').order('created_at', { ascending: false }).limit(10)
      ]);

      if (metricsRes.data) setMetrics(metricsRes.data);
      if (decisionsRes.data) setDecisions(decisionsRes.data);
      if (suggestionsRes.data) setSuggestions(suggestionsRes.data);
      if (deploymentsRes.data) setDeployments(deploymentsRes.data);
    } catch (error) {
      logger.error('Error loading AI data:', error);
    } finally {
      setLoading(false);
    }
  };

  const triggerAIAnalysis = async () => {
    setAiRunning(true);
    try {
      const context = {
        currentMetrics: metrics,
        timestamp: new Date().toISOString()
      };

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/autonomous-ai-engine`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            context,
            decisionType: 'performance_optimization'
          })
        }
      );

      const result = await response.json();

      if (result.success) {
        alert('Analyse IA terminée avec succès !');
        loadAIData();
      }
    } catch (error) {
      logger.error('AI Analysis Error:', error);
      alert('Erreur lors de l\'analyse IA');
    } finally {
      setAiRunning(false);
    }
  };

  const approveAndDeploy = async () => {
    if (!confirm('Approuver et déployer automatiquement les améliorations suggérées ?')) {
      return;
    }

    try {
      await supabase
        .from('ai_code_suggestions')
        .update({ status: 'approved' })
        .eq('status', 'pending')
        .in('priority', ['high', 'medium']);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auto-deploy-improvements`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const result = await response.json();

      if (result.success) {
        alert(`Déploiement réussi ! ${result.changesApplied} modifications appliquées.`);
        loadAIData();
      }
    } catch (error) {
      logger.error('Deployment Error:', error);
      alert('Erreur lors du déploiement');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <header className="bg-white border-b-2 border-gray-200 shadow-sm mb-8">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                <Brain className="text-white" size={20} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  IA Autonome & Auto-apprenante
                </h1>
                <p className="text-sm text-gray-600">
                  Système d'optimisation continue et déploiement automatique
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={triggerAIAnalysis}
                disabled={aiRunning}
                className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-bold transition-all shadow-lg ${
                  aiRunning
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white'
                }`}
              >
                <Brain size={18} className={aiRunning ? 'animate-pulse' : ''} />
                <span>{aiRunning ? 'Analyse en cours...' : 'Lancer Analyse IA'}</span>
              </button>

              <button onClick={() => navigate("/backoffice")} className="bg-orange-600 hover:bg-orange-700 text-white font-medium px-4 py-2 rounded-lg transition-colors flex items-center space-x-2">
                <Home size={16} />
                <span>Accueil</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto space-y-8">
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
              <div className="flex justify-between items-start mb-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users className="text-purple-600" size={28} />
                </div>
                <TrendingUp className="text-purple-400" size={20} />
              </div>
              <div className="text-4xl font-bold text-gray-900 mb-1">{metrics.total_leads}</div>
              <div className="text-sm font-medium text-gray-600">Leads Totaux</div>
              <div className="mt-2 text-xs text-purple-600 font-medium">
                Conv: {metrics.conversion_rate?.toFixed(1)}%
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
              <div className="flex justify-between items-start mb-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Brain className="text-blue-600" size={28} />
                </div>
                <Activity className="text-blue-400" size={20} />
              </div>
              <div className="text-4xl font-bold text-gray-900 mb-1">{metrics.active_decisions}</div>
              <div className="text-sm font-medium text-gray-600">Décisions Actives</div>
              <div className="mt-2 text-xs text-blue-600 font-medium">
                {metrics.learning_data_points} données d'apprentissage
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
              <div className="flex justify-between items-start mb-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Rocket className="text-green-600" size={28} />
                </div>
                <CheckCircle className="text-green-400" size={20} />
              </div>
              <div className="text-4xl font-bold text-gray-900 mb-1">{metrics.successful_deployments}</div>
              <div className="text-sm font-medium text-gray-600">Déploiements Réussis</div>
              <div className="mt-2 text-xs text-green-600 font-medium">
                100% succès
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200">
              <div className="flex justify-between items-start mb-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Code className="text-amber-600" size={28} />
                </div>
                <AlertTriangle className="text-amber-400" size={20} />
              </div>
              <div className="text-4xl font-bold text-gray-900 mb-1">{metrics.code_suggestions_pending}</div>
              <div className="text-sm font-medium text-gray-600">Suggestions en Attente</div>
              <div className="mt-2 text-xs text-amber-600 font-medium">
                Prêtes à déployer
              </div>
            </Card>
          </div>
        )}

        <div className="flex gap-4">
          <button
            onClick={approveAndDeploy}
            disabled={!metrics || metrics.code_suggestions_pending === 0}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-bold transition-all shadow-lg ${
              !metrics || metrics.code_suggestions_pending === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white'
            }`}
          >
            <Rocket size={18} />
            <span>Approuver & Déployer Automatiquement</span>
          </button>

          <button
            onClick={loadAIData}
            className="flex items-center space-x-2 bg-gray-600 hover:bg-gray-700 text-white font-medium px-6 py-3 rounded-lg transition-all"
          >
            <RefreshCw size={18} />
            <span>Actualiser</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
              <Brain className="mr-2 text-purple-600" size={24} />
              Dernières Décisions IA
            </h3>

            <div className="space-y-3">
              {decisions.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Aucune décision pour le moment</p>
              ) : (
                decisions.map(decision => (
                  <div key={decision.id} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-gray-900 capitalize">{decision.decision_type.replace('_', ' ')}</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        decision.status === 'executed' ? 'bg-green-100 text-green-800' :
                        decision.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {decision.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      Confiance: {decision.confidence_score.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      {new Date(decision.created_at).toLocaleString('fr-FR')}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card>
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
              <Code className="mr-2 text-blue-600" size={24} />
              Suggestions de Code
            </h3>

            <div className="space-y-3">
              {suggestions.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Aucune suggestion pour le moment</p>
              ) : (
                suggestions.map(suggestion => (
                  <div key={suggestion.id} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-gray-900 text-sm">{suggestion.file_path}</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        suggestion.priority === 'high' ? 'bg-red-100 text-red-800' :
                        suggestion.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {suggestion.priority}
                      </span>
                    </div>
                    <div className="text-sm text-gray-700 mb-2">{suggestion.reason}</div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">{suggestion.suggestion_type}</span>
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        suggestion.status === 'applied' ? 'bg-green-100 text-green-800' :
                        suggestion.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {suggestion.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        <Card>
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <Rocket className="mr-2 text-green-600" size={24} />
            Historique des Déploiements
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-bold text-gray-900">Type</th>
                  <th className="text-left py-3 px-4 font-bold text-gray-900">Résumé</th>
                  <th className="text-left py-3 px-4 font-bold text-gray-900">Statut</th>
                  <th className="text-left py-3 px-4 font-bold text-gray-900">Date</th>
                </tr>
              </thead>
              <tbody>
                {deployments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-gray-500">
                      Aucun déploiement pour le moment
                    </td>
                  </tr>
                ) : (
                  deployments.map(deployment => (
                    <tr key={deployment.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium capitalize">
                        {deployment.deployment_type.replace('_', ' ')}
                      </td>
                      <td className="py-3 px-4 text-gray-700">{deployment.changes_summary}</td>
                      <td className="py-3 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          deployment.status === 'success' ? 'bg-green-100 text-green-800' :
                          deployment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {deployment.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {deployment.deployed_at ? new Date(deployment.deployed_at).toLocaleDateString('fr-FR') : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-pink-50">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <Zap className="mr-2 text-purple-600" size={24} />
            Capacités de l'IA Autonome
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-white rounded-lg">
              <h4 className="font-bold text-purple-900 mb-2">Analyse Continue</h4>
              <ul className="text-sm text-purple-800 space-y-1">
                <li>• Surveillance métriques 24/7</li>
                <li>• Détection anomalies automatique</li>
                <li>• Apprentissage des patterns</li>
              </ul>
            </div>

            <div className="p-4 bg-white rounded-lg">
              <h4 className="font-bold text-purple-900 mb-2">Collaboration IA</h4>
              <ul className="text-sm text-purple-800 space-y-1">
                <li>• Consultation multi-modèles</li>
                <li>• Prise de décision par consensus</li>
                <li>• Optimisation collective</li>
              </ul>
            </div>

            <div className="p-4 bg-white rounded-lg">
              <h4 className="font-bold text-purple-900 mb-2">Déploiement Auto</h4>
              <ul className="text-sm text-purple-800 space-y-1">
                <li>• Tests automatiques</li>
                <li>• Rollback si nécessaire</li>
                <li>• Amélioration continue</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
