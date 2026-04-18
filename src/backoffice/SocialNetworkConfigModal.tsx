import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { logger } from '@/lib/logger';
import {
  X, Save, Eye, EyeOff, CheckCircle, AlertTriangle,
  ExternalLink, RefreshCw, Trash2,
  type LucideIcon
} from 'lucide-react';

interface ConfigField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'url' | 'number' | 'select' | 'textarea';
  placeholder: string;
  required: boolean;
  helpText?: string;
  options?: { value: string; label: string }[];
}

interface NetworkConfigDefinition {
  title: string;
  docsUrl: string;
  fields: ConfigField[];
  instructions: string[];
}

const NETWORK_CONFIGS: Record<string, NetworkConfigDefinition> = {
  facebook: {
    title: 'Configuration Facebook',
    docsUrl: 'https://developers.facebook.com/docs/graph-api',
    fields: [
      { key: 'app_id', label: 'App ID', type: 'text', placeholder: 'Ex: 123456789012345', required: true, helpText: 'Depuis Facebook Developers > Votre App > Parametres' },
      { key: 'app_secret', label: 'App Secret', type: 'password', placeholder: 'Votre App Secret', required: true },
      { key: 'page_id', label: 'Page ID', type: 'text', placeholder: 'Ex: 102345678901234', required: true, helpText: 'ID de votre page Facebook Business' },
      { key: 'page_access_token', label: 'Page Access Token', type: 'password', placeholder: 'Token d\'acces permanent de la page', required: true },
      { key: 'api_version', label: 'Version API', type: 'select', placeholder: '', required: false, options: [
        { value: 'v18.0', label: 'v18.0 (Recommande)' },
        { value: 'v19.0', label: 'v19.0' },
        { value: 'v20.0', label: 'v20.0' },
      ]},
    ],
    instructions: [
      'Creez une application sur developers.facebook.com',
      'Ajoutez le produit "Pages" a votre application',
      'Generez un token d\'acces permanent pour votre page',
      'Copiez l\'App ID, App Secret et Page Access Token',
    ],
  },
  instagram: {
    title: 'Configuration Instagram Business',
    docsUrl: 'https://developers.facebook.com/docs/instagram-api',
    fields: [
      { key: 'business_account_id', label: 'Instagram Business Account ID', type: 'text', placeholder: 'Ex: 17841400000000000', required: true, helpText: 'ID du compte Instagram Business (via Facebook Graph API)' },
      { key: 'facebook_page_id', label: 'Facebook Page ID liee', type: 'text', placeholder: 'ID de la page Facebook liee', required: true },
      { key: 'access_token', label: 'Access Token (via Facebook)', type: 'password', placeholder: 'Token Facebook avec permissions Instagram', required: true },
      { key: 'default_location', label: 'Lieu par defaut', type: 'text', placeholder: 'Ex: Paris, France', required: false },
    ],
    instructions: [
      'Votre compte Instagram doit etre un compte Business',
      'Liez votre compte Instagram a une Page Facebook',
      'Utilisez le meme token Facebook avec les permissions instagram_basic et instagram_content_publish',
      'Recuperez votre Business Account ID via l\'API Graph',
    ],
  },
  twitter: {
    title: 'Configuration Twitter / X',
    docsUrl: 'https://developer.twitter.com/en/docs/twitter-api',
    fields: [
      { key: 'api_key', label: 'API Key (Consumer Key)', type: 'password', placeholder: 'Votre API Key', required: true },
      { key: 'api_secret', label: 'API Secret (Consumer Secret)', type: 'password', placeholder: 'Votre API Secret', required: true },
      { key: 'access_token', label: 'Access Token', type: 'password', placeholder: 'Token d\'acces OAuth 1.0a', required: true },
      { key: 'access_token_secret', label: 'Access Token Secret', type: 'password', placeholder: 'Secret du token d\'acces', required: true },
      { key: 'bearer_token', label: 'Bearer Token', type: 'password', placeholder: 'Bearer Token (API v2)', required: false, helpText: 'Pour les requetes en lecture seule' },
      { key: 'username', label: 'Nom d\'utilisateur (@)', type: 'text', placeholder: '@votre_compte', required: false },
    ],
    instructions: [
      'Creez un projet sur developer.twitter.com',
      'Activez l\'acces "Elevated" ou "Basic" (payant)',
      'Generez les cles API et tokens dans le portail developpeur',
      'Activez les permissions de lecture ET ecriture',
    ],
  },
  linkedin: {
    title: 'Configuration LinkedIn',
    docsUrl: 'https://learn.microsoft.com/en-us/linkedin/marketing/',
    fields: [
      { key: 'client_id', label: 'Client ID', type: 'text', placeholder: 'Votre LinkedIn Client ID', required: true },
      { key: 'client_secret', label: 'Client Secret', type: 'password', placeholder: 'Votre Client Secret', required: true },
      { key: 'organization_id', label: 'Organization ID', type: 'text', placeholder: 'Ex: 12345678', required: false, helpText: 'Pour publier en tant que page entreprise' },
      { key: 'redirect_uri', label: 'Redirect URI', type: 'url', placeholder: 'https://votre-site.com/auth/callback/linkedin', required: true },
      { key: 'scope', label: 'Scopes', type: 'text', placeholder: 'openid profile w_member_social', required: false, helpText: 'Permissions OAuth separees par des espaces' },
    ],
    instructions: [
      'Creez une application sur linkedin.com/developers',
      'Ajoutez le produit "Share on LinkedIn" et "Sign In with LinkedIn using OpenID Connect"',
      'Configurez le Redirect URI dans les parametres OAuth',
      'Copiez le Client ID et Client Secret',
    ],
  },
  youtube: {
    title: 'Configuration YouTube',
    docsUrl: 'https://developers.google.com/youtube/v3',
    fields: [
      { key: 'client_id', label: 'Google Client ID', type: 'text', placeholder: 'xxxxx.apps.googleusercontent.com', required: true },
      { key: 'client_secret', label: 'Google Client Secret', type: 'password', placeholder: 'Votre Client Secret Google', required: true },
      { key: 'channel_id', label: 'Channel ID', type: 'text', placeholder: 'Ex: UCxxxxxxxxxxxxxxxx', required: true, helpText: 'ID de votre chaine YouTube' },
      { key: 'api_key', label: 'API Key (optionnel)', type: 'password', placeholder: 'Cle API pour les requetes publiques', required: false },
      { key: 'redirect_uri', label: 'Redirect URI', type: 'url', placeholder: 'https://votre-site.com/auth/callback/youtube', required: true },
    ],
    instructions: [
      'Creez un projet sur console.cloud.google.com',
      'Activez l\'API YouTube Data v3',
      'Creez des identifiants OAuth 2.0',
      'Configurez l\'ecran de consentement et le Redirect URI',
    ],
  },
  tiktok: {
    title: 'Configuration TikTok Business',
    docsUrl: 'https://developers.tiktok.com/doc/overview',
    fields: [
      { key: 'client_key', label: 'Client Key', type: 'text', placeholder: 'Votre TikTok Client Key', required: true },
      { key: 'client_secret', label: 'Client Secret', type: 'password', placeholder: 'Votre Client Secret', required: true },
      { key: 'creator_id', label: 'Creator ID (Open ID)', type: 'text', placeholder: 'ID du createur TikTok', required: false },
      { key: 'redirect_uri', label: 'Redirect URI', type: 'url', placeholder: 'https://votre-site.com/auth/callback/tiktok', required: true },
    ],
    instructions: [
      'Inscrivez-vous sur TikTok for Developers',
      'Creez une application et soumettez-la pour validation',
      'Activez les scopes video.upload et video.publish',
      'La validation TikTok peut prendre plusieurs jours',
    ],
  },
  pinterest: {
    title: 'Configuration Pinterest',
    docsUrl: 'https://developers.pinterest.com/docs/getting-started/',
    fields: [
      { key: 'app_id', label: 'App ID', type: 'text', placeholder: 'Votre Pinterest App ID', required: true },
      { key: 'app_secret', label: 'App Secret', type: 'password', placeholder: 'Votre App Secret', required: true },
      { key: 'board_id', label: 'Board ID par defaut', type: 'text', placeholder: 'Ex: 945333846723355976', required: false, helpText: 'ID du tableau Pinterest pour les publications' },
      { key: 'redirect_uri', label: 'Redirect URI', type: 'url', placeholder: 'https://votre-site.com/auth/callback/pinterest', required: true },
      { key: 'default_link', label: 'Lien par defaut', type: 'url', placeholder: 'https://taxiassur.com', required: false, helpText: 'Lien ajoute aux epingles par defaut' },
    ],
    instructions: [
      'Creez une application sur developers.pinterest.com',
      'Demandez l\'acces aux scopes pins:read et pins:write',
      'Configurez le Redirect URI OAuth',
      'Recuperez l\'ID de votre tableau principal',
    ],
  },
  telegram: {
    title: 'Configuration Telegram',
    docsUrl: 'https://core.telegram.org/bots/api',
    fields: [
      { key: 'bot_token', label: 'Bot Token', type: 'password', placeholder: 'Ex: 123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11', required: true, helpText: 'Obtenu via @BotFather sur Telegram' },
      { key: 'channel_id', label: 'Channel ID ou @username', type: 'text', placeholder: 'Ex: @votre_canal ou -1001234567890', required: true, helpText: 'ID du canal ou nom @canal public' },
      { key: 'parse_mode', label: 'Format des messages', type: 'select', placeholder: '', required: false, options: [
        { value: 'HTML', label: 'HTML' },
        { value: 'MarkdownV2', label: 'Markdown V2' },
        { value: 'Markdown', label: 'Markdown' },
      ]},
      { key: 'disable_notification', label: 'Notifications silencieuses', type: 'select', placeholder: '', required: false, options: [
        { value: 'false', label: 'Non (notifications actives)' },
        { value: 'true', label: 'Oui (silencieux)' },
      ]},
    ],
    instructions: [
      'Ouvrez Telegram et recherchez @BotFather',
      'Envoyez /newbot et suivez les instructions',
      'Copiez le Bot Token genere',
      'Ajoutez votre bot comme administrateur du canal',
    ],
  },
  whatsapp: {
    title: 'Configuration WhatsApp Business',
    docsUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api',
    fields: [
      { key: 'phone_number_id', label: 'Phone Number ID', type: 'text', placeholder: 'Ex: 123456789012345', required: true, helpText: 'Depuis Meta Business Suite > WhatsApp' },
      { key: 'business_account_id', label: 'WhatsApp Business Account ID', type: 'text', placeholder: 'ID du compte Business', required: true },
      { key: 'access_token', label: 'Access Token permanent', type: 'password', placeholder: 'Token d\'acces Meta', required: true },
      { key: 'webhook_verify_token', label: 'Webhook Verify Token', type: 'text', placeholder: 'Token de verification webhook', required: false, helpText: 'Pour la reception des messages entrants' },
      { key: 'phone_number', label: 'Numero de telephone', type: 'text', placeholder: '+33 6 12 34 56 78', required: false },
    ],
    instructions: [
      'Creez une application sur Meta Business Suite',
      'Ajoutez le produit WhatsApp',
      'Configurez un numero de telephone Business',
      'Generez un token d\'acces permanent (System User Token)',
    ],
  },
  snapchat: {
    title: 'Configuration Snapchat',
    docsUrl: 'https://marketingapi.snapchat.com/docs/',
    fields: [
      { key: 'client_id', label: 'Client ID', type: 'text', placeholder: 'Snap Marketing API Client ID', required: true },
      { key: 'client_secret', label: 'Client Secret', type: 'password', placeholder: 'Votre Client Secret', required: true },
      { key: 'organization_id', label: 'Organization ID', type: 'text', placeholder: 'ID de votre organisation Snap', required: true },
      { key: 'redirect_uri', label: 'Redirect URI', type: 'url', placeholder: 'https://votre-site.com/auth/callback/snapchat', required: true },
    ],
    instructions: [
      'Inscrivez-vous sur Snap Kit Developer Portal',
      'Creez une application Marketing API',
      'Soumettez votre application pour validation',
      'Configurez les scopes et Redirect URI',
    ],
  },
  reddit: {
    title: 'Configuration Reddit',
    docsUrl: 'https://www.reddit.com/dev/api/',
    fields: [
      { key: 'client_id', label: 'Client ID', type: 'text', placeholder: 'Votre Reddit App Client ID', required: true },
      { key: 'client_secret', label: 'Client Secret', type: 'password', placeholder: 'Votre Client Secret', required: true },
      { key: 'username', label: 'Nom d\'utilisateur Reddit', type: 'text', placeholder: 'u/votre_utilisateur', required: true },
      { key: 'subreddit', label: 'Subreddit par defaut', type: 'text', placeholder: 'r/taxi ou r/assurance', required: false, helpText: 'Subreddit cible pour les publications' },
      { key: 'user_agent', label: 'User Agent', type: 'text', placeholder: 'TaxiAssur/1.0 by u/username', required: false },
    ],
    instructions: [
      'Allez sur reddit.com/prefs/apps',
      'Creez une application de type "script"',
      'Notez le Client ID (sous le nom de l\'app) et le Secret',
      'Configurez le Redirect URI',
    ],
  },
  threads: {
    title: 'Configuration Threads',
    docsUrl: 'https://developers.facebook.com/docs/threads',
    fields: [
      { key: 'instagram_business_id', label: 'Instagram Business Account ID', type: 'text', placeholder: 'Utilise le meme compte Instagram', required: true },
      { key: 'access_token', label: 'Access Token (via Instagram)', type: 'password', placeholder: 'Token Facebook avec permissions threads_*', required: true },
    ],
    instructions: [
      'Threads utilise la meme authentification qu\'Instagram',
      'Votre compte Instagram Business doit etre lie',
      'Demandez les permissions threads_basic et threads_content_publish',
      'API Threads disponible depuis juin 2024',
    ],
  },
};

