import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3, TrendingUp, TrendingDown, Users, Eye, MousePointer,
  RefreshCw, Brain, Zap, AlertTriangle, CheckCircle, Clock,
  ArrowUp, ArrowDown, Minus, Globe, Search, Sparkles, Target,
  Activity, Timer, ChevronDown, ChevronUp, Filter, Download
} from 'lucide-react';
import { nativeAdminCall } from '@/lib/native-admin-data';

interface GA4Signal {
  page_path: string;
  full_url: string;
  sessions: number;
  engaged_sessions: number;
  page_views: number;
  new_users: number;
  bounce_rate: number;
  avg_session_duration: number;
  engagement_rate: number;
  behavioral_score: number;
  synced_at: string;
}

interface CombinedSignal {
  page_path: string;
  gsc_clicks: number;
  gsc_impressions: number;
  gsc_position: number;
  gsc_ctr: number;
  ga4_sessions: number;
  ga4_bounce_rate: number;
  ga4_engagement: number;
  ga4_avg_duration: number;
  behavioral_score: number;
  semantic_score: number;
  combined_priority: number;
}

interface SummaryStats {
  total_pages_tracked: number;
  avg_engagement_rate: number;
  avg_session_duration: number;
  avg_bounce_rate: number;
  total_sessions: number;
  high_engagement_pages: number;
  low_engagement_pages: number;
  last_sync: string | null;
}

interface AIRecommendation {
  page: string;
  priority: 'haute' | 'moyenne' | 'faible';
  problem: string;
  action: string;
  expected_gain: string;
}

type Tab = 'overview' | 'pages' | 'combined' | 'ai';
type SortKey = keyof GA4Signal;

const SCORE_COLOR = (score: number) => {
  if (score >= 70) return 'text-green-400';
  if (score >= 40) return 'text-amber-400';
  return 'text-red-400';
};
const SCORE_BG = (score: number) => {
  if (score >= 70) return 'bg-green-500/20 border-green-500/30';
  if (score >= 40) return 'bg-amber-500/20 border-amber-500/30';
  return 'bg-red-500/20 border-red-500/30';
};

const fmt = (n: number, dec = 0) => n?.toFixed(dec) ?? '0';
const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`;
const fmtSec = (n: number) => n >= 60 ? `${Math.floor(n / 60)}m${Math.round(n % 60)}s` : `${Math.round(n)}s`;

export default function GA4SEODashboard() {
  const [tab, setTab] = useState<Tab>('overview');
  const [signals, setSignals] = useState<GA4Signal[]>([]);
  const [combined, setCombined] = useState<CombinedSignal[]>([]);
  const [summary, setSummary] = useState<SummaryStats | null>(null);
  const [aiRecs, setAiRecs] = useState<AIRecommendation[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('behavioral_score');
  const [sortAsc, setSortAsc] = useState(false);
  const [filterScore, setFilterScore] = useState<'all' | 'low' | 'medium' | 'high'>('all');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await nativeAdminCall<{summary:SummaryStats;signals:GA4Signal[];combined:CombinedSignal[]}>('/v1/admin/ga4-seo');
      const rawStats=response.summary,pagesData=response.signals,combinedData=response.combined;

      if (rawStats) setSummary(rawStats as SummaryStats);

      if (pagesData) {
        const deduped = Object.values(
          (pagesData as GA4Signal[]).reduce((acc, row) => {
            if (!acc[row.page_path] || acc[row.page_path].synced_at < row.synced_at) {
              acc[row.page_path] = row;
            }
            return acc;
          }, {} as Record<string, GA4Signal>)
        );
        setSignals(deduped);
      }

      if (combinedData) setCombined(combinedData as CombinedSignal[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const syncGA4 = async () => {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const result = await nativeAdminCall<{setup_required?:boolean;message?:string;success?:boolean;pages_synced?:number;error?:string}>('/v1/admin/ga4-seo',{method:'POST',body:JSON.stringify({action:'sync',days:30})});
      if (result.setup_required) {
        setSyncMsg(`Configuration requise : ${result.message}`);
      } else if (result.success) {
        setSyncMsg(`Synchronisation reussie : ${result.pages_synced} pages synchronisees`);
        await loadData();
      } else {
        setSyncMsg(`Erreur : ${result.error || 'Inconnue'}`);
      }
    } catch (e) {
      setSyncMsg('Erreur de connexion a la fonction de synchronisation');
    } finally {
      setSyncing(false);
    }
  };

  const analyzeWithAI = async () => {
    setAiLoading(true);
    setAiError(null);
    setAiRecs([]);
    try {
      const topIssues = signals
        .filter(s => s.behavioral_score < 50 && s.sessions > 5)
        .slice(0, 15)
        .map(s => ({
          page: s.page_path,
          sessions: s.sessions,
          bounce_rate: fmtPct(s.bounce_rate),
          engagement_rate: fmtPct(s.engagement_rate),
          avg_duration: fmtSec(s.avg_session_duration),
          behavioral_score: s.behavioral_score,
        }));

      const topCombined = combined.slice(0, 10).map(c => ({
        page: c.page_path,
        gsc_position: c.gsc_position?.toFixed(1),
        gsc_impressions: c.gsc_impressions,
        ga4_sessions: c.ga4_sessions,
        engagement: fmtPct(c.ga4_engagement),
        priority: c.combined_priority,
      }));

      const prompt = `Tu es expert SEO pour TaxiAssur.com, site d'assurance taxi francais.

