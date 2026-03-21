import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from '@/lib/toast';
import {
  Brain,
  Bot,
  MessageSquare,
  CheckCircle,
  Clock,
  TrendingUp,
  FileText,
  AlertCircle,
  Play,
  Pause,
  RefreshCw,
  Eye,
  Sparkles,
  Users,
  Target,
  Zap
} from 'lucide-react';

interface SystemStatus {
  last_strategy_session: string | null;
  pending_decisions: number;
  approved_decisions: number;
  content_in_queue: number;
  content_published_today: number;
  content_published_week: number;
  total_clicks_gained: number;
  top_performing_content: unknown[];
  system_health: Record<string, unknown> | null;
}

interface StrategySession {
  id: string;
  session_name: string;
  session_type: string;
  started_at: string;
  completed_at: string;
  status: string;
  consensus_reached: boolean;
  opportunities_count: number;
  decisions_count: number;
  decisions_executed: number;
}

interface Decision {
  id: string;
  decision_type: string;
  target_query: string;
  priority: string;
  execution_status: string;
  consensus_level: number;
  estimated_impact_clicks: number;
}

interface ProductionQueue {
  id: string;
  content_type: string;
  target_query: string;
  status: string;
  priority: number;
  scheduled_for: string;
  approved_for_publication: boolean;
}

