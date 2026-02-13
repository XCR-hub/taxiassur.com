import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, User, Mail } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function ClientCreatePassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [invitationInfo, setInvitationInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Token manquant dans le lien');
      setLoading(false);
      return;
    }

    loadInvitationInfo();
  }, [token]);

  const loadInvitationInfo = async () => {
    try {
      const { data, error: rpcError } = await supabase
        .rpc('get_invitation_info', { p_token: token })
        .single();

      if (rpcError) throw rpcError;

      if (data && data.success) {
        setInvitationInfo(data);
      } else {
        setError(data?.error || 'Invitation invalide');
      }
    } catch (err: any) {
      console.error('Erreur chargement invitation:', err);
      setError('Impossible de charger l\'invitation');
    } finally {
      setLoading(false);
    }
  };

  const validatePassword = () => {
    if (password.length < 8) {
      return 'Le mot de passe doit contenir au moins 8 caractères';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Le mot de passe doit contenir au moins une majuscule';
    }
    if (!/[a-z]/.test(password)) {
      return 'Le mot de passe doit contenir au moins une minuscule';
    }
    if (!/[0-9]/.test(password)) {
      return 'Le mot de passe doit contenir au moins un chiffre';
    }
    if (password !== confirmPassword) {
      return 'Les mots de passe ne correspondent pas';
    }
    return null;
  };

  const handleCreatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validatePassword();
    if (validationError) {
      setError(validationError);
      return;
    }

    setCreating(true);

    try {
      // Valider l'invitation
      const { data: validationData, error: validationError } = await supabase
        .rpc('validate_client_invitation', {
          p_token: token,
          p_password: password,
        })
        .single();

      if (validationError) throw validationError;

      if (!validationData.success) {
        throw new Error(validationData.error || 'Erreur de validation');
      }

      // Créer le compte via l'edge function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-client-account`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            lead_id: validationData.lead_id,
            email: validationData.email,
            password: password,
            first_name: validationData.first_name,
            last_name: validationData.last_name,
          }),
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de la création du compte');
      }

      setSuccess(true);

      // Rediriger vers la connexion après 3 secondes
      setTimeout(() => {
        navigate('/espace-client/login');
      }, 3000);
    } catch (err: any) {
      console.error('Erreur création mot de passe:', err);
      setError(err.message || 'Erreur lors de la création du compte');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Vérification de votre invitation...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-green-500/10 border border-green-500/30 rounded-2xl p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Compte créé avec succès !</h2>
          <p className="text-gray-300 mb-6">
            Vous allez être redirigé vers la page de connexion...
          </p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!invitationInfo || error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-red-500/10 border border-red-500/30 rounded-2xl p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Invitation invalide</h2>
          <p className="text-gray-300 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  const passwordStrength = password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg mb-4">
            <Lock className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Créez votre mot de passe</h1>
          <p className="text-gray-400">Bienvenue sur votre Espace Client TaxiAssur</p>
        </div>

        {/* Infos utilisateur */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <User className="w-5 h-5 text-blue-400" />
            <div>
              <p className="text-sm text-gray-400">Nom</p>
              <p className="text-white font-medium">
                {invitationInfo.first_name} {invitationInfo.last_name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-blue-400" />
            <div>
              <p className="text-sm text-gray-400">Email</p>
              <p className="text-white font-medium">{invitationInfo.email}</p>
            </div>
          </div>
        </div>

        {/* Formulaire */}
        <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleCreatePassword} className="space-y-6">
            {/* Mot de passe */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-200 mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Créez un mot de passe sécurisé"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Confirmation */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-200 mb-2">
                Confirmer le mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Confirmez votre mot de passe"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Critères */}
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium text-gray-200 mb-2">Le mot de passe doit contenir :</p>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full ${password.length >= 8 ? 'bg-green-500' : 'bg-gray-600'}`} />
                  <span className="text-sm text-gray-300">Au moins 8 caractères</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full ${/[A-Z]/.test(password) ? 'bg-green-500' : 'bg-gray-600'}`} />
                  <span className="text-sm text-gray-300">Une majuscule</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full ${/[a-z]/.test(password) ? 'bg-green-500' : 'bg-gray-600'}`} />
                  <span className="text-sm text-gray-300">Une minuscule</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full ${/[0-9]/.test(password) ? 'bg-green-500' : 'bg-gray-600'}`} />
                  <span className="text-sm text-gray-300">Un chiffre</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full ${password === confirmPassword && password.length > 0 ? 'bg-green-500' : 'bg-gray-600'}`} />
                  <span className="text-sm text-gray-300">Mots de passe identiques</span>
                </div>
              </div>
            </div>

            {/* Erreur */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-200">{error}</p>
              </div>
            )}

            {/* Bouton */}
            <button
              type="submit"
              disabled={creating || !passwordStrength}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3 px-6 rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {creating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Création en cours...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Créer mon compte
                </>
              )}
            </button>
          </form>
        </div>

        {/* Info */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Connexion sécurisée • Vos données sont protégées
          </p>
        </div>
      </div>
    </div>
  );
}
