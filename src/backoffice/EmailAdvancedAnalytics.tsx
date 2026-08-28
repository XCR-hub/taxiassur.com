import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3, Globe, TrendingUp, Mail, Send, MousePointer, Reply,
  RefreshCw, Calendar, Award, Eye, Users, ArrowUp, ArrowDown,
  Minus, Filter, ChevronDown, Activity, Target, Inbox,
} from 'lucide-react';
import { nativeAdminCall } from '@/lib/native-admin-data';

/* ── Types ────────────────────────────────────────────────────── */
interface KPI {
  label: string;
  value: number | string;
  sub?: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  trend?: number | null;
  fmt?: 'pct' | 'num';
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  sent_count: number;
  open_count?: number;
  click_count?: number;
  sent_at?: string;
  subject?: string;
}

interface CampaignRow {
  id: string;
  name: string;
  status: string;
  subject?: string;
  sent_count: number;
  open_rate: number;
  click_rate: number;
  sent_at?: string;
}

interface EngagedLead {
  lead_id: string;
  engagement_score: number;
  open_rate: number;
  click_rate: number;
  reply_rate: number;
  leads?: { name?: string; email?: string } | null;
}

interface GeoStat {
  country_name: string;
  count: number;
  pct: number;
}

interface ABTest {
  name: string;
  status: string;
  variant_a_opens: number;
  variant_b_opens: number;
  winner?: 'A' | 'B' | null;
}

interface SubSeries {
  month: string;
  count: number;
}

type Period = '7' | '30' | '90' | '365';

/* ── Helpers ──────────────────────────────────────────────────── */
function fmtNum(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}
function fmtPct(n: number) { return `${n.toFixed(1)}%`; }
function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}
function initials(email?: string, name?: string) {
  if (name) return name.slice(0, 2).toUpperCase();
  if (email) return email.slice(0, 2).toUpperCase();
  return '??';
}
function avatarHue(s = '') { return (s.charCodeAt(0) * 37 + (s.charCodeAt(1) || 0) * 13) % 360; }

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
      <div className={`h-1.5 rounded-full transition-all duration-700 ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

function TrendBadge({ v }: { v?: number | null }) {
  if (v == null) return null;
  if (v === 0) return <span className="inline-flex items-center gap-0.5 text-xs text-gray-400"><Minus size={10} />stable</span>;
  const pos = v > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${pos ? 'text-green-600' : 'text-red-500'}`}>
      {pos ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
      {pos ? '+' : ''}{v.toFixed(1)}%
    </span>
  );
}

