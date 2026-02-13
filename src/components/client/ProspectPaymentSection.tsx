import React, { useState, useEffect } from 'react';
import { CreditCard, CheckCircle, Clock, XCircle, ExternalLink, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ProspectPaymentSectionProps {
  leadId: string;
  accessToken: string;
}

interface Payment {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  status: string;
  description: string | null;
  created_at: string;
  payment_date: string | null;
  card_type: string | null;
  card_last4: string | null;
}

export function ProspectPaymentSection({ leadId, accessToken }: ProspectPaymentSectionProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPayments();

    // Real-time subscription
    const channel = supabase
      .channel(`payments-${leadId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'monetico_payments',
          filter: `lead_id=eq.${leadId}`
        },
        () => {
          loadPayments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [leadId]);

  const loadPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('monetico_payments')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPayments(data || []);
    } catch (error) {
      console.error('Erreur chargement paiements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (paymentId: string) => {
    try {
      // Créer le formulaire de paiement
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-monetico-payment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            paymentId: paymentId,
          }),
        }
      );

      const result = await response.json();

      if (result.success && result.htmlForm) {
        // Ouvrir le formulaire dans une nouvelle fenêtre
        const newWindow = window.open('', '_blank');
        if (newWindow) {
          newWindow.document.write(result.htmlForm);
          newWindow.document.close();
        }
      } else {
        alert('Erreur lors de la création du lien de paiement');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Une erreur est survenue');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; icon: any; label: string }> = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock, label: 'En attente' },
      processing: { bg: 'bg-blue-100', text: 'text-blue-800', icon: Clock, label: 'En cours' },
      success: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle, label: 'Payé' },
      failed: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle, label: 'Échoué' },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-800', icon: XCircle, label: 'Annulé' },
    };

    const style = styles[status] || styles.pending;
    const Icon = style.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${style.bg} ${style.text}`}>
        <Icon className="w-4 h-4" />
        {style.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const pendingPayments = payments.filter(p => p.status === 'pending');
  const completedPayments = payments.filter(p => p.status !== 'pending');

  return (
    <div className="space-y-6">
      {/* Paiements en attente */}
      {pendingPayments.length > 0 && (
        <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="bg-orange-100 p-3 rounded-full">
              <AlertCircle className="w-6 h-6 text-orange-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 text-lg mb-2">
                💳 Paiement en attente
              </h3>
              <p className="text-gray-700 mb-4">
                Veuillez effectuer le paiement comptant pour activer votre assurance.
              </p>

              <div className="space-y-3">
                {pendingPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="bg-white border border-orange-200 rounded-lg p-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="font-bold text-2xl text-orange-600">
                          {payment.amount.toFixed(2)} €
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          Référence: {payment.reference}
                        </div>
                        {payment.description && (
                          <div className="text-sm text-gray-500 mt-1">
                            {payment.description}
                          </div>
                        )}
                      </div>
                      {getStatusBadge(payment.status)}
                    </div>

                    <button
                      onClick={() => handlePayment(payment.id)}
                      className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-3 px-6 rounded-lg font-bold text-lg hover:from-green-700 hover:to-green-800 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                    >
                      <CreditCard className="w-5 h-5" />
                      Payer maintenant
                    </button>

                    <div className="mt-3 flex items-center justify-center gap-2 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>Paiement sécurisé</span>
                      </div>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>Activation instantanée</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Paiements effectués */}
      {completedPayments.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 text-lg mb-4">
            📋 Historique des paiements
          </h3>
          <div className="space-y-3">
            {completedPayments.map((payment) => (
              <div
                key={payment.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-bold text-xl text-gray-900">
                        {payment.amount.toFixed(2)} €
                      </span>
                      {getStatusBadge(payment.status)}
                    </div>
                    <div className="text-sm text-gray-600">
                      Référence: {payment.reference}
                    </div>
                    {payment.card_type && payment.card_last4 && (
                      <div className="text-sm text-gray-500 mt-1">
                        {payment.card_type} •••• {payment.card_last4}
                      </div>
                    )}
                    {payment.payment_date && (
                      <div className="text-xs text-gray-500 mt-1">
                        Payé le {new Date(payment.payment_date).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Aucun paiement */}
      {payments.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
          <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">Aucun paiement en attente</p>
        </div>
      )}

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">Paiement sécurisé</p>
            <p className="text-blue-800">
              Tous les paiements sont traités de manière sécurisée via Monetico (Crédit Mutuel).
              Vos données bancaires ne sont jamais stockées sur nos serveurs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
