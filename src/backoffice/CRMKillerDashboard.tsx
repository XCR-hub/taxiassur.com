import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  FileCheck,
  Shield,
  TrendingUp,
  Bot,
  AlertTriangle,
  CheckCircle,
  Euro,
  Zap,
  Target,
  Activity,
  DollarSign,
  ArrowRight,
  RefreshCw,
  Inbox,
  ChevronRight,
  Brain
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface DashboardStats {
  total_leads: number;
  active_contracts: number;
  pending_documents: number;
  pending_payments: number;
  unread_messages: number;
  ai_decisions_pending: number;
  at_risk_clients: number;
  renewal_opportunities: number;
  new_leads_today: number;
  conversion_rate: number;
  avg_deal_value: number;
  total_revenue: number;
}

interface RecentLead {
  id: string;
  email: string;
  phone: string;
  first_name?: string;
  last_name?: string;
  status: string;
  created_at: string;
  lead_score?: number;
}

const CRMKillerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [stats, setStats] = useState<DashboardStats>({
    total_leads: 0,
    active_contracts: 0,
    pending_documents: 0,
    pending_payments: 0,
    unread_messages: 0,
    ai_decisions_pending: 0,
    at_risk_clients: 0,
    renewal_opportunities: 0,
    new_leads_today: 0,
    conversion_rate: 0,
    avg_deal_value: 0,
    total_revenue: 0
  });

  const [recentLeads, setRecentLeads] = useState<RecentLead[]>([]);
  const [recentAIDecisions, setRecentAIDecisions] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();

    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    if (!loading) setRefreshing(true);

    try {
      const [leadsRes, aiDecisionsRes, unreadCount, criticalAlerts] = await Promise.all([
        supabase.from('crm_leads').select('*').order('created_at', { ascending: false }),
        supabase.from('ai_decisions').select('*').eq('status', 'pending').limit(5),
        supabase.from('channel_messages').select('id', { count: 'exact', head: true }).eq('is_read', false),
        supabase.from('crm_retention_alerts').select('id', { count: 'exact', head: true }).eq('alert_type', 'churn_risk')
      ]);

      const leads = leadsRes.data || [];
      const aiDecisions = aiDecisionsRes.data || [];

      const activeContracts = leads.filter(l => l.status === 'ACTIVE_CLIENT').length;
      const pendingDocs = leads.filter(l => l.status === 'DOCUMENTS_REQUIRED').length;
      const pendingPayments = leads.filter(l => l.status === 'PAYMENT_PENDING').length;
      const renewalOps = leads.filter(l => l.status === 'CROSS_SELLING').length;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const newToday = leads.filter(l => new Date(l.created_at) >= today).length;

      const closedWon = leads.filter(l => l.status === 'ACTIVE_CLIENT').length;
      const conversionRate = leads.length > 0 ? (closedWon / leads.length) * 100 : 0;

      const avgValue = 1200;
      const totalRevenue = activeContracts * avgValue;

      setStats({
        total_leads: leads.length,
        active_contracts: activeContracts,
        pending_documents: pendingDocs,
        pending_payments: pendingPayments,
        unread_messages: unreadCount.count || 0,
        ai_decisions_pending: aiDecisions.length,
        at_risk_clients: criticalAlerts.count || 0,
        renewal_opportunities: renewalOps,
        new_leads_today: newToday,
        conversion_rate: Math.round(conversionRate),
        avg_deal_value: avgValue,
        total_revenue: totalRevenue
      });

      setRecentLeads(leads.slice(0, 5).map(l => ({
        id: l.id,
        email: l.email,
        phone: l.phone,
        first_name: l.first_name,
        last_name: l.last_name,
        status: l.status,
        created_at: l.created_at,
        lead_score: l.lead_score
      })));

      setRecentAIDecisions(aiDecisions);

    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadDashboardData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="animate-spin mx-auto mb-4 text-blue-600" size={48} />
          <p className="text-gray-700 font-medium">Chargement du CRM...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
              {/* KPIs Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <Users className="text-blue-600" size={24} />
                    </div>
                    <TrendingUp className="text-green-500" size={20} />
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-1">{stats.total_leads}</div>
                  <div className="text-sm text-gray-600 mb-2">Total Leads</div>
                  <div className="text-xs text-green-600 font-medium">+{stats.new_leads_today} aujourd'hui</div>
                </div>

                <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-green-100 rounded-lg">
                      <CheckCircle className="text-green-600" size={24} />
                    </div>
                    <Activity className="text-green-500" size={20} />
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-1">{stats.active_contracts}</div>
                  <div className="text-sm text-gray-600 mb-2">Contrats Actifs</div>
                  <div className="text-xs text-gray-500">Taux: {stats.conversion_rate}%</div>
                </div>

                <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-orange-100 rounded-lg">
                      <Euro className="text-orange-600" size={24} />
                    </div>
                    <DollarSign className="text-orange-500" size={20} />
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-1">{stats.total_revenue.toLocaleString()}€</div>
                  <div className="text-sm text-gray-600 mb-2">Revenu Total</div>
                  <div className="text-xs text-gray-500">Moy: {stats.avg_deal_value}€</div>
                </div>

                <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <Inbox className="text-purple-600" size={24} />
                    </div>
                    {stats.unread_messages > 0 && (
                      <span className="bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                        {stats.unread_messages}
                      </span>
                    )}
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-1">{stats.unread_messages}</div>
                  <div className="text-sm text-gray-600 mb-2">Messages Non Lus</div>
                  <div className="text-xs text-gray-500">{stats.ai_decisions_pending} décisions IA</div>
                </div>
              </div>

              {/* Alertes */}
              {(stats.pending_documents > 0 || stats.pending_payments > 0 || stats.at_risk_clients > 0) && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 rounded-lg p-6 mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="text-yellow-600" size={24} />
                    <h3 className="text-lg font-bold text-yellow-900">Actions Requises</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {stats.pending_documents > 0 && (
                      <button
                        onClick={() => navigate('/backoffice/crm-killer/production')}
                        className="bg-white hover:bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left transition-all"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <FileCheck className="text-yellow-600" size={20} />
                          <span className="text-2xl font-bold text-yellow-900">{stats.pending_documents}</span>
                        </div>
                        <div className="text-sm font-medium text-yellow-900">Documents En Attente</div>
                      </button>
                    )}

                    {stats.pending_payments > 0 && (
                      <button
                        onClick={() => navigate('/backoffice/crm-killer/production')}
                        className="bg-white hover:bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left transition-all"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Euro className="text-yellow-600" size={20} />
                          <span className="text-2xl font-bold text-yellow-900">{stats.pending_payments}</span>
                        </div>
                        <div className="text-sm font-medium text-yellow-900">Paiements En Attente</div>
                      </button>
                    )}

                    {stats.at_risk_clients > 0 && (
                      <button
                        onClick={() => navigate('/backoffice/crm-killer/retention')}
                        className="bg-white hover:bg-red-50 border border-red-200 rounded-lg p-4 text-left transition-all"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Shield className="text-red-600" size={20} />
                          <span className="text-2xl font-bold text-red-900">{stats.at_risk_clients}</span>
                        </div>
                        <div className="text-sm font-medium text-red-900">Clients à Risque</div>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Leads Récents & Décisions IA */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Leads Récents */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Users className="text-blue-600" size={20} />
                        Leads Récents
                      </h3>
                      <button
                        onClick={() => navigate('/backoffice/crm-killer/pipeline')}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                      >
                        Voir tout
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="p-4 space-y-2">
                    {recentLeads.length > 0 ? recentLeads.map(lead => (
                      <button
                        key={lead.id}
                        onClick={() => navigate(`/backoffice/crm-killer/lead/${lead.id}`)}
                        className="w-full bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-lg p-4 text-left transition-all"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium text-gray-900">
                            {lead.first_name} {lead.last_name}
                          </div>
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-medium">
                            {lead.status}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">{lead.email}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(lead.created_at).toLocaleString('fr-FR')}
                        </div>
                      </button>
                    )) : (
                      <div className="text-center text-gray-500 py-8">
                        Aucun lead récent
                      </div>
                    )}
                  </div>
                </div>

                {/* Décisions IA */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Brain className="text-purple-600" size={20} />
                        Décisions IA
                      </h3>
                      <button
                        onClick={() => navigate('/backoffice/crm-killer/ia')}
                        className="text-purple-600 hover:text-purple-800 text-sm font-medium flex items-center gap-1"
                      >
                        Voir tout
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    {recentAIDecisions.length > 0 ? recentAIDecisions.map(decision => (
                      <div
                        key={decision.id}
                        className="bg-purple-50 border border-purple-200 rounded-lg p-4"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium text-purple-900">
                            {decision.decision_type}
                          </div>
                          <span className="text-xs bg-purple-200 text-purple-800 px-2 py-1 rounded font-medium">
                            {decision.confidence}%
                          </span>
                        </div>
                        <div className="text-sm text-purple-700 mb-3">{decision.recommendation}</div>
                        <div className="flex gap-2">
                          <button className="flex-1 bg-green-500 hover:bg-green-600 text-white text-sm font-medium px-3 py-2 rounded transition-colors flex items-center justify-center gap-1">
                            <ThumbsUp size={14} />
                            Approuver
                          </button>
                          <button className="flex-1 bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-3 py-2 rounded transition-colors flex items-center justify-center gap-1">
                            <ThumbsDown size={14} />
                            Refuser
                          </button>
                        </div>
                      </div>
                    )) : (
                      <div className="text-center text-gray-500 py-8">
                        Aucune décision en attente
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Opportunités */}
              {stats.renewal_opportunities > 0 && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-green-900 mb-2 flex items-center gap-2">
                        <Target className="text-green-600" size={24} />
                        Opportunités de Cross-Selling
                      </h3>
                      <div className="text-3xl font-bold text-green-900 mb-1">{stats.renewal_opportunities}</div>
                      <div className="text-sm text-green-700">Clients prêts pour des offres additionnelles</div>
                    </div>
                    <button
                      onClick={() => navigate('/backoffice/crm-killer/retention')}
                      className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-3 rounded-lg transition-colors flex items-center gap-2"
                    >
                      Voir les opportunités
                      <ArrowRight size={18} />
                    </button>
                  </div>
                </div>
              )}
    </div>
  );
};

export default CRMKillerDashboard;
