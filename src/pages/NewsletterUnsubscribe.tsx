import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CheckCircle, AlertCircle, Mail } from 'lucide-react';

export default function NewsletterUnsubscribe() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Token de désabonnement manquant');
      return;
    }

    unsubscribe();
  }, [token]);

  async function unsubscribe() {
    try {
      const { data, error } = await supabase.rpc('unsubscribe_newsletter', {
        p_token: token,
      });

      if (error) {
        throw error;
      }

      if (data?.success) {
        setStatus('success');
        setMessage(data.message || 'Vous avez été désabonné avec succès');
      } else {
        setStatus('error');
        setMessage(data?.message || 'Token invalide ou déjà utilisé');
      }
    } catch (error) {
      console.error('Erreur:', error);
      setStatus('error');
      setMessage('Une erreur est survenue lors du désabonnement');
    }
  }

  return (
    <>
      <Helmet>
        <title>Désabonnement Newsletter - TaxiAssur</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center">
            {status === 'loading' && (
              <>
                <div className="w-16 h-16 mx-auto mb-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Désabonnement en cours...
                </h1>
                <p className="text-gray-600">Veuillez patienter</p>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Désabonnement confirmé
                </h1>
                <p className="text-gray-600 mb-8">{message}</p>

                <div className="bg-gray-50 rounded-lg p-6 mb-6">
                  <p className="text-sm text-gray-700 mb-4">
                    Nous sommes désolés de vous voir partir. Vous ne recevrez plus d'emails de notre part.
                  </p>
                  <p className="text-sm text-gray-600">
                    Si vous changez d'avis, vous pouvez vous réabonner à tout moment.
                  </p>
                </div>

                <div className="space-y-3">
                  <a
                    href="/newsletter/subscribe"
                    className="block w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                  >
                    Me réabonner
                  </a>
                  <a
                    href="/"
                    className="block w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                  >
                    Retour à l'accueil
                  </a>
                </div>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <AlertCircle className="w-10 h-10 text-red-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Erreur de désabonnement
                </h1>
                <p className="text-gray-600 mb-8">{message}</p>

                <div className="bg-gray-50 rounded-lg p-6 mb-6">
                  <p className="text-sm text-gray-700">
                    Si le problème persiste, contactez-nous à{' '}
                    <a href="mailto:contact@taxiassur.com" className="text-blue-600 hover:underline">
                      contact@taxiassur.com
                    </a>
                  </p>
                </div>

                <a
                  href="/"
                  className="block w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                >
                  Retour à l'accueil
                </a>
              </>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-500">
              TaxiAssur - Votre courtier en assurance taxi
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
