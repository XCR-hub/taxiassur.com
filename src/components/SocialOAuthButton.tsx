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

  const oauthUrl = `${authUrl}?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`;

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
        className={`inline-flex items-center gap-2 ${color} hover:opacity-90 text-white px-4 py-2 rounded-lg transition text-sm font-medium`}
        onClick={(e) => {
          e.stopPropagation();
        }}
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
