import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Activity, Lock, Eye, TrendingUp, Users, Globe, Home } from 'lucide-react';
import AuthGuard from '../components/AuthGuard';
import Card from '../components/Card';

interface SecurityLog {
  timestamp: string;
  level: string;
  message: string;
  ip: string;
  context: any;
}

interface SecurityStats {
  totalRequests: number;
  blockedRequests: number;
  spamAttempts: number;
  validLeads: number;
  topThreats: Array<{ type: string; count: number }>;
  ipAnalysis: Array<{ ip: string; requests: number; blocked: boolean }>;
}

const SecurityDashboard: React.FC = () => {
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);
  const [stats, setStats] = useState<SecurityStats>({
    totalRequests: 0,
    blockedRequests: 0,
    spamAttempts: 0,
    validLeads: 0,
    topThreats: [],
    ipAnalysis: []
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('24h');

  useEffect(() => {
    loadSecurityData();
    const interval = setInterval(loadSecurityData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [timeRange]);

  const loadSecurityData = async () => {
    setLoading(true);
    try {
      // Simulate security data (in real implementation, this would fetch from logs)
      const mockLogs: SecurityLog[] = [
        {
          timestamp: new Date().toISOString(),
          level: 'WARNING',
          message: 'Honeypot triggered',
          ip: '192.168.1.100',
          context: { user_agent: 'Bot/1.0' }
        },
        {
          timestamp: new Date(Date.now() - 300000).toISOString(),
          level: 'INFO',
          message: 'Valid lead processed',
          ip: '85.123.45.67',
          context: { behavior_score: 85 }
        },
        {
          timestamp: new Date(Date.now() - 600000).toISOString(),
          level: 'WARNING',
          message: 'Rate limit exceeded',
          ip: '192.168.1.101',
          context: { requests_count: 10 }
        }
      ];

      const mockStats: SecurityStats = {
        totalRequests: 1247,
        blockedRequests: 89,
        spamAttempts: 34,
        validLeads: 156,
        topThreats: [
          { type: 'Bot Traffic', count: 45 },
          { type: 'Rate Limiting', count: 23 },
          { type: 'Honeypot', count: 12 },
          { type: 'Invalid Referer', count: 9 }
        ],
        ipAnalysis: [
          { ip: '192.168.1.100', requests: 25, blocked: true },
          { ip: '85.123.45.67', requests: 3, blocked: false },
          { ip: '192.168.1.101', requests: 15, blocked: true }
        ]
      };

      setSecurityLogs(mockLogs);
      setStats(mockStats);
    } catch (error) {
      console.error('Failed to load security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSecurityScore = (): number => {
    const { totalRequests, blockedRequests } = stats;
    if (totalRequests === 0) return 100;

    const blockRate = (blockedRequests / totalRequests) * 100;
    const score = Math.max(0, 100 - blockRate * 2); // Lower score if too many blocks
    return Math.round(score * 10) / 10; // Arrondir à 1 décimale
  };

  const getLevelColor = (level: string): string => {
    switch (level.toLowerCase()) {
      case 'error': return 'text-red-600 bg-red-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      case 'info': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 p-8">
        {/* Header with Home Button */}
        <header className="bg-white border-b-2 border-gray-200 shadow-sm mb-8">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Shield className="text-white" size={20} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Tableau de Bord Sécurité
                  </h1>
                  <p className="text-sm text-gray-600">
                    Monitoring et protection en temps réel
                  </p>
                </div>
              </div>
              
              <a
                href="/backoffice"
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
              >
                <Home size={16} />
                <span>Accueil Backoffice</span>
              </a>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            
            <div className="flex items-center space-x-4">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="1h">Dernière heure</option>
                <option value="24h">Dernières 24h</option>
                <option value="7d">7 derniers jours</option>
                <option value="30d">30 derniers jours</option>
              </select>
              
              <button
                onClick={loadSecurityData}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                <Activity size={16} />
                <span>Actualiser</span>
              </button>
            </div>
          </div>

          {/* Security Score */}
          <div className="mb-8">
            <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                    <Shield className="text-white" size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">
                      Score Sécurité : {getSecurityScore()}/100
                    </h3>
                    <p className="text-gray-600">
                      {getSecurityScore() > 90 ? 'Excellent' : getSecurityScore() > 70 ? 'Bon' : 'À améliorer'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">Dernière analyse</div>
                  <div className="font-medium">{new Date().toLocaleTimeString('fr-FR')}</div>
                </div>
              </div>
            </Card>
          </div>

          {/* Security Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="text-center bg-gradient-to-br from-blue-50 to-indigo-50">
              <Globe className="mx-auto mb-2 text-blue-600" size={24} />
              <div className="text-2xl font-bold text-gray-900">{stats.totalRequests}</div>
              <div className="text-sm text-gray-600">Requêtes totales</div>
            </Card>

            <Card className="text-center bg-gradient-to-br from-red-50 to-pink-50">
              <AlertTriangle className="mx-auto mb-2 text-red-600" size={24} />
              <div className="text-2xl font-bold text-gray-900">{stats.blockedRequests}</div>
              <div className="text-sm text-gray-600">Requêtes bloquées</div>
            </Card>

            <Card className="text-center bg-gradient-to-br from-yellow-50 to-amber-50">
              <Eye className="mx-auto mb-2 text-yellow-600" size={24} />
              <div className="text-2xl font-bold text-gray-900">{stats.spamAttempts}</div>
              <div className="text-sm text-gray-600">Tentatives spam</div>
            </Card>

            <Card className="text-center bg-gradient-to-br from-green-50 to-emerald-50">
              <Users className="mx-auto mb-2 text-green-600" size={24} />
              <div className="text-2xl font-bold text-gray-900">{stats.validLeads}</div>
              <div className="text-sm text-gray-600">Leads valides</div>
            </Card>
          </div>

          {/* Threat Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <AlertTriangle className="mr-2 text-red-600" size={20} />
                Top Menaces Détectées
              </h3>
              <div className="space-y-3">
                {stats.topThreats.map((threat, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-900">{threat.type}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">{threat.count} tentatives</span>
                      <div className={`w-2 h-2 rounded-full ${
                        threat.count > 20 ? 'bg-red-500' : threat.count > 10 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}></div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Globe className="mr-2 text-blue-600" size={20} />
                Analyse IP Suspectes
              </h3>
              <div className="space-y-3">
                {stats.ipAnalysis.map((ip, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <code className="text-sm font-mono bg-gray-200 px-2 py-1 rounded">
                        {ip.ip}
                      </code>
                      {ip.blocked && (
                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                          Bloquée
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-gray-600">{ip.requests} requêtes</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Security Logs */}
          <Card>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Activity className="mr-2 text-green-600" size={20} />
                Logs Sécurité en Temps Réel
              </h3>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-600">Live</span>
              </div>
            </div>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {securityLogs.map((log, index) => (
                <div key={index} className={`p-3 rounded-lg border ${
                  log.level === 'ERROR' ? 'border-red-200 bg-red-50' :
                  log.level === 'WARNING' ? 'border-yellow-200 bg-yellow-50' :
                  'border-blue-200 bg-blue-50'
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getLevelColor(log.level)}`}>
                        {log.level}
                      </span>
                      <span className="text-sm font-medium text-gray-900">{log.message}</span>
                    </div>
                    <span className="text-xs text-gray-600">
                      {new Date(log.timestamp).toLocaleTimeString('fr-FR')}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-xs text-gray-600">
                    <span>IP: <code className="bg-gray-200 px-1 rounded">{log.ip}</code></span>
                    {log.context && Object.keys(log.context).length > 0 && (
                      <span>Contexte: {JSON.stringify(log.context)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Security Recommendations */}
          <div className="mt-8">
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Lock className="mr-2 text-purple-600" size={20} />
                Recommandations Sécurité
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">Actions Immédiates</h4>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Changer le MAKE_SECRET par défaut</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Activer la surveillance IP</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span>Configurer les alertes email</span>
                    </li>
                  </ul>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">Optimisations</h4>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>Implémenter WAF (Web Application Firewall)</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>Ajouter authentification 2FA</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>Backup automatique quotidien</span>
                    </li>
                  </ul>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
};

const getLevelColor = (level: string): string => {
  switch (level.toLowerCase()) {
    case 'error': return 'text-red-600 bg-red-100';
    case 'warning': return 'text-yellow-600 bg-yellow-100';
    case 'info': return 'text-blue-600 bg-blue-100';
    default: return 'text-gray-600 bg-gray-100';
  }
};

export default SecurityDashboard;