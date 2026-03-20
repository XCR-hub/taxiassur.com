import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  Send,
  Users,
  Mail,
  Eye,
  MousePointer,
  Download,
  BarChart3,
  CheckCircle,
  Clock,
  Plus,
  Search,
  RefreshCw,
  TrendingUp,
  Filter,
  ChevronRight,
} from 'lucide-react';

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

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
    sent: { label: 'Envoyée', icon: <CheckCircle size={10} />, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    sending: { label: 'En cours', icon: <RefreshCw size={10} className="animate-spin" />, cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    draft: { label: 'Brouillon', icon: <Clock size={10} />, cls: 'bg-gray-50 text-gray-600 border-gray-200' },
    scheduled: { label: 'Planifiée', icon: <Clock size={10} />, cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  };
  const item = map[status] || { label: status, icon: null, cls: 'bg-gray-50 text-gray-500 border-gray-200' };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${item.cls}`}>
      {item.icon}
      {item.label}
    </span>
  );
};

const EngagementBar: React.FC<{ score: number }> = ({ score }) => {
  const color = score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-500' : 'bg-red-400';
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(score, 100)}%` }} />
      </div>
      <span className={`text-xs font-semibold ${score >= 70 ? 'text-emerald-600' : score >= 40 ? 'text-amber-600' : 'text-red-500'}`}>
        {score}
      </span>
    </div>
  );
};

