import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Zap, Target, TrendingUp, Users, FileCheck, Search, Activity,
  Brain, Globe, RefreshCw, Play, AlertCircle, CheckCircle,
  Clock, BarChart3, ArrowUp, ArrowDown, Minus, Shield,
  ChevronRight, Home, Cpu, Radio, Layers, Award
} from 'lucide-react';
import { nativeAdminCall } from '@/lib/native-admin-data';
import { loadNativeUltron } from '@/lib/native-ultron';
import { toast } from '@/lib/toast';
import { logger } from '@/lib/logger';

interface Mission {
  id: string;
  mission_name: string;
  status: string;
  progress_percent: number;
  kpi_target: Record<string, number | string>;
  kpi_current: Record<string, number | string>;
  last_action_at: string | null;
  updated_at: string;
}

interface CommandLog {
  id: string;
  timestamp: string;
  action_type: string;
  subsystem: string;
  status: string;
  impact_score: number;
  details: Record<string, unknown>;
}

interface CronStatus {
  jobname: string;
  schedule: string;
  active: boolean;
}

interface SystemConfig {
  key: string;
  value: string;
}

interface LeadQueueItem {
  id: string;
  lead_id: string;
  lead_email: string;
  lead_name: string;
  status: string;
  pipeline_started: boolean;
  decisions_generated: boolean;
  created_at: string;
}

interface QueueStats {
  total: number;
  pending: number;
  processing: number;
  processed: number;
  error: number;
}

interface HealthCheck {
  id: string;
  check_type: string;
  subsystem: string;
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  score: number;
  anomalies_found: number;
  repairs_made: number;
  checked_at: string;
  details: Record<string, unknown>;
}

interface Anomaly {
  id: string;
  anomaly_type: string;
  subsystem: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  repaired: boolean;
  detected_at: string;
}

const MISSION_META: Record<string, { label: string; icon: typeof Target; color: string; bg: string }> = {
  MISSION_1_GOOGLE_RANK_1: {
    label: '#1 Google Assurance Taxi',
    icon: Search,
    color: 'text-blue-600',
    bg: 'bg-blue-50 border-blue-200',
  },
  MISSION_2_DAILY_LEADS: {
    label: 'Leads Quotidiens',
    icon: Users,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 border-emerald-200',
  },
  MISSION_3_CONTRACTS: {
    label: 'Signature Contrats',
    icon: FileCheck,
    color: 'text-amber-600',
    bg: 'bg-amber-50 border-amber-200',
  },
};



