import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { logger } from '@/lib/logger';
import {
  Zap, Activity, CheckCircle, XCircle, Clock, TrendingUp,
  Play, Pause, Settings, BarChart3, Target, Sparkles,
  Mail, MessageSquare, Phone, FileText, Calendar, Users,
  RefreshCw, AlertCircle, ArrowRight, Eye
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface AutomationRule {
  id: string;
  name: string;
  description: string;
  category: string;
  trigger_type: string;
  is_active: boolean;
  execution_count: number;
  success_count: number;
  last_executed_at: string;
}

interface AutomationHistory {
  id: string;
  action_type: string;
  status: string;
  executed_at: string;
  execution_time_ms: number;
  lead_id: string;
}

interface Activity {
  id: string;
  activity_type: string;
  score_impact: number;
  created_at: string;
  lead_id: string;
}

interface Stats {
  total_automations: number;
  active_automations: number;
  today_executions: number;
  success_rate: number;
  total_activities: number;
  avg_score_impact: number;
}

const AutomationDashboard: React.FC = () => {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [history, setHistory] = useState<AutomationHistory[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [stats, setStats] = useState<Stats>({
    total_automations: 0,
    active_automations: 0,
    today_executions: 0,
    success_rate: 0,
    total_activities: 0,
    avg_score_impact: 0
  });

  const [isExecuting, setIsExecuting] = useState(false);
  const [activeTab, setActiveTab] = useState<'rules' | 'history' | 'activities'>('rules');

  useEffect(() => {
    loadData();

    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    await Promise.all([
      loadRules(),
      loadHistory(),
      loadActivities(),
      loadStats()
    ]);
  };

  const loadRules = async () => {
    const { data } = await supabase
      .from('crm_automation_rules')
      .select('*')
      .order('priority', { ascending: false });

    if (data) setRules(data);
  };

  const loadHistory = async () => {
    const { data } = await supabase
      .from('crm_automation_history')
      .select('*')
      .order('executed_at', { ascending: false })
      .limit(50);

    if (data) setHistory(data);
  };

  const loadActivities = async () => {
    const { data } = await supabase
      .from('crm_lead_activities')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) setActivities(data);
  };

  const loadStats = async () => {
    const [rulesData, historyData, activitiesData] = await Promise.all([
      supabase.from('crm_automation_rules').select('id, is_active'),
      supabase.from('crm_automation_history').select('status, executed_at'),
      supabase.from('crm_lead_activities').select('score_impact')
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayExecutions = historyData.data?.filter(
      h => new Date(h.executed_at) >= today
    ).length || 0;

    const successCount = historyData.data?.filter(h => h.status === 'success').length || 0;
    const totalExecutions = historyData.data?.length || 0;

    const avgImpact = activitiesData.data?.length
      ? activitiesData.data.reduce((sum, a) => sum + (a.score_impact || 0), 0) / activitiesData.data.length
      : 0;

    setStats({
      total_automations: rulesData.data?.length || 0,
      active_automations: rulesData.data?.filter(r => r.is_active).length || 0,
      today_executions: todayExecutions,
      success_rate: totalExecutions > 0 ? (successCount / totalExecutions) * 100 : 0,
      total_activities: activitiesData.data?.length || 0,
      avg_score_impact: avgImpact
    });
  };

  const toggleRule = async (ruleId: string, currentStatus: boolean) => {
    await supabase
      .from('crm_automation_rules')
      .update({ is_active: !currentStatus })
      .eq('id', ruleId);

    loadRules();
  };

  const executeAutomations = async () => {
    setIsExecuting(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crm-automation-engine`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'execute_workflows'
          })
        }
      );

      const data = await response.json();

      if (data.success) {
        alert(`✅ ${data.workflows_executed} workflows exécutés avec succès`);
        loadData();
      }
    } catch (error) {
      logger.error('Error executing automations:', error);
      alert('❌ Erreur lors de l\'exécution');
    } finally {
      setIsExecuting(false);
    }
  };

  const detectOpportunities = async () => {
    setIsExecuting(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crm-automation-engine`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'detect_opportunities'
          })
        }
      );

      const data = await response.json();

      if (data.success) {
        alert('✅ Détection des opportunités terminée');
        loadData();
      }
    } catch (error) {
      logger.error('Error detecting opportunities:', error);
      alert('❌ Erreur lors de la détection');
    } finally {
      setIsExecuting(false);
    }
  };

  const generateSuggestions = async () => {
    setIsExecuting(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crm-automation-engine`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'generate_suggestions'
          })
        }
      );

      const data = await response.json();

      if (data.success) {
        alert(`✅ ${data.suggestions} suggestions IA générées`);
        loadData();
      }
    } catch (error) {
      logger.error('Error generating suggestions:', error);
      alert('❌ Erreur lors de la génération');
    } finally {
      setIsExecuting(false);
    }
  };

  const getActionIcon = (actionType: string) => {
  const navigate = useNavigate();
switch (actionType) {
      case 'send_email': return Mail;
      case 'send_sms': return MessageSquare;
      case 'create_task': return FileText;
      case 'call_now': return Phone;
      case 'update_score': return TrendingUp;
      default: return Activity;
    }
  };

  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case 'email_opened': return Mail;
      case 'link_clicked': return Target;
      case 'document_viewed': return Eye;
      case 'form_submitted': return FileText;
      default: return Activity;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
                <Zap className="text-yellow-500" size={32} />
                Automatisations CRM
              </h1>
              <p className="text-gray-600 mt-1">
                Système d'automatisation intelligent • {stats.active_automations} règles actives
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={detectOpportunities}
                disabled={isExecuting}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
              >
                <Target size={18} />
                Détecter Opportunités
              </button>

              <button
                onClick={generateSuggestions}
                disabled={isExecuting}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
              >
                <Sparkles size={18} />
                Suggérer Actions
              </button>

              <button
                onClick={executeAutomations}
                disabled={isExecuting}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
              >
                {isExecuting ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    En cours...
                  </>
                ) : (
                  <>
                    <Play size={18} />
                    Exécuter Workflows
                  </>
                )}
              </button>

              <button onClick={() => navigate("/backoffice")} className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                <Users size={18} />
                Menu Admin
              </button>
            </div>
          </div>

          <div className="grid grid-cols-6 gap-3 mt-4">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <Settings size={20} className="opacity-80" />
              </div>
              <div className="text-2xl font-black">{stats.total_automations}</div>
              <div className="text-xs opacity-90 mt-1">Total Automatisations</div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <Zap size={20} className="opacity-80" />
              </div>
              <div className="text-2xl font-black">{stats.active_automations}</div>
              <div className="text-xs opacity-90 mt-1">Actives</div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <Activity size={20} className="opacity-80" />
              </div>
              <div className="text-2xl font-black">{stats.today_executions}</div>
              <div className="text-xs opacity-90 mt-1">Exécutions Aujourd'hui</div>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-red-500 text-white rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle size={20} className="opacity-80" />
              </div>
              <div className="text-2xl font-black">{stats.success_rate.toFixed(1)}%</div>
              <div className="text-xs opacity-90 mt-1">Taux Succès</div>
            </div>

            <div className="bg-gradient-to-br from-yellow-500 to-amber-600 text-white rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <Target size={20} className="opacity-80" />
              </div>
              <div className="text-2xl font-black">{stats.total_activities}</div>
              <div className="text-xs opacity-90 mt-1">Activités Détectées</div>
            </div>

            <div className="bg-gradient-to-br from-teal-500 to-cyan-600 text-white rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp size={20} className="opacity-80" />
              </div>
              <div className="text-2xl font-black">+{Math.round(stats.avg_score_impact)}</div>
              <div className="text-xs opacity-90 mt-1">Impact Moyen Score</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto px-6 py-6">
        <div className="bg-white rounded-xl shadow-lg mb-6">
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex items-center gap-3">
              {[
                { key: 'rules', label: 'Règles', icon: Settings },
                { key: 'history', label: 'Historique', icon: Clock },
                { key: 'activities', label: 'Activités', icon: Activity }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all ${
                    activeTab === tab.key
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <tab.icon size={18} />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'rules' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-black text-gray-900">Règles d'Automatisation</h2>
                </div>

                <div className="space-y-3">
                  {rules.map(rule => (
                    <div
                      key={rule.id}
                      className="flex items-center justify-between p-5 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-black text-gray-900 text-lg">{rule.name}</h3>
                          <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                            rule.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-200 text-gray-600'
                          }`}>
                            {rule.is_active ? 'Active' : 'Inactive'}
                          </span>
                          <span className="px-3 py-1 rounded-lg text-xs font-bold bg-blue-100 text-blue-800">
                            {rule.category}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{rule.description}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>{rule.execution_count} exécutions</span>
                          <span>•</span>
                          <span>{rule.success_count} succès</span>
                          {rule.last_executed_at && (
                            <>
                              <span>•</span>
                              <span>
                                Dernière : {new Date(rule.last_executed_at).toLocaleString('fr-FR')}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => toggleRule(rule.id, rule.is_active)}
                        className={`px-6 py-3 rounded-lg font-bold transition-all ${
                          rule.is_active
                            ? 'bg-red-600 hover:bg-red-700 text-white'
                            : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                      >
                        {rule.is_active ? (
                          <><Pause size={18} className="inline mr-2" />Désactiver</>
                        ) : (
                          <><Play size={18} className="inline mr-2" />Activer</>
                        )}
                      </button>
                    </div>
                  ))}

                  {rules.length === 0 && (
                    <div className="text-center py-16 text-gray-500">
                      <Settings className="mx-auto mb-4 text-gray-300" size={64} />
                      <p className="font-medium text-lg">Aucune règle d'automatisation</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="space-y-4">
                <h2 className="text-2xl font-black text-gray-900 mb-6">Historique des Exécutions</h2>

                <div className="space-y-2">
                  {history.map(item => {
                    const Icon = getActionIcon(item.action_type);
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-lg ${
                            item.status === 'success' ? 'bg-green-100 text-green-600' :
                            item.status === 'failed' ? 'bg-red-100 text-red-600' :
                            'bg-yellow-100 text-yellow-600'
                          }`}>
                            <Icon size={20} />
                          </div>
                          <div>
                            <div className="font-bold text-gray-900">{item.action_type}</div>
                            <div className="text-sm text-gray-600">
                              {new Date(item.executed_at).toLocaleString('fr-FR')} • {item.execution_time_ms}ms
                            </div>
                          </div>
                        </div>

                        <div className={`px-4 py-2 rounded-lg font-bold text-sm ${
                          item.status === 'success' ? 'bg-green-100 text-green-800' :
                          item.status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {item.status}
                        </div>
                      </div>
                    );
                  })}

                  {history.length === 0 && (
                    <div className="text-center py-16 text-gray-500">
                      <Clock className="mx-auto mb-4 text-gray-300" size={64} />
                      <p className="font-medium text-lg">Aucun historique</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'activities' && (
              <div className="space-y-4">
                <h2 className="text-2xl font-black text-gray-900 mb-6">Activités Détectées</h2>

                <div className="space-y-2">
                  {activities.map(activity => {
                    const Icon = getActivityIcon(activity.activity_type);
                    return (
                      <div
                        key={activity.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-3 rounded-lg bg-blue-100 text-blue-600">
                            <Icon size={20} />
                          </div>
                          <div>
                            <div className="font-bold text-gray-900">{activity.activity_type}</div>
                            <div className="text-sm text-gray-600">
                              {new Date(activity.created_at).toLocaleString('fr-FR')}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {activity.score_impact > 0 && (
                            <div className="px-4 py-2 rounded-lg bg-green-100 text-green-800 font-bold">
                              +{activity.score_impact} pts
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {activities.length === 0 && (
                    <div className="text-center py-16 text-gray-500">
                      <Activity className="mx-auto mb-4 text-gray-300" size={64} />
                      <p className="font-medium text-lg">Aucune activité détectée</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutomationDashboard;
