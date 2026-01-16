import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function TestNotifications() {
  const [status, setStatus] = useState('Chargement...');
  const [data, setData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      console.log('[TEST] Début du test...');

      // Test 1: Connexion basique
      const { data: testData, error: testError } = await supabase
        .from('crm_event_notifications')
        .select('id, message, created_at')
        .limit(10);

      if (testError) {
        console.error('[TEST] Erreur:', testError);
        setError(testError.message);
        setStatus('❌ ERREUR');
        return;
      }

      console.log('[TEST] Données reçues:', testData);
      setData(testData || []);
      setStatus(`✅ ${testData?.length || 0} notifications chargées`);
    };

    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="mx-auto max-w-4xl rounded-lg bg-white p-8 shadow-lg">
        <h1 className="mb-4 text-2xl font-bold">Test Notifications</h1>

        <div className={`rounded-lg p-4 ${
          error ? 'bg-red-100' : 'bg-green-100'
        }`}>
          <p className="font-mono text-lg">{status}</p>
          {error && <p className="mt-2 text-red-700">Erreur: {error}</p>}
        </div>

        <div className="mt-8">
          <h2 className="mb-4 text-xl font-semibold">
            Notifications ({data.length})
          </h2>

          {data.length === 0 ? (
            <p className="text-gray-500">Aucune notification</p>
          ) : (
            <div className="space-y-2">
              {data.map((notif) => (
                <div
                  key={notif.id}
                  className="rounded border border-gray-200 bg-gray-50 p-4"
                >
                  <p className="font-medium">{notif.message}</p>
                  <p className="mt-1 text-sm text-gray-600">
                    {new Date(notif.created_at).toLocaleString('fr-FR')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 rounded bg-blue-50 p-4">
          <p className="text-sm text-blue-900">
            Ouvrez la console (F12) pour voir les logs détaillés.
          </p>
        </div>
      </div>
    </div>
  );
}
