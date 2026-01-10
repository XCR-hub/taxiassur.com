import React, { useEffect, useState } from 'react';
import { Bot, Brain, Sparkles, TrendingUp, CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';
import { aiGovernanceService, AIDecision, AI_AGENTS, AIAgent } from '@/lib/crm-ai-governance';
import { AIDecisionCard } from '@/components/crm/AIDecisionCard';

const CRMAIGovernance: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [decisions, setDecisions] = useState<AIDecision[]>([]);
  const [councilMeetings, setCouncilMeetings] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<AIDecision['status'] | 'all'>('pending');
  const [selectedAgent, setSelectedAgent] = useState<AIAgent | 'all'>('all');

  useEffect(() => {
    loadAIData();
  }, [statusFilter, selectedAgent]);

  const loadAIData = async () => {
    setLoading(true);
    try {
      const filters: any = {};
      if (statusFilter !== 'all') filters.status = statusFilter;

      let decisionsData = await aiGovernanceService.getDecisions(undefined, statusFilter === 'all' ? undefined : statusFilter);

      if (selectedAgent !== 'all') {
        decisionsData = decisionsData.filter(d => d.agent === selectedAgent);
      }

      setDecisions(decisionsData);
    } catch (error) {
      console.error('Failed to load AI data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveDecision = async (decisionId: string) => {
    await aiGovernanceService.approveDecision(decisionId, 'admin');
    await loadAIData();
  };

  const handleRejectDecision = async (decisionId: string) => {
    await aiGovernanceService.rejectDecision(decisionId);
    await loadAIData();
  };

  const stats = {
    pending: decisions.filter(d => d.status === 'pending').length,
    approved: decisions.filter(d => d.status === 'approved').length,
    rejected: decisions.filter(d => d.status === 'rejected').length,
    auto_applied: decisions.filter(d => d.status === 'auto_applied').length
  };

  const decisionsByAgent = Object.keys(AI_AGENTS).reduce((acc, agent) => {
    acc[agent as AIAgent] = decisions.filter(d => d.agent === agent).length;
    return acc;
  }, {} as Record<AIAgent, number>);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto animate-pulse">
          <div className="h-32 bg-gray-200 rounded-xl mb-6"></div>
          <div className="grid grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-pink-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center gap-3 mb-4">
            <Brain size={48} />
            <div>
              <h1 className="text-4xl font-bold">IA Governance & Council</h1>
              <p className="text-pink-100">Système de décisions collaboratives par IA</p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="bg-white/20 backdrop-blur rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <Clock size={24} />
                <div className="text-3xl font-bold">{stats.pending}</div>
              </div>
              <div className="text-pink-100 text-sm">En Attente</div>
            </div>
            <div className="bg-white/20 backdrop-blur rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle size={24} />
                <div className="text-3xl font-bold">{stats.approved}</div>
              </div>
              <div className="text-pink-100 text-sm">Approuvées</div>
            </div>
            <div className="bg-white/20 backdrop-blur rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <XCircle size={24} />
                <div className="text-3xl font-bold">{stats.rejected}</div>
              </div>
              <div className="text-pink-100 text-sm">Rejetées</div>
            </div>
            <div className="bg-white/20 backdrop-blur rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <Sparkles size={24} />
                <div className="text-3xl font-bold">{stats.auto_applied}</div>
              </div>
              <div className="text-pink-100 text-sm">Auto-appliquées</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-white rounded-xl border-2 border-gray-200 p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Bot size={28} />
            Agents IA
          </h2>

          <div className="grid grid-cols-4 gap-4">
            {Object.entries(AI_AGENTS).map(([key, agent]) => {
              const count = decisionsByAgent[key as AIAgent] || 0;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedAgent(key as AIAgent)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    selectedAgent === key
                      ? 'border-pink-500 bg-pink-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-3xl mb-2">{agent.icon}</div>
                  <div className="font-semibold text-gray-900 mb-1">{agent.name}</div>
                  <div className="text-xs text-gray-600 mb-3">{agent.description}</div>
                  <div className="text-2xl font-bold text-pink-600">{count}</div>
                  <div className="text-xs text-gray-500">décisions</div>
                </button>
              );
            })}
          </div>

          {selectedAgent !== 'all' && (
            <div className="mt-4 flex justify-center">
              <button
                onClick={() => setSelectedAgent('all')}
                className="px-4 py-2 text-pink-600 hover:bg-pink-50 rounded-lg transition-colors"
              >
                Afficher tous les agents
              </button>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border-2 border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Décisions IA</h2>
            <div className="flex gap-2">
              {(['all', 'pending', 'approved', 'rejected', 'auto_applied'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    statusFilter === status
                      ? 'bg-pink-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {status === 'all' && 'Toutes'}
                  {status === 'pending' && 'En attente'}
                  {status === 'approved' && 'Approuvées'}
                  {status === 'rejected' && 'Rejetées'}
                  {status === 'auto_applied' && 'Auto'}
                </button>
              ))}
            </div>
          </div>

          {decisions.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              Aucune décision IA trouvée
            </div>
          ) : (
            <div className="space-y-4">
              {decisions.map((decision) => (
                <AIDecisionCard
                  key={decision.id}
                  decision={decision}
                  onApprove={decision.status === 'pending' ? () => handleApproveDecision(decision.id) : undefined}
                  onReject={decision.status === 'pending' ? () => handleRejectDecision(decision.id) : undefined}
                />
              ))}
            </div>
          )}
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200 p-8">
          <div className="flex items-center gap-3 mb-6">
            <Brain className="text-purple-600" size={32} />
            <div>
              <h2 className="text-2xl font-bold text-purple-900">IA Council</h2>
              <p className="text-purple-700">Réunions collaboratives multi-agents</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white rounded-lg p-6 border-2 border-purple-200">
              <h3 className="font-bold text-purple-900 mb-4 flex items-center gap-2">
                <TrendingUp size={20} />
                Qualification Lead
              </h3>
              <p className="text-sm text-purple-700 mb-4">
                Convoquer le conseil IA pour analyser un lead complexe et obtenir des recommandations de tous les agents.
              </p>
              <button className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium">
                Convoquer Council
              </button>
            </div>

            <div className="bg-white rounded-lg p-6 border-2 border-purple-200">
              <h3 className="font-bold text-purple-900 mb-4 flex items-center gap-2">
                <AlertCircle size={20} />
                Analyse de Risque
              </h3>
              <p className="text-sm text-purple-700 mb-4">
                Faire appel au conseil pour évaluer les risques d'un dossier avant souscription.
              </p>
              <button className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium">
                Analyser Risque
              </button>
            </div>

            <div className="bg-white rounded-lg p-6 border-2 border-purple-200">
              <h3 className="font-bold text-purple-900 mb-4 flex items-center gap-2">
                <CheckCircle size={20} />
                Rétention Client
              </h3>
              <p className="text-sm text-purple-700 mb-4">
                Obtenir des stratégies personnalisées pour retenir un client à risque de churn.
              </p>
              <button className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium">
                Plan Rétention
              </button>
            </div>

            <div className="bg-white rounded-lg p-6 border-2 border-purple-200">
              <h3 className="font-bold text-purple-900 mb-4 flex items-center gap-2">
                <Sparkles size={20} />
                Cross-Sell Strategy
              </h3>
              <p className="text-sm text-purple-700 mb-4">
                Identifier les meilleures opportunités de vente additionnelle avec recommandations IA.
              </p>
              <button className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium">
                Opportunités Cross-sell
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CRMAIGovernance;
