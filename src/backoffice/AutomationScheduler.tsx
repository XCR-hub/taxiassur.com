import { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, Zap, Play, Pause, RefreshCw, Hash, CheckCircle, AlertCircle, FileText, HelpCircle, Star, ChevronDown, X, Sparkles, BarChart3, TrendingUp, Eye, CreditCard as Edit2, ToggleLeft, ToggleRight } from 'lucide-react';
import { nativeAdminCall } from '@/lib/native-admin-data';
import { logger } from '@/lib/logger';

/* ── Types ──────────────────────────────────────────────────────── */
interface ScheduleConfig {
  id: string;
  content_type: 'blog' | 'faq' | 'review';
  frequency_per_week: number;
  auto_publish: boolean;
  keywords: string[];
  last_generated_at: string | null;
  is_active: boolean;
}

interface ContentStats {
  total: number;
  published: number;
  draft: number;
  lastWeek: number;
}

interface RecentContent {
  id: string;
  title: string;
  type: string;
  published: boolean;
  created_at: string;
}

/* ── Helpers ────────────────────────────────────────────────────── */
const TYPE_META: Record<string, { label: string; icon: React.ElementType; color: string; bg: string; dot: string }> = {
  blog:   { label: 'Articles Blog',  icon: FileText,   color: 'text-blue-600',   bg: 'bg-blue-50',   dot: 'bg-blue-500'   },
  faq:    { label: 'FAQ',            icon: HelpCircle, color: 'text-teal-600',   bg: 'bg-teal-50',   dot: 'bg-teal-500'   },
  review: { label: 'Avis Clients',   icon: Star,       color: 'text-amber-600',  bg: 'bg-amber-50',  dot: 'bg-amber-500'  },
};

const FREQ_OPTIONS = [
  { value: 1, label: '1×/sem',    sublabel: 'Léger' },
  { value: 2, label: '2×/sem',    sublabel: 'Régulier' },
  { value: 3, label: '3×/sem',    sublabel: 'Soutenu' },
  { value: 5, label: '5×/sem',    sublabel: 'Intensif' },
  { value: 7, label: 'Quotidien', sublabel: 'Max' },
];

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fmtShort(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
function nextRun(schedule: ScheduleConfig): Date | null {
  if (!schedule.is_active) return null;
  const d = new Date();
  d.setDate(d.getDate() + Math.ceil(7 / schedule.frequency_per_week));
  return d;
}
function timeUntil(d: Date) {
  const diff = d.getTime() - Date.now();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 48) return `dans ${Math.floor(h / 24)} j`;
  if (h > 0) return `dans ${h}h${m > 0 ? m + 'm' : ''}`;
  return `dans ${m}m`;
}

