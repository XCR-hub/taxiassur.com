import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Search, Filter, Download, Trash2, UserCheck, UserX,
  Mail, Calendar, TrendingUp, TrendingDown, RefreshCw, ChevronDown,
  CheckSquare, Square, MoreHorizontal, X, AlertTriangle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Subscriber {
  id: string;
  email: string;
  status: 'active' | 'unsubscribed' | 'bounced';
  subscribed_at: string;
  unsubscribed_at?: string;
  source?: string;
  name?: string;
  open_rate?: number;
  click_rate?: number;
}

interface Stats {
  total: number;
  active: number;
  unsubscribed: number;
  bounced: number;
  newThisMonth: number;
  growthRate: number;
}

type FilterStatus = 'all' | 'active' | 'unsubscribed' | 'bounced';
type SortField = 'subscribed_at' | 'email' | 'status';
type SortDir = 'asc' | 'desc';

interface Toast { id: string; type: 'success' | 'error' | 'info'; message: string; }
interface ConfirmState { open: boolean; title: string; body: string; onConfirm: () => void; }

function avatarColor(email: string) {
  return `hsl(${(email.charCodeAt(0) * 37 + email.charCodeAt(1) * 17) % 360}, 55%, 50%)`;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

const STATUSES: { value: FilterStatus; label: string; color: string }[] = [
  { value: 'all',           label: 'Tous',          color: 'text-gray-600'  },
  { value: 'active',        label: 'Actifs',         color: 'text-green-600' },
  { value: 'unsubscribed',  label: 'Désabonnés',     color: 'text-orange-500'},
  { value: 'bounced',       label: 'Bounced',        color: 'text-red-500'   },
];

const EmailSubscribersManager: React.FC = () => {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [stats, setStats]   = useState<Stats>({ total: 0, active: 0, unsubscribed: 0, bounced: 0, newThisMonth: 0, growthRate: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortField, setSortField] = useState<SortField>('subscribed_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirm, setConfirm] = useState<ConfirmState>({ open: false, title: '', body: '', onConfirm: () => {} });
  const [showBulkMenu, setShowBulkMenu] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  const addToast = useCallback((type: Toast['type'], message: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { id, type, message }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
  }, []);

  const askConfirm = useCallback((title: string, body: string, onConfirm: () => void) => {
    setConfirm({ open: true, title, body, onConfirm });
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [allRes, monthRes] = await Promise.all([
        supabase.from('newsletter_subscribers').select('*').order('subscribed_at', { ascending: false }),
        supabase.from('newsletter_subscribers')
          .select('id, subscribed_at')
          .eq('status', 'active')
          .gte('subscribed_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
      ]);

      const all = allRes.data || [];
      const active = all.filter(s => s.status === 'active').length;
      const unsubscribed = all.filter(s => s.status === 'unsubscribed').length;
      const bounced = all.filter(s => s.status === 'bounced').length;
      const newThisMonth = monthRes.data?.length || 0;

      const lastMonthStart = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString();
      const lastMonthEnd   = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const lastMonth = all.filter(s => s.subscribed_at >= lastMonthStart && s.subscribed_at < lastMonthEnd && s.status === 'active').length;
      const growthRate = lastMonth > 0 ? Math.round(((newThisMonth - lastMonth) / lastMonth) * 100) : 0;

      setStats({ total: all.length, active, unsubscribed, bounced, newThisMonth, growthRate });
      setSubscribers(all);
    } catch {
      addToast('error', 'Erreur lors du chargement des abonnés');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = subscribers.filter(s => {
    const matchStatus = filterStatus === 'all' || s.status === filterStatus;
    const q = search.toLowerCase();
    const matchSearch = !q || s.email.toLowerCase().includes(q) || (s.name || '').toLowerCase().includes(q);
    return matchStatus && matchSearch;
  }).sort((a, b) => {
    const va: string = a[sortField] || '';
    const vb: string = b[sortField] || '';
    return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
  });

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  }

  function toggleSelect(id: string) {
    setSelected(s => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function toggleAll() {
    if (selected.size === paged.length) setSelected(new Set());
    else setSelected(new Set(paged.map(s => s.id)));
  }

  async function unsubscribeSelected() {
    const ids = [...selected];
    askConfirm(
      'Désabonner la sélection',
      `Désabonner ${ids.length} abonné(s) ? Ils ne recevront plus les newsletters.`,
      async () => {
        try {
          const { error } = await supabase
            .from('newsletter_subscribers')
            .update({ status: 'unsubscribed', unsubscribed_at: new Date().toISOString() })
            .in('id', ids);
          if (error) throw error;
          addToast('success', `${ids.length} abonné(s) désabonnés`);
          setSelected(new Set());
          await loadData();
        } catch {
          addToast('error', 'Erreur lors du désabonnement');
        }
      }
    );
  }

  async function deleteSelected() {
    const ids = [...selected];
    askConfirm(
      'Supprimer définitivement',
      `Supprimer ${ids.length} abonné(s) ? Cette action est irréversible.`,
      async () => {
        try {
          const { error } = await supabase.from('newsletter_subscribers').delete().in('id', ids);
          if (error) throw error;
          addToast('success', `${ids.length} abonné(s) supprimés`);
          setSelected(new Set());
          await loadData();
        } catch {
          addToast('error', 'Erreur lors de la suppression');
        }
      }
    );
  }

  function exportCSV() {
    const rows = filtered.map(s =>
      [s.email, s.name || '', s.status, formatDate(s.subscribed_at), s.source || ''].join(',')
    );
    const csv = ['Email,Nom,Statut,Date abonnement,Source', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'abonnes-newsletter.csv'; a.click();
    URL.revokeObjectURL(url);
    addToast('success', `${filtered.length} abonnés exportés`);
  }

  async function toggleOne(sub: Subscriber) {
    const newStatus = sub.status === 'active' ? 'unsubscribed' : 'active';
    const update: Record<string, string> = { status: newStatus };
    if (newStatus === 'unsubscribed') update.unsubscribed_at = new Date().toISOString();
    const { error } = await supabase.from('newsletter_subscribers').update(update).eq('id', sub.id);
    if (error) { addToast('error', 'Erreur de mise à jour'); return; }
    addToast('success', newStatus === 'active' ? 'Abonné réactivé' : 'Abonné désabonné');
    await loadData();
  }

  const statCards = [
    { label: 'Total abonnés', value: stats.total,       icon: Users,      color: 'text-gray-700',   bg: 'bg-gray-50'   },
    { label: 'Actifs',        value: stats.active,      icon: UserCheck,  color: 'text-green-600',  bg: 'bg-green-50'  },
    { label: 'Désabonnés',    value: stats.unsubscribed,icon: UserX,      color: 'text-orange-500', bg: 'bg-orange-50' },
    { label: 'Ce mois',       value: stats.newThisMonth, icon: TrendingUp, color: 'text-blue-600',   bg: 'bg-blue-50',
      extra: stats.growthRate !== 0 ? (
        <span className={`text-xs font-medium flex items-center gap-0.5 ${stats.growthRate >= 0 ? 'text-green-500' : 'text-red-400'}`}>
          {stats.growthRate >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
          {stats.growthRate > 0 ? '+' : ''}{stats.growthRate}% vs mois dernier
        </span>
      ) : null,
    },
  ];

  return (
    <div className="h-full overflow-auto bg-gray-50">
      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className={`pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium text-white
            ${t.type === 'success' ? 'bg-green-600' : t.type === 'error' ? 'bg-red-600' : 'bg-blue-600'}`}>
            {t.message}
            <button onClick={() => setToasts(ts => ts.filter(x => x.id !== t.id))} className="ml-1 opacity-70 hover:opacity-100"><X size={13} /></button>
          </div>
        ))}
      </div>

      {/* Confirm modal */}
      {confirm.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 bg-orange-100 rounded-full flex items-center justify-center"><AlertTriangle size={18} className="text-orange-500" /></div>
              <h3 className="font-semibold text-gray-900">{confirm.title}</h3>
            </div>
            <p className="text-sm text-gray-600 mb-5">{confirm.body}</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirm(c => ({ ...c, open: false }))} className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">Annuler</button>
              <button onClick={() => { confirm.onConfirm(); setConfirm(c => ({ ...c, open: false })); }}
                className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 font-medium">Confirmer</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Users size={20} className="text-green-600" /> Abonnés Newsletter
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {stats.active.toLocaleString('fr-FR')} actifs sur {stats.total.toLocaleString('fr-FR')} total
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadData} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors" title="Actualiser">
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
              <Download size={14} /> Exporter CSV
            </button>
          </div>
        </div>
      </header>

      <div className="p-6 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {statCards.map(c => (
            <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 ${c.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <c.icon size={17} className={c.color} />
                </div>
                <div className="min-w-0">
                  <div className="text-2xl font-bold text-gray-900">
                    {loading ? <span className="inline-block w-10 h-6 bg-gray-100 rounded animate-pulse" /> : c.value.toLocaleString('fr-FR')}
                  </div>
                  <div className="text-xs text-gray-500 truncate">{c.label}</div>
                  {c.extra && <div className="mt-0.5">{c.extra}</div>}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters + search */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
                placeholder="Rechercher par email ou nom…"
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400"
              />
            </div>

            {/* Status tabs */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              {STATUSES.map(s => (
                <button key={s.value}
                  onClick={() => { setFilterStatus(s.value); setPage(0); }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    filterStatus === s.value ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <span className="text-xs text-gray-400 ml-auto">{filtered.length} résultat(s)</span>
          </div>
        </div>

        {/* Bulk actions */}
        {selected.size > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <span className="text-sm font-medium text-green-800">{selected.size} sélectionné(s)</span>
            <div className="flex items-center gap-2 ml-auto">
              <button onClick={unsubscribeSelected} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-orange-100 text-orange-700 hover:bg-orange-200 font-medium">
                <UserX size={13} /> Désabonner
              </button>
              <button onClick={deleteSelected} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-red-100 text-red-700 hover:bg-red-200 font-medium">
                <Trash2 size={13} /> Supprimer
              </button>
              <button onClick={() => setSelected(new Set())} className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="w-10 px-4 py-3">
                  <button onClick={toggleAll} className="text-gray-400 hover:text-gray-600">
                    {selected.size === paged.length && paged.length > 0
                      ? <CheckSquare size={15} className="text-green-600" />
                      : <Square size={15} />}
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <button onClick={() => toggleSort('email')} className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wide hover:text-gray-700">
                    Email {sortField === 'email' && <ChevronDown size={12} className={sortDir === 'asc' ? 'rotate-180' : ''} />}
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <button onClick={() => toggleSort('status')} className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wide hover:text-gray-700">
                    Statut {sortField === 'status' && <ChevronDown size={12} className={sortDir === 'asc' ? 'rotate-180' : ''} />}
                  </button>
                </th>
                <th className="px-4 py-3 text-left hidden md:table-cell">
                  <button onClick={() => toggleSort('subscribed_at')} className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wide hover:text-gray-700">
                    Abonné le {sortField === 'subscribed_at' && <ChevronDown size={12} className={sortDir === 'asc' ? 'rotate-180' : ''} />}
                  </button>
                </th>
                <th className="px-4 py-3 text-left hidden lg:table-cell text-xs font-semibold text-gray-500 uppercase tracking-wide">Source</th>
                <th className="w-16 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-4 py-3"><div className="w-4 h-4 bg-gray-100 rounded" /></td>
                  <td className="px-4 py-3"><div className="flex items-center gap-3"><div className="w-7 h-7 bg-gray-100 rounded-full" /><div className="h-3 bg-gray-100 rounded w-40" /></div></td>
                  <td className="px-4 py-3"><div className="h-5 bg-gray-100 rounded w-16" /></td>
                  <td className="px-4 py-3 hidden md:table-cell"><div className="h-3 bg-gray-100 rounded w-24" /></td>
                  <td className="px-4 py-3 hidden lg:table-cell"><div className="h-3 bg-gray-100 rounded w-16" /></td>
                  <td className="px-4 py-3" />
                </tr>
              ))}
              {!loading && paged.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <Mail size={32} className="mx-auto mb-3 text-gray-300" />
                    <p className="text-sm text-gray-500">Aucun abonné trouvé</p>
                    {search && <p className="text-xs text-gray-400 mt-1">Essayez un autre terme de recherche</p>}
                  </td>
                </tr>
              )}
              {!loading && paged.map(sub => (
                <tr key={sub.id} className={`hover:bg-gray-50 transition-colors ${selected.has(sub.id) ? 'bg-green-50/50' : ''}`}>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleSelect(sub.id)} className="text-gray-400 hover:text-green-600">
                      {selected.has(sub.id) ? <CheckSquare size={15} className="text-green-600" /> : <Square size={15} />}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ background: avatarColor(sub.email) }}>
                        {sub.email[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        {sub.name && <div className="text-xs font-medium text-gray-900 truncate">{sub.name}</div>}
                        <div className="text-xs text-gray-600 truncate">{sub.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      sub.status === 'active'       ? 'bg-green-100 text-green-700'  :
                      sub.status === 'unsubscribed' ? 'bg-orange-100 text-orange-600':
                                                      'bg-red-100 text-red-600'
                    }`}>
                      {sub.status === 'active' ? <UserCheck size={10} /> : <UserX size={10} />}
                      {sub.status === 'active' ? 'Actif' : sub.status === 'unsubscribed' ? 'Désabonné' : 'Bounced'}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Calendar size={11} />
                      {formatDate(sub.subscribed_at)}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {sub.source ? (
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{sub.source}</span>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => toggleOne(sub)}
                        title={sub.status === 'active' ? 'Désabonner' : 'Réactiver'}
                        className={`p-1.5 rounded-lg transition-colors ${
                          sub.status === 'active'
                            ? 'text-orange-400 hover:bg-orange-50 hover:text-orange-600'
                            : 'text-green-400 hover:bg-green-50 hover:text-green-600'
                        }`}
                      >
                        {sub.status === 'active' ? <UserX size={14} /> : <UserCheck size={14} />}
                      </button>
                      <button
                        onClick={() => askConfirm('Supprimer cet abonné', `Supprimer ${sub.email} définitivement ?`, async () => {
                          const { error } = await supabase.from('newsletter_subscribers').delete().eq('id', sub.id);
                          if (error) { addToast('error', 'Erreur de suppression'); return; }
                          addToast('success', 'Abonné supprimé');
                          await loadData();
                        })}
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="border-t border-gray-100 px-4 py-3 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                Page {page + 1} / {totalPages} — {filtered.length} résultat(s)
              </span>
              <div className="flex items-center gap-1">
                <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                  Précédent
                </button>
                <button disabled={page === totalPages - 1} onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                  Suivant
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailSubscribersManager;
