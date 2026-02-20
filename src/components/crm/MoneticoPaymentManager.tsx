import React, { useState, useEffect } from 'react';
import { CreditCard, CheckCircle, XCircle, Loader, Euro, AlertCircle, ExternalLink, Mail, Send } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface MoneticoPaymentManagerProps {
  leadId: string;
  onPaymentSuccess?: () => void;
}

interface Payment {
  id: string;
  reference: string;
  amount: number;
  status: string;
  payment_date: string | null;
  card_type: string | null;
  card_last4: string | null;
  created_at: string;
}

export function MoneticoPaymentManager({ leadId, onPaymentSuccess }: MoneticoPaymentManagerProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadPayments();

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

      const hasSuccessfulPayment = data?.some(p => p.status === 'success');
      if (hasSuccessfulPayment && onPaymentSuccess) {
        onPaymentSuccess();
      }
    } catch (err) {
      console.error('Erreur chargement paiements:', err);
    } finally {
      setLoading(false);
    }
  };

  const createPayment = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Veuillez entrer un montant valide');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      console.log('🚀 Création paiement pour lead:', leadId);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-monetico-payment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            leadId,
            amount: parseFloat(amount),
            description: description || `Paiement comptant assurance taxi`,
          }),
        }
      );

      const result = await response.json();
      console.log('📦 Réponse serveur:', result);

      if (!response.ok) {
        const errorMsg = result.details
          ? `${result.error}: ${result.details}`
          : result.error || 'Erreur lors de la création du paiement';
        throw new Error(errorMsg);
      }

      if (result.success && result.htmlForm) {
        const newWindow = window.open('', '_blank');
        if (newWindow) {
          newWindow.document.write(result.htmlForm);
          newWindow.document.close();
        }

        setAmount('');
        setDescription('');
        await loadPayments();
      } else if (result.error) {
        throw new Error(result.error);
      }
    } catch (err: any) {
      console.error('❌ Erreur détaillée:', err);
      setError(err.message || 'Erreur inconnue lors de la création du paiement');
    } finally {
      setCreating(false);
    }
  };

  const sendPaymentEmail = async (paymentId: string) => {
    setSendingEmail(paymentId);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-payment-link-monetico`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ paymentId }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de l\'envoi de l\'email');
      }

      setSuccessMessage(`Email envoyé avec succès à ${result.email}`);

      // Effacer le message après 5 secondes
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      console.error('Erreur envoi email:', err);
      setError(err.message || 'Erreur lors de l\'envoi de l\'email');
    } finally {
      setSendingEmail(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; icon: any }> = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Loader },
      processing: { bg: 'bg-blue-100', text: 'text-blue-800', icon: Loader },
      success: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
      failed: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-800', icon: XCircle },
    };

    const style = styles[status] || styles.pending;
    const Icon = style.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
        <Icon className="w-3 h-3" />
        {status === 'success' ? 'Payé' :
         status === 'pending' ? 'En attente' :
         status === 'processing' ? 'En cours' :
         status === 'failed' ? 'Échoué' :
         status === 'cancelled' ? 'Annulé' : status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  const hasSuccessfulPayment = payments.some(p => p.status === 'success');
  const totalPaid = payments
    .filter(p => p.status === 'success')
    .reduce((sum, p) => sum + p.amount, 0);
  const totalPending = payments
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      {/* Message de succès global */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-700 font-medium">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Résumé des paiements */}
      {payments.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total payé</p>
              <p className="text-2xl font-bold text-green-600">{totalPaid.toFixed(2)} €</p>
              <p className="text-xs text-gray-500 mt-1">
                {payments.filter(p => p.status === 'success').length} paiement(s) réussi(s)
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">En attente</p>
              <p className="text-2xl font-bold text-orange-600">{totalPending.toFixed(2)} €</p>
              <p className="text-xs text-gray-500 mt-1">
                {payments.filter(p => p.status === 'pending').length} paiement(s) en attente
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Formulaire toujours visible */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">
            {hasSuccessfulPayment ? 'Demander un paiement supplémentaire' : 'Demander un paiement comptant'}
          </h3>
        </div>

        <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Montant (€)
              </label>
              <div className="relative">
                <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (optionnel)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Paiement comptant assurance taxi"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={createPayment}
                disabled={creating}
                className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
              >
                {creating ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Création...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    Encaisser
                  </>
                )}
              </button>

              <button
                onClick={async () => {
                  if (!amount || parseFloat(amount) <= 0) {
                    setError('Veuillez entrer un montant valide');
                    return;
                  }

                  setCreating(true);
                  setError(null);

                  try {
                    const response = await fetch(
                      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-monetico-payment`,
                      {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                        },
                        body: JSON.stringify({
                          leadId,
                          amount: parseFloat(amount),
                          description: description || `Paiement comptant assurance taxi`,
                        }),
                      }
                    );

                    const result = await response.json();

                    if (!response.ok) {
                      throw new Error(result.error || 'Erreur lors de la création du paiement');
                    }

                    // Envoyer l'email directement
                    if (result.paymentId) {
                      await sendPaymentEmail(result.paymentId);
                      setAmount('');
                      setDescription('');
                      await loadPayments();
                    }
                  } catch (err: any) {
                    console.error('❌ Erreur:', err);
                    setError(err.message || 'Erreur inconnue');
                  } finally {
                    setCreating(false);
                  }
                }}
                disabled={creating}
                className="bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
              >
                {creating ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Envoi...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Envoyer par email
                  </>
                )}
              </button>
            </div>

          <p className="text-xs text-gray-500 text-center">
            <strong>Encaisser :</strong> Ouvre le paiement (vous payez pour le client)
            <br />
            <strong>Envoyer par email :</strong> Envoie le lien au client
          </p>
        </div>
      </div>

      {/* Historique des paiements */}
      {payments.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-gray-900">
              Historique des paiements ({payments.length})
            </h4>
            {payments.length > 1 && (
              <div className="text-sm text-gray-600">
                Total : {payments.reduce((sum, p) => sum + p.amount, 0).toFixed(2)} €
              </div>
            )}
          </div>
          <div className="space-y-3">
            {payments.map((payment, index) => (
              <div
                key={payment.id}
                className={`flex items-center justify-between p-4 rounded-lg border-2 ${
                  payment.status === 'success'
                    ? 'bg-green-50 border-green-200'
                    : payment.status === 'pending'
                    ? 'bg-yellow-50 border-yellow-200'
                    : payment.status === 'failed'
                    ? 'bg-red-50 border-red-200'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-medium text-gray-500">
                      #{payments.length - index}
                    </span>
                    <span className="font-bold text-lg text-gray-900">
                      {payment.amount.toFixed(2)} €
                    </span>
                    {getStatusBadge(payment.status)}
                  </div>
                  <p className="text-sm text-gray-600 font-mono">
                    Réf: {payment.reference}
                  </p>
                  {payment.card_type && payment.card_last4 && (
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <CreditCard className="w-3 h-3" />
                      {payment.card_type} •••• {payment.card_last4}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(payment.created_at).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                  {payment.payment_date && (
                    <p className="text-xs text-green-600 mt-1 font-medium">
                      Payé le {new Date(payment.payment_date).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  )}
                </div>

                {payment.status === 'pending' && (
                  <button
                    onClick={() => sendPaymentEmail(payment.id)}
                    disabled={sendingEmail === payment.id}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {sendingEmail === payment.id ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        Envoi...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4" />
                        {payments.filter(p => p.status === 'pending').length > 1 ? 'Renvoyer' : 'Envoyer par email'}
                      </>
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-2">Paiements multiples :</p>
            <ul className="space-y-1 ml-4">
              <li><strong>Encaisser :</strong> Ouvre une nouvelle fenêtre pour payer directement (client présent)</li>
              <li><strong>Envoyer par email :</strong> Envoie un email avec le lien de paiement sécurisé</li>
              <li><strong>Plusieurs paiements :</strong> Vous pouvez demander autant de paiements que nécessaire (acomptes, soldes, frais supplémentaires...)</li>
            </ul>
            <p className="mt-2 text-xs">Tous les paiements sont sécurisés via Monetico CIC (3D Secure, PCI-DSS niveau 1)</p>
          </div>
        </div>
      </div>

      {/* Cartes de Test - Mode Développement */}
      <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-300 rounded-lg p-5">
        <div className="flex items-start gap-3 mb-4">
          <CreditCard className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 mb-1">Mode TEST - Cartes Bancaires de Test</h4>
            <p className="text-sm text-gray-600">
              Utilisez ces cartes pour tester les paiements (aucun prélèvement réel)
            </p>
          </div>
        </div>

        {/* Carte de test unique */}
        <div className="max-w-md mx-auto">
          {/* Carte VISA Succès - SEULE CARTE VALIDÉE */}
          <div className="bg-white border-2 border-green-300 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="font-semibold text-green-900">VISA - Paiement Accepté</span>
            </div>
            <div className="space-y-2 font-mono text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Numéro:</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText('5017670000001800');
                    alert('✅ Numéro copié !');
                  }}
                  className="font-bold text-green-700 hover:text-green-800 cursor-pointer"
                >
                  5017 6700 0000 1800 📋
                </button>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Expiration:</span>
                <span className="font-semibold text-gray-900">12/26</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">CVV:</span>
                <span className="font-semibold text-gray-900">123</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-green-200">
              <p className="text-xs text-green-800">
                ✅ Paiement sera <strong>ACCEPTÉ</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Info carte validée + carte refus non disponible */}
        <div className="mt-4 pt-4 border-t space-y-3">
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-green-900 space-y-1">
              <p><strong>✅ CARTE VALIDÉE :</strong> Cette carte fonctionne avec votre configuration</p>
              <p>Cliquez sur le numéro de carte pour le copier dans le presse-papier</p>
              <p>Cette carte ne fonctionne qu'en <strong>MODE TEST</strong> (aucun prélèvement réel)</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-orange-900 space-y-1">
              <p><strong>⚠️ Carte de refus non disponible</strong></p>
              <p>Pour tester un paiement refusé, contactez <strong>Ingineco</strong> ou <strong>Monético</strong> pour obtenir une carte de test spécifique.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
