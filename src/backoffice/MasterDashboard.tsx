import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import {
  Activity, Users, TrendingUp, DollarSign, MapPin, Clock,
  CheckCircle, AlertCircle, Play, Square, RefreshCw, Settings,
  BarChart3, Zap, Globe, Mail, FileText, MessageSquare,
  ArrowUp, ArrowDown, Minus
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import NavigationMenu from './NavigationMenu';
import LeadCRM from './LeadCRM';

interface RealtimeStats {
  active_sessions: number;
  today_sessions: number;
  today_conversions: number;
  today_quote_requests: number;
  pending_quotes: number;
  avg_session_duration: number;
  top_traffic_source: string;
  top_city: string;
}

interface AutomationStatus {
  name: string;
  description: string;
  enabled: boolean;
  last_run?: string | null;
  run_count?: number;
  success_count?: number;
  error_count?: number;
  last_error?: string | null;
  created_at?: string;
  updated_at?: string;
}

const MasterDashboard: React.FC = () => {
  const [stats, setStats] = useState<RealtimeStats | null>(null);
  const [automations, setAutomations] = useState<AutomationStatus[]>([]);
  const [topPages, setTopPages] = useState<any[]>([]);
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Charger les stats temps réel
  const loadRealtimeStats = async () => {
    try {
      // Essayer d'abord la fonction RPC
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_realtime_stats');

      if (!rpcError && rpcData && rpcData.length > 0) {
        const stats = rpcData[0];
        setStats({
          active_sessions: parseInt(stats.active_sessions) || 0,
          today_sessions: parseInt(stats.today_sessions) || 0,
          today_conversions: parseInt(stats.today_conversions) || 0,
          today_quote_requests: parseInt(stats.today_quote_requests) || 0,
          pending_quotes: parseInt(stats.pending_quotes) || 0,
          avg_session_duration: parseFloat(stats.avg_session_duration) || 0,
          top_traffic_source: stats.top_traffic_source || 'Direct',
          top_city: stats.top_city || 'Paris'
        });
        return;
      }

      // Fallback: utiliser les leads directement
      const { data: leadsData } = await supabase
        .from('leads')
        .select('status, created_at')
        .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString());

      if (leadsData) {
        const today_conversions = leadsData.filter(l => l.status === 'client').length;
        const pending_quotes = leadsData.filter(l => l.status === 'nouveau' || l.status === 'contacte').length;

        setStats({
          active_sessions: 0,
          today_sessions: leadsData.length,
          today_conversions,
          today_quote_requests: leadsData.length,
          pending_quotes,
          avg_session_duration: 0,
          top_traffic_source: 'Direct',
          top_city: 'N/A'
        });
      }
    } catch (error) {
      logger.error('Erreur chargement stats:', error);
    }
  };

  // Charger les automatisations
  const loadAutomations = async () => {
    try {
      const { data, error } = await supabase
        .from('automation_status')
        .select('*')
        .order('name');

      if (!error && data) {
        setAutomations(data);
      }
    } catch (error) {
      logger.error('Error loading automations:', error);
    }
  };

  // Charger top pages
  const loadTopPages = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_top_pages_today');

      if (!error && data) {
        setTopPages(data);
      } else {
        setTopPages([]);
      }
    } catch (error) {
      logger.error('Error loading top pages:', error);
      setTopPages([]);
    }
  };

  // Charger sessions récentes
  const loadRecentSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('analytics_sessions')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(10);

      if (!error && data) {
        setRecentSessions(data);
      }
    } catch (error) {
      logger.error('Error loading sessions:', error);
    }
  };

  // Charger toutes les données
  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([
      loadRealtimeStats(),
      loadAutomations(),
      loadTopPages(),
      loadRecentSessions()
    ]);
    setLoading(false);
  };

  // Toggle automation
  const toggleAutomation = async (name: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('automation_status')
        .update({ enabled: !currentState })
        .eq('name', name);

      if (error) {
        logger.error('Error toggling automation:', error);
        alert(`❌ Erreur: ${error.message}`);
        return;
      }

      await loadAutomations();
    } catch (error) {
      logger.error('Error toggling automation:', error);
    }
  };

  // Start ALL automations
  const startAllAutomations = async () => {
    try {
      const { error } = await supabase
        .from('automation_status')
        .update({ enabled: true })
        .gt('name', ''); // Update all rows where name is not empty

      if (error) {
        logger.error('Error updating automations:', error);
        alert(`❌ Erreur: ${error.message}`);
        return;
      }

      await loadAutomations();
      alert('✅ Toutes les automatisations sont activées !');
    } catch (error) {
      logger.error('Error starting all automations:', error);
      alert('❌ Erreur lors de l\'activation');
    }
  };

  // Stop ALL automations
  const stopAllAutomations = async () => {
    const confirmed = confirm('⚠️ Voulez-vous vraiment arrêter TOUTES les automatisations ?');
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('automation_status')
        .update({ enabled: false })
        .gt('name', ''); // Update all rows where name is not empty

      if (error) {
        logger.error('Error updating automations:', error);
        alert(`❌ Erreur: ${error.message}`);
        return;
      }

      await loadAutomations();
      alert('🛑 Toutes les automatisations sont arrêtées');
    } catch (error) {
      logger.error('Error stopping all automations:', error);
      alert('❌ Erreur lors de l\'arrêt');
    }
  };

  useEffect(() => {
    loadAllData();

    if (autoRefresh) {
      const interval = setInterval(() => {
        loadRealtimeStats();
        loadRecentSessions();
      }, 30000); // Rafraîchir toutes les 30s

      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-yellow-500 animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Chargement du dashboard...</p>
        </div>
      </div>
    );
  }

  const conversionRate = stats && stats.today_sessions > 0
    ? ((stats.today_conversions / stats.today_sessions) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">
              🚀 Master Dashboard TaxiAssur
            </h1>
            <p className="text-slate-400">
              Pilotage complet en temps réel • Dernière màj : {new Date().toLocaleTimeString('fr-FR')}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                autoRefresh
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-700 text-slate-300'
              }`}
            >
              <RefreshCw className={`w-5 h-5 ${autoRefresh ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={loadAllData}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold transition-all"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Master Controls */}
        <div className="flex gap-4">
          <button
            onClick={startAllAutomations}
            className="flex-1 px-6 py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg font-bold text-lg transition-all shadow-lg"
          >
            <Play className="w-6 h-6 inline mr-2" />
            LANCER TOUTES LES AUTOMATISATIONS
          </button>

          <button
            onClick={stopAllAutomations}
            className="flex-1 px-6 py-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg font-bold text-lg transition-all shadow-lg"
          >
            <Square className="w-6 h-6 inline mr-2" />
            ARRÊTER TOUTES LES AUTOMATISATIONS
          </button>
        </div>
      </div>

      {/* CRM & Leads - Vue d'ensemble */}
      <LeadCRM />

      {/* Menu de Navigation Complet */}
      <NavigationMenu />

      {/* Stats Temps Réel */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-orange-900/40 to-orange-800/40 border border-orange-500/30 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <Activity className="w-8 h-8 text-orange-400" />
            <span className="text-xs font-semibold text-orange-300 bg-orange-500/20 px-2 py-1 rounded">
              LIVE
            </span>
          </div>
          <p className="text-3xl font-bold text-white mb-1">
            {stats?.active_sessions || 0}
          </p>
          <p className="text-orange-300 text-sm">Sessions actives (5 min)</p>
        </div>

        <div className="bg-gradient-to-br from-green-900/40 to-green-800/40 border border-green-500/30 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <Users className="w-8 h-8 text-green-400" />
            <ArrowUp className="w-5 h-5 text-green-400" />
          </div>
          <p className="text-3xl font-bold text-white mb-1">
            {stats?.today_sessions || 0}
          </p>
          <p className="text-green-300 text-sm">Visiteurs aujourd'hui</p>
        </div>

        <div className="bg-gradient-to-br from-amber-900/40 to-amber-800/40 border border-amber-500/30 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="w-8 h-8 text-yellow-500" />
            <span className="text-lg font-bold text-amber-300">{conversionRate}%</span>
          </div>
          <p className="text-3xl font-bold text-white mb-1">
            {stats?.today_conversions || 0}
          </p>
          <p className="text-amber-300 text-sm">Conversions aujourd'hui</p>
        </div>

        <div className="bg-gradient-to-br from-orange-900/40 to-orange-800/40 border border-orange-500/30 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <FileText className="w-8 h-8 text-orange-400" />
            <span className="text-xs font-semibold text-orange-300 bg-orange-500/20 px-2 py-1 rounded">
              PENDING
            </span>
          </div>
          <p className="text-3xl font-bold text-white mb-1">
            {stats?.pending_quotes || 0}
          </p>
          <p className="text-orange-300 text-sm">Devis en attente</p>
        </div>
      </div>

      {/* Stats Secondaires */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6 text-slate-400" />
            <div>
              <p className="text-2xl font-bold text-white">
                {Math.floor((stats?.avg_session_duration || 0) / 60)}:{String((stats?.avg_session_duration || 0) % 60).padStart(2, '0')}
              </p>
              <p className="text-slate-400 text-sm">Temps moyen/session</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Globe className="w-6 h-6 text-slate-400" />
            <div>
              <p className="text-2xl font-bold text-white">
                {stats?.top_traffic_source || 'N/A'}
              </p>
              <p className="text-slate-400 text-sm">Source #1 aujourd'hui</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <MapPin className="w-6 h-6 text-slate-400" />
            <div>
              <p className="text-2xl font-bold text-white">
                {stats?.top_city || 'N/A'}
              </p>
              <p className="text-slate-400 text-sm">Ville #1 aujourd'hui</p>
            </div>
          </div>
        </div>
      </div>

      {/* Automatisations */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Zap className="w-6 h-6 text-yellow-500" />
            Automatisations ({automations.filter(a => a.enabled).length}/{automations.length} actives)
          </h2>

          <div className="flex gap-3">
            <button
              onClick={startAllAutomations}
              className="px-6 py-2 bg-gradient-to-r from-green-600 to-green-500 text-white font-bold rounded-lg hover:from-green-500 hover:to-green-400 transition-all shadow-lg hover:shadow-green-500/50 flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              TOUT ACTIVER
            </button>
            <button
              onClick={stopAllAutomations}
              className="px-6 py-2 bg-gradient-to-r from-red-600 to-red-500 text-white font-bold rounded-lg hover:from-red-500 hover:to-red-400 transition-all shadow-lg hover:shadow-red-500/50 flex items-center gap-2"
            >
              <Square className="w-4 h-4" />
              TOUT ARRÊTER
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {automations.map((auto) => (
            <div
              key={auto.name}
              className={`border rounded-lg p-4 transition-all ${
                auto.enabled
                  ? 'bg-green-900/20 border-green-500/30'
                  : 'bg-slate-800/50 border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-bold text-white mb-1 flex items-center gap-2">
                    {auto.enabled ? (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-slate-500" />
                    )}
                    {auto.description}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Runs : {auto.success_count || 0}/{auto.run_count || 0}
                    {auto.error_count ? ` • Erreurs : ${auto.error_count}` : ''}
                  </p>
                </div>

                <button
                  onClick={() => toggleAutomation(auto.name, auto.enabled)}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                    auto.enabled
                      ? 'bg-green-500 text-white hover:bg-green-600'
                      : 'bg-gray-700 text-slate-300 hover:bg-gray-600'
                  }`}
                >
                  {auto.enabled ? 'ON' : 'OFF'}
                </button>
              </div>

              {auto.last_run && (
                <p className="text-xs text-slate-500">
                  Dernier run : {new Date(auto.last_run).toLocaleString('fr-FR')}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Top Pages */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-orange-400" />
          Top 10 Pages Aujourd'hui
        </h2>

        <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-900">
              <tr>
                <th className="px-4 py-3 text-left text-slate-400 text-sm font-semibold">Page</th>
                <th className="px-4 py-3 text-left text-slate-400 text-sm font-semibold">Vues</th>
                <th className="px-4 py-3 text-left text-slate-400 text-sm font-semibold">Visiteurs</th>
                <th className="px-4 py-3 text-left text-slate-400 text-sm font-semibold">Conversion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {topPages.map((page, index) => (
                <tr key={index} className="hover:bg-gray-700/30">
                  <td className="px-4 py-3 text-white text-sm">{page.page_url}</td>
                  <td className="px-4 py-3 text-slate-300 text-sm">{page.views}</td>
                  <td className="px-4 py-3 text-slate-300 text-sm">{page.unique_visitors}</td>
                  <td className="px-4 py-3">
                    <span className={`text-sm font-semibold ${
                      parseFloat(page.conversion_rate) > 10
                        ? 'text-green-400'
                        : parseFloat(page.conversion_rate) > 5
                        ? 'text-yellow-500'
                        : 'text-slate-400'
                    }`}>
                      {page.conversion_rate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sessions Récentes */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
          <Activity className="w-6 h-6 text-orange-400" />
          Sessions Récentes (Live)
        </h2>

        <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-900">
              <tr>
                <th className="px-4 py-3 text-left text-slate-400 text-sm font-semibold">Heure</th>
                <th className="px-4 py-3 text-left text-slate-400 text-sm font-semibold">Source</th>
                <th className="px-4 py-3 text-left text-slate-400 text-sm font-semibold">Ville</th>
                <th className="px-4 py-3 text-left text-slate-400 text-sm font-semibold">Device</th>
                <th className="px-4 py-3 text-left text-slate-400 text-sm font-semibold">Pages</th>
                <th className="px-4 py-3 text-left text-slate-400 text-sm font-semibold">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {recentSessions.map((session) => (
                <tr key={session.id} className="hover:bg-gray-700/30">
                  <td className="px-4 py-3 text-white text-sm">
                    {new Date(session.started_at).toLocaleTimeString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 text-slate-300 text-sm">{session.traffic_source || 'direct'}</td>
                  <td className="px-4 py-3 text-slate-300 text-sm">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {session.city || 'N/A'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-300 text-sm">{session.device_type || 'desktop'}</td>
                  <td className="px-4 py-3 text-slate-300 text-sm">{session.pages_viewed}</td>
                  <td className="px-4 py-3">
                    {session.converted ? (
                      <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded font-semibold">
                        CONVERTI
                      </span>
                    ) : (
                      <span className="text-xs bg-gray-700 text-slate-400 px-2 py-1 rounded">
                        En cours
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MasterDashboard;
