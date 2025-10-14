import { useState, useEffect } from 'react';
import { TrendingUp, Search, Zap, Target, BarChart3, Lightbulb, RefreshCw, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { analyzeContentOpportunities, saveContentOpportunities, ContentOpportunity } from '../lib/trendAnalyzer';
import { supabase } from '../lib/supabase';

export default function TrendAnalyzer() {
  const navigate = useNavigate();
  const [opportunities, setOpportunities] = useState<ContentOpportunity[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOpportunities();
  }, []);

  const loadOpportunities = async () => {
    try {
      const { data, error } = await supabase
        .from('content_opportunities')
        .select('*')
        .order('estimated_traffic', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Opportunités chargées depuis Supabase:', data?.length || 0);

      setOpportunities(
        (data || []).map(d => ({
          keyword: d.keyword,
          priority: d.priority,
          searchVolume: d.search_volume,
          competition: d.competition,
          trend: d.trend,
          suggestedTitle: d.suggested_title,
          suggestedQuestions: d.suggested_questions || [],
          estimatedTraffic: d.estimated_traffic,
          difficulty: d.difficulty
        }))
      );
    } catch (err) {
      console.error('Error loading opportunities:', err);
    } finally {
      setLoading(false);
    }
  };

  const analyzeNow = async () => {
    setIsAnalyzing(true);

    try {
      // Mots-clés de base pour l'analyse
      const baseKeywords = [
        'assurance taxi',
        'assurance vtc',
        'RC professionnelle taxi',
        'assurance taxi pas cher',
        'devis assurance taxi',
        'comparateur assurance taxi',
        'assurance taxi en ligne',
        'meilleure assurance taxi'
      ];

      const newOpportunities = await analyzeContentOpportunities(baseKeywords);
      await saveContentOpportunities(newOpportunities);
      await loadOpportunities();

      alert(`✅ ${newOpportunities.length} opportunités découvertes !`);
    } catch (err) {
      console.error('Analysis error:', err);
      alert('Erreur lors de l\'analyse. Vérifiez les clés API.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateArticle = (opp: ContentOpportunity) => {
    // Rediriger vers le générateur IA avec les données pré-remplies
    navigate(`/backoffice/ai-generator?keyword=${encodeURIComponent(opp.keyword)}&questions=${encodeURIComponent(opp.suggestedQuestions.join(','))}`);
  };

  const filteredOpportunities = opportunities.filter(opp => {
    if (filter === 'all') return true;
    return opp.priority === filter;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'rising':
        return <TrendingUp size={16} className="text-green-600" />;
      case 'falling':
        return <TrendingUp size={16} className="text-red-600 transform rotate-180" />;
      default:
        return <BarChart3 size={16} className="text-gray-600" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 mb-6 text-white">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-3">
            <Target size={32} className="animate-pulse" />
            <h2 className="text-2xl font-bold">Analyseur de Tendances SEO</h2>
          </div>
          <button
            onClick={() => navigate('/backoffice')}
            className="flex items-center space-x-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
          >
            <Home size={20} />
            <span>Retour</span>
          </button>
        </div>
        <p className="text-indigo-100">
          Découvrez automatiquement les meilleurs mots-clés et opportunités de contenu
        </p>
      </div>

      {/* Actions */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Analyse Automatique</h3>
            <p className="text-sm text-gray-600">
              Utilise Google Trends, Suggest et d'autres APIs pour trouver les meilleurs sujets
            </p>
          </div>

          <button
            onClick={analyzeNow}
            disabled={isAnalyzing}
            className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {isAnalyzing ? (
              <>
                <RefreshCw size={20} className="animate-spin" />
                <span>Analyse...</span>
              </>
            ) : (
              <>
                <Zap size={20} />
                <span>Analyser Maintenant</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700">Filtre:</span>
          {(['all', 'high', 'medium', 'low'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === f
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {f === 'all' ? 'Tous' : f === 'high' ? 'Priorité Haute' : f === 'medium' ? 'Moyenne' : 'Basse'}
            </button>
          ))}
        </div>
      </div>

      {/* Opportunities List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      ) : filteredOpportunities.length === 0 ? (
        <div className="bg-blue-50 rounded-xl p-8 text-center">
          <Lightbulb size={48} className="mx-auto text-blue-600 mb-4" />
          <h3 className="text-xl font-bold text-gray-800 mb-2">Aucune opportunité pour le moment</h3>
          <p className="text-gray-600 mb-4">
            Cliquez sur "Analyser Maintenant" pour découvrir les meilleures opportunités SEO
          </p>
          <button
            onClick={analyzeNow}
            disabled={isAnalyzing}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Lancer l'Analyse
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOpportunities.map((opp, index) => (
            <div
              key={index}
              className="bg-white rounded-xl shadow-lg p-6 border-2 border-gray-100 hover:border-purple-200 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-bold text-gray-800">{opp.keyword}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${getPriorityColor(opp.priority)}`}>
                      {opp.priority.toUpperCase()}
                    </span>
                    {getTrendIcon(opp.trend)}
                  </div>

                  <p className="text-sm text-gray-600 mb-3">{opp.suggestedTitle}</p>

                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-slate-500">Volume:</span>
                      <p className="font-bold text-gray-800">{opp.searchVolume.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Compétition:</span>
                      <p className="font-bold text-gray-800 capitalize">{opp.competition}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Trafic Estimé:</span>
                      <p className="font-bold text-green-600">{opp.estimatedTraffic.toLocaleString()}/mois</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Difficulté:</span>
                      <p className="font-bold text-gray-800">{opp.difficulty}/10</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => generateArticle(opp)}
                  className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors ml-4"
                >
                  <Search size={18} />
                  <span>Générer Article</span>
                </button>
              </div>

              {opp.suggestedQuestions.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs font-bold text-gray-700 mb-2">Questions suggérées :</p>
                  <div className="flex flex-wrap gap-2">
                    {opp.suggestedQuestions.slice(0, 3).map((q, i) => (
                      <span key={i} className="text-xs bg-gray-100 px-3 py-1 rounded-full text-gray-700">
                        {q}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Info Box */}
      <div className="mt-6 bg-blue-50 rounded-xl p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
          <Lightbulb size={20} className="mr-2 text-blue-600" />
          Comment ça marche ?
        </h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li>✅ <strong>Google Trends</strong> : Analyse les tendances de recherche en temps réel</li>
          <li>✅ <strong>Google Suggest</strong> : Récupère les suggestions populaires</li>
          <li>✅ <strong>Patterns de questions</strong> : Génère automatiquement les FAQ populaires</li>
          <li>✅ <strong>Estimation de trafic</strong> : Calcule le potentiel de visiteurs</li>
          <li>✅ <strong>Score de difficulté</strong> : Évalue la facilité de ranking</li>
          <li>✅ <strong>Prioritisation</strong> : Classe automatiquement les opportunités</li>
        </ul>
      </div>
    </div>
  );
}
