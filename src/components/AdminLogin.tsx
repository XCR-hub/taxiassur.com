import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { Lock, Mail, AlertCircle, ArrowRight, Shield, Car, Users, Zap } from 'lucide-react';

interface AdminLoginProps {
  onSuccess: () => void;
}

interface LiveStats {
  leads: number;
  automations: number;
}

export default function AdminLogin({ onSuccess }: AdminLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [liveStats, setLiveStats] = useState<LiveStats>({ leads: 0, automations: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const [leadsRes, cronsRes] = await Promise.all([
        supabase.from('crm_leads').select('id', { count: 'exact', head: true }),
        supabase.from('cron_jobs_config').select('id', { count: 'exact', head: true }).eq('is_enabled', true),
      ]);
      setLiveStats({
        leads: leadsRes.count ?? 0,
        automations: cronsRes.count ?? 0,
      });
    };
    fetchStats();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (signInError) throw signInError;
      if (!data.user) throw new Error('Échec de la connexion');

      logger.info('Connexion auth réussie:', email);

      if (data.session) {
        localStorage.setItem('taxiassur-admin-session', JSON.stringify({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at,
          user: data.session.user,
          timestamp: Date.now(),
        }));
        localStorage.setItem('taxiassur-admin-permanent', 'true');
      }

      await new Promise(resolve => setTimeout(resolve, 500));
      window.location.reload();
    } catch (err) {
      logger.error('Erreur de connexion:', err);
      setError(err instanceof Error ? err.message : 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const stats = [
    { label: 'Leads gérés', value: liveStats.leads > 0 ? `${liveStats.leads}+` : '...', icon: <Users size={18} /> },
    { label: 'Automations actives', value: liveStats.automations > 0 ? liveStats.automations.toString() : '...', icon: <Zap size={18} /> },
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
            Sécurisé par Supabase Auth &amp; RLS
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
                  onChange={(e) => setEmail(e.target.value)}
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
