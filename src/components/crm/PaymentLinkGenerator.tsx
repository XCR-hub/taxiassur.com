import React, { useState } from 'react';
import { CreditCard, Phone, Mail, Copy, Check, AlertCircle, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface PaymentLinkGeneratorProps {
  leadId: string;
  leadEmail: string;
  leadName: string;
  amount?: number;
}

export default function PaymentLinkGenerator({
  leadId,
  leadEmail,
  leadName,
  amount = 0
}: PaymentLinkGeneratorProps) {
  const [mode, setMode] = useState<'phone' | 'email' | null>(null);
  const [customAmount, setCustomAmount] = useState(amount.toString());
  const [description, setDescription] = useState('Acompte assurance taxi');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generatePaymentLink = async (sendEmail: boolean) => {
    setLoading(true);
    setError(null);
    setPaymentLink(null);

    try {
      const amountValue = parseFloat(customAmount);
      if (isNaN(amountValue) || amountValue <= 0) {
        throw new Error('Montant invalide');
      }

      // Vérifier que le lead existe
      const { data: leadData, error: leadError } = await supabase
        .from('crm_leads')
        .select('id, email, first_name, last_name')
        .eq('id', leadId)
        .maybeSingle();

      if (leadError || !leadData) {
        throw new Error('Lead introuvable. Vérifiez que le lead existe dans la base de données.');
      }

      console.log('Lead trouvé:', leadData);

      // Créer le paiement Monetico
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-monetico-payment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            lead_id: leadId,
            amount: amountValue,
            description: description,
            send_email: sendEmail,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la création du paiement');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de la création du paiement');
      }

      setPaymentLink(result.payment_url);

      if (sendEmail) {
        alert(`Email envoyé à ${leadEmail} avec le lien de paiement`);
      }
    } catch (err: any) {
      console.error('Erreur génération lien:', err);
      setError(err.message || 'Erreur lors de la génération du lien');
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneMode = () => {
    setMode('phone');
    generatePaymentLink(false);
  };

  const handleEmailMode = () => {
    setMode('email');
    generatePaymentLink(true);
  };

  const copyToClipboard = () => {
    if (paymentLink) {
      navigator.clipboard.writeText(paymentLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const openPaymentLink = () => {
    if (paymentLink) {
      window.open(paymentLink, '_blank');
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <CreditCard className="w-6 h-6 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Générer un lien de paiement</h3>
      </div>

      {/* Infos lead */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-gray-600 mb-1">Client</p>
        <p className="font-medium text-gray-900">{leadName}</p>
        <p className="text-sm text-gray-600">{leadEmail}</p>
        <p className="text-xs text-gray-500 mt-1">Lead ID: {leadId}</p>
      </div>

      {/* Montant */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Montant (€)
        </label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={customAmount}
          onChange={(e) => setCustomAmount(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Montant en euros"
        />
      </div>

      {/* Description */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Description du paiement"
        />
      </div>

      {/* Mode de génération */}
      <div className="space-y-3 mb-6">
        <p className="text-sm font-medium text-gray-700">Comment souhaitez-vous générer le lien ?</p>

        {/* Mode téléphone */}
        <button
          onClick={handlePhoneMode}
          disabled={loading}
          className="w-full flex items-center gap-3 p-4 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Phone className="w-5 h-5 text-blue-600" />
          <div className="flex-1 text-left">
            <p className="font-medium text-gray-900">Paiement par téléphone</p>
            <p className="text-sm text-gray-600">Le lien s'ouvre sur votre ordinateur</p>
          </div>
        </button>

        {/* Mode email */}
        <button
          onClick={handleEmailMode}
          disabled={loading}
          className="w-full flex items-center gap-3 p-4 border-2 border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Mail className="w-5 h-5 text-green-600" />
          <div className="flex-1 text-left">
            <p className="font-medium text-gray-900">Envoi automatique par email</p>
            <p className="text-sm text-gray-600">Un email avec le lien est envoyé au client</p>
          </div>
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          <p className="text-sm text-blue-700">Génération du lien de paiement...</p>
        </div>
      )}

      {/* Erreur */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900">Erreur</p>
            <p className="text-sm text-red-700">{error}</p>
            {error.includes('Lead introuvable') && (
              <p className="text-xs text-red-600 mt-2">
                Lead ID: {leadId}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Lien généré */}
      {paymentLink && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm font-medium text-green-900 mb-3">Lien de paiement généré !</p>

          <div className="bg-white border border-green-300 rounded-lg p-3 mb-3">
            <p className="text-xs text-gray-600 break-all">{paymentLink}</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={copyToClipboard}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copié !' : 'Copier'}
            </button>
            <button
              onClick={openPaymentLink}
              className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Ouvrir
            </button>
          </div>

          {mode === 'email' && (
            <p className="text-xs text-green-700 mt-3 text-center">
              Un email a été envoyé à {leadEmail}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
