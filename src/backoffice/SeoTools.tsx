import React, { useState, useEffect } from 'react';
import { Search, Globe, RefreshCw, TrendingUp, ExternalLink, CheckCircle, AlertCircle, Home } from 'lucide-react';
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
    pendingPages: 0
  });
  
  const [pingResults, setPingResults] = useState<any[]>([]);
  const [isWorking, setIsWorking] = useState(false);
  const cities = generateCityPages();

  useEffect(() => {
    loadSeoData();
  }, []);

  const loadSeoData = async () => {
    setSeoData({
      lastSitemapUpdate: new Date().toISOString(),
      totalUrls: 45 + cities.length,
      indexedPages: Math.floor(Math.random() * 40) + 35,
      pendingPages: Math.floor(Math.random() * 10) + 2
    });
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
    
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 p-8">
        {/* Header with Home Button */}
        <header className="bg-gradient-to-r from-slate-700 via-slate-600 to-blue-700 border-b-2 border-slate-800 shadow-lg mb-8">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
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

          {/* SEO Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="text-center bg-gradient-to-br from-slate-100 to-blue-100 border border-slate-300">
              <Globe className="mx-auto mb-2 text-blue-600" size={24} />
              <div className="text-2xl font-bold text-slate-900">{seoData.totalUrls}</div>
              <div className="text-sm text-slate-600">URLs totales</div>
            </Card>

            <Card className="text-center bg-gradient-to-br from-green-50 to-emerald-100 border border-green-300">
              <CheckCircle className="mx-auto mb-2 text-green-600" size={24} />
              <div className="text-2xl font-bold text-slate-900">{seoData.indexedPages}</div>
              <div className="text-sm text-slate-600">Pages indexées</div>
            </Card>

            <Card className="text-center bg-gradient-to-br from-yellow-50 to-amber-100 border border-yellow-300">
              <AlertCircle className="mx-auto mb-2 text-yellow-600" size={24} />
              <div className="text-2xl font-bold text-slate-900">{seoData.pendingPages}</div>
              <div className="text-sm text-slate-600">En attente</div>
            </Card>

            <Card className="text-center bg-gradient-to-br from-slate-200 to-slate-100 border border-slate-400">
              <TrendingUp className="mx-auto mb-2 text-slate-600" size={24} />
              <div className="text-2xl font-bold text-slate-900">Simulé</div>
              <div className="text-sm text-slate-600">⚠️ Données de test</div>
            </Card>
          </div>

          {/* Actions & Tools */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <Card className="bg-white border border-slate-300">
              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                <RefreshCw className="mr-2 text-slate-600" size={20} />
                Actions SEO
              </h3>
              <div className="space-y-3">
                <button
                  onClick={handleRegenerateFeeds}
                  disabled={isWorking}
                  className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-slate-600 to-blue-600 hover:from-slate-700 hover:to-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors shadow-md"
                >
                  <RefreshCw size={16} className={isWorking ? 'animate-spin' : ''} />
                  <span>Régénérer Sitemap & RSS</span>
                </button>

                <button
                  onClick={handlePingEngines}
                  disabled={isWorking}
                  className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors shadow-md"
                >
                  <Globe size={16} />
                  <span>Notifier les Moteurs (Simulé)</span>
                </button>

                <div className="w-full flex items-center justify-center space-x-2 bg-red-100 text-red-800 font-medium py-3 px-4 rounded-lg border-2 border-red-300">
                  <AlertCircle size={16} />
                  <span>⚠️ Webhook non configuré</span>
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

            <Card className="bg-white border border-slate-300">
              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                <CheckCircle className="mr-2 text-green-600" size={20} />
                Checklist SEO
              </h3>
              <div className="space-y-3">
                {seoChecklist.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${item.status ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span className="text-slate-700">{item.name}</span>
                      {item.count && (
                        <span className="text-xs bg-slate-100 px-2 py-1 rounded-full text-slate-700">
                          {item.count}
                        </span>
                      )}
                    </div>
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
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
            <Card className="mb-8 bg-white border border-slate-300">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
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

          {/* City Pages Overview */}
          <Card className="bg-white border border-slate-300">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
              <Search className="mr-2 text-blue-600" size={20} />
              Pages Villes ({cities.length})
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {cities.slice(0, 12).map(city => (
                <a
                  key={city.slug}
                  href={`/ville/${city.slug}`}
                  target="_blank"
                  className="text-center p-3 bg-slate-50 rounded-lg hover:bg-blue-50 transition-colors group border border-slate-200"
                >
                  <div className="text-sm font-medium text-slate-900 group-hover:text-blue-600">
                    {city.city}
                  </div>
                  <div className="text-xs text-slate-600">({city.department})</div>
                </a>
              ))}
              {cities.length > 12 && (
                <a
                  href="/villes"
                  target="_blank"
                  className="text-center p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors border border-blue-200"
                >
                  <div className="text-sm font-medium text-blue-600">
                    +{cities.length - 12} autres
                  </div>
                  <div className="text-xs text-blue-500">Voir toutes</div>
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