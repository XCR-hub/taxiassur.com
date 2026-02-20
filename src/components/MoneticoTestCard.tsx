/**
 * Composant d'aide pour les tests Monético
 * Affiche la carte de test à utiliser
 * À utiliser UNIQUEMENT en mode développement
 */

import { useState } from 'react';
import { Copy, CreditCard, Check, AlertTriangle } from 'lucide-react';

interface TestCardData {
  number: string;
  expiry: string;
  cvv: string;
  name: string;
  result: 'success' | 'error';
}

// ATTENTION : Seules ces 2 cartes fonctionnent avec Monético CIC
// Ne pas ajouter d'autres cartes sans vérification officielle
const TEST_CARDS: TestCardData[] = [
  {
    number: '5017670000001800',
    expiry: '12/26',
    cvv: '123',
    name: 'TEST ACCEPTED',
    result: 'success'
  },
  {
    number: '5017670000000800',
    expiry: '12/26',
    cvv: '123',
    name: 'TEST REFUSED',
    result: 'error'
  }
];

export function MoneticoTestCard() {
  // N'afficher qu'en mode développement - VÉRIFIER AVANT LES HOOKS
  if (import.meta.env.PROD) {
    return null;
  }

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Erreur copie:', error);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Bouton flottant */}
      <button
        onClick={() => setShowHelp(!showHelp)}
        className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
        title="Cartes de test Monético"
      >
        <CreditCard className="w-6 h-6" />
      </button>

      {/* Panneau d'aide */}
      {showHelp && (
        <div className="absolute bottom-20 right-0 w-96 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                <h3 className="font-bold text-lg">Cartes Test Monético</h3>
              </div>
              <button
                onClick={() => setShowHelp(false)}
                className="text-white hover:bg-white/20 rounded p-1"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-blue-100 mt-1">Mode TEST - Aucun paiement réel</p>
          </div>

          {/* Cartes de test */}
          <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
            {TEST_CARDS.map((card, index) => (
              <div
                key={index}
                className={`border-2 rounded-lg p-4 ${
                  card.result === 'success'
                    ? 'border-green-500 bg-green-50'
                    : 'border-red-500 bg-red-50'
                }`}
              >
                {/* Titre */}
                <div className="flex items-center gap-2 mb-3">
                  {card.result === 'success' ? (
                    <Check className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  )}
                  <span className="font-bold text-sm">
                    {card.result === 'success' ? 'Paiement ACCEPTÉ' : 'Paiement REFUSÉ'}
                  </span>
                </div>

                {/* Carte visuelle */}
                <div className="bg-gradient-to-br from-gray-800 to-gray-900 text-white p-4 rounded-lg mb-3 shadow-lg">
                  <div className="text-xs opacity-75 mb-2">VISA TEST</div>
                  <div className="font-mono text-lg tracking-wider mb-3">
                    {card.number.match(/.{1,4}/g)?.join(' ')}
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <div className="text-xs opacity-75">Exp</div>
                      <div className="font-mono">{card.expiry}</div>
                    </div>
                    <div>
                      <div className="text-xs opacity-75">CVV</div>
                      <div className="font-mono">{card.cvv}</div>
                    </div>
                  </div>
                  <div className="text-sm mt-2 opacity-90">{card.name}</div>
                </div>

                {/* Boutons de copie */}
                <div className="space-y-2">
                  <CopyButton
                    label="Numéro"
                    value={card.number}
                    field={`number-${index}`}
                    copied={copiedField === `number-${index}`}
                    onCopy={copyToClipboard}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <CopyButton
                      label="Date"
                      value={card.expiry}
                      field={`expiry-${index}`}
                      copied={copiedField === `expiry-${index}`}
                      onCopy={copyToClipboard}
                    />
                    <CopyButton
                      label="CVV"
                      value={card.cvv}
                      field={`cvv-${index}`}
                      copied={copiedField === `cvv-${index}`}
                      onCopy={copyToClipboard}
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* Avertissement */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-yellow-800 mb-1">
                    Attention aux erreurs de saisie
                  </p>
                  <ul className="text-yellow-700 space-y-1 text-xs">
                    <li>❌ 5017<strong className="text-red-600">8</strong>70... (8 au lieu de 6)</li>
                    <li>❌ ...00000180 (15 chiffres au lieu de 16)</li>
                    <li>✅ 5017<strong className="text-green-600">6</strong>70000001800 (correct)</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Aide supplémentaire */}
            <div className="text-xs text-gray-500 space-y-1">
              <p>💡 <strong>Astuce :</strong> Utilisez les boutons "Copier" pour éviter les fautes</p>
              <p>🔒 Mode TEST - Aucun prélèvement réel</p>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 border-t px-4 py-3 text-center">
            <a
              href="/CARTES_TEST_MONETICO_CORRECTES_2026.md"
              target="_blank"
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              📚 Documentation complète
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

// Composant bouton de copie
interface CopyButtonProps {
  label: string;
  value: string;
  field: string;
  copied: boolean;
  onCopy: (value: string, field: string) => void;
}

function CopyButton({ label, value, field, copied, onCopy }: CopyButtonProps) {
  return (
    <button
      onClick={() => onCopy(value, field)}
      className={`flex items-center justify-between w-full px-3 py-2 rounded text-sm font-medium transition-all ${
        copied
          ? 'bg-green-100 text-green-700 border border-green-300'
          : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
      }`}
    >
      <span className="text-xs opacity-75">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-mono">{value}</span>
        {copied ? (
          <Check className="w-4 h-4 text-green-600" />
        ) : (
          <Copy className="w-4 h-4" />
        )}
      </div>
    </button>
  );
}