/* ── Weekly dots ────────────────────────────────────────────────── */
function WeeklyDots({ freq, active }: { freq: number; active: boolean }) {
  const days = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  const step = Math.round(7 / freq);
  const filled = Array.from({ length: 7 }, (_, i) => i % step === 0);
  return (
    <div className="flex items-center gap-1">
      {days.map((d, i) => (
        <div key={i} className="flex flex-col items-center gap-0.5">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold transition-all
            ${filled[i] && active ? 'bg-orange-500 text-white shadow-sm' : filled[i] ? 'bg-gray-300 text-gray-500' : 'bg-gray-100 text-gray-400'}`}>
            {d}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════ */
export default function AutomationScheduler() {
  const [schedules, setSchedules]           = useState<ScheduleConfig[]>([]);
  const [stats, setStats]                   = useState<ContentStats>({ total: 0, published: 0, draft: 0, lastWeek: 0 });
  const [recentContent, setRecentContent]   = useState<RecentContent[]>([]);
  const [loading, setLoading]               = useState(true);
  const [saving, setSaving]                 = useState<string | null>(null);
  const [generating, setGenerating]         = useState<string | null>(null);
  const [toast, setToast]                   = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
  const [kwModal, setKwModal]               = useState<ScheduleConfig | null>(null);
  const [kwInput, setKwInput]               = useState('');
  const [expandedCard, setExpandedCard]     = useState<string | null>(null);
  const [freqDropdown, setFreqDropdown]     = useState<string | null>(null);

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  /* ── Data loading ── */
  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadSchedules(), loadStats(), loadRecent()]);
    setLoading(false);
  }, []);

  const loadSchedules = async () => {
    const data = await nativeAdminCall<{ schedules?: ScheduleConfig[] }>('/v1/admin/content-scheduler');
    setSchedules(data.schedules || []);
  };

  const loadStats = async () => {
    const data = await nativeAdminCall<{ stats?: typeof stats }>('/v1/admin/content-scheduler');
    if (data.stats) setStats(data.stats);
  };

  const loadRecent = async () => {
    const data = await nativeAdminCall<{ recent?: RecentContent[] }>('/v1/admin/content-scheduler');
    setRecentContent(data.recent || []);
  };

  useEffect(() => { loadAll(); }, [loadAll]);

  /* ── Mutations ── */
  const patch = async (id: string, updates: Partial<ScheduleConfig>) => {
    setSaving(id);
    try {
      await nativeAdminCall('/v1/admin/content-scheduler', {
        method: 'PATCH',
        body: JSON.stringify({ id, ...updates }),
      });
      await loadSchedules();
    } catch (err) {
      logger.error('patch schedule', err);
      showToast('Erreur de mise à jour', 'err');
    } finally {
      setSaving(null);
    }
  };

  const handleGenerateNow = async (schedule: ScheduleConfig) => {
    setGenerating(schedule.id);
    try {
      await nativeAdminCall('/v1/admin/content-scheduler/generate', {
        method: 'POST',
        body: JSON.stringify({ schedule_id: schedule.id, content_type: schedule.content_type, auto_publish: schedule.auto_publish, keywords: schedule.keywords }),
      });
      showToast(`Contenu "${TYPE_META[schedule.content_type]?.label}" généré !`);
      await loadAll();
    } catch (err) {
      logger.error('generate', err);
      showToast('Erreur lors de la génération', 'err');
    } finally {
      setGenerating(null);
    }
  };

  const saveKeywords = async () => {
    if (!kwModal) return;
    const kws = kwInput.split(',').map(k => k.trim()).filter(Boolean);
    await patch(kwModal.id, { keywords: kws });
    showToast('Mots-clés mis à jour');
    setKwModal(null);
  };

  /* ── Render ── */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-orange-500" size={32} />
      </div>
    );
  }

  const activeCount   = schedules.filter(s => s.is_active).length;
  const inactiveCount = schedules.filter(s => !s.is_active).length;

  return (
    <div className="p-6 space-y-5 max-w-6xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar size={20} className="text-orange-500" />
            Planificateur de contenu
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">Génération automatique de contenu SEO</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs font-medium text-green-700">{activeCount} actifs</span>
          </div>
          {inactiveCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-lg">
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
              <span className="text-xs font-medium text-gray-600">{inactiveCount} inactifs</span>
            </div>
          )}
          <button onClick={loadAll} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total contenu',   value: stats.total,     icon: BarChart3,    color: 'text-gray-600',   bg: 'bg-gray-50',   border: 'border-gray-200' },
          { label: 'Publiés',         value: stats.published, icon: CheckCircle,  color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-200' },
          { label: 'Brouillons',      value: stats.draft,     icon: FileText,     color: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-200' },
          { label: 'Cette semaine',   value: stats.lastWeek,  icon: TrendingUp,   color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
        ].map(k => (
          <div key={k.label} className={`${k.bg} border ${k.border} rounded-xl px-4 py-3 flex items-center gap-3`}>
            <k.icon size={18} className={k.color} />
            <div>
              <div className="text-2xl font-bold text-gray-900 leading-none">{k.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-5 gap-5">

        {/* ── Schedule cards ── */}
        <div className="col-span-3 space-y-3">
          {schedules.length === 0 ? (
            <div className="bg-white border border-dashed border-gray-200 rounded-xl py-16 flex flex-col items-center text-gray-400">
              <Zap size={32} className="mb-2 opacity-30" />
              <p className="text-sm">Aucune planification configurée</p>
            </div>
          ) : schedules.map(s => {
            const meta   = TYPE_META[s.content_type] || TYPE_META.blog;
            const Icon   = meta.icon;
            const next   = nextRun(s);
            const isExp  = expandedCard === s.id;
            const isSav  = saving === s.id;
            const isGen  = generating === s.id;

            return (
              <div key={s.id}
                className={`bg-white border rounded-2xl transition-all ${s.is_active ? 'border-gray-200 shadow-sm' : 'border-gray-100 opacity-70'}`}>

                {/* Card header */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 ${meta.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                        <Icon size={18} className={meta.color} />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 text-sm">{meta.label}</div>
                        <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
                          <Clock size={11} />
                          {s.frequency_per_week}×/sem
                          {s.auto_publish
                            ? <span className="text-green-600 font-medium">· Publication auto</span>
                            : <span className="text-amber-600">· Brouillon</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Toggle active */}
                      <button
                        onClick={() => patch(s.id, { is_active: !s.is_active })}
                        disabled={!!isSav}
                        title={s.is_active ? 'Désactiver' : 'Activer'}
                        className="transition-opacity disabled:opacity-50"
                      >
                        {s.is_active
                          ? <ToggleRight size={28} className="text-orange-500" />
                          : <ToggleLeft  size={28} className="text-gray-400"   />}
                      </button>

                      {/* Expand */}
                      <button onClick={() => setExpandedCard(isExp ? null : s.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
                        <ChevronDown size={16} className={`transition-transform ${isExp ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Weekly dots */}
                  <div className="mt-3">
                    <WeeklyDots freq={s.frequency_per_week} active={s.is_active} />
                  </div>

                  {/* Keywords preview */}
                  {s.keywords.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {s.keywords.slice(0, 4).map((kw, i) => (
                        <span key={i} className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-full">{kw}</span>
                      ))}
                      {s.keywords.length > 4 && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-full">+{s.keywords.length - 4}</span>
                      )}
                    </div>
                  )}

                  {/* Next run */}
                  {next && s.is_active && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-orange-600 font-medium">
                      <Sparkles size={11} />
                      Prochain : {next.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} ({timeUntil(next)})
                    </div>
                  )}
                  {s.last_generated_at && (
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-400">
                      <CheckCircle size={11} />
                      Dernier : {fmtShort(s.last_generated_at)}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => handleGenerateNow(s)}
                      disabled={!s.is_active || !!isGen}
                      className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                      {isGen
                        ? <><RefreshCw size={13} className="animate-spin" /> Génération…</>
                        : <><Zap size={13} /> Générer maintenant</>}
                    </button>
                    <button
                      onClick={() => { setKwModal(s); setKwInput(s.keywords.join(', ')); }}
                      className="flex items-center gap-1.5 py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition-colors">
                      <Edit2 size={13} />
                      Mots-clés
                    </button>
                  </div>
                </div>

                {/* Expanded settings */}
                {isExp && (
                  <div className="border-t border-gray-100 px-4 py-4 space-y-4 bg-gray-50 rounded-b-2xl">

                    {/* Frequency selector */}
                    <div>
                      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 block">Fréquence</label>
                      <div className="relative">
                        <button
                          onClick={() => setFreqDropdown(freqDropdown === s.id ? null : s.id)}
                          className="w-full flex items-center justify-between px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:border-orange-400 transition-colors">
                          <span>{FREQ_OPTIONS.find(o => o.value === s.frequency_per_week)?.label || `${s.frequency_per_week}×/sem`}</span>
                          <ChevronDown size={14} className={`transition-transform ${freqDropdown === s.id ? 'rotate-180' : ''}`} />
                        </button>
                        {freqDropdown === s.id && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
                            {FREQ_OPTIONS.map(opt => (
                              <button key={opt.value}
                                onClick={() => { patch(s.id, { frequency_per_week: opt.value }); setFreqDropdown(null); }}
                                className={`w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-orange-50 transition-colors ${s.frequency_per_week === opt.value ? 'bg-orange-50 text-orange-700 font-semibold' : 'text-gray-700'}`}>
                                <span>{opt.label}</span>
                                <span className="text-xs text-gray-400">{opt.sublabel}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Auto-publish toggle */}
                    <div className="flex items-center justify-between py-2">
                      <div>
                        <div className="text-sm font-medium text-gray-800">Publication automatique</div>
                        <div className="text-xs text-gray-500">Publier directement sans passer en brouillon</div>
                      </div>
                      <button
                        onClick={() => patch(s.id, { auto_publish: !s.auto_publish })}
                        disabled={isSav}
                        className="transition-opacity disabled:opacity-50">
                        {s.auto_publish
                          ? <ToggleRight size={28} className="text-orange-500" />
                          : <ToggleLeft  size={28} className="text-gray-400"   />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Right panel ── */}
        <div className="col-span-2 space-y-4">

          {/* Upcoming */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Calendar size={15} className="text-orange-500" />
              Prochaines exécutions
            </h3>
            {schedules.filter(s => s.is_active).length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">Aucune planification active</p>
            ) : (
              <div className="space-y-2">
                {schedules
                  .filter(s => s.is_active)
                  .sort((a, b) => {
                    const na = nextRun(a)?.getTime() ?? Infinity;
                    const nb = nextRun(b)?.getTime() ?? Infinity;
                    return na - nb;
                  })
                  .map(s => {
                    const next = nextRun(s);
                    const meta = TYPE_META[s.content_type] || TYPE_META.blog;
                    const Icon = meta.icon;
                    if (!next) return null;
                    return (
                      <div key={s.id} className={`flex items-center gap-3 p-2.5 ${meta.bg} rounded-xl`}>
                        <div className={`w-7 h-7 rounded-lg bg-white/70 flex items-center justify-center flex-shrink-0`}>
                          <Icon size={14} className={meta.color} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-gray-800">{meta.label}</div>
                          <div className="text-[10px] text-gray-500">
                            {next.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/80 ${meta.color}`}>
                          {timeUntil(next)}
                        </span>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Recent content */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Clock size={15} className="text-orange-500" />
              Contenu récent
            </h3>
            {recentContent.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">Aucun contenu généré</p>
            ) : (
              <div className="space-y-1.5">
                {recentContent.map(c => {
                  const meta = TYPE_META[c.type] || TYPE_META.blog;
                  const Icon = meta.icon;
                  return (
                    <div key={`${c.type}-${c.id}`}
                      className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-gray-50 transition-colors group">
                      <div className={`w-6 h-6 ${meta.bg} rounded-md flex items-center justify-center flex-shrink-0 mt-0.5`}>
                        <Icon size={12} className={meta.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-800 truncate">{c.title}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-gray-400">{fmtShort(c.created_at)}</span>
                          {c.published
                            ? <span className="text-[10px] text-green-600 font-medium flex items-center gap-0.5"><CheckCircle size={9} /> Publié</span>
                            : <span className="text-[10px] text-amber-600 flex items-center gap-0.5"><AlertCircle size={9} /> Brouillon</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* How it works */}
          <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4">
            <h3 className="text-xs font-bold text-gray-800 mb-2 flex items-center gap-2">
              <Sparkles size={13} className="text-orange-500" />
              Comment ça marche
            </h3>
            <ul className="space-y-1.5 text-xs text-gray-600">
              {[
                'Génération IA selon la fréquence configurée',
                'Mots-clés pour un contenu SEO optimal',
                'Publication directe ou en brouillon',
                'Activation/désactivation par type de contenu',
                'Génération manuelle immédiate en 1 clic',
              ].map((t, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <CheckCircle size={11} className="text-orange-400 flex-shrink-0 mt-0.5" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ── Keywords modal ── */}
      {kwModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Hash size={18} className="text-orange-500" />
                <span className="font-bold text-gray-900">Mots-clés SEO</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${TYPE_META[kwModal.content_type]?.bg} ${TYPE_META[kwModal.content_type]?.color} font-medium`}>
                  {TYPE_META[kwModal.content_type]?.label}
                </span>
              </div>
              <button onClick={() => setKwModal(null)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-600">
                Entrez les mots-clés séparés par des virgules. Ils seront utilisés pour optimiser le contenu généré.
              </p>
              <div>
                <textarea
                  value={kwInput}
                  onChange={e => setKwInput(e.target.value)}
                  rows={5}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400 resize-none"
                  placeholder="assurance taxi, taxi professionnel, RC taxi, couverture taxi..."
                />
                <div className="flex items-center justify-between mt-1.5">
                  <p className="text-xs text-gray-400">
                    {kwInput.split(',').filter(k => k.trim()).length} mot(s)-clé(s)
                  </p>
                  {kwInput.split(',').filter(k => k.trim()).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {kwInput.split(',').filter(k => k.trim()).slice(0, 3).map((kw, i) => (
                        <span key={i} className="text-[10px] px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded-full">{kw.trim()}</span>
                      ))}
                      {kwInput.split(',').filter(k => k.trim()).length > 3 && (
                        <span className="text-[10px] text-gray-400">…</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={saveKeywords}
                  disabled={!!saving}
                  className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-50">
                  {saving ? 'Enregistrement…' : 'Enregistrer les mots-clés'}
                </button>
                <button onClick={() => setKwModal(null)}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-xl transition-colors">
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all
          ${toast.type === 'ok' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.type === 'ok' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