function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-gray-100 rounded ${className}`} />;
}

/* ── Status chip ──────────────────────────────────────────────── */
const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  sent:      { label: 'Envoyée',    cls: 'bg-blue-50 text-blue-700'   },
  draft:     { label: 'Brouillon',  cls: 'bg-gray-100 text-gray-600'  },
  scheduled: { label: 'Planifiée',  cls: 'bg-amber-50 text-amber-700' },
  running:   { label: 'En cours',   cls: 'bg-green-50 text-green-700' },
  completed: { label: 'Terminé',    cls: 'bg-teal-50 text-teal-700'   },
};

/* ── Period selector ──────────────────────────────────────────── */
const PERIODS: { v: Period; label: string }[] = [
  { v: '7', label: '7 j' },
  { v: '30', label: '30 j' },
  { v: '90', label: '90 j' },
  { v: '365', label: '1 an' },
];

/* ════════════════════════════════════════════════════════════════ */
export default function EmailAdvancedAnalytics() {
  const [period, setPeriod]         = useState<Period>('30');
  const [loading, setLoading]       = useState(true);
  const [kpis, setKpis]             = useState<KPI[]>([]);
  const [campaigns, setCampaigns]   = useState<CampaignRow[]>([]);
  const [engaged, setEngaged]       = useState<EngagedLead[]>([]);
  const [geo, setGeo]               = useState<GeoStat[]>([]);
  const [abTests, setAbTests]       = useState<ABTest[]>([]);
  const [subSeries, setSubSeries]   = useState<SubSeries[]>([]);
  const [funnelData, setFunnelData] = useState({ sent: 0, opened: 0, clicked: 0, replied: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await nativeAdminCall<{
        campaigns?: CampaignRow[];
        engaged?: EngagedLead[];
        geo?: GeoStat[];
        ab_tests?: ABTest[];
        sub_series?: SubSeries[];
        funnel?: { sent: number; opened: number; clicked: number; replied: number };
        summary?: { active_subscribers: number; new_subscribers: number; total_sent: number; avg_open_rate: number; avg_click_rate: number; campaigns: number };
      }>(`/v1/admin/email-advanced-analytics?days=${encodeURIComponent(period)}`);

      /* ── Campaigns ── */
      const cmpRows = data.campaigns || [];
      setCampaigns(cmpRows);

      /* ── Funnel totals ── */
      const totalSent = data.funnel?.sent || 0;
      setFunnelData(data.funnel || { sent: 0, opened: 0, clicked: 0, replied: 0 });

      /* ── Subscriber growth ── */
      setSubSeries(data.sub_series || []);

      /* ── Subscriber KPIs ── */
      const activeSubs = data.summary?.active_subscribers || 0;
      const newSubs = data.summary?.new_subscribers || 0;

      /* ── Prev period for trends ── */
      const subTrend = null;
      const avgOpen = data.summary?.avg_open_rate || 0;
      const avgClick = data.summary?.avg_click_rate || 0;

      setKpis([
        { label: 'Abonnés actifs',     value: activeSubs,    icon: Users,         color: 'text-blue-600',   bg: 'bg-blue-50',   fmt: 'num'  },
        { label: 'Nouveaux abonnés',   value: newSubs,       icon: TrendingUp,    color: 'text-green-600',  bg: 'bg-green-50',  fmt: 'num', trend: subTrend },
        { label: 'Emails envoyés',     value: totalSent,     icon: Send,          color: 'text-gray-600',   bg: 'bg-gray-50',   fmt: 'num'  },
        { label: 'Taux ouverture moy', value: avgOpen,       icon: Eye,           color: 'text-teal-600',   bg: 'bg-teal-50',   fmt: 'pct'  },
        { label: 'Taux de clic moy',   value: avgClick,      icon: MousePointer,  color: 'text-orange-500', bg: 'bg-orange-50', fmt: 'pct'  },
        { label: 'Campagnes',          value: data.summary?.campaigns || cmpRows.length,icon: BarChart3, color: 'text-rose-500', bg: 'bg-rose-50', fmt: 'num' },
      ]);

      /* ── Engagement scores ── */
      setEngaged(data.engaged || []);

      /* ── Geo ── */
      setGeo(data.geo || []);

      /* ── A/B tests ── */
      setAbTests(data.ab_tests || []);

    } catch (e) {
      console.error('Analytics error:', e);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  /* ── Max for bar scale ── */
  const maxSub = Math.max(...subSeries.map(s => s.count), 1);
  const maxGeo = geo[0]?.count || 1;

  /* ── Funnel ── */
  const funnelSteps = [
    { label: 'Envoyés',  value: funnelData.sent,    color: 'bg-gray-700',   icon: Send,          pct: 100 },
    { label: 'Ouverts',  value: funnelData.opened,   color: 'bg-blue-500',   icon: Eye,           pct: funnelData.sent ? (funnelData.opened  / funnelData.sent) * 100 : 0 },
    { label: 'Cliqués',  value: funnelData.clicked,  color: 'bg-teal-500',   icon: MousePointer,  pct: funnelData.sent ? (funnelData.clicked / funnelData.sent) * 100 : 0 },
  ];

  return (
    <div className="h-full overflow-auto bg-gray-50">
      {/* ── Header ── */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Activity size={20} className="text-green-600" /> Analytics Email
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">Performance de vos campagnes et abonnés</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Period selector */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              {PERIODS.map(p => (
                <button key={p.v} onClick={() => setPeriod(p.v)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${period === p.v ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                  {p.label}
                </button>
              ))}
            </div>
            <button onClick={load} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors" title="Actualiser">
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </header>

      <div className="p-6 space-y-6">

        {/* ── KPI cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
                  <Skeleton className="w-8 h-8 mb-3" />
                  <Skeleton className="h-7 w-16 mb-1" />
                  <Skeleton className="h-3 w-24" />
                </div>
              ))
            : kpis.map(k => (
                <div key={k.label} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className={`w-8 h-8 ${k.bg} rounded-lg flex items-center justify-center mb-3`}>
                    <k.icon size={16} className={k.color} />
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="text-2xl font-bold text-gray-900 leading-none">
                      {k.fmt === 'pct' ? fmtPct(Number(k.value)) : fmtNum(Number(k.value))}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 leading-tight">{k.label}</p>
                  {k.trend != null && (
                    <div className="mt-1"><TrendBadge v={k.trend} /></div>
                  )}
                </div>
              ))
          }
        </div>

        {/* ── Two-col: Funnel + Sub growth ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Funnel */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Target size={16} className="text-green-600" /> Entonnoir d'engagement
              <span className="text-xs font-normal text-gray-400 ml-auto">période : {period} j</span>
            </h2>
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : funnelData.sent === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                <Inbox size={32} className="mb-2 opacity-40" />
                <p className="text-sm">Aucune campagne envoyée sur cette période</p>
              </div>
            ) : (
              <div className="space-y-3">
                {funnelSteps.map((step, i) => (
                  <div key={step.label} className="relative">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-md ${step.color} flex items-center justify-center`}>
                          <step.icon size={12} className="text-white" />
                        </div>
                        <span className="text-sm font-medium text-gray-700">{step.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-900">{step.value.toLocaleString('fr-FR')}</span>
                        {i > 0 && <span className="text-xs text-gray-400">{fmtPct(step.pct)}</span>}
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div className={`h-2 rounded-full transition-all duration-700 ${step.color}`}
                        style={{ width: `${step.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Subscriber growth bar chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-blue-600" /> Nouveaux abonnés
              <span className="text-xs font-normal text-gray-400 ml-auto">par mois</span>
            </h2>
            {loading ? (
              <div className="flex items-end gap-2 h-24">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="flex-1 rounded-t" style={{ height: `${30 + i * 10}%` }} />)}
              </div>
            ) : subSeries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                <Users size={32} className="mb-2 opacity-40" />
                <p className="text-sm">Aucun abonné sur cette période</p>
              </div>
            ) : (
              <div className="flex items-end gap-1.5 h-28 mt-2">
                {subSeries.map(s => (
                  <div key={s.month} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div className="w-full bg-blue-500 rounded-t transition-all duration-500 hover:bg-blue-600"
                      style={{ height: `${(s.count / maxSub) * 100}%`, minHeight: '4px' }} />
                    <span className="text-[9px] text-gray-400 truncate w-full text-center">{s.month}</span>
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded
                      opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity">
                      +{s.count}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Campaign performance table ── */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <Send size={16} className="text-green-600" /> Performance des campagnes
            </h2>
            <span className="text-xs text-gray-400">{campaigns.length} campagne(s)</span>
          </div>
          {loading ? (
            <div className="divide-y divide-gray-50">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="px-5 py-4 flex gap-4 items-center">
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : campaigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400">
              <Mail size={32} className="mb-2 opacity-40" />
              <p className="text-sm">Aucune campagne sur cette période</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <th className="px-5 py-3 text-left">Campagne</th>
                    <th className="px-4 py-3 text-left hidden md:table-cell">Statut</th>
                    <th className="px-4 py-3 text-right">Envoyés</th>
                    <th className="px-4 py-3 text-left" style={{ minWidth: 140 }}>Taux ouverture</th>
                    <th className="px-4 py-3 text-left" style={{ minWidth: 140 }}>Taux de clic</th>
                    <th className="px-4 py-3 text-left hidden lg:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {campaigns.map(c => {
                    const sm = STATUS_MAP[c.status] || { label: c.status, cls: 'bg-gray-100 text-gray-600' };
                    return (
                      <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="font-medium text-gray-900 truncate max-w-[200px]">{c.name}</div>
                          {c.subject && <div className="text-xs text-gray-400 truncate max-w-[200px]">{c.subject}</div>}
                        </td>
                        <td className="px-4 py-3.5 hidden md:table-cell">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${sm.cls}`}>{sm.label}</span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span className="font-medium text-gray-900">{c.sent_count.toLocaleString('fr-FR')}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold w-12 shrink-0 ${c.open_rate >= 20 ? 'text-green-600' : c.open_rate >= 10 ? 'text-amber-500' : 'text-gray-500'}`}>
                              {fmtPct(c.open_rate)}
                            </span>
                            <Bar pct={c.open_rate} color={c.open_rate >= 20 ? 'bg-green-500' : c.open_rate >= 10 ? 'bg-amber-400' : 'bg-gray-300'} />
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold w-12 shrink-0 ${c.click_rate >= 3 ? 'text-teal-600' : c.click_rate >= 1 ? 'text-amber-500' : 'text-gray-500'}`}>
                              {fmtPct(c.click_rate)}
                            </span>
                            <Bar pct={c.click_rate * 4} color={c.click_rate >= 3 ? 'bg-teal-500' : c.click_rate >= 1 ? 'bg-amber-400' : 'bg-gray-300'} />
                          </div>
                        </td>
                        <td className="px-4 py-3.5 hidden lg:table-cell">
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Calendar size={11} /> {fmtDate(c.sent_at)}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Bottom row: Top engaged + Geo + AB ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Top engaged leads */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 lg:col-span-1">
            <h2 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Award size={16} className="text-amber-500" /> Leads les + engagés
            </h2>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="w-8 h-8 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-3 w-32" />
                      <Skeleton className="h-2 w-20" />
                    </div>
                    <Skeleton className="h-5 w-10" />
                  </div>
                ))}
              </div>
            ) : engaged.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                <Users size={28} className="mb-2 opacity-40" />
                <p className="text-xs">Aucune donnée</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {engaged.map((l, i) => {
                  const email = l.leads?.email || '';
                  const name  = l.leads?.name  || email;
                  return (
                    <div key={l.lead_id} className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                          style={{ background: `hsl(${avatarHue(email)}, 55%, 50%)` }}>
                          {initials(email, l.leads?.name)}
                        </div>
                        <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white border border-gray-200 text-[8px] font-bold text-gray-600 flex items-center justify-center">
                          {i + 1}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-gray-900 truncate">{name}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-gray-400">Ouv. <strong className="text-gray-600">{l.open_rate.toFixed(0)}%</strong></span>
                          <span className="text-[10px] text-gray-400">Clic <strong className="text-gray-600">{l.click_rate.toFixed(0)}%</strong></span>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className={`text-sm font-bold ${l.engagement_score >= 80 ? 'text-green-600' : l.engagement_score >= 50 ? 'text-amber-500' : 'text-gray-500'}`}>
                          {l.engagement_score}
                        </div>
                        <div className="text-[9px] text-gray-400">score</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Geographic */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 lg:col-span-1">
            <h2 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Globe size={16} className="text-blue-600" /> Répartition géographique
            </h2>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : geo.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                <Globe size={28} className="mb-2 opacity-40" />
                <p className="text-xs">Aucune donnée géographique</p>
              </div>
            ) : (
              <div className="space-y-3">
                {geo.map((g, i) => (
                  <div key={g.country_name}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣'][i]}</span>
                        <span className="text-xs font-medium text-gray-800">{g.country_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">{g.count}</span>
                        <span className="text-xs font-medium text-blue-600">{fmtPct(g.pct)}</span>
                      </div>
                    </div>
                    <Bar pct={g.pct} color="bg-blue-500" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* A/B Tests */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 lg:col-span-1">
            <h2 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <BarChart3 size={16} className="text-rose-500" /> Tests A/B récents
            </h2>
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : abTests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                <BarChart3 size={28} className="mb-2 opacity-40" />
                <p className="text-xs">Aucun test A/B</p>
              </div>
            ) : (
              <div className="space-y-4">
                {abTests.map(t => {
                  const total = t.variant_a_opens + t.variant_b_opens;
                  const pctA = total ? (t.variant_a_opens / total) * 100 : 50;
                  const pctB = 100 - pctA;
                  const sm = STATUS_MAP[t.status] || { label: t.status, cls: 'bg-gray-100 text-gray-600' };
                  return (
                    <div key={t.name} className="rounded-lg border border-gray-100 p-3">
                      <div className="flex items-center justify-between mb-2 gap-2">
                        <p className="text-xs font-semibold text-gray-800 truncate flex-1">{t.name}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${sm.cls} shrink-0`}>{sm.label}</span>
                      </div>
                      <div className="flex h-2 rounded-full overflow-hidden mb-2 gap-0.5">
                        <div className={`bg-rose-500 rounded-l transition-all duration-700 ${t.winner === 'A' ? 'ring-2 ring-rose-300' : ''}`}
                          style={{ width: `${pctA}%` }} />
                        <div className={`bg-gray-300 rounded-r transition-all duration-700 ${t.winner === 'B' ? 'ring-2 ring-gray-400' : ''}`}
                          style={{ width: `${pctB}%` }} />
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className={`font-medium ${t.winner === 'A' ? 'text-rose-600' : 'text-gray-500'}`}>
                          A — {t.variant_a_opens} ouv. {t.winner === 'A' && '🏆'}
                        </span>
                        <span className={`font-medium ${t.winner === 'B' ? 'text-gray-700' : 'text-gray-400'}`}>
                          {t.winner === 'B' && '🏆'} B — {t.variant_b_opens} ouv.
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
