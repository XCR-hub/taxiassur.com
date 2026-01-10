import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function AuthCallbackTwitter() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    handleTwitterCallback();
  }, []);

  const handleTwitterCallback = async () => {
    try {
      const code = searchParams.get('code');
      const error = searchParams.get('error');

      if (error) {
        throw new Error(`Twitter authorization error: ${error}`);
      }

      if (!code) {
        throw new Error('No authorization code received');
      }

      setMessage('Échange du code d\'autorisation...');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/twitter-oauth-exchange`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'apikey': supabaseAnonKey
        },
        body: JSON.stringify({ code })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to exchange authorization code');
      }

      const data = await response.json();

      setMessage('Sauvegarde des credentials...');

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 90);

      const { error: dbError } = await supabase
        .from('social_networks')
        .upsert({
          platform: 'twitter',
          account_name: data.username || 'Twitter Account',
          account_id: data.user_id,
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          token_expires_at: expiresAt.toISOString(),
          is_connected: true,
          is_active: true,
          auto_publish: false
        }, {
          onConflict: 'platform'
        });

      if (dbError) throw dbError;

      setStatus('success');
      setMessage('Twitter connecté avec succès !');

      setTimeout(() => {
        navigate('/backoffice/social-connections');
      }, 2000);

    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Une erreur est survenue');
      setTimeout(() => {
        navigate('/backoffice/social-connections');
      }, 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-8 max-w-md w-full">
        <div className="text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="w-16 h-16 text-blue-400 animate-spin mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-white mb-2">
                Connexion à Twitter
              </h1>
              <p className="text-slate-300">{message}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-white mb-2">
                Succès !
              </h1>
              <p className="text-slate-300">{message}</p>
              <p className="text-sm text-slate-400 mt-4">
                Redirection en cours...
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-white mb-2">
                Erreur
              </h1>
              <p className="text-slate-300">{message}</p>
              <p className="text-sm text-slate-400 mt-4">
                Redirection en cours...
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
