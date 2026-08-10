import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { internalFunctionHeaders } from '@/lib/internal-function-auth';
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
      const returnedState = searchParams.get('state');
      const expectedState = sessionStorage.getItem('oauth_state_twitter');
      const codeVerifier = sessionStorage.getItem('oauth_pkce_twitter');

      if (error) {
        throw new Error(`Twitter authorization error: ${error}`);
      }

      if (!returnedState || !expectedState || returnedState !== expectedState || !codeVerifier) {
        throw new Error('Validation OAuth Twitter échouée');
      }

      sessionStorage.removeItem('oauth_state_twitter');
      sessionStorage.removeItem('oauth_pkce_twitter');

      if (!code) {
        throw new Error('No authorization code received');
      }

      setMessage('Échange du code d\'autorisation...');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/twitter-oauth-exchange`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': (await internalFunctionHeaders()).Authorization
        },
        body: JSON.stringify({ code, code_verifier: codeVerifier })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to exchange authorization code');
      }

      const data = await response.json();

      if (!data.success) throw new Error(data.error || 'Connexion Twitter impossible');

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
      <Helmet><meta name="robots" content="noindex, nofollow" /></Helmet>
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
