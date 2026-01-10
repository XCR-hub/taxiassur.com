import { Linkedin, Youtube, Twitter, Facebook, Instagram, Award } from 'lucide-react';
import { SocialOAuthButton } from '@/components/SocialOAuthButton';

const socialNetworks = [
  {
    platform: 'linkedin' as const,
    label: 'LinkedIn',
    icon: Linkedin,
    color: 'bg-[#0A66C2]',
    clientIdEnv: import.meta.env.VITE_LINKEDIN_CLIENT_ID,
    redirectUri: import.meta.env.VITE_LINKEDIN_REDIRECT_URI || `${window.location.origin}/auth/callback/linkedin`,
    scope: 'openid profile email w_member_social',
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    description: 'Publiez du contenu sur votre profil et pages LinkedIn',
    setupGuide: 'Créez une app LinkedIn sur https://www.linkedin.com/developers/apps'
  },
  {
    platform: 'youtube' as const,
    label: 'YouTube',
    icon: Youtube,
    color: 'bg-red-600',
    clientIdEnv: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    redirectUri: import.meta.env.VITE_GOOGLE_REDIRECT_URI || `${window.location.origin}/auth/callback/youtube`,
    scope: 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    description: 'Uploadez des vidéos et gérez votre chaîne YouTube',
    setupGuide: 'Créez un projet Google Cloud et activez YouTube Data API v3'
  },
  {
    platform: 'twitter' as const,
    label: 'Twitter / X',
    icon: Twitter,
    color: 'bg-black',
    clientIdEnv: import.meta.env.VITE_TWITTER_CLIENT_ID,
    redirectUri: import.meta.env.VITE_TWITTER_REDIRECT_URI || `${window.location.origin}/auth/callback/twitter`,
    scope: 'tweet.read tweet.write users.read offline.access',
    authUrl: 'https://twitter.com/i/oauth2/authorize',
    description: 'Publiez des tweets sur votre compte',
    setupGuide: 'Créez une app Twitter sur https://developer.twitter.com/en/portal/dashboard'
  },
  {
    platform: 'facebook' as const,
    label: 'Facebook',
    icon: Facebook,
    color: 'bg-orange-600',
    clientIdEnv: import.meta.env.VITE_FACEBOOK_APP_ID,
    redirectUri: import.meta.env.VITE_FACEBOOK_REDIRECT_URI || `${window.location.origin}/auth/callback/facebook`,
    scope: 'pages_manage_posts pages_read_engagement publish_video',
    authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
    description: 'Gérez vos pages Facebook et publiez du contenu',
    setupGuide: 'Créez une app Facebook sur https://developers.facebook.com/apps'
  },
  {
    platform: 'instagram' as const,
    label: 'Instagram',
    icon: Instagram,
    color: 'bg-pink-600',
    clientIdEnv: import.meta.env.VITE_FACEBOOK_APP_ID,
    redirectUri: import.meta.env.VITE_FACEBOOK_REDIRECT_URI || `${window.location.origin}/auth/callback/instagram`,
    scope: 'instagram_basic instagram_content_publish pages_read_engagement',
    authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
    description: 'Publiez photos et vidéos sur Instagram Business',
    setupGuide: 'Utilisez Facebook Business (Instagram Business doit être lié)'
  },
  {
    platform: 'pinterest' as const,
    label: 'Pinterest',
    icon: Award,
    color: 'bg-red-700',
    clientIdEnv: import.meta.env.VITE_PINTEREST_APP_ID,
    redirectUri: import.meta.env.VITE_PINTEREST_REDIRECT_URI || `${window.location.origin}/auth/callback/pinterest`,
    scope: 'boards:read pins:read pins:write user_accounts:read',
    authUrl: 'https://www.pinterest.com/oauth/',
    description: 'Créez des épingles et gérez vos tableaux Pinterest',
    setupGuide: 'Créez une app Pinterest sur https://developers.pinterest.com/apps'
  }
];

export default function SocialConnectionsManager() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-3">
            Connexions Réseaux Sociaux
          </h1>
          <p className="text-slate-300 text-lg">
            Connectez vos comptes pour publier automatiquement du contenu
          </p>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">
            📋 Instructions de configuration
          </h2>
          <div className="space-y-3 text-sm text-slate-300">
            <p>
              <strong>1. Créez les applications OAuth</strong> sur chaque plateforme
            </p>
            <p>
              <strong>2. Ajoutez les variables d'environnement</strong> dans votre fichier <code className="bg-slate-900 px-2 py-1 rounded">.env</code>
            </p>
            <p>
              <strong>3. Configurez les URLs de redirection</strong> (callback) pour chaque application
            </p>
            <p>
              <strong>4. Cliquez sur "Connecter"</strong> pour autoriser l'accès
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {socialNetworks.map((network) => (
            <div
              key={network.platform}
              className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 hover:border-slate-600 transition"
            >
              <div className="flex items-start gap-4">
                <div className={`${network.color} p-3 rounded-lg`}>
                  <network.icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {network.label}
                  </h3>
                  <p className="text-sm text-slate-300 mb-4">
                    {network.description}
                  </p>

                  <div className="mb-4">
                    <SocialOAuthButton
                      platform={network.platform}
                      icon={network.icon}
                      label={network.label}
                      color={network.color}
                      clientId={network.clientIdEnv}
                      redirectUri={network.redirectUri}
                      scope={network.scope}
                      authUrl={network.authUrl}
                    />
                  </div>

                  {!network.clientIdEnv && (
                    <div className="bg-slate-900/50 border border-orange-900/50 rounded-lg p-3">
                      <p className="text-xs text-slate-400 mb-2">
                        <strong className="text-orange-400">Configuration requise :</strong>
                      </p>
                      <p className="text-xs text-slate-400 mb-1">
                        {network.setupGuide}
                      </p>
                      <p className="text-xs text-slate-400 font-mono mt-2">
                        VITE_{network.platform.toUpperCase()}_CLIENT_ID
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 bg-blue-900/20 border border-blue-800/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-blue-300 mb-3">
            💡 Besoin d'aide ?
          </h3>
          <div className="space-y-2 text-sm text-blue-200">
            <p>
              • Les tokens OAuth expirent généralement après 60-90 jours
            </p>
            <p>
              • Vous recevrez une notification avant l'expiration
            </p>
            <p>
              • Les publications échouées sont automatiquement réessayées
            </p>
            <p>
              • Consultez les logs dans le dashboard pour déboguer
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
