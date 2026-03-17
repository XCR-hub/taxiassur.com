import { useState, useEffect } from 'react';
import { CreditCard, Clock, CheckCircle2, XCircle, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';
import type { SupabaseClient } from '@supabase/supabase-js';

interface Payment {
  id: string;
  payment_reference: string;
  amount: number;
  description: string;
  payment_url: string;
  status: 'pending' | 'sent' | 'paid' | 'failed' | 'cancelled';
  created_at: string;
  sent_at: string | null;
  paid_at: string | null;
  expires_at: string | null;
}

interface Props {
  token?: string;
  supabaseClient?: SupabaseClient;
}

export default function ClientPaymentMontico({ token, supabaseClient }: Props) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadPayments();
  }, [token, supabaseClient]);

  const loadPayments = async () => {
    if (!supabaseClient || !token) return;

    try {
      setLoading(true);
      const { data, error } = await supabaseClient.rpc('get_payments_by_token', {
        p_token: token
      });

      if (error) {
        console.error('Error loading payments:', error);
      } else {
        setPayments(data || []);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPayments();
    setRefreshing(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle2 className="w-6 h-6 text-green-500" />;
      case 'failed':
      case 'cancelled':
        return <XCircle className="w-6 h-6 text-red-500" />;
      case 'sent':
        return <Clock className="w-6 h-6 text-yellow-500" />;
      default:
        return <AlertCircle className="w-6 h-6 text-gray-400" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Payé';
      case 'sent':
        return 'En attente de paiement';
      case 'failed':
        return 'Échec';
      case 'cancelled':
        return 'Annulé';
      default:
        return 'En cours de préparation';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-50 border-green-200';
      case 'sent':
        return 'bg-yellow-50 border-yellow-200';
      case 'failed':
      case 'cancelled':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Chargement des paiements...</p>
        </div>
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className="text-center p-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
        <CreditCard className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-700 mb-2">Aucun paiement</h3>
        <p className="text-gray-600">
          Votre conseiller vous enverra un lien de paiement sécurisé<br />
          lorsque votre dossier sera prêt.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Mes paiements</h2>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {payments.map((payment) => {
        const expired = isExpired(payment.expires_at);
        const canPay = payment.status === 'sent' && !expired;

        return (
          <div
            key={payment.id}
            className={`border-2 rounded-xl p-6 ${getStatusColor(payment.status)}`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                {getStatusIcon(payment.status)}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {payment.description || 'Paiement comptant'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Référence : {payment.payment_reference}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-gray-900">
                  {payment.amount.toFixed(2)} €
                </div>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mt-2 ${
                  payment.status === 'paid'
                    ? 'bg-green-100 text-green-800'
                    : payment.status === 'sent'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {getStatusLabel(payment.status)}
                </span>
              </div>
            </div>

            {payment.status === 'paid' && payment.paid_at && (
              <div className="bg-green-100 border border-green-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 text-green-800">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-semibold">Paiement reçu le {new Date(payment.paid_at).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</span>
                </div>
                <p className="text-sm text-green-700 mt-2">
                  Merci ! Votre paiement a été confirmé. Nous finalisons votre dossier.
                </p>
              </div>
            )}

            {canPay && (
              <div className="bg-white border border-yellow-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 text-yellow-800 mb-3">
                  <Clock className="w-5 h-5" />
                  <span className="font-semibold">Paiement en attente</span>
                </div>
                <p className="text-sm text-gray-700 mb-4">
                  Cliquez sur le bouton ci-dessous pour effectuer votre paiement de manière 100% sécurisée.
                </p>
                <a
                  href={payment.payment_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg hover:shadow-xl"
                >
                  <CreditCard className="w-5 h-5" />
                  Payer maintenant
                  <ExternalLink className="w-4 h-4" />
                </a>
                {payment.expires_at && (
                  <p className="text-xs text-gray-600 mt-3">
                    Ce lien expire le {new Date(payment.expires_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                )}
              </div>
            )}

            {expired && payment.status === 'sent' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-800">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-semibold">Lien expiré</span>
                </div>
                <p className="text-sm text-red-700 mt-2">
                  Ce lien de paiement a expiré. Contactez votre conseiller pour en recevoir un nouveau.
                </p>
              </div>
            )}

            {(payment.status === 'failed' || payment.status === 'cancelled') && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-800">
                  <XCircle className="w-5 h-5" />
                  <span className="font-semibold">
                    {payment.status === 'cancelled' ? 'Paiement annulé' : 'Échec du paiement'}
                  </span>
                </div>
                <p className="text-sm text-red-700 mt-2">
                  Le paiement n'a pas pu être effectué. Contactez votre conseiller si vous avez besoin d'aide.
                </p>
              </div>
            )}

            <div className="flex items-center gap-4 text-xs text-gray-500 mt-4 pt-4 border-t border-gray-200">
              <span>Créé le {new Date(payment.created_at).toLocaleDateString('fr-FR')}</span>
              {payment.sent_at && (
                <span>• Envoyé le {new Date(payment.sent_at).toLocaleDateString('fr-FR')}</span>
              )}
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4">
              <div className="flex items-start gap-2">
                <span className="text-2xl">🔒</span>
                <div className="flex-1 text-xs text-yellow-800">
                  <p className="font-semibold mb-1">Paiement 100% sécurisé</p>
                  <p>Vos données bancaires sont protégées par Monetico Paiement (CIC), certifié PCI-DSS niveau 1.</p>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <p className="text-sm text-gray-600 mb-2">
          Une question sur votre paiement ?
        </p>
        <div className="flex items-center justify-center gap-4 text-sm">
          <a href="tel:0180855788" className="text-orange-600 hover:text-orange-700 font-semibold">
            📞 01 80 85 57 88
          </a>
          <span className="text-gray-400">•</span>
          <a href="mailto:team@taxiassur.com" className="text-orange-600 hover:text-orange-700 font-semibold">
            📧 team@taxiassur.com
          </a>
        </div>
      </div>
    </div>
  );
}
