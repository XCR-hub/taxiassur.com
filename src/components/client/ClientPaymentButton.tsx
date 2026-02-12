import { useState, useEffect } from 'react';
import { CreditCard, CheckCircle, Loader2, AlertCircle, ExternalLink, Euro, Lock } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Props {
  leadId: string;
}

export default function ClientPaymentButton({ leadId }: Props) {
  const [loading, setLoading] = useState(true);
  const [paymentInfo, setPaymentInfo] = useState<{
    required: boolean;
    amount: number | null;
    status: 'pending' | 'processing' | 'paid' | 'failed' | 'refunded' | null;
    payment_link: string | null;
    paid_at: string | null;
  } | null>(null);

  useEffect(() => {
    loadPaymentInfo();
  }, [leadId]);

  const loadPaymentInfo = async () => {
    try {
      setLoading(true);

      const { data: contract } = await supabase
        .from('lead_contracts')
        .select('down_payment_required, down_payment_amount, down_payment_status, down_payment_link, down_payment_paid_at')
        .eq('lead_id', leadId)
        .maybeSingle();

      if (contract) {
        setPaymentInfo({
          required: contract.down_payment_required || false,
          amount: contract.down_payment_amount,
          status: contract.down_payment_status,
          payment_link: contract.down_payment_link,
          paid_at: contract.down_payment_paid_at
        });
      }
    } catch (error) {
      console.error('Erreur chargement paiement:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = () => {
    if (!paymentInfo?.payment_link) return;
    const paymentUrl = `${window.location.origin}/paiement/${paymentInfo.payment_link}`;
    window.open(paymentUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
        <div className="flex items-center justify-center gap-3 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          Chargement des informations de paiement...
        </div>
      </div>
    );
  }

  if (!paymentInfo?.required || !paymentInfo?.amount) {
    return null;
  }

  if (paymentInfo.status === 'paid') {
    return (
      <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-8 text-center">
        <CheckCircle className="text-green-400 mx-auto mb-4" size={64} />
        <h3 className="text-2xl font-bold text-white mb-2">Paiement effectué !</h3>
        <p className="text-gray-300 mb-4">
          Votre comptant de{' '}
          <span className="font-bold text-green-400">
            {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(paymentInfo.amount)}
          </span>
          {' '}a été reçu avec succès.
        </p>
        {paymentInfo.paid_at && (
          <p className="text-sm text-gray-500">
            Payé le {new Date(paymentInfo.paid_at).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        )}
        <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <p className="text-sm text-blue-300">
            ✅ Votre contrat sera activé sous 24h. Vous recevrez une confirmation par email.
          </p>
        </div>
      </div>
    );
  }

  const formattedAmount = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(paymentInfo.amount);

  return (
    <div className="bg-gradient-to-br from-orange-500/20 via-orange-600/10 to-yellow-500/20 border border-orange-500/40 rounded-xl p-8">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-full mb-4 animate-pulse">
          <CreditCard className="text-white" size={36} />
        </div>
        <h3 className="text-3xl font-bold text-white mb-2">Paiement du comptant</h3>
        <p className="text-gray-300 text-lg">Dernière étape pour activer votre contrat</p>
      </div>

      <div className="bg-gray-900/70 backdrop-blur-sm border border-gray-700 rounded-xl p-6 mb-6">
        <div className="text-center">
          <p className="text-gray-400 text-sm mb-2">Montant à régler</p>
          <p className="text-5xl font-bold text-white mb-2">{formattedAmount}</p>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <Lock className="w-4 h-4" />
            <span>Paiement sécurisé par Monetico (CIC)</span>
          </div>
        </div>
      </div>

      <div className="space-y-4 mb-6">
        <div className="flex items-start gap-3 text-sm text-gray-300">
          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
          <span>Transaction cryptée et 100% sécurisée</span>
        </div>
        <div className="flex items-start gap-3 text-sm text-gray-300">
          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
          <span>Activation instantanée de votre contrat</span>
        </div>
        <div className="flex items-start gap-3 text-sm text-gray-300">
          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
          <span>Attestation envoyée par email immédiatement</span>
        </div>
        <div className="flex items-start gap-3 text-sm text-gray-300">
          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
          <span>Vous pouvez rouler dès la confirmation</span>
        </div>
      </div>

      {paymentInfo.status === 'failed' && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-300 font-semibold mb-1">Le paiement précédent a échoué</p>
              <p className="text-sm text-red-400">
                Veuillez réessayer ou contacter notre équipe si le problème persiste.
              </p>
            </div>
          </div>
        </div>
      )}

      {paymentInfo.status === 'processing' && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <Loader2 className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5 animate-spin" />
            <div>
              <p className="text-blue-300 font-semibold mb-1">Paiement en cours de traitement</p>
              <p className="text-sm text-blue-400">
                Votre paiement est en cours de validation. Cela peut prendre quelques minutes.
              </p>
            </div>
          </div>
        </div>
      )}

      {paymentInfo.payment_link ? (
        <button
          onClick={handlePayment}
          className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-5 px-8 rounded-xl flex items-center justify-center gap-3 text-xl font-bold transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
        >
          <CreditCard className="w-6 h-6" />
          Je paye pour lancer mon contrat
          <ExternalLink className="w-5 h-5" />
        </button>
      ) : (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-300 font-semibold mb-1">Lien de paiement en préparation</p>
              <p className="text-sm text-amber-400">
                Notre équipe prépare votre lien de paiement. Vous recevrez un email dans quelques instants.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 text-center">
        <p className="text-xs text-gray-500">
          En cliquant sur "Je paye", vous serez redirigé vers notre plateforme de paiement sécurisée Monetico (CIC).
        </p>
      </div>
    </div>
  );
}
