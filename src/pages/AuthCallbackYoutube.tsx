import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from '@/lib/toast';

export default function AuthCallbackYoutube() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setError(errorParam);
      setStatus('error');
      return;
    }

    if (!code) {
      setError('Code OAuth manquant dans l\'URL');
      setStatus('error');
      return;
    }

    exchangeCodeForToken(code);
  }, [searchParams]);

  async function exchangeCodeForToken(code: string) {
    try {
      const CLIENT_ID = '99189284491-trog606nhubrt4su0bskpacc388420gm.apps.googleusercontent.com';
      const CLIENT_SECRET = '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';
      const REDIRECT_URI = 'https://www.taxiassur.com/auth/callback/youtube';

      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code: code,
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          redirect_uri: REDIRECT_URI,
          grant_type: 'authorization_code'
        })
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error_description || data.error);
      }

      if (data.refresh_token) {
        setToken(data.refresh_token);
        setStatus('success');
      } else {
        throw new Error('Aucun refresh_token reçu. Révoquez l\'accès et réessayez.');
      }
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  }

  function copyToken() {
    navigator.clipboard.writeText(token);
    toast.success('✅ Token copié !');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center p-4">
      <Helmet><meta name="robots" content="noindex, nofollow" /></Helmet>
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">🎥</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            YouTube OAuth Callback
          </h1>
          <p className="text-gray-600">
            Récupération du Refresh Token
          </p>
        </div>

        {status === 'loading' && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Échange du code OAuth en cours...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-6">
            <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
              <div className="flex items-center mb-2">
                <span className="text-2xl mr-2">✅</span>
                <h3 className="text-lg font-semibold text-green-900">
                  Refresh Token Obtenu !
                </h3>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Votre YouTube Refresh Token :
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={token}
                  readOnly
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg font-mono text-sm"
                />
                <button
                  onClick={copyToken}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
                >
                  📋 Copier
                </button>
              </div>
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
              <h4 className="font-semibold text-blue-900 mb-2">📝 Prochaines étapes :</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
                <li>Allez dans Supabase → Project Settings → Edge Functions → Secrets</li>
                <li>Ajoutez : <code className="bg-blue-100 px-2 py-1 rounded">YOUTUBE_REFRESH_TOKEN</code> = votre_token</li>
                <li>Testez la publication depuis le backoffice</li>
              </ol>
            </div>

            <button
              onClick={() => navigate('/backoffice/social-media')}
              className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition"
            >
              Aller au Backoffice Social Media →
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-6">
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
              <div className="flex items-center mb-2">
                <span className="text-2xl mr-2">❌</span>
                <h3 className="text-lg font-semibold text-red-900">
                  Erreur OAuth
                </h3>
              </div>
              <p className="text-red-800 text-sm mt-2">{error}</p>
            </div>

            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
              <h4 className="font-semibold text-yellow-900 mb-2">💡 Solutions :</h4>
              <ul className="list-disc list-inside space-y-2 text-sm text-yellow-800">
                <li>Vérifiez que votre compte Google est ajouté comme testeur</li>
                <li>Révoquez l'accès précédent : <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="underline">myaccount.google.com/permissions</a></li>
                <li>Vérifiez la Redirect URI dans Google Cloud Console</li>
                <li>Contactez le développeur pour être ajouté comme testeur</li>
              </ul>
            </div>

            <button
              onClick={() => navigate('/')}
              className="w-full bg-gray-600 text-white py-3 rounded-lg font-semibold hover:bg-gray-700 transition"
            >
              Retour à l'accueil
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
