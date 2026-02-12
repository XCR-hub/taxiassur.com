import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Loader, ArrowRight } from 'lucide-react';

export function PaiementSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [paymentDetails, setPaymentDetails] = useState<any>(null);

  useEffect(() => {
    const reference = searchParams.get('reference');
    const token = searchParams.get('token');

    if (reference) {
      setTimeout(() => {
        setPaymentDetails({
          reference,
          amount: searchParams.get('montant') || '0',
        });
        setLoading(false);
      }, 1500);
    } else {
      setLoading(false);
    }
  }, [searchParams]);

  const goToProspectSpace = () => {
    const token = searchParams.get('token');
    if (token) {
      navigate(`/espace-prospect?token=${token}`);
    } else {
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader className="w-12 h-12 text-green-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Vérification de votre paiement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Paiement réussi !
          </h1>

          <p className="text-gray-600 mb-8">
            Votre paiement a été effectué avec succès. Nous vous remercions de votre confiance.
          </p>

          {paymentDetails && (
            <div className="bg-gray-50 rounded-lg p-6 mb-8 text-left">
              <h3 className="font-semibold text-gray-900 mb-4">Détails du paiement</h3>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Référence</span>
                  <span className="font-mono text-sm font-medium text-gray-900">
                    {paymentDetails.reference}
                  </span>
                </div>

                {paymentDetails.amount && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Montant</span>
                    <span className="font-semibold text-gray-900">
                      {paymentDetails.amount.replace('EUR', ' €')}
                    </span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-gray-600">Statut</span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                    <CheckCircle className="w-3 h-3" />
                    Confirmé
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={goToProspectSpace}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-medium"
            >
              Accéder à mon espace
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => navigate('/')}
              className="w-full bg-white text-gray-700 py-3 px-6 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors font-medium"
            >
              Retour à l'accueil
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Un email de confirmation vous a été envoyé.
              <br />
              Vous pouvez maintenant finaliser votre dossier.
            </p>
          </div>
        </div>

        <p className="text-center text-gray-600 text-sm mt-6">
          Besoin d'aide ? Contactez-nous au{' '}
          <a href="tel:0123456789" className="text-blue-600 hover:underline font-medium">
            01 23 45 67 89
          </a>
        </p>
      </div>
    </div>
  );
}

export default PaiementSuccess;
