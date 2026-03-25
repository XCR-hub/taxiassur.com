import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CreditCard,
  Check,
  X,
  AlertCircle,
  Lock,
  Shield,
  ArrowLeft,
  Loader2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Logo from '@/components/Logo';
import SEOHead from '@/components/SEOHead';

interface PaymentInfo {
  contract_id: string;
  lead_id: string;
  amount: number;
  status: string;
  is_valid: boolean;
  lead_email: string;
  lead_name: string;
}

const DownPaymentPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    if (token) {
      validatePaymentLink(token);
    }
  }, [token]);

  const validatePaymentLink = async (paymentToken: string) => {
    try {
      const { data, error } = await supabase
        .rpc('validate_payment_link', { p_payment_token: paymentToken });

      if (error) throw error;

      if (data && data.length > 0) {
        const info = data[0];
        setPaymentInfo(info);

        if (!info.is_valid) {
          if (info.status === 'paid') {
            setError('Ce paiement a déjà été effectué.');
          } else {
            setError('Ce lien de paiement a expiré ou n\'est plus valide.');
          }
        }
      } else {
        setError('Lien de paiement introuvable.');
      }
    } catch (err) {
      console.error('Error validating payment link:', err);
      setError('Erreur lors de la validation du lien de paiement.');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!paymentInfo || !token) return;

    setProcessing(true);
    setError(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));

      const transactionId = `CIC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cic-payment-webhook`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            payment_token: token,
            transaction_id: transactionId,
            status: 'paid',
            amount: paymentInfo.amount,
            provider_data: {
              payment_method: 'card',
              card_type: 'visa',
              last4: '4242'
            }
          })
        }
      );

      if (!response.ok) {
        throw new Error('Erreur lors de l\'enregistrement du paiement');
      }

      setPaymentSuccess(true);
    } catch (err) {
      console.error('Payment error:', err);
      setError('Une erreur est survenue lors du paiement. Veuillez réessayer.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (paymentSuccess) {
    return (
      <>
        <SEOHead
          title="Paiement confirmé - TaxiAssur"
          description="Votre paiement a été confirmé avec succès"
          noindex={true}
        />
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
              <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="w-10 h-10 text-white" />
              </div>

              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Paiement confirmé !
              </h1>
              <p className="text-gray-600 mb-6">
                Votre comptant de <span className="font-bold">{paymentInfo?.amount.toFixed(2)} EUR</span> a été reçu avec succès.
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-900">
                  Vous allez recevoir un email de confirmation avec le lien pour signer électroniquement votre contrat.
                </p>
              </div>

              <button
                onClick={() => window.location.href = 'https://taxiassur.com'}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Retour à l'accueil
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (error || !paymentInfo || !paymentInfo.is_valid) {
    return (
      <>
        <SEOHead
          title="Erreur - Paiement non disponible - TaxiAssur"
          description="Ce lien de paiement n'est pas valide"
          noindex={true}
        />
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
              <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <X className="w-10 h-10 text-white" />
              </div>

              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Lien non valide
              </h1>
              <p className="text-gray-600 mb-6">
                {error || 'Ce lien de paiement n\'est plus valide.'}
              </p>

              <button
                onClick={() => window.location.href = 'https://taxiassur.com/contact'}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Contacter le support
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SEOHead
        title="Paiement comptant - TaxiAssur"
        description="Réglez votre comptant pour finaliser votre contrat d'assurance taxi"
        noindex={true}
      />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <Logo />
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour
            </button>
          </div>

          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
                <h1 className="text-2xl font-bold mb-2">Paiement comptant</h1>
                <p className="text-blue-100">Finalisez votre contrat d'assurance taxi</p>
              </div>

              <div className="p-8">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <CreditCard className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">Montant à régler</h3>
                      <p className="text-3xl font-bold text-blue-600">
                        {paymentInfo.amount.toFixed(2)} EUR
                      </p>
                      <p className="text-sm text-gray-600 mt-2">
                        Client : {paymentInfo.lead_name}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-6 mb-6 space-y-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Informations de paiement</h3>
                  <p className="text-sm text-gray-700">
                    Un comptant est requis pour finaliser votre contrat d'assurance taxi.
                  </p>
                  <p className="text-sm text-gray-700">
                    Une fois le paiement validé, vous recevrez un email avec le lien pour signer électroniquement votre contrat.
                  </p>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex items-center gap-3 text-sm text-gray-700">
                    <Shield className="w-5 h-5 text-green-600" />
                    <span>Paiement sécurisé par cryptage SSL</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-700">
                    <Lock className="w-5 h-5 text-green-600" />
                    <span>Vos données bancaires sont protégées</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-700">
                    <Check className="w-5 h-5 text-green-600" />
                    <span>Confirmation immédiate par email</span>
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-medium mb-1">Mode démo activé</p>
                      <p>
                        Ce paiement est simulé pour la démonstration.
                        En production, vous serez redirigé vers la plateforme sécurisée CIC.
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handlePayment}
                  disabled={processing}
                  className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium text-lg"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Traitement en cours...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5" />
                      Payer {paymentInfo.amount.toFixed(2)} EUR
                    </>
                  )}
                </button>

                <p className="text-xs text-gray-500 text-center mt-4">
                  En cliquant sur "Payer", vous acceptez nos conditions générales de vente
                </p>
              </div>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Besoin d'aide ? Contactez-nous au{' '}
                <a href="tel:0176390060" className="text-blue-600 hover:underline font-medium">
                  01 76 39 00 60
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DownPaymentPage;
