import React, { useState } from 'react';
import { RefreshCw, Mail, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export const ManualEmailSync: React.FC = () => {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const syncAllEmails = async () => {
    setSyncing(true);
    setError(null);
    setResult(null);

    try {
      console.log('🔄 Démarrage synchronisation complète des emails...');

      // Étape 1: Synchroniser tous les emails depuis IONOS
      const { data: syncData, error: syncError } = await supabase.functions.invoke(
        'sync-all-emails-complete',
        {
          body: { forceFullSync: true },
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (syncError) {
        throw new Error(`Erreur sync: ${syncError.message}`);
      }

      console.log('✅ Emails synchronisés:', syncData);

      // Étape 2: Parser les emails formulaire et créer les leads manquants
      const { data: parseData, error: parseError } = await supabase.functions.invoke(
        'parse-form-emails-create-leads',
        {
          body: {},
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (parseError) {
        throw new Error(`Erreur parsing: ${parseError.message}`);
      }

      console.log('✅ Leads créés:', parseData);

      // Étape 3: Lier les emails aux leads existants
      const { data: linkData, error: linkError } = await supabase.functions.invoke(
        'sync-emails-to-leads',
        {
          body: {},
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ Emails liés aux leads:', linkData);

      setResult({
        syncData,
        parseData,
        linkData
      });
    } catch (err: any) {
      console.error('❌ Erreur:', err);
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Mail className="w-6 h-6 text-blue-600" />
            Synchronisation manuelle des emails
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Récupère tous les emails manquants et crée automatiquement les leads
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-red-900">Erreur</h4>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {result && (
        <div className="mb-4 space-y-3">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-green-900 mb-2">
                  Synchronisation réussie !
                </h4>
                <div className="space-y-2 text-sm text-green-800">
                  {result.syncData && (
                    <div>
                      <span className="font-medium">Emails synchronisés:</span>{' '}
                      {result.syncData.synced || 0} nouveaux emails
                    </div>
                  )}
                  {result.parseData && (
                    <div>
                      <span className="font-medium">Leads créés:</span>{' '}
                      {result.parseData.created || 0} nouveaux leads
                    </div>
                  )}
                  {result.linkData && (
                    <div>
                      <span className="font-medium">Emails liés:</span>{' '}
                      {result.linkData.linked || 0} emails liés aux leads
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Processus de synchronisation
          </h4>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Récupération de tous les emails depuis IONOS (IMAP)</li>
            <li>Analyse des emails de formulaire (team@taxiassur.com)</li>
            <li>Création automatique des leads manquants</li>
            <li>Liaison des emails aux leads existants</li>
          </ol>
        </div>

        <button
          onClick={syncAllEmails}
          disabled={syncing}
          className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 transition-all"
        >
          <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Synchronisation en cours...' : 'Lancer la synchronisation complète'}
        </button>

        <p className="text-xs text-gray-500 text-center">
          ⚠️ Cette opération peut prendre plusieurs minutes selon le nombre d'emails
        </p>
      </div>
    </div>
  );
};
