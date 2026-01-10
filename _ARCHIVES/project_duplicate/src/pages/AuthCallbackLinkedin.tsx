import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

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
      const CLIENT_ID = '78jlte9c2mbjw5';
      const CLIENT_SECRET = 'WPL_AP1.VD7oEnM5HAU5TuxG.1QnDMw==';
      const REDIRECT_URI = 'https://taxiassur.com/auth/linkedin/callback';

      const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          redirect_uri: REDIRECT_URI
        })
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error_description || data.error);
      }

      if (data.access_token) {
        setToken(data.access_token);
        setExpiresIn(data.expires_in);
        setStatus('success');
      } else {
        throw new Error('Aucun access_token reçu');
      }
    } catch (err: any) {
      setError(err.message);
      setStatus('error');
    }
  }

  function copyToken() {
    navigator.clipboard.writeText(token);
    alert('✅ Token copié !');
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
              <h4 className="font-semibold text-blue-900 mb-2">📝 Prochaines étapes :</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
                <li>Copiez le token ci-dessus</li>
                <li>Allez dans Supabase → SQL Editor</li>
                <li>Exécutez : <code className="bg-blue-100 px-2 py-1 rounded">LINKEDIN-ACTIVATION-MEMBER-ONLY.sql</code></li>
                <li>Puis exécutez :
                  <pre className="bg-blue-100 p-2 rounded mt-2 text-xs overflow-x-auto">
{`UPDATE social_networks
SET access_token = 'votre_token'
WHERE platform = 'linkedin';`}
                  </pre>
                </li>
              </ol>
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
