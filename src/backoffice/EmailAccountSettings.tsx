import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Mail, Save, RefreshCw, CheckCircle, AlertCircle, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { internalFunctionHeaders } from '@/lib/internal-function-auth';

interface EmailAccount {
  id: string;
  email: string;
  imap_host: string;
  imap_port: number;
  imap_username: string;
  imap_password_encrypted: string | null;
  smtp_host: string | null;
  smtp_port: number | null;
  is_active: boolean;
  last_sync_at: string | null;
}

export default function EmailAccountSettings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [account, setAccount] = useState<EmailAccount | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    loadAccount();
  }, []);

  const loadAccount = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('email_accounts')
        .select('*')
        .eq('email', 'team@taxiassur.com')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setAccount(data);
        if (data.imap_password_encrypted) {
          setPassword('••••••••••••');
        }
      } else {
        setMessage({
          type: 'error',
          text: 'Aucun compte email trouvé. Veuillez créer un compte team@taxiassur.com.'
        });
      }
    } catch (error) {
      console.error('Error loading account:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Erreur lors du chargement'
      });
    } finally {
      setLoading(false);
    }
  };

  const savePassword = async () => {
    if (!account) return;

    if (!password || password === '••••••••••••') {
      setMessage({
        type: 'error',
        text: 'Veuillez entrer un mot de passe valide'
      });
      return;
    }

    try {
      setSaving(true);
      setMessage(null);

      const { error } = await supabase
        .from('email_accounts')
        .update({
          imap_password_encrypted: password,
          is_active: true
        })
        .eq('id', account.id);

      if (error) throw error;

      setMessage({
        type: 'success',
        text: 'Mot de passe IMAP sauvegardé avec succès !'
      });

      await loadAccount();
    } catch (error) {
      console.error('Error saving password:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Erreur lors de la sauvegarde'
      });
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    if (!account) return;

    try {
      setTesting(true);
      setMessage({
        type: 'info',
        text: 'Test de connexion en cours...'
      });

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-ionos-imap`,
        {
          method: 'POST',
          headers: {
            ...(await internalFunctionHeaders()),
            'Content-Type': 'application/json'
          }
        }
      );

      const result = await response.json();

      if (result.success) {
        setMessage({
          type: 'success',
          text: `✅ Connexion réussie ! ${result.stats?.total_retrieved || 0} emails trouvés. ${result.stats?.inserted || 0} nouveaux emails synchronisés.`
        });
      } else {
        setMessage({
          type: 'error',
          text: `❌ ${result.error || result.message || 'Erreur de connexion'}\n\n${result.note || ''}`
        });
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      setMessage({
        type: 'error',
        text: `Erreur : ${error instanceof Error ? error.message : 'Impossible de tester la connexion'}`
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate('/backoffice/crm')}
          className="mb-6 flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-lg transition"
        >
          <ArrowLeft size={20} />
          Retour
        </button>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-3">
            Configuration Email IONOS
          </h1>
          <p className="text-slate-300 text-lg">
            Configurez votre compte email pour synchroniser vos messages
          </p>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-900/50 border border-green-700 text-green-200' :
            message.type === 'error' ? 'bg-red-900/50 border border-red-700 text-red-200' :
            'bg-blue-900/50 border border-blue-700 text-blue-200'
          }`}>
            <div className="flex items-start gap-3">
              {message.type === 'success' && <CheckCircle className="flex-shrink-0 mt-0.5" size={20} />}
              {message.type === 'error' && <AlertCircle className="flex-shrink-0 mt-0.5" size={20} />}
              {message.type === 'info' && <RefreshCw className="flex-shrink-0 mt-0.5 animate-spin" size={20} />}
              <div className="flex-1 whitespace-pre-wrap text-sm">{message.text}</div>
            </div>
          </div>
        )}

        {account && (
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-700">
              <Mail className="text-blue-400" size={24} />
              <div>
                <h2 className="text-xl font-semibold text-white">{account.email}</h2>
                <p className="text-sm text-slate-400">
                  {account.is_active ? (
                    <span className="text-green-400">✓ Actif</span>
                  ) : (
                    <span className="text-red-400">✗ Inactif</span>
                  )}
                  {account.last_sync_at && (
                    <span className="ml-3">
                      Dernière sync : {new Date(account.last_sync_at).toLocaleString('fr-FR')}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Serveur IMAP
                </label>
                <input
                  type="text"
                  value={account.imap_host}
                  disabled
                  className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-slate-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Port IMAP
                </label>
                <input
                  type="text"
                  value={account.imap_port}
                  disabled
                  className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-slate-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Nom d'utilisateur IMAP
                </label>
                <input
                  type="text"
                  value={account.imap_username}
                  disabled
                  className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-slate-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Mot de passe IMAP
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Entrez le mot de passe IONOS"
                    className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-blue-900/20 border border-blue-800/50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-300 mb-2">
                💡 Comment obtenir le mot de passe IMAP ?
              </h3>
              <ol className="text-sm text-blue-200 space-y-1 list-decimal list-inside">
                <li>Connectez-vous sur <a href="https://www.ionos.fr/" target="_blank" className="underline">https://www.ionos.fr/</a></li>
                <li>Allez dans <strong>Email → Paramètres</strong></li>
                <li>Créez un <strong>mot de passe d'application</strong> spécifique pour IMAP</li>
                <li>Copiez et collez-le ici</li>
              </ol>
            </div>

            <div className="flex gap-4">
              <button
                onClick={savePassword}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition disabled:opacity-50"
              >
                <Save size={20} />
                {saving ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>

              <button
                onClick={testConnection}
                disabled={testing || !account.imap_password_encrypted}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition disabled:opacity-50"
              >
                <RefreshCw size={20} className={testing ? 'animate-spin' : ''} />
                {testing ? 'Test en cours...' : 'Tester la connexion'}
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-3">
            🔒 Sécurité
          </h3>
          <ul className="text-sm text-slate-300 space-y-2">
            <li>✓ Le mot de passe est stocké de manière sécurisée dans Supabase</li>
            <li>✓ La connexion IMAP utilise TLS/SSL (port 993)</li>
            <li>✓ Seules les edge functions autorisées peuvent accéder au mot de passe</li>
            <li>✓ Recommandation : utilisez un mot de passe d'application dédié</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
