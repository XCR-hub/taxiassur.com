import { useState } from 'react';
import { Send, Loader2, CheckCircle, AlertCircle, Mail, TrendingUp, Rocket } from 'lucide-react';

export default function CampaignLauncher() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const generateOutreachEmails = async () => {
    setIsGenerating(true);
    setError(null);
    setResults(null);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/partner-scraper-outreach`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'batch_outreach'
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la génération des emails');
      }

      const data = await response.json();
      setResults({
        phase: 'generated',
        total: data.total_processed,
        details: data.results
      });

    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const sendEmails = async () => {
    setIsSending(true);
    setError(null);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      const response = await fetch(`${supabaseUrl}/functions/v1/send-outreach-emails`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'send_batch',
          batchSize: 50
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'envoi des emails');
      }

      const data = await response.json();
      setResults({
        phase: 'sent',
        total: data.total_processed,
        sent: data.sent,
        failed: data.failed,
        details: data.results
      });

    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-6 mb-6 text-white">
        <div className="flex items-center space-x-3 mb-2">
          <Rocket size={32} />
          <h2 className="text-2xl font-bold">Lancement de Campagne Automatique</h2>
        </div>
        <p className="text-blue-100">
          Générez et envoyez des emails ultra-personnalisés en 2 clics
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
          <p className="text-sm text-gray-600 mb-1">Prospects Prêts</p>
          <p className="text-2xl font-bold text-gray-900">20</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
          <p className="text-sm text-gray-600 mb-1">Taux Réponse</p>
          <p className="text-2xl font-bold text-gray-900">18%</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
          <p className="text-sm text-gray-600 mb-1">Backlinks Projetés</p>
          <p className="text-2xl font-bold text-gray-900">3-4</p>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Processus de Lancement</h3>

        <div className="space-y-4">
          {/* Étape 1 */}
          <div className="flex items-start space-x-4">
            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
              results?.phase ? 'bg-green-500' : 'bg-purple-600'
            }`}>
              {results?.phase ? <CheckCircle size={20} /> : '1'}
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-gray-900 mb-2">Génération IA des Emails</h4>
              <p className="text-sm text-gray-600 mb-3">
                L'IA génère des emails 100% personnalisés pour chaque prospect
              </p>
              <button
                onClick={generateOutreachEmails}
                disabled={isGenerating || results?.phase}
                className="bg-purple-600 hover:bg-purple-700 text-white font-medium px-6 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center space-x-2 shadow-lg hover:shadow-xl"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    <span>Génération...</span>
                  </>
                ) : results?.phase ? (
                  <>
                    <CheckCircle size={20} />
                    <span>✓ Terminé</span>
                  </>
                ) : (
                  <>
                    <TrendingUp size={20} />
                    <span>Générer les Emails</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Étape 2 */}
          <div className="flex items-start space-x-4">
            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
              results?.phase === 'sent' ? 'bg-green-500' : results?.phase ? 'bg-blue-600' : 'bg-gray-300'
            }`}>
              {results?.phase === 'sent' ? <CheckCircle size={20} /> : '2'}
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-gray-900 mb-2">Envoi Automatique</h4>
              <p className="text-sm text-gray-600 mb-3">
                Envoi via SendGrid avec tracking et délais humanisés
              </p>
              <button
                onClick={sendEmails}
                disabled={isSending || !results?.phase || results?.phase === 'sent'}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center space-x-2 shadow-lg hover:shadow-xl"
              >
                {isSending ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    <span>Envoi...</span>
                  </>
                ) : results?.phase === 'sent' ? (
                  <>
                    <CheckCircle size={20} />
                    <span>✓ Envoyé</span>
                  </>
                ) : (
                  <>
                    <Send size={20} />
                    <span>Envoyer Maintenant</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-6 flex items-start space-x-3">
          <AlertCircle className="text-red-600 flex-shrink-0" size={24} />
          <div>
            <p className="font-bold text-red-800 mb-1">Erreur</p>
            <p className="text-sm text-red-600">{error}</p>
            <p className="text-xs text-red-500 mt-2">
              Vérifiez que SendGrid est configuré et que vous avez des prospects
            </p>
          </div>
        </div>
      )}

      {/* Succès */}
      {results && (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-300 shadow-xl">
          <div className="flex items-center space-x-3 mb-4">
            <CheckCircle className="text-green-600" size={32} />
            <h3 className="text-xl font-bold text-green-800">
              {results.phase === 'generated' ? '🎉 Emails Générés !' : '🚀 Campagne Lancée !'}
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 shadow">
              <p className="text-sm text-gray-600 mb-1">Total</p>
              <p className="text-3xl font-bold text-gray-900">{results.total}</p>
            </div>
            {results.phase === 'sent' && (
              <div className="bg-white rounded-lg p-4 shadow">
                <p className="text-sm text-gray-600 mb-1">Envoyés</p>
                <p className="text-3xl font-bold text-green-600">{results.sent}</p>
              </div>
            )}
          </div>

          {results.phase === 'sent' && (
            <div className="bg-white rounded-lg p-5 mb-4 shadow">
              <h4 className="font-bold text-gray-800 mb-3 flex items-center space-x-2">
                <Mail size={20} />
                <span>Ce qui se passe maintenant</span>
              </h4>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-center space-x-2">
                  <span className="text-green-600 text-lg">✓</span>
                  <span>Emails envoyés et trackés automatiquement</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-blue-600 text-lg">→</span>
                  <span>Ouvertures et clics enregistrés en temps réel</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-purple-600 text-lg">⏰</span>
                  <span>Réponses attendues dans 24-48h</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-orange-600 text-lg">🔄</span>
                  <span>Relance automatique J+7 si pas de réponse</span>
                </li>
              </ul>
            </div>
          )}

          <div className="flex space-x-3">
            <a
              href="/backoffice/dashboard"
              className="flex-1 bg-white hover:bg-gray-50 text-gray-800 font-medium py-3 px-4 rounded-lg transition-colors text-center border-2 border-gray-300"
            >
              ← Retour Dashboard
            </a>
            <a
              href="/backoffice/prospects"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors text-center shadow-lg"
            >
              Voir les Prospects →
            </a>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="mt-6 bg-blue-50 rounded-lg p-4 border border-blue-200">
        <h4 className="font-bold text-blue-900 mb-2">💡 Informations</h4>
        <ul className="space-y-1 text-sm text-blue-800">
          <li>• Meilleur moment : Mardi-Jeudi 10h-11h</li>
          <li>• Taux réponse moyen : 15-20%</li>
          <li>• Backlinks obtenus : 3-5 par campagne</li>
          <li>• Coût : ~2€ (IA + SendGrid)</li>
          <li>• Relance auto J+7 si pas de réponse</li>
        </ul>
      </div>
    </div>
  );
}
