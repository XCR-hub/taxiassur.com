import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { toast } from '@/lib/toast';
import {
  Activity,
  Brain,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Zap,
  Database,
  Cpu,
  BarChart3,
  Clock,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function AutonomousSystemDashboard() {
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [realtimeMetrics, setRealtimeMetrics] = useState<any[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);
  const [topRules, setTopRules] = useState<any[]>([]);
  const [patterns, setPatterns] = useState<any[]>([]);
  const [improvements, setImprovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadDashboardData();

    const interval = setInterval(() => {
      if (autoRefresh) {
        loadDashboardData();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const loadDashboardData = async () => {
    try {
      const { data: status } = await supabase.rpc('get_autonomous_system_status');
      setSystemStatus(status);

      const { data: metrics } = await supabase
        .from('realtime_metrics')
        .select('*')
        .order('measurement_time', { ascending: false })
        .limit(20);
      setRealtimeMetrics(metrics || []);

      const { data: alerts } = await supabase
        .from('smart_alerts')
        .select('*')
        .eq('acknowledged', false)
        .order('created_at', { ascending: false })
        .limit(10);
      setRecentAlerts(alerts || []);

      const { data: rules } = await supabase.rpc('get_top_performing_rules', { limit_param: 5 });
      setTopRules(rules || []);

      const { data: discoveredPatterns } = await supabase
        .from('discovered_patterns')
        .select('*')
        .order('confidence_score', { ascending: false })
        .limit(5);
      setPatterns(discoveredPatterns || []);

      const { data: autoImprovements } = await supabase
        .from('autonomous_improvements')
        .select('*')
        .eq('auto_applied', true)
        .order('created_at', { ascending: false })
        .limit(10);
      setImprovements(autoImprovements || []);

      setLoading(false);
    } catch (error) {
      logger.error('Error loading dashboard:', error);
      setLoading(false);
    }
  };

  const triggerSelfHealing = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ultra-autonomous-self-healer`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      toast.info(`Self-Healing exécuté: ${result.checks_performed} vérifications, ${result.auto_fixes_applied} corrections auto`);
      loadDashboardData();
    } catch (error) {
      logger.error('Error triggering self-healing:', error);
    }
  };

  const triggerMonitoring = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/realtime-monitoring-engine`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      toast.info(`Monitoring exécuté: ${result.anomalies?.length || 0} anomalies détectées`);
      loadDashboardData();
    } catch (error) {
      logger.error('Error triggering monitoring:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'fully_operational':
        return 'text-green-600 bg-green-100';
      case 'partially_operational':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-red-600 bg-red-100';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low':
        return 'text-blue-600 bg-blue-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'high':
        return 'text-orange-600 bg-orange-100';
      case 'critical':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Système Ultra-Autonome
          </h1>
          <p className="text-gray-600">
            IA auto-apprenante fonctionnant 24/7 en autonomie complète
          </p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-4 py-2 rounded-lg font-medium ${
              autoRefresh
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            <RefreshCw className={`w-5 h-5 inline mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {systemStatus && (
        <div className={`p-6 rounded-xl mb-6 ${getStatusColor(systemStatus.status)}`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">
                État: {systemStatus.status === 'fully_operational' ? 'Pleinement Opérationnel' :
                        systemStatus.status === 'partially_operational' ? 'Partiellement Opérationnel' :
                        'Non Opérationnel'}
              </h2>
              <div className="grid grid-cols-4 gap-4 mt-4">
                <div>
                  <div className="text-sm opacity-75">Crons Actifs</div>
                  <div className="text-2xl font-bold">{systemStatus.active_crons}</div>
                </div>
                <div>
                  <div className="text-sm opacity-75">Health Checks (1h)</div>
                  <div className="text-2xl font-bold">{systemStatus.health_checks_last_hour}</div>
                </div>
                <div>
                  <div className="text-sm opacity-75">Patterns (24h)</div>
                  <div className="text-2xl font-bold">{systemStatus.patterns_discovered_24h}</div>
                </div>
                <div>
                  <div className="text-sm opacity-75">Auto-Améliorations (24h)</div>
                  <div className="text-2xl font-bold">{systemStatus.auto_improvements_24h}</div>
                </div>
              </div>
            </div>
            <Brain className="w-20 h-20 opacity-50" />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <button
          onClick={triggerSelfHealing}
          className="p-6 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors text-left"
        >
          <Zap className="w-8 h-8 text-blue-600 mb-3" />
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            Déclencher Self-Healing
          </h3>
          <p className="text-gray-600 text-sm">
            Lance une vérification complète du système et applique les corrections automatiques
          </p>
        </button>

        <button
          onClick={triggerMonitoring}
          className="p-6 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors text-left"
        >
          <Activity className="w-8 h-8 text-purple-600 mb-3" />
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            Déclencher Monitoring
          </h3>
          <p className="text-gray-600 text-sm">
            Collecte les métriques en temps réel et détecte les anomalies
          </p>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900">Métriques Temps Réel</h3>
            <BarChart3 className="w-6 h-6 text-blue-600" />
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {realtimeMetrics.map((metric) => (
              <div key={metric.id} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">{metric.metric_name}</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    metric.status === 'healthy' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {metric.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>Valeur: {metric.current_value}</span>
                  <span>Cible: {metric.target_value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900">Alertes Actives</h3>
            <AlertTriangle className="w-6 h-6 text-orange-600" />
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {recentAlerts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                Aucune alerte active
              </div>
            ) : (
              recentAlerts.map((alert) => (
                <div key={alert.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-medium text-gray-900">{alert.title}</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(alert.severity)}`}>
                      {alert.severity}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{alert.description}</p>
                  {alert.auto_resolved && (
                    <span className="text-xs text-green-600 font-medium">✓ Auto-résolu</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900">Règles Top Performance</h3>
            <TrendingUp className="w-6 h-6 text-green-600" />
          </div>
          <div className="space-y-3">
            {topRules.map((rule, index) => (
              <div key={rule.rule_id} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">#{index + 1} {rule.rule_type}</span>
                  <span className="text-sm text-green-600 font-medium">
                    {rule.success_rate?.toFixed(1)}% succès
                  </span>
                </div>
                <div className="flex gap-4 text-xs text-gray-600">
                  <span>ROI: {rule.roi_score?.toFixed(0)}</span>
                  <span>Efficacité: {rule.efficiency_score?.toFixed(0)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900">Patterns Découverts</h3>
            <Cpu className="w-6 h-6 text-purple-600" />
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {patterns.map((pattern) => (
              <div key={pattern.id} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">{pattern.pattern_type}</span>
                  <span className="text-sm text-purple-600 font-medium">
                    {pattern.confidence_score}% confiance
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{pattern.pattern_description}</p>
                {pattern.rule_created && (
                  <span className="text-xs text-green-600 font-medium">✓ Règle créée automatiquement</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900">Améliorations Automatiques Récentes</h3>
          <Clock className="w-6 h-6 text-blue-600" />
        </div>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {improvements.map((improvement) => (
            <div key={improvement.id} className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span className="font-medium text-gray-900 block mb-1">
                    {improvement.improvement_type}
                  </span>
                  <span className="text-sm text-gray-600">
                    Zone: {improvement.area_affected}
                  </span>
                </div>
                <span className="text-xs text-blue-600 font-medium">
                  {new Date(improvement.created_at).toLocaleString('fr-FR')}
                </span>
              </div>
              {improvement.performance_delta && (
                <div className="mt-2 text-sm text-gray-700">
                  Impact: {JSON.stringify(improvement.performance_delta)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
