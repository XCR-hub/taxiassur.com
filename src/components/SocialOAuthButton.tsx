import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { CheckCircle, AlertCircle, ExternalLink, LucideIcon } from 'lucide-react';

interface SocialOAuthButtonProps {
  platform: 'linkedin' | 'youtube' | 'pinterest' | 'twitter' | 'facebook' | 'instagram';
  icon: LucideIcon;
  label: string;
  color: string;
  clientId?: string;
  redirectUri?: string;
  scope: string;
  authUrl: string;
}

interface Connection {
  connected: boolean;
  expiresAt?: Date;
  reason?: 'no_token' | 'expired' | 'error' | 'not_configured';
}

export function SocialOAuthButton({
  platform,
  icon: Icon,
  label,
  color,
  clientId,
  redirectUri,
  scope,
  authUrl
}: SocialOAuthButtonProps) {
  const [connection, setConnection] = useState<Connection>({ connected: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkConnection();
  }, [platform]);

  async function checkConnection() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('social_networks')
        .select('access_token, token_expires_at, is_connected')
        .eq('platform', platform)
        .maybeSingle();

      if (error) throw error;

      if (!data?.access_token) {
        setConnection({ connected: false, reason: 'no_token' });
        return;
      }

      if (data.token_expires_at) {
        const expiresAt = new Date(data.token_expires_at);
        if (expiresAt < new Date()) {
          setConnection({ connected: false, reason: 'expired' });
          return;
        }
        setConnection({ connected: true, expiresAt });
      } else {
        setConnection({ connected: data.is_connected || false });
      }
    } catch (err) {
      setConnection({ connected: false, reason: 'error' });
    } finally {
      setLoading(false);
    }
  }

  if (!clientId || !redirectUri) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-orange-400">
          <AlertCircle className="w-4 h-4" />
          <span>Configuration manquante</span>
        </div>
        <p className="text-xs text-slate-400">
          Les clés API OAuth {label} doivent être configurées dans les variables d'environnement
        </p>
      </div>
    );
  }

  const oauthUrl = `${authUrl}?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`;    const startOAuth = async () => {     const url = new URL(authUrl);     url.searchParams.set('response_type', 'code');     url.searchParams.set('client_id', clientId);     url.searchParams.set('redirect_uri', redirectUri);     url.searchParams.set('scope', scope);     const randomValue = (length: number) => {       const bytes = crypto.getRandomValues(new Uint8Array(length));       return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');     };     const state = randomValue(24);     sessionStorage.setItem(`oauth_state_${platform}`, state);     url.searchParams.set('state', state);     if (platform === 'twitter') {       const verifier = randomValue(64);       const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));       const challenge = btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');       sessionStorage.setItem('oauth_pkce_twitter', verifier);       url.searchParams.set('code_challenge', challenge);       url.searchParams.set('code_challenge_method', 'S256');     }     window.location.assign(url.toString());   };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-400 border-t-transparent"></div>
        Vérification...
      </div>
    );
  }

  if (connection.connected && connection.expiresAt) {
    const daysUntilExpiry = Math.floor((connection.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const isExpiringSoon = daysUntilExpiry < 7;

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-green-400 text-sm">
          <CheckCircle className="w-4 h-4" />
          <span>Connecté</span>
        </div>
        {connection.expiresAt && (
          <div className="text-xs text-slate-400">
            Expire dans {daysUntilExpiry} jours
            {isExpiringSoon && (
              <span className="text-yellow-400 ml-2">⚠️ Bientôt expiré</span>
            )}
          </div>
        )}
        {isExpiringSoon && (
          <a
            href={oauthUrl}
            onClick={(event) => { event.preventDefault(); void startOAuth(); }}
            className={`inline-flex items-center gap-2 text-xs ${color} hover:opacity-90 text-white px-3 py-1.5 rounded transition`}
          >
            <Icon className="w-3 h-3" />
            Reconnecter
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm">
        {connection.reason === 'no_token' && (
          <span className="text-slate-400">Non connecté</span>
        )}
        {connection.reason === 'expired' && (
          <span className="text-yellow-400 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            Token expiré
          </span>
        )}
        {connection.reason === 'error' && (
          <span className="text-red-400 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            Erreur
          </span>
        )}
      </div>
      <a
        href={oauthUrl}
        onClick={(event) => { event.preventDefault(); event.stopPropagation(); void startOAuth(); }}
        className={`inline-flex items-center gap-2 ${color} hover:opacity-90 text-white px-4 py-2 rounded-lg transition text-sm font-medium`}
      >
        <Icon className="w-4 h-4" />
        Connecter {label}
        <ExternalLink className="w-3 h-3" />
      </a>
      <p className="text-xs text-slate-400">
        Vous serez redirigé vers {label} pour autoriser l'accès
      </p>
    </div>
  );
}
