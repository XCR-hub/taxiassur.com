import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Lock, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';

const SetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Check for errors in hash (from Supabase redirect)
    const hash = location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.substring(1));
      const errorType = params.get('error');
      const errorCode = params.get('error_code');
      const errorDescription = params.get('error_description');

      if (errorType) {
        let errorMessage = 'Erreur lors de la verification du lien d\'invitation';

        if (errorCode === 'otp_expired') {
          errorMessage = 'Le lien d\'invitation a expire. Veuillez demander une nouvelle invitation.';
        } else if (errorType === 'access_denied') {
          errorMessage = 'Lien d\'invitation invalide ou expire. Veuillez demander une nouvelle invitation.';
        } else if (errorDescription) {
          errorMessage = decodeURIComponent(errorDescription);
        }

        setError(errorMessage);
        return;
      }
    }

    if (!token) {
      setError('Token de verification manquant. Veuillez utiliser le lien recu par email.');
    }
  }, [token, location.hash]);

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) {
      return 'Le mot de passe doit contenir au moins 8 caracteres';
    }
    if (!/[A-Z]/.test(pwd)) {
      return 'Le mot de passe doit contenir au moins une majuscule';
    }
    if (!/[a-z]/.test(pwd)) {
      return 'Le mot de passe doit contenir au moins une minuscule';
    }
    if (!/[0-9]/.test(pwd)) {
      return 'Le mot de passe doit contenir au moins un chiffre';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (!token) {
      setError('Token de verification manquant');
      return;
    }

    setLoading(true);

    try {
      // Verify the token and update the password
      const { error: updateError } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: 'email',
      });

      if (updateError) {
        throw updateError;
      }

      // Update the password
      const { error: passwordError } = await supabase.auth.updateUser({
        password: password
      });

      if (passwordError) {
        throw passwordError;
      }

      setSuccess(true);

      setTimeout(() => {
        navigate('/backoffice/crm-killer');
      }, 2000);

    } catch (err: any) {
      console.error('Error setting password:', err);

      let errorMessage = 'Erreur lors de la creation du mot de passe';

      if (err.message?.includes('expired')) {
        errorMessage = 'Le lien d\'invitation a expire. Veuillez demander une nouvelle invitation.';
      } else if (err.message?.includes('invalid')) {
        errorMessage = 'Lien d\'invitation invalide. Veuillez demander une nouvelle invitation.';
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Show error state if there's an error from URL hash
  if (error && !token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Lien invalide ou expire</h2>
          <p className="text-gray-600 mb-6">
            {error}
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">Que faire ?</h3>
            <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
              <li>Demandez une nouvelle invitation a votre administrateur</li>
              <li>Verifiez que vous utilisez le lien le plus recent</li>
              <li>Les liens d'invitation expirent apres 24 heures</li>
            </ol>
          </div>

          <button
            onClick={() => navigate('/backoffice/crm-killer')}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Retour a la connexion
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Mot de passe defini !</h2>
          <p className="text-gray-600 mb-6">
            Votre compte a ete cree avec succes. Redirection vers l'application...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Creer votre compte</h1>
          <p className="text-gray-600">
            Definissez votre mot de passe pour acceder a TaxiAssur
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Mot de passe
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12"
                placeholder="Minimum 8 caracteres"
                required
                disabled={!token}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <ul className="mt-2 space-y-1 text-xs text-gray-600">
              <li className={password.length >= 8 ? 'text-green-600' : ''}>
                • Au moins 8 caracteres
              </li>
              <li className={/[A-Z]/.test(password) ? 'text-green-600' : ''}>
                • Au moins une majuscule
              </li>
              <li className={/[a-z]/.test(password) ? 'text-green-600' : ''}>
                • Au moins une minuscule
              </li>
              <li className={/[0-9]/.test(password) ? 'text-green-600' : ''}>
                • Au moins un chiffre
              </li>
            </ul>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
              Confirmer le mot de passe
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12"
                placeholder="Confirmer votre mot de passe"
                required
                disabled={!token}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {confirmPassword && password !== confirmPassword && (
              <p className="mt-1 text-xs text-red-600">
                Les mots de passe ne correspondent pas
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !token || !password || !confirmPassword || password !== confirmPassword}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creation en cours...' : 'Creer mon compte'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Vous avez deja un compte ?{' '}
            <a href="/backoffice/crm-killer" className="text-blue-600 hover:text-blue-700 font-medium">
              Se connecter
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SetPassword;
