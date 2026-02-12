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

  const verifyAndCreateAccess = async (leadId: string) => {
    try {
      setMessage('Vérification de votre identité...');

      // 1. Vérifier si le lead existe
      const { data: lead, error: leadError } = await supabase
        .from('crm_leads')
        .select('id, email, first_name, last_name, phone, status')
        .eq('id', leadId)
        .maybeSingle();

      if (leadError) {
        logger.error('Error fetching lead:', leadError);
        throw new Error('Impossible de vérifier votre identité');
      }

      if (!lead) {
        setStatus('error');
        setMessage('Accès non valide. Veuillez contacter notre service client.');
        return;
      }

      if (!lead.email) {
        setStatus('error');
        setMessage('Votre email n\'est pas enregistré. Veuillez contacter notre service client.');
        return;
      }

      setMessage('Création de votre espace client...');

      // 2. Vérifier si un portail client existe déjà
      const { data: existingPortal } = await supabase
        .from('client_portal_users')
        .select('*')
        .eq('email', lead.email.toLowerCase().trim())
        .maybeSingle();

      if (!existingPortal) {
        // 3. Créer un accès portail client
        const { error: portalError } = await supabase
          .from('client_portal_users')
          .insert({
            email: lead.email.toLowerCase().trim(),
            lead_id: lead.id,
            first_name: lead.first_name,
            last_name: lead.last_name,
            phone: lead.phone,
            is_active: true,
            metadata: {
              created_from: 'client_access_token',
              created_at: new Date().toISOString(),
              initial_status: lead.status
            }
          });

        if (portalError) {
          logger.error('Error creating portal user:', portalError);
          throw new Error('Erreur lors de la création de votre espace');
        }
      }

      setMessage('Connexion à votre espace...');
      setStatus('success');

      // 4. Rediriger vers le dashboard client
      setTimeout(() => {
        navigate(`/client/dashboard?email=${encodeURIComponent(lead.email)}`);
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
          {/* Icône */}
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

          {/* Titre */}
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            {status === 'loading' && 'Accès à votre espace'}
            {status === 'success' && 'Accès autorisé !'}
            {status === 'error' && 'Accès refusé'}
          </h1>

          {/* Message */}
          <p className={`mb-6 ${
            status === 'error' ? 'text-red-600' : 'text-gray-600'
          }`}>
            {message}
          </p>

          {/* Logo */}
          <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
            <Shield className="w-4 h-4" />
            <span>TaxiAssur - Espace Client Sécurisé</span>
          </div>

          {/* Bouton retour si erreur */}
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
