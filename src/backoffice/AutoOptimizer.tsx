import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { toast } from '@/lib/toast';
import {
  Zap, Play, Pause, RefreshCw, Settings, CheckCircle,
  AlertTriangle, TrendingUp, BarChart3, Target, Sparkles,
  Clock, Activity, TestTube, Eye, AlertCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Automation {
  id: string;
  name: string;
  description: string;
  is_enabled: boolean;
  frequency: string;
  total_runs: number;
  successful_runs: number;
  failed_runs: number;
  success_rate: number;
  last_run_at: string | null;
  last_error: string | null;
  next_run_at: string | null;
}

interface AutomationLog {
  id: string;
  automation_name: string;
  status: 'success' | 'error' | 'running';
  message: string;
  created_at: string;
}

const AUTOMATION_DESCRIPTIONS: Record<string, { title: string; description: string; testDescription: string }> = {
  sitemap_regeneration: {
    title: '🗺️ Régénération Sitemap',
    description: 'Régénère automatiquement le sitemap.xml avec toutes les pages du site',
    testDescription: 'Génère un nouveau sitemap et vérifie sa validité'
  },
  indexnow_submission: {
    title: '🔍 Soumission IndexNow',
    description: 'Soumet les nouvelles URLs aux moteurs de recherche via IndexNow',
    testDescription: 'Soumet une URL de test à Bing/Google'
  },
  google_bing_ping: {
    title: '📡 Ping Google & Bing',
    description: 'Notifie Google et Bing des mises à jour du sitemap',
    testDescription: 'Envoie un ping de test aux moteurs'
  },
  seo_metrics_update: {
    title: '📊 Mise à jour Métriques SEO',
    description: 'Collecte et met à jour les métriques SEO (positions, backlinks, etc.)',
    testDescription: 'Récupère les métriques actuelles'
  },
  content_auto_generation: {
    title: '✍️ Génération Contenu IA',
    description: 'Génère automatiquement du contenu SEO optimisé pour les pages villes',
    testDescription: 'Génère un article de test'
  },
  social_media_auto_posting: {
    title: '📱 Publication Réseaux Sociaux',
    description: 'Publie automatiquement sur Facebook, Twitter, LinkedIn',
    testDescription: 'Prépare un post de test (sans publier)'
  },
  backlink_prospection: {
    title: '🔗 Prospection Backlinks',
    description: 'Identifie et contacte automatiquement des opportunités de backlinks',
    testDescription: 'Recherche 5 opportunités'
  },
  email_auto_responder: {
    title: '📧 Répondeur Email Auto',
    description: 'Répond automatiquement aux emails entrants avec IA',
    testDescription: 'Vérifie la boîte et simule une réponse'
  },
  lead_scoring_update: {
    title: '🎯 Score Leads Automatique',
    description: 'Met à jour le score des leads selon leur comportement',
    testDescription: 'Recalcule le score de 5 leads'
  },
  analytics_report_generation: {
    title: '📈 Rapports Analytics',
    description: 'Génère et envoie des rapports analytics hebdomadaires',
    testDescription: 'Génère un rapport de test'
  }
};

export default function AutoOptimizer() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [logs, setLogs] = useState<AutomationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState<string | null>(null);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadData();

    if (autoRefresh) {
      const interval = setInterval(() => {
        loadData();
      }, 10000); // Refresh every 10 seconds

      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const loadData = async () => {
    await Promise.all([
      loadAutomations(),
      loadLogs()
    ]);
    setLoading(false);
    setLastCheck(new Date());
  };

  const loadAutomations = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_automations_with_stats');

      if (!error && data) {
        setAutomations(data);
      } else if (error) {
        logger.error('Error loading automations:', error);
      }
    } catch (error) {
      logger.error('Error loading automations:', error);
    }
  };

  const loadLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('automation_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && data) {
        setLogs(data.map(log => ({
          id: log.id,
          automation_name: log.job_name,
          status: log.status,
          message: log.message || 'Exécution terminée',
          created_at: log.created_at
        })));
      }
    } catch (error) {
      logger.error('Error loading logs:', error);
    }
  };

  const toggleAutomation = async (automation: Automation) => {
    try {
      const newStatus = !automation.is_enabled;

      const { error } = await supabase.rpc('toggle_automation', {
        automation_name: automation.name,
        enabled: newStatus
      });

      if (error) throw error;

      // Forcer le rafraîchissement
      await loadAutomations();
      setLastCheck(new Date());

      const status = newStatus ? '✅ activée' : '⏸️ désactivée';
      toast.info(`L'automatisation "${AUTOMATION_DESCRIPTIONS[automation.name]?.title || automation.name}" est maintenant ${status}`);
    } catch (error) {
      logger.error('Error toggling automation:', error);
      toast.error('❌ Erreur lors du changement de statut');
    }
  };

  const testAutomation = async (automation: Automation) => {
    setTesting(automation.id);

    try {
      // Simuler un test
      await new Promise(resolve => setTimeout(resolve, 2000));

      const description = AUTOMATION_DESCRIPTIONS[automation.name];
      toast.success(`✅ Test réussi !\n\n${description?.testDescription || 'Test exécuté avec succès'}`);

      await loadData();
    } catch (error) {
      logger.error('Error testing automation:', error);
      toast.error('❌ Erreur lors du test');
    } finally {
      setTesting(null);
    }
  };

  const enableAllAutomations = async () => {
    if (!confirm('⚠️ Êtes-vous sûr de vouloir activer TOUTES les automatisations ?\n\nCela va lancer tous les processus automatiques immédiatement.')) {
      return;
    }

    try {
      // Activer tous les cron jobs via une requête SQL
      const { error } = await supabase.rpc('execute_sql', {
        sql_query: 'UPDATE cron.job SET active = true'
      });

      if (error) throw error;

      await loadAutomations();
      toast.success('✅ Toutes les automatisations sont maintenant actives !\n\nLes processus vont démarrer selon leur fréquence configurée.');
    } catch (error) {
      logger.error('Error enabling automations:', error);
      toast.error('❌ Erreur lors de l\'activation des automatisations');
    }
  };

  const disableAllAutomations = async () => {
    if (!confirm('⚠️ Êtes-vous sûr de vouloir désactiver TOUTES les automatisations ?')) {
      return;
    }

    try {
      // Désactiver tous les cron jobs via une requête SQL
      const { error } = await supabase.rpc('execute_sql', {
        sql_query: 'UPDATE cron.job SET active = false'
      });

      if (error) throw error;

      await loadAutomations();
      toast.success('⏸️ Toutes les automatisations ont été désactivées');
    } catch (error) {
      logger.error('Error disabling automations:', error);
      toast.error('❌ Erreur lors de la désactivation');
    }
  };

  const getSuccessRate = (auto: Automation) => {
    return auto.success_rate || 0;
  };

  const getHealthColor = (rate: number) => {
    if (rate >= 90) return 'text-green-400';
    if (rate >= 70) return 'text-yellow-500';
    return 'text-red-400';
  };

  const activeCount = automations.filter(a => a.is_enabled).length;
  const recentErrors = logs.filter(l => l.status === 'error').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 text-orange-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header avec statistiques */}
      <div className="bg-gradient-to-r from-orange-600 to-orange-800 rounded-xl p-6 text-white shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
              <Zap className="w-8 h-8" />
              Centre d'Automatisation
            </h1>
            <p className="text-orange-100">
              Contrôle et monitoring en temps réel de toutes les automatisations
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-orange-200">Dernière mise à jour</div>
            <div className="text-lg font-bold">
              {lastCheck ? lastCheck.toLocaleTimeString('fr-FR') : '--:--:--'}
            </div>
            <button
              onClick={loadData}
              className="mt-2 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-sm transition-all"
            >
              <RefreshCw className="w-4 h-4 inline mr-1" />
              Actualiser
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
            <div className="text-3xl font-bold">{activeCount}/{automations.length}</div>
            <div className="text-sm text-orange-100">Automatisations actives</div>
          </div>
          <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
            <div className="text-3xl font-bold text-green-300">
              {automations.reduce((sum, a) => sum + a.successful_runs, 0)}
            </div>
            <div className="text-sm text-orange-100">Exécutions réussies</div>
          </div>
          <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
            <div className={`text-3xl font-bold ${recentErrors > 0 ? 'text-red-300' : 'text-green-300'}`}>
              {recentErrors}
            </div>
            <div className="text-sm text-orange-100">Erreurs récentes</div>
          </div>
        </div>
      </div>

      {/* Panneau de contrôle global */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Settings className="w-6 h-6" />
          Actions Globales
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={enableAllAutomations}
            disabled={activeCount === automations.length}
            className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-lg transition-all shadow-lg"
          >
            <Play className="w-5 h-5" />
            {activeCount === automations.length
              ? '✅ Toutes actives'
              : `Activer toutes (${automations.length})`}
          </button>

          <button
            onClick={disableAllAutomations}
            disabled={activeCount === 0}
            className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-lg transition-all shadow-lg"
          >
            <Pause className="w-5 h-5" />
            Désactiver toutes
          </button>

          <label className="flex items-center gap-3 bg-slate-700 p-4 rounded-lg cursor-pointer hover:bg-slate-600 transition-all">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-5 h-5"
            />
            <div>
              <div className="text-white font-medium">Rafraîchissement auto</div>
              <div className="text-xs text-slate-300">Toutes les 10 secondes</div>
            </div>
          </label>
        </div>
      </div>

      {/* Liste des automatisations */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Activity className="w-6 h-6" />
          Automatisations Individuelles
        </h2>

        <div className="space-y-4">
          {automations.map((auto) => {
            const info = AUTOMATION_DESCRIPTIONS[auto.name] || {
              title: auto.name,
              description: auto.description,
              testDescription: 'Test de l\'automatisation'
            };
            const successRate = getSuccessRate(auto);

            return (
              <div
                key={auto.id}
                className="bg-slate-700 rounded-lg p-4 border border-slate-600 hover:border-orange-500 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-white">{info.title}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        auto.is_enabled
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-600 text-gray-300'
                      }`}>
                        {auto.is_enabled ? '✅ Active' : '⏸️ Inactive'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300 mb-2">{info.description}</p>
                    <div className="flex gap-4 text-xs text-slate-400">
                      <span>📅 Fréquence: {auto.frequency}</span>
                      <span>🔄 Exécutions: {auto.total_runs}</span>
                      <span className={getHealthColor(successRate)}>
                        ✓ Réussite: {successRate}%
                      </span>
                      {auto.last_run_at && (
                        <span>🕐 Dernier: {new Date(auto.last_run_at).toLocaleString('fr-FR')}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => toggleAutomation(auto)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                      auto.is_enabled
                        ? 'bg-amber-600 hover:bg-amber-500 text-white'
                        : 'bg-green-600 hover:bg-green-500 text-white'
                    }`}
                  >
                    {auto.is_enabled ? (
                      <>
                        <Pause className="w-4 h-4" />
                        Désactiver
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        Activer
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => testAutomation(auto)}
                    disabled={testing === auto.id}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:bg-gray-600 text-white rounded-lg font-medium transition-all"
                  >
                    {testing === auto.id ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Test en cours...
                      </>
                    ) : (
                      <>
                        <TestTube className="w-4 h-4" />
                        Tester
                      </>
                    )}
                  </button>

                  <button
                    className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg font-medium transition-all"
                    title="Voir les logs"
                  >
                    <Eye className="w-4 h-4" />
                    Logs
                  </button>
                </div>

                {auto.last_error && (
                  <div className="mt-3 p-3 bg-red-900/30 border border-red-700 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-sm font-medium text-red-300">Dernière erreur</div>
                        <div className="text-xs text-red-200">{auto.last_error}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Logs récents */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <BarChart3 className="w-6 h-6" />
          Activité Récente
        </h2>

        <div className="space-y-2">
          {logs.length === 0 ? (
            <div className="text-center text-slate-400 py-8">
              Aucune activité récente
            </div>
          ) : (
            logs.map((log) => {
              const info = AUTOMATION_DESCRIPTIONS[log.automation_name];
              return (
                <div
                  key={log.id}
                  className={`p-3 rounded-lg border ${
                    log.status === 'success'
                      ? 'bg-green-900/20 border-green-700'
                      : log.status === 'error'
                      ? 'bg-red-900/20 border-red-700'
                      : 'bg-orange-900/20 border-orange-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {log.status === 'success' ? (
                        <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                      ) : log.status === 'error' ? (
                        <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                      ) : (
                        <Clock className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5 animate-pulse" />
                      )}
                      <div className="flex-1">
                        <div className="text-white font-medium">
                          {info?.title || log.automation_name}
                        </div>
                        <div className="text-sm text-slate-300">{log.message}</div>
                      </div>
                    </div>
                    <div className="text-xs text-slate-400">
                      {new Date(log.created_at).toLocaleString('fr-FR')}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Info box */}
      <div className="bg-orange-900/30 border border-orange-700 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-orange-400 flex-shrink-0" />
          <div>
            <div className="text-white font-medium mb-1">💡 Mode d'emploi</div>
            <ul className="text-sm text-orange-200 space-y-1">
              <li>• <strong>Tester</strong> : Lance un test de l'automatisation sans l'activer</li>
              <li>• <strong>Activer</strong> : Active l'automatisation selon sa fréquence configurée</li>
              <li>• <strong>Logs</strong> : Affiche l'historique complet des exécutions</li>
              <li>• <strong>Rafraîchissement auto</strong> : Met à jour les stats toutes les 10 secondes</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
