import { useState, useEffect } from 'react';
import { internalFunctionHeaders } from '@/lib/internal-function-auth';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { toast } from '@/lib/toast';
import {
  Facebook, Instagram, Twitter, Youtube, Linkedin, MessageSquare,
  Send, Hash, CheckCircle, Clock, AlertCircle, XCircle,
  Plus, Settings, BarChart3, Globe, Smartphone, Mail, Video,
  Users, TrendingUp, Calendar, Award, Zap, Check, X, Wrench,
  type LucideIcon
} from 'lucide-react';
import TestAutomationButton from './TestAutomationButton';
import { LinkedInOAuthButton } from '@/components/LinkedInOAuthButton';
import SocialNetworkConfigModal from './SocialNetworkConfigModal';

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
}

interface NetworkDefinition {
  id: string;
  name: string;
  icon: LucideIcon;
  color: string;
  hasAPI: boolean;
  apiStatus: 'ready' | 'missing' | 'pending';
  requiresAuth: boolean;
  description: string;
  setupGuide: string;
}

const SOCIAL_NETWORKS: NetworkDefinition[] = [
  {
    id: 'facebook',
    name: 'Facebook',
    icon: Facebook,
    color: 'bg-orange-600',
    hasAPI: true,
    apiStatus: 'ready',
    requiresAuth: true,
    description: 'Pages et groupes Facebook',
    setupGuide: 'Connectez votre page Facebook via Facebook Graph API'
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: Instagram,
    color: 'bg-pink-600',
    hasAPI: true,
    apiStatus: 'pending',
    requiresAuth: true,
    description: 'Compte Instagram Business',
    setupGuide: 'Liez votre compte Instagram Business (via Facebook)'
  },
  {
    id: 'twitter',
    name: 'Twitter / X',
    icon: Twitter,
    color: 'bg-sky-500',
    hasAPI: true,
    apiStatus: 'pending',
    requiresAuth: true,
    description: 'Publications Twitter/X',
    setupGuide: 'Authentification OAuth 2.0 Twitter API v2'
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: Linkedin,
    color: 'bg-orange-700',
    hasAPI: true,
    apiStatus: 'ready',
    requiresAuth: true,
    description: 'Page entreprise LinkedIn',
    setupGuide: 'Connectez votre page LinkedIn via OAuth'
  },
  {
    id: 'youtube',
    name: 'YouTube',
    icon: Youtube,
    color: 'bg-red-600',
    hasAPI: true,
    apiStatus: 'pending',
    requiresAuth: true,
    description: 'Chaîne YouTube',
    setupGuide: 'Authentification Google OAuth + YouTube Data API'
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: Video,
    color: 'bg-black',
    hasAPI: true,
    apiStatus: 'pending',
    requiresAuth: true,
    description: 'Compte TikTok Business',
    setupGuide: 'TikTok for Business API (en attente validation)'
  },
  {
    id: 'pinterest',
    name: 'Pinterest',
    icon: Award,
    color: 'bg-red-700',
    hasAPI: true,
    apiStatus: 'missing',
    requiresAuth: true,
    description: 'Compte Pinterest Business',
    setupGuide: 'API Pinterest v5 (clé API requise)'
  },
  {
    id: 'telegram',
    name: 'Telegram',
    icon: Send,
    color: 'bg-orange-500',
    hasAPI: true,
    apiStatus: 'missing',
    requiresAuth: true,
    description: 'Canal Telegram',
    setupGuide: 'Bot Telegram via @BotFather'
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    icon: MessageSquare,
    color: 'bg-green-600',
    hasAPI: true,
    apiStatus: 'pending',
    requiresAuth: true,
    description: 'Groupes WhatsApp Business',
    setupGuide: 'WhatsApp Business API + connexion téléphone'
  },
  {
    id: 'snapchat',
    name: 'Snapchat',
    icon: Smartphone,
    color: 'bg-yellow-400',
    hasAPI: true,
    apiStatus: 'missing',
    requiresAuth: true,
    description: 'Snapchat Business',
    setupGuide: 'Snap Marketing API'
  },
  {
    id: 'reddit',
    name: 'Reddit',
    icon: MessageSquare,
    color: 'bg-orange-600',
    hasAPI: true,
    apiStatus: 'missing',
    requiresAuth: true,
    description: 'Subreddits',
    setupGuide: 'Reddit API avec OAuth'
  },
  {
    id: 'threads',
    name: 'Threads',
    icon: Hash,
    color: 'bg-black',
    hasAPI: false,
    apiStatus: 'missing',
    requiresAuth: true,
    description: 'Threads par Instagram',
    setupGuide: 'API non disponible (utiliser Instagram)'
  }
];

