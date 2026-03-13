import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Card from '../components/Card';
import { Brain, Zap, TrendingUp, CheckCircle, Clock, AlertCircle, Target, Sparkles } from 'lucide-react';

interface AutonomousStats {
  pending_tasks: number;
  processing_tasks: number;
  completed_today: number;
  failed_today: number;
  success_rate_7d: number;
  learned_patterns: number;
  avg_ctr_improvement: number;
}

interface OptimizationTask {
  id: string;
  task_type: string;
  target_url: string;
  status: string;
  priority: number;
  current_metrics: any;
  created_at: string;
  completed_at: string | null;
}

interface LearningPattern {
  id: string;
  pattern_name: string;
  pattern_type: string;
  success_rate: number;
  samples_count: number;
  is_active: boolean;
  last_validated_at: string | null;
}

export default function GSCAutonomousDashboard() {
  const [stats, setStats] = useState<AutonomousStats | null>(null);
  const [tasks, setTasks] = useState<OptimizationTask[]>([]);
  const [patterns, setPatterns] = useState<LearningPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      const { data: statsData } = await supabase.rpc('get_autonomous_system_stats');
      setStats(statsData);

      const { data: tasksData } = await supabase
        .from('gsc_autonomous_tasks')
        .select('*')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(20);
      setTasks(tasksData || []);

      const { data: patternsData } = await supabase
        .from('gsc_learning_patterns')
        .select('*')
        .eq('is_active', true)
        .order('success_rate', { ascending: false });
      setPatterns(patternsData || []);

    } catch (error) {
      console.error('Erreur chargement dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const executeManually = async () => {
    setExecuting(true);
    try {
      const { data, error } = await supabase.functions.invoke('gsc-ultra-autonomous-engine', {
        body: { manual_trigger: true }
      });

      if (error) throw error;

      alert('Tâche exécutée avec succès !');
      await loadDashboardData();
    } catch (error) {
      console.error('Erreur exécution manuelle:', error);
      alert('Erreur lors de l\'exécution');
    } finally {
      setExecuting(false);
    }
  };

  const createNewTasks = async () => {
    setExecuting(true);
    try {
      const { data, error } = await supabase.rpc('auto_create_optimization_tasks');

      if (error) throw error;

      alert(`${data || 0} nouvelles tâches créées !`);
      await loadDashboardData();
    } catch (error) {
      console.error('Erreur création tâches:', error);
      alert('Erreur lors de la création des tâches');
    } finally {
      setExecuting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement du moteur autonome...</p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50';
      case 'processing': return 'text-blue-600 bg-blue-50';
      case 'failed': return 'text-red-600 bg-red-50';
      default: return 'text-yellow-600 bg-yellow-50';
    }
  };

  const getTaskTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'enrich_content': 'Enrichir contenu',
      'add_internal_links': 'Ajouter liens internes',
      'submit_indexation': 'Soumettre indexation',
      'optimize_metadata': 'Optimiser métadonnées'
    };
    return labels[type] || type;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Brain className="text-purple-600" size={36} />
              Moteur Autonome GSC Ultra-Intelligent
            </h1>
            <p className="text-gray-600 mt-2">
              IA qui optimise automatiquement votre indexation Google
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={createNewTasks}
              disabled={executing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Target size={18} />
              Détecter nouvelles tâches
            </button>
            <button
              onClick={executeManually}
              disabled={executing}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Zap size={18} />
              {executing ? 'Exécution...' : 'Exécuter maintenant'}
            </button>
          </div>
        </div>

        {/* Stats principales */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Tâches en attente</p>
                <p className="text-3xl font-bold mt-1">{stats?.pending_tasks || 0}</p>
              </div>
              <Clock size={40} className="text-blue-200" />
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Complétées aujourd'hui</p>
                <p className="text-3xl font-bold mt-1">{stats?.completed_today || 0}</p>
              </div>
              <CheckCircle size={40} className="text-green-200" />
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Taux de succès 7j</p>
                <p className="text-3xl font-bold mt-1">
                  {stats?.success_rate_7d ? `${stats.success_rate_7d.toFixed(0)}%` : 'N/A'}
                </p>
              </div>
              <TrendingUp size={40} className="text-purple-200" />
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm">Patterns appris</p>
                <p className="text-3xl font-bold mt-1">{stats?.learned_patterns || 0}</p>
              </div>
              <Sparkles size={40} className="text-orange-200" />
            </div>
          </Card>
        </div>

        {/* Amélioration CTR moyenne */}
        {stats?.avg_ctr_improvement && stats.avg_ctr_improvement > 0 && (
          <Card className="mb-8 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <div className="flex items-center gap-4">
              <div className="bg-green-500 text-white p-3 rounded-lg">
                <TrendingUp size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Amélioration moyenne du CTR (7 derniers jours)</p>
                <p className="text-2xl font-bold text-green-600">
                  +{stats.avg_ctr_improvement.toFixed(1)}%
                </p>
              </div>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tâches en cours */}
          <Card>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Zap className="text-blue-600" />
              Tâches d'optimisation
            </h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {tasks.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Aucune tâche</p>
              ) : (
                tasks.map((task) => (
                  <div
                    key={task.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(task.status)}`}>
                            {task.status}
                          </span>
                          <span className="text-xs text-gray-500">
                            Priorité: {task.priority}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-900 mb-1">
                          {getTaskTypeLabel(task.task_type)}
                        </p>
                        <p className="text-xs text-gray-600 truncate">
                          {task.target_url}
                        </p>
                      </div>
                    </div>
                    {task.current_metrics && (
                      <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-gray-100">
                        <div>
                          <p className="text-xs text-gray-500">Impressions</p>
                          <p className="text-sm font-medium">
                            {task.current_metrics.impressions?.toFixed(0) || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">CTR</p>
                          <p className="text-sm font-medium">
                            {task.current_metrics.ctr ? `${(task.current_metrics.ctr * 100).toFixed(2)}%` : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Position</p>
                          <p className="text-sm font-medium">
                            {task.current_metrics.position?.toFixed(1) || 'N/A'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Patterns appris */}
          <Card>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Sparkles className="text-purple-600" />
              Patterns appris par l'IA
            </h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {patterns.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  L'IA n'a pas encore appris de patterns
                </p>
              ) : (
                patterns.map((pattern) => (
                  <div
                    key={pattern.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900 text-sm">
                        {pattern.pattern_name}
                      </h3>
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                        {pattern.pattern_type}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div>
                        <p className="text-xs text-gray-500">Taux de succès</p>
                        <p className="text-lg font-bold text-green-600">
                          {pattern.success_rate.toFixed(0)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Échantillons</p>
                        <p className="text-lg font-bold text-blue-600">
                          {pattern.samples_count}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Info sur le fonctionnement */}
        <Card className="mt-6 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <Brain className="text-blue-600 flex-shrink-0 mt-1" size={24} />
            <div>
              <h3 className="font-bold text-blue-900 mb-2">Comment fonctionne le moteur autonome ?</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• <strong>Détection automatique</strong> : Analyse GSC toutes les 6h et détecte les pages sous-performantes</li>
                <li>• <strong>Optimisation IA</strong> : Enrichit le contenu, ajoute des liens internes, optimise les métadonnées</li>
                <li>• <strong>Soumission Google</strong> : Envoie automatiquement les pages optimisées via IndexNow</li>
                <li>• <strong>Auto-apprentissage</strong> : Apprend des succès et améliore ses stratégies en continu</li>
                <li>• <strong>Monitoring</strong> : Suit l'évolution des métriques et ajuste les priorités</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
