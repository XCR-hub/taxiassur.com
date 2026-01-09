import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, CheckCircle, AlertCircle } from 'lucide-react';

export default function NewsletterSubscribeForm() {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!email || !email.includes('@')) {
      setStatus('error');
      setMessage('Email invalide');
      return;
    }

    setLoading(true);
    setStatus('idle');

    try {
      const { error } = await supabase
        .from('newsletter_subscribers')
        .insert({
          email: email.toLowerCase().trim(),
          first_name: firstName.trim() || null,
          status: 'active',
          source: 'website_form',
          engagement_score: 50,
          categories: ['assurance-taxi', 'actualites'],
        });

      if (error) {
        if (error.code === '23505') {
          setStatus('error');
          setMessage('Cet email est déjà inscrit');
        } else {
          throw error;
        }
      } else {
        setStatus('success');
        setMessage('Inscription réussie ! Vous recevrez bientôt notre prochaine newsletter.');
        setEmail('');
        setFirstName('');
      }
    } catch (error) {
      console.error('Erreur:', error);
      setStatus('error');
      setMessage('Une erreur est survenue. Réessayez plus tard.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-white p-8 rounded-2xl shadow-lg border border-blue-100">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
          <Mail className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-gray-900">Newsletter TaxiAssur</h3>
          <p className="text-gray-600">Recevez nos actualités et conseils</p>
        </div>
      </div>

      {status === 'success' ? (
        <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-green-900">Inscription confirmée !</p>
            <p className="text-sm text-green-700 mt-1">{message}</p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
              Prénom (optionnel)
            </label>
            <input
              type="text"
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Jean"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              disabled={loading}
            />
          </div>

          {status === 'error' && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{message}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Inscription...
              </>
            ) : (
              <>
                <Mail className="w-5 h-5" />
                S'abonner gratuitement
              </>
            )}
          </button>

          <p className="text-xs text-gray-500 text-center">
            En vous inscrivant, vous acceptez de recevoir nos emails.
            <br />
            Désabonnement possible à tout moment.
          </p>
        </form>
      )}

      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="font-semibold text-gray-900 mb-3">Ce que vous recevrez :</h4>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
            <span>Les derniers articles sur l'assurance taxi</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
            <span>Conseils pratiques et réglementation</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
            <span>Actualités du secteur taxi & VTC</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
            <span>Offres spéciales réservées aux abonnés</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
