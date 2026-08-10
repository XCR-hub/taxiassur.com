import React, { useState, useEffect } from 'react';
import { internalFunctionHeaders } from '@/lib/internal-function-auth';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import {
  Brain,
  Bot,
  Cpu,
  MessageSquare,
  Zap,
  TrendingUp,
  Database,
  Play,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  Target,
  Users,
  Mail,
  FileText,
  Search,
  Send,
  Activity,
  BarChart3,
  Sparkles,
  Workflow,
  Settings,
} from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  slug: string;
  agent_type: string;
  model_id: string;
  is_active: boolean;
  total_calls: number;
  total_tokens_used: number;
  avg_response_time_ms: number;
  success_rate: number;
  capabilities: string[];
  tools: string[];
}

interface OrchestratorRun {
  id: string;
  workflow_name: string;
  status: string;
  current_step: number;
  total_steps: number;
  started_at: string;
  completed_at: string | null;
}

interface Conversation {
  id: string;
  session_id: string;
  status: string;
  total_messages: number;
  total_tokens: number;
  started_at: string;
  agent: { name: string; slug: string } | null;
}

const agentIcons: Record<string, React.ElementType> = {
  brain: Brain,
  rag: Database,
  conversion: Target,
  email: Mail,
  content: FileText,
  orchestrator: Workflow,
  specialist: Bot,
  autonomous: Zap,
};

const agentColors: Record<string, string> = {
  brain: 'from-yellow-500 to-amber-600',
  rag: 'from-blue-500 to-cyan-600',
  conversion: 'from-green-500 to-emerald-600',
  email: 'from-pink-500 to-rose-600',
  content: 'from-orange-500 to-red-600',
  orchestrator: 'from-gray-600 to-gray-800',
  specialist: 'from-teal-500 to-cyan-600',
  autonomous: 'from-yellow-400 to-yellow-600',
};

