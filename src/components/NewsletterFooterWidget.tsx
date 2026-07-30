import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, CheckCircle, ArrowRight } from 'lucide-react';
import { useTurnstileGuard } from '@/hooks/useTurnstileGuard';

export default function NewsletterFooterWidget() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [marketingConsent, setMarketingConsent] = useState(false);
  const turnstile = useTurnstileGuard({ action: 'newsletter_footer', className: 'flex justify-center' });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!email || !email.includes('@') || !marketingConsent || !turnstile.canSubmit) {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
      return;
    }

    setLoading(true);

    try {
      const turnstileValid = await turnstile.verify();
      if (!turnstileValid) {
        setStatus('error');
        return;
      }

      const { error } = await supabase
        .from('newsletter_subscribers')
        .insert({
          email: email.toLowerCase().trim(),
          status: 'active',
          source: 'footer_widget',
          engagement_score: 50,
          categories: ['assurance-taxi', 'actualites'],
        });

      if (error) {
        if (error.code === '23505') {
          setStatus('error');
        } else {
          throw error;
        }
      } else {
        setStatus('success');
        setEmail('');
      }
    } catch (error) {
      console.error('Erreur:', error);
      setStatus('error');
    } finally {
      setLoading(false);
      setTimeout(() => setStatus('idle'), 5000);
    }
  }

  return (
    <div>
      <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <Mail className="w-5 h-5 text-orange-400" />
        Newsletter
      </h4>

      <p className="text-gray-300 text-sm mb-4 leading-relaxed">
        Recevez nos actualités et conseils d'experts directement dans votre boîte mail.
      </p>

      {status === 'success' ? (
        <div className="bg-green-900/30 border border-green-700 rounded-lg p-4 flex items-start gap-2">
          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-green-300 font-medium text-sm">Inscription réussie !</p>
            <p className="text-green-400 text-xs mt-1">Merci de votre confiance</p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              required
              disabled={loading}
              className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition text-sm disabled:opacity-50"
            />
          </div>

          <label className="flex items-start gap-2 text-xs text-gray-400 leading-relaxed">
            <input
              type="checkbox"
              checked={marketingConsent}
              onChange={(e) => setMarketingConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-600 bg-gray-900 text-orange-500 focus:ring-orange-500"
            />
            <span>J'accepte de recevoir les actualites et offres TaxiAssur par email. Desinscription possible a tout moment.</span>
          </label>

          {turnstile.widget}

          {status === 'error' && (
            <p className="text-red-400 text-xs">
              Erreur d'inscription. Vérifiez votre email.
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !marketingConsent || !turnstile.canSubmit}
            className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-2.5 px-4 rounded-lg font-semibold hover:from-orange-600 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 text-sm group"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                S'abonner
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>
      )}

      <p className="text-xs text-gray-500 mt-3">
        Pas de spam. Désabonnement en 1 clic.
      </p>
    </div>
  );
}
