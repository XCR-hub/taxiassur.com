import { useState } from 'react';
import { Loader2, ExternalLink, Lock } from 'lucide-react';

interface Props {
  amount: number;
  reference: string;
  accessToken: string;
  description?: string;
  customerEmail?: string;
  customerFirstName?: string;
  customerLastName?: string;
  customerPhone?: string;
}

export default function ClientMoneticoPayment({ reference, accessToken }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePayment = async () => {
    try {
      setLoading(true);
      setError(null);

      // Charger un formulaire signé pour le paiement existant, sans recréer ni modifier son montant.
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-monetico-payment-form`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ reference, accessToken }),
        }
      );

      const result = await response.json() as {
        success?: boolean;
        error?: string;
        formData?: { action?: string; fields?: Record<string, string> };
      };

      if (!response.ok || !result.success || !result.formData?.action || !result.formData.fields) {
        throw new Error(result.error || 'Impossible de préparer le paiement');
      }

      const action = new URL(result.formData.action);
      if (action.protocol !== 'https:' || action.hostname !== 'p.monetico-services.com') {
        throw new Error('Destination de paiement invalide');
      }

      const form = document.createElement('form');
      form.method = 'POST';
      form.action = action.toString();
      form.style.display = 'none';
      for (const [name, value] of Object.entries(result.formData.fields)) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = value;
        form.appendChild(input);
      }
      document.body.appendChild(form);
      form.submit();
    } catch (err: unknown) {
      console.error('Erreur paiement:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la création du paiement');
    } finally {
      setLoading(false);
    }
  };

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
