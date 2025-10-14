import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  Facebook, Instagram, Twitter, Youtube, Linkedin, MessageSquare,
  Send, Hash, CheckCircle, Clock, AlertCircle, XCircle,
  Plus, Settings, BarChart3, Globe, Smartphone, Mail, Video,
  Users, TrendingUp, Calendar, Award, Zap, Check, X
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
}

interface NetworkDefinition {
  id: string;
  name: string;
  icon: any;
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
    color: 'bg-blue-600',
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
    apiStatus: 'ready',
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
    apiStatus: 'ready',
    requiresAuth: true,
    description: 'Publications Twitter/X',
    setupGuide: 'Authentification OAuth 2.0 Twitter API v2'
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: Linkedin,
    color: 'bg-blue-700',
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
    apiStatus: 'ready',
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
    color: 'bg-blue-500',
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
  const [newPost, setNewPost] = useState({
    platforms: [] as string[],
    content: '',
    hashtags: '',
    scheduled_at: ''
  });

  useEffect(() => {
    loadNetworks();
  }, []);

  const loadNetworks = async () => {
    try {
      const { data } = await supabase
        .from('social_networks')
        .select('*')
        .order('platform');

      if (data) setNetworks(data);
    } catch (error) {
      console.error('Error loading networks:', error);
    } finally {
      setLoading(false);
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
      console.error('Error toggling network:', error);
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
                  isSelected ? 'border-blue-500 bg-slate-600' : 'border-slate-600'
                } hover:border-blue-400`}
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
                    <div className="pt-2 text-xs text-amber-400">
                      ⚠️ Réseau non configuré - Cliquez pour voir le guide
                    </div>
                  )}

                  {networkDef.apiStatus === 'missing' && (
                    <div className="pt-2 border-t border-slate-600">
                      <p className="text-xs text-red-300">
                        🔴 Configuration requise: {networkDef.setupGuide}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {selectedNetworks.size > 0 && (
          <div className="mt-6 p-4 bg-blue-900/30 border border-blue-700 rounded-lg">
            <p className="text-white font-medium mb-2">
              ✅ {selectedNetworks.size} réseau(x) sélectionné(s)
            </p>
            <p className="text-sm text-blue-200">
              Vous pouvez maintenant publier sur ces réseaux depuis l'onglet "Publications"
            </p>
          </div>
        )}
      </div>

      {/* Guide de configuration */}
      <div className="bg-amber-900/30 border border-amber-700 rounded-xl p-6">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <AlertCircle className="w-6 h-6 text-amber-400" />
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
                  <button className="text-sm text-blue-400 hover:text-blue-300">
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
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h2 className="text-xl font-bold text-white mb-6">Créer une Publication</h2>

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
              <p className="text-sm text-amber-400 mt-2">
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
              disabled={selectedNetworks.size === 0 || !newPost.content}
              className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-all"
            >
              {newPost.scheduled_at ? '📅 Planifier' : '📤 Publier maintenant'}
            </button>

            <button className="bg-slate-700 hover:bg-slate-600 text-white px-6 rounded-lg">
              💾 Brouillon
            </button>
          </div>
        </div>
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
          <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4">
            <h4 className="font-bold text-white mb-3">Étape 1: Installer WhatsApp Business API</h4>
            <ol className="list-decimal list-inside space-y-2 text-slate-300 text-sm">
              <li>Télécharger WhatsApp Business sur votre téléphone</li>
              <li>Créer un compte WhatsApp Business avec votre numéro pro</li>
              <li>Activer l'API WhatsApp Business sur Meta Business Suite</li>
              <li>Obtenir votre Phone Number ID et Access Token</li>
            </ol>
          </div>

          <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4">
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

          <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4">
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
              <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-lg">
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

        <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 mb-6">
          <h3 className="font-bold text-blue-300 mb-3">🔧 Configuration Publication Auto</h3>

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
          <h3 className="font-bold text-white mb-3">📊 Statistiques Automatisation</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">247</div>
              <div className="text-sm text-slate-400">Publications auto</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">12.5K</div>
              <div className="text-sm text-slate-400">Engagement total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-400">98%</div>
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-6 text-white shadow-xl">
        <h1 className="text-3xl font-bold mb-2">Gestion Réseaux Sociaux</h1>
        <p className="text-purple-100">Publication automatique directe sur {SOCIAL_NETWORKS.length} réseaux sociaux</p>

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
            <Users className="w-8 h-8 mb-2" />
            <div className="text-2xl font-bold">{selectedNetworks.size}</div>
            <div className="text-sm">Sélectionnés</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-slate-800 rounded-xl border border-slate-700">
        <div className="flex border-b border-slate-700">
          <button
            onClick={() => setActiveTab('networks')}
            className={`flex-1 px-6 py-4 font-medium transition-all ${
              activeTab === 'networks'
                ? 'text-white border-b-2 border-blue-500'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Réseaux Sociaux
          </button>
          <button
            onClick={() => setActiveTab('publications')}
            className={`flex-1 px-6 py-4 font-medium transition-all ${
              activeTab === 'publications'
                ? 'text-white border-b-2 border-blue-500'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Publications
          </button>
          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`flex-1 px-6 py-4 font-medium transition-all ${
              activeTab === 'whatsapp'
                ? 'text-white border-b-2 border-blue-500'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            WhatsApp Business
          </button>
          <button
            onClick={() => setActiveTab('automation')}
            className={`flex-1 px-6 py-4 font-medium transition-all ${
              activeTab === 'automation'
                ? 'text-white border-b-2 border-blue-500'
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
    </div>
  );
}