export default function NewsletterDashboard() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [stats, setStats] = useState({
    activeSubscribers: 0,
    totalCampaigns: 0,
    sentCampaigns: 0,
    avgOpenRate: 0,
    avgClickRate: 0,
    totalSent: 0,
  });
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'campaigns' | 'subscribers'>('campaigns');

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [filterStatus]);

  async function loadData() {
    try {
      const [campaignsRes, subscribersRes, activeRes] = await Promise.all([
        supabase
          .from('newsletter_campaigns')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('newsletter_subscribers')
          .select('*')
          .eq('status', filterStatus === 'all' ? '' : filterStatus)
          .order('subscribed_at', { ascending: false })
          .limit(50),
        supabase.from('newsletter_subscribers').select('status').eq('status', 'active'),
      ]);

      if (campaignsRes.data) setCampaigns(campaignsRes.data);
      if (subscribersRes.data) {
        const filtered = searchQuery
          ? subscribersRes.data.filter(
              (s) =>
                s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.first_name?.toLowerCase().includes(searchQuery.toLowerCase())
            )
          : subscribersRes.data;
        setSubscribers(filtered);
      }

      const sentCampaigns = campaignsRes.data?.filter((c) => c.status === 'sent') || [];
      const totalOpens = sentCampaigns.reduce((sum, c) => sum + (c.total_opened || 0), 0);
      const totalClicks = sentCampaigns.reduce((sum, c) => sum + (c.total_clicked || 0), 0);
      const totalSent = sentCampaigns.reduce((sum, c) => sum + (c.total_sent || 0), 0);

      setStats({
        activeSubscribers: activeRes.data?.length || 0,
        totalCampaigns: campaignsRes.data?.length || 0,
        sentCampaigns: sentCampaigns.length,
        avgOpenRate: totalSent > 0 ? (totalOpens / totalSent) * 100 : 0,
        avgClickRate: totalOpens > 0 ? (totalClicks / totalOpens) * 100 : 0,
        totalSent,
      });
    } catch (error) {
      console.error('Erreur chargement:', error);
    } finally {
      setLoading(false);
    }
  }

  async function createAutoCampaign() {
    if (!confirm('Créer une campagne automatique avec les derniers articles ?')) return;
    setCreating(true);
    try {
      const { data: articles } = await supabase
        .from('blog_posts')
        .select('id, title, excerpt, slug, category, featured_image')
        .eq('published', true)
        .order('created_at', { ascending: false })
        .limit(5);

      if (!articles || articles.length === 0) {
        alert('Aucun article récent trouvé');
        return;
      }

      const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f9fafb;">
<table role="presentation" style="width:100%;border-collapse:collapse;">
<tr><td style="padding:40px 20px;">
<table role="presentation" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
<tr><td style="padding:36px 40px 24px;background:linear-gradient(135deg,#059669,#10b981);border-radius:12px 12px 0 0;">
<h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Newsletter TaxiAssur</h1>
<p style="margin:8px 0 0;color:#d1fae5;font-size:14px;">Vos actualités assurance taxi</p>
</td></tr>
<tr><td style="padding:32px 40px;">
<p style="margin:0 0 24px;color:#374151;font-size:15px;">Bonjour,</p>
<p style="margin:0 0 28px;color:#6b7280;font-size:14px;">Découvrez nos derniers articles :</p>
${articles.map((a) => `
<table role="presentation" style="width:100%;margin-bottom:28px;border:1px solid #f3f4f6;border-radius:8px;overflow:hidden;">
<tr><td style="padding:20px;">
${a.featured_image ? `<img src="${a.featured_image}" alt="${a.title}" style="width:100%;height:180px;object-fit:cover;border-radius:6px;margin-bottom:14px;" />` : ''}
<h2 style="margin:0 0 8px;color:#111827;font-size:18px;font-weight:700;">${a.title}</h2>
<p style="margin:0 0 14px;color:#6b7280;font-size:13px;line-height:1.6;">${a.excerpt || ''}</p>
<a href="https://taxiassur.com/blog/${a.slug}" style="display:inline-block;padding:10px 20px;background:#059669;color:#ffffff;text-decoration:none;border-radius:6px;font-size:13px;font-weight:600;">Lire l'article</a>
</td></tr></table>`).join('')}
</td></tr>
<tr><td style="padding:20px 40px;background:#f9fafb;border-radius:0 0 12px 12px;text-align:center;">
<p style="margin:0 0 8px;color:#9ca3af;font-size:12px;">© 2026 TaxiAssur. Tous droits réservés.</p>
<a href="https://taxiassur.com/newsletter/unsubscribe" style="color:#059669;font-size:12px;">Se désabonner</a>
</td></tr>
</table></td></tr></table></body></html>`;

      const { error } = await supabase.from('newsletter_campaigns').insert({
        name: `Newsletter - ${new Date().toLocaleDateString('fr-FR')}`,
        subject: `Nouveaux articles TaxiAssur - ${new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`,
        content_html: htmlContent,
        status: 'draft',
        scheduled_at: new Date().toISOString(),
      });

      if (error) throw error;
      alert(`Campagne créée avec ${articles.length} articles !`);
      loadData();
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la création');
    } finally {
      setCreating(false);
    }
  }

  async function sendCampaign(campaignId: string) {
    if (!confirm('Envoyer cette campagne à tous les abonnés actifs ?')) return;
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-newsletter-campaign`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
          body: JSON.stringify({ campaign_id: campaignId }),
        }
      );
      const result = await response.json();
      if (result.success) {
        alert(`Campagne envoyée à ${result.sent_count} abonnés !`);
        loadData();
      } else {
        alert('Erreur: ' + result.error);
      }
    } catch {
      alert('Erreur lors de l\'envoi');
    }
  }

  async function exportSubscribers() {
    try {
      const { data } = await supabase.from('newsletter_subscribers').select('*').eq('status', 'active');
      if (!data) return;
      const csv = [
        'Email,Prénom,Score engagement,Ouvertures,Clics,Date inscription',
        ...data.map((s) =>
          [s.email, s.first_name || '', s.engagement_score || 50, s.total_opens || 0, s.total_clicks || 0,
            new Date(s.subscribed_at).toLocaleDateString('fr-FR')].join(',')
        ),
      ].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `abonnes-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } catch {
      alert('Erreur export');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw size={24} className="animate-spin text-green-500" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Newsletter</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {stats.activeSubscribers} abonnés actifs · {stats.sentCampaigns} campagnes envoyées
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportSubscribers}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <Download size={14} />
            Export CSV
          </button>
          <button
            onClick={createAutoCampaign}
            disabled={creating}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-colors font-medium"
          >
            {creating ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
            Nouvelle campagne
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {[
          { label: 'Abonnés actifs', value: stats.activeSubscribers, icon: <Users size={14} />, color: 'text-blue-600 bg-blue-50' },
          { label: 'Campagnes', value: stats.totalCampaigns, icon: <Mail size={14} />, color: 'text-gray-600 bg-gray-100' },
          { label: 'Envoyées', value: stats.sentCampaigns, icon: <Send size={14} />, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Taux ouverture', value: `${stats.avgOpenRate.toFixed(1)}%`, icon: <Eye size={14} />, color: 'text-orange-600 bg-orange-50' },
          { label: 'CTR moyen', value: `${stats.avgClickRate.toFixed(1)}%`, icon: <MousePointer size={14} />, color: 'text-blue-600 bg-blue-50' },
          { label: 'Emails total', value: stats.totalSent, icon: <BarChart3 size={14} />, color: 'text-gray-600 bg-gray-100' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-3">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center mb-2 ${s.color}`}>
              {s.icon}
            </div>
            <div className="text-lg font-bold text-gray-900">{s.value}</div>
            <div className="text-xs text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100">
          {(['campaigns', 'subscribers'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'campaigns' ? <Send size={14} /> : <Users size={14} />}
              {tab === 'campaigns' ? `Campagnes (${campaigns.length})` : `Abonnés (${stats.activeSubscribers})`}
            </button>
          ))}
          <div className="flex-1" />
          <button
            onClick={loadData}
            className="px-4 text-gray-400 hover:text-gray-600 transition-colors"
            title="Actualiser"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {/* Campaigns tab */}
        {activeTab === 'campaigns' && (
          <div className="divide-y divide-gray-50">
            {campaigns.length === 0 ? (
              <div className="py-16 text-center">
                <Mail size={36} className="text-gray-200 mx-auto mb-4" />
                <p className="text-sm text-gray-400 mb-2">Aucune campagne créée</p>
                <button
                  onClick={createAutoCampaign}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  Créer ma première campagne
                </button>
              </div>
            ) : (
              campaigns.map((c) => {
                const openRate = c.total_sent > 0 ? ((c.total_opened / c.total_sent) * 100).toFixed(1) : null;
                return (
                  <div key={c.id} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900 truncate">{c.name}</span>
                          <StatusBadge status={c.status} />
                        </div>
                        <p className="text-xs text-gray-500 truncate mb-2">{c.subject}</p>
                        {c.total_sent > 0 && (
                          <div className="flex items-center gap-5 text-xs text-gray-500">
                            <span className="flex items-center gap-1.5">
                              <Send size={10} className="text-gray-400" />
                              <strong className="text-gray-700">{c.total_sent}</strong> envoyés
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Eye size={10} className="text-blue-400" />
                              <strong className="text-blue-600">{openRate}%</strong>
                              <span className="text-gray-400">ouvertures</span>
                            </span>
                            <span className="flex items-center gap-1.5">
                              <MousePointer size={10} className="text-orange-400" />
                              <strong className="text-orange-600">{c.total_clicked}</strong>
                              <span className="text-gray-400">clics</span>
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-xs text-gray-400">
                          {new Date(c.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        {c.status === 'draft' && (
                          <button
                            onClick={() => sendCampaign(c.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                          >
                            <Send size={11} />
                            Envoyer
                          </button>
                        )}
                        {c.status === 'sent' && (
                          <button className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
                            Détails <ChevronRight size={11} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Subscribers tab */}
        {activeTab === 'subscribers' && (
          <>
            <div className="px-5 py-3 border-b border-gray-50 flex items-center gap-3">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    loadData();
                  }}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                <Filter size={12} className="text-gray-500 mx-1" />
                {(['active', 'all', 'unsubscribed'] as FilterStatus[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                      filterStatus === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {s === 'active' ? 'Actifs' : s === 'all' ? 'Tous' : 'Désabonnés'}
                  </button>
                ))}
              </div>
            </div>
            <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
              {subscribers.length === 0 ? (
                <div className="py-12 text-center">
                  <Users size={32} className="text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">Aucun abonné trouvé</p>
                </div>
              ) : (
                subscribers.map((sub) => (
                  <div key={sub.id} className="px-5 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {(sub.first_name || sub.email)[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {sub.first_name || sub.email.split('@')[0]}
                          </span>
                          {sub.categories?.length > 0 && (
                            <span className="text-xs bg-blue-50 text-blue-600 border border-blue-100 px-1.5 py-0.5 rounded">
                              {sub.categories[0]}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">{sub.email}</p>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0">
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
                        <EngagementBar score={sub.engagement_score || 50} />
                        <span className="text-xs text-gray-400">
                          {new Date(sub.subscribed_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* Perf tip */}
      <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-100 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <TrendingUp size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-700 leading-relaxed">
            <strong className="font-semibold">Bonnes pratiques :</strong> Envoyez le mardi ou jeudi entre 9h–11h.
            Personnalisez le sujet avec le prénom (+26%). Segmentez votre audience par score d'engagement pour des messages ciblés.
          </div>
        </div>
      </div>
    </div>
  );
}
