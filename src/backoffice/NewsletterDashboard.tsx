import { useState, useEffect, useCallback, useRef } from 'react';
import { internalFunctionHeaders } from '@/lib/internal-function-auth';
import { supabase } from '../lib/supabase';
import { Send, Users, Mail, Eye, MousePointer, Download, BarChart3, CheckCircle, Clock, Plus, Search, RefreshCw, TrendingUp, Filter, ChevronRight, X, AlertTriangle, FileText, Zap, ArrowUp, Inbox, Sparkles, CreditCard as Edit3, Radio } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Campaign {
  id: string;
  name: string;
  subject: string;
  status: string;
  scheduled_at: string;
  sent_at: string | null;
  total_subscribers: number;
  total_sent: number;
  total_opened: number;
  total_clicked: number;
  created_at: string;
  content_html?: string;
}

interface Subscriber {
  id: string;
  email: string;
  first_name: string | null;
  status: string;
  engagement_score: number;
  total_opens: number;
  total_clicks: number;
  subscribed_at: string;
  categories: string[];
}

type FilterStatus = 'all' | 'active' | 'unsubscribed';
type TabType = 'campaigns' | 'subscribers';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ConfirmState {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, { label: string; dot: string; cls: string }> = {
    sent:      { label: 'Envoyée',   dot: 'bg-emerald-500', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    sending:   { label: 'En cours',  dot: 'bg-blue-500 animate-pulse', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    draft:     { label: 'Brouillon', dot: 'bg-gray-400', cls: 'bg-gray-50 text-gray-600 border-gray-200' },
    scheduled: { label: 'Planifiée', dot: 'bg-amber-500', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  };
  const item = map[status] || { label: status, dot: 'bg-gray-400', cls: 'bg-gray-50 text-gray-500 border-gray-200' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border ${item.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${item.dot}`} />
      {item.label}
    </span>
  );
};

const PerfBar: React.FC<{ value: number; max?: number; color: string; label: string }> = ({
  value, max = 100, color, label,
}) => (
  <div className="flex items-center gap-2 min-w-0">
    <span className="text-xs text-gray-400 w-20 shrink-0">{label}</span>
    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full ${color} transition-all duration-500`}
        style={{ width: `${Math.min((value / max) * 100, 100)}%` }}
      />
    </div>
    <span className="text-xs font-semibold text-gray-700 w-10 text-right shrink-0">{value.toFixed(1)}%</span>
  </div>
);

const EngagementBadge: React.FC<{ score: number }> = ({ score }) => {
  const cfg =
    score >= 70 ? { label: 'Champion', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' } :
    score >= 40 ? { label: 'Actif',    cls: 'bg-amber-50  text-amber-700  border-amber-200'  } :
                  { label: 'Froid',    cls: 'bg-red-50    text-red-600    border-red-200'    };
  return (
    <span className={`text-xs font-medium px-1.5 py-0.5 rounded border ${cfg.cls}`}>{cfg.label}</span>
  );
};

// ─── Toast helper ─────────────────────────────────────────────────────────────

let _toastId = 0;

// ─── Main component ───────────────────────────────────────────────────────────

export default function NewsletterDashboard() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [stats, setStats] = useState({
    activeSubscribers: 0, totalCampaigns: 0, sentCampaigns: 0,
    avgOpenRate: 0, avgClickRate: 0, totalSent: 0, newThisMonth: 0,
  });
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('campaigns');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirm, setConfirm] = useState<ConfirmState>({ open: false, title: '', body: '', confirmLabel: '', onConfirm: () => {} });
  const [previewCampaign, setPreviewCampaign] = useState<Campaign | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [compose, setCompose] = useState({ name: '', subject: '', mode: 'auto' as 'auto' | 'html', customHtml: '' });

  const toastTimer = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // ── Toasts ──
  const addToast = useCallback((type: Toast['type'], message: string) => {
    const id = String(++_toastId);
    setToasts(prev => [...prev, { id, type, message }]);
    toastTimer.current[id] = setTimeout(() => removeToast(id), 4000);
  }, []);

  const removeToast = (id: string) => {
    clearTimeout(toastTimer.current[id]);
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // ── Confirm dialog ──
  const askConfirm = (title: string, body: string, confirmLabel: string, onConfirm: () => void) =>
    setConfirm({ open: true, title, body, confirmLabel, onConfirm });

  const closeConfirm = () => setConfirm(p => ({ ...p, open: false }));

  // ── Data loading ──
  const loadData = useCallback(async () => {
    try {
      const [campaignsRes, allSubsRes, activeSubsRes] = await Promise.all([
        supabase.from('newsletter_campaigns').select('*').order('created_at', { ascending: false }).limit(30),
        (() => {
          let q = supabase.from('newsletter_subscribers').select('*').order('subscribed_at', { ascending: false }).limit(100);
          if (filterStatus !== 'all') q = q.eq('status', filterStatus);
          return q;
        })(),
        supabase.from('newsletter_subscribers').select('id, subscribed_at').eq('status', 'active'),
      ]);

      if (campaignsRes.data) setCampaigns(campaignsRes.data);

      if (allSubsRes.data) {
        const filtered = searchQuery
          ? allSubsRes.data.filter(s =>
              s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
              (s.first_name || '').toLowerCase().includes(searchQuery.toLowerCase())
            )
          : allSubsRes.data;
        setSubscribers(filtered);
      }

      const sentCampaigns = campaignsRes.data?.filter(c => c.status === 'sent') || [];
      const totalOpens  = sentCampaigns.reduce((sum, c) => sum + (c.total_opened || 0), 0);
      const totalClicks = sentCampaigns.reduce((sum, c) => sum + (c.total_clicked || 0), 0);
      const totalSent   = sentCampaigns.reduce((sum, c) => sum + (c.total_sent  || 0), 0);

      const now = new Date();
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const newThisMonth = activeSubsRes.data?.filter(s => s.subscribed_at >= firstOfMonth).length || 0;

      setStats({
        activeSubscribers: activeSubsRes.data?.length || 0,
        totalCampaigns:    campaignsRes.data?.length || 0,
        sentCampaigns:     sentCampaigns.length,
        avgOpenRate:  totalSent > 0   ? (totalOpens / totalSent) * 100   : 0,
        avgClickRate: totalOpens > 0  ? (totalClicks / totalOpens) * 100 : 0,
        totalSent,
        newThisMonth,
      });
    } catch {
      addToast('error', 'Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, searchQuery, addToast]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  // ── Create auto campaign ──
  async function createAutoCampaign() {
    setCreating(true);
    try {
      const { data: articles } = await supabase
        .from('blog_posts')
        .select('id, title, excerpt, slug, category, featured_image')
        .eq('published', true)
        .order('created_at', { ascending: false })
        .limit(5);

      if (!articles || articles.length === 0) {
        addToast('error', 'Aucun article récent trouvé');
        return;
      }

      const htmlContent = buildEmailHtml(articles, compose.subject || `Newsletter TaxiAssur – ${new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`);

      const { error } = await supabase.from('newsletter_campaigns').insert({
        name:         compose.name || `Newsletter – ${new Date().toLocaleDateString('fr-FR')}`,
        subject:      compose.subject || `Nouveaux articles TaxiAssur – ${new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`,
        content_html: htmlContent,
        status:       'draft',
        scheduled_at: new Date().toISOString(),
      });

      if (error) throw error;
      addToast('success', `Campagne créée avec ${articles.length} articles`);
      setShowCompose(false);
      setCompose({ name: '', subject: '', mode: 'auto', customHtml: '' });
      loadData();
    } catch {
      addToast('error', 'Erreur lors de la création de la campagne');
    } finally {
      setCreating(false);
    }
  }

  async function createCustomCampaign() {
    if (!compose.name || !compose.subject || !compose.customHtml) {
      addToast('error', 'Nom, sujet et contenu HTML sont requis');
      return;
    }
    setCreating(true);
    try {
      const { error } = await supabase.from('newsletter_campaigns').insert({
        name:         compose.name,
        subject:      compose.subject,
        content_html: compose.customHtml,
        status:       'draft',
        scheduled_at: new Date().toISOString(),
      });
      if (error) throw error;
      addToast('success', 'Campagne créée en brouillon');
      setShowCompose(false);
      setCompose({ name: '', subject: '', mode: 'auto', customHtml: '' });
      loadData();
    } catch {
      addToast('error', 'Erreur lors de la création');
    } finally {
      setCreating(false);
    }
  }

  // ── Send campaign ──
  function confirmSend(campaign: Campaign) {
    askConfirm(
      'Envoyer cette campagne',
      `Cette campagne sera envoyée à tous les abonnés actifs (${stats.activeSubscribers} abonnés). Cette action est irréversible.`,
      'Envoyer',
      () => doSend(campaign.id),
    );
  }

  async function doSend(campaignId: string) {
    closeConfirm();
    setSending(campaignId);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-newsletter-campaign`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: (await internalFunctionHeaders()).Authorization },
          body: JSON.stringify({ campaign_id: campaignId }),
        }
      );
      const result = await res.json();
      if (result.success) {
        addToast('success', `Campagne envoyée à ${result.sent_count} abonnés`);
        loadData();
      } else {
        addToast('error', result.error || 'Erreur lors de l\'envoi');
      }
    } catch {
      addToast('error', 'Erreur de connexion lors de l\'envoi');
    } finally {
      setSending(null);
    }
  }

  // ── Export ──
  async function exportSubscribers() {
    try {
      const { data } = await supabase.from('newsletter_subscribers').select('*').eq('status', 'active');
      if (!data) return;
      const csv = [
        'Email,Prénom,Score,Ouvertures,Clics,Date inscription',
        ...data.map(s => [
          s.email, s.first_name || '', s.engagement_score || 50,
          s.total_opens || 0, s.total_clicks || 0,
          new Date(s.subscribed_at).toLocaleDateString('fr-FR'),
        ].join(',')),
      ].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      a.download = `abonnes-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      addToast('success', `${data.length} abonnés exportés`);
    } catch {
      addToast('error', 'Erreur lors de l\'export');
    }
  }

  // ── Build email HTML ──
  function buildEmailHtml(articles: any[], title: string) {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${title}</title></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;background:#f4f4f5;">
<table role="presentation" style="width:100%;border-collapse:collapse;"><tr><td style="padding:32px 16px;">
<table role="presentation" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
<tr><td style="padding:40px 40px 28px;background:linear-gradient(135deg,#064e3b,#059669);border-radius:16px 16px 0 0;">
<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
<div style="width:40px;height:40px;background:rgba(255,255,255,0.2);border-radius:10px;display:flex;align-items:center;justify-content:center;">
<span style="color:#fff;font-size:20px;">✉</span></div>
<span style="color:#ffffff;font-weight:700;font-size:16px;">TaxiAssur</span></div>
<h1 style="margin:0 0 8px;color:#ffffff;font-size:26px;font-weight:800;line-height:1.3;">${title}</h1>
<p style="margin:0;color:#a7f3d0;font-size:14px;">Vos actualités assurance taxi du mois</p>
</td></tr>
<tr><td style="padding:36px 40px;">
<p style="margin:0 0 6px;color:#111827;font-size:15px;font-weight:600;">Bonjour,</p>
<p style="margin:0 0 28px;color:#6b7280;font-size:14px;line-height:1.7;">Découvrez les dernières actualités et conseils pour les professionnels du taxi :</p>
${articles.map((a, i) => `
<table role="presentation" style="width:100%;margin-bottom:${i < articles.length - 1 ? '24px' : '0'};border:1px solid #f3f4f6;border-radius:12px;overflow:hidden;">
<tr><td style="padding:20px;">
${a.featured_image ? `<img src="${a.featured_image}" alt="${a.title}" style="width:100%;height:160px;object-fit:cover;border-radius:8px;margin-bottom:16px;display:block;" />` : ''}
<p style="margin:0 0 6px;color:#059669;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">${a.category || 'Actualité'}</p>
<h2 style="margin:0 0 10px;color:#111827;font-size:17px;font-weight:700;line-height:1.4;">${a.title}</h2>
<p style="margin:0 0 16px;color:#6b7280;font-size:13px;line-height:1.7;">${a.excerpt || ''}</p>
<a href="https://taxiassur.com/blog/${a.slug}" style="display:inline-block;padding:10px 22px;background:#059669;color:#ffffff;text-decoration:none;border-radius:8px;font-size:13px;font-weight:600;">Lire l'article →</a>
</td></tr></table>`).join('')}
</td></tr>
<tr><td style="padding:24px 40px;background:#f9fafb;border-top:1px solid #f3f4f6;border-radius:0 0 16px 16px;">
<table role="presentation" style="width:100%;"><tr>
<td style="text-align:center;">
<p style="margin:0 0 8px;color:#9ca3af;font-size:12px;">© 2026 TaxiAssur · Assurance professionnelle pour taxis</p>
<a href="https://taxiassur.com/newsletter/unsubscribe" style="color:#6b7280;font-size:12px;text-decoration:underline;">Se désabonner</a>
</td></tr></table></td></tr>
</table></td></tr></table>
</body></html>`;
  }

  // ── Derived stats ──
  const openRateColor    = stats.avgOpenRate    >= 25 ? 'bg-emerald-500' : stats.avgOpenRate    >= 15 ? 'bg-amber-500' : 'bg-red-400';
  const clickRateColor   = stats.avgClickRate   >= 5  ? 'bg-emerald-500' : stats.avgClickRate   >= 2  ? 'bg-amber-500' : 'bg-red-400';

  const kpiCards = [
    { label: 'Abonnés actifs',  value: stats.activeSubscribers, icon: Users,       color: 'text-blue-600',    bg: 'bg-blue-50',    trend: stats.newThisMonth > 0 ? `+${stats.newThisMonth} ce mois` : null },
    { label: 'Campagnes',       value: stats.totalCampaigns,    icon: Mail,        color: 'text-gray-600',    bg: 'bg-gray-100',   trend: null },
    { label: 'Envoyées',        value: stats.sentCampaigns,     icon: Send,        color: 'text-emerald-600', bg: 'bg-emerald-50', trend: null },
    { label: 'Taux ouverture',  value: `${stats.avgOpenRate.toFixed(1)}%`,  icon: Eye,         color: 'text-orange-600',  bg: 'bg-orange-50',  trend: stats.avgOpenRate >= 25 ? 'Excellent' : stats.avgOpenRate >= 15 ? 'Moyen' : 'À améliorer' },
    { label: 'Taux de clic',    value: `${stats.avgClickRate.toFixed(1)}%`, icon: MousePointer,color: 'text-sky-600',     bg: 'bg-sky-50',     trend: null },
    { label: 'Emails envoyés',  value: stats.totalSent,         icon: BarChart3,   color: 'text-gray-600',    bg: 'bg-gray-100',   trend: null },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">

      {/* ── Toast container ── */}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-3 pl-4 pr-3 py-3 rounded-xl shadow-lg text-sm font-medium border transition-all ${
              t.type === 'success' ? 'bg-white border-emerald-200 text-emerald-800' :
              t.type === 'error'   ? 'bg-white border-red-200    text-red-800'   :
              'bg-white border-blue-200 text-blue-800'
            }`}
          >
            {t.type === 'success' && <CheckCircle size={16} className="text-emerald-500 shrink-0" />}
            {t.type === 'error'   && <AlertTriangle size={16} className="text-red-500 shrink-0" />}
            {t.type === 'info'    && <Radio size={16} className="text-blue-500 shrink-0" />}
            <span>{t.message}</span>
            <button onClick={() => removeToast(t.id)} className="ml-1 text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* ── Confirm modal ── */}
      {confirm.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center mb-4">
              <AlertTriangle size={20} className="text-orange-600" />
            </div>
            <h3 className="font-bold text-gray-900 mb-1.5">{confirm.title}</h3>
            <p className="text-sm text-gray-500 mb-5 leading-relaxed">{confirm.body}</p>
            <div className="flex gap-2 justify-end">
              <button onClick={closeConfirm} className="px-4 py-2 rounded-lg text-sm text-gray-600 border border-gray-200 hover:bg-gray-50 transition">
                Annuler
              </button>
              <button
                onClick={() => { confirm.onConfirm(); closeConfirm(); }}
                className="px-4 py-2 rounded-lg text-sm text-white bg-emerald-600 hover:bg-emerald-700 font-medium transition"
              >
                {confirm.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Preview modal ── */}
      {previewCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
              <div>
                <p className="font-semibold text-gray-900 text-sm">{previewCampaign.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{previewCampaign.subject}</p>
              </div>
              <button onClick={() => setPreviewCampaign(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-1">
              <iframe
                srcDoc={previewCampaign.content_html || '<p style="padding:20px;color:#9ca3af">Pas de contenu HTML</p>'}
                className="w-full h-[600px] rounded-lg border-0"
                title="Aperçu de la campagne"
                sandbox="allow-same-origin"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Newsletter</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {stats.activeSubscribers} abonnés actifs
            {stats.newThisMonth > 0 && (
              <span className="ml-2 inline-flex items-center gap-0.5 text-emerald-600 text-xs font-medium">
                <ArrowUp size={11} />+{stats.newThisMonth} ce mois
              </span>
            )}
            {' · '}{stats.sentCampaigns} campagnes envoyées
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={exportSubscribers}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <Download size={14} />
            Export
          </button>
          <button
            onClick={() => { setShowCompose(!showCompose); setActiveTab('campaigns'); }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-white bg-emerald-600 hover:bg-emerald-700 font-medium transition-colors shadow-sm"
          >
            {showCompose ? <X size={14} /> : <Plus size={14} />}
            {showCompose ? 'Fermer' : 'Nouvelle campagne'}
          </button>
        </div>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {kpiCards.map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-xl border border-gray-100 p-3.5 shadow-sm">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center mb-2.5 ${card.bg}`}>
                <Icon size={14} className={card.color} />
              </div>
              <div className="text-xl font-bold text-gray-900 leading-none mb-1">{card.value}</div>
              <div className="text-xs text-gray-500 leading-tight">{card.label}</div>
              {card.trend && (
                <div className={`text-xs font-medium mt-1 ${
                  card.trend === 'Excellent' ? 'text-emerald-600' :
                  card.trend === 'À améliorer' ? 'text-red-500' :
                  card.trend.startsWith('+') ? 'text-emerald-600' : 'text-amber-600'
                }`}>
                  {card.trend}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Performance bars ── */}
      {stats.sentCampaigns > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Performance globale</p>
          <div className="space-y-2">
            <PerfBar value={stats.avgOpenRate}  max={60}  color={openRateColor}  label="Taux ouverture" />
            <PerfBar value={stats.avgClickRate} max={20}  color={clickRateColor} label="Taux de clic"   />
          </div>
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-50 text-xs text-gray-400">
            <span>Référence secteur : ouverture 28% · clic 4%</span>
          </div>
        </div>
      )}

      {/* ── Compose panel ── */}
      {showCompose && (
        <div className="bg-white rounded-xl border border-emerald-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-emerald-50 to-green-50 border-b border-emerald-100">
            <div className="flex items-center gap-2">
              <Edit3 size={15} className="text-emerald-600" />
              <span className="font-semibold text-emerald-800 text-sm">Composer une campagne</span>
            </div>
            <div className="flex items-center gap-1 bg-white rounded-lg p-0.5 border border-emerald-200">
              {(['auto', 'html'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setCompose(p => ({ ...p, mode }))}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    compose.mode === mode ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  {mode === 'auto' ? (
                    <span className="flex items-center gap-1.5"><Sparkles size={11} />Auto (articles)</span>
                  ) : (
                    <span className="flex items-center gap-1.5"><FileText size={11} />HTML personnalisé</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Nom de la campagne *</label>
                <input
                  type="text"
                  value={compose.name}
                  onChange={e => setCompose(p => ({ ...p, name: e.target.value }))}
                  placeholder={`Newsletter – ${new Date().toLocaleDateString('fr-FR')}`}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Sujet de l'email *</label>
                <input
                  type="text"
                  value={compose.subject}
                  onChange={e => setCompose(p => ({ ...p, subject: e.target.value }))}
                  placeholder={`Actualités TaxiAssur – ${new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                />
              </div>
            </div>

            {compose.mode === 'html' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Contenu HTML *</label>
                <textarea
                  value={compose.customHtml}
                  onChange={e => setCompose(p => ({ ...p, customHtml: e.target.value }))}
                  placeholder="<!DOCTYPE html><html>..."
                  rows={8}
                  className="w-full px-3 py-2 text-xs font-mono border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition resize-none"
                />
              </div>
            )}

            {compose.mode === 'auto' && (
              <div className="flex items-center gap-2.5 p-3 bg-blue-50 rounded-lg border border-blue-100 text-xs text-blue-700">
                <Zap size={13} className="text-blue-500 shrink-0" />
                L'email sera généré automatiquement à partir des 5 derniers articles publiés avec un template HTML responsive.
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-gray-400 flex items-center gap-1.5">
                <Users size={12} />
                Sera envoyé à <strong className="text-gray-600">{stats.activeSubscribers}</strong> abonnés actifs
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setShowCompose(false); setCompose({ name: '', subject: '', mode: 'auto', customHtml: '' }); }}
                  className="px-4 py-2 rounded-lg text-sm text-gray-600 border border-gray-200 hover:bg-gray-50 transition"
                >
                  Annuler
                </button>
                <button
                  onClick={compose.mode === 'auto' ? createAutoCampaign : createCustomCampaign}
                  disabled={creating}
                  className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50 shadow-sm"
                >
                  {creating ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
                  Créer en brouillon
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Main tabs ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-100">
          {(['campaigns', 'subscribers'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab === 'campaigns' ? <Send size={14} /> : <Users size={14} />}
              {tab === 'campaigns'
                ? `Campagnes (${campaigns.length})`
                : `Abonnés (${stats.activeSubscribers})`}
            </button>
          ))}
          <div className="flex-1" />
          <button
            onClick={loadData}
            className="px-4 text-gray-400 hover:text-gray-600 transition-colors"
            title="Actualiser"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* ─ Campaigns tab ─ */}
        {activeTab === 'campaigns' && (
          loading ? (
            <div className="p-6 space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse flex gap-4">
                  <div className="h-12 flex-1 bg-gray-100 rounded-lg" />
                </div>
              ))}
            </div>
          ) : campaigns.length === 0 ? (
            <div className="py-16 text-center">
              <Inbox size={40} className="text-gray-200 mx-auto mb-4" />
              <p className="text-sm text-gray-400 mb-3">Aucune campagne créée</p>
              <button
                onClick={() => setShowCompose(true)}
                className="inline-flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
              >
                <Plus size={14} />
                Créer ma première campagne
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {campaigns.map(c => {
                const openRate  = c.total_sent > 0 ? (c.total_opened / c.total_sent) * 100 : 0;
                const clickRate = c.total_opened > 0 ? (c.total_clicked / c.total_opened) * 100 : 0;
                const isSending = sending === c.id;
                return (
                  <div key={c.id} className="px-5 py-4 hover:bg-gray-50/70 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="font-semibold text-gray-900 truncate text-sm">{c.name}</span>
                          <StatusBadge status={c.status} />
                        </div>
                        <p className="text-xs text-gray-500 truncate mb-2.5">{c.subject}</p>
                        {c.total_sent > 0 ? (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-6 text-xs text-gray-500 mb-2">
                              <span className="flex items-center gap-1.5 shrink-0">
                                <Send size={10} className="text-gray-400" />
                                <strong className="text-gray-700">{c.total_sent.toLocaleString()}</strong>
                              </span>
                              <span className="flex items-center gap-1.5 shrink-0 text-blue-600">
                                <Eye size={10} />
                                <strong>{openRate.toFixed(1)}%</strong>
                              </span>
                              <span className="flex items-center gap-1.5 shrink-0 text-orange-600">
                                <MousePointer size={10} />
                                <strong>{c.total_clicked}</strong>
                              </span>
                            </div>
                            <div className="max-w-xs space-y-1">
                              <PerfBar value={openRate}  max={60}  color="bg-blue-400"   label="Ouvertures" />
                              <PerfBar value={clickRate} max={20}  color="bg-orange-400" label="Clics"      />
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 italic">Pas encore envoyée</p>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className="text-xs text-gray-400">
                          {new Date(c.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {c.content_html && (
                            <button
                              onClick={() => setPreviewCampaign(c)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-gray-600 border border-gray-200 hover:bg-gray-50 transition"
                            >
                              <Eye size={11} />
                              Aperçu
                            </button>
                          )}
                          {c.status === 'draft' && (
                            <button
                              onClick={() => confirmSend(c)}
                              disabled={isSending || !!sending}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
                            >
                              {isSending
                                ? <RefreshCw size={11} className="animate-spin" />
                                : <Send size={11} />}
                              {isSending ? 'Envoi…' : 'Envoyer'}
                            </button>
                          )}
                          {c.status === 'sent' && (
                            <span className="flex items-center gap-1 text-xs text-emerald-600">
                              <CheckCircle size={11} />
                              Envoyée
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* ─ Subscribers tab ─ */}
        {activeTab === 'subscribers' && (
          <>
            <div className="px-5 py-3 border-b border-gray-50 flex items-center gap-3">
              <div className="relative flex-1 max-w-xs">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher email ou prénom…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-4 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                />
              </div>
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
                <Filter size={11} className="text-gray-400 ml-1.5" />
                {(['active', 'all', 'unsubscribed'] as FilterStatus[]).map(s => (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      filterStatus === s ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {s === 'active' ? 'Actifs' : s === 'all' ? 'Tous' : 'Désabonnés'}
                  </button>
                ))}
              </div>
              <span className="text-xs text-gray-400 ml-auto shrink-0">{subscribers.length} résultat(s)</span>
            </div>

            {loading ? (
              <div className="p-6 space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse flex gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-full" />
                    <div className="flex-1 h-8 bg-gray-100 rounded-lg" />
                  </div>
                ))}
              </div>
            ) : subscribers.length === 0 ? (
              <div className="py-12 text-center">
                <Users size={36} className="text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-400">Aucun abonné trouvé</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50 max-h-[520px] overflow-y-auto">
                {subscribers.map(sub => (
                  <div key={sub.id} className="px-5 py-3 hover:bg-gray-50/70 transition-colors">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ background: `hsl(${(sub.email.charCodeAt(0) * 37) % 360}, 60%, 52%)` }}
                      >
                        {(sub.first_name || sub.email)[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {sub.first_name || sub.email.split('@')[0]}
                          </span>
                          <EngagementBadge score={sub.engagement_score || 50} />
                        </div>
                        <p className="text-xs text-gray-400 truncate">{sub.email}</p>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Eye size={10} className="text-gray-400" />
                            {sub.total_opens || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <MousePointer size={10} className="text-gray-400" />
                            {sub.total_clicks || 0}
                          </span>
                        </div>
                        <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              (sub.engagement_score || 50) >= 70 ? 'bg-emerald-500' :
                              (sub.engagement_score || 50) >= 40 ? 'bg-amber-500' : 'bg-red-400'
                            }`}
                            style={{ width: `${Math.min(sub.engagement_score || 50, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400 w-16 text-right">
                          {new Date(sub.subscribed_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Best practices ── */}
      <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-100 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <TrendingUp size={15} className="text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-800 leading-relaxed">
            <strong className="font-semibold">Bonnes pratiques :</strong> Envoyez le mardi ou jeudi entre 9h–11h.
            Personnalisez le sujet avec le prénom (+26% d'ouvertures). Segmentez par score d\'engagement pour des messages ciblés.
            Un score &gt; 70 = ambassadeur, 40–70 = actif, &lt; 40 = à relancer.
          </div>
        </div>
      </div>
    </div>
  );
}
