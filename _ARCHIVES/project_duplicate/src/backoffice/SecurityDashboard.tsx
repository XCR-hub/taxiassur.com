import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Activity, Lock, Eye, TrendingUp, Users, Globe, Home, RefreshCw, Download, BarChart3, Clock, CheckCircle, XCircle } from 'lucide-react';
import Card from '../components/Card';
import { supabase } from '../lib/supabase';

interface SecurityLog {
  id: string;
  timestamp: string;
  level: string;
  message: string;
  ip: string;
  user_agent: string;
  path: string;
  method: string;
  status_code: number;
  blocked: boolean;
  threat_type: string | null;
  context: any;
  created_at: string;
}

interface SecurityStats {
  totalRequests: number;
  blockedRequests: number;
  spamAttempts: number;
  validLeads: number;
  uniqueIPs: number;
  avgResponseTime: number;
  topThreats: Array<{ type: string; count: number }>;
  ipAnalysis: Array<{ ip: string; requests: number; blocked: boolean; country?: string }>;
  hourlyActivity: Array<{ hour: number; requests: number }>;
}

const SecurityDashboard: React.FC = () => {
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);
  const [stats, setStats] = useState<SecurityStats>({
    totalRequests: 0,
    blockedRequests: 0,
    spamAttempts: 0,
    validLeads: 0,
    uniqueIPs: 0,
    avgResponseTime: 0,
    topThreats: [],
    ipAnalysis: [],
    hourlyActivity: []
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('24h');
  const [liveMode, setLiveMode] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    loadSecurityData();
    const interval = setInterval(() => {
      if (liveMode) {
        loadSecurityData();
      }
    }, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [timeRange, liveMode]);

  const getTimeRangeQuery = () => {
    const now = new Date();
    let timeAgo = new Date();

    switch (timeRange) {
      case '1h':
        timeAgo.setHours(now.getHours() - 1);
        break;
      case '24h':
        timeAgo.setHours(now.getHours() - 24);
        break;
      case '7d':
        timeAgo.setDate(now.getDate() - 7);
        break;
      case '30d':
        timeAgo.setDate(now.getDate() - 30);
        break;
      default:
        timeAgo.setHours(now.getHours() - 24);
    }

    return timeAgo.toISOString();
  };

  const loadSecurityData = async () => {
    try {
      const timeAgo = getTimeRangeQuery();

      // Charger les logs de sécurité
      const { data: logs, error: logsError } = await supabase
        .from('security_logs')
        .select('*')
        .gte('created_at', timeAgo)
        .order('created_at', { ascending: false })
        .limit(50);

      if (logsError) {
        console.error('Error loading security logs:', logsError);
      } else {
        setSecurityLogs(logs || []);
      }

      // Charger les leads pour valider
      const { data: leads } = await supabase
        .from('leads')
        .select('id, created_at, status')
        .gte('created_at', timeAgo);

      // Calculer les statistiques
      const totalRequests = logs?.length || 0;
      const blockedRequests = logs?.filter(l => l.blocked).length || 0;
      const uniqueIPs = new Set(logs?.map(l => l.ip) || []).size;

      // Analyser les menaces
      const threatCounts: Record<string, number> = {};
      logs?.forEach(log => {
        if (log.threat_type) {
          threatCounts[log.threat_type] = (threatCounts[log.threat_type] || 0) + 1;
        }
      });

      const topThreats = Object.entries(threatCounts)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Analyser les IPs
      const ipCounts: Record<string, { requests: number; blocked: boolean }> = {};
      logs?.forEach(log => {
        if (!ipCounts[log.ip]) {
          ipCounts[log.ip] = { requests: 0, blocked: false };
        }
        ipCounts[log.ip].requests += 1;
        if (log.blocked) {
          ipCounts[log.ip].blocked = true;
        }
      });

      const ipAnalysis = Object.entries(ipCounts)
        .map(([ip, data]) => ({ ip, ...data }))
        .sort((a, b) => b.requests - a.requests)
        .slice(0, 10);

      // Activité horaire
      const hourlyActivity: Record<number, number> = {};
      logs?.forEach(log => {
        const hour = new Date(log.created_at).getHours();
        hourlyActivity[hour] = (hourlyActivity[hour] || 0) + 1;
      });

      const hourlyData = Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        requests: hourlyActivity[i] || 0
      }));

      setStats({
        totalRequests,
        blockedRequests,
        spamAttempts: logs?.filter(l => l.threat_type?.includes('spam')).length || 0,
        validLeads: leads?.length || 0,
        uniqueIPs,
        avgResponseTime: 0, // À calculer si disponible
        topThreats,
        ipAnalysis,
        hourlyActivity: hourlyData
      });

      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to load security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSecurityScore = (): number => {
    const { totalRequests, blockedRequests, validLeads } = stats;
    if (totalRequests === 0) return 100;

    const blockRate = (blockedRequests / totalRequests) * 100;
    const validRate = validLeads > 0 ? (validLeads / totalRequests) * 100 : 0;

    // Score basé sur taux de blocage et taux de conversion
    const score = Math.max(0, 100 - blockRate + validRate * 0.5);
    return Math.min(100, Math.round(score * 10) / 10);
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Très Bon';
    if (score >= 60) return 'Bon';
    if (score >= 40) return 'Moyen';
    return 'À améliorer';
  };

  const getScoreColor = (score: number): string => {
    if (score >= 90) return 'from-green-500 to-emerald-500';
    if (score >= 75) return 'from-blue-500 to-cyan-500';
    if (score >= 60) return 'from-yellow-500 to-orange-500';
    return 'from-orange-500 to-red-500';
  };

  const getLevelColor = (level: string): string => {
    switch (level.toLowerCase()) {
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'info': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'success': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const exportSecurityReport = () => {
    const report = {
      generated_at: new Date().toISOString(),
      time_range: timeRange,
      stats,
      logs: securityLogs,
      score: getSecurityScore()
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `security-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-yellow-50 to-orange-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-12 bg-gray-300 rounded-xl w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-300 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const securityScore = getSecurityScore();

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-yellow-50 to-orange-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-pink-600 rounded-xl p-6 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Shield className="w-8 h-8" />
                Tableau de Bord Sécurité
              </h1>
              <p className="text-red-100 mt-2">
                Monitoring et protection en temps réel
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <a
                href="/backoffice"
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors flex items-center space-x-2"
              >
                <Home size={18} />
                <span>Accueil</span>
              </a>
              <button
                onClick={exportSecurityReport}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors flex items-center space-x-2"
              >
                <Download size={18} />
                <span>Exporter</span>
              </button>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between bg-white rounded-xl p-4 shadow-md">
          <div className="flex items-center space-x-4">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="1h">Dernière heure</option>
              <option value="24h">Dernières 24h</option>
              <option value="7d">7 derniers jours</option>
              <option value="30d">30 derniers jours</option>
            </select>

            <button
              onClick={() => setLiveMode(!liveMode)}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                liveMode
                  ? 'bg-green-100 text-green-700 border-2 border-green-500'
                  : 'bg-gray-100 text-gray-700 border-2 border-gray-300'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${liveMode ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
              <span>{liveMode ? 'Live' : 'Pause'}</span>
            </button>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600 flex items-center space-x-2">
              <Clock size={16} />
              <span>Actualisé: {lastRefresh.toLocaleTimeString('fr-FR')}</span>
            </div>
            <button
              onClick={loadSecurityData}
              disabled={loading}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors flex items-center space-x-2 disabled:opacity-50 font-medium"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              <span>Actualiser</span>
            </button>
          </div>
        </div>

        {/* Security Score */}
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`w-20 h-20 bg-gradient-to-br ${getScoreColor(securityScore)} rounded-full flex items-center justify-center shadow-lg`}>
                <Shield className="text-white" size={32} />
              </div>
              <div>
                <h3 className="text-3xl font-bold text-gray-900">
                  {securityScore}/100
                </h3>
                <p className="text-lg text-gray-600">
                  {getScoreLabel(securityScore)}
                </p>
              </div>
            </div>
            <div className="text-right space-y-2">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <CheckCircle size={16} className="text-green-600" />
                <span>{stats.validLeads} leads valides</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <XCircle size={16} className="text-red-600" />
                <span>{stats.blockedRequests} menaces bloquées</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Requêtes Totales</p>
                <p className="text-3xl font-bold text-gray-800">{stats.totalRequests}</p>
              </div>
              <Globe size={32} className="text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Menaces Bloquées</p>
                <p className="text-3xl font-bold text-gray-800">{stats.blockedRequests}</p>
              </div>
              <AlertTriangle size={32} className="text-red-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">IPs Uniques</p>
                <p className="text-3xl font-bold text-gray-800">{stats.uniqueIPs}</p>
              </div>
              <Users size={32} className="text-yellow-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Leads Valides</p>
                <p className="text-3xl font-bold text-gray-800">{stats.validLeads}</p>
              </div>
              <CheckCircle size={32} className="text-green-500" />
            </div>
          </div>
        </div>

        {/* Threat Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-white shadow-lg">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
              <AlertTriangle className="mr-2 text-red-600" size={20} />
              Top Menaces Détectées
            </h3>
            {stats.topThreats.length > 0 ? (
              <div className="space-y-3">
                {stats.topThreats.map((threat, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-orange-300 transition-colors">
                    <span className="font-medium text-gray-900">{threat.type}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">{threat.count} tentatives</span>
                      <div className={`w-3 h-3 rounded-full ${
                        threat.count > 20 ? 'bg-red-500' : threat.count > 10 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-8 text-gray-500">Aucune menace détectée</p>
            )}
          </Card>

          <Card className="bg-white shadow-lg">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
              <Globe className="mr-2 text-orange-600" size={20} />
              IPs Suspectes
            </h3>
            {stats.ipAnalysis.length > 0 ? (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {stats.ipAnalysis.map((ip, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center space-x-3">
                      <code className="text-sm font-mono bg-gray-200 px-2 py-1 rounded">
                        {ip.ip}
                      </code>
                      {ip.blocked && (
                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full font-medium">
                          Bloquée
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-gray-600 font-medium">{ip.requests} req</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-8 text-gray-500">Aucune IP suspecte</p>
            )}
          </Card>
        </div>

        {/* Activity Graph */}
        <Card className="bg-white shadow-lg">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
            <BarChart3 className="mr-2 text-orange-600" size={20} />
            Activité par Heure
          </h3>
          <div className="flex items-end justify-between h-40 space-x-1">
            {stats.hourlyActivity.map((hour) => {
              const maxRequests = Math.max(...stats.hourlyActivity.map(h => h.requests), 1);
              const height = (hour.requests / maxRequests) * 100;
              return (
                <div key={hour.hour} className="flex-1 flex flex-col items-center space-y-1">
                  <div
                    className="w-full bg-gradient-to-t from-orange-600 to-orange-400 rounded-t-lg hover:from-orange-700 hover:to-orange-500 transition-all cursor-pointer"
                    style={{ height: `${height}%` }}
                    title={`${hour.hour}h: ${hour.requests} requêtes`}
                  ></div>
                  <span className="text-xs text-gray-600">{hour.hour}h</span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Security Logs */}
        <Card className="bg-white shadow-lg">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-800 flex items-center">
              <Activity className="mr-2 text-green-600" size={20} />
              Logs Sécurité en Temps Réel
            </h3>
            <div className="flex items-center space-x-2">
              {liveMode && <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>}
              <span className="text-sm text-gray-600">{securityLogs.length} événements</span>
            </div>
          </div>

          {securityLogs.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
              {securityLogs.map((log) => (
                <div
                  key={log.id}
                  className={`p-4 rounded-lg border ${getLevelColor(log.level)}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase`}>
                        {log.level}
                      </span>
                      <span className="text-sm font-semibold text-gray-900">{log.message}</span>
                      {log.blocked && (
                        <span className="px-2 py-1 bg-red-600 text-white text-xs rounded-full font-medium">
                          BLOQUÉ
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-600">
                      {new Date(log.created_at).toLocaleTimeString('fr-FR')}
                    </span>
                  </div>

                  <div className="flex items-center space-x-4 text-xs text-gray-600">
                    <span className="flex items-center space-x-1">
                      <Globe size={12} />
                      <code className="bg-gray-200 px-2 py-0.5 rounded">{log.ip}</code>
                    </span>
                    {log.path && (
                      <span className="flex items-center space-x-1">
                        <Activity size={12} />
                        <code className="bg-gray-200 px-2 py-0.5 rounded">{log.method} {log.path}</code>
                      </span>
                    )}
                    {log.threat_type && (
                      <span className="flex items-center space-x-1">
                        <AlertTriangle size={12} className="text-red-600" />
                        <span className="font-medium text-red-600">{log.threat_type}</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Aucun événement de sécurité</p>
              <p className="text-sm mt-2">Les logs apparaîtront ici en temps réel</p>
            </div>
          )}
        </Card>

        {/* Recommendations */}
        <Card className="bg-white shadow-lg">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
            <Lock className="mr-2 text-orange-600" size={20} />
            Recommandations Sécurité
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900">Actions Immédiates</h4>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-center space-x-2">
                  <CheckCircle size={16} className="text-green-600" />
                  <span>Surveillance IP activée</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle size={16} className="text-green-600" />
                  <span>Rate limiting configuré</span>
                </li>
                <li className="flex items-center space-x-2">
                  <AlertTriangle size={16} className="text-yellow-600" />
                  <span>Configurer les alertes email</span>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900">Optimisations</h4>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-center space-x-2">
                  <TrendingUp size={16} className="text-orange-600" />
                  <span>Implémenter WAF (Web Application Firewall)</span>
                </li>
                <li className="flex items-center space-x-2">
                  <TrendingUp size={16} className="text-orange-600" />
                  <span>Ajouter authentification 2FA</span>
                </li>
                <li className="flex items-center space-x-2">
                  <TrendingUp size={16} className="text-orange-600" />
                  <span>Backup automatique quotidien</span>
                </li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SecurityDashboard;
