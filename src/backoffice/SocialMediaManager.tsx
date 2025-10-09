import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  Facebook, Instagram, Twitter, Youtube, Linkedin, MessageSquare,
  Send, Hash, Video, Image, MapPin, Star, Award, FileText,
  Calendar, TrendingUp, Users, CheckCircle, Clock, AlertCircle,
  Plus, Settings, BarChart3, Zap, Globe
} from 'lucide-react';

interface SocialNetwork {
  id: string;
  platform: string;
  account_name: string | null;
  account_id: string | null;
  is_active: boolean;
  is_connected: boolean;
  auto_publish: boolean;
  last_post_at: string | null;
  total_posts: number;
  total_engagement: number;
  metadata: any;
}

interface SocialPost {
  id: string;
  network_id: string;
  platform: string;
  content: string;
  media_urls: string[];
  post_url: string | null;
  scheduled_at: string | null;
  published_at: string | null;
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  views: number;
  likes: number;
  shares: number;
  comments: number;
  clicks: number;
  engagement_rate: number;
}

interface WhatsAppGroup {
  id: string;
  name: string;
  description: string;
  member_count: number;
  category: string;
  is_active: boolean;
  auto_send: boolean;
  send_frequency: string;
  last_message_at: string | null;
}

const iconMap: Record<string, any> = {
  facebook: Facebook,
  instagram: Instagram,
  twitter: Twitter,
  youtube: Youtube,
  linkedin: Linkedin,
  'message-square': MessageSquare,
  send: Send,
  hash: Hash,
  video: Video,
  image: Image,
  'map-pin': MapPin,
  star: Star,
  award: Award,
  'file-text': FileText,
};

