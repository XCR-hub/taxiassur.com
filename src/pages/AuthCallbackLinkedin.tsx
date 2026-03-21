import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from '@/lib/toast';

export default function AuthCallbackLinkedin() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [token, setToken] = useState('');
  const [expiresIn, setExpiresIn] = useState(0);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (errorParam) {
      setError(errorDescription || errorParam);
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
      const CLIENT_ID = import.meta.env.VITE_LINKEDIN_CLIENT_ID;
      const CLIENT_SECRET = import.meta.env.VITE_LINKEDIN_CLIENT_SECRET;
      const REDIRECT_URI = import.meta.env.VITE_LINKEDIN_REDIRECT_URI;
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const functionUrl = `${SUPABASE_URL}/functions/v1/linkedin-oauth-exchange`;

      const requestBody = {
        code: code,
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        redirectUri: REDIRECT_URI
      };

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) {
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error_description || data.error);
      }

      if (data.access_token) {
        setToken(data.access_token);
        setExpiresIn(data.expires_in);

        await saveTokenToDatabase(data.access_token, data.expires_in);

        setStatus('success');
      } else {
        throw new Error('Aucun access_token reçu dans la réponse');
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Erreur inconnue lors de l\'échange du code OAuth';
      setError(errorMsg);
      setStatus('error');
    }
  }

  async function saveTokenToDatabase(accessToken: string, expiresIn: number) {
    try {
      const expiresAt = new Date(Date.now() + expiresIn * 1000);

      const { error } = await supabase
        .from('social_networks')
        .upsert({
          platform: 'linkedin',
          name: 'LinkedIn',
          is_connected: true,
          is_active: true,
          access_token: accessToken,
          token_expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'platform'
        });

      if (error) {
        console.error('Erreur sauvegarde token:', error);
        throw error;
      }
    } catch (err) {
      console.error('Erreur lors de la sauvegarde:', err);
    }
  }

  function copyToken() {
    navigator.clipboard.writeText(token);
    toast.success('✅ Token copié !');
  }

  const expiresAt = new Date(Date.now() + expiresIn * 1000).toLocaleString('fr-FR');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">💼</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            LinkedIn OAuth Callback
          </h1>
          <p className="text-gray-600">
            Récupération de l'Access Token
          </p>
        </div>

        {status === 'loading' && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Échange du code OAuth en cours...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-6">
            <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
              <div className="flex items-center mb-2">
                <span className="text-2xl mr-2">✅</span>
                <h3 className="text-lg font-semibold text-green-900">
                  Access Token Obtenu !
                </h3>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Votre LinkedIn Access Token :
              </label>
              <div className="relative">
                <textarea
                  value={token}
                  readOnly
                  rows={4}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg font-mono text-xs resize-none"
                />
                <button
                  onClick={copyToken}
                  className="absolute right-2 top-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  📋 Copier
                </button>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-semibold text-yellow-900 mb-2">⏱️ Durée de validité :</h4>
              <div className="space-y-1 text-sm text-yellow-800">
                <p><strong>Expire dans :</strong> {Math.floor(expiresIn / 86400)} jours ({expiresIn} secondes)</p>
                <p><strong>Expire le :</strong> {expiresAt}</p>
              </div>
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
              <h4 className="font-semibold text-blue-900 mb-2">✅ Token Sauvegardé !</h4>
              <p className="text-sm text-blue-800">
                Le token a été automatiquement sauvegardé dans Supabase.
                Vous pouvez maintenant utiliser LinkedIn depuis le backoffice.
              </p>
            </div>

            <button
              onClick={() => navigate('/backoffice/social-media')}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
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
                <li>Vérifiez la Redirect URI dans votre app LinkedIn</li>
                <li>Assurez-vous que les scopes sont corrects</li>
                <li>Vérifiez le Client ID et Client Secret</li>
                <li>Réessayez l'autorisation</li>
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