export default function UltronCommandCenter() {
  const navigate = useNavigate();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [commandLogs, setCommandLogs] = useState<CommandLog[]>([]);
  const [crons, setCrons] = useState<CronStatus[]>([]);
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [limited, setLimited] = useState(false);
  const [triggering, setTriggering] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [leadQueue, setLeadQueue] = useState<LeadQueueItem[]>([]);
  const [queueStats, setQueueStats] = useState<QueueStats>({ total: 0, pending: 0, processing: 0, processed: 0, error: 0 });
  const [healthChecks, setHealthChecks] = useState<HealthCheck[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [globalScore, setGlobalScore] = useState<number | null>(null);
  const [healerRunning, setHealerRunning] = useState(false);
  const [gscData, setGscData] = useState<{ queries: number; avgPosition: number | null; topQuery: string | null }>({
    queries: 0,
    avgPosition: null,
    topQuery: null,
  });

  const load = useCallback(async () => {
    try {
      const data = await loadNativeUltron();
      setLimited(data.limited);
      setMissions(data.missions || []);
      if (data.logs) setCommandLogs(data.logs);
      setConfigs(data.configs || []);
      setCrons(data.crons || []);
      const rows = data.gsc || [];
      const positions = rows.map((row: { position?: number }) => Number(row.position)).filter((value: number) => Number.isFinite(value) && value > 0);
      setGscData({ queries: rows.length, avgPosition: positions.length ? Math.round(positions.reduce((sum: number, value: number) => sum + value, 0) / positions.length * 10) / 10 : null, topQuery: rows[0]?.query || null });
      const items: LeadQueueItem[] = data.queue || [];
      setLeadQueue(items);
      setQueueStats({ total: items.length, pending: items.filter(i => i.status === 'pending').length, processing: items.filter(i => i.status === 'processing').length, processed: items.filter(i => i.status === 'processed').length, error: items.filter(i => i.status === 'error').length });
      const checks: HealthCheck[] = data.health || [];
      if (data.health) setHealthChecks(checks);
      const scores = checks.map(check => Number(check.score)).filter(Number.isFinite);
      if (data.health) setGlobalScore(scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null);
      setAnomalies(data.anomalies || []);
      setLastRefresh(new Date());
      setLoadError(false);
    } catch (err) {
      logger.error('ULTRON load error', err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [load]);

  const triggerFunction = async (action: string) => {
    setTriggering(action);
    try {
      const result = await nativeAdminCall('/v1/admin/ultron', { method: 'POST', body: JSON.stringify({ action }) });
      if (result.results) {
        const checks: HealthCheck[] = result.results;
        setHealthChecks(checks);
        const scores = checks.map(check => Number(check.score)).filter(Number.isFinite);
        setGlobalScore(scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null);
      }
      await load();
      toast.success('Diagnostic terminé');
    } catch (err) {
      logger.error('ULTRON diagnostic error', err);
      toast.error('Le diagnostic a échoué. Veuillez réessayer.');
    } finally { setTriggering(null); }
  };
  const runHealer = async () => {
    setHealerRunning(true);
    try { await triggerFunction('full_audit'); }
    finally { setHealerRunning(false); }
  };

  const getConfigValue = (key: string) => configs.find(c => c.key === key)?.value;

  const ultronActive = getConfigValue('ultron_mode') === 'active';
  const aiAutoGenerate = getConfigValue('ai_content_auto_generate') === 'true';
  const aggressiveMode = getConfigValue('ai_aggressive_mode') === 'true';

  const activeCronsCount = crons.filter(c => c.active).length;

  const overallProgress = missions.length > 0
    ? Math.round(missions.reduce((s, m) => s + m.progress_percent, 0) / missions.length)
    : 0;

  const formatKpiKey = (key: string) =>
    key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  const formatKpiValue = (val: number | string | null | undefined): string => {
    if (val === null || val === undefined) return '--';
    if (typeof val === 'number' && val % 1 !== 0) return val.toFixed(1);
    return String(val);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/backoffice')} className="text-gray-400 hover:text-white transition-colors">
              <Home className="w-5 h-5" />
            </button>
            <ChevronRight className="w-4 h-4 text-gray-600" />
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center">
                <Cpu className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">ULTRON Command Center</h1>
                <p className="text-xs text-gray-400">Agent Autonome TaxiAssur</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {globalScore !== null && (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border ${
                globalScore >= 90 ? 'bg-emerald-900/50 text-emerald-400 border-emerald-700' :
                globalScore >= 70 ? 'bg-amber-900/50 text-amber-400 border-amber-700' :
                'bg-red-900/50 text-red-400 border-red-700'
              }`}>
                <Shield className="w-3.5 h-3.5" />
                Santé {globalScore}%
              </div>
            )}
            <button
              onClick={() => runHealer()}
              disabled={healerRunning || !!triggering}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-900/40 text-blue-400 border border-blue-700 rounded-full text-xs font-medium hover:bg-blue-900/60 transition-colors disabled:opacity-50"
            >
              <Zap className={`w-3.5 h-3.5 ${healerRunning ? 'animate-pulse' : ''}`} />
              {healerRunning ? 'Audit...' : 'Lancer Audit'}
            </button>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
              ultronActive ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-700' : 'bg-gray-800 text-gray-400'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${ultronActive ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
              {limited ? 'VUE PARTIELLE' : ultronActive ? 'ACTIF' : 'INACTIF'}
            </div>
            <button
              onClick={load}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {limited && (
          <div role="status" className="rounded-lg border border-amber-800 bg-amber-950 p-4 text-sm text-amber-200">
            Vue partielle : tâches planifiées et opportunités SEO disponibles. Les diagnostics affichent leurs résultats après exécution. L’historique, les missions et la file de traitement nécessitent la mise à jour du serveur.
          </div>
        )}
        {loadError && (
          <div role="alert" className="rounded-lg border border-red-800 bg-red-950 p-4 text-sm text-red-200">
            Les données de supervision n’ont pas pu être actualisées.
            <button onClick={load} className="ml-3 underline">Réessayer</button>
          </div>
        )}

        {/* Status Banner */}
        {ultronActive && (
          <div className="bg-gradient-to-r from-blue-900/40 via-cyan-900/40 to-blue-900/40 border border-blue-800/50 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Radio className="w-5 h-5 text-blue-400 animate-pulse" />
              </div>
              <div>
                <p className="font-semibold text-blue-300">ULTRON en ligne — Mode Agressif Actif</p>
                <p className="text-sm text-blue-400/70">
                  {activeCronsCount} crons actifs · Seuil approbation IA : {getConfigValue('ai_auto_approve_threshold')} ·
                  Contenu auto : {aiAutoGenerate ? 'oui' : 'non'} ·
                  Decisions/jour : {getConfigValue('ai_max_decisions_per_day')}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Derniere synchro</p>
              <p className="text-sm text-gray-300">{lastRefresh.toLocaleTimeString('fr-FR')}</p>
            </div>
          </div>
        )}

        {/* Sante Systeme ULTRON */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                globalScore === null ? 'bg-gray-800' :
                globalScore >= 90 ? 'bg-emerald-900/50' :
                globalScore >= 70 ? 'bg-amber-900/50' : 'bg-red-900/50'
              }`}>
                <Shield className={`w-5 h-5 ${
                  globalScore === null ? 'text-gray-500' :
                  globalScore >= 90 ? 'text-emerald-400' :
                  globalScore >= 70 ? 'text-amber-400' : 'text-red-400'
                }`} />
              </div>
              <div>
                <h3 className="font-semibold text-white">Sante Systeme</h3>
                <p className="text-xs text-gray-500">Surveillance continue — audit toutes les 30 min</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {anomalies.length > 0 && (
                <span className="text-xs px-2 py-1 bg-red-900/40 text-red-400 border border-red-800 rounded-full">
                  {anomalies.length} anomalie{anomalies.length > 1 ? 's' : ''} active{anomalies.length > 1 ? 's' : ''}
                </span>
              )}
              <button
                onClick={() => runHealer()}
                disabled={healerRunning || !!triggering}
                className="text-xs px-3 py-1.5 bg-blue-900/30 text-blue-400 border border-blue-800 rounded-lg hover:bg-blue-900/50 transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                <Zap className={`w-3 h-3 ${healerRunning ? 'animate-pulse' : ''}`} />
                {healerRunning ? 'Audit en cours...' : 'Audit complet'}
              </button>
            </div>
          </div>

          {/* Score global + sous-systemes */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            <div className={`col-span-2 md:col-span-1 rounded-xl p-4 flex flex-col items-center justify-center ${
              globalScore === null ? 'bg-gray-800' :
              globalScore >= 90 ? 'bg-emerald-900/30 border border-emerald-800' :
              globalScore >= 70 ? 'bg-amber-900/30 border border-amber-800' :
              'bg-red-900/30 border border-red-800'
            }`}>
              <p className={`text-4xl font-black ${
                globalScore === null ? 'text-gray-600' :
                globalScore >= 90 ? 'text-emerald-400' :
                globalScore >= 70 ? 'text-amber-400' : 'text-red-400'
              }`}>{globalScore ?? '--'}</p>
              <p className="text-xs text-gray-400 mt-1">Score Global</p>
            </div>
            {[
              { label: 'Crons', key: 'CRON_SYSTEM' },
              { label: 'Leads', key: 'LEAD_PIPELINE' },
              { label: 'Emails', key: 'EMAIL_SYSTEM' },
              { label: 'Storage', key: 'STORAGE' },
            ].map(({ label, key }) => {
              const latest = healthChecks.find(h => h.subsystem === key);
              return (
                <div key={key} className="bg-gray-800 rounded-xl p-3 flex flex-col items-center justify-center">
                  <div className={`w-2 h-2 rounded-full mb-2 ${
                    !latest ? 'bg-gray-600' :
                    latest.status === 'healthy' ? 'bg-emerald-400' :
                    latest.status === 'warning' ? 'bg-amber-400 animate-pulse' :
                    latest.status === 'critical' ? 'bg-red-400 animate-pulse' :
                    'bg-gray-500'
                  }`} />
                  <p className="text-lg font-bold text-white">{latest?.score ?? '--'}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                  {latest && latest.repairs_made > 0 && (
                    <p className="text-xs text-emerald-400 mt-0.5">{latest.repairs_made} rep.</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Derniers checks */}
          {healthChecks.length > 0 && (
            <div className="space-y-1.5 mb-4">
              {healthChecks.slice(0, 6).map(hc => (
                <div key={hc.id} className="flex items-center justify-between px-3 py-2 bg-gray-800/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      hc.status === 'healthy' ? 'bg-emerald-400' :
                      hc.status === 'warning' ? 'bg-amber-400' :
                      hc.status === 'critical' ? 'bg-red-400' : 'bg-gray-500'
                    }`} />
                    <span className="text-sm text-gray-300 font-medium">{hc.subsystem}</span>
                    {hc.repairs_made > 0 && (
                      <span className="text-xs text-emerald-400 bg-emerald-900/30 px-1.5 py-0.5 rounded">
                        +{hc.repairs_made} rep.
                      </span>
                    )}
                    {hc.anomalies_found > 0 && (
                      <span className="text-xs text-amber-400 bg-amber-900/30 px-1.5 py-0.5 rounded">
                        {hc.anomalies_found} anomalie{hc.anomalies_found > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>Score {hc.score}</span>
                    <span>{new Date(hc.checked_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Anomalies actives */}
          {anomalies.length > 0 && (
            <div className="border-t border-gray-800 pt-3">
              <p className="text-xs font-semibold text-red-400 mb-2 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                Anomalies actives ({anomalies.length})
              </p>
              <div className="space-y-1.5">
                {anomalies.slice(0, 4).map(a => (
                  <div key={a.id} className="flex items-start gap-2 px-3 py-2 bg-red-900/10 border border-red-900/30 rounded-lg">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                      a.severity === 'critical' ? 'bg-red-400' :
                      a.severity === 'high' ? 'bg-orange-400' :
                      a.severity === 'medium' ? 'bg-amber-400' : 'bg-yellow-400'
                    }`} />
                    <div className="min-w-0">
                      <p className="text-xs text-gray-300">{a.description}</p>
                      <p className="text-xs text-gray-600 mt-0.5">{a.subsystem} · {a.severity}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {healthChecks.length === 0 && !healerRunning && (
            <div className="text-center py-8 text-gray-600">
              <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Aucun audit effectue</p>
              <p className="text-xs mt-1">Cliquez sur "Audit complet" pour lancer le premier scan</p>
            </div>
          )}
          {healerRunning && (
            <div className="text-center py-8">
              <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-blue-400">Audit en cours...</p>
              <p className="text-xs text-gray-600 mt-1">Verification de tous les sous-systemes</p>
            </div>
          )}
        </div>

        {/* 3 Missions */}
        <div>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Missions Actives</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {missions.map(mission => {
              const meta = MISSION_META[mission.mission_name];
              if (!meta) return null;
              const Icon = meta.icon;
              const pct = mission.progress_percent || 0;
              const current = mission.kpi_current || {};
              const target = mission.kpi_target || {};

              return (
                <div key={mission.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-800/20 to-transparent" />
                  <div className="relative">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          mission.mission_name.includes('GOOGLE') ? 'bg-blue-900/50' :
                          mission.mission_name.includes('LEADS') ? 'bg-emerald-900/50' :
                          'bg-amber-900/50'
                        }`}>
                          <Icon className={`w-5 h-5 ${meta.color}`} />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider">Mission</p>
                          <p className="text-sm font-semibold text-white leading-tight">{meta.label}</p>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        mission.status === 'active' ? 'bg-emerald-900/50 text-emerald-400' : 'bg-gray-800 text-gray-400'
                      }`}>
                        {mission.status === 'active' ? 'En cours' : mission.status}
                      </span>
                    </div>

                    {/* Progress */}
                    <div className="mb-4">
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-gray-400">Progression</span>
                        <span className={`font-bold ${
                          pct >= 80 ? 'text-emerald-400' : pct >= 50 ? 'text-amber-400' : 'text-blue-400'
                        }`}>{pct}%</span>
                      </div>
                      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ${
                            pct >= 80 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' :
                            pct >= 50 ? 'bg-gradient-to-r from-amber-500 to-amber-400' :
                            'bg-gradient-to-r from-blue-500 to-cyan-400'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    {/* KPIs */}
                    <div className="space-y-2">
                      {Object.entries(current).slice(0, 3).map(([k, v]) => (
                        <div key={k} className="flex justify-between items-center">
                          <span className="text-xs text-gray-500">{formatKpiKey(k)}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-white">{formatKpiValue(v as number | string | null)}</span>
                            {target[k] && (
                              <span className="text-xs text-gray-600">/ {formatKpiValue(target[k] as number | string | null)}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Global Progress + Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="col-span-2 md:col-span-1 bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col items-center justify-center">
            <div className="relative w-20 h-20 mb-2">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="32" fill="none" stroke="#1f2937" strokeWidth="8" />
                <circle
                  cx="40" cy="40" r="32" fill="none"
                  stroke="url(#prog)" strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 32}`}
                  strokeDashoffset={`${2 * Math.PI * 32 * (1 - overallProgress / 100)}`}
                  className="transition-all duration-1000"
                />
                <defs>
                  <linearGradient id="prog" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-white">{overallProgress}%</span>
              </div>
            </div>
            <p className="text-xs text-gray-400 text-center">Progres global</p>
          </div>

          {[
            { label: limited ? 'Opportunités SEO' : 'Requetes GSC', value: gscData.queries, icon: Search, color: 'text-blue-400' },
            { label: 'Position moy.', value: gscData.avgPosition ? `#${gscData.avgPosition}` : '--', icon: TrendingUp, color: 'text-cyan-400' },
            { label: 'Crons actifs', value: activeCronsCount, icon: Activity, color: 'text-emerald-400' },
            { label: 'Blog/jour', value: getConfigValue('blog_posts_per_day') || '5', icon: BarChart3, color: 'text-amber-400' },
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                  <span className="text-xs text-gray-500">{stat.label}</span>
                </div>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              </div>
            );
          })}
        </div>

        {/* Action Panel + Logs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Actions Manuelles */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Play className="w-4 h-4 text-blue-400" />
              <h3 className="font-semibold text-white">Diagnostics manuels</h3>
            </div>
            <div className="space-y-2">
              {[
                { fn: 'cron_system', label: 'Diagnostic des tâches planifiées', color: 'blue', icon: Activity },
                { fn: 'lead_pipeline', label: 'Diagnostic du pipeline prospects', color: 'amber', icon: Users },
                { fn: 'email_system', label: 'Diagnostic des emails', color: 'cyan', icon: Radio },
                { fn: 'storage', label: 'Diagnostic des documents', color: 'emerald', icon: FileCheck },
              ].map(action => {
                const Icon = action.icon;
                const isRunning = triggering === action.fn;
                return (
                  <button
                    key={action.fn}
                    onClick={() => triggerFunction(action.fn)}
                    disabled={!!triggering}
                    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg border transition-all text-sm ${
                      isRunning
                        ? 'bg-gray-800 border-gray-700 text-gray-400 cursor-wait'
                        : 'bg-gray-800/50 border-gray-700/50 text-gray-300 hover:bg-gray-800 hover:border-gray-600 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${
                        isRunning ? 'text-gray-500 animate-spin' :
                        action.color === 'blue' ? 'text-blue-400' :
                        action.color === 'cyan' ? 'text-cyan-400' :
                        action.color === 'emerald' ? 'text-emerald-400' :
                        action.color === 'teal' ? 'text-teal-400' :
                        action.color === 'amber' ? 'text-amber-400' :
                        action.color === 'orange' ? 'text-orange-400' :
                        action.color === 'violet' ? 'text-violet-400' :
                        'text-rose-400'
                      }`} />
                      <span>{action.label}</span>
                    </div>
                    {isRunning ? (
                      <span className="text-xs text-gray-500">En cours...</span>
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-600" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Journal des commandes */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <h3 className="font-semibold text-white">Journal ULTRON</h3>
              </div>
              <span className="text-xs text-gray-500">{commandLogs.length} entrees</span>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {commandLogs.length === 0 && (
                <div className="text-center py-8 text-gray-600">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Aucune action enregistree</p>
                </div>
              )}
              {commandLogs.map(log => (
                <div key={log.id} className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-lg">
                  <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                    log.status === 'success' ? 'bg-emerald-400' :
                    log.status === 'error' ? 'bg-red-400' :
                    'bg-amber-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-gray-200 truncate">{log.subsystem}</span>
                      {log.impact_score > 0 && (
                        <span className="text-xs text-blue-400 flex-shrink-0">+{log.impact_score}</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{log.action_type}</p>
                  </div>
                  <span className="text-xs text-gray-600 flex-shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Queue Leads ULTRON */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              <h3 className="font-semibold text-white">Pipeline Leads ULTRON</h3>
              <span className="text-xs bg-emerald-900/50 text-emerald-400 border border-emerald-700 px-2 py-0.5 rounded-full">
                Trigger actif
              </span>
            </div>
            <button
              onClick={() => triggerFunction('lead_pipeline')}
              disabled={!!triggering}
              className="text-xs px-3 py-1.5 bg-emerald-900/30 text-emerald-400 border border-emerald-800 rounded-lg hover:bg-emerald-900/50 transition-colors disabled:opacity-50"
            >
              Diagnostiquer le pipeline
            </button>
          </div>

          {/* Stats queue */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            {[
              { label: 'Total', value: queueStats.total, color: 'text-gray-300' },
              { label: 'En attente', value: queueStats.pending, color: 'text-amber-400' },
              { label: 'Traites', value: queueStats.processed, color: 'text-emerald-400' },
              { label: 'Erreurs', value: queueStats.error, color: 'text-red-400' },
            ].map(stat => (
              <div key={stat.label} className="bg-gray-800 rounded-lg p-3 text-center">
                <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Liste leads recents */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {leadQueue.length === 0 && (
              <div className="text-center py-6 text-gray-600">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Aucun lead dans la queue</p>
              </div>
            )}
            {leadQueue.slice(0, 15).map(item => (
              <div key={item.id} className="flex items-center justify-between px-3 py-2 bg-gray-800/50 rounded-lg">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    item.status === 'processed' ? 'bg-emerald-400' :
                    item.status === 'pending' ? 'bg-amber-400 animate-pulse' :
                    item.status === 'processing' ? 'bg-blue-400 animate-pulse' :
                    'bg-red-400'
                  }`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-200 truncate">
                      {item.lead_name || 'Lead sans nom'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{item.lead_email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {item.pipeline_started && (
                    <span className="text-xs text-emerald-400">Pipeline</span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    item.status === 'processed' ? 'bg-emerald-900/50 text-emerald-400' :
                    item.status === 'pending' ? 'bg-amber-900/50 text-amber-400' :
                    item.status === 'processing' ? 'bg-blue-900/50 text-blue-400' :
                    'bg-red-900/50 text-red-400'
                  }`}>
                    {item.status === 'processed' ? 'Traite' :
                     item.status === 'pending' ? 'En attente' :
                     item.status === 'processing' ? 'En cours' : 'Erreur'}
                  </span>
                  <span className="text-xs text-gray-600">
                    {new Date(item.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-600 mt-3">
            Chaque nouveau lead declenche automatiquement : scoring IA + email notification + pipeline commercial
          </p>
        </div>

        {/* Configuration Active */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-gray-400" />
            <h3 className="font-semibold text-white">Configuration ULTRON Active</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { key: 'ultron_mode', label: 'Mode ULTRON', bool: true },
              { key: 'ai_content_auto_generate', label: 'Contenu Auto', bool: true },
              { key: 'ai_aggressive_mode', label: 'Mode Agressif', bool: true },
              { key: 'lead_followup_auto', label: 'Relances Auto', bool: true },
              { key: 'seo_ultra_mode', label: 'SEO Ultra', bool: true },
              { key: 'ai_auto_approve_threshold', label: 'Seuil IA', bool: false },
              { key: 'ai_max_decisions_per_day', label: 'Max decisions/j', bool: false },
              { key: 'blog_posts_per_day', label: 'Blog/jour', bool: false },
              { key: 'city_pages_per_day', label: 'Villes/jour', bool: false },
              { key: 'backlink_emails_per_day', label: 'Backlinks/jour', bool: false },
            ].map(item => {
              const value = getConfigValue(item.key);
              const isActive = item.bool ? value === 'true' || value === 'active' : null;
              return (
                <div key={item.key} className="bg-gray-800 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                  {item.bool ? (
                    <div className="flex items-center gap-1.5">
                      {isActive ? (
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-400" />
                      )}
                      <span className={`text-sm font-semibold ${isActive ? 'text-emerald-400' : 'text-red-400'}`}>
                        {isActive ? 'ACTIF' : 'INACTIF'}
                      </span>
                    </div>
                  ) : (
                    <p className="text-lg font-bold text-white">{value || '--'}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Top query GSC */}
        {gscData.topQuery && (
          <div className="bg-gradient-to-r from-blue-900/30 to-cyan-900/30 border border-blue-800/40 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Award className="w-5 h-5 text-blue-400" />
              <div>
                <p className="text-xs text-blue-400/70">Requete #1 en impressions (7j)</p>
                <p className="font-semibold text-white">&ldquo;{gscData.topQuery}&rdquo;</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Position moyenne</p>
              <p className="text-2xl font-bold text-blue-400">
                {gscData.avgPosition ? `#${gscData.avgPosition}` : '--'}
              </p>
            </div>
          </div>
        )}

        {/* Liens rapides vers sous-systemes */}
        <div>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Sous-systemes Autonomes</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { to: '/backoffice/master-ai', label: 'Master AI', desc: 'Decisions autonomes', icon: Brain, color: 'text-violet-400' },
              { to: '/backoffice/gsc-optimization', label: 'GSC / SEO', desc: 'Optimisation Google', icon: Search, color: 'text-blue-400' },
              { to: '/backoffice/crm-pipeline', label: 'Pipeline CRM', desc: 'Leads & contrats', icon: Users, color: 'text-emerald-400' },
              { to: '/backoffice/seo-tools', label: 'Contenu Auto', desc: 'Blog & pages villes', icon: Globe, color: 'text-cyan-400' },
              { to: '/backoffice/automations', label: 'Automations', desc: 'Tous les crons', icon: Activity, color: 'text-amber-400' },
              { to: '/backoffice/ai-governance', label: 'Gouvernance IA', desc: 'Approbations', icon: Shield, color: 'text-rose-400' },
              { to: '/backoffice/backlinks', label: 'Backlinks', desc: 'Netlinking auto', icon: Target, color: 'text-orange-400' },
              { to: '/backoffice/inbox', label: 'Emails IA', desc: 'Inbox intelligente', icon: Zap, color: 'text-teal-400' },
            ].map(link => {
              const Icon = link.icon;
              return (
                <button
                  key={link.to}
                  onClick={() => navigate(link.to)}
                  className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-left hover:bg-gray-800 hover:border-gray-700 transition-all group"
                >
                  <Icon className={`w-5 h-5 ${link.color} mb-2`} />
                  <p className="text-sm font-semibold text-white group-hover:text-white">{link.label}</p>
                  <p className="text-xs text-gray-500">{link.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
