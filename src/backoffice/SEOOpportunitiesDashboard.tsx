import React, { useState, useEffect } from 'react';
import { TrendingUp, Search, Eye, MousePointer, BarChart3, Zap, ChevronRight, RefreshCw, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from '@/lib/toast';

interface GSCOpportunity {
  query: string;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
  opportunity_score: number;
  suggested_page?: string;
  optimization_ideas?: string[];
}

interface GSCPage {
  url: string;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
  needs_optimization: boolean;
  optimization_priority: number;
}

interface SyncHistory {
  sync_date: string;
  queries_imported: number;
  pages_imported: number;
  opportunities_detected: number;
  status: string;
}

export default function SEOOpportunitiesDashboard() {
  const [opportunities, setOpportunities] = useState<GSCOpportunity[]>([]);
  const [pages, setPages] = useState<GSCPage[]>([]);
  const [syncHistory, setSyncHistory] = useState<SyncHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [stats, setStats] = useState({
    total_impressions: 0,
    total_clicks: 0,
    avg_ctr: 0,
    avg_position: 0,
    high_potential: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    try {
      // Charger les opportunités (requêtes avec impressions mais peu de clics)
      const { data: oppsData } = await supabase
        .from('gsc_queries')
        .select('*')
        .gte('impressions', 10)
        .lt('ctr', 0.05)
        .gte('position', 1)
        .lte('position', 20)
        .order('impressions', { ascending: false })
        .limit(50);

      if (oppsData) {
        setOpportunities(oppsData.map(q => ({
          ...q,
          opportunity_score: calculateOpportunityScore(q),
          optimization_ideas: generateIdeas(q)
        })));
      }

      // Charger les pages à optimiser
      const { data: pagesData } = await supabase
        .from('gsc_pages')
        .select('*')
        .eq('needs_optimization', true)
        .order('optimization_priority', { ascending: false })
        .limit(20);

      if (pagesData) {
        setPages(pagesData);
      }

      // Charger l'historique de sync
      const { data: historyData } = await supabase
        .from('gsc_sync_history')
        .select('*')
        .order('sync_date', { ascending: false })
        .limit(7);

      if (historyData) {
        setSyncHistory(historyData);
      }

      // Calculer les stats
      const { data: statsData } = await supabase
        .from('gsc_queries')
        .select('impressions, clicks, ctr, position');

      if (statsData && statsData.length > 0) {
        const totalImpressions = statsData.reduce((sum, q) => sum + (q.impressions || 0), 0);
        const totalClicks = statsData.reduce((sum, q) => sum + (q.clicks || 0), 0);
        const avgCtr = totalClicks / totalImpressions || 0;
        const avgPosition = statsData.reduce((sum, q) => sum + (q.position || 0), 0) / statsData.length;
        const highPotential = oppsData?.length || 0;

        setStats({
          total_impressions: totalImpressions,
          total_clicks: totalClicks,
          avg_ctr: avgCtr,
          avg_position: avgPosition,
          high_potential: highPotential
        });
      }

    } catch (error) {
      console.error('Erreur chargement données GSC:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateOpportunityScore = (query: { impressions: number; position: number; ctr: number }): number => {
    // Score basé sur : impressions élevées + position bonne + CTR faible = fort potentiel
    const impressionScore = Math.min(query.impressions / 10, 50);
    const positionScore = Math.max(0, 30 - query.position) * 1.5;
    const ctrPenalty = query.ctr * 100;

    return Math.min(100, Math.round(impressionScore + positionScore - ctrPenalty));
  };

  const generateIdeas = (query: { query: string; position: number; ctr: number; impressions: number }): string[] => {
    const ideas: string[] = [];

    if (query.position > 10) {
      ideas.push(`Améliorer le contenu pour remonter de la position ${Math.round(query.position)} au top 10`);
    }

    if (query.ctr < 0.02) {
      ideas.push('Optimiser le titre et la meta description pour augmenter le CTR');
    }

    if (query.impressions > 50) {
      ideas.push('Créer une page dédiée ou une section FAQ pour cette requête');
    }

    if (query.query.includes('prix') || query.query.includes('tarif')) {
      ideas.push('Ajouter un comparateur de prix ou un calculateur de devis');
    }

    if (query.query.includes('comment') || query.query.includes('qu\'est-ce')) {
      ideas.push('Créer un article guide ou tutoriel détaillé');
    }

    return ideas.length > 0 ? ideas : ['Enrichir le contenu de la page liée à cette requête'];
  };

  const triggerSync = async () => {
    setSyncing(true);

    try {
      const { data, error } = await supabase.functions.invoke('gsc-sync-performance', {
        body: { days: 7 }
      });

      if (error) {
        toast.error(`Erreur synchronisation: ${error.message}`);
      } else {
        toast.success(`✅ Synchronisation réussie!\n${data.data?.queries_imported || 0} requêtes importées\n${data.data?.opportunities_detected || 0} opportunités détectées`);
        await loadData();
      }
    } catch (error) {
      console.error('Erreur sync:', error);
      toast.error('Erreur lors de la synchronisation. Vérifiez que les secrets Google sont configurés.');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Chargement des données GSC...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-blue-600" />
              Opportunités SEO - Google Search Console
            </h1>
            <p className="text-gray-600 mt-2">
              Exploitez les requêtes à fort potentiel détectées par GSC
            </p>
          </div>
          <button
            onClick={triggerSync}
            disabled={syncing}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Synchronisation...' : 'Synchroniser GSC'}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Impressions (7j)</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {stats.total_impressions.toLocaleString()}
              </p>
            </div>
            <Eye className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Clics (7j)</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {stats.total_clicks.toLocaleString()}
              </p>
            </div>
            <MousePointer className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">CTR Moyen</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {(stats.avg_ctr * 100).toFixed(2)}%
              </p>
            </div>
            <BarChart3 className="w-8 h-8 text-purple-600" />
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
            <Search className="w-8 h-8 text-orange-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Fort Potentiel</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {stats.high_potential}
              </p>
            </div>
            <Zap className="w-8 h-8 text-yellow-600" />
          </div>
        </div>
      </div>

      {/* Opportunités à Exploiter */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Zap className="w-6 h-6 text-yellow-600" />
            Top Opportunités (Impressions élevées + CTR faible)
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Requêtes vues par beaucoup d'utilisateurs mais ignorées - Potentiel d'optimisation maximal
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requête</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Impressions</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Clics</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">CTR</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Position</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Optimisations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {opportunities.map((opp, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${
                      opp.opportunity_score >= 70 ? 'bg-red-100 text-red-800' :
                      opp.opportunity_score >= 50 ? 'bg-orange-100 text-orange-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {opp.opportunity_score}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Search className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-900">{opp.query}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-gray-900">
                    {opp.impressions.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right text-gray-600">
                    {opp.clicks}
                  </td>
                  <td className="px-6 py-4 text-right text-gray-600">
                    {(opp.ctr * 100).toFixed(2)}%
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-gray-900">
                    {Math.round(opp.position)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      {opp.optimization_ideas?.slice(0, 2).map((idea, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-gray-600">
                          <ChevronRight className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                          <span>{idea}</span>
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pages à Optimiser */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Pages Nécessitant une Optimisation</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priorité</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">URL</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Impressions</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">CTR</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Position</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {pages.map((page, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      page.optimization_priority >= 80 ? 'bg-red-600 text-white' :
                      page.optimization_priority >= 50 ? 'bg-orange-600 text-white' :
                      'bg-yellow-600 text-white'
                    }`}>
                      {page.optimization_priority}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-blue-600 hover:underline">
                    <a href={page.url} target="_blank" rel="noopener noreferrer">
                      {page.url}
                    </a>
                  </td>
                  <td className="px-6 py-4 text-right font-semibold">
                    {page.impressions.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {(page.ctr * 100).toFixed(2)}%
                  </td>
                  <td className="px-6 py-4 text-right">
                    {Math.round(page.position)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Historique de Synchronisation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Historique de Synchronisation</h2>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            {syncHistory.map((sync, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-4">
                  {sync.status === 'success' ? (
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  ) : sync.status === 'running' ? (
                    <Clock className="w-6 h-6 text-blue-600" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  )}
                  <div>
                    <p className="font-medium text-gray-900">
                      {new Date(sync.sync_date).toLocaleString('fr-FR')}
                    </p>
                    <p className="text-sm text-gray-600">
                      {sync.queries_imported} requêtes • {sync.pages_imported} pages • {sync.opportunities_detected} opportunités
                    </p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  sync.status === 'success' ? 'bg-green-100 text-green-800' :
                  sync.status === 'running' ? 'bg-blue-100 text-blue-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {sync.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
