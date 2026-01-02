import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Linkedin, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';

interface LinkedInConnection {
  connected: boolean;
  expiresAt?: Date;
  reason?: 'no_token' | 'expired' | 'error';
}

export function LinkedInOAuthButton() {
  const [connection, setConnection] = useState<LinkedInConnection>({ connected: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkConnection();
  }, []);

  async function checkConnection() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('social_networks')
        .select('access_token, token_expires_at, is_connected')
        .eq('platform', 'linkedin')
        .maybeSingle();

      if (error) throw error;

      if (!data?.access_token) {
        setConnection({ connected: false, reason: 'no_token' });
        return;
      }

      const expiresAt = new Date(data.token_expires_at);
      if (expiresAt < new Date()) {
        setConnection({ connected: false, reason: 'expired' });
        return;
      }

      setConnection({ connected: true, expiresAt });
    } catch (err) {
      setConnection({ connected: false, reason: 'error' });
    } finally {
      setLoading(false);
    }
  }

  const linkedinAuthUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${import.meta.env.VITE_LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(import.meta.env.VITE_LINKEDIN_REDIRECT_URI)}&scope=openid%20profile%20email%20w_member_social`;

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
        <div className="text-xs text-slate-400">
          Expire dans {daysUntilExpiry} jours
          {isExpiringSoon && (
            <span className="text-yellow-400 ml-2">⚠️ Bientôt expiré</span>
          )}
        </div>
        {isExpiringSoon && (
          <a
            href={linkedinAuthUrl}
            className="inline-flex items-center gap-2 text-xs bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 rounded transition"
          >
            <Linkedin className="w-3 h-3" />
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
        href={linkedinAuthUrl}
        className="inline-flex items-center gap-2 bg-[#0A66C2] hover:bg-[#004182] text-white px-4 py-2 rounded-lg transition text-sm font-medium"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <Linkedin className="w-4 h-4" />
        Connecter LinkedIn
        <ExternalLink className="w-3 h-3" />
      </a>
      <p className="text-xs text-slate-400">
        Vous serez redirigé vers LinkedIn pour autoriser l'accès
      </p>
    </div>
  );
}