export default function SocialMediaManager() {
  const [networks, setNetworks] = useState<SocialNetwork[]>([]);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [whatsappGroups, setWhatsappGroups] = useState<WhatsAppGroup[]>([]);
  const [activeTab, setActiveTab] = useState<'networks' | 'posts' | 'whatsapp' | 'automation'>('networks');
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState({
    network_id: '',
    content: '',
    hashtags: '',
    scheduled_at: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [networksRes, postsRes] = await Promise.all([
        supabase.from('social_networks').select('*').order('platform'),
        supabase.from('social_posts').select('*').order('created_at', { ascending: false }).limit(50)
      ]);

      if (networksRes.data) setNetworks(networksRes.data);
      if (postsRes.data) setPosts(postsRes.data);

      // WhatsApp groups - à implémenter plus tard
      setWhatsappGroups([]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleNetwork = async (networkId: string, currentStatus: boolean) => {
    try {
      await supabase
        .from('social_networks')
        .update({ is_active: !currentStatus })
        .eq('id', networkId);

      loadData();
    } catch (error) {
      console.error('Error toggling network:', error);
    }
  };

  const createPost = async () => {
    if (!newPost.network_id || !newPost.content) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();

      await supabase.from('social_posts').insert({
        network_id: newPost.network_id,
        content: newPost.content,
        hashtags: newPost.hashtags.split(',').map(h => h.trim()).filter(Boolean),
        scheduled_at: newPost.scheduled_at || new Date().toISOString(),
        status: newPost.scheduled_at ? 'scheduled' : 'draft',
        created_by: user?.id
      });

      setNewPost({ network_id: '', content: '', hashtags: '', scheduled_at: '' });
      loadData();
      alert('Post créé avec succès !');
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Erreur lors de la création du post');
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      general: 'bg-blue-500',
      professional: 'bg-purple-500',
      video: 'bg-red-500',
      visual: 'bg-pink-500',
      blogging: 'bg-yellow-500',
      messaging: 'bg-green-500',
      local: 'bg-orange-500',
      reviews: 'bg-indigo-500',
      business: 'bg-gray-500',
      creative: 'bg-teal-500',
      community: 'bg-cyan-500',
      qa: 'bg-amber-500'
    };
    return colors[category] || 'bg-gray-500';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'text-gray-400',
      scheduled: 'text-blue-400',
      published: 'text-green-400',
      failed: 'text-red-400'
    };
    return colors[status] || 'text-gray-400';
  };

  const getStatusIcon = (status: string) => {
    const icons: Record<string, any> = {
      draft: FileText,
      scheduled: Clock,
      published: CheckCircle,
      failed: AlertCircle
    };
    const Icon = icons[status] || FileText;
    return <Icon className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300">Chargement...</p>
        </div>
      </div>
    );
  }

  const activeNetworks = networks.filter(n => n.is_active);
  const totalEngagement = posts.reduce((sum, p) => sum + p.likes + p.shares + p.comments, 0);
  const totalClicks = posts.reduce((sum, p) => sum + p.clicks, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
            Gestion Réseaux Sociaux
          </h1>
          <p className="text-gray-400">
            Automatisation complète de 50+ réseaux sociaux
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <Globe className="w-8 h-8 text-blue-400" />
              <span className="text-2xl font-bold">{networks.length}</span>
            </div>
            <p className="text-gray-400 text-sm">Réseaux disponibles</p>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="w-8 h-8 text-green-400" />
              <span className="text-2xl font-bold">{activeNetworks.length}</span>
            </div>
            <p className="text-gray-400 text-sm">Réseaux actifs</p>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 text-yellow-400" />
              <span className="text-2xl font-bold">{totalEngagement.toLocaleString()}</span>
            </div>
            <p className="text-gray-400 text-sm">Engagement total</p>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-8 h-8 text-purple-400" />
              <span className="text-2xl font-bold">{totalClicks.toLocaleString()}</span>
            </div>
            <p className="text-gray-400 text-sm">Clics totaux</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-4 mb-8 border-b border-gray-700">
          {['networks', 'posts', 'whatsapp', 'automation'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-6 py-3 font-medium transition-all ${
                activeTab === tab
                  ? 'text-yellow-400 border-b-2 border-yellow-400'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              {tab === 'networks' && 'Réseaux Sociaux'}
              {tab === 'posts' && 'Publications'}
              {tab === 'whatsapp' && 'WhatsApp Business'}
              {tab === 'automation' && 'Automatisation'}
            </button>
          ))}
        </div>

        {/* Networks Tab */}
        {activeTab === 'networks' && (
          <div className="space-y-6">
            <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
              <h2 className="text-2xl font-bold mb-4">Réseaux Sociaux Disponibles</h2>
              <p className="text-gray-400 mb-6">
                Activez les réseaux sur lesquels vous souhaitez publier automatiquement
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {networks.map((network) => {
                  const platformLower = network.platform.toLowerCase();
                  let Icon = Globe;

                  if (platformLower.includes('facebook')) Icon = Facebook;
                  else if (platformLower.includes('instagram')) Icon = Instagram;
                  else if (platformLower.includes('twitter') || platformLower.includes('x')) Icon = Twitter;
                  else if (platformLower.includes('linkedin')) Icon = Linkedin;
                  else if (platformLower.includes('youtube')) Icon = Youtube;
                  else if (platformLower.includes('whatsapp')) Icon = MessageSquare;

                  return (
                    <div
                      key={network.id}
                      className="bg-gray-900/50 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-all"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 rounded-lg bg-blue-500/20 border border-blue-500/30">
                            <Icon className="w-5 h-5 text-blue-400" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-white">{network.platform}</h3>
                            {network.account_name && (
                              <p className="text-xs text-gray-400">@{network.account_name}</p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => toggleNetwork(network.id, network.is_active)}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                            network.is_connected
                              ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                              : 'bg-gray-700 text-gray-300 border border-gray-600'
                          }`}
                        >
                          {network.is_connected ? 'Connecté' : 'Non connecté'}
                        </button>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Publications:</span>
                          <span className="font-medium text-white">{network.total_posts}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Engagement:</span>
                          <span className="font-medium text-white">{network.total_engagement}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Auto-publication:</span>
                          <span className={network.auto_publish ? 'text-green-400' : 'text-gray-400'}>
                            {network.auto_publish ? 'Activée' : 'Désactivée'}
                          </span>
                        </div>
                        {network.last_post_at && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Dernier post:</span>
                            <span className="text-xs text-gray-400">
                              {new Date(network.last_post_at).toLocaleDateString('fr-FR')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Posts Tab */}
        {activeTab === 'posts' && (
          <div className="space-y-6">
            {/* Create Post Form */}
            <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
              <h2 className="text-2xl font-bold mb-4">Créer une Publication</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Réseau Social</label>
                  <select
                    value={newPost.network_id}
                    onChange={(e) => setNewPost({ ...newPost, network_id: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  >
                    <option value="">Sélectionner un réseau</option>
                    {activeNetworks.map((network) => (
                      <option key={network.id} value={network.id}>
                        {network.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Contenu</label>
                  <textarea
                    value={newPost.content}
                    onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                    rows={4}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    placeholder="Rédigez votre message..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Hashtags (séparés par des virgules)</label>
                  <input
                    type="text"
                    value={newPost.hashtags}
                    onChange={(e) => setNewPost({ ...newPost, hashtags: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    placeholder="#AssuranceTaxi, #Taxi, #VTC"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Planifier pour (optionnel)</label>
                  <input
                    type="datetime-local"
                    value={newPost.scheduled_at}
                    onChange={(e) => setNewPost({ ...newPost, scheduled_at: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>

                <button
                  onClick={createPost}
                  className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-gray-900 font-bold py-3 px-6 rounded-lg hover:shadow-lg hover:shadow-yellow-400/50 transition-all flex items-center justify-center space-x-2"
                >
                  <Plus className="w-5 h-5" />
                  <span>Créer la Publication</span>
                </button>
              </div>
            </div>

            {/* Posts List */}
            <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
              <h2 className="text-2xl font-bold mb-4">Publications Récentes</h2>

              <div className="space-y-4">
                {posts.map((post) => {
                  const network = networks.find(n => n.id === post.network_id);
                  return (
                    <div key={post.id} className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          {network && (
                            <>
                              {(() => {
                                const Icon = iconMap[network.icon] || Globe;
                                return <Icon className="w-5 h-5 text-gray-400" />;
                              })()}
                              <span className="font-medium">{network.name}</span>
                            </>
                          )}
                        </div>
                        <div className={`flex items-center space-x-2 ${getStatusColor(post.status)}`}>
                          {getStatusIcon(post.status)}
                          <span className="text-sm capitalize">{post.status}</span>
                        </div>
                      </div>

                      <p className="text-gray-300 mb-3">{post.content}</p>

                      {post.hashtags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {post.hashtags.map((tag, idx) => (
                            <span key={idx} className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div className="text-center">
                          <p className="text-gray-400 text-xs">Vues</p>
                          <p className="font-semibold">{post.views.toLocaleString()}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-gray-400 text-xs">Likes</p>
                          <p className="font-semibold">{post.likes.toLocaleString()}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-gray-400 text-xs">Partages</p>
                          <p className="font-semibold">{post.shares.toLocaleString()}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-gray-400 text-xs">Clics</p>
                          <p className="font-semibold">{post.clicks.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* WhatsApp Tab */}
        {activeTab === 'whatsapp' && (
          <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
            <h2 className="text-2xl font-bold mb-4">WhatsApp Business - Groupes</h2>
            <p className="text-gray-400 mb-6">
              Gérez vos groupes WhatsApp pour la diffusion automatique
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {whatsappGroups.map((group) => (
                <div key={group.id} className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">{group.name}</h3>
                      <p className="text-xs text-gray-400">{group.description}</p>
                    </div>
                    <MessageSquare className="w-5 h-5 text-green-400" />
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Membres:</span>
                      <span className="font-medium">{group.member_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Catégorie:</span>
                      <span className="font-medium capitalize">{group.category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Fréquence:</span>
                      <span className="font-medium capitalize">{group.send_frequency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Auto-envoi:</span>
                      <span className={group.auto_send ? 'text-green-400' : 'text-gray-400'}>
                        {group.auto_send ? 'Activé' : 'Désactivé'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {whatsappGroups.length === 0 && (
              <div className="text-center py-12">
                <MessageSquare className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">Aucun groupe WhatsApp configuré</p>
                <p className="text-sm text-gray-500 mt-2">
                  Consultez le guide d'automatisation pour configurer vos groupes
                </p>
              </div>
            )}
          </div>
        )}

        {/* Automation Tab */}
        {activeTab === 'automation' && (
          <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
            <h2 className="text-2xl font-bold mb-4">Automatisation Make.com / Zapier</h2>
            <p className="text-gray-400 mb-6">
              Configuration et suivi des règles d'automatisation
            </p>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6 mb-6">
              <div className="flex items-start space-x-3">
                <Zap className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-blue-400 mb-2">Guide de Configuration</h3>
                  <p className="text-sm text-gray-300 mb-4">
                    Pour automatiser vos publications sur tous les réseaux sociaux, consultez le guide complet :
                  </p>
                  <ul className="space-y-2 text-sm text-gray-300">
                    <li>• Configuration Make.com pour publication multi-réseaux</li>
                    <li>• Intégration Zapier avec déclencheurs automatiques</li>
                    <li>• Webhook pour synchronisation temps réel</li>
                    <li>• Templates de contenu par réseau</li>
                  </ul>
                  <p className="text-sm text-gray-400 mt-4">
                    📄 Voir le fichier: <code className="bg-gray-900 px-2 py-1 rounded text-yellow-400">AUTOMATION-SOCIAL-MEDIA-GUIDE.md</code>
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-900/50 rounded-lg p-6 border border-gray-700">
                <h3 className="font-semibold mb-4 flex items-center space-x-2">
                  <Settings className="w-5 h-5 text-yellow-400" />
                  <span>Make.com</span>
                </h3>
                <p className="text-sm text-gray-400 mb-4">
                  Automatisation visuelle sans code
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span>Publication automatique blog → réseaux</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span>Partage multi-réseaux en 1 clic</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span>Adaptation contenu par réseau</span>
                  </li>
                </ul>
              </div>

              <div className="bg-gray-900/50 rounded-lg p-6 border border-gray-700">
                <h3 className="font-semibold mb-4 flex items-center space-x-2">
                  <Zap className="w-5 h-5 text-blue-400" />
                  <span>Zapier</span>
                </h3>
                <p className="text-sm text-gray-400 mb-4">
                  Intégrations instantanées
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span>Déclencheurs automatiques</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span>Synchronisation CRM</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span>Notifications temps réel</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
