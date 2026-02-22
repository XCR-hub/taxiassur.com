import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { TrendingUp, Search, FileText, Target, AlertCircle, CheckCircle, Clock, Sparkles } from 'lucide-react';

interface GSCQuery {
  id: string;
  query: string;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
  opportunity_score: number;
  date: string;
}

interface SEOOpportunity {
  id: string;
  query: string;
  opportunity_type: string;
  current_position: number;
  impressions: number;
  clicks: number;
  ctr: number;
  potential_clicks: number;
  priority_score: number;
  status: string;
  created_at: string;
}

interface ContentImprovement {
  id: string;
  query: string;
  improvement_type: string;
  suggested_content: string;
  status: string;
  created_at: string;
}

export default function GSCOptimizationDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'opportunities' | 'queries' | 'content'>('overview');
  const [topQueries, setTopQueries] = useState<GSCQuery[]>([]);
  const [opportunities, setOpportunities] = useState<SEOOpportunity[]>([]);
  const [contentImprovements, setContentImprovements] = useState<ContentImprovement[]>([]);
  const [stats, setStats] = useState({
    total_impressions: 0,
    total_clicks: 0,
    avg_position: 0,
    opportunities_count: 0
  });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Charger les top requêtes
      const { data: queries } = await supabase
        .from('gsc_queries')
        .select('*')
        .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('impressions', { ascending: false })
        .limit(50);

      if (queries) {
        setTopQueries(queries);

        // Calculer les stats
        const totalImpressions = queries.reduce((sum, q) => sum + q.impressions, 0);
        const totalClicks = queries.reduce((sum, q) => sum + q.clicks, 0);
        const avgPosition = queries.length > 0
          ? queries.reduce((sum, q) => sum + q.position, 0) / queries.length
          : 0;

        setStats(prev => ({
          ...prev,
          total_impressions: totalImpressions,
          total_clicks: totalClicks,
          avg_position: avgPosition
        }));
      }

      // Charger les opportunités
      const { data: opps } = await supabase
        .from('seo_opportunities')
        .select('*')
        .order('priority_score', { ascending: false })
        .limit(20);

      if (opps) {
        setOpportunities(opps);
        setStats(prev => ({ ...prev, opportunities_count: opps.length }));
      }

      // Charger les améliorations de contenu
      const { data: improvements } = await supabase
        .from('seo_content_improvements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (improvements) {
        setContentImprovements(improvements);
      }

    } catch (error) {
      console.error('Erreur chargement données GSC:', error);
    } finally {
      setLoading(false);
    }
  };

  const syncGSC = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('gsc-sync-performance', {
        body: { days: 7 }
      });

      if (error) throw error;

      alert(`✅ Synchronisation réussie !\n${data.data.queries_imported} requêtes importées\n${data.data.opportunities_detected} opportunités détectées`);
      loadData();
    } catch (error) {
      console.error('Erreur sync GSC:', error);
      alert('❌ Erreur lors de la synchronisation GSC');
    } finally {
      setSyncing(false);
    }
  };

  const generateContent = async (query: string, category: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-content-with-gsc', {
        body: {
          category,
          topic: query,
          max_queries: 5
        }
      });

      if (error) throw error;

      alert(`✅ Contenu généré avec succès !\nRequêtes ciblées: ${data.metadata.target_queries.join(', ')}`);
      loadData();
    } catch (error) {
      console.error('Erreur génération contenu:', error);
      alert('❌ Erreur lors de la génération de contenu');
    }
  };

  const getOpportunityTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'high_impression_low_ctr': 'Impressions élevées, CTR faible',
      'position_5_15': 'Position 5-15 (à optimiser)',
      'zero_clicks': 'Zéro clics malgré impressions',
      'general': 'Opportunité générale'
    };
    return types[type] || type;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'in_progress': 'bg-blue-100 text-blue-800',
      'completed': 'bg-green-100 text-green-800',
      'ignored': 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des données GSC...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Optimisation SEO - Google Search Console</h1>
          <p className="text-gray-600 mt-1">Analyse et optimisation basées sur les données réelles de recherche</p>
        </div>
        <button
          onClick={syncGSC}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <TrendingUp className="w-5 h-5" />
          {syncing ? 'Synchronisation...' : 'Synchroniser GSC'}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Impressions (30j)</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {stats.total_impressions.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Search className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Clics (30j)</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {stats.total_clicks.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Target className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Position Moyenne</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {stats.avg_position.toFixed(1)}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Opportunités</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {stats.opportunities_count}
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <Sparkles className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {[
              { id: 'overview', label: 'Vue d\'ensemble', icon: TrendingUp },
              { id: 'opportunities', label: 'Opportunités SEO', icon: Target },
              { id: 'queries', label: 'Top Requêtes', icon: Search },
              { id: 'content', label: 'Contenu Généré', icon: FileText }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-3 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Vue d'ensemble */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Analyse Rapide</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Top 5 Requêtes par Impressions</h4>
                    <div className="space-y-2">
                      {topQueries.slice(0, 5).map((q, i) => (
                        <div key={q.id} className="flex justify-between text-sm">
                          <span className="text-gray-700">{i + 1}. {q.query}</span>
                          <span className="font-medium text-blue-600">{q.impressions.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-medium text-green-900 mb-2">Opportunités Prioritaires</h4>
                    <div className="space-y-2">
                      {opportunities.slice(0, 5).map((opp, i) => (
                        <div key={opp.id} className="flex justify-between text-sm">
                          <span className="text-gray-700">{i + 1}. {opp.query}</span>
                          <span className="font-medium text-green-600">Score: {opp.priority_score}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Opportunités SEO */}
          {activeTab === 'opportunities' && (
            <div className="space-y-4">
              {opportunities.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Aucune opportunité détectée</p>
                  <p className="text-sm text-gray-500 mt-2">Synchronisez les données GSC pour détecter les opportunités</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requête</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Impressions</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clics</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Potentiel</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {opportunities.map((opp) => (
                        <tr key={opp.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {opp.query}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {getOpportunityTypeLabel(opp.opportunity_type)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {opp.current_position?.toFixed(1)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {opp.impressions?.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {opp.clicks}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                            +{opp.potential_clicks} clics
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                              {opp.priority_score}/100
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(opp.status)}`}>
                              {opp.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button
                              onClick={() => generateContent(opp.query, 'blog')}
                              className="text-blue-600 hover:text-blue-800 font-medium"
                            >
                              Générer contenu
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Top Requêtes */}
          {activeTab === 'queries' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requête</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Impressions</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clics</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">CTR</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score Opp.</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {topQueries.map((query) => (
                    <tr key={query.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {query.query}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {query.impressions.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {query.clicks}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {(query.ctr * 100).toFixed(2)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {query.position.toFixed(1)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          query.opportunity_score >= 70 ? 'bg-green-100 text-green-800' :
                          query.opportunity_score >= 40 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {query.opportunity_score}/100
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Contenu Généré */}
          {activeTab === 'content' && (
            <div className="space-y-4">
              {contentImprovements.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Aucun contenu généré</p>
                  <p className="text-sm text-gray-500 mt-2">Générez du contenu depuis les opportunités SEO</p>
                </div>
              ) : (
                contentImprovements.map((content) => (
                  <div key={content.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-gray-900">{content.query}</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          Type: {content.improvement_type}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(content.status)}`}>
                        {content.status}
                      </span>
                    </div>
                    <div className="bg-gray-50 p-3 rounded text-sm text-gray-700 max-h-40 overflow-y-auto">
                      {content.suggested_content?.substring(0, 500)}...
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
