import { useState } from 'react';
import { CreditCard, Loader2, ExternalLink, Lock } from 'lucide-react';

interface Props {
  leadId: string;
  amount: number;
  reference: string;
  description?: string;
  customerEmail?: string;
  customerFirstName?: string;
  customerLastName?: string;
  customerPhone?: string;
}

export default function ClientMoneticoPayment({
  leadId,
  amount,
  reference,
  description,
  customerEmail,
  customerFirstName,
  customerLastName,
  customerPhone
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePayment = async () => {
    try {
      setLoading(true);
      setError(null);

      // Créer le formulaire de paiement Monetico via l'Edge Function
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
            amount,
            description: description || 'Paiement comptant assurance taxi',
            customReference: reference,
            customerEmail,
            customerFirstName,
            customerLastName,
            customerPhone,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de la création du paiement');
      }

      // Afficher le formulaire HTML Monetico dans une nouvelle fenêtre
      if (result.success && result.htmlForm) {
        const newWindow = window.open('', '_blank');
        if (newWindow) {
          newWindow.document.write(result.htmlForm);
          newWindow.document.close();
        } else {
          throw new Error('Impossible d\'ouvrir la fenêtre de paiement. Veuillez autoriser les pop-ups.');
        }
      } else {
        throw new Error(result.error || 'Formulaire de paiement non reçu');
      }
    } catch (err: any) {
      console.error('Erreur paiement:', err);
      setError(err.message || 'Erreur lors de la création du paiement');
    } finally {
      setLoading(false);
    }
  };

  const formattedAmount = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount);

  return (
    <div>
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <button
        onClick={handlePayment}
        disabled={loading}
        className="w-full bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-black py-4 px-6 rounded-xl flex items-center justify-center gap-3 text-lg font-bold transition-all transform hover:scale-105 shadow-lg hover:shadow-xl disabled:transform-none"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Préparation du paiement...
          </>
        ) : (
          <>
            <Lock className="w-5 h-5" />
            🔒 Accéder au paiement
            <ExternalLink className="w-5 h-5" />
          </>
        )}
      </button>

      <div className="mt-3 text-center">
        <p className="text-xs text-gray-500">
          Vous serez redirigé vers notre plateforme de paiement sécurisée Monetico (CIC).
        </p>
      </div>
    </div>
  );
}
