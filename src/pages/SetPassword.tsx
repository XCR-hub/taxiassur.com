import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Lock, CheckCircle, AlertCircle, Eye, EyeOff, Mail, RefreshCw } from 'lucide-react';

const SetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const legacyToken = searchParams.get('token');

  const hashParams = new URLSearchParams(location.hash.substring(1));
  const accessToken = hashParams.get('access_token');
  const refreshToken = hashParams.get('refresh_token');
  const hashType = hashParams.get('type');
  const hashError = hashParams.get('error');
  const hashErrorCode = hashParams.get('error_code');
  const hashErrorDescription = hashParams.get('error_description');

  const isHashFlow = !!(accessToken && (hashType === 'recovery' || hashType === 'invite'));
  const hasValidEntry = isHashFlow || !!legacyToken;

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  useEffect(() => {
    if (hashError) {
      let msg = 'Lien invalide ou expire.';
      if (hashErrorCode === 'otp_expired') {
        msg = 'Le lien d\'invitation a expire. Demandez une nouvelle invitation.';
      } else if (hashErrorDescription) {
        msg = decodeURIComponent(hashErrorDescription.replace(/\+/g, ' '));
      }
      setError(msg);
      return;
    }

    if (isHashFlow && accessToken && refreshToken) {
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error: sessionError }) => {
          if (sessionError) {
            setError('Session invalide. Demandez une nouvelle invitation.');
          } else {
            setSessionReady(true);
          }
        });
      return;
    }

    if (!legacyToken && !isHashFlow) {
      setError('Token de verification manquant. Utilisez le lien recu par email.');
    }
  }, []);

  const criteria = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    digit: /[0-9]/.test(password),
  };

  const passwordValid = Object.values(criteria).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!passwordValid) {
      setError('Le mot de passe ne remplit pas tous les criteres requis');
      return;
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);

    try {
      if (isHashFlow) {
        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) throw updateError;
      } else {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: legacyToken!,
          type: 'email',
        });
        if (verifyError) throw verifyError;

        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) throw updateError;
      }

      setSuccess(true);
      setTimeout(() => navigate('/backoffice/crm-killer'), 2000);
    } catch (err) {
      let msg = 'Erreur lors de la creation du mot de passe';
      if (err.message?.includes('expired')) {
        msg = 'Le lien a expire. Demandez une nouvelle invitation.';
      } else if (err.message?.includes('invalid') || err.message?.includes('Invalid')) {
        msg = 'Lien invalide. Demandez une nouvelle invitation.';
      } else if (err.message) {
        msg = err.message;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) return;
    setResetLoading(true);
    setResetError(null);
    try {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/auth/set-password`,
      });
      if (resetErr) throw resetErr;
      setResetSent(true);
    } catch (err) {
      setResetError(err.message || 'Erreur lors de l\'envoi du lien');
    } finally {
      setResetLoading(false);
    }
  };

  if (error && !hasValidEntry) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">Lien expire</h2>
          <p className="text-gray-500 text-center text-sm mb-6">
            Ce lien d'invitation n'est plus valide. Les liens expirent apres 1 heure.
          </p>

          {!resetSent ? (
            <>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                <p className="text-sm font-semibold text-amber-900 mb-1">Obtenir un nouveau lien</p>
                <p className="text-xs text-amber-700">
                  Entrez votre adresse email pour recevoir un nouveau lien de connexion immediatement.
                </p>
              </div>

              <form onSubmit={handlePasswordReset} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Votre adresse email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="votre@email.com"
                      required
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                    />
                  </div>
                </div>

                {resetError && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{resetError}</p>
                )}

                <button
                  type="submit"
                  disabled={resetLoading || !resetEmail}
                  className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {resetLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      Recevoir un nouveau lien
                    </>
                  )}
                </button>
              </form>

              <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                <button
                  onClick={() => navigate('/backoffice/crm-killer')}
                  className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  J'ai deja un compte - Se connecter
                </button>
              </div>
            </>
          ) : (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Email envoye !</h3>
              <p className="text-sm text-gray-600 mb-6">
                Verifiez votre boite mail <strong>{resetEmail}</strong> et cliquez sur le lien pour definir votre mot de passe.
              </p>
              <p className="text-xs text-gray-400">
                Le lien est valable pendant 1 heure. Pensez a verifier vos spams.
              </p>
              <button
                onClick={() => navigate('/backoffice/crm-killer')}
                className="mt-6 w-full bg-gray-900 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-800 transition-colors"
              >
                Retour a la connexion
              </button>
            </div>
          )}
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
          <p className="text-gray-600">Votre compte a ete cree avec succes. Redirection...</p>
        </div>
      </div>
    );
  }

  const formDisabled = isHashFlow ? !sessionReady : !legacyToken;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Creer votre compte</h1>
          <p className="text-gray-600">Definissez votre mot de passe pour acceder a TaxiAssur</p>
        </div>

        {isHashFlow && !sessionReady && !error && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 text-center">
            Verification du lien en cours...
          </div>
        )}

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
                disabled={formDisabled}
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
              <li className={criteria.length ? 'text-green-600' : ''}>• Au moins 8 caracteres</li>
              <li className={criteria.upper ? 'text-green-600' : ''}>• Au moins une majuscule</li>
              <li className={criteria.lower ? 'text-green-600' : ''}>• Au moins une minuscule</li>
              <li className={criteria.digit ? 'text-green-600' : ''}>• Au moins un chiffre</li>
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
                disabled={formDisabled}
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
              <p className="mt-1 text-xs text-red-600">Les mots de passe ne correspondent pas</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || formDisabled || !passwordValid || !confirmPassword || password !== confirmPassword}
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
