import React, { useState, useEffect } from 'react';
import { Search, Globe, RefreshCw, TrendingUp, ExternalLink, CheckCircle, AlertCircle, Home, Settings, Clock } from 'lucide-react';
import { pingSearchEngines } from '../lib/ping';
import { regenerateFeeds } from '../lib/feeds';
import { generateCityPages } from '../lib/ping';
import Card from '../components/Card';
import { supabase } from '../lib/supabase';

const SeoTools: React.FC = () => {
  const [seoData, setSeoData] = useState({
    lastSitemapUpdate: '',
    totalUrls: 0,
    indexedPages: 0,
    pendingPages: 0,
    impressions30d: 0,
    clicks30d: 0,
    averagePosition: 0,
    lastUpdate: null as string | null,
    isRealData: false
  });

  const [pingResults, setPingResults] = useState<any[]>([]);
  const [isWorking, setIsWorking] = useState(false);
  const [cronJobsStatus, setCronJobsStatus] = useState<any[]>([]);
  const cities = generateCityPages();

  useEffect(() => {
    loadSeoData();
    loadCronJobsStatus();
  }, []);

  const loadSeoData = async () => {
    try {
      // Récupérer les vraies métriques depuis Supabase
      const { data, error } = await supabase.rpc('get_current_seo_metrics');

      if (error) {
        console.error('Error loading SEO metrics:', error);
        // Fallback sur données estimées
        setSeoData({
          lastSitemapUpdate: new Date().toISOString(),
          totalUrls: 45 + cities.length,
          indexedPages: Math.floor((45 + cities.length) * 0.85),
          pendingPages: Math.floor((45 + cities.length) * 0.15),
          impressions30d: 0,
          clicks30d: 0,
          averagePosition: 0,
          lastUpdate: null,
          isRealData: false
        });
        return;
      }

      if (data && data.length > 0) {
        const metrics = data[0];
        setSeoData({
          lastSitemapUpdate: metrics.last_update || new Date().toISOString(),
          totalUrls: metrics.total_urls || (45 + cities.length),
          indexedPages: metrics.indexed_pages || 0,
          pendingPages: metrics.pending_pages || 0,
          impressions30d: metrics.impressions_30d || 0,
          clicks30d: metrics.clicks_30d || 0,
          averagePosition: metrics.average_position || 0,
          lastUpdate: metrics.last_update,
          isRealData: metrics.last_update !== null
        });
      } else {
        // Aucune métrique, utiliser estimations
        setSeoData({
          lastSitemapUpdate: new Date().toISOString(),
          totalUrls: 45 + cities.length,
          indexedPages: Math.floor((45 + cities.length) * 0.85),
          pendingPages: Math.floor((45 + cities.length) * 0.15),
          impressions30d: 0,
          clicks30d: 0,
          averagePosition: 0,
          lastUpdate: null,
          isRealData: false
        });
      }
    } catch (error) {
      console.error('Error in loadSeoData:', error);
    }
  };

  const loadCronJobsStatus = async () => {
    try {
      const { data, error } = await supabase.rpc('get_seo_cron_stats');
      if (!error && data) {
        setCronJobsStatus(data);
      }
    } catch (error) {
      console.error('Error loading cron jobs:', error);
    }
  };

  const handleRegenerateFeeds = async () => {
    setIsWorking(true);
    try {
      const success = await regenerateFeeds();
      if (success) {
        alert('✅ Feeds régénérés avec succès !');
        loadSeoData();
      } else {
        alert('❌ Erreur lors de la régénération');
      }
    } catch (error) {
      alert('❌ Erreur de connexion');
    } finally {
      setIsWorking(false);
    }
  };

  const handlePingEngines = async () => {
    setIsWorking(true);
    try {
      const sitemapUrl = `${import.meta.env.VITE_SITE_URL || 'https://taxiassur.com'}/feeds/sitemap.xml`;
      const result = await pingSearchEngines(sitemapUrl);
      setPingResults(result.results);

      if (result.success) {
        alert('✅ Moteurs de recherche notifiés !');
      } else {
        alert('⚠️ Certains moteurs n\'ont pas pu être notifiés');
      }
    } catch (error) {
      alert('❌ Erreur lors du ping');
    } finally {
      setIsWorking(false);
    }
  };

  const handleOptimizeLeads = async () => {
    setIsWorking(true);
    try {
      const response = await fetch('/api/serp-optimizer.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          keywords: [
            'assurance taxi',
            'assurance taxi pas cher',
            'devis assurance taxi',
            'rc pro taxi',
            'assurance vtc'
          ],
          location: 'France'
        })
      });

      const result = await response.json();

      if (result.success) {
        alert(`✅ Optimisation SERP terminée !

Opportunités détectées: ${result.analyzed}
Volume de recherche total: ${result.total_search_volume}
Concurrence moyenne: ${result.avg_competition}

Stratégie recommandée: ${result.strategy.focus}

Consultez le détail dans la console (F12)`);
        console.log('SERP Optimization Results:', result);
      } else {
        alert(`❌ Erreur: ${result.error}`);
      }
    } catch (error) {
      console.error('SERP optimization error:', error);
      alert('❌ Erreur lors de l\'optimisation SERP');
    } finally {
      setIsWorking(false);
    }
  };

  const seoChecklist = [
    { name: 'Sitemap XML', status: true, url: '/feeds/sitemap.xml' },
    { name: 'Flux RSS', status: true, url: '/feeds/rss.xml' },
    { name: 'Robots.txt', status: true, url: '/robots.txt' },
    { name: 'Pages villes', status: cities.length > 0, count: cities.length },
    { name: 'JSON-LD', status: true, description: 'Données structurées' },
    { name: 'Meta tags', status: true, description: 'OpenGraph + Twitter' }
  ];

  return (
    
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-8">
        {/* Header with Home Button */}
        <header className="bg-gradient-to-r from-slate-800 via-blue-800 to-slate-800 border-b-2 border-amber-500 shadow-lg mb-8">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Search className="text-white" size={20} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    Outils SEO
                  </h1>
                  <p className="text-sm text-slate-200">
                    Optimisation et suivi du référencement naturel
                  </p>
                </div>
              </div>

              <a
                href="/backoffice"
                className="bg-white/20 hover:bg-white/30 text-white font-medium px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 backdrop-blur-sm"
              >
                <Home size={16} />
                <span>Accueil Backoffice</span>
              </a>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto">
          <div className="mb-8">

          {/* Info sur les données */}
          {!seoData.isRealData && (
            <div className="mb-6 p-4 bg-amber-50 border-2 border-amber-300 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="text-sm font-medium text-amber-900">
                    <strong>Données estimées</strong> - Configuration Google Search Console API requise
                  </p>
                  <p className="text-xs text-amber-700 mt-1">
                    Pour obtenir les vraies données d'indexation, configurez votre clé API Google Search Console dans les paramètres.
                    Le système effectue un rafraîchissement quotidien automatique à 2h du matin.
                  </p>
                </div>
              </div>
            </div>
          )}

          {seoData.isRealData && seoData.lastUpdate && (
            <div className="mb-6 p-4 bg-green-50 border-2 border-green-300 rounded-lg">
              <div className="flex items-start gap-3">
                <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="text-sm font-medium text-green-900">
                    <strong>✅ Données réelles</strong> depuis Google Search Console
                  </p>
                  <p className="text-xs text-green-700 mt-1">
                    Dernière mise à jour : {new Date(seoData.lastUpdate).toLocaleString('fr-FR')} • Prochaine mise à jour automatique dans la nuit
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SEO Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="text-center bg-slate-800 border border-orange-500">
              <Globe className="mx-auto mb-2 text-orange-400" size={24} />
              <div className="text-2xl font-bold text-white">{seoData.totalUrls}</div>
              <div className="text-sm text-slate-400">URLs totales</div>
            </Card>

            <Card className="text-center bg-slate-800 border border-green-500">
              <CheckCircle className="mx-auto mb-2 text-green-400" size={24} />
              <div className="text-2xl font-bold text-white">{seoData.indexedPages}</div>
              <div className="text-sm text-slate-400">Pages indexées</div>
              {seoData.isRealData && (
                <div className="text-xs text-green-600 mt-1">✅ Données réelles</div>
              )}
            </Card>

            <Card className="text-center bg-slate-800 border border-amber-500">
              <AlertCircle className="mx-auto mb-2 text-yellow-500" size={24} />
              <div className="text-2xl font-bold text-white">{seoData.pendingPages}</div>
              <div className="text-sm text-slate-400">En attente</div>
            </Card>

            <Card className="text-center bg-slate-800 border border-slate-500">
              <TrendingUp className="mx-auto mb-2 text-slate-400" size={24} />
              <div className="text-2xl font-bold text-white">
                {seoData.averagePosition > 0 ? seoData.averagePosition.toFixed(1) : 'N/A'}
              </div>
              <div className="text-sm text-slate-400">Position moyenne</div>
            </Card>
          </div>

          {/* Métriques Google Search Console */}
          {seoData.isRealData && (seoData.impressions30d > 0 || seoData.clicks30d > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card className="text-center bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-300">
                <div className="text-3xl font-bold text-orange-900">{seoData.impressions30d.toLocaleString()}</div>
                <div className="text-sm text-orange-700">Impressions (30j)</div>
              </Card>

              <Card className="text-center bg-gradient-to-br from-green-50 to-green-100 border border-green-300">
                <div className="text-3xl font-bold text-green-900">{seoData.clicks30d.toLocaleString()}</div>
                <div className="text-sm text-green-700">Clics (30j)</div>
              </Card>

              <Card className="text-center bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-300">
                <div className="text-3xl font-bold text-slate-900">
                  {seoData.impressions30d > 0
                    ? ((seoData.clicks30d / seoData.impressions30d) * 100).toFixed(2)
                    : '0'}%
                </div>
                <div className="text-sm text-slate-700">CTR (30j)</div>
              </Card>
            </div>
          )}

          {/* Actions & Tools */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <Card className="bg-slate-800 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <RefreshCw className="mr-2 text-yellow-500" size={20} />
                Actions SEO
              </h3>
              <div className="space-y-3">
                <button
                  onClick={handleRegenerateFeeds}
                  disabled={isWorking}
                  className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-slate-600 to-orange-600 hover:from-slate-700 hover:to-orange-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors shadow-md"
                >
                  <RefreshCw size={16} className={isWorking ? 'animate-spin' : ''} />
                  <span>Régénérer Sitemap & RSS</span>
                </button>

                <button
                  onClick={async () => {
                    setIsWorking(true);
                    try {
                      const { data, error } = await supabase.rpc('trigger_seo_refresh');
                      if (error) throw error;
                      alert('✅ Rafraîchissement SEO lancé ! Les données seront mises à jour dans quelques instants.');
                      setTimeout(loadSeoData, 3000); // Recharger après 3s
                    } catch (error: any) {
                      alert(`❌ Erreur: ${error.message}`);
                    } finally {
                      setIsWorking(false);
                    }
                  }}
                  disabled={isWorking}
                  className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors shadow-md"
                >
                  <TrendingUp size={16} />
                  <span>🔄 Rafraîchir Données SEO</span>
                </button>

                <button
                  onClick={handlePingEngines}
                  disabled={isWorking}
                  className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors shadow-md"
                >
                  <Globe size={16} />
                  <span>Notifier les Moteurs (Simulé)</span>
                </button>

                <div className="w-full bg-orange-900/30 border-2 border-orange-500 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Settings className="text-orange-400 flex-shrink-0 mt-0.5" size={20} />
                    <div>
                      <p className="text-sm font-bold text-orange-300 mb-2">
                        🔧 Configuration API Google Search Console
                      </p>
                      <p className="text-xs text-orange-200 mb-3">
                        Pour obtenir les vraies données Google (pages indexées, performances, etc.) :
                      </p>
                      <div className="text-xs text-orange-100 space-y-1 mb-3">
                        <p><strong>1.</strong> Active l'API dans <a href="https://console.cloud.google.com/apis/library" target="_blank" className="underline hover:text-orange-200">Google Cloud Console</a></p>
                        <p><strong>2.</strong> Crée une clé API dans <a href="https://console.cloud.google.com/apis/credentials" target="_blank" className="underline hover:text-orange-200">Credentials</a></p>
                        <p><strong>3.</strong> Ajoute la clé dans Supabase Secrets :</p>
                      </div>
                      <div className="bg-slate-900 p-2 rounded border border-orange-500 mb-3">
                        <code className="text-xs text-amber-300">
                          GOOGLE_SEARCH_CONSOLE_API_KEY = ta_clé_ici
                        </code>
                      </div>
                      <p className="text-xs text-orange-200">
                        📚 <a href="/SOLUTION-GOOGLE-CSE-SANS-WEBHOOK.md" className="underline hover:text-orange-100 font-semibold" target="_blank">
                          → Voir le guide complet étape par étape
                        </a>
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleOptimizeLeads}
                  disabled={isWorking}
                  className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 disabled:bg-gray-400 text-black font-bold py-3 px-4 rounded-lg transition-colors shadow-lg"
                >
                  <TrendingUp size={16} />
                  <span>🚀 Optimiser Leads (SerpAPI)</span>
                </button>
              </div>
            </Card>

            <Card className="bg-slate-800 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <CheckCircle className="mr-2 text-green-400" size={20} />
                Checklist SEO
              </h3>
              <div className="space-y-3">
                {seoChecklist.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${item.status ? 'bg-green-400' : 'bg-red-400'}`}></div>
                      <span className="text-slate-300">{item.name}</span>
                      {item.count && (
                        <span className="text-xs bg-slate-700 px-2 py-1 rounded-full text-slate-300">
                          {item.count}
                        </span>
                      )}
                    </div>
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-orange-400 hover:text-orange-300"
                      >
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Ping Results */}
          {pingResults.length > 0 && (
            <Card className="mb-8 bg-slate-800 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">
                Résultats Ping Moteurs (Simulé)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {pingResults.map((result, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="font-medium text-slate-900">{result.engine}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {result.success ? 'Simulé' : 'Erreur'}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ⚠️ <strong>Note:</strong> Les pings sont simulés. Pour un indexation réelle, soumettez votre sitemap via Google Search Console et Bing Webmaster Tools.
                </p>
              </div>
            </Card>
          )}

          {/* Statut des Automatisations */}
          {cronJobsStatus.length > 0 && (
            <Card className="bg-slate-800 border border-slate-700 mb-8">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Clock className="mr-2 text-orange-400" size={20} />
                Automatisations SEO (Cron Jobs)
              </h3>
              <div className="space-y-3">
                {cronJobsStatus.map((job, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex-1">
                      <div className="font-medium text-slate-900">{job.job_name}</div>
                      <div className="text-xs text-slate-600 mt-1">
                        Planification: {job.schedule}
                      </div>
                    </div>
                    <div className="text-right">
                      {job.is_active ? (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                          ✅ Actif
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                          ❌ Inactif
                        </span>
                      )}
                      {job.next_run && (
                        <div className="text-xs text-slate-500 mt-1">
                          Prochaine: {new Date(job.next_run).toLocaleString('fr-FR')}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-orange-50 rounded-lg">
                <p className="text-sm text-orange-900">
                  <strong>📅 Rafraîchissement automatique:</strong> Tous les jours à 2h du matin
                </p>
                <p className="text-xs text-orange-700 mt-1">
                  Les métriques SEO sont mises à jour automatiquement chaque nuit avec les données réelles depuis Google Search Console.
                </p>
              </div>
            </Card>
          )}

          {/* City Pages Overview */}
          <Card className="bg-white border border-slate-300">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
              <Search className="mr-2 text-orange-600" size={20} />
              Pages Villes ({cities.length})
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {cities.slice(0, 12).map(city => (
                <a
                  key={city.slug}
                  href={`/ville/${city.slug}`}
                  target="_blank"
                  className="text-center p-3 bg-slate-50 rounded-lg hover:bg-orange-50 transition-colors group border border-slate-200"
                >
                  <div className="text-sm font-medium text-slate-900 group-hover:text-orange-600">
                    {city.city}
                  </div>
                  <div className="text-xs text-slate-600">({city.department})</div>
                </a>
              ))}
              {cities.length > 12 && (
                <a
                  href="/villes"
                  target="_blank"
                  className="text-center p-3 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors border border-orange-200"
                >
                  <div className="text-sm font-medium text-orange-600">
                    +{cities.length - 12} autres
                  </div>
                  <div className="text-xs text-orange-500">Voir toutes</div>
                </a>
              )}
            </div>
          </Card>
          </div>
        </div>
      </div>
    
  );
};

export default SeoTools;