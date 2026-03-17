import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Shield, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

export default function ClientAccessByToken() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Vérification de votre accès...');

  useEffect(() => {
    if (token) {
      verifyAndCreateAccess(token);
    }
  }, [token]);

  const verifyAndCreateAccess = async (tokenOrId: string) => {
    try {
      setMessage('Vérification de votre identité...');

      const { data, error } = await supabase
        .rpc('get_or_create_client_portal_access', { p_token: tokenOrId });

      if (error) {
        logger.error('RPC error:', error);
        throw new Error('Impossible de vérifier votre accès');
      }

      if (!data || !data.success) {
        setStatus('error');
        setMessage(data?.error || 'Accès non valide. Veuillez contacter notre service client.');
        return;
      }

      setMessage('Connexion à votre espace...');
      setStatus('success');

      setTimeout(() => {
        navigate(`/client/dashboard?email=${encodeURIComponent(data.email)}`);
      }, 1500);

    } catch (error) {
      logger.error('Error in verifyAndCreateAccess:', error);
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Une erreur est survenue');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center">
          <div className="mb-6">
            {status === 'loading' && (
              <Loader2 className="w-16 h-16 text-blue-600 mx-auto animate-spin" />
            )}
            {status === 'success' && (
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
            )}
            {status === 'error' && (
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-10 h-10 text-red-600" />
              </div>
            )}
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            {status === 'loading' && 'Accès à votre espace'}
            {status === 'success' && 'Accès autorisé !'}
            {status === 'error' && 'Accès refusé'}
          </h1>

          <p className={`mb-6 ${status === 'error' ? 'text-red-600' : 'text-gray-600'}`}>
            {message}
          </p>

          <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
            <Shield className="w-4 h-4" />
            <span>TaxiAssur - Espace Client Sécurisé</span>
          </div>

          {status === 'error' && (
            <div className="mt-6">
              <a
                href="/"
                className="inline-block px-6 py-3 bg-gradient-to-r from-yellow-600 to-yellow-500 text-black rounded-lg font-bold hover:from-yellow-700 hover:to-yellow-600 transition-all"
              >
                Retour à l'accueil
              </a>
              <p className="mt-4 text-sm text-gray-500">
                Besoin d'aide ? Appelez-nous au{' '}
                <a href="tel:0180855786" className="text-blue-600 hover:underline font-semibold">
                  01 80 85 57 86
                </a>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
