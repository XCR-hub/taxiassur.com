import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Send, Users, Mail, TrendingUp, Calendar, Plus } from 'lucide-react';

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
}

export default function NewsletterDashboard() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [stats, setStats] = useState({
    activeSubscribers: 0,
    totalCampaigns: 0,
    sentCampaigns: 0,
    avgOpenRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [campaignsRes, subscribersRes, statsRes] = await Promise.all([
        supabase
          .from('newsletter_campaigns')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('newsletter_subscribers')
          .select('*')
          .eq('status', 'active')
          .order('subscribed_at', { ascending: false })
          .limit(20),
        supabase.rpc('get_newsletter_stats').catch(() => ({ data: null })),
      ]);

      if (campaignsRes.data) setCampaigns(campaignsRes.data);
      if (subscribersRes.data) setSubscribers(subscribersRes.data);

      const { data: statData } = await supabase
        .from('newsletter_subscribers')
        .select('status')
        .eq('status', 'active');

      setStats({
        activeSubscribers: statData?.length || 0,
        totalCampaigns: campaignsRes.data?.length || 0,
        sentCampaigns:
          campaignsRes.data?.filter((c) => c.status === 'sent').length || 0,
        avgOpenRate: 0,
      });
    } catch (error) {
      console.error('Erreur chargement:', error);
    } finally {
      setLoading(false);
    }
  }

  async function createAutoCampaign() {
    if (!confirm('Créer une campagne avec les derniers articles ?')) return;

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
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">📰 Newsletter TaxiAssur</h1>
          <p>Découvrez les derniers articles :</p>
          ${articles
            .map(
              (a) => `
            <div style="margin: 20px 0; border-bottom: 1px solid #eee; padding-bottom: 20px;">
              <img src="${a.featured_image}" style="width: 100%; border-radius: 8px;" />
              <h2>${a.title}</h2>
              <p>${a.excerpt}</p>
              <a href="https://taxiassur.com/blog/${a.slug}" style="color: #2563eb;">Lire l'article →</a>
            </div>
          `
            )
            .join('')}
        </div>
      `;

      const { data: campaign, error } = await supabase
        .from('newsletter_campaigns')
        .insert({
          name: `Newsletter - ${new Date().toLocaleDateString('fr-FR')}`,
          subject: 'Nouveaux articles TaxiAssur',
          content_html: htmlContent,
          status: 'draft',
          scheduled_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      alert('Campagne créée avec succès !');
      loadData();
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la création');
    } finally {
      setCreating(false);
    }
  }

  async function sendCampaign(campaignId: string) {
    if (!confirm('Envoyer cette campagne maintenant ?')) return;

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
        alert(`Envoyé à ${result.sent_count} abonnés !`);
        loadData();
      } else {
        alert('Erreur: ' + result.error);
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de l\'envoi');
    }
  }

  if (loading) {
    return <div className="p-8">Chargement...</div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">📧 Newsletter Manager</h1>
          <p className="text-gray-600">
            Gérez vos campagnes email et abonnés
          </p>
        </div>
        <button
          onClick={createAutoCampaign}
          disabled={creating}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <Plus className="w-5 h-5" />
          Nouvelle campagne auto
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-8 h-8 text-blue-600" />
            <span className="text-2xl font-bold">{stats.activeSubscribers}</span>
          </div>
          <p className="text-gray-600">Abonnés actifs</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <Mail className="w-8 h-8 text-green-600" />
            <span className="text-2xl font-bold">{stats.totalCampaigns}</span>
          </div>
          <p className="text-gray-600">Campagnes totales</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <Send className="w-8 h-8 text-purple-600" />
            <span className="text-2xl font-bold">{stats.sentCampaigns}</span>
          </div>
          <p className="text-gray-600">Envoyées</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-8 h-8 text-orange-600" />
            <span className="text-2xl font-bold">
              {stats.avgOpenRate.toFixed(1)}%
            </span>
          </div>
          <p className="text-gray-600">Taux ouverture</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold">Campagnes récentes</h2>
          </div>
          <div className="divide-y">
            {campaigns.length === 0 ? (
              <p className="p-6 text-gray-500 text-center">
                Aucune campagne
              </p>
            ) : (
              campaigns.map((campaign) => (
                <div key={campaign.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold">{campaign.name}</h3>
                      <p className="text-sm text-gray-600 mb-2">
                        {campaign.subject}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(campaign.scheduled_at).toLocaleDateString(
                            'fr-FR'
                          )}
                        </span>
                        {campaign.total_sent > 0 && (
                          <span>
                            {campaign.total_sent} envoyés •{' '}
                            {campaign.total_opened} ouverts
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          campaign.status === 'sent'
                            ? 'bg-green-100 text-green-800'
                            : campaign.status === 'sending'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {campaign.status}
                      </span>
                      {campaign.status === 'draft' && (
                        <button
                          onClick={() => sendCampaign(campaign.id)}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                        >
                          Envoyer
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold">Abonnés récents</h2>
          </div>
          <div className="divide-y max-h-[600px] overflow-y-auto">
            {subscribers.length === 0 ? (
              <p className="p-6 text-gray-500 text-center">
                Aucun abonné
              </p>
            ) : (
              subscribers.map((sub) => (
                <div key={sub.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {sub.first_name || sub.email.split('@')[0]}
                      </p>
                      <p className="text-sm text-gray-600">{sub.email}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-blue-600">
                        Score: {sub.engagement_score || 50}
                      </div>
                      <div className="text-xs text-gray-500">
                        {sub.total_opens} ouvertures
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
