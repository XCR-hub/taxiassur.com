import { useState } from 'react';
import { Play, CheckCircle, XCircle, Loader, RefreshCw, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface TestResult {
  function: string;
  status: 'idle' | 'running' | 'success' | 'error';
  message?: string;
  duration?: number;
  data?: any;
}

export default function TestAutomations() {
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [isTestingAll, setIsTestingAll] = useState(false);

  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

  const automations = [
    {
      id: 'rss-parser',
      name: 'RSS Parser',
      description: 'Parse flux RSS (Google News)',
      category: 'Actualités',
      payload: {
        url: 'https://news.google.com/rss/search?q=taxi+france&hl=fr&gl=FR&ceid=FR:fr',
        sourceName: 'Google News Test'
      }
    },
    {
      id: 'linkedin-scraper',
      name: 'LinkedIn Scraper',
      description: 'Récupère actualités LinkedIn',
      category: 'Actualités',
      payload: {}
    },
    {
      id: 'news-aggregator-master',
      name: 'Agrégateur Master',
      description: 'Agrège toutes les sources',
      category: 'Actualités',
      payload: {}
    },
    {
      id: 'news-digest-generator',
      name: 'Générateur Digest',
      description: 'Génère digest quotidien IA',
      category: 'Actualités',
      payload: { type: 'daily' }
    },
    {
      id: 'news-email-alerts',
      name: 'Alertes Email',
      description: 'Envoie digest par email',
      category: 'Actualités',
      payload: { type: 'daily' }
    },
    {
      id: 'generate-seo-content',
      name: 'Générateur SEO',
      description: 'Génère contenu SEO optimisé',
      category: 'SEO',
      payload: {
        keyword: 'assurance taxi test',
        city: 'Paris',
        secondaryKeywords: ['devis', 'tarif'],
        mode: 'test'
      }
    },
    {
      id: 'scan-backlinks',
      name: 'Scanner Backlinks',
      description: 'Scan opportunités backlinks',
      category: 'Backlinks',
      payload: {
        competitors: ['https://www.april-moto.com/'],
        maxResults: 5
      }
    },
    {
      id: 'auto-followup',
      name: 'Auto Follow-up',
      description: 'Relances automatiques leads',
      category: 'Leads',
      payload: { max_followups: 5 }
    },
    {
      id: 'backlink-auto-outreach',
      name: 'Outreach Automatique',
      description: 'Envoi emails outreach',
      category: 'Backlinks',
      payload: { max_emails: 5 }
    },
    {
      id: 'social-media-publisher',
      name: 'Publication Social Media',
      description: 'Publie sur réseaux sociaux',
      category: 'Social',
      payload: {
        platform: 'linkedin',
        content: 'Test publication',
        network_ids: ['test']
      }
    }
  ];

  const testFunction = async (functionId: string, payload: any) => {
    const startTime = Date.now();

    setResults(prev => ({
      ...prev,
      [functionId]: { function: functionId, status: 'running' }
    }));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${SUPABASE_URL}/functions/v1/${functionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const duration = Date.now() - startTime;
      const data = await response.json();

      if (response.ok || data.success) {
        setResults(prev => ({
          ...prev,
          [functionId]: {
            function: functionId,
            status: 'success',
            message: data.message || 'Test réussi',
            duration,
            data
          }
        }));
      } else {
        setResults(prev => ({
          ...prev,
          [functionId]: {
            function: functionId,
            status: 'error',
            message: data.error || data.message || 'Erreur inconnue',
            duration,
            data
          }
        }));
      }
    } catch (error: any) {
      const duration = Date.now() - startTime;
      setResults(prev => ({
        ...prev,
        [functionId]: {
          function: functionId,
          status: 'error',
          message: error.message,
          duration
        }
      }));
    }
  };

  const testAll = async () => {
    setIsTestingAll(true);
    setResults({});

    for (const automation of automations) {
      await testFunction(automation.id, automation.payload);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    setIsTestingAll(false);
  };

  const resetResults = () => {
    setResults({});
  };

  const successCount = Object.values(results).filter(r => r.status === 'success').length;
  const errorCount = Object.values(results).filter(r => r.status === 'error').length;
  const totalCount = Object.keys(results).length;

  const groupedAutomations = automations.reduce((acc, auto) => {
    if (!acc[auto.category]) acc[auto.category] = [];
    acc[auto.category].push(auto);
    return acc;
  }, {} as Record<string, typeof automations>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Zap className="w-8 h-8 text-yellow-400" />
            Test des Automatisations
          </h1>
          <p className="text-gray-400 mt-2">
            Testez manuellement toutes les Edge Functions et automatisations
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={resetResults}
            disabled={isTestingAll || totalCount === 0}
            className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className="w-5 h-5" />
            Réinitialiser
          </button>

          <button
            onClick={testAll}
            disabled={isTestingAll}
            className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg font-semibold transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {isTestingAll ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Test en cours...
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                Tester Tout
              </>
            )}
          </button>
        </div>
      </div>

      {totalCount > 0 && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Résumé des Tests</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-900/30 rounded-lg p-4 border border-blue-700">
              <div className="text-3xl font-bold text-blue-400">{totalCount}</div>
              <div className="text-sm text-gray-400">Tests effectués</div>
            </div>
            <div className="bg-green-900/30 rounded-lg p-4 border border-green-700">
              <div className="text-3xl font-bold text-green-400">{successCount}</div>
              <div className="text-sm text-gray-400">Réussis</div>
            </div>
            <div className="bg-red-900/30 rounded-lg p-4 border border-red-700">
              <div className="text-3xl font-bold text-red-400">{errorCount}</div>
              <div className="text-sm text-gray-400">Échecs</div>
            </div>
          </div>
          {totalCount > 0 && (
            <div className="mt-4">
              <div className="text-sm text-gray-400 mb-2">
                Taux de réussite: {Math.round((successCount / totalCount) * 100)}%
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-green-500 to-emerald-600 h-3 rounded-full transition-all"
                  style={{ width: `${(successCount / totalCount) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {Object.entries(groupedAutomations).map(([category, autos]) => (
        <div key={category} className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-900/50 to-indigo-900/50 px-6 py-4 border-b border-gray-700">
            <h2 className="text-xl font-bold text-white">{category}</h2>
          </div>

          <div className="p-6 space-y-4">
            {autos.map(automation => {
              const result = results[automation.id];
              const isRunning = result?.status === 'running';
              const isSuccess = result?.status === 'success';
              const isError = result?.status === 'error';

              return (
                <div
                  key={automation.id}
                  className={`bg-gray-900/50 rounded-lg p-4 border transition-all ${
                    isSuccess ? 'border-green-600' :
                    isError ? 'border-red-600' :
                    isRunning ? 'border-blue-600' :
                    'border-gray-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">
                          {automation.name}
                        </h3>
                        {isRunning && (
                          <Loader className="w-5 h-5 text-blue-400 animate-spin" />
                        )}
                        {isSuccess && (
                          <CheckCircle className="w-5 h-5 text-green-400" />
                        )}
                        {isError && (
                          <XCircle className="w-5 h-5 text-red-400" />
                        )}
                      </div>
                      <p className="text-gray-400 text-sm mb-3">
                        {automation.description}
                      </p>

                      {result && (
                        <div className="mt-3 space-y-2">
                          {result.message && (
                            <div className={`text-sm ${
                              isSuccess ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {result.message}
                            </div>
                          )}
                          {result.duration && (
                            <div className="text-xs text-gray-500">
                              Durée: {result.duration}ms
                            </div>
                          )}
                          {result.data && (
                            <details className="mt-2">
                              <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400">
                                Voir détails
                              </summary>
                              <pre className="mt-2 p-3 bg-gray-950 rounded text-xs overflow-auto max-h-40">
                                {JSON.stringify(result.data, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => testFunction(automation.id, automation.payload)}
                      disabled={isRunning || isTestingAll}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ml-4"
                    >
                      <Play className="w-4 h-4" />
                      Tester
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-6">
        <h3 className="text-yellow-400 font-bold text-lg mb-3">ℹ️ Informations</h3>
        <ul className="space-y-2 text-gray-300 text-sm">
          <li>• Les tests appellent directement les Edge Functions Supabase</li>
          <li>• Certaines fonctions peuvent prendre plusieurs secondes à répondre</li>
          <li>• Les erreurs affichées peuvent être normales (ex: pas de données à traiter)</li>
          <li>• Les cron jobs automatiques s'exécutent selon leur planning configuré</li>
          <li>• Pour voir les logs complets : Supabase Dashboard → Edge Functions → Logs</li>
        </ul>
      </div>
    </div>
  );
}