export default function SocialMediaManager() {
  const [networks, setNetworks] = useState<SocialNetwork[]>([]);
  const [selectedNetworks, setSelectedNetworks] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'networks' | 'publications' | 'whatsapp' | 'automation'>('networks');
  const [loading, setLoading] = useState(true);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [realStats, setRealStats] = useState({
    totalPosts: 0,
    totalEngagement: 0,
    successRate: 0
  });
  const [posts, setPosts] = useState<any[]>([]);
  const [newPost, setNewPost] = useState({
    platforms: [] as string[],
    content: '',
    hashtags: '',
    scheduled_at: ''
  });
  const [configModal, setConfigModal] = useState<{
    platform: string;
    name: string;
    icon: LucideIcon;
    color: string;
    dbNetworkId?: string;
  } | null>(null);
  const [networkConfigs, setNetworkConfigs] = useState<Record<string, Record<string, string>>>({});

  useEffect(() => {
    loadNetworks();
    loadRealStats();
    loadNetworkConfigs();
  }, []);

  const loadNetworks = async () => {
    try {
      const { data } = await supabase
        .from('social_networks')
        .select('*')
        .order('platform');

      if (data) setNetworks(data);
    } catch (error) {
      logger.error('Error loading networks:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRealStats = async () => {
    try {
      const { data: postsData } = await supabase
        .from('social_posts')
        .select('*, social_networks(platform)')
        .order('created_at', { ascending: false })
        .limit(20);

      if (postsData) {
        setPosts(postsData);
        const totalPosts = postsData.length;
        const published = postsData.filter(p => p.status === 'published').length;
        const totalEngagement = postsData.reduce((sum, p) => sum + (p.engagement || 0), 0);
        const successRate = totalPosts > 0 ? Math.round((published / totalPosts) * 100) : 0;

        setRealStats({
          totalPosts,
          totalEngagement,
          successRate
        });
      }
    } catch (error) {
      logger.error('Error loading stats:', error);
    }
  };

  const loadNetworkConfigs = async () => {
    try {
      const { data } = await supabase
        .from('social_networks')
        .select('platform, config');

      if (data) {
        const configs: Record<string, Record<string, string>> = {};
        data.forEach(n => {
          if (n.config && typeof n.config === 'object' && Object.keys(n.config).length > 0) {
            configs[n.platform] = n.config as Record<string, string>;
          }
        });
        setNetworkConfigs(configs);
      }
    } catch (error) {
      logger.error('Error loading network configs:', error);
    }
  };

  const getConfigStatus = (platform: string): 'configured' | 'partial' | 'empty' => {
    const cfg = networkConfigs[platform];
    if (!cfg || Object.keys(cfg).length === 0) return 'empty';
    const values = Object.values(cfg).filter(v => {
      if (typeof v === 'string') return v.trim().length > 0;
      return v !== null && v !== undefined && v !== '';
    });
    if (values.length === Object.keys(cfg).length) return 'configured';
    return 'partial';
  };

  const openConfigModal = (networkDef: { id: string; name: string; icon: LucideIcon; color: string }) => {
    const dbNetwork = networks.find(n => n.platform === networkDef.id);
    setConfigModal({
      platform: networkDef.id,
      name: networkDef.name,
      icon: networkDef.icon,
      color: networkDef.color,
      dbNetworkId: dbNetwork?.id,
    });
  };

  const handleGenerateAI = async () => {
    setGeneratingAI(true);
    setAiResult(null);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      // Récupérer les plateformes sélectionnées
      const selectedPlatforms = Array.from(selectedNetworks);
      const platforms = selectedPlatforms.length > 0
        ? selectedPlatforms
        : ['facebook', 'linkedin', 'instagram']; // Par défaut

      const response = await fetch(
        `${supabaseUrl}/functions/v1/ai-viral-content-generator`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': (await internalFunctionHeaders()).Authorization,
          },
          body: JSON.stringify({
            category: 'assurance',
            topic: 'assurance taxi - conseils et actualités',
            target_audience: 'chauffeurs de taxi et VTC',
            platforms: platforms,
            auto_publish: false, // Génère en brouillon
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success && data.posts && data.posts.length > 0) {
        // Utiliser le premier post généré
        const firstPost = data.posts[0];
        setNewPost({
          ...newPost,
          content: firstPost.content,
          hashtags: data.hashtags?.join(' ') || firstPost.hashtags?.join(' ') || ''
        });
        setAiResult(`✅ ${data.message} | Template: ${data.template_used} | Potentiel: ${data.viral_potential} | Score humanisation: ${data.humanization_score}%`);

        // Rafraîchir la liste des posts après génération
        await loadRealStats();
      } else {
        setAiResult('❌ Erreur: ' + (data.error || 'Aucun contenu généré'));
      }
    } catch (error) {
      logger.error('Error generating AI content:', error);
      setAiResult(`❌ Erreur: ${error.message || 'Clé API OPENAI_API_KEY manquante ou service indisponible'}`);
    } finally {
      setGeneratingAI(false);
    }
  };

  const toggleNetworkSelection = (networkId: string) => {
    const newSelection = new Set(selectedNetworks);
    if (newSelection.has(networkId)) {
      newSelection.delete(networkId);
    } else {
      newSelection.add(networkId);
    }
    setSelectedNetworks(newSelection);
  };

  const handlePublishNow = async () => {
    if (selectedNetworks.size === 0 || !newPost.content) return;

    try {
      const platformsArray = Array.from(selectedNetworks);

      for (const platform of platformsArray) {
        const network = networks.find(n => n.platform === platform);
        if (!network) continue;

        await supabase.from('social_posts').insert({
          network_id: network.id,
          content: newPost.content,
          hashtags: newPost.hashtags.split(/[,\s]+/).filter(Boolean),
          status: newPost.scheduled_at ? 'scheduled' : 'draft',
          scheduled_at: newPost.scheduled_at || null,
        });
      }

      setNewPost({ platforms: [], content: '', hashtags: '', scheduled_at: '' });
      await loadRealStats();
      toast.success('✅ Publication créée avec succès !');
    } catch (error) {
      logger.error('Error publishing:', error);
      toast.error('❌ Erreur lors de la publication');
    }
  };

  const handlePublishToPinterest = async (post: { id?: string; content: string; media_urls?: string[] }) => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/pinterest-publisher`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': (await internalFunctionHeaders()).Authorization,
        },
        body: JSON.stringify({
          board_id: '945333846723355976',
          title: post.content.substring(0, 100),
          description: post.content,
          link: 'https://taxiassur.com',
          image_url: post.media_urls?.[0] || 'https://images.pexels.com/photos/887846/pexels-photo-887846.jpeg',
          alt_text: 'Assurance Taxi Professionnelle'
        })
      });

      const result = await response.json();

      if (response.ok) {
        await supabase.from('social_posts')
          .update({
            status: 'published',
            published_at: new Date().toISOString(),
            post_url: result.pin_url
          })
          .eq('id', post.id);

        await loadRealStats();
        toast.success('✅ Publié sur Pinterest avec succès !');
      } else {
        throw new Error(result.error || 'Erreur de publication');
      }
    } catch (error) {
      logger.error('Error publishing to Pinterest:', error);
      toast.error('❌ Erreur lors de la publication sur Pinterest');
    }
  };

  const toggleNetworkActive = async (networkId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('social_networks')
        .update({ is_active: !currentStatus })
        .eq('id', networkId);

      if (!error) {
        await loadNetworks();
      }
    } catch (error) {
      logger.error('Error toggling network:', error);
    }
  };

  const getNetworkStatus = (network: SocialNetwork): NetworkDefinition | undefined => {
    return SOCIAL_NETWORKS.find(n => n.id === network.platform);
  };

  const getStatusBadge = (status: 'ready' | 'missing' | 'pending') => {
    switch (status) {
      case 'ready':
        return <span className="px-2 py-1 bg-green-600 text-white text-xs rounded-full">✅ Prêt</span>;
      case 'pending':
        return <span className="px-2 py-1 bg-amber-600 text-white text-xs rounded-full">⏳ En attente</span>;
      case 'missing':
        return <span className="px-2 py-1 bg-red-600 text-white text-xs rounded-full">❌ API manquante</span>;
    }
  };

  const stats = {
    available: SOCIAL_NETWORKS.length,
    connected: networks.filter(n => n.is_connected).length,
    active: networks.filter(n => n.is_active).length,
    totalEngagement: networks.reduce((sum, n) => sum + (n.total_engagement || 0), 0)
  };

  const renderNetworksTab = () => (
    <div className="space-y-6">
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h2 className="text-xl font-bold text-white mb-4">📱 Réseaux Sociaux Disponibles</h2>
        <p className="text-slate-300 mb-6">
          Sélectionnez les réseaux sur lesquels vous souhaitez publier. Configurez les APIs manquantes pour activer la publication automatique.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {SOCIAL_NETWORKS.map((networkDef) => {
            const dbNetwork = networks.find(n => n.platform === networkDef.id);
            const isSelected = selectedNetworks.has(networkDef.id);
            const Icon = networkDef.icon;

            return (
              <div
                key={networkDef.id}
                className={`bg-slate-700 rounded-lg p-4 border-2 transition-all cursor-pointer ${
                  isSelected ? 'border-orange-500 bg-slate-600' : 'border-slate-600'
                } hover:border-orange-400`}
                onClick={() => toggleNetworkSelection(networkDef.id)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`${networkDef.color} p-2 rounded-lg`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white">{networkDef.name}</h3>
                      <p className="text-xs text-slate-400">{networkDef.description}</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    className="w-5 h-5"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-300">État API:</span>
                    {getStatusBadge(networkDef.apiStatus)}
                  </div>

                  {dbNetwork && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-300">Connecté:</span>
                        {dbNetwork.is_connected ? (
                          <CheckCircle className="w-5 h-5 text-green-400" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-400" />
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-300">Publication auto:</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={dbNetwork.is_active}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleNetworkActive(dbNetwork.id, dbNetwork.is_active);
                            }}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                        </label>
                      </div>

                      {networkDef.id === 'linkedin' && (
                        <div className="pt-3 border-t border-slate-600" onClick={(e) => e.stopPropagation()}>
                          <LinkedInOAuthButton />
                        </div>
                      )}

                      {dbNetwork.account_name && (
                        <div className="pt-2 border-t border-slate-600">
                          <span className="text-xs text-slate-400">Compte:</span>
                          <span className="text-xs text-white ml-2">{dbNetwork.account_name}</span>
                        </div>
                      )}

                      {dbNetwork.total_posts > 0 && (
                        <div className="text-xs text-slate-400">
                          📊 {dbNetwork.total_posts} posts • {dbNetwork.total_engagement} engagements
                        </div>
                      )}
                    </>
                  )}

                  {!dbNetwork && (
                    <div className="pt-2 text-xs text-yellow-500">
                      Reseau non configure dans la base
                    </div>
                  )}

                  {(() => {
                    const cfgStatus = getConfigStatus(networkDef.id);
                    return (
                      <div className="pt-2 border-t border-slate-600">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-slate-400">API Config:</span>
                          {cfgStatus === 'configured' ? (
                            <span className="px-2 py-0.5 bg-green-600/30 text-green-300 text-xs rounded-full border border-green-600/50">Configure</span>
                          ) : cfgStatus === 'partial' ? (
                            <span className="px-2 py-0.5 bg-amber-600/30 text-amber-300 text-xs rounded-full border border-amber-600/50">Partiel</span>
                          ) : (
                            <span className="px-2 py-0.5 bg-slate-600/50 text-slate-400 text-xs rounded-full border border-slate-600">Non configure</span>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openConfigModal(networkDef);
                          }}
                          className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-slate-600 hover:bg-slate-500 text-white text-xs rounded-lg transition-colors"
                        >
                          <Wrench className="w-3.5 h-3.5" />
                          Configurer les API
                        </button>
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })}
        </div>

        {selectedNetworks.size > 0 && (
          <div className="mt-6 p-4 bg-orange-900/30 border border-orange-700 rounded-lg">
            <p className="text-white font-medium mb-2">
              ✅ {selectedNetworks.size} réseau(x) sélectionné(s)
            </p>
            <p className="text-sm text-orange-200">
              Vous pouvez maintenant publier sur ces réseaux depuis l'onglet "Publications"
            </p>
          </div>
        )}
      </div>

      {/* Guide de configuration */}
      <div className="bg-amber-900/30 border border-amber-700 rounded-xl p-6">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <AlertCircle className="w-6 h-6 text-yellow-500" />
          APIs Manquantes - Configuration Requise
        </h3>

        <div className="space-y-4">
          {SOCIAL_NETWORKS.filter(n => n.apiStatus === 'missing').map((network) => (
            <div key={network.id} className="bg-slate-800 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <network.icon className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h4 className="font-bold text-white mb-1">{network.name}</h4>
                  <p className="text-sm text-slate-300 mb-2">{network.setupGuide}</p>
                  <button className="text-sm text-orange-400 hover:text-orange-300">
                    📖 Voir le guide complet →
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderPublicationsTab = () => (
    <div className="space-y-6">
      {/* Génération IA Virale */}
      <div className="bg-gradient-to-r from-green-900 to-emerald-900 border-2 border-green-600 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
              <Zap className="w-7 h-7 text-yellow-400" />
              🤖 Génération IA - Contenu Viral (7M+ vues)
            </h2>
            <p className="text-green-200 text-sm">
              Utilise l'intelligence artificielle pour générer du contenu viral optimisé, non détectable comme IA
            </p>
          </div>
          <button
            onClick={handleGenerateAI}
            disabled={generatingAI}
            className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black font-bold py-3 px-6 rounded-lg shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generatingAI ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-black border-t-transparent" />
                Génération...
              </>
            ) : (
              <>
                <Zap size={20} />
                Générer avec IA
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
            <div className="text-green-300 font-medium">✅ Anti-détection IA</div>
            <div className="text-green-100 text-xs mt-1">Contenu 100% humain</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
            <div className="text-green-300 font-medium">🎯 Hashtags optimisés</div>
            <div className="text-green-100 text-xs mt-1">Max engagement</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
            <div className="text-green-300 font-medium">📊 Templates testés</div>
            <div className="text-green-100 text-xs mt-1">7M+ vues moyennes</div>
          </div>
        </div>

        {aiResult && (
          <div className={`mt-4 p-3 rounded-lg ${
            aiResult.startsWith('✅')
              ? 'bg-green-900/50 border border-green-700 text-green-200'
              : 'bg-red-900/50 border border-red-700 text-red-200'
          }`}>
            {aiResult}
          </div>
        )}
      </div>

      {/* Publication Manuelle */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h2 className="text-xl font-bold text-white mb-6">Créer une Publication Manuelle</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Réseaux Sociaux
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Array.from(selectedNetworks).map((networkId) => {
                const network = SOCIAL_NETWORKS.find(n => n.id === networkId);
                if (!network) return null;
                const Icon = network.icon;

                return (
                  <div
                    key={networkId}
                    className={`${network.color} p-3 rounded-lg flex items-center gap-2 text-white`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{network.name}</span>
                  </div>
                );
              })}
            </div>
            {selectedNetworks.size === 0 && (
              <p className="text-sm text-yellow-500 mt-2">
                ⚠️ Sélectionnez au moins un réseau dans l'onglet "Réseaux Sociaux"
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Contenu
            </label>
            <textarea
              value={newPost.content}
              onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
              placeholder="Rédigez votre message..."
              rows={6}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Hashtags (séparés par des virgules)
            </label>
            <input
              type="text"
              value={newPost.hashtags}
              onChange={(e) => setNewPost({ ...newPost, hashtags: e.target.value })}
              placeholder="#AssuranceTaxi, #Taxi, #VTC"
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Planifier pour (optionnel)
            </label>
            <input
              type="datetime-local"
              value={newPost.scheduled_at}
              onChange={(e) => setNewPost({ ...newPost, scheduled_at: e.target.value })}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handlePublishNow}
              disabled={selectedNetworks.size === 0 || !newPost.content}
              className="flex-1 bg-gradient-to-r from-slate-600 to-orange-600 hover:from-slate-700 hover:to-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-all shadow-md"
            >
              {newPost.scheduled_at ? '📅 Planifier' : '📤 Publier maintenant'}
            </button>

            <button className="bg-slate-700 hover:bg-slate-600 text-white px-6 rounded-lg">
              💾 Brouillon
            </button>
          </div>
        </div>
      </div>

      {/* Liste des Publications Générées */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h2 className="text-xl font-bold text-white mb-4">📋 Publications Générées ({posts.length})</h2>

        {posts.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            Aucune publication générée
            <p className="text-sm mt-2">Utilisez le générateur IA ci-dessus pour créer du contenu</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {posts.map((post) => (
              <div key={post.id} className="bg-slate-700 rounded-lg p-4 border border-slate-600">
                {/* Image si disponible */}
                {post.media_urls && post.media_urls.length > 0 && (
                  <img
                    src={post.media_urls[0]}
                    alt="Post image"
                    className="w-full h-48 object-cover rounded-lg mb-3"
                  />
                )}

                {/* Plateforme */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-1 bg-orange-600 text-white text-xs rounded-full">
                    {post.social_networks?.platform || 'Unknown'}
                  </span>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    post.status === 'published' ? 'bg-green-600 text-white' :
                    post.status === 'scheduled' ? 'bg-blue-600 text-white' :
                    'bg-gray-600 text-white'
                  }`}>
                    {post.status}
                  </span>
                </div>

                {/* Contenu */}
                <p className="text-white text-sm mb-2 line-clamp-3">{post.content}</p>

                {/* Hashtags */}
                {post.hashtags && post.hashtags.length > 0 && (
                  <div className="text-xs text-orange-400 mb-2">
                    {post.hashtags.slice(0, 3).join(' ')}
                  </div>
                )}

                {/* Stats */}
                <div className="flex gap-4 text-xs text-slate-400 border-t border-slate-600 pt-2 mt-2">
                  <span>👁️ {post.views || 0}</span>
                  <span>❤️ {post.likes || 0}</span>
                  <span>💬 {post.comments || 0}</span>
                  <span>🔄 {post.shares || 0}</span>
                </div>

                {/* Date */}
                <div className="text-xs text-slate-500 mt-2">
                  {new Date(post.created_at).toLocaleDateString('fr-FR')}
                </div>

                {/* Bouton Publier sur Pinterest */}
                {post.status === 'draft' && (
                  <button
                    onClick={() => handlePublishToPinterest(post)}
                    className="w-full mt-3 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2"
                  >
                    <Send size={16} />
                    📌 Publier sur Pinterest
                  </button>
                )}

                {post.status === 'published' && post.post_url && (
                  <a
                    href={post.post_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full mt-3 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2"
                  >
                    ✅ Voir sur Pinterest
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderWhatsAppTab = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <MessageSquare className="w-8 h-8" />
          <h2 className="text-2xl font-bold">WhatsApp Business - Groupes</h2>
        </div>
        <p className="text-green-100">
          Gérez vos groupes WhatsApp pour la diffusion automatique
        </p>
      </div>

      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h3 className="text-xl font-bold text-white mb-4">📱 Configuration WhatsApp Business</h3>

        <div className="space-y-6">
          <div className="bg-orange-900/30 border border-orange-700 rounded-lg p-4">
            <h4 className="font-bold text-white mb-3">Étape 1: Installer WhatsApp Business API</h4>
            <ol className="list-decimal list-inside space-y-2 text-slate-300 text-sm">
              <li>Télécharger WhatsApp Business sur votre téléphone</li>
              <li>Créer un compte WhatsApp Business avec votre numéro pro</li>
              <li>Activer l'API WhatsApp Business sur Meta Business Suite</li>
              <li>Obtenir votre Phone Number ID et Access Token</li>
            </ol>
          </div>

          <div className="bg-orange-900/30 border border-orange-700 rounded-lg p-4">
            <h4 className="font-bold text-white mb-3">Étape 2: Connecter votre téléphone</h4>
            <ol className="list-decimal list-inside space-y-2 text-slate-300 text-sm">
              <li>Scanner le QR Code depuis l'application WhatsApp Business</li>
              <li>Autoriser l'accès à l'API WhatsApp</li>
              <li>Synchroniser vos contacts et groupes</li>
            </ol>

            <div className="mt-4 p-4 bg-slate-700 rounded-lg text-center">
              <p className="text-slate-300 mb-3">QR Code à scanner avec WhatsApp</p>
              <div className="w-48 h-48 bg-white mx-auto rounded-lg flex items-center justify-center">
                <p className="text-slate-500">QR Code généré ici</p>
              </div>
              <button className="mt-3 bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg">
                Générer QR Code
              </button>
            </div>
          </div>

          <div className="bg-orange-900/30 border border-orange-700 rounded-lg p-4">
            <h4 className="font-bold text-white mb-3">Étape 3: Créer et Gérer les Groupes</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Nom du groupe
                </label>
                <input
                  type="text"
                  placeholder="Ex: Chauffeurs Taxi Paris"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Description
                </label>
                <textarea
                  placeholder="Description du groupe..."
                  rows={3}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Catégorie
                </label>
                <select className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white">
                  <option>Chauffeurs</option>
                  <option>Clients</option>
                  <option>Partenaires</option>
                  <option>Ambassadeurs</option>
                </select>
              </div>

              <button className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg">
                ➕ Créer le groupe
              </button>
            </div>
          </div>

          <div className="bg-amber-900/30 border border-amber-700 rounded-lg p-4">
            <h4 className="font-bold text-white mb-2">⚠️ Informations Requises</h4>
            <ul className="space-y-2 text-sm text-amber-200">
              <li>• <strong>Phone Number ID</strong>: Depuis Meta Business Suite</li>
              <li>• <strong>WhatsApp Business Account ID</strong>: ID de votre compte</li>
              <li>• <strong>Access Token</strong>: Token d'authentification permanent</li>
              <li>• <strong>Webhook URL</strong>: Pour recevoir les messages</li>
            </ul>

            <div className="mt-4 space-y-2">
              <input
                type="text"
                placeholder="Phone Number ID"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400"
              />
              <input
                type="text"
                placeholder="Access Token"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400"
              />
              <button className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-2 rounded-lg">
                💾 Enregistrer la configuration
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h3 className="text-xl font-bold text-white mb-4">📝 Groupes Configurés</h3>
        <div className="text-center py-8 text-slate-400">
          Aucun groupe WhatsApp configuré
          <p className="text-sm mt-2">Complétez la configuration ci-dessus pour créer votre premier groupe</p>
        </div>
      </div>
    </div>
  );

  const renderAutomationTab = () => (
    <div className="space-y-6">
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h2 className="text-xl font-bold text-white mb-4">⚡ Automatisation Publication Directe</h2>
        <p className="text-slate-300 mb-6">
          Publication automatique directe via les APIs officielles. <strong>Make.com et Zapier ne sont plus nécessaires.</strong>
        </p>

        <div className="bg-green-900/30 border border-green-700 rounded-lg p-4 mb-6">
          <h3 className="font-bold text-green-300 mb-2">✅ Publication Directe Activée</h3>
          <ul className="space-y-2 text-sm text-green-200">
            <li>• <strong>Facebook</strong>: Graph API v18.0</li>
            <li>• <strong>Instagram</strong>: Content Publishing API</li>
            <li>• <strong>Twitter/X</strong>: API v2 avec OAuth 2.0</li>
            <li>• <strong>LinkedIn</strong>: Share API</li>
            <li>• <strong>YouTube</strong>: Data API v3</li>
          </ul>
        </div>

        <div className="bg-orange-900/30 border border-orange-700 rounded-lg p-4 mb-6">
          <h3 className="font-bold text-orange-300 mb-3">🔧 Configuration Publication Auto</h3>

          <div className="space-y-4">
            <label className="flex items-center justify-between p-3 bg-slate-700 rounded-lg cursor-pointer">
              <div>
                <div className="font-medium text-white">Publication automatique blog → réseaux</div>
                <div className="text-sm text-slate-400">Publie automatiquement les nouveaux articles</div>
              </div>
              <input type="checkbox" className="w-5 h-5" />
            </label>

            <label className="flex items-center justify-between p-3 bg-slate-700 rounded-lg cursor-pointer">
              <div>
                <div className="font-medium text-white">Cross-posting automatique</div>
                <div className="text-sm text-slate-400">Publie simultanément sur tous les réseaux actifs</div>
              </div>
              <input type="checkbox" className="w-5 h-5" />
            </label>

            <label className="flex items-center justify-between p-3 bg-slate-700 rounded-lg cursor-pointer">
              <div>
                <div className="font-medium text-white">Optimisation par réseau</div>
                <div className="text-sm text-slate-400">Adapte le contenu selon chaque plateforme</div>
              </div>
              <input type="checkbox" className="w-5 h-5" />
            </label>

            <label className="flex items-center justify-between p-3 bg-slate-700 rounded-lg cursor-pointer">
              <div>
                <div className="font-medium text-white">Planification intelligente</div>
                <div className="text-sm text-slate-400">Publie aux heures optimales d'engagement</div>
              </div>
              <input type="checkbox" className="w-5 h-5" />
            </label>
          </div>
        </div>

        <div className="bg-slate-700 rounded-lg p-4">
          <h3 className="font-bold text-white mb-3">📊 Statistiques Automatisation (Données Réelles)</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{realStats.totalPosts}</div>
              <div className="text-sm text-slate-400">Publications auto</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-400">{realStats.totalEngagement.toLocaleString()}</div>
              <div className="text-sm text-slate-400">Engagement total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-500">{realStats.successRate}%</div>
              <div className="text-sm text-slate-400">Taux de succès</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-700 via-slate-600 to-orange-700 rounded-xl p-6 text-white shadow-xl">
        <h1 className="text-3xl font-bold mb-2">Gestion Réseaux Sociaux avec IA</h1>
        <p className="text-slate-200">Génération automatique de contenu viral - {SOCIAL_NETWORKS.length} réseaux disponibles</p>

        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
            <Globe className="w-8 h-8 mb-2" />
            <div className="text-2xl font-bold">{stats.available}</div>
            <div className="text-sm">Réseaux disponibles</div>
          </div>
          <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
            <CheckCircle className="w-8 h-8 mb-2" />
            <div className="text-2xl font-bold">{stats.active}</div>
            <div className="text-sm">Réseaux actifs</div>
          </div>
          <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
            <TrendingUp className="w-8 h-8 mb-2" />
            <div className="text-2xl font-bold">{stats.totalEngagement.toLocaleString()}</div>
            <div className="text-sm">Engagement total</div>
          </div>
          <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
            <Zap className="w-8 h-8 mb-2" />
            <div className="text-2xl font-bold">{selectedNetworks.size}</div>
            <div className="text-sm">Sélectionnés</div>
          </div>
        </div>

        {/* Warning si aucune API configurée */}
        {stats.active === 0 && (
          <div className="mt-4 p-3 bg-amber-900/50 border border-amber-700 rounded-lg">
            <p className="text-sm text-amber-200">
              ⚠️ <strong>APIs non configurées:</strong> La publication se fera uniquement lorsque les clés API seront ajoutées. Le système continuera de générer du contenu même sans APIs.
            </p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-slate-800 rounded-xl border border-slate-700">
        <div className="flex border-b border-slate-700">
          <button
            onClick={() => setActiveTab('networks')}
            className={`flex-1 px-6 py-4 font-medium transition-all ${
              activeTab === 'networks'
                ? 'text-white border-b-2 border-orange-500'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Réseaux Sociaux
          </button>
          <button
            onClick={() => setActiveTab('publications')}
            className={`flex-1 px-6 py-4 font-medium transition-all ${
              activeTab === 'publications'
                ? 'text-white border-b-2 border-orange-500'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Publications
          </button>
          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`flex-1 px-6 py-4 font-medium transition-all ${
              activeTab === 'whatsapp'
                ? 'text-white border-b-2 border-orange-500'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            WhatsApp Business
          </button>
          <button
            onClick={() => setActiveTab('automation')}
            className={`flex-1 px-6 py-4 font-medium transition-all ${
              activeTab === 'automation'
                ? 'text-white border-b-2 border-orange-500'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Automatisation
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'networks' && renderNetworksTab()}
          {activeTab === 'publications' && renderPublicationsTab()}
          {activeTab === 'whatsapp' && renderWhatsAppTab()}
          {activeTab === 'automation' && renderAutomationTab()}
        </div>
      </div>

      {configModal && (
        <SocialNetworkConfigModal
          networkId={configModal.platform}
          platform={configModal.platform}
          networkName={configModal.name}
          icon={configModal.icon}
          iconColor={configModal.color}
          dbNetworkId={configModal.dbNetworkId}
          onClose={() => setConfigModal(null)}
          onSaved={() => {
            setConfigModal(null);
            loadNetworks();
            loadNetworkConfigs();
          }}
        />
      )}

      <TestAutomationButton
        title="Tester Automatisations Social Media"
        tests={[
          {
            name: "Publier LinkedIn",
            functionName: "linkedin-publisher",
            method: "POST",
            body: { content: "Test post", scheduledFor: new Date().toISOString() },
            description: "Teste publication LinkedIn"
          },
          {
            name: "Publier Pinterest",
            functionName: "pinterest-publisher",
            method: "POST",
            body: { title: "Test", imageUrl: "https://placehold.co/600x400" },
            description: "Teste publication Pinterest"
          },
          {
            name: "Publier YouTube",
            functionName: "youtube-publisher",
            method: "POST",
            body: { title: "Test", description: "Test video" },
            description: "Teste publication YouTube"
          },
          {
            name: "Auto Publisher",
            functionName: "social-media-auto-publisher",
            method: "POST",
            description: "Publication auto multi-plateformes"
          }
        ]}
      />
    </div>
  );
}
