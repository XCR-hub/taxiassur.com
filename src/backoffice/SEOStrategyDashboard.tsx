import React, { useState } from 'react';
import { TrendingUp, Target, Link2, FileText, MapPin, Zap, Award, CheckCircle, ExternalLink, Search, BarChart3 } from 'lucide-react';
import Card from '../components/Card';
import { SEARCH_ENGINES, pingAllSearchEngines, getPriorityUrls, SEO_STRATEGY } from '../lib/universal-ping';

const SEOStrategyDashboard: React.FC = () => {
  const [pingResults, setPingResults] = useState<any[]>([]);
  const [isPinging, setIsPinging] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>('engines');

  const handleUniversalPing = async () => {
    setIsPinging(true);
    try {
      const urls = getPriorityUrls();
      const result = await pingAllSearchEngines(urls);
      setPingResults(result.results);
      alert(`✅ ${result.results.length} moteurs notifiés !`);
    } catch (error) {
      console.error('Ping error:', error);
      alert('❌ Erreur lors du ping');
    } finally {
      setIsPinging(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center">
            <Award className="mr-3 text-yellow-500" size={40} />
            Stratégie SEO n°1 - Leads Assurance Taxi
          </h1>
          <p className="text-gray-600 text-lg">
            Système complet pour devenir le leader en demandes de devis assurance taxi
          </p>
        </div>

        {/* Action rapide */}
        <Card className="mb-8 bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
                <Zap className="mr-2 text-orange-600" size={28} />
                Ping Universel Moteurs de Recherche
              </h2>
              <p className="text-gray-700">
                Notifier <strong>{SEARCH_ENGINES.filter(e => e.active).length} moteurs</strong> simultanément
                (Google, Bing, Yandex, DuckDuckGo, Qwant, Ecosia, Brave...)
              </p>
            </div>
            <button
              onClick={handleUniversalPing}
              disabled={isPinging}
              className="flex items-center space-x-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white font-bold py-4 px-8 rounded-lg transition-colors shadow-lg"
            >
              <Search size={20} />
              <span>{isPinging ? 'Ping en cours...' : 'Lancer Ping Universel'}</span>
            </button>
          </div>

          {pingResults.length > 0 && (
            <div className="mt-6 space-y-2">
              <h3 className="font-bold text-gray-900 mb-3">Résultats du ping :</h3>
              <div className="grid grid-cols-2 gap-3">
                {pingResults.map((result, idx) => (
                  <div key={idx} className="flex items-start space-x-2 p-3 bg-white rounded-lg">
                    <CheckCircle className={result.status === 'success' ? 'text-green-600' : 'text-blue-600'} size={20} />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{result.engine}</p>
                      <p className="text-sm text-gray-600">{result.note}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Liste des moteurs */}
        <Card className="mb-8">
          <div
            className="flex items-center justify-between cursor-pointer"
            onClick={() => toggleSection('engines')}
          >
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <Search className="mr-2 text-blue-600" size={24} />
              Moteurs de Recherche Ciblés ({SEARCH_ENGINES.filter(e => e.active).length})
            </h2>
            <span className="text-2xl">{expandedSection === 'engines' ? '−' : '+'}</span>
          </div>

          {expandedSection === 'engines' && (
            <div className="mt-6 grid grid-cols-3 gap-4">
              {SEARCH_ENGINES.filter(e => e.active).map((engine) => (
                <div key={engine.name} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-gray-900">{engine.name}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      engine.pingMethod === 'indexnow' ? 'bg-green-100 text-green-800' :
                      engine.pingMethod === 'sitemap' ? 'bg-blue-100 text-blue-800' :
                      engine.pingMethod === 'api' ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {engine.pingMethod}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{engine.market}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Mots-clés stratégiques */}
        <Card className="mb-8">
          <div
            className="flex items-center justify-between cursor-pointer"
            onClick={() => toggleSection('keywords')}
          >
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <Target className="mr-2 text-green-600" size={24} />
              Mots-Clés Stratégiques pour n°1
            </h2>
            <span className="text-2xl">{expandedSection === 'keywords' ? '−' : '+'}</span>
          </div>

          {expandedSection === 'keywords' && (
            <div className="mt-6 space-y-6">
              <div>
                <h3 className="font-bold text-gray-900 mb-3 flex items-center">
                  <Award className="mr-2 text-yellow-600" size={20} />
                  Mots-clés primaires (fort volume)
                </h3>
                <div className="flex flex-wrap gap-2">
                  {SEO_STRATEGY.keywords.primary.map((kw) => (
                    <span key={kw} className="px-4 py-2 bg-yellow-100 text-yellow-900 rounded-full font-medium">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 mb-3">Longue traîne (conversion élevée)</h3>
                <div className="flex flex-wrap gap-2">
                  {SEO_STRATEGY.keywords.longTail.map((kw) => (
                    <span key={kw} className="px-3 py-1 bg-blue-100 text-blue-900 rounded-full text-sm">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 mb-3 flex items-center">
                  <MapPin className="mr-2 text-red-600" size={20} />
                  SEO Local (par ville)
                </h3>
                <div className="flex flex-wrap gap-2">
                  {SEO_STRATEGY.keywords.local.map((kw) => (
                    <span key={kw} className="px-3 py-1 bg-red-100 text-red-900 rounded-full text-sm">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Piliers de contenu */}
        <Card className="mb-8">
          <div
            className="flex items-center justify-between cursor-pointer"
            onClick={() => toggleSection('content')}
          >
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <FileText className="mr-2 text-purple-600" size={24} />
              Piliers de Contenu
            </h2>
            <span className="text-2xl">{expandedSection === 'content' ? '−' : '+'}</span>
          </div>

          {expandedSection === 'content' && (
            <div className="mt-6 space-y-6">
              {SEO_STRATEGY.contentPillars.map((pillar, idx) => (
                <div key={idx} className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                  <h3 className="font-bold text-gray-900 mb-3 text-lg">{pillar.title}</h3>
                  {pillar.pages && (
                    <div className="space-y-2">
                      {pillar.pages.map((page) => (
                        <a
                          key={page}
                          href={page}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center space-x-2 text-purple-700 hover:text-purple-900"
                        >
                          <ExternalLink size={16} />
                          <span>{page}</span>
                        </a>
                      ))}
                    </div>
                  )}
                  {pillar.strategy && (
                    <p className="text-gray-700 mt-2">
                      <strong>Stratégie :</strong> {pillar.strategy}
                    </p>
                  )}
                  {pillar.frequency && (
                    <p className="text-gray-700 mt-2">
                      <strong>Fréquence :</strong> {pillar.frequency}
                    </p>
                  )}
                  {pillar.topics && (
                    <div className="mt-3">
                      <strong className="text-gray-900">Topics :</strong>
                      <ul className="list-disc list-inside mt-2 space-y-1 text-gray-700">
                        {pillar.topics.map((topic) => (
                          <li key={topic}>{topic}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Stratégie backlinks */}
        <Card className="mb-8">
          <div
            className="flex items-center justify-between cursor-pointer"
            onClick={() => toggleSection('backlinks')}
          >
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <Link2 className="mr-2 text-orange-600" size={24} />
              Stratégie Backlinks
            </h2>
            <span className="text-2xl">{expandedSection === 'backlinks' ? '−' : '+'}</span>
          </div>

          {expandedSection === 'backlinks' && (
            <div className="mt-6 space-y-3">
              {SEO_STRATEGY.backlinkStrategy.map((strategy, idx) => (
                <div key={idx} className="flex items-start space-x-3 p-4 bg-orange-50 rounded-lg">
                  <CheckCircle className="text-orange-600 flex-shrink-0 mt-1" size={20} />
                  <p className="text-gray-900">{strategy}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Optimisation conversion */}
        <Card>
          <div
            className="flex items-center justify-between cursor-pointer"
            onClick={() => toggleSection('conversion')}
          >
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <BarChart3 className="mr-2 text-green-600" size={24} />
              Optimisation Conversion (Leads)
            </h2>
            <span className="text-2xl">{expandedSection === 'conversion' ? '−' : '+'}</span>
          </div>

          {expandedSection === 'conversion' && (
            <div className="mt-6 grid grid-cols-2 gap-4">
              {SEO_STRATEGY.conversionOptimization.map((opt, idx) => (
                <div key={idx} className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg border border-green-200">
                  <Zap className="text-green-600 flex-shrink-0" size={20} />
                  <p className="text-gray-900 font-medium">{opt}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default SEOStrategyDashboard;
