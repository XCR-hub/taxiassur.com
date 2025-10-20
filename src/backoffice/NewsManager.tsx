import React, { useState, useEffect } from 'react';
import { Play, Pause, RefreshCw, Eye, Settings, TrendingUp, Clock, Zap, Globe, Home } from 'lucide-react';
import { useNewsSystem } from '../lib/newsAggregator';
import { ProcessedNews } from '../lib/newsAggregator';
import Card from '../components/Card';

const NewsManager: React.FC = () => {
  const { isRunning: isActive, lastUpdate, newsCount, error, startNewsSystem: startSystem, stopNewsSystem: stopSystem } = useNewsSystem();
  const stats = { sources: 5, processed: newsCount, published: 1, interval: '6h' };
  const [processedNews, setProcessedNews] = useState<ProcessedNews[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    checkInterval: 6, // hours
    maxNewsPerDay: 3,
    autoPublish: true,
    qualityThreshold: 70
  });

  useEffect(() => {
    loadProcessedNews();
  }, []);

  const loadProcessedNews = async () => {
    setLoading(true);
    try {
      // Charger depuis Supabase d'abord
      const { supabase } = await import('../lib/supabase');

      const { data: supabaseNews, error: supabaseError } = await supabase
        .from('news_articles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (!supabaseError && supabaseNews && supabaseNews.length > 0) {
        // Convertir les données Supabase au format attendu
        const formattedNews = supabaseNews.map((article: any) => ({
          id: article.id,
          originalTitle: article.title,
          synthesizedTitle: article.title,
          originalContent: article.content,
          synthesizedContent: article.summary || article.content.substring(0, 300),
          taxiAngle: article.category || 'actualité taxi',
          seoKeywords: article.tags || [],
          publishedAt: article.published_at || article.created_at,
          sources: [article.author || 'TaxiAssur'],
          relevanceScore: 85,
          status: article.status || 'draft',
          createdAt: article.created_at,
          updatedAt: article.updated_at
        }));
        setProcessedNews(formattedNews);
        return;
      }

      // Fallback sur fichier JSON statique
      const response = await fetch('/content/processed-news.json');
      if (response.ok) {
        const data = await response.json();
        setProcessedNews(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to load processed news:', error);
    } finally {
      setLoading(false);
    }
  };

  const manualRefresh = async () => {
    try {
      setLoading(true);

      // Appeler l'Edge Function Supabase pour agréger les actualités
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-social-scraper`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            keywords: ['assurance taxi', 'taxi professionnel', 'réglementation taxi'],
            max_results: settings.maxNewsPerDay
          })
        }
      );

      if (!response.ok) {
        throw new Error('Échec de l\'agrégation des actualités');
      }

      const result = await response.json();
      alert(`✅ ${result.articles?.length || 0} actualités récupérées et traitées !`);
      await loadProcessedNews();
    } catch (error: any) {
      console.error('Error refreshing news:', error);
      alert(`❌ Erreur : ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const publishNews = async (newsId: string) => {
    try {
      // Publier l'actualité dans Supabase
      const { supabase } = await import('../lib/supabase');

      const { error } = await supabase
        .from('news_articles')
        .update({ status: 'published', published_at: new Date().toISOString() })
        .eq('id', newsId);

      if (error) throw error;

      alert('✅ Actualité publiée avec succès !');
      await loadProcessedNews();
    } catch (error: any) {
      console.error('Error publishing news:', error);
      alert(`❌ Erreur : ${error.message}`);
    }
  };

  const getAngleColor = (angle: string): string => {
    const colors: Record<string, string> = {
      'impact sur les assurances taxi': 'bg-orange-100 text-orange-800',
      'nouvelles obligations réglementaires': 'bg-red-100 text-red-800',
      'évolutions technologiques': 'bg-orange-100 text-orange-800',
      'opportunités d\'économies': 'bg-green-100 text-green-800',
      'formation et certification': 'bg-orange-100 text-orange-800',
      'sécurité et protection': 'bg-yellow-100 text-yellow-800',
      'conséquences pour les professionnels': 'bg-gray-100 text-gray-800'
    };
    return colors[angle] || colors['conséquences pour les professionnels'];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-8"></div>
            <div className="grid grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-48 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    
      <div className="min-h-screen bg-gray-50 p-8">
        {/* Header with Home Button */}
        <header className="bg-white border-b-2 border-gray-200 shadow-sm mb-8">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                  <TrendingUp className="text-white" size={20} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Gestionnaire d'Actualités IA
                  </h1>
                  <p className="text-sm text-gray-600">
                    Veille automatisée et synthèse IA des actualités taxi
                  </p>
                </div>
              </div>
              
              <a
                href="/backoffice"
                className="bg-orange-600 hover:bg-orange-700 text-white font-medium px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
              >
                <Home size={16} />
                <span>Accueil Backoffice</span>
              </a>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            
            <div className="flex items-center space-x-4">
              <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
                isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                <span className="text-sm font-medium">
                  {isActive ? 'Système actif' : 'Système arrêté'}
                </span>
              </div>
              
              <button
                onClick={isActive ? stopSystem : startSystem}
                className={`flex items-center space-x-2 font-medium py-2 px-4 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-red-600 hover:bg-red-700 text-white' 
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {isActive ? <Pause size={16} /> : <Play size={16} />}
                <span>{isActive ? 'Arrêter' : 'Démarrer'}</span>
              </button>
              
              <button
                onClick={manualRefresh}
                className="flex items-center space-x-2 bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                <RefreshCw size={16} />
                <span>Lancer Maintenant</span>
              </button>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="text-center bg-gradient-to-br from-orange-50 to-yellow-50">
              <Globe className="mx-auto mb-2 text-orange-600" size={24} />
              <div className="text-2xl font-bold text-gray-900">5</div>
              <div className="text-sm text-gray-600">Sources actives</div>
            </Card>

            <Card className="text-center bg-gradient-to-br from-green-50 to-emerald-50">
              <TrendingUp className="mx-auto mb-2 text-green-600" size={24} />
              <div className="text-2xl font-bold text-gray-900">{processedNews.length}</div>
              <div className="text-sm text-gray-600">News traitées</div>
            </Card>

            <Card className="text-center bg-gradient-to-br from-orange-50 to-pink-50">
              <Zap className="mx-auto mb-2 text-orange-600" size={24} />
              <div className="text-2xl font-bold text-gray-900">
                {processedNews.filter(n => n.status === 'published').length}
              </div>
              <div className="text-sm text-gray-600">Publiées</div>
            </Card>

            <Card className="text-center bg-gradient-to-br from-amber-50 to-yellow-50">
              <Clock className="mx-auto mb-2 text-amber-600" size={24} />
              <div className="text-2xl font-bold text-gray-900">6h</div>
              <div className="text-sm text-gray-600">Intervalle</div>
            </Card>
          </div>

          {/* Settings */}
          <Card className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Settings className="mr-2 text-gray-600" size={20} />
              Configuration du Système
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Intervalle (heures)
                </label>
                <input
                  type="number"
                  value={settings.checkInterval}
                  onChange={(e) => setSettings(prev => ({ ...prev, checkInterval: parseInt(e.target.value) }))}
                  min="1"
                  max="24"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white text-gray-900"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max news/jour
                </label>
                <input
                  type="number"
                  value={settings.maxNewsPerDay}
                  onChange={(e) => setSettings(prev => ({ ...prev, maxNewsPerDay: parseInt(e.target.value) }))}
                  min="1"
                  max="10"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white text-gray-900"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seuil qualité (%)
                </label>
                <input
                  type="number"
                  value={settings.qualityThreshold}
                  onChange={(e) => setSettings(prev => ({ ...prev, qualityThreshold: parseInt(e.target.value) }))}
                  min="50"
                  max="100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white text-gray-900"
                />
              </div>
              
              <div className="flex items-end">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.autoPublish}
                    onChange={(e) => setSettings(prev => ({ ...prev, autoPublish: e.target.checked }))}
                    className="rounded border-gray-300 text-orange-600 focus:ring-orange-500 h-4 w-4"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-900">Publication auto</span>
                </label>
              </div>
            </div>
          </Card>

          {/* Processed News */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Actualités Traitées ({processedNews.length})
            </h3>
            
            {processedNews.map(news => (
              <Card key={news.id} hover className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getAngleColor(news.taxiAngle)}`}>
                        {news.taxiAngle}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        news.status === 'published' ? 'bg-green-100 text-green-800' :
                        news.status === 'ready' ? 'bg-orange-100 text-orange-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {news.status}
                      </span>
                      <span className="text-xs text-gray-600">
                        Score: {news.relevanceScore}/100
                      </span>
                    </div>
                    
                    <h4 className="text-lg font-bold text-gray-900 mb-2">
                      {news.synthesizedTitle}
                    </h4>
                    
                    <p className="text-gray-600 text-sm mb-3">
                      {news.synthesizedContent.replace(/<[^>]*>/g, '').substring(0, 200)}...
                    </p>
                    
                    <div className="flex items-center space-x-4 text-xs text-gray-600">
                      <span>Sources: {news.sources.join(', ')}</span>
                      <span>Créé: {new Date(news.createdAt).toLocaleDateString('fr-FR')}</span>
                      <span>Publié: {new Date(news.publishedAt).toLocaleDateString('fr-FR')}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        // Show preview modal
                        alert('Aperçu : ' + news.synthesizedTitle);
                      }}
                      className="text-orange-600 hover:text-orange-800"
                    >
                      <Eye size={16} />
                    </button>
                    
                    {news.status === 'ready' && (
                      <button
                        onClick={() => publishNews(news.id)}
                        className="flex items-center space-x-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors"
                      >
                        <span>Publier</span>
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-1">
                  {news.seoKeywords.slice(0, 6).map(keyword => (
                    <span key={keyword} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                      {keyword}
                    </span>
                  ))}
                </div>
              </Card>
            ))}
          </div>

          {/* Empty State */}
          {processedNews.length === 0 && !loading && (
            <Card className="text-center py-12">
              <TrendingUp className="mx-auto mb-4 text-gray-600" size={48} />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Aucune actualité traitée
              </h3>
              <p className="text-gray-600 mb-4">
                Le système de veille n'a pas encore traité d'actualités
              </p>
              <button
                onClick={manualRefresh}
                className="bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Lancer la Première Veille
              </button>
            </Card>
          )}
        </div>
      </div>
    
  );
};

export default NewsManager;