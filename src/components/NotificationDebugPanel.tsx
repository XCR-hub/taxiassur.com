import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';

export function NotificationDebugPanel() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Chargement...');
  const [count, setCount] = useState(0);
  const [rawData, setRawData] = useState<any[]>([]);

  useEffect(() => {
    const testConnection = async () => {
      try {
        console.log('[DEBUG] Testing Supabase connection...');

        // Test 1: Connexion de base
        const { data: testData, error: testError } = await supabase
          .from('crm_event_notifications')
          .select('id')
          .limit(1);

        if (testError) {
          setStatus('error');
          setMessage(`Erreur Supabase: ${testError.message}`);
          console.error('[DEBUG] Supabase error:', testError);
          return;
        }

        // Test 2: Compter les notifications
        const { count: totalCount, error: countError } = await supabase
          .from('crm_event_notifications')
          .select('*', { count: 'exact', head: true });

        if (countError) {
          setStatus('error');
          setMessage(`Erreur count: ${countError.message}`);
          console.error('[DEBUG] Count error:', countError);
          return;
        }

        // Test 3: Récupérer les données complètes
        const { data, error } = await supabase
          .from('crm_event_notifications')
          .select('*, lead:crm_leads(first_name, last_name, email)')
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) {
          setStatus('error');
          setMessage(`Erreur data: ${error.message}`);
          console.error('[DEBUG] Data error:', error);
          return;
        }

        setStatus('success');
        setCount(totalCount || 0);
        setRawData(data || []);
        setMessage(`✅ Connexion OK - ${totalCount} notifications dans la base`);
        console.log('[DEBUG] Success! Data:', data);
      } catch (err: any) {
        setStatus('error');
        setMessage(`Exception: ${err.message}`);
        console.error('[DEBUG] Exception:', err);
      }
    };

    testConnection();
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-[9999] w-96 rounded-lg border-2 bg-white p-4 shadow-2xl dark:bg-gray-800">
      <div className="mb-2 flex items-center gap-2">
        {status === 'loading' && <AlertCircle className="h-5 w-5 animate-spin text-blue-500" />}
        {status === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
        {status === 'error' && <XCircle className="h-5 w-5 text-red-500" />}
        <h3 className="font-bold text-gray-900 dark:text-white">Debug Notifications</h3>
      </div>

      <div className="space-y-2 text-sm">
        <div className={`rounded p-2 ${
          status === 'success' ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300' :
          status === 'error' ? 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300' :
          'bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
        }`}>
          {message}
        </div>

        {status === 'success' && (
          <>
            <div className="rounded bg-gray-50 p-2 dark:bg-gray-900">
              <p className="font-mono text-xs text-gray-700 dark:text-gray-300">
                Total notifications: <strong>{count}</strong>
              </p>
              <p className="font-mono text-xs text-gray-700 dark:text-gray-300">
                Données reçues: <strong>{rawData.length}</strong>
              </p>
            </div>

            {rawData.length > 0 && (
              <div className="max-h-64 space-y-1 overflow-y-auto rounded bg-gray-50 p-2 dark:bg-gray-900">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Dernières notifications:
                </p>
                {rawData.map((notif, idx) => (
                  <div key={notif.id} className="border-l-2 border-blue-500 pl-2 text-xs text-gray-600 dark:text-gray-400">
                    <p className="font-medium">{idx + 1}. {notif.event_type}</p>
                    <p className="truncate">{notif.message}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
