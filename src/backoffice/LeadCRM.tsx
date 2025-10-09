import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Calendar, Activity, TrendingUp, Database, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface LeadStats {
  today: number;
  week: number;
  month: number;
  total: number;
}

export default function LeadCRM() {
  const [stats, setStats] = useState<LeadStats>({
    today: 0,
    week: 0,
    month: 0,
    total: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeadStats();
    
    // Rafraîchir toutes les 30 secondes
    const interval = setInterval(loadLeadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadLeadStats = async () => {
    try {
      // Essayer d'abord l'API PHP
      const response = await fetch('/api/lead-manager.php?action=list');
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.leads) {
          calculateStats(result.leads);
          return;
        }
      }

      // Sinon charger depuis Supabase
      const { data: leads } = await supabase
        .from('leads')
        .select('created_at')
        .order('created_at', { ascending: false });

      if (leads) {
        calculateStats(leads);
      }
    } catch (error) {
      console.error('Error loading lead stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (leads: any[]) => {
    const now = new Date();
    const today = now.toDateString();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const leadsToday = leads.filter((lead: any) => {
      const leadDate = new Date(lead.created_at || lead.createdAt || lead.timestamp);
      return leadDate.toDateString() === today;
    }).length;

    const leadsWeek = leads.filter((lead: any) => {
      const leadDate = new Date(lead.created_at || lead.createdAt || lead.timestamp);
      return leadDate >= weekAgo;
    }).length;

    const leadsMonth = leads.filter((lead: any) => {
      const leadDate = new Date(lead.created_at || lead.createdAt || lead.timestamp);
      return leadDate >= monthAgo;
    }).length;

    setStats({
      today: leadsToday,
      week: leadsWeek,
      month: leadsMonth,
      total: leads.length
    });
  };

  if (loading) {
    return (
      <div className="mb-8 bg-gray-800/50 border border-gray-700 rounded-lg p-6">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-12 bg-gray-700 rounded"></div>
            <div className="grid grid-cols-4 gap-4">
              <div className="h-24 bg-gray-700 rounded"></div>
              <div className="h-24 bg-gray-700 rounded"></div>
              <div className="h-24 bg-gray-700 rounded"></div>
              <div className="h-24 bg-gray-700 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      {/* Header CRM */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/20 rounded-lg">
            <Users className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">CRM & Leads</h2>
            <p className="text-sm text-gray-400">Vue d'ensemble temps réel</p>
          </div>
        </div>
        <Link
          to="/backoffice/leads"
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold transition-all"
        >
          <span>Gérer tous les leads</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Leads Aujourd'hui */}
        <Link
          to="/backoffice/leads"
          className="group bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-2 border-green-500/30 rounded-xl p-6 hover:border-green-500/60 hover:shadow-xl hover:shadow-green-500/20 transition-all duration-300 hover:scale-105"
        >
          <div className="flex items-center justify-between mb-4">
            <Calendar className="w-8 h-8 text-green-400" />
            <span className="text-xs font-semibold text-green-400 bg-green-500/20 px-2 py-1 rounded">
              AUJOURD'HUI
            </span>
          </div>
          <div className="text-4xl font-bold text-green-400 mb-2">
            {stats.today}
          </div>
          <div className="text-sm font-semibold text-green-300">
            Nouveaux leads
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-green-400 opacity-0 group-hover:opacity-100 transition-opacity">
            <span>Voir détails</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </Link>

        {/* Leads Cette Semaine */}
        <Link
          to="/backoffice/leads"
          className="group bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-2 border-blue-500/30 rounded-xl p-6 hover:border-blue-500/60 hover:shadow-xl hover:shadow-blue-500/20 transition-all duration-300 hover:scale-105"
        >
          <div className="flex items-center justify-between mb-4">
            <Activity className="w-8 h-8 text-blue-400" />
            <span className="text-xs font-semibold text-blue-400 bg-blue-500/20 px-2 py-1 rounded">
              7 JOURS
            </span>
          </div>
          <div className="text-4xl font-bold text-blue-400 mb-2">
            {stats.week}
          </div>
          <div className="text-sm font-semibold text-blue-300">
            Cette semaine
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
            <span>Voir détails</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </Link>

        {/* Leads Ce Mois */}
        <Link
          to="/backoffice/leads"
          className="group bg-gradient-to-br from-purple-500/10 to-fuchsia-500/10 border-2 border-purple-500/30 rounded-xl p-6 hover:border-purple-500/60 hover:shadow-xl hover:shadow-purple-500/20 transition-all duration-300 hover:scale-105"
        >
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="w-8 h-8 text-purple-400" />
            <span className="text-xs font-semibold text-purple-400 bg-purple-500/20 px-2 py-1 rounded">
              30 JOURS
            </span>
          </div>
          <div className="text-4xl font-bold text-purple-400 mb-2">
            {stats.month}
          </div>
          <div className="text-sm font-semibold text-purple-300">
            Ce mois-ci
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity">
            <span>Voir détails</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </Link>

        {/* Total Leads */}
        <Link
          to="/backoffice/leads"
          className="group bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-2 border-amber-500/30 rounded-xl p-6 hover:border-amber-500/60 hover:shadow-xl hover:shadow-amber-500/20 transition-all duration-300 hover:scale-105"
        >
          <div className="flex items-center justify-between mb-4">
            <Database className="w-8 h-8 text-amber-400" />
            <span className="text-xs font-semibold text-amber-400 bg-amber-500/20 px-2 py-1 rounded">
              TOTAL
            </span>
          </div>
          <div className="text-4xl font-bold text-amber-400 mb-2">
            {stats.total}
          </div>
          <div className="text-sm font-semibold text-amber-300">
            Tous les leads
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity">
            <span>Voir détails</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </Link>
      </div>
    </div>
  );
}
