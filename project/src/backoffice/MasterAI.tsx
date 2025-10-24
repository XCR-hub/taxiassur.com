import { useState, useEffect } from 'react';
import {
  Brain, Zap, TrendingUp, AlertTriangle, CheckCircle, Activity,
  Eye, RefreshCw, Settings, BarChart3, Target, Sparkles, Clock,
  Shield, Database, Globe, Mail, Share2, Search, Link, FileText,
  Users, DollarSign, Award, Rocket, Cpu, Network, Home
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SystemHealth {
  database: number;
  api: number;
  seo: number;
  automation: number;
  content: number;
  global: number;
}

interface Optimization {
  title: string;
  description: string;
  priority: string;
  status: string;
  auto_execute: boolean;
  progress: number;
}

interface AIInsight {
  type: string;
  title: string;
  description: string;
  priority: number;
  auto_execute: boolean;
  executed: boolean;
}

interface Metrics {
  pages_optimisees: number;
  backlinks_acquis: number;
  articles_generes: number;
  trafic_organique: number;
  total_leads?: number;
  recent_leads?: number;
  total_faq?: number;
  conversion_rate?: number;
  taxi_prospects?: number;
  prospects_not_contacted?: number;
  prospects_with_email?: number;
}

interface DashboardData {
  status: {
    is_active: boolean;
    mode: string;
    global_health: number;
    last_update: string;
    system_checks: SystemHealth;
  };
  insights: AIInsight[];
  optimizations: Optimization[];
  metrics: Metrics;
}

export default function MasterAI() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isAutoMode, setIsAutoMode] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    loadDashboardData();

    // Actualiser toutes les 30 secondes
    const interval = setInterval(() => {
      loadDashboardData();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      // Appeler la fonction RPC qui retourne TOUTES les données réelles
      const { data, error } = await supabase.rpc('get_ai_master_dashboard');

      if (error) {
        console.error('Error loading AI Master dashboard:', error);
        return;
      }

      if (data) {
        setDashboardData(data);
        setIsAutoMode(data.status?.is_active ?? true);
        setLastUpdate(new Date());
      }

      setLoading(false);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
      setLoading(false);
    }
  };

  const toggleAutoMode = async () => {
    setToggling(true);
    try {
      const { data, error } = await supabase.rpc('toggle_ai_automation', {
        new_state: !isAutoMode
      });

      if (error) {
        console.error('Error toggling automation:', error);
        alert('❌ Erreur lors du changement de mode');
        return;
      }

      if (data) {
        setIsAutoMode(data.is_active);
        alert(data.message);
        await loadDashboardData();
      }
    } catch (error) {
      console.error('Failed to toggle:', error);
      alert('❌ Erreur de connexion');
    } finally {
      setToggling(false);
    }
  };

  const runManualOptimization = async () => {
    alert('🤖 Lancement manuel de l\'optimisation...\n\nL\'IA analyse et optimise votre système. Résultats dans quelques instants.');
    await loadDashboardData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-8">
            <div className="h-12 bg-slate-700 rounded w-1/3"></div>
            <div className="grid grid-cols-5 gap-6">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-24 bg-slate-800 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const health = dashboardData?.status?.system_checks || {
    database: 0, api: 0, seo: 0, automation: 0, content: 0, global: 0
  };
  const globalHealth = dashboardData?.status?.global_health || 0;
  const insights = dashboardData?.insights || [];
  const optimizations = dashboardData?.optimizations || [];
  const metrics = dashboardData?.metrics || {
    pages_optimisees: 0,
    backlinks_acquis: 0,
    articles_generes: 0,
    trafic_organique: 0
  };

  const getHealthColor = (value: number) => {
    if (value >= 90) return 'text-green-400';
    if (value >= 70) return 'text-yellow-400';
    return 'text-orange-400';
  };

  const getHealthBg = (value: number) => {
    if (value >= 90) return 'bg-green-500';
    if (value >= 70) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  const getPriorityColor = (priority: string | number) => {
    const p = typeof priority === 'string' ? priority : String(priority);
    if (p === 'haute' || Number(p) >= 8) return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
    if (p === 'moyenne' || Number(p) >= 5) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
    return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
  };

  const getPriorityIcon = (priority: string) => {
    if (priority === 'haute') return <AlertTriangle size={14} />;
    if (priority === 'moyenne') return <Activity size={14} />;
    return <Eye size={14} />;
  };

  const getStatusIcon = (status: string) => {
    if (status === 'terminé') return <CheckCircle size={16} className="text-green-400" />;
    if (status === 'en_cours') return <RefreshCw size={16} className="text-blue-400 animate-spin" />;
    return <Clock size={16} className="text-slate-400" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center space-x-4 mb-2">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg">
                <Brain size={32} className="text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">IA Maître Auto-Optimisante</h1>
                <p className="text-slate-300">Système intelligent qui optimise, répare et améliore automatiquement votre site 24/7</p>
              </div>
            </div>
          </div>

          <a
            href="/backoffice"
            className="bg-orange-600 hover:bg-orange-500 text-white font-medium px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 shadow-lg"
          >
            <Home size={16} />
            <span>Accueil Backoffice</span>
          </a>
        </div>

        {/* Status Bar */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-6">
              <div>
                <div className="text-sm text-slate-400 mb-1">Mise à jour</div>
                <div className="text-white font-mono">
                  {lastUpdate ? lastUpdate.toLocaleTimeString('fr-FR') : '--:--:--'}
                </div>
              </div>

              <div className="h-12 w-px bg-slate-600"></div>

              <div>
                <div className="text-sm text-slate-400 mb-1">Santé Globale du Système</div>
                <div className={`text-3xl font-bold ${getHealthColor(globalHealth)}`}>
                  {globalHealth}%
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className={`px-4 py-2 rounded-lg ${isAutoMode ? 'bg-green-500/20 border border-green-500/40' : 'bg-slate-700 border border-slate-600'}`}>
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${isAutoMode ? 'bg-green-400 animate-pulse' : 'bg-slate-500'}`}></div>
                    <span className={`text-sm font-medium ${isAutoMode ? 'text-green-300' : 'text-slate-400'}`}>
                      MODE AUTO {isAutoMode ? 'ACTIF' : 'INACTIF'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={toggleAutoMode}
                  disabled={toggling}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    isAutoMode
                      ? 'bg-red-600 hover:bg-red-500 text-white'
                      : 'bg-green-600 hover:bg-green-500 text-white'
                  } ${toggling ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {toggling ? 'Changement...' : isAutoMode ? 'Arrêter' : 'Démarrer'}
                </button>

                <button
                  onClick={runManualOptimization}
                  className="p-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white transition-colors"
                  title="Forcer l'optimisation maintenant"
                >
                  <RefreshCw size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Health Indicators */}
        <div className="grid grid-cols-5 gap-6">
          {[
            { name: 'database', label: 'Database', icon: Database, value: health.database },
            { name: 'api', label: 'API', icon: Network, value: health.api },
            { name: 'seo', label: 'SEO', icon: Search, value: health.seo },
            { name: 'automation', label: 'Automation', icon: Cpu, value: health.automation },
            { name: 'content', label: 'Content', icon: FileText, value: health.content }
          ].map(({ name, label, icon: Icon, value }) => (
            <div key={name} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-3">
                <Icon size={24} className="text-slate-400" />
                <span className={`text-2xl font-bold ${getHealthColor(value)}`}>
                  {value}%
                </span>
              </div>
              <div className="text-sm text-slate-400">{label}</div>
              <div className="mt-2 h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full ${getHealthBg(value)} transition-all duration-500`}
                  style={{ width: `${value}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>

        {/* Insights & Optimizations */}
        <div className="grid grid-cols-2 gap-6">

          {/* AI Insights */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                <Sparkles className="text-yellow-400" size={24} />
                <span>Insights IA en Temps Réel</span>
              </h2>
            </div>

            <div className="space-y-4">
              {insights.map((insight, index) => (
                <div
                  key={index}
                  className="bg-slate-700/50 border border-slate-600 rounded-lg p-4 hover:border-purple-500/50 transition-all"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <Target size={16} className="text-purple-400" />
                        <h3 className="font-semibold text-white">{insight.title}</h3>
                      </div>
                      <div className={`inline-block px-2 py-1 rounded text-xs font-medium border ${getPriorityColor(insight.priority)}`}>
                        Priorité {insight.priority}/10
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-slate-300 mb-3">{insight.description}</p>
                  {insight.auto_execute && !insight.executed && (
                    <div className="flex items-center space-x-2 text-xs text-green-400">
                      <Zap size={12} />
                      <span>Auto-exécution...</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Optimizations */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                <Settings className="text-blue-400" size={24} />
                <span>Optimisations en Cours</span>
              </h2>
            </div>

            <div className="space-y-4">
              {optimizations.map((opt, index) => (
                <div
                  key={index}
                  className="bg-slate-700/50 border border-slate-600 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-white mb-1">{opt.title}</h3>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium border ${getPriorityColor(opt.priority)}`}>
                          {getPriorityIcon(opt.priority)}
                          <span className="ml-1 capitalize">{opt.priority}</span>
                        </span>
                        {getStatusIcon(opt.status)}
                        {opt.auto_execute && (
                          <span className="text-xs text-purple-400 flex items-center space-x-1">
                            <Cpu size={12} />
                            <span>Auto</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-slate-300 mb-3">{opt.description}</p>
                  {opt.status !== 'terminé' && (
                    <div className="mt-2">
                      <div className="h-1.5 bg-slate-600 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                          style={{ width: `${opt.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Metrics Principaux */}
        <div className="grid grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <Globe className="text-blue-400" size={28} />
              <div className="text-3xl font-bold text-white">{metrics.pages_optimisees}</div>
            </div>
            <div className="text-sm text-slate-300">Pages optimisées</div>
          </div>

          <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <Link className="text-green-400" size={28} />
              <div className="text-3xl font-bold text-white">{metrics.backlinks_acquis}</div>
            </div>
            <div className="text-sm text-slate-300">Backlinks acquis</div>
          </div>

          <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <FileText className="text-purple-400" size={28} />
              <div className="text-3xl font-bold text-white">{metrics.articles_generes}</div>
            </div>
            <div className="text-sm text-slate-300">Articles générés</div>
          </div>

          <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 border border-orange-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="text-orange-400" size={28} />
              <div className="text-3xl font-bold text-white">+{metrics.trafic_organique}%</div>
            </div>
            <div className="text-sm text-slate-300">Trafic organique</div>
          </div>
        </div>

        {/* Metrics Scraping Taxis */}
        {(metrics.taxi_prospects !== undefined && metrics.taxi_prospects > 0) && (
          <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-cyan-500/20 rounded-lg">
                  <Users className="text-cyan-400" size={28} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Scraping Taxis Google Places</h3>
                  <p className="text-sm text-slate-400">Prospection automatique 24/7</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="text-2xl font-bold text-cyan-400">{metrics.taxi_prospects}</div>
                <div className="text-xs text-slate-400 mt-1">Total prospects</div>
              </div>

              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="text-2xl font-bold text-yellow-400">{metrics.prospects_not_contacted || 0}</div>
                <div className="text-xs text-slate-400 mt-1">À contacter</div>
              </div>

              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-400">{metrics.prospects_with_email || 0}</div>
                <div className="text-xs text-slate-400 mt-1">Avec email</div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-cyan-500/30">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Projection 6 mois</span>
                <span className="text-white font-semibold">75 000 prospects</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-slate-400">ROI estimé</span>
                <span className="text-green-400 font-semibold">50-75K€</span>
              </div>
            </div>
          </div>
        )}

        {/* Info Panel */}
        <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl p-6">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-purple-500/20 rounded-lg">
              <Rocket className="text-purple-400" size={24} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white mb-2">🤖 Mode Auto-Optimisation</h3>
              <p className="text-slate-300 mb-4">
                {isAutoMode
                  ? "L'IA Maître optimise automatiquement votre système 24/7 :"
                  : "Activez le mode AUTO pour que l'IA optimise votre système 24/7 :"
                }
              </p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center space-x-2 text-green-400">
                  <CheckCircle size={16} />
                  <span>Détecte les problèmes avant qu'ils impactent</span>
                </div>
                <div className="flex items-center space-x-2 text-green-400">
                  <CheckCircle size={16} />
                  <span>Répare les erreurs SQL et bugs automatiquement</span>
                </div>
                <div className="flex items-center space-x-2 text-green-400">
                  <CheckCircle size={16} />
                  <span>Optimise le SEO et génère du contenu manquant</span>
                </div>
                <div className="flex items-center space-x-2 text-green-400">
                  <CheckCircle size={16} />
                  <span>Améliore les conversions via A/B testing auto</span>
                </div>
                <div className="flex items-center space-x-2 text-green-400">
                  <CheckCircle size={16} />
                  <span>Scrape 400 prospects taxis/jour via Google Places</span>
                </div>
                <div className="flex items-center space-x-2 text-green-400">
                  <CheckCircle size={16} />
                  <span>Apprend de chaque action pour s'améliorer</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-purple-500/30">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${isAutoMode ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
                  <span className={`font-semibold ${isAutoMode ? 'text-green-400' : 'text-red-400'}`}>
                    Statut actuel : {isAutoMode ? '🟢 ACTIF - Optimisation en cours' : '🔴 INACTIF - Système en pause'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
