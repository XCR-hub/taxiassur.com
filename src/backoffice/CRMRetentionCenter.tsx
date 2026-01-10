import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, TrendingDown, Gift, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { retentionService, ChurnAlert, CrossSellOpportunity } from '@/lib/crm-retention';
import { pipelineService } from '@/lib/crm-pipeline';
import { RetentionScore } from '@/components/crm/RetentionScore';

const CRMRetentionCenter: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [churnAlerts, setChurnAlerts] = useState<ChurnAlert[]>([]);
  const [crossSellOps, setCrossSellOps] = useState<CrossSellOpportunity[]>([]);
  const [renewals, setRenewals] = useState<any[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<ChurnAlert | null>(null);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadRetentionData();
  }, []);

  const loadRetentionData = async () => {
    setLoading(true);
    try {
      const [alertsData, opsData, renewalsData, statsData] = await Promise.all([
        retentionService.getChurnAlerts({ status: 'new' }),
        retentionService.getCrossSellOpportunities(),
        retentionService.getRenewalReminders({ daysUntil: 60 }),
        retentionService.getRetentionStats()
      ]);

      setChurnAlerts(alertsData);
      setCrossSellOps(opsData.filter(o => o.status === 'suggested'));
      setRenewals(renewalsData.filter(r => r.status === 'pending'));
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load retention data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    await retentionService.updateAlertStatus(alertId, 'resolved');
    await loadRetentionData();
  };

  const handleDismissAlert = async (alertId: string) => {
    await retentionService.updateAlertStatus(alertId, 'dismissed');
    await loadRetentionData();
  };

  const handleConvertOpportunity = async (oppId: string) => {
    await retentionService.updateOpportunityStatus(oppId, 'converted');
    await loadRetentionData();
  };

  const SEVERITY_CONFIG = {
    low: { color: 'bg-blue-100 text-blue-700 border-blue-300', icon: '💙' },
    medium: { color: 'bg-yellow-100 text-yellow-700 border-yellow-300', icon: '⚠️' },
    high: { color: 'bg-orange-100 text-orange-700 border-orange-300', icon: '🔥' },
    critical: { color: 'bg-red-100 text-red-700 border-red-300', icon: '🚨' }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto animate-pulse">
          <div className="h-32 bg-gray-200 rounded-xl mb-6"></div>
          <div className="grid grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-green-600 to-teal-600 text-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-4xl font-bold mb-4">Centre de Rétention</h1>
          <p className="text-green-100 mb-6">Anti-churn, Cross-sell et Renouvellements</p>

          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white/20 backdrop-blur rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <AlertTriangle size={24} />
                <div className="text-3xl font-bold">{churnAlerts.length}</div>
              </div>
              <div className="text-green-100 text-sm">Alertes Churn</div>
            </div>
            <div className="bg-white/20 backdrop-blur rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <Gift size={24} />
                <div className="text-3xl font-bold">{crossSellOps.length}</div>
              </div>
              <div className="text-green-100 text-sm">Opportunités Cross-sell</div>
            </div>
            <div className="bg-white/20 backdrop-blur rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <RefreshCw size={24} />
                <div className="text-3xl font-bold">{renewals.length}</div>
              </div>
              <div className="text-green-100 text-sm">Renouvellements</div>
            </div>
            <div className="bg-white/20 backdrop-blur rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <TrendingDown size={24} />
                <div className="text-3xl font-bold">
                  {stats ? Math.round(stats.avg_retention_score) : 0}%
                </div>
              </div>
              <div className="text-green-100 text-sm">Score Moyen</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="text-red-600" size={28} />
              Alertes Churn Critiques
            </h2>

            {churnAlerts.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                Aucune alerte churn active
              </div>
            ) : (
              <div className="space-y-4">
                {churnAlerts.map((alert) => {
                  const config = SEVERITY_CONFIG[alert.severity];
                  return (
                    <div
                      key={alert.id}
                      className={`border-2 rounded-lg p-4 ${config.color}`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xl">{config.icon}</span>
                            <h3 className="font-bold">{alert.title}</h3>
                          </div>
                          <p className="text-sm opacity-80 mb-3">{alert.description}</p>
                        </div>
                      </div>

                      {alert.suggested_actions.length > 0 && (
                        <div className="mb-3">
                          <div className="text-xs font-semibold mb-2">Actions suggérées:</div>
                          <ul className="space-y-1">
                            {alert.suggested_actions.map((action, idx) => (
                              <li key={idx} className="text-sm flex items-start gap-2">
                                <span>•</span>
                                <span>{action}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleResolveAlert(alert.id)}
                          className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                        >
                          <CheckCircle size={16} />
                          Résoudre
                        </button>
                        <button
                          onClick={() => handleDismissAlert(alert.id)}
                          className="flex-1 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                        >
                          <XCircle size={16} />
                          Ignorer
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Gift className="text-purple-600" size={28} />
              Opportunités Cross-sell
            </h2>

            {crossSellOps.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                Aucune opportunité détectée
              </div>
            ) : (
              <div className="space-y-4">
                {crossSellOps.slice(0, 5).map((opp) => (
                  <div
                    key={opp.id}
                    className="border-2 border-purple-200 rounded-lg p-4 bg-purple-50"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-purple-900 mb-1">{opp.product_name}</h3>
                        <p className="text-sm text-purple-700 mb-2">{opp.reasoning}</p>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="text-purple-600">
                            Confiance: <span className="font-bold">{Math.round(opp.confidence_score * 100)}%</span>
                          </div>
                          <div className="text-purple-600">
                            Valeur: <span className="font-bold">{opp.estimated_value}€</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded p-3 mb-3 border border-purple-200">
                      <div className="text-xs font-semibold text-purple-900 mb-1">Approche recommandée:</div>
                      <p className="text-sm text-purple-800">{opp.best_approach}</p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleConvertOpportunity(opp.id)}
                        className="flex-1 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                      >
                        Convertir
                      </button>
                      <button
                        onClick={() => retentionService.updateOpportunityStatus(opp.id, 'declined')}
                        className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                      >
                        Plus tard
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <RefreshCw className="text-blue-600" size={28} />
            Renouvellements à Venir
          </h2>

          {renewals.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              Aucun renouvellement prévu dans les 60 prochains jours
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {renewals.slice(0, 9).map((renewal) => (
                <div
                  key={renewal.id}
                  className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-bold text-blue-900">Lead #{renewal.lead_id.slice(0, 8)}</h3>
                      <div className="text-sm text-blue-700">
                        Dans {renewal.days_until_renewal} jours
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      renewal.days_until_renewal <= 7 ? 'bg-red-100 text-red-700' :
                      renewal.days_until_renewal <= 30 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {new Date(renewal.renewal_date).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/backoffice/crm-killer/lead/${renewal.lead_id}`)}
                    className="w-full mt-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    Contacter
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CRMRetentionCenter;
