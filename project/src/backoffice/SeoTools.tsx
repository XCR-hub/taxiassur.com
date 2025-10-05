import React, { useState, useEffect } from 'react';
import { Search, Globe, RefreshCw, TrendingUp, ExternalLink, CheckCircle, AlertCircle, Home } from 'lucide-react';
import AuthGuard from '../components/AuthGuard';
import { pingSearchEngines } from '../lib/ping';
import { regenerateFeeds } from '../lib/feeds';
import { generateCityPages } from '../lib/ping';
import Card from '../components/Card';

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
    // Simulation des données SEO
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

  const seoChecklist = [
    { name: 'Sitemap XML', status: true, url: '/feeds/sitemap.xml' },
    { name: 'Flux RSS', status: true, url: '/feeds/rss.xml' },
    { name: 'Robots.txt', status: true, url: '/robots.txt' },
    { name: 'Pages villes', status: cities.length > 0, count: cities.length },
    { name: 'JSON-LD', status: true, description: 'Données structurées' },
    { name: 'Meta tags', status: true, description: 'OpenGraph + Twitter' }
  ];

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 p-8">
        {/* Header with Home Button */}
        <header className="bg-white border-b-2 border-gray-200 shadow-sm mb-8">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Search className="text-white" size={20} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Outils SEO
                  </h1>
                  <p className="text-sm text-gray-600">
                    Optimisation et suivi du référencement naturel
                  </p>
                </div>
              </div>
              
              <a
                href="/backoffice"
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
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
            <Card className="text-center bg-gradient-to-br from-blue-50 to-indigo-50">
              <Globe className="mx-auto mb-2 text-blue-600" size={24} />
              <div className="text-2xl font-bold text-gray-900">{seoData.totalUrls}</div>
              <div className="text-sm text-gray-600">URLs totales</div>
            </Card>

            <Card className="text-center bg-gradient-to-br from-green-50 to-emerald-50">
              <CheckCircle className="mx-auto mb-2 text-green-600" size={24} />
              <div className="text-2xl font-bold text-gray-900">{seoData.indexedPages}</div>
              <div className="text-sm text-gray-600">Pages indexées</div>
            </Card>

            <Card className="text-center bg-gradient-to-br from-yellow-50 to-amber-50">
              <AlertCircle className="mx-auto mb-2 text-yellow-600" size={24} />
              <div className="text-2xl font-bold text-gray-900">{seoData.pendingPages}</div>
              <div className="text-sm text-gray-600">En attente</div>
            </Card>

            <Card className="text-center bg-gradient-to-br from-purple-50 to-pink-50">
              <TrendingUp className="mx-auto mb-2 text-purple-600" size={24} />
              <div className="text-2xl font-bold text-gray-900">95</div>
              <div className="text-sm text-gray-600">Score SEO</div>
            </Card>
          </div>

          {/* Actions & Tools */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <RefreshCw className="mr-2 text-blue-600" size={20} />
                Actions SEO
              </h3>
              <div className="space-y-3">
                <button
                  onClick={handleRegenerateFeeds}
                  disabled={isWorking}
                  className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  <RefreshCw size={16} className={isWorking ? 'animate-spin' : ''} />
                  <span>Régénérer Sitemap & RSS</span>
                </button>
                
                <button
                  onClick={handlePingEngines}
                  disabled={isWorking}
                  className="w-full flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  <Globe size={16} />
                  <span>Notifier les Moteurs</span>
                </button>
                
                <a
                  href="/test-webhook.html"
                  target="_blank"
                  className="w-full flex items-center justify-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  <ExternalLink size={16} />
                  <span>Tester Webhook</span>
                </a>
              </div>
            </Card>

            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <CheckCircle className="mr-2 text-green-600" size={20} />
                Checklist SEO
              </h3>
              <div className="space-y-3">
                {seoChecklist.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${item.status ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span className="text-gray-700">{item.name}</span>
                      {item.count && (
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">
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
            <Card className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Résultats Ping Moteurs
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {pingResults.map((result, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium">{result.engine}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {result.success ? 'Succès' : 'Erreur'}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* City Pages Overview */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Search className="mr-2 text-amber-600" size={20} />
              Pages Villes ({cities.length})
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {cities.slice(0, 12).map(city => (
                <a
                  key={city.slug}
                  href={`/ville/${city.slug}`}
                  target="_blank"
                  className="text-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
                >
                  <div className="text-sm font-medium text-gray-900 group-hover:text-amber-600">
                    {city.city}
                  </div>
                  <div className="text-xs text-gray-500">({city.department})</div>
                </a>
              ))}
              {cities.length > 12 && (
                <a
                  href="/villes"
                  target="_blank"
                  className="text-center p-3 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
                >
                  <div className="text-sm font-medium text-amber-600">
                    +{cities.length - 12} autres
                  </div>
                  <div className="text-xs text-amber-500">Voir toutes</div>
                </a>
              )}
            </div>
          </Card>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
};

export default SeoTools;