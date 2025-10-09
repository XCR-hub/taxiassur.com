import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, Users, TrendingUp, DollarSign, MapPin, Clock,
  CheckCircle, AlertCircle, Play, Square, RefreshCw, Settings,
  BarChart3, Zap, Globe, Mail, FileText, MessageSquare,
  ArrowUp, ArrowDown, Minus, Home, UserCircle, Link2, FileEdit,
  Shield, PieChart, Search, Newspaper, Package, Megaphone
} from 'lucide-react';
import { supabase } from '../lib/supabase';

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
  is_enabled: boolean;
  is_running: boolean;
  frequency: string;
  total_runs: number;
  successful_runs: number;
  failed_runs: number;
  last_run_at: string;
  last_run_status: string;
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
      const { data, error } = await supabase.rpc('get_realtime_stats');
      if (!error && data) {
        setStats(data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
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
      console.error('Error loading automations:', error);
    }
  };

  // Charger top pages
  const loadTopPages = async () => {
    try {
      const { data, error } = await supabase.rpc('get_top_pages_today');
      if (!error && data) {
        setTopPages(data);
      }
    } catch (error) {
      console.error('Error loading top pages:', error);
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
      console.error('Error loading sessions:', error);
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
      await supabase
        .from('automation_status')
        .update({ is_enabled: !currentState })
        .eq('name', name);

      await loadAutomations();
    } catch (error) {
      console.error('Error toggling automation:', error);
    }
  };

  // Start ALL automations
  const startAllAutomations = async () => {
    try {
      await supabase
        .from('automation_status')
        .update({ is_enabled: true })
        .neq('name', ''); // Update all

      await loadAutomations();
      alert('✅ Toutes les automatisations sont activées !');
    } catch (error) {
      console.error('Error starting all automations:', error);
      alert('❌ Erreur lors de l\'activation');
    }
  };

  // Stop ALL automations
  const stopAllAutomations = async () => {
    const confirmed = confirm('⚠️ Voulez-vous vraiment arrêter TOUTES les automatisations ?');
    if (!confirmed) return;

    try {
      await supabase
        .from('automation_status')
        .update({ is_enabled: false })
        .neq('name', ''); // Update all

      await loadAutomations();
      alert('🛑 Toutes les automatisations sont arrêtées');
    } catch (error) {
      console.error('Error stopping all automations:', error);
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
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-amber-400 animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Chargement du dashboard...</p>
        </div>
      </div>
    );
  }

  const conversionRate = stats && stats.today_sessions > 0
    ? ((stats.today_conversions / stats.today_sessions) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">
              🚀 Master Dashboard TaxiAssur
            </h1>
            <p className="text-gray-400">
              Pilotage complet en temps réel • Dernière màj : {new Date().toLocaleTimeString('fr-FR')}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                autoRefresh
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-700 text-gray-300'
              }`}
            >
              <RefreshCw className={`w-5 h-5 ${autoRefresh ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={loadAllData}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-all"
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

      {/* Menu de Navigation */}
      <div className="mb-8 bg-gray-800/50 border border-gray-700 rounded-lg p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <Link
            to="/backoffice/leads"
            className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-lg font-semibold transition-all shadow-md"
          >
            <Users className="w-5 h-5" />
            <span>Leads</span>
          </Link>

          <Link
            to="/backoffice/old-dashboard"
            className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-semibold transition-all shadow-md"
          >
            <Home className="w-5 h-5" />
            <span>Dashboard</span>
          </Link>

          <Link
            to="/backoffice/content"
            className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-lg font-semibold transition-all shadow-md"
          >
            <FileEdit className="w-5 h-5" />
            <span>Contenu</span>
          </Link>

          <Link
            to="/backoffice/seo"
            className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg font-semibold transition-all shadow-md"
          >
            <Search className="w-5 h-5" />
            <span>SEO</span>
          </Link>

          <Link
            to="/backoffice/backlinks"
            className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white rounded-lg font-semibold transition-all shadow-md"
          >
            <Link2 className="w-5 h-5" />
            <span>Backlinks</span>
          </Link>

          <Link
            to="/backoffice/analytics"
            className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white rounded-lg font-semibold transition-all shadow-md"
          >
            <PieChart className="w-5 h-5" />
            <span>Analytics</span>
          </Link>

          <Link
            to="/backoffice/partners"
            className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white rounded-lg font-semibold transition-all shadow-md"
          >
            <UserCircle className="w-5 h-5" />
            <span>Partenaires</span>
          </Link>

          <Link
            to="/backoffice/security"
            className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg font-semibold transition-all shadow-md"
          >
            <Shield className="w-5 h-5" />
            <span>Sécurité</span>
          </Link>

          <Link
            to="/backoffice/news"
            className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg font-semibold transition-all shadow-md"
          >
            <Newspaper className="w-5 h-5" />
            <span>Actualités</span>
          </Link>

          <Link
            to="/backoffice/popups"
            className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white rounded-lg font-semibold transition-all shadow-md"
          >
            <Package className="w-5 h-5" />
            <span>Popups</span>
          </Link>

          <Link
            to="/backoffice/social-media"
            className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white rounded-lg font-semibold transition-all shadow-md"
          >
            <Megaphone className="w-5 h-5" />
            <span>Réseaux</span>
          </Link>

          <Link
            to="/"
            className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white rounded-lg font-semibold transition-all shadow-md"
          >
            <Globe className="w-5 h-5" />
            <span>Voir le site</span>
          </Link>
        </div>
      </div>

      {/* Stats Temps Réel */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/40 border border-blue-500/30 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <Activity className="w-8 h-8 text-blue-400" />
            <span className="text-xs font-semibold text-blue-300 bg-blue-500/20 px-2 py-1 rounded">
              LIVE
            </span>
          </div>
          <p className="text-3xl font-bold text-white mb-1">
            {stats?.active_sessions || 0}
          </p>
          <p className="text-blue-300 text-sm">Sessions actives (5 min)</p>
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
            <TrendingUp className="w-8 h-8 text-amber-400" />
            <span className="text-lg font-bold text-amber-300">{conversionRate}%</span>
          </div>
          <p className="text-3xl font-bold text-white mb-1">
            {stats?.today_conversions || 0}
          </p>
          <p className="text-amber-300 text-sm">Conversions aujourd'hui</p>
        </div>

        <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/40 border border-purple-500/30 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <FileText className="w-8 h-8 text-purple-400" />
            <span className="text-xs font-semibold text-purple-300 bg-purple-500/20 px-2 py-1 rounded">
              PENDING
            </span>
          </div>
          <p className="text-3xl font-bold text-white mb-1">
            {stats?.pending_quotes || 0}
          </p>
          <p className="text-purple-300 text-sm">Devis en attente</p>
        </div>
      </div>

      {/* Stats Secondaires */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6 text-gray-400" />
            <div>
              <p className="text-2xl font-bold text-white">
                {Math.floor((stats?.avg_session_duration || 0) / 60)}:{String((stats?.avg_session_duration || 0) % 60).padStart(2, '0')}
              </p>
              <p className="text-gray-400 text-sm">Temps moyen/session</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Globe className="w-6 h-6 text-gray-400" />
            <div>
              <p className="text-2xl font-bold text-white">
                {stats?.top_traffic_source || 'N/A'}
              </p>
              <p className="text-gray-400 text-sm">Source #1 aujourd'hui</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <MapPin className="w-6 h-6 text-gray-400" />
            <div>
              <p className="text-2xl font-bold text-white">
                {stats?.top_city || 'N/A'}
              </p>
              <p className="text-gray-400 text-sm">Ville #1 aujourd'hui</p>
            </div>
          </div>
        </div>
      </div>

      {/* Automatisations */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
          <Zap className="w-6 h-6 text-amber-400" />
          Automatisations ({automations.filter(a => a.is_enabled).length}/{automations.length} actives)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {automations.map((auto) => (
            <div
              key={auto.name}
              className={`border rounded-lg p-4 transition-all ${
                auto.is_enabled
                  ? 'bg-green-900/20 border-green-500/30'
                  : 'bg-gray-800/50 border-gray-700'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-bold text-white mb-1 flex items-center gap-2">
                    {auto.is_enabled ? (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-gray-500" />
                    )}
                    {auto.description}
                  </h3>
                  <p className="text-xs text-gray-400">
                    Fréquence : {auto.frequency} • Runs : {auto.successful_runs}/{auto.total_runs}
                  </p>
                </div>

                <button
                  onClick={() => toggleAutomation(auto.name, auto.is_enabled)}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                    auto.is_enabled
                      ? 'bg-green-500 text-white hover:bg-green-600'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {auto.is_enabled ? 'ON' : 'OFF'}
                </button>
              </div>

              {auto.last_run_at && (
                <p className="text-xs text-gray-500">
                  Dernier run : {new Date(auto.last_run_at).toLocaleString('fr-FR')}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Top Pages */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-blue-400" />
          Top 10 Pages Aujourd'hui
        </h2>

        <div className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-gray-400 text-sm font-semibold">Page</th>
                <th className="px-4 py-3 text-left text-gray-400 text-sm font-semibold">Vues</th>
                <th className="px-4 py-3 text-left text-gray-400 text-sm font-semibold">Visiteurs</th>
                <th className="px-4 py-3 text-left text-gray-400 text-sm font-semibold">Conversion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {topPages.map((page, index) => (
                <tr key={index} className="hover:bg-gray-700/30">
                  <td className="px-4 py-3 text-white text-sm">{page.page_url}</td>
                  <td className="px-4 py-3 text-gray-300 text-sm">{page.views}</td>
                  <td className="px-4 py-3 text-gray-300 text-sm">{page.unique_visitors}</td>
                  <td className="px-4 py-3">
                    <span className={`text-sm font-semibold ${
                      parseFloat(page.conversion_rate) > 10
                        ? 'text-green-400'
                        : parseFloat(page.conversion_rate) > 5
                        ? 'text-amber-400'
                        : 'text-gray-400'
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
          <Activity className="w-6 h-6 text-purple-400" />
          Sessions Récentes (Live)
        </h2>

        <div className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-gray-400 text-sm font-semibold">Heure</th>
                <th className="px-4 py-3 text-left text-gray-400 text-sm font-semibold">Source</th>
                <th className="px-4 py-3 text-left text-gray-400 text-sm font-semibold">Ville</th>
                <th className="px-4 py-3 text-left text-gray-400 text-sm font-semibold">Device</th>
                <th className="px-4 py-3 text-left text-gray-400 text-sm font-semibold">Pages</th>
                <th className="px-4 py-3 text-left text-gray-400 text-sm font-semibold">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {recentSessions.map((session) => (
                <tr key={session.id} className="hover:bg-gray-700/30">
                  <td className="px-4 py-3 text-white text-sm">
                    {new Date(session.started_at).toLocaleTimeString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 text-gray-300 text-sm">{session.traffic_source || 'direct'}</td>
                  <td className="px-4 py-3 text-gray-300 text-sm">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {session.city || 'N/A'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-300 text-sm">{session.device_type || 'desktop'}</td>
                  <td className="px-4 py-3 text-gray-300 text-sm">{session.pages_viewed}</td>
                  <td className="px-4 py-3">
                    {session.converted ? (
                      <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded font-semibold">
                        CONVERTI
                      </span>
                    ) : (
                      <span className="text-xs bg-gray-700 text-gray-400 px-2 py-1 rounded">
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