export default function GSCAutonomousSystem() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [strategySessions, setStrategySessions] = useState<StrategySession[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [productionQueue, setProductionQueue] = useState<ProductionQueue[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'sessions' | 'decisions' | 'queue' | 'published'>('overview');
  const [processingAction, setProcessingAction] = useState(false);

  useEffect(() => {
    loadSystemData();
    const interval = setInterval(loadSystemData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadSystemData = async () => {
    try {
      const [statusRes, sessionsRes, decisionsRes, queueRes] = await Promise.all([
        supabase.rpc('get_gsc_autonomous_system_status'),
        supabase.from('gsc_strategy_sessions_summary').select('*').limit(10),
        supabase.from('gsc_ai_collaborative_decisions').select('*').order('created_at', { ascending: false }).limit(20),
        supabase.from('gsc_production_queue_status').select('*').limit(15)
      ]);

      if (statusRes.data) setSystemStatus(statusRes.data);
      if (sessionsRes.data) setStrategySessions(sessionsRes.data);
      if (decisionsRes.data) setDecisions(decisionsRes.data);
      if (queueRes.data) setProductionQueue(queueRes.data);
    } catch (error) {
      console.error('Erreur chargement données:', error);
    } finally {
      setLoading(false);
    }
  };

  const triggerStrategySession = async () => {
    setProcessingAction(true);
    try {
      const { data, error } = await supabase.functions.invoke('gsc-ai-orchestrator', {
        body: { action: 'create_strategy_session' }
      });

      if (error) throw error;

      toast.success('Session stratégique lancée ! Les IA analysent les opportunités...');
      setTimeout(loadSystemData, 3000);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors du lancement de la session');
    } finally {
      setProcessingAction(false);
    }
  };

  const executeDecisions = async () => {
    setProcessingAction(true);
    try {
      const { data, error } = await supabase.functions.invoke('gsc-ai-orchestrator', {
        body: { action: 'execute_decisions' }
      });

      if (error) throw error;

      toast.success(`${data.executed?.length || 0} décisions exécutées avec succès !`);
      setTimeout(loadSystemData, 2000);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de l\'exécution des décisions');
    } finally {
      setProcessingAction(false);
    }
  };

  const generateContent = async () => {
    setProcessingAction(true);
    try {
      const { data, error } = await supabase.functions.invoke('gsc-ai-orchestrator', {
        body: { action: 'generate_content' }
      });

      if (error) throw error;

      toast.success('Contenu généré avec succès !');
      setTimeout(loadSystemData, 2000);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la génération du contenu');
    } finally {
      setProcessingAction(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Chargement du système autonome...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl shadow-lg p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Brain className="w-10 h-10" />
                <h1 className="text-3xl font-bold">Système Autonome GSC + IA Collective</h1>
              </div>
              <p className="text-purple-100 text-lg">
                Les IA collaborent pour optimiser automatiquement votre SEO
              </p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                <span className="font-semibold">Système Actif</span>
              </div>
              <p className="text-sm text-purple-100">4 IA en ligne</p>
            </div>
          </div>
        </div>

        {/* Actions rapides */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={triggerStrategySession}
            disabled={processingAction}
            className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-3 mb-3">
              <Users className="w-8 h-8 text-purple-600" />
              <h3 className="font-bold text-lg">Session Stratégique</h3>
            </div>
            <p className="text-gray-600 text-sm mb-4">Lancer une analyse collective des IA</p>
            <div className="flex items-center justify-between text-sm text-purple-600 font-semibold">
              <span>Lancer maintenant</span>
              <Play className="w-5 h-5" />
            </div>
          </button>

          <button
            onClick={executeDecisions}
            disabled={processingAction || !systemStatus?.approved_decisions}
            className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-3 mb-3">
              <Zap className="w-8 h-8 text-yellow-600" />
              <h3 className="font-bold text-lg">Exécuter Décisions</h3>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              {systemStatus?.approved_decisions || 0} décisions approuvées
            </p>
            <div className="flex items-center justify-between text-sm text-yellow-600 font-semibold">
              <span>Exécuter</span>
              <CheckCircle className="w-5 h-5" />
            </div>
          </button>

          <button
            onClick={generateContent}
            disabled={processingAction || !systemStatus?.content_in_queue}
            className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-3 mb-3">
              <Sparkles className="w-8 h-8 text-blue-600" />
              <h3 className="font-bold text-lg">Générer Contenu</h3>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              {systemStatus?.content_in_queue || 0} contenus en attente
            </p>
            <div className="flex items-center justify-between text-sm text-blue-600 font-semibold">
              <span>Générer</span>
              <FileText className="w-5 h-5" />
            </div>
          </button>
        </div>

        {/* Statistiques clés */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between mb-2">
              <Target className="w-8 h-8 text-blue-500" />
              <span className="text-3xl font-bold text-blue-600">
                {systemStatus?.content_published_week || 0}
              </span>
            </div>
            <p className="text-gray-600 font-medium">Contenus publiés (7j)</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 text-green-500" />
              <span className="text-3xl font-bold text-green-600">
                +{systemStatus?.total_clicks_gained || 0}
              </span>
            </div>
            <p className="text-gray-600 font-medium">Clics générés</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-8 h-8 text-purple-500" />
              <span className="text-3xl font-bold text-purple-600">
                {systemStatus?.content_in_queue || 0}
              </span>
            </div>
            <p className="text-gray-600 font-medium">En production</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="w-8 h-8 text-orange-500" />
              <span className="text-3xl font-bold text-orange-600">
                {systemStatus?.approved_decisions || 0}
              </span>
            </div>
            <p className="text-gray-600 font-medium">Décisions approuvées</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="border-b border-gray-200">
            <nav className="flex gap-8 px-6">
              {[
                { id: 'overview', label: 'Vue d\'ensemble', icon: Eye },
                { id: 'sessions', label: 'Sessions IA', icon: Users },
                { id: 'decisions', label: 'Décisions', icon: CheckCircle },
                { id: 'queue', label: 'Production', icon: Clock },
                { id: 'published', label: 'Publié', icon: FileText }
              ].map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 py-4 px-2 border-b-2 font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6">
            {/* Vue d'ensemble */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold mb-4">Dernière Session Stratégique</h3>
                  {systemStatus?.last_strategy_session ? (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold">{systemStatus.last_strategy_session.session_name}</h4>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          systemStatus.last_strategy_session.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {systemStatus.last_strategy_session.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Opportunités analysées</p>
                          <p className="font-bold text-lg">{systemStatus.last_strategy_session.opportunities_analyzed}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Consensus atteint</p>
                          <p className="font-bold text-lg">
                            {systemStatus.last_strategy_session.consensus_reached ? 'Oui ✓' : 'Non'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Démarrée le</p>
                          <p className="font-bold">
                            {new Date(systemStatus.last_strategy_session.started_at).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500">Aucune session stratégique récente</p>
                  )}
                </div>

                <div>
                  <h3 className="text-xl font-bold mb-4">Top Contenus Performants</h3>
                  {systemStatus?.top_performing_content?.length > 0 ? (
                    <div className="space-y-3">
                      {systemStatus.top_performing_content.map((content, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{content.title}</h4>
                            <p className="text-sm text-gray-600">{content.url}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-sm text-gray-600">Clics gagnés</p>
                              <p className="text-2xl font-bold text-green-600">+{content.clicks_gained}</p>
                            </div>
                            <TrendingUp className="w-6 h-6 text-green-500" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">Aucun contenu publié pour le moment</p>
                  )}
                </div>
              </div>
            )}

            {/* Sessions IA */}
            {activeTab === 'sessions' && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold mb-4">Sessions Stratégiques IA</h3>
                {strategySessions.map(session => (
                  <div key={session.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-lg">{session.session_name}</h4>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        session.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : session.status === 'in_progress'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {session.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Type</p>
                        <p className="font-medium">{session.session_type}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Opportunités</p>
                        <p className="font-medium">{session.opportunities_count}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Décisions</p>
                        <p className="font-medium">{session.decisions_count}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Exécutées</p>
                        <p className="font-medium">{session.decisions_executed}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Décisions */}
            {activeTab === 'decisions' && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold mb-4">Décisions Collaboratives</h3>
                {decisions.map(decision => (
                  <div key={decision.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-semibold">{decision.target_query}</h4>
                        <p className="text-sm text-gray-600">{decision.decision_type}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          decision.priority === 'urgent'
                            ? 'bg-red-100 text-red-800'
                            : decision.priority === 'high'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {decision.priority}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          decision.execution_status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : decision.execution_status === 'approved'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {decision.execution_status}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Consensus</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${decision.consensus_level}%` }}
                            />
                          </div>
                          <span className="font-medium">{decision.consensus_level}%</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-gray-600">Impact estimé</p>
                        <p className="font-medium">+{decision.estimated_impact_clicks || 0} clics/mois</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Production Queue */}
            {activeTab === 'queue' && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold mb-4">File de Production</h3>
                {productionQueue.map(item => (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-semibold">{item.target_query}</h4>
                        <p className="text-sm text-gray-600">{item.content_type}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        item.status === 'published'
                          ? 'bg-green-100 text-green-800'
                          : item.status === 'generating'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="text-gray-600">Priorité</p>
                          <p className="font-medium">{item.priority}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Publication auto</p>
                          <p className="font-medium">{item.approved_for_publication ? 'Oui ✓' : 'Non'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-600">Programmé pour</p>
                        <p className="font-medium">
                          {new Date(item.scheduled_for).toLocaleString('fr-FR')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
