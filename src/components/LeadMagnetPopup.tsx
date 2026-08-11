import React, { useState, useEffect, useCallback } from 'react';
import { X, BookOpen, Download, CheckCircle, AlertCircle, ChevronRight, Shield, TrendingDown } from 'lucide-react';
import { supabase } from '../lib/supabase';

const STORAGE_KEY = 'taxiassur_lead_magnet_popup';
const COOLDOWN_DAYS = 7;
const TRIGGER_DELAY_MS = 45_000;

const EXCLUDED_PATHS = [
  '/admin', '/backoffice', '/crm', '/espace-client',
  '/espace-prospect', '/paiement', '/set-password',
];

function isExcludedPath(): boolean {
  return EXCLUDED_PATHS.some(p => window.location.pathname.startsWith(p));
}

function shouldShow(): boolean {
  if (isExcludedPath()) return false;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return true;
    const { dismissedAt } = JSON.parse(raw);
    const days = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
    return days >= COOLDOWN_DAYS;
  } catch {
    return true;
  }
}

function markDismissed(): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ dismissedAt: Date.now() }));
}

async function sendConfirmationEmail(to: string, firstName: string): Promise<void> {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const response = await fetch(`${url}/functions/v1/send-lead-magnet-confirmation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}`, Apikey: key },
    body: JSON.stringify({ email: to, first_name: firstName, guide_type: 'guide-complet' }),
  });
  if (!response.ok) throw new Error(`GuideEmailError:${response.status}`);
}

const ITEMS = [
  'Les garanties obligatoires vs optionnelles',
  'Tableau comparatif de 5 assureurs taxi',
  'Les 7 erreurs qui font exploser la prime',
  'Methode pour economiser jusqu\'a 35%',
];

interface LeadMagnetPopupProps {
  onClose?: () => void;
}

const LeadMagnetPopup: React.FC<LeadMagnetPopupProps> = ({ onClose }) => {
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const close = useCallback(() => {
    setVisible(false);
    markDismissed();
    onClose?.();
  }, [onClose]);

  useEffect(() => {
    if (!shouldShow()) return;

    let triggered = false;

    const trigger = () => {
      if (triggered) return;
      triggered = true;
      setTimeout(() => setVisible(true), 300);
    };

    const timerHandle = setTimeout(trigger, TRIGGER_DELAY_MS);

    const handleMouseMove = (e: MouseEvent) => {
      if (e.clientY < window.innerHeight * 0.05 && e.movementY < 0) {
        trigger();
      }
    };

    document.addEventListener('mousemove', handleMouseMove, { passive: true });

    return () => {
      clearTimeout(timerHandle);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [visible, close]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMsg('Adresse email invalide.');
      setStatus('error');
      return;
    }

    setStatus('loading');

    try {
      const { error } = await supabase
        .from('lead_magnet_downloads')
        .insert({
          email: cleanEmail,
          first_name: firstName.trim(),
          guide_type: 'guide-complet',
          source_page: `popup:${window.location.pathname}`,
        });

      if (error) throw error;

      await sendConfirmationEmail(cleanEmail, firstName.trim());
      markDismissed();
      setStatus('success');

      setTimeout(() => setVisible(false), 4000);
    } catch {
      setStatus('error');
      setErrorMsg('Une erreur est survenue. Veuillez reessayer.');
    }
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) close(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Telechargez votre guide gratuit"
    >
      <div
        className="relative bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-700 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
        style={{ animation: 'popupIn 0.35s cubic-bezier(0.34,1.56,0.64,1)' }}
      >
        <style>{`
          @keyframes popupIn {
            from { opacity: 0; transform: scale(0.88) translateY(20px); }
            to   { opacity: 1; transform: scale(1) translateY(0); }
          }
        `}</style>

        <div className="h-1 w-full bg-gradient-to-r from-amber-500 to-yellow-400" />

        <button
          onClick={close}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-colors"
          aria-label="Fermer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8 pt-7">
          {status === 'success' ? (
            <div className="text-center py-6">
              <div className="inline-flex p-4 bg-green-500/20 rounded-full mb-4">
                <CheckCircle className="w-10 h-10 text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Guide envoye !</h3>
              <p className="text-gray-400 text-sm mb-6">Verifiez votre boite email. Vous pouvez aussi le telecharger directement :</p>
              <a
                href="/guides/guide-assurance-taxi-2026.html"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold py-3 px-6 rounded-xl transition-all"
              >
                <Download className="w-4 h-4" />
                Telecharger maintenant
              </a>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2.5 bg-amber-500/20 rounded-xl flex-shrink-0">
                  <BookOpen className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <div className="text-xs font-bold tracking-widest uppercase text-amber-400 mb-0.5">Guide gratuit · 20 pages</div>
                  <h2 className="text-lg font-extrabold text-white leading-tight">Comment economiser 35% sur votre assurance taxi</h2>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-5">
                <div className="flex items-center gap-2 bg-gray-800/50 rounded-lg px-3 py-2">
                  <Shield className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span className="text-xs text-gray-300">Garanties expliquees</span>
                </div>
                <div className="flex items-center gap-2 bg-gray-800/50 rounded-lg px-3 py-2">
                  <TrendingDown className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span className="text-xs text-gray-300">Jusqu'a -35% de prime</span>
                </div>
              </div>

              <ul className="space-y-2 mb-6">
                {ITEMS.map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
                    <ChevronRight className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>

              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  type="text"
                  placeholder="Votre prenom"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  className="w-full bg-gray-800/60 border border-gray-700 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 transition-colors"
                />
                <input
                  type="email"
                  required
                  placeholder="Votre email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setStatus('idle'); setErrorMsg(''); }}
                  className="w-full bg-gray-800/60 border border-gray-700 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 transition-colors"
                />
                {status === 'error' && (
                  <div className="flex items-center gap-2 text-red-400 text-xs">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    {errorMsg}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 disabled:opacity-60 text-gray-950 font-extrabold py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-amber-500/25 text-sm"
                >
                  {status === 'loading' ? (
                    <span className="inline-block w-4 h-4 border-2 border-gray-900/30 border-t-gray-900 rounded-full animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  Recevoir mon guide gratuit
                </button>
              </form>

              <p className="text-center text-gray-600 text-xs mt-3">
                Gratuit · Sans engagement · Desinscription en 1 clic
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeadMagnetPopup;
