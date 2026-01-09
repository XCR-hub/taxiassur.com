import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  Send,
  Users,
  Mail,
  TrendingUp,
  Calendar,
  Plus,
  Eye,
  MousePointer,
  Download,
  BarChart3,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Filter,
  Search
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
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'unsubscribed'>('active');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [filterStatus]);

  async function loadData() {
    try {
      const [campaignsRes, subscribersRes] = await Promise.all([
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

      const { data: activeData } = await supabase
        .from('newsletter_subscribers')
        .select('status')
        .eq('status', 'active');

      const sentCampaigns = campaignsRes.data?.filter((c) => c.status === 'sent') || [];
      const totalOpens = sentCampaigns.reduce((sum, c) => sum + (c.total_opened || 0), 0);
      const totalClicks = sentCampaigns.reduce((sum, c) => sum + (c.total_clicked || 0), 0);
      const totalSent = sentCampaigns.reduce((sum, c) => sum + (c.total_sent || 0), 0);

      setStats({
        activeSubscribers: activeData?.length || 0,
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

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f9fafb;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                  <tr>
                    <td style="padding: 40px; text-align: center; background: linear-gradient(135deg, #f59e0b 0%, #eab308 100%); border-radius: 8px 8px 0 0;">
                      <h1 style="margin: 0; color: #000000; font-size: 28px;">📰 Newsletter TaxiAssur</h1>
                      <p style="margin: 10px 0 0; color: #000000; font-size: 16px;">Vos actualités assurance taxi</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px;">
                      <p style="margin: 0 0 20px; color: #374151; font-size: 16px;">Bonjour,</p>
                      <p style="margin: 0 0 30px; color: #374151; font-size: 16px;">Découvrez nos derniers articles sur l'assurance taxi :</p>
                      ${articles
                        .map(
                          (a) => `
                        <table role="presentation" style="width: 100%; margin-bottom: 30px; border-bottom: 1px solid #e5e7eb; padding-bottom: 30px;">
                          <tr>
                            <td>
                              ${
                                a.featured_image
                                  ? `<img src="${a.featured_image}" alt="${a.title}" style="width: 100%; height: 200px; object-fit: cover; border-radius: 8px; margin-bottom: 15px;" />`
                                  : ''
                              }
                              <h2 style="margin: 0 0 10px; color: #111827; font-size: 20px;">${a.title}</h2>
                              <p style="margin: 0 0 15px; color: #6b7280; font-size: 14px; line-height: 1.5;">${a.excerpt}</p>
                              <a href="https://taxiassur.com/blog/${a.slug}" style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #f59e0b 0%, #eab308 100%); color: #000000; text-decoration: none; border-radius: 6px; font-weight: bold;">Lire l'article →</a>
                            </td>
                          </tr>
                        </table>
                      `
                        )
                        .join('')}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
                      <p style="margin: 0 0 10px; color: #6b7280; font-size: 12px;">
                        © 2024 TaxiAssur. Tous droits réservés.
                      </p>
                      <p style="margin: 0; color: #6b7280; font-size: 12px;">
                        <a href="https://taxiassur.com/newsletter/unsubscribe" style="color: #f59e0b; text-decoration: underline;">Se désabonner</a>
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      const { data: campaign, error} = await supabase
        .from('newsletter_campaigns')
        .insert({
          name: `Newsletter - ${new Date().toLocaleDateString('fr-FR')}`,
          subject: `📧 Nouveaux articles TaxiAssur - ${new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`,
          content_html: htmlContent,
          status: 'draft',
          scheduled_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      alert(`Campagne créée avec succès ! ${articles.length} articles inclus.`);
      loadData();
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la création de la campagne');
    } finally {
      setCreating(false);
    }
  }

  async function sendCampaign(campaignId: string) {
    if (!confirm('Envoyer cette campagne maintenant à tous les abonnés actifs ?')) return;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-newsletter-campaign`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ campaign_id: campaignId }),
        }
      );

      const result = await response.json();

      if (result.success) {
        alert(`✅ Campagne envoyée avec succès à ${result.sent_count} abonnés !`);
        loadData();
      } else {
        alert('❌ Erreur: ' + result.error);
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('❌ Erreur lors de l\'envoi de la campagne');
    }
  }

  async function exportSubscribers() {
    try {
      const { data } = await supabase
        .from('newsletter_subscribers')
        .select('*')
        .eq('status', 'active');

      if (!data) return;

      const csv = [
        'Email,Prénom,Score engagement,Ouvertures,Clics,Date inscription',
        ...data.map((s) =>
          [
            s.email,
            s.first_name || '',
            s.engagement_score || 50,
            s.total_opens || 0,
            s.total_clicks || 0,
            new Date(s.subscribed_at).toLocaleDateString('fr-FR'),
          ].join(',')
        ),
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `abonnes-newsletter-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } catch (error) {
      console.error('Erreur export:', error);
      alert('Erreur lors de l\'export');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Chargement des données...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-orange-600 to-yellow-600 bg-clip-text text-transparent">
            📧 Newsletter Manager
          </h1>
          <p className="text-gray-600 text-lg">
            Gérez vos campagnes email et vos {stats.activeSubscribers} abonnés actifs
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={exportSubscribers}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-5 h-5" />
            Exporter CSV
          </button>
          <button
            onClick={createAutoCampaign}
            disabled={creating}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-yellow-600 text-white rounded-lg hover:from-orange-700 hover:to-yellow-700 transition-all disabled:opacity-50 shadow-lg"
          >
            {creating ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Création...
              </>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                Nouvelle campagne auto
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-xl shadow-lg transform hover:scale-105 transition-transform">
          <div className="flex items-center justify-between mb-3">
            <Users className="w-10 h-10 opacity-80" />
            <span className="text-3xl font-bold">{stats.activeSubscribers}</span>
          </div>
          <p className="text-blue-100 font-medium">Abonnés actifs</p>
          <p className="text-xs text-blue-200 mt-1">Base de données</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-xl shadow-lg transform hover:scale-105 transition-transform">
          <div className="flex items-center justify-between mb-3">
            <Mail className="w-10 h-10 opacity-80" />
            <span className="text-3xl font-bold">{stats.totalCampaigns}</span>
          </div>
          <p className="text-green-100 font-medium">Campagnes totales</p>
          <p className="text-xs text-green-200 mt-1">Depuis le début</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-xl shadow-lg transform hover:scale-105 transition-transform">
          <div className="flex items-center justify-between mb-3">
            <Send className="w-10 h-10 opacity-80" />
            <span className="text-3xl font-bold">{stats.sentCampaigns}</span>
          </div>
          <p className="text-purple-100 font-medium">Envoyées</p>
          <p className="text-xs text-purple-200 mt-1">Campagnes livrées</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6 rounded-xl shadow-lg transform hover:scale-105 transition-transform">
          <div className="flex items-center justify-between mb-3">
            <TrendingUp className="w-10 h-10 opacity-80" />
            <span className="text-3xl font-bold">{stats.avgOpenRate.toFixed(1)}%</span>
          </div>
          <p className="text-orange-100 font-medium">Taux d'ouverture</p>
          <p className="text-xs text-orange-200 mt-1">Moyenne globale</p>
        </div>

        <div className="bg-gradient-to-br from-pink-500 to-pink-600 text-white p-6 rounded-xl shadow-lg transform hover:scale-105 transition-transform">
          <div className="flex items-center justify-between mb-3">
            <MousePointer className="w-10 h-10 opacity-80" />
            <span className="text-3xl font-bold">{stats.avgClickRate.toFixed(1)}%</span>
          </div>
          <p className="text-pink-100 font-medium">Taux de clic</p>
          <p className="text-xs text-pink-200 mt-1">CTR moyen</p>
        </div>

        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white p-6 rounded-xl shadow-lg transform hover:scale-105 transition-transform">
          <div className="flex items-center justify-between mb-3">
            <BarChart3 className="w-10 h-10 opacity-80" />
            <span className="text-3xl font-bold">{stats.totalSent}</span>
          </div>
          <p className="text-indigo-100 font-medium">Emails envoyés</p>
          <p className="text-xs text-indigo-200 mt-1">Total cumulé</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-yellow-50">
            <h2 className="text-2xl font-bold text-gray-900">📨 Campagnes Récentes</h2>
            <p className="text-sm text-gray-600 mt-1">Historique des envois et brouillons</p>
          </div>
          <div className="divide-y divide-gray-100 max-h-[700px] overflow-y-auto">
            {campaigns.length === 0 ? (
              <div className="p-12 text-center">
                <Mail className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">Aucune campagne créée</p>
                <p className="text-sm text-gray-400 mt-2">
                  Cliquez sur "Nouvelle campagne auto" pour commencer
                </p>
              </div>
            ) : (
              campaigns.map((campaign) => (
                <div key={campaign.id} className="p-5 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-bold text-gray-900 text-lg">{campaign.name}</h3>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            campaign.status === 'sent'
                              ? 'bg-green-100 text-green-800'
                              : campaign.status === 'sending'
                              ? 'bg-blue-100 text-blue-800 animate-pulse'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {campaign.status === 'sent'
                            ? '✓ Envoyée'
                            : campaign.status === 'sending'
                            ? '⏳ En cours'
                            : '📝 Brouillon'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-3 font-medium">
                        📧 {campaign.subject}
                      </p>
                      <div className="flex items-center gap-6 text-xs text-gray-500">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" />
                          {new Date(campaign.scheduled_at).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </span>
                        {campaign.total_sent > 0 && (
                          <>
                            <span className="flex items-center gap-1.5">
                              <Send className="w-4 h-4 text-green-600" />
                              {campaign.total_sent} envoyés
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Eye className="w-4 h-4 text-blue-600" />
                              {campaign.total_opened} ouverts (
                              {campaign.total_sent > 0
                                ? ((campaign.total_opened / campaign.total_sent) * 100).toFixed(1)
                                : 0}
                              %)
                            </span>
                            <span className="flex items-center gap-1.5">
                              <MousePointer className="w-4 h-4 text-purple-600" />
                              {campaign.total_clicked} clics
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 ml-4">
                      {campaign.status === 'draft' && (
                        <button
                          onClick={() => sendCampaign(campaign.id)}
                          className="px-4 py-2 bg-gradient-to-r from-orange-600 to-yellow-600 text-white rounded-lg text-sm font-semibold hover:from-orange-700 hover:to-yellow-700 transition-all shadow-md flex items-center gap-2"
                        >
                          <Send className="w-4 h-4" />
                          Envoyer maintenant
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">👥 Abonnés</h2>
                <p className="text-sm text-gray-600 mt-1">Liste des inscrits à la newsletter</p>
              </div>
              <button
                onClick={loadData}
                className="p-2 bg-white rounded-lg hover:bg-gray-50 transition-colors"
                title="Actualiser"
              >
                <RefreshCw className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher un abonné..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    loadData();
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex gap-2">
                {(['all', 'active', 'unsubscribed'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => {
                      setFilterStatus(status);
                      loadData();
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filterStatus === status
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                    }`}
                  >
                    {status === 'all' ? 'Tous' : status === 'active' ? 'Actifs' : 'Désabonnés'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="divide-y divide-gray-100 max-h-[700px] overflow-y-auto">
            {subscribers.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">Aucun abonné trouvé</p>
                <p className="text-sm text-gray-400 mt-2">
                  {searchQuery
                    ? 'Aucun résultat pour cette recherche'
                    : 'Les nouveaux abonnés apparaîtront ici'}
                </p>
              </div>
            ) : (
              subscribers.map((sub) => (
                <div key={sub.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                        {(sub.first_name || sub.email)[0].toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">
                          {sub.first_name || sub.email.split('@')[0]}
                        </p>
                        <p className="text-sm text-gray-600">{sub.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500">
                            Inscrit le {new Date(sub.subscribed_at).toLocaleDateString('fr-FR')}
                          </span>
                          {sub.categories && sub.categories.length > 0 && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                              {sub.categories.join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div
                        className={`text-sm font-bold mb-1 ${
                          (sub.engagement_score || 50) >= 70
                            ? 'text-green-600'
                            : (sub.engagement_score || 50) >= 40
                            ? 'text-yellow-600'
                            : 'text-red-600'
                        }`}
                      >
                        Score: {sub.engagement_score || 50}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {sub.total_opens || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <MousePointer className="w-3 h-3" />
                          {sub.total_clicks || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-bold text-gray-900 mb-2">💡 Conseils pour optimiser vos newsletters</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Envoyez vos campagnes le mardi ou jeudi entre 9h et 11h pour un meilleur taux d'ouverture</li>
              <li>• Personnalisez vos sujets avec le prénom du destinataire</li>
              <li>• Testez différents contenus pour identifier ce qui fonctionne le mieux</li>
              <li>• Segmentez votre audience selon leur engagement pour des messages ciblés</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
