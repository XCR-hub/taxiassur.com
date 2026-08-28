import { useState } from 'react';
import { logger } from '@/lib/logger';
import { Lock, Mail, AlertCircle, ArrowRight, Shield, Car, Users, Zap, CheckCircle, RefreshCw } from 'lucide-react';
import { nativeAdminLogin, nativeAdminRequestPasswordReset } from '@/lib/native-admin-auth';

interface AdminLoginProps {
  onSuccess: () => void;
}

export default function AdminLogin({ onSuccess }: AdminLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await nativeAdminLogin(email.trim().toLowerCase(), password);
      localStorage.setItem('taxiassur-admin-permanent', 'true');
      onSuccess();
      window.location.reload();
    } catch (err) {
      logger.error('Erreur de connexion:', err);
      const message = err instanceof Error ? err.message : 'Erreur de connexion';
      setError(message === 'rate_limited'
        ? 'Trop de tentatives de connexion. Patientez une minute puis réessayez.'
        : message === 'invalid_credentials'
          ? 'Adresse email ou mot de passe incorrect.'
          : message === 'platform_temporarily_unavailable'
            ? 'Le service de connexion est momentanément indisponible. Réessayez dans quelques secondes.'
            : message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    setError('');
    setResetError('');
    setResetSent(false);

    if (!normalizedEmail) {
      setResetError('Saisissez votre adresse email avant de demander un lien.');
      return;
    }

    setResetLoading(true);
    try {
      await nativeAdminRequestPasswordReset(normalizedEmail);
      setResetSent(true);
    } catch (err) {
      logger.error('Erreur mot de passe oublie:', err);
      setResetError('Impossible d\'envoyer le lien pour le moment. Verifiez l\'email ou reessayez dans quelques minutes.');
    } finally {
      setResetLoading(false);
    }
  };

  const stats = [
    { label: 'Données centralisées', value: '100%', icon: <Users size={18} /> },
    { label: 'Base autonome', value: 'PostgreSQL', icon: <Zap size={18} /> },
    { label: 'Monitoring IA', value: '24/7', icon: <Car size={18} /> },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left panel — dark branded */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative flex-col overflow-hidden bg-[#0d1117]">
        {/* Background image overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{ backgroundImage: `url('https://images.pexels.com/photos/1004409/pexels-photo-1004409.jpeg?auto=compress&cs=tinysrgb&w=1600')` }}
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0d1117]/90 via-[#0d1117]/75 to-[#1a2332]/90" />

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full p-10">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg">
              <Car size={20} className="text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-lg leading-none">TaxiAssur</p>
              <p className="text-gray-400 text-xs font-medium tracking-widest uppercase">Back-Office</p>
            </div>
          </div>

          {/* Main headline */}
          <div className="mt-auto mb-auto flex flex-col justify-center pt-16">
            <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-4">
              Pilotez votre<br />
              <span className="text-amber-400">assurance taxi</span><br />
              en toute confiance
            </h1>
            <p className="text-gray-400 text-lg leading-relaxed max-w-md">
              Gérez vos leads, campagnes email, contenus et automations IA depuis un seul espace sécurisé.
            </p>

            {/* Stats */}
            <div className="flex gap-4 mt-10">
              {stats.map((s) => (
                <div key={s.label} className="flex-1 bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-sm">
                  <div className="text-amber-400 mb-2">{s.icon}</div>
                  <p className="text-white text-2xl font-bold">{s.value}</p>
                  <p className="text-gray-400 text-xs mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom security badge */}
          <div className="flex items-center gap-2 text-gray-500 text-xs">
            <Shield size={14} />
            Sécurisé par TaxiAssur Auth &amp; PostgreSQL
          </div>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center bg-white px-8 py-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center">
              <Car size={20} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-lg leading-none">TaxiAssur</p>
              <p className="text-gray-400 text-xs font-medium tracking-widest uppercase">Back-Office</p>
            </div>
          </div>

          <h2 className="text-3xl font-bold text-gray-900 mb-2">Connexion administrateur</h2>
          <p className="text-gray-500 mb-8">Accès réservé à l'équipe TaxiAssur</p>

          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                Adresse email
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setResetSent(false);
                    setResetError('');
                  }}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-gray-900 bg-gray-50/60 placeholder-gray-400 text-sm transition-all"
                  placeholder="admin@taxiassur.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-gray-900 bg-gray-50/60 placeholder-gray-400 text-sm transition-all"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1">
                <p className="text-sm font-bold text-amber-900">Mot de passe oublié ?</p>
                <p className="text-xs text-amber-800 mt-1">Saisissez votre email, puis recevez un lien sécurisé pour créer un nouveau mot de passe.</p>
              </div>
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={loading || resetLoading}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {resetLoading ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Envoi...
                  </>
                ) : (
                  'Recevoir le lien'
                )}
              </button>
            </div>

            {resetError && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">{resetError}</p>
              </div>
            )}

            {resetSent && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
                <CheckCircle size={18} className="text-green-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-green-800">Lien de reinitialisation envoye.</p>
                  <p className="text-xs text-green-700 mt-1">Verifiez la boite mail {email.trim().toLowerCase()} et ouvrez le lien recu.</p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-gray-900 hover:bg-gray-800 text-white py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Connexion en cours...
                </span>
              ) : (
                <>
                  Se connecter
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-center gap-2 text-gray-400 text-xs">
            <Shield size={13} />
            Accès sécurisé — Données chiffrées en transit
          </div>
        </div>
      </div>
    </div>
  );
}