Analyse ces donnees GA4 et GSC et donne 8 recommandations SEO concretes et actionnables :

PAGES AVEC FAIBLE ENGAGEMENT (score < 50) :
${JSON.stringify(topIssues, null, 2)}

SIGNAUX COMBINES GSC + GA4 (priorite descendante) :
${JSON.stringify(topCombined, null, 2)}

CONTEXTE :
- Site d'assurance taxi (B2C, secteur reglemente)
- Audience : chauffeurs de taxi cherchant une assurance
- Objectif : generer des leads (formulaires remplis)
- Mesure ID GA4 : G-EF69PNJBZE

Reponds en JSON avec ce format exact :
{
  "recommendations": [
    {
      "page": "/chemin/page",
      "priority": "haute|moyenne|faible",
      "problem": "description courte du probleme identifie",
      "action": "action concrete a effectuer (max 2 phrases)",
      "expected_gain": "gain attendu (ex: +20% engagement, -15% bounce rate)"
    }
  ]
}`;

      const data = await nativeAdminCall<{final_response?:string;response?:string}>('/v1/admin/llm',{method:'POST',body:JSON.stringify({action:'council',query:prompt})});
      const content = data.final_response || data.response || '';
      const parsed = JSON.parse(typeof content === 'string' ? content : JSON.stringify(content));
      setAiRecs(parsed.recommendations || []);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'Erreur lors de l\'analyse IA');
    } finally {
      setAiLoading(false);
    }
  };

  const filteredSignals = signals
    .filter(s => {
      if (filterScore === 'low') return s.behavioral_score < 40;
      if (filterScore === 'medium') return s.behavioral_score >= 40 && s.behavioral_score < 70;
      if (filterScore === 'high') return s.behavioral_score >= 70;
      return true;
    })
    .sort((a, b) => {
      const av = a[sortKey] as number;
      const bv = b[sortKey] as number;
      return sortAsc ? av - bv : bv - av;
    });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(v => !v);
    else { setSortKey(key); setSortAsc(false); }
  };

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? (sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <Minus size={10} className="opacity-30" />;

  const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'overview', label: 'Vue d\'ensemble', icon: BarChart3 },
    { key: 'pages', label: 'Pages GA4', icon: Globe },
    { key: 'combined', label: 'GSC + GA4', icon: Target },
    { key: 'ai', label: 'Analyse IA', icon: Brain },
  ];

  const priorityColor = (p: AIRecommendation['priority']) => ({
    haute: 'bg-red-500/20 text-red-300 border-red-500/30',
    moyenne: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    faible: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  }[p]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 size={26} className="text-orange-400" />
            GA4 Analytics SEO
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">
            Donnees comportementales Google Analytics 4 &bull; ID : G-EF69PNJBZE
          </p>
        </div>
        <div className="flex items-center gap-3">
          {summary?.last_sync && (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Clock size={12} />
              Sync {new Date(summary.last_sync).toLocaleDateString('fr-FR')}
            </span>
          )}
          <button
            onClick={syncGA4}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Synchronisation...' : 'Synchroniser GA4'}
          </button>
        </div>
      </div>

      {syncMsg && (
        <div className={`px-4 py-3 rounded-lg text-sm border ${syncMsg.startsWith('Erreur') || syncMsg.startsWith('Configuration') ? 'bg-red-500/10 border-red-500/30 text-red-300' : 'bg-green-500/10 border-green-500/30 text-green-300'}`}>
          {syncMsg}
          {syncMsg.includes('Configuration requise') && (
            <p className="mt-1 text-xs opacity-80">
              Configurez les secrets Supabase : GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_KEY, GA4_PROPERTY_ID
            </p>
          )}
        </div>
      )}

      {/* KPI Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Globe, label: 'Pages suivies', value: summary.total_pages_tracked, color: 'blue', sub: 'dans GA4' },
            { icon: Users, label: 'Sessions totales', value: summary.total_sessions?.toLocaleString('fr-FR') ?? '0', color: 'green', sub: '30 derniers jours' },
            { icon: Activity, label: 'Taux d\'engagement', value: fmtPct(summary.avg_engagement_rate), color: 'amber', sub: 'moyenne toutes pages' },
            { icon: AlertTriangle, label: 'Pages a optimiser', value: summary.low_engagement_pages, color: 'red', sub: 'engagement < 30%' },
          ].map(({ icon: Icon, label, value, color, sub }) => (
            <div key={label} className={`rounded-xl border p-5 bg-${color}-500/10 border-${color}-500/20`}>
              <div className="flex items-center justify-between mb-3">
                <div className={`w-9 h-9 rounded-lg bg-${color}-500/10 border border-${color}-500/20 flex items-center justify-center`}>
                  <Icon size={16} className={`text-${color}-400`} />
                </div>
              </div>
              <p className="text-xs text-gray-500 mb-0.5">{label}</p>
              <p className="text-2xl font-bold text-white">{value}</p>
              <p className="text-xs text-gray-600 mt-1">{sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Additional KPIs row */}
      {summary && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: Timer, label: 'Duree moyenne session', value: fmtSec(summary.avg_session_duration), color: 'cyan' },
            { icon: TrendingDown, label: 'Taux de rebond moyen', value: fmtPct(summary.avg_bounce_rate), color: 'rose' },
            { icon: CheckCircle, label: 'Pages tres engagees', value: summary.high_engagement_pages, color: 'emerald' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className={`rounded-xl border p-4 bg-${color}-500/10 border-${color}-500/20 flex items-center gap-4`}>
              <div className={`w-10 h-10 rounded-lg bg-${color}-500/10 border border-${color}-500/20 flex items-center justify-center shrink-0`}>
                <Icon size={18} className={`text-${color}-400`} />
              </div>
              <div>
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-xl font-bold text-white">{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-white/10">
        <div className="flex gap-1">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all ${
                tab === key
                  ? 'bg-white/10 text-white border border-white/10 border-b-transparent -mb-px'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
          <span className="ml-3 text-gray-400 text-sm">Chargement des donnees GA4...</span>
        </div>
      ) : (
        <>
          {/* OVERVIEW TAB */}
          {tab === 'overview' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">Pages les plus visitees (Top 10)</h2>
              <div className="space-y-2">
                {signals
                  .sort((a, b) => b.sessions - a.sessions)
                  .slice(0, 10)
                  .map(s => (
                    <div key={s.page_path} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-lg px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-mono truncate">{s.page_path}</p>
                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                          <span className="flex items-center gap-1"><Users size={10} /> {s.sessions.toLocaleString('fr-FR')} sessions</span>
                          <span className="flex items-center gap-1"><Eye size={10} /> {s.page_views.toLocaleString('fr-FR')} vues</span>
                          <span className="flex items-center gap-1"><Timer size={10} /> {fmtSec(s.avg_session_duration)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Engagement</p>
                          <p className="text-sm font-semibold text-white">{fmtPct(s.engagement_rate)}</p>
                        </div>
                        <div className={`px-2.5 py-1 rounded-lg border text-xs font-bold ${SCORE_BG(s.behavioral_score)} ${SCORE_COLOR(s.behavioral_score)}`}>
                          {s.behavioral_score}/100
                        </div>
                      </div>
                    </div>
                  ))}
              </div>

              <h2 className="text-lg font-semibold text-white pt-2">Pages critiques (score &lt; 40)</h2>
              <div className="space-y-2">
                {signals
                  .filter(s => s.behavioral_score < 40 && s.sessions > 5)
                  .sort((a, b) => b.sessions - a.sessions)
                  .slice(0, 8)
                  .map(s => (
                    <div key={s.page_path} className="flex items-center gap-3 bg-red-500/5 border border-red-500/20 rounded-lg px-4 py-3">
                      <AlertTriangle size={14} className="text-red-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-mono truncate">{s.page_path}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs">
                          <span className="text-gray-500">{s.sessions} sessions</span>
                          <span className="text-red-400">Rebond : {fmtPct(s.bounce_rate)}</span>
                          <span className="text-gray-500">Engagement : {fmtPct(s.engagement_rate)}</span>
                        </div>
                      </div>
                      <div className={`px-2.5 py-1 rounded-lg border text-xs font-bold ${SCORE_BG(s.behavioral_score)} ${SCORE_COLOR(s.behavioral_score)}`}>
                        {s.behavioral_score}/100
                      </div>
                    </div>
                  ))}
                {signals.filter(s => s.behavioral_score < 40 && s.sessions > 5).length === 0 && (
                  <p className="text-gray-500 text-sm text-center py-6">Aucune page critique detectee (synchronisez GA4 d\'abord)</p>
                )}
              </div>
            </div>
          )}

          {/* PAGES TAB */}
          {tab === 'pages' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5 text-sm text-gray-400">
                  <Filter size={14} />
                  Filtrer par score :
                </div>
                {(['all', 'low', 'medium', 'high'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilterScore(f)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      filterScore === f
                        ? 'bg-orange-500 border-orange-500 text-white'
                        : 'border-white/20 text-gray-400 hover:text-white'
                    }`}
                  >
                    {f === 'all' ? 'Tous' : f === 'low' ? 'Critique < 40' : f === 'medium' ? 'Moyen 40-70' : 'Bon > 70'}
                  </button>
                ))}
                <span className="ml-auto text-xs text-gray-500">{filteredSignals.length} pages</span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5">
                      {[
                        { key: 'page_path', label: 'Page', w: 'min-w-[200px]' },
                        { key: 'sessions', label: 'Sessions', w: '' },
                        { key: 'page_views', label: 'Vues', w: '' },
                        { key: 'engagement_rate', label: 'Engagement', w: '' },
                        { key: 'avg_session_duration', label: 'Duree moy.', w: '' },
                        { key: 'bounce_rate', label: 'Rebond', w: '' },
                        { key: 'behavioral_score', label: 'Score', w: '' },
                      ].map(({ key, label, w }) => (
                        <th
                          key={key}
                          onClick={() => handleSort(key as SortKey)}
                          className={`px-4 py-3 text-left text-xs font-medium text-gray-400 cursor-pointer hover:text-white select-none ${w}`}
                        >
                          <span className="flex items-center gap-1">
                            {label} <SortIcon k={key as SortKey} />
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSignals.map((s, i) => (
                      <tr key={s.page_path} className={`border-b border-white/5 hover:bg-white/5 transition-colors ${i % 2 === 0 ? '' : 'bg-white/[0.02]'}`}>
                        <td className="px-4 py-3 max-w-[240px]">
                          <p className="text-white font-mono text-xs truncate" title={s.page_path}>{s.page_path || '/'}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-300 text-center">{s.sessions.toLocaleString('fr-FR')}</td>
                        <td className="px-4 py-3 text-gray-300 text-center">{s.page_views.toLocaleString('fr-FR')}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-semibold ${s.engagement_rate >= 0.6 ? 'text-green-400' : s.engagement_rate >= 0.3 ? 'text-amber-400' : 'text-red-400'}`}>
                            {fmtPct(s.engagement_rate)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-300 text-center">{fmtSec(s.avg_session_duration)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={s.bounce_rate > 0.7 ? 'text-red-400' : s.bounce_rate > 0.5 ? 'text-amber-400' : 'text-green-400'}>
                            {fmtPct(s.bounce_rate)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-bold ${SCORE_BG(s.behavioral_score)} ${SCORE_COLOR(s.behavioral_score)}`}>
                            {s.behavioral_score}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {filteredSignals.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-gray-500 text-sm">
                          Aucune donnee — synchronisez GA4 pour charger les signaux
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* COMBINED GSC + GA4 TAB */}
          {tab === 'combined' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-400">
                Vue croisee Search Console + GA4 : identifie les pages a fort potentiel SEO et les actions prioritaires.
              </p>
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5">
                      {['Page', 'Position GSC', 'Impressions', 'Clics', 'Sessions GA4', 'Engagement', 'Score combiné'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {combined.map((c, i) => (
                      <tr key={c.page_path + i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3 max-w-[200px]">
                          <p className="text-white font-mono text-xs truncate">{c.page_path || '/'}</p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-semibold ${c.gsc_position <= 3 ? 'text-green-400' : c.gsc_position <= 10 ? 'text-amber-400' : 'text-gray-400'}`}>
                            {c.gsc_position > 0 ? fmt(c.gsc_position, 1) : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-300 text-center">{c.gsc_impressions?.toLocaleString('fr-FR') || '—'}</td>
                        <td className="px-4 py-3 text-gray-300 text-center">{c.gsc_clicks?.toLocaleString('fr-FR') || '—'}</td>
                        <td className="px-4 py-3 text-gray-300 text-center">{c.ga4_sessions?.toLocaleString('fr-FR') || '—'}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={c.ga4_engagement >= 0.6 ? 'text-green-400' : c.ga4_engagement >= 0.3 ? 'text-amber-400' : 'text-red-400'}>
                            {c.ga4_engagement > 0 ? fmtPct(c.ga4_engagement) : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center gap-1.5">
                            <div className="flex-1 bg-white/10 rounded-full h-1.5 max-w-[60px]">
                              <div
                                className={`h-1.5 rounded-full ${c.combined_priority >= 70 ? 'bg-red-400' : c.combined_priority >= 40 ? 'bg-amber-400' : 'bg-green-400'}`}
                                style={{ width: `${c.combined_priority}%` }}
                              />
                            </div>
                            <span className={`text-xs font-bold ${c.combined_priority >= 70 ? 'text-red-400' : c.combined_priority >= 40 ? 'text-amber-400' : 'text-green-400'}`}>
                              {c.combined_priority}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {combined.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-gray-500 text-sm">
                          Synchronisez GA4 et GSC pour obtenir la vue combinee
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* AI ANALYSIS TAB */}
          {tab === 'ai' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/20 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-orange-500/20 border border-orange-500/30 rounded-xl flex items-center justify-center shrink-0">
                    <Brain size={22} className="text-orange-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold text-lg">Analyse IA des donnees GA4</h3>
                    <p className="text-gray-400 text-sm mt-1">
                      L'IA analyse vos signaux comportementaux GA4 combines avec les donnees GSC pour generer des recommandations SEO personnalisees pour TaxiAssur.
                    </p>
                    <div className="flex items-center gap-3 mt-4">
                      <button
                        onClick={analyzeWithAI}
                        disabled={aiLoading || signals.length === 0}
                        className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Sparkles size={16} className={aiLoading ? 'animate-pulse' : ''} />
                        {aiLoading ? 'Analyse en cours...' : 'Lancer l\'analyse IA'}
                      </button>
                      {signals.length === 0 && (
                        <span className="text-xs text-amber-400 flex items-center gap-1">
                          <AlertTriangle size={12} /> Synchronisez GA4 d'abord
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {aiError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-300 text-sm">
                  {aiError}
                </div>
              )}

              {aiLoading && (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center space-y-3">
                    <div className="w-10 h-10 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mx-auto" />
                    <p className="text-gray-400 text-sm">L'IA analyse {signals.length} pages et croise les donnees GSC + GA4...</p>
                  </div>
                </div>
              )}

              {aiRecs.length > 0 && !aiLoading && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-white font-semibold">{aiRecs.length} recommandations generees</h3>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="px-2 py-0.5 bg-red-500/20 border border-red-500/30 text-red-300 rounded-full">{aiRecs.filter(r => r.priority === 'haute').length} haute</span>
                      <span className="px-2 py-0.5 bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-full">{aiRecs.filter(r => r.priority === 'moyenne').length} moyenne</span>
                      <span className="px-2 py-0.5 bg-blue-500/20 border border-blue-500/30 text-blue-300 rounded-full">{aiRecs.filter(r => r.priority === 'faible').length} faible</span>
                    </div>
                  </div>

                  {aiRecs
                    .sort((a, b) => ({ haute: 0, moyenne: 1, faible: 2 }[a.priority] - { haute: 0, moyenne: 1, faible: 2 }[b.priority]))
                    .map((rec, i) => (
                      <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-5 hover:border-white/20 transition-all">
                        <div className="flex items-start gap-4">
                          <div className="w-7 h-7 bg-white/10 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold text-gray-400 mt-0.5">
                            {i + 1}
                          </div>
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs text-orange-300 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded">
                                {rec.page}
                              </span>
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${priorityColor(rec.priority)}`}>
                                Priorite {rec.priority}
                              </span>
                            </div>
                            <p className="text-sm text-red-300 flex items-start gap-1.5">
                              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                              {rec.problem}
                            </p>
                            <p className="text-sm text-white flex items-start gap-1.5">
                              <Zap size={13} className="mt-0.5 shrink-0 text-amber-400" />
                              {rec.action}
                            </p>
                            <p className="text-sm text-green-300 flex items-start gap-1.5">
                              <TrendingUp size={13} className="mt-0.5 shrink-0" />
                              {rec.expected_gain}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {!aiLoading && aiRecs.length === 0 && !aiError && (
                <div className="text-center py-12 text-gray-500 text-sm">
                  Cliquez sur "Lancer l'analyse IA" pour obtenir des recommandations personnalisees
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
