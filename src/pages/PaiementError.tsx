import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { XCircle, ArrowLeft, Phone, Mail } from 'lucide-react';

export function PaiementError() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const motifRefus = searchParams.get('motifrefus') || searchParams.get('motif');
  const reference = searchParams.get('reference');

  const goBack = () => {
    const token = searchParams.get('token');
    if (token) {
      navigate(`/espace-prospect?token=${token}`);
    } else {
      navigate('/');
    }
  };

  const retry = () => {
    const token = searchParams.get('token');
    if (token) {
      navigate(`/espace-prospect?token=${token}`);
    } else {
      goBack();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-12 h-12 text-red-600" />
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Paiement non effectué
          </h1>

          <p className="text-gray-600 mb-8">
            Votre paiement n'a pas pu être traité. Veuillez réessayer ou nous contacter pour obtenir de l'aide.
          </p>

          {motifRefus && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
              <h3 className="font-semibold text-red-900 mb-2">Raison</h3>
              <p className="text-sm text-red-700">{motifRefus}</p>
            </div>
          )}

          {reference && (
            <div className="bg-gray-50 rounded-lg p-4 mb-8 text-left">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-sm">Référence</span>
                <span className="font-mono text-sm font-medium text-gray-900">
                  {reference}
                </span>
              </div>
            </div>
          )}

          <div className="space-y-3 mb-8">
            <button
              onClick={retry}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Réessayer le paiement
            </button>

            <button
              onClick={goBack}
              className="w-full bg-white text-gray-700 py-3 px-6 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour
            </button>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="font-semibold text-gray-900 mb-4">Besoin d'aide ?</h3>

            <div className="space-y-3">
              <a
                href="tel:0123456789"
                className="flex items-center justify-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
              >
                <Phone className="w-4 h-4" />
                <span className="font-medium">01 23 45 67 89</span>
              </a>

              <a
                href="mailto:contact@taxiassur.com"
                className="flex items-center justify-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
              >
                <Mail className="w-4 h-4" />
                <span className="font-medium">contact@taxiassur.com</span>
              </a>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Problèmes fréquents :</strong>
            </p>
            <ul className="text-sm text-blue-700 mt-2 space-y-1 text-left">
              <li>• Solde insuffisant</li>
              <li>• Carte expirée ou invalide</li>
              <li>• Limite de paiement dépassée</li>
              <li>• Données bancaires incorrectes</li>
            </ul>
          </div>
        </div>

        <p className="text-center text-gray-600 text-sm mt-6">
          Nos conseillers sont disponibles du lundi au vendredi de 9h à 18h
        </p>
      </div>
    </div>
  );
}
