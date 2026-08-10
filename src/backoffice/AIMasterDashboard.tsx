import React, { useState, useEffect } from 'react';
import { internalFunctionHeaders } from '@/lib/internal-function-auth';
import { Activity, TrendingUp, Zap, Target, Brain, AlertTriangle, CheckCircle, Clock, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { logger } from '@/lib/logger';
import { toast } from '@/lib/toast';

interface AIDecision {
  id: string;
  decision_type: string;
  action_taken: string;
  data_analyzed: Record<string, unknown>;
  confidence_score: number;
  status: string;
  created_at: string;
  error_message?: string;
}

interface AIMetric {
  metric_date: string;
  total_leads: number;
  conversion_rate: number;
  organic_traffic: number;
  ai_actions_count: number;
}

interface AIKeyword {
  keyword: string;
  current_position: number;
  target_position: number;
  priority_score: number;
  ai_strategy: string;
}

const AIMasterDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [decisions, setDecisions] = useState<AIDecision[]>([]);
  const [metrics, setMetrics] = useState<AIMetric[]>([]);
  const [keywords, setKeywords] = useState<AIKeyword[]>([]);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [decisionsRes, metricsRes, keywordsRes] = await Promise.all([
        supabase
          .from('ai_decisions_log')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('ai_performance_metrics')
          .select('*')
          .order('metric_date', { ascending: false })
          .limit(7),
        supabase
          .from('ai_keywords_strategy')
          .select('*')
          .order('priority_score', { ascending: false })
          .limit(10)
      ]);

      if (decisionsRes.data) setDecisions(decisionsRes.data);
      if (metricsRes.data) setMetrics(metricsRes.data);
      if (keywordsRes.data) setKeywords(keywordsRes.data);
    } catch (error) {
      logger.error('Error loading AI data:', error);
    } finally {
      setLoading(false);
    }
  };

  const executeAIMaster = async () => {
    setExecuting(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/master-ai-decision-engine`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': (await internalFunctionHeaders()).Authorization
        }
      });

      const result = await response.json();
      logger.log('IA Master exécutée:', result);

      toast.success(`✅ IA Master exécutée avec succès!\n\n${result.decisions_count} décisions prises\nTendance: ${result.performance_trend}\nLeads 24h: ${result.leads_24h}`);

      await loadData();
    } catch (error) {
      logger.error('Error executing AI Master:', error);
      toast.error('❌ Erreur lors de l\'exécution de l\'IA Master');
    } finally {
      setExecuting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Brain className="mx-auto mb-4 animate-pulse text-blue-600" size={48} />
          <p className="text-gray-600">Chargement IA Master...</p>
        </div>
      </div>
    );
  }

  const latestMetric = metrics[0] || {};
  const previousMetric = metrics[1] || {};

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-gray-900 to-blue-900 text-white py-8 px-6">
        <div className="max-w-7xl mx-auto mb-4">
          <button
            onClick={() => navigate('/backoffice/crm')}
            className="flex items-center gap-2 px-4 py-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition"
          >
            <ArrowLeft size={20} />
            Retour
          </button>
        </div>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-black mb-2 flex items-center">
                <Brain className="mr-3" size={40} />
                IA MASTER AUTONOME
              </h1>
              <p className="text-blue-200 text-lg">
                Systeme d'optimisation continue - Objectif: Leader #1 Assurance Taxi France
              </p>
            </div>
            <button
              onClick={executeAIMaster}
              disabled={executing}
              className="bg-white text-blue-700 px-6 py-3 rounded-lg font-bold hover:bg-blue-50 transition-all disabled:opacity-50 flex items-center"
            >
              {executing ? (
                <>
                  <Clock className="mr-2 animate-spin" size={20} />
                  Execution...
                </>
              ) : (
                <>
                  <Zap className="mr-2" size={20} />
                  Lancer IA Maintenant
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <Target className="text-blue-600" size={24} />
              <span className="text-sm text-gray-500">Aujourd'hui</span>
            </div>
            <div className="text-3xl font-black text-gray-900">{latestMetric.total_leads || 0}</div>
            <div className="text-sm text-gray-600">Leads Générés</div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="text-green-600" size={24} />
              <span className="text-sm text-gray-500">Conversion</span>
            </div>
            <div className="text-3xl font-black text-gray-900">
              {latestMetric.conversion_rate?.toFixed(1) || 0}%
            </div>
            <div className="text-sm text-gray-600">Taux de Conversion</div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <Activity className="text-cyan-600" size={24} />
              <span className="text-sm text-gray-500">Trafic</span>
            </div>
            <div className="text-3xl font-black text-gray-900">{latestMetric.organic_traffic || 0}</div>
            <div className="text-sm text-gray-600">Visites Organiques</div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <Brain className="text-blue-600" size={24} />
              <span className="text-sm text-gray-500">Actions IA</span>
            </div>
            <div className="text-3xl font-black text-gray-900">{decisions.length}</div>
            <div className="text-sm text-gray-600">Decisions Prises</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-xl font-black mb-4 flex items-center">
              <Zap className="mr-2 text-yellow-600" size={24} />
              Décisions IA Récentes
            </h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {decisions.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Aucune décision pour le moment</p>
              ) : (
                decisions.map((decision) => (
                  <div
                    key={decision.id}
                    className={`p-4 rounded-lg border-l-4 ${
                      decision.status === 'executed'
                        ? 'bg-green-50 border-green-500'
                        : decision.error_message
                        ? 'bg-red-50 border-red-500'
                        : 'bg-blue-50 border-blue-500'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-bold text-sm uppercase text-gray-900">
                        {decision.decision_type.replace(/_/g, ' ')}
                      </h3>
                      {decision.status === 'executed' ? (
                        <CheckCircle className="text-green-600" size={18} />
                      ) : (
                        <AlertTriangle className="text-yellow-600" size={18} />
                      )}
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{decision.action_taken}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">
                        Confiance: {decision.confidence_score}%
                      </span>
                      <span className="text-gray-500">
                        {new Date(decision.created_at).toLocaleString('fr-FR')}
                      </span>
                    </div>
                    {decision.error_message && (
                      <p className="text-xs text-red-600 mt-2">❌ {decision.error_message}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-xl font-black mb-4 flex items-center">
              <Target className="mr-2 text-blue-600" size={24} />
              Stratégie Keywords SEO
            </h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {keywords.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Aucun keyword analysé</p>
              ) : (
                keywords.map((keyword) => (
                  <div key={keyword.keyword} className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-sm text-gray-900">{keyword.keyword}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        keyword.priority_score > 70
                          ? 'bg-red-100 text-red-700'
                          : keyword.priority_score > 50
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        Priorité: {keyword.priority_score}
                      </span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600 mb-2">
                      <span>Position: #{keyword.current_position}</span>
                      <span className="mx-2">→</span>
                      <span className="text-green-600 font-bold">Objectif: #{keyword.target_position}</span>
                    </div>
                    {keyword.ai_strategy && (
                      <p className="text-xs text-gray-600 mt-2">💡 {keyword.ai_strategy}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-6 rounded-xl border border-blue-200">
          <h2 className="text-xl font-black mb-4 text-blue-900">Statut du Systeme</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-lg">
              <h3 className="font-bold mb-2 text-gray-900">Automatisations Actives</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li className="flex items-center gap-2"><CheckCircle size={14} className="text-green-500" /> Execution IA Master: Toutes les heures</li>
                <li className="flex items-center gap-2"><CheckCircle size={14} className="text-green-500" /> Email notifications: 9h et 18h</li>
                <li className="flex items-center gap-2"><CheckCircle size={14} className="text-green-500" /> Analyse performance: Continue</li>
                <li className="flex items-center gap-2"><CheckCircle size={14} className="text-green-500" /> Optimisation SEO: Automatique</li>
                <li className="flex items-center gap-2"><CheckCircle size={14} className="text-green-500" /> Generation contenu: 24/7</li>
              </ul>
            </div>
            <div className="bg-white p-4 rounded-lg">
              <h3 className="font-bold mb-2 text-gray-900">Permissions IA</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li className="flex items-center gap-2"><CheckCircle size={14} className="text-green-500" /> Creation de contenu automatique</li>
                <li className="flex items-center gap-2"><CheckCircle size={14} className="text-green-500" /> Modification des strategies SEO</li>
                <li className="flex items-center gap-2"><CheckCircle size={14} className="text-green-500" /> Optimisation des conversions</li>
                <li className="flex items-center gap-2"><CheckCircle size={14} className="text-green-500" /> Ajustement des pop-ups</li>
                <li className="flex items-center gap-2"><CheckCircle size={14} className="text-green-500" /> Gestion autonome complete</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 p-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg">
            <p className="font-bold text-center text-lg">
              OBJECTIF: DEVENIR LE LEADER #1 DE L'ASSURANCE TAXI EN FRANCE
            </p>
            <p className="text-center text-sm mt-2 text-blue-100">
              L'IA travaille 24/7 de maniere autonome pour atteindre cet objectif
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIMasterDashboard;