interface SocialNetworkConfigModalProps {
  networkId: string;
  platform: string;
  networkName: string;
  icon: LucideIcon;
  iconColor: string;
  dbNetworkId?: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function SocialNetworkConfigModal({
  platform,
  networkName,
  icon: Icon,
  iconColor,
  dbNetworkId,
  onClose,
  onSaved,
}: SocialNetworkConfigModalProps) {
  const [config, setConfig] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const networkConfig = NETWORK_CONFIGS[platform];

  useEffect(() => {
    loadConfig();
  }, [dbNetworkId, platform]);

  const loadConfig = async () => {
    try {
      if (dbNetworkId) {
        const { data } = await supabase
          .from('social_networks')
          .select('config, access_token, account_name, account_id')
          .eq('id', dbNetworkId)
          .maybeSingle();

        if (data?.config && typeof data.config === 'object') {
          setConfig(data.config as Record<string, string>);
        }
      }
    } catch (error) {
      logger.error('Error loading config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (key: string, value: string) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (dbNetworkId) {
        const { error } = await supabase
          .from('social_networks')
          .update({
            config: config,
            updated_at: new Date().toISOString(),
          })
          .eq('id', dbNetworkId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('social_networks')
          .upsert({
            platform,
            name: networkName,
            config: config,
            is_active: false,
            is_connected: false,
            auto_publish: false,
            url: '',
            category: 'social',
            updated_at: new Date().toISOString(),
          }, { onConflict: 'platform' });

        if (error) throw error;
      }

      toast.success('Configuration sauvegardee');
      onSaved();
    } catch (error) {
      logger.error('Error saving config:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const hasRequiredFields = networkConfig?.fields
        .filter(f => f.required)
        .every(f => config[f.key]?.trim());

      if (!hasRequiredFields) {
        setTestResult({ ok: false, message: 'Veuillez remplir tous les champs obligatoires' });
        return;
      }

      let storedToken: string | null = null;
      let storedExpiresAt: string | null = null;
      if (dbNetworkId) {
        const { data } = await supabase
          .from('social_networks')
          .select('access_token, token_expires_at')
          .eq('id', dbNetworkId)
          .maybeSingle();
        storedToken = data?.access_token ?? null;
        storedExpiresAt = data?.token_expires_at ?? null;
      }

      const hasToken =
        storedToken ||
        config.access_token ||
        config.page_access_token ||
        config.bot_token ||
        config.bearer_token;

      if (!hasToken) {
        setTestResult({
          ok: false,
          message: 'Token d\'acces manquant - Completez l\'authentification OAuth',
        });
        return;
      }

      if (storedExpiresAt && new Date(storedExpiresAt) < new Date()) {
        setTestResult({
          ok: false,
          message: 'Token expire - Relancez l\'authentification OAuth',
        });
        return;
      }

      if (platform === 'pinterest' && storedToken) {
        const res = await fetch('https://api.pinterest.com/v5/user_account', {
          headers: { Authorization: `Bearer ${storedToken}` },
        });
        if (res.ok) {
          const info = await res.json();
          setTestResult({
            ok: true,
            message: `Connexion Pinterest validee (@${info.username || 'compte'})`,
          });
        } else {
          setTestResult({
            ok: false,
            message: `Token Pinterest invalide (HTTP ${res.status}) - Relancez l'authentification`,
          });
        }
        return;
      }

      setTestResult({ ok: true, message: 'Configuration validee - Connexion possible' });
    } catch (error) {
      setTestResult({ ok: false, message: 'Erreur de test: ' + (error as Error).message });
    } finally {
      setTesting(false);
    }
  };

  const handleClearConfig = async () => {
    if (!confirm('Supprimer toute la configuration de ce reseau ?')) return;
    setConfig({});
    if (dbNetworkId) {
      await supabase
        .from('social_networks')
        .update({
          config: {},
          is_connected: false,
          access_token: null,
          refresh_token: null,
          token_expires_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', dbNetworkId);
      toast.success('Configuration supprimee');
      onSaved();
    }
  };

  const togglePasswordVisibility = (key: string) => {
    setShowPasswords(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const filledRequired = networkConfig?.fields
    .filter(f => f.required)
    .filter(f => config[f.key]?.trim()).length || 0;
  const totalRequired = networkConfig?.fields.filter(f => f.required).length || 0;
  const completionPercent = totalRequired > 0 ? Math.round((filledRequired / totalRequired) * 100) : 0;

  if (!networkConfig) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-slate-800 rounded-2xl p-8 max-w-md w-full border border-slate-700">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Configuration non disponible</h2>
            <p className="text-slate-400 mb-6">La configuration pour {networkName} n'est pas encore supportee.</p>
            <button onClick={onClose} className="bg-slate-600 hover:bg-slate-500 text-white px-6 py-2 rounded-lg">
              Fermer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-slate-700 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className={`${iconColor} p-2.5 rounded-xl`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{networkConfig.title}</h2>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-1.5 bg-slate-700 rounded-full w-32">
                  <div
                    className={`h-full rounded-full transition-all ${
                      completionPercent === 100 ? 'bg-green-500' : completionPercent > 0 ? 'bg-amber-500' : 'bg-slate-600'
                    }`}
                    style={{ width: `${completionPercent}%` }}
                  />
                </div>
                <span className="text-xs text-slate-400">{filledRequired}/{totalRequired} requis</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-180px)] p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
            </div>
          ) : (
            <>
              <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700">
                <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wide">
                  Guide de configuration
                </h3>
                <ol className="space-y-2">
                  {networkConfig.instructions.map((instruction, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-slate-400">
                      <span className="flex-shrink-0 w-5 h-5 bg-slate-700 text-slate-300 rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                        {i + 1}
                      </span>
                      {instruction}
                    </li>
                  ))}
                </ol>
                <a
                  href={networkConfig.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-3 text-sm text-orange-400 hover:text-orange-300"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Documentation officielle
                </a>
              </div>

              <div className="space-y-4">
                {networkConfig.fields.map((field) => (
                  <div key={field.key}>
                    <label className="flex items-center gap-1.5 text-sm font-medium text-slate-300 mb-1.5">
                      {field.label}
                      {field.required && <span className="text-red-400">*</span>}
                    </label>

                    {field.type === 'select' ? (
                      <select
                        value={config[field.key] || ''}
                        onChange={e => handleFieldChange(field.key, e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      >
                        <option value="">-- Choisir --</option>
                        {field.options?.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    ) : field.type === 'textarea' ? (
                      <textarea
                        value={config[field.key] || ''}
                        onChange={e => handleFieldChange(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        rows={3}
                        className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    ) : (
                      <div className="relative">
                        <input
                          type={field.type === 'password' && !showPasswords[field.key] ? 'password' : 'text'}
                          value={config[field.key] || ''}
                          onChange={e => handleFieldChange(field.key, e.target.value)}
                          placeholder={field.placeholder}
                          className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent pr-10"
                        />
                        {field.type === 'password' && (
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(field.key)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                          >
                            {showPasswords[field.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                    )}

                    {field.helpText && (
                      <p className="text-xs text-slate-500 mt-1">{field.helpText}</p>
                    )}
                  </div>
                ))}
              </div>

              {testResult && (
                <div className={`rounded-lg p-3 border ${
                  testResult.ok
                    ? 'bg-green-900/30 border-green-700 text-green-300'
                    : 'bg-red-900/30 border-red-700 text-red-300'
                }`}>
                  <div className="flex items-center gap-2">
                    {testResult.ok ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                    <span className="text-sm">{testResult.message}</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-between p-6 border-t border-slate-700 bg-slate-800/50">
          <button
            onClick={handleClearConfig}
            className="text-red-400 hover:text-red-300 text-sm flex items-center gap-1.5"
          >
            <Trash2 className="w-4 h-4" />
            Effacer
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={handleTestConnection}
              disabled={testing}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${testing ? 'animate-spin' : ''}`} />
              {testing ? 'Test...' : 'Tester'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              <Save className={`w-4 h-4 ${saving ? 'animate-pulse' : ''}`} />
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
