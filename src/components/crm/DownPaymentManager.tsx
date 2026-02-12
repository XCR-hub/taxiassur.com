import React, { useState } from 'react';
import {
  CreditCard,
  Check,
  X,
  AlertCircle,
  Clock,
  ExternalLink,
  Copy,
  RefreshCw,
  Euro
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface DownPaymentManagerProps {
  contractId: string;
  leadId: string;
  currentStatus?: 'pending' | 'processing' | 'paid' | 'failed' | 'refunded';
  currentAmount?: number;
  requiresPayment?: boolean;
  paymentLink?: string;
  paidAt?: string;
  transactionId?: string;
  onPaymentUpdated?: () => void;
}

export const DownPaymentManager: React.FC<DownPaymentManagerProps> = ({
  contractId,
  leadId,
  currentStatus = 'pending',
  currentAmount = 0,
  requiresPayment = false,
  paymentLink,
  paidAt,
  transactionId,
  onPaymentUpdated
}) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [amount, setAmount] = useState(currentAmount.toString());
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateLink = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Montant invalide');
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-monetico-payment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            leadId: leadId,
            amount: parseFloat(amount),
            description: `Paiement comptant assurance taxi - Contrat ${contractId.slice(0, 8)}`
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la création du paiement Monético');
      }

      const data = await response.json();

      if (data.success && data.htmlForm) {
        const newWindow = window.open('', '_blank', 'width=800,height=600');
        if (newWindow) {
          newWindow.document.write(data.htmlForm);
          newWindow.document.close();
        }

        setIsEditMode(false);

        // Construire l'URL complète du paiement
        const paymentUrl = `${window.location.origin}/paiement/${data.reference}`;

        await supabase
          .from('lead_contracts')
          .update({
            down_payment_required: true,
            down_payment_amount: parseFloat(amount),
            down_payment_status: 'pending',
            down_payment_link: data.reference
          })
          .eq('id', contractId);

        // Récupérer les données du lead pour l'email
        const { data: lead } = await supabase
          .from('crm_leads')
          .select('email, first_name, last_name')
          .eq('id', leadId)
          .single();

        // Envoyer l'email de paiement automatiquement
        if (lead && lead.email) {
          try {
            await supabase.functions.invoke('send-payment-link-email', {
              body: {
                lead_id: leadId,
                payment_url: paymentUrl,
                amount: parseFloat(amount),
                email: lead.email,
                first_name: lead.first_name,
                last_name: lead.last_name
              }
            });
            console.log('✅ Email de paiement envoyé automatiquement');
          } catch (emailError) {
            console.error('⚠️ Erreur envoi email:', emailError);
            // Ne pas bloquer le processus si l'email échoue
          }
        }

        onPaymentUpdated?.();
      } else {
        throw new Error(data.error || 'Échec de la création du paiement');
      }
    } catch (err: any) {
      console.error('Error creating Monético payment:', err);
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyLink = async () => {
    if (!paymentLink) return;

    const fullLink = `${window.location.origin}/paiement/${paymentLink}`;
    await navigator.clipboard.writeText(fullLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusBadge = () => {
    switch (currentStatus) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
            <Check className="w-4 h-4" />
            Payé
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
            <Clock className="w-4 h-4" />
            En attente
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
            <RefreshCw className="w-4 h-4 animate-spin" />
            En cours
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
            <X className="w-4 h-4" />
            Échoué
          </span>
        );
      case 'refunded':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
            <RefreshCw className="w-4 h-4" />
            Remboursé
          </span>
        );
      default:
        return null;
    }
  };

  if (!requiresPayment && !isEditMode) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Comptant à régler</h3>
            <p className="text-sm text-gray-600">
              Ce contrat ne nécessite pas de paiement comptant.
            </p>
          </div>
          <button
            onClick={() => setIsEditMode(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Activer le comptant
          </button>
        </div>
      </div>
    );
  }

  if (currentStatus === 'paid') {
    return (
      <div className="bg-green-50 rounded-lg border border-green-200 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
            <Check className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-green-900">Comptant payé</h3>
              {getStatusBadge()}
            </div>
            <div className="space-y-2 text-sm">
              <p className="text-green-800">
                <span className="font-medium">Montant :</span> {currentAmount.toFixed(2)} EUR
              </p>
              {paidAt && (
                <p className="text-green-800">
                  <span className="font-medium">Payé le :</span>{' '}
                  {new Date(paidAt).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              )}
              {transactionId && (
                <p className="text-green-800">
                  <span className="font-medium">Transaction :</span> {transactionId}
                </p>
              )}
            </div>
            <div className="mt-4 p-3 bg-white rounded border border-green-200">
              <p className="text-sm text-green-800 flex items-center gap-2">
                <Check className="w-4 h-4" />
                Le client peut maintenant signer le contrat
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
          <CreditCard className="w-6 h-6 text-blue-600" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Comptant à régler</h3>
            {getStatusBadge()}
          </div>

          {!paymentLink ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Montant du comptant (EUR)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Euro className="w-5 h-5 text-gray-400" />
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Ex: 450.00"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Le montant que le client doit régler avant de signer le contrat
                </p>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleGenerateLink}
                  disabled={generating}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {generating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Génération en cours...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" />
                      Générer le lien de paiement
                    </>
                  )}
                </button>
                {isEditMode && !requiresPayment && (
                  <button
                    onClick={() => setIsEditMode(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Annuler
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-medium text-blue-900 mb-2">
                  Montant : {currentAmount.toFixed(2)} EUR
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/paiement/${paymentLink}`}
                    className="flex-1 px-3 py-2 bg-white border border-blue-300 rounded text-sm"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    title="Copier le lien"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <a
                    href={`${window.location.origin}/paiement/${paymentLink}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    title="Ouvrir le lien"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>

              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>
                    Le lien a été envoyé automatiquement au client par email.
                    La signature sera bloquée tant que le paiement n'est pas validé.
                  </span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DownPaymentManager;