const LLMDashboard: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [runs, setRuns] = useState<OrchestratorRun[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'agents' | 'workflows' | 'chat' | 'knowledge'>('overview');
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [stats, setStats] = useState({
    totalCalls: 0,
    totalTokens: 0,
    avgResponseTime: 0,
    successRate: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [agentsRes, runsRes, convsRes] = await Promise.all([
        supabase.from('llm_agents').select('*').order('priority', { ascending: false }),
        supabase.from('llm_orchestrator_runs').select('*').order('started_at', { ascending: false }).limit(10),
        supabase.from('llm_conversations').select('*, agent:llm_agents(name, slug)').order('started_at', { ascending: false }).limit(10),
      ]);

      if (agentsRes.data) {
        setAgents(agentsRes.data);
        const totalCalls = agentsRes.data.reduce((sum, a) => sum + (a.total_calls || 0), 0);
        const totalTokens = agentsRes.data.reduce((sum, a) => sum + (a.total_tokens_used || 0), 0);
        const avgTime = agentsRes.data.reduce((sum, a) => sum + (a.avg_response_time_ms || 0), 0) / (agentsRes.data.length || 1);
        const avgSuccess = agentsRes.data.reduce((sum, a) => sum + (a.success_rate || 100), 0) / (agentsRes.data.length || 1);
        setStats({ totalCalls, totalTokens, avgResponseTime: Math.round(avgTime), successRate: avgSuccess });
      }
      if (runsRes.data) setRuns(runsRes.data);
      if (convsRes.data) setConversations(convsRes.data);
    } catch (error) {
      logger.error('Error loading LLM data:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/llm-brain`, {
        method: 'POST',
        headers: {
          'Authorization': (await internalFunctionHeaders()).Authorization,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'chat',
          input: { message: userMessage },
          session_id: `dashboard_${Date.now()}`,
        }),
      });

      const data = await response.json();
      if (data.success && data.response) {
        setChatMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      } else {
        setChatMessages(prev => [...prev, { role: 'assistant', content: 'Erreur: ' + (data.error || 'Reponse invalide') }]);
      }
    } catch (error) {
      logger.error('Chat error:', error);
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Erreur de connexion au Brain' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const triggerWorkflow = async (workflowName: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/llm-autonomous-orchestrator`, {
        method: 'POST',
        headers: {
          'Authorization': (await internalFunctionHeaders()).Authorization,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'execute_workflow',
          workflow_name: workflowName,
          trigger_data: { source: 'dashboard', timestamp: new Date().toISOString() },
        }),
      });

      const data = await response.json();
      if (data.success) {
        await loadData();
      }
    } catch (error) {
      logger.error('Workflow trigger error:', error);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-xl">
            <Brain className="text-black" size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">TaxiAssur LLM System</h1>
            <p className="text-gray-400 text-sm">Multi-Agent AI Platform</p>
          </div>
        </div>
        <button
          onClick={loadData}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-white transition-colors"
        >
          <RefreshCw size={18} />
          <span>Actualiser</span>
        </button>
      </div>

      <div className="flex space-x-2 border-b border-gray-700">
        {[
          { id: 'overview', label: 'Vue d\'ensemble', icon: BarChart3 },
          { id: 'agents', label: 'Agents', icon: Bot },
          { id: 'workflows', label: 'Workflows', icon: Workflow },
          { id: 'chat', label: 'Chat Brain', icon: MessageSquare },
          { id: 'knowledge', label: 'Knowledge Base', icon: Database },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-yellow-400 text-yellow-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <Icon size={18} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border border-yellow-500/30 rounded-xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Appels</p>
                  <p className="text-3xl font-bold text-white mt-1">{formatNumber(stats.totalCalls)}</p>
                </div>
                <div className="p-3 bg-yellow-500/20 rounded-lg">
                  <Zap className="text-yellow-400" size={24} />
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Tokens Utilises</p>
                  <p className="text-3xl font-bold text-white mt-1">{formatNumber(stats.totalTokens)}</p>
                </div>
                <div className="p-3 bg-blue-500/20 rounded-lg">
                  <Cpu className="text-blue-400" size={24} />
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Temps Moyen</p>
                  <p className="text-3xl font-bold text-white mt-1">{stats.avgResponseTime}ms</p>
                </div>
                <div className="p-3 bg-green-500/20 rounded-lg">
                  <Clock className="text-green-400" size={24} />
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-pink-500/20 to-rose-500/20 border border-pink-500/30 rounded-xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Taux Succes</p>
                  <p className="text-3xl font-bold text-white mt-1">{stats.successRate.toFixed(1)}%</p>
                </div>
                <div className="p-3 bg-pink-500/20 rounded-lg">
                  <TrendingUp className="text-pink-400" size={24} />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Bot className="mr-2 text-yellow-400" size={20} />
                Agents Actifs
              </h3>
              <div className="space-y-3">
                {agents.filter(a => a.is_active).slice(0, 5).map(agent => {
                  const Icon = agentIcons[agent.agent_type] || Bot;
                  const colorClass = agentColors[agent.agent_type] || 'from-gray-500 to-gray-600';
                  return (
                    <div key={agent.id} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 bg-gradient-to-br ${colorClass} rounded-lg`}>
                          <Icon className="text-white" size={18} />
                        </div>
                        <div>
                          <p className="text-white font-medium">{agent.name}</p>
                          <p className="text-gray-500 text-xs">{agent.model_id}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-medium">{formatNumber(agent.total_calls)}</p>
                        <p className="text-gray-500 text-xs">appels</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Activity className="mr-2 text-green-400" size={20} />
                Workflows Recents
              </h3>
              <div className="space-y-3">
                {runs.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">Aucun workflow execute</p>
                ) : (
                  runs.slice(0, 5).map(run => (
                    <div key={run.id} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${
                          run.status === 'completed' ? 'bg-green-500/20' :
                          run.status === 'running' ? 'bg-yellow-500/20' : 'bg-red-500/20'
                        }`}>
                          {run.status === 'completed' ? <CheckCircle className="text-green-400" size={18} /> :
                           run.status === 'running' ? <RefreshCw className="text-yellow-400 animate-spin" size={18} /> :
                           <AlertCircle className="text-red-400" size={18} />}
                        </div>
                        <div>
                          <p className="text-white font-medium">{run.workflow_name}</p>
                          <p className="text-gray-500 text-xs">Step {run.current_step}/{run.total_steps}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs ${
                        run.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                        run.status === 'running' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {run.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'agents' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map(agent => {
            const Icon = agentIcons[agent.agent_type] || Bot;
            const colorClass = agentColors[agent.agent_type] || 'from-gray-500 to-gray-600';
            return (
              <div key={agent.id} className="bg-gray-800/50 border border-gray-700 rounded-xl p-5 hover:border-gray-600 transition-colors">
                <div className="flex items-center space-x-3 mb-4">
                  <div className={`p-3 bg-gradient-to-br ${colorClass} rounded-xl`}>
                    <Icon className="text-white" size={24} />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">{agent.name}</h3>
                    <p className="text-gray-500 text-sm">{agent.agent_type}</p>
                  </div>
                  <div className={`ml-auto px-2 py-1 rounded text-xs ${
                    agent.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                  }`}>
                    {agent.is_active ? 'Actif' : 'Inactif'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <p className="text-gray-500 text-xs">Appels</p>
                    <p className="text-white font-semibold">{formatNumber(agent.total_calls)}</p>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <p className="text-gray-500 text-xs">Tokens</p>
                    <p className="text-white font-semibold">{formatNumber(agent.total_tokens_used)}</p>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <p className="text-gray-500 text-xs">Temps moy.</p>
                    <p className="text-white font-semibold">{agent.avg_response_time_ms}ms</p>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <p className="text-gray-500 text-xs">Succes</p>
                    <p className="text-white font-semibold">{agent.success_rate.toFixed(1)}%</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1">
                  {(agent.capabilities || []).slice(0, 4).map((cap, i) => (
                    <span key={i} className="px-2 py-1 bg-gray-700/50 text-gray-400 text-xs rounded">
                      {cap}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'workflows' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { name: 'new_lead_processing', label: 'Traitement Nouveau Lead', icon: Users, color: 'green' },
              { name: 'daily_optimization', label: 'Optimisation Quotidienne', icon: TrendingUp, color: 'blue' },
              { name: 'lead_recovery', label: 'Recuperation Lead Perdu', icon: RefreshCw, color: 'yellow' },
            ].map(workflow => {
              const Icon = workflow.icon;
              return (
                <div key={workflow.name} className="bg-gray-800/50 border border-gray-700 rounded-xl p-5">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className={`p-3 bg-${workflow.color}-500/20 rounded-xl`}>
                      <Icon className={`text-${workflow.color}-400`} size={24} />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">{workflow.label}</h3>
                      <p className="text-gray-500 text-sm">{workflow.name}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => triggerWorkflow(workflow.name)}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-medium rounded-lg transition-colors"
                  >
                    <Play size={18} />
                    <span>Executer</span>
                  </button>
                </div>
              );
            })}
          </div>

          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5">
            <h3 className="text-lg font-semibold text-white mb-4">Historique des Executions</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-500 text-sm">
                    <th className="pb-3">Workflow</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Progression</th>
                    <th className="pb-3">Debut</th>
                    <th className="pb-3">Fin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {runs.map(run => (
                    <tr key={run.id} className="text-white">
                      <td className="py-3">{run.workflow_name}</td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          run.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                          run.status === 'running' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {run.status}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-yellow-400"
                              style={{ width: `${(run.current_step / run.total_steps) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-400">{run.current_step}/{run.total_steps}</span>
                        </div>
                      </td>
                      <td className="py-3 text-gray-400 text-sm">
                        {new Date(run.started_at).toLocaleString('fr-FR')}
                      </td>
                      <td className="py-3 text-gray-400 text-sm">
                        {run.completed_at ? new Date(run.completed_at).toLocaleString('fr-FR') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'chat' && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden flex flex-col" style={{ height: '600px' }}>
          <div className="p-4 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-b border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-yellow-500 rounded-lg">
                <Brain className="text-black" size={20} />
              </div>
              <div>
                <h3 className="text-white font-semibold">TaxiAssur Brain</h3>
                <p className="text-gray-400 text-sm">Agent principal orchestrateur</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatMessages.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                <Sparkles className="mx-auto mb-3 text-yellow-400" size={32} />
                <p>Commencez une conversation avec le Brain TaxiAssur</p>
                <p className="text-sm mt-2">Posez des questions sur les leads, demandez des analyses, ou delegez des taches</p>
              </div>
            )}
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-xl ${
                    msg.role === 'user'
                      ? 'bg-yellow-500 text-black'
                      : 'bg-gray-700 text-white'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-700 text-white p-3 rounded-xl">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-gray-700">
            <div className="flex space-x-3">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                placeholder="Posez une question au Brain..."
                className="flex-1 px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500"
              />
              <button
                onClick={sendChatMessage}
                disabled={chatLoading || !chatInput.trim()}
                className="px-4 py-3 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-700 text-black font-medium rounded-lg transition-colors"
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'knowledge' && (
        <div className="space-y-6">
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Database className="mr-2 text-blue-400" size={20} />
              Base de Connaissances TaxiAssur
            </h3>
            <p className="text-gray-400 mb-4">
              La base de connaissances contient les documents, FAQ, et informations utilisees par l'agent RAG pour repondre aux questions.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-900/50 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <FileText className="text-blue-400" size={24} />
                  <div>
                    <p className="text-white font-semibold">Documents</p>
                    <p className="text-gray-500 text-sm">Guides, policies, processus</p>
                  </div>
                </div>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <MessageSquare className="text-green-400" size={24} />
                  <div>
                    <p className="text-white font-semibold">FAQ</p>
                    <p className="text-gray-500 text-sm">Questions frequentes</p>
                  </div>
                </div>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <Search className="text-yellow-400" size={24} />
                  <div>
                    <p className="text-white font-semibold">Recherche RAG</p>
                    <p className="text-gray-500 text-sm">Retrieval semantique</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5">
            <h3 className="text-lg font-semibold text-white mb-4">Tester le RAG</h3>
            <div className="flex space-x-3">
              <input
                type="text"
                placeholder="Posez une question sur l'assurance taxi..."
                className="flex-1 px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
              <button className="px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors">
                <Search size={20} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LLMDashboard;
