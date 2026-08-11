import React, { useState, useEffect, useRef } from 'react';
import { internalFunctionHeaders } from '@/lib/internal-function-auth';
import { toast } from '@/lib/toast';
import {
  Users,
  Send,
  Loader,
  Bot,
  ThumbsUp,
  ThumbsDown,
  Crown,
  MessageSquare,
  Clock,
  Zap,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Settings,
  History,
  Sparkles,
  BarChart3,
  CheckCircle,
  AlertCircle,
  Copy,
  Check
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface LLMConfig {
  id: string;
  model_id: string;
  display_name: string;
  provider: string;
  is_active: boolean;
  is_chairman: boolean;
  temperature: number;
  max_tokens: number;
}

interface IndividualResponse {
  model_id: string;
  display_name: string;
  content: string;
  tokens_used: number;
  latency_ms: number;
  error?: string;
}

interface Ranking {
  anonymous_id: string;
  accuracy_score: number;
  insight_score: number;
  clarity_score: number;
  reasoning: string;
}

interface CouncilResponse {
  success: boolean;
  session_id: string;
  query: string;
  individual_responses: IndividualResponse[];
  rankings: { reviewer: string; rankings: Ranking[] }[];
  final_response: string;
  chairman_model: string;
  consensus_score: number;
  total_tokens: number;
  processing_time_ms: number;
}

interface Session {
  id: string;
  query: string;
  final_response: string;
  consensus_score: number;
  total_tokens_used: number;
  processing_time_ms: number;
  created_at: string;
}

const LLMCouncilDashboard: React.FC = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<CouncilResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'council' | 'individual' | 'rankings'>('council');
  const [expandedResponse, setExpandedResponse] = useState<string | null>(null);
  const [configs, setConfigs] = useState<LLMConfig[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [singleTurn, setSingleTurn] = useState(false);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadConfigs();
    loadSessions();
  }, []);

  const loadConfigs = async () => {
    const { data } = await supabase
      .from('llm_council_configs')
      .select('*')
      .order('priority_order');
    if (data) setConfigs(data);
  };

  const loadSessions = async () => {
    const { data } = await supabase
      .from('llm_council_sessions')
      .select('*')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) setSessions(data);
  };

  const handleSubmit = async () => {
    if (!query.trim() || loading) return;

    setLoading(true);
    setResponse(null);

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/llm-council-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': (await internalFunctionHeaders()).Authorization,
          },
          body: JSON.stringify({
            query: query.trim(),
            single_turn: singleTurn,
          }),
        }
      );

      const data = await res.json();

      if (data.success) {
        setResponse(data);
        setActiveTab('council');
        await loadSessions();
      } else {
        toast.error(`Erreur: ${data.error}`);
      }
    } catch (error) {
      console.error('Council error:', error);
      toast.error('Erreur de communication avec le conseil LLM');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const loadSession = async (session: Session) => {
    setQuery(session.query);

    const { data: responses } = await supabase
      .from('llm_council_responses')
      .select('*')
      .eq('session_id', session.id);

    const { data: rankings } = await supabase
      .from('llm_council_rankings')
      .select('*')
      .eq('session_id', session.id);

    if (responses) {
      setResponse({
        success: true,
        session_id: session.id,
        query: session.query,
        individual_responses: responses.map(r => ({
          model_id: r.model_id,
          display_name: r.display_name,
          content: r.response_content,
          tokens_used: r.tokens_used,
          latency_ms: r.latency_ms,
          error: r.error_message,
        })),
        rankings: [],
        final_response: session.final_response,
        chairman_model: 'Chairman',
        consensus_score: session.consensus_score || 0,
        total_tokens: session.total_tokens_used || 0,
        processing_time_ms: session.processing_time_ms || 0,
      });
    }

    setShowHistory(false);
  };

  const getProviderColor = (provider: string) => {
    const colors: Record<string, string> = {
      'OpenAI': 'bg-emerald-500',
      'Anthropic': 'bg-orange-500',
      'Google': 'bg-blue-500',
      'Meta': 'bg-blue-600',
      'Mistral': 'bg-amber-500',
      'xAI': 'bg-gray-700',
      'DeepSeek': 'bg-cyan-500',
    };
    return colors[provider] || 'bg-gray-500';
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg">
              <Users className="text-white" size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">LLM Council</h1>
              <p className="text-gray-500">Conseil multi-IA pour reponses optimales</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                showHistory ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-white border-gray-200 hover:bg-gray-50'
              }`}
            >
              <History size={18} />
              Historique
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                showSettings ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-white border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Settings size={18} />
              Config
            </button>
          </div>
        </div>

        {showSettings && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Bot size={20} />
              Modeles du Conseil
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {configs.map((config) => (
                <div
                  key={config.id}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    config.is_active
                      ? config.is_chairman
                        ? 'border-amber-400 bg-amber-50'
                        : 'border-green-400 bg-green-50'
                      : 'border-gray-200 bg-gray-50 opacity-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full text-white ${getProviderColor(config.provider)}`}>
                      {config.provider}
                    </span>
                    {config.is_chairman && (
                      <Crown className="text-amber-500" size={18} />
                    )}
                  </div>
                  <h4 className="font-medium text-gray-900">{config.display_name}</h4>
                  <p className="text-xs text-gray-500 mt-1">{config.model_id}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span>Temp: {config.temperature}</span>
                    <span>Max: {config.max_tokens}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {showHistory && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <History size={20} />
              Sessions precedentes
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {sessions.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Aucune session</p>
              ) : (
                sessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => loadSession(session)}
                    className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900 truncate max-w-md">
                        {session.query}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(session.created_at).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <BarChart3 size={12} />
                        {session.consensus_score?.toFixed(0)}%
                      </span>
                      <span className="flex items-center gap-1">
                        <Zap size={12} />
                        {session.total_tokens_used} tokens
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={singleTurn}
                onChange={(e) => setSingleTurn(e.target.checked)}
                className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
              />
              Mode rapide (sans evaluation croisee)
            </label>
          </div>

          <div className="relative">
            <textarea
              ref={textareaRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Posez votre question au Conseil LLM..."
              className="w-full p-4 pr-24 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-amber-500 focus:border-transparent min-h-[120px]"
              disabled={loading}
            />
            <button
              onClick={handleSubmit}
              disabled={loading || !query.trim()}
              className="absolute right-3 bottom-3 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="animate-spin" size={18} />
                  Deliberation...
                </>
              ) : (
                <>
                  <Send size={18} />
                  Consulter
                </>
              )}
            </button>
          </div>
        </div>

        {loading && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <div className="animate-pulse flex flex-col items-center">
              <div className="relative">
                <Users className="text-amber-500" size={48} />
                <div className="absolute -top-1 -right-1">
                  <Loader className="animate-spin text-orange-500" size={20} />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mt-4">Le Conseil delibere...</h3>
              <p className="text-gray-500 mt-2">
                {singleTurn ? 'Collecte des reponses...' : 'Etape 1: Collecte des opinions individuelles'}
              </p>
              <div className="flex items-center gap-2 mt-4">
                {configs.filter(c => c.is_active && !c.is_chairman).slice(0, 5).map((config, i) => (
                  <div
                    key={config.id}
                    className={`w-3 h-3 rounded-full ${getProviderColor(config.provider)} animate-bounce`}
                    style={{ animationDelay: `${i * 0.1}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {response && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200">
              <div className="flex items-center gap-2">
                <BarChart3 className="text-amber-600" size={20} />
                <span className="font-medium text-gray-700">Consensus:</span>
                <span className={`font-bold text-lg ${
                  response.consensus_score >= 80 ? 'text-green-600' :
                  response.consensus_score >= 60 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {response.consensus_score}%
                </span>
              </div>
              <div className="h-6 w-px bg-amber-300" />
              <div className="flex items-center gap-2">
                <Zap className="text-amber-600" size={20} />
                <span className="text-gray-700">{response.total_tokens.toLocaleString()} tokens</span>
              </div>
              <div className="h-6 w-px bg-amber-300" />
              <div className="flex items-center gap-2">
                <Clock className="text-amber-600" size={20} />
                <span className="text-gray-700">{(response.processing_time_ms / 1000).toFixed(1)}s</span>
              </div>
              <div className="h-6 w-px bg-amber-300" />
              <div className="flex items-center gap-2">
                <Crown className="text-amber-600" size={20} />
                <span className="text-gray-700">Chairman: {response.chairman_model}</span>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="flex border-b border-gray-200">
                <button
                  onClick={() => setActiveTab('council')}
                  className={`flex-1 px-6 py-4 font-medium transition-colors ${
                    activeTab === 'council'
                      ? 'text-amber-600 bg-amber-50 border-b-2 border-amber-600'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Crown size={18} />
                    Reponse du Conseil
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('individual')}
                  className={`flex-1 px-6 py-4 font-medium transition-colors ${
                    activeTab === 'individual'
                      ? 'text-amber-600 bg-amber-50 border-b-2 border-amber-600'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Users size={18} />
                    Reponses Individuelles ({response.individual_responses.filter(r => !r.error).length})
                  </div>
                </button>
                {response.rankings.length > 0 && (
                  <button
                    onClick={() => setActiveTab('rankings')}
                    className={`flex-1 px-6 py-4 font-medium transition-colors ${
                      activeTab === 'rankings'
                        ? 'text-amber-600 bg-amber-50 border-b-2 border-amber-600'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <BarChart3 size={18} />
                      Evaluations Croisees
                    </div>
                  </button>
                )}
              </div>

              <div className="p-6">
                {activeTab === 'council' && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Crown className="text-amber-500" size={24} />
                        <h3 className="text-lg font-semibold text-gray-900">Synthese du Chairman</h3>
                      </div>
                      <button
                        onClick={() => copyToClipboard(response.final_response)}
                        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                        {copied ? 'Copie!' : 'Copier'}
                      </button>
                    </div>
                    <div className="prose prose-amber max-w-none">
                      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-200 whitespace-pre-wrap">
                        {response.final_response}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'individual' && (
                  <div className="space-y-4">
                    {response.individual_responses.map((resp, index) => (
                      <div
                        key={index}
                        className={`border rounded-xl overflow-hidden transition-all ${
                          resp.error ? 'border-red-200 bg-red-50' : 'border-gray-200'
                        }`}
                      >
                        <button
                          onClick={() => setExpandedResponse(expandedResponse === resp.model_id ? null : resp.model_id)}
                          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${
                              getProviderColor(configs.find(c => c.model_id === resp.model_id)?.provider || '')
                            }`} />
                            <span className="font-medium text-gray-900">{resp.display_name}</span>
                            {resp.error ? (
                              <AlertCircle className="text-red-500" size={16} />
                            ) : (
                              <CheckCircle className="text-green-500" size={16} />
                            )}
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-500">{resp.tokens_used} tokens</span>
                            <span className="text-sm text-gray-500">{resp.latency_ms}ms</span>
                            {expandedResponse === resp.model_id ? (
                              <ChevronUp size={18} className="text-gray-400" />
                            ) : (
                              <ChevronDown size={18} className="text-gray-400" />
                            )}
                          </div>
                        </button>

                        {expandedResponse === resp.model_id && (
                          <div className="px-4 pb-4 border-t border-gray-100">
                            {resp.error ? (
                              <p className="text-red-600 mt-3">{resp.error}</p>
                            ) : (
                              <div className="mt-3 p-4 bg-gray-50 rounded-lg whitespace-pre-wrap text-gray-700">
                                {resp.content}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'rankings' && response.rankings.length > 0 && (
                  <div className="space-y-6">
                    {response.rankings.map((reviewSet, idx) => (
                      <div key={idx} className="border border-gray-200 rounded-xl p-4">
                        <h4 className="font-medium text-gray-900 mb-3">
                          Evaluation par: {configs.find(c => c.model_id === reviewSet.reviewer)?.display_name || reviewSet.reviewer}
                        </h4>
                        <div className="space-y-3">
                          {reviewSet.rankings.map((rank, rankIdx) => (
                            <div key={rankIdx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <span className="text-sm text-gray-600">{rank.anonymous_id}</span>
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-gray-500">Precision:</span>
                                  <span className={`font-medium ${getScoreColor(rank.accuracy_score)}`}>
                                    {rank.accuracy_score}/10
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-gray-500">Insight:</span>
                                  <span className={`font-medium ${getScoreColor(rank.insight_score)}`}>
                                    {rank.insight_score}/10
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-gray-500">Clarte:</span>
                                  <span className={`font-medium ${getScoreColor(rank.clarity_score)}`}>
                                    {rank.clarity_score}/10
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {!loading && !response && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Sparkles className="mx-auto text-amber-500 mb-4" size={48} />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Bienvenue au Conseil LLM
            </h3>
            <p className="text-gray-500 max-w-lg mx-auto">
              Posez une question et recevez une reponse synthetisee a partir des meilleurs modeles IA.
              Chaque modele repond individuellement, puis ils s'evaluent mutuellement avant que le Chairman
              compile la reponse finale.
            </p>
            <div className="flex items-center justify-center gap-3 mt-6">
              {configs.filter(c => c.is_active).slice(0, 6).map((config) => (
                <div
                  key={config.id}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium text-white ${getProviderColor(config.provider)}`}
                >
                  {config.display_name}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LLMCouncilDashboard;
