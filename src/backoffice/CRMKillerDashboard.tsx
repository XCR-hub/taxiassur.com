import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, FileCheck, Shield, TrendingUp, Bot, AlertTriangle,
  CheckCircle, Euro, Zap, Target, Activity, DollarSign,
  ArrowRight, RefreshCw, Inbox, ChevronRight, Brain,
  ThumbsUp, ThumbsDown, Clock, Phone, Mail, MessageSquare,
  FileText, Calendar, BarChart3, PieChart, ArrowUpRight,
  ArrowDownRight, Sparkles, ClipboardList, Bell, Settings,
  UserPlus
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
  new_leads_week: number;
  conversion_rate: number;
  avg_deal_value: number;
  total_revenue: number;
  ready_for_quote: number;
  quote_pending: number;
  won_this_month: number;
  lost_this_month: number;
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
  current_stage_key?: string;
  city?: string;
}

interface AIDecision {
  id: string;
  lead_id: string;
  decision_type: string;
  confidence_score: number;
  recommendation?: string;
  decision_data?: any;
  created_at: string;
}

interface QuickAction {
  label: string;
  icon: React.ElementType;
  path: string;
  color: string;
  badge?: number;
}

const CRMKillerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

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
    new_leads_week: 0,
    conversion_rate: 0,
    avg_deal_value: 0,
    total_revenue: 0,
    ready_for_quote: 0,
    quote_pending: 0,
    won_this_month: 0,
    lost_this_month: 0
  });

  const [recentLeads, setRecentLeads] = useState<RecentLead[]>([]);
  const [recentAIDecisions, setRecentAIDecisions] = useState<AIDecision[]>([]);

  const loadDashboardData = useCallback(async () => {
    if (!loading) setRefreshing(true);

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

      const [leadsRes, aiDecisionsRes, unreadCount, criticalAlerts, quoteQueue] = await Promise.all([
        supabase.from('crm_leads').select('*').order('created_at', { ascending: false }),
        supabase.from('ai_decisions').select('*').order('created_at', { ascending: false }).limit(5),
        supabase.from('email_messages').select('id', { count: 'exact', head: true }).eq('is_read', false),
        supabase.from('crm_retention_alerts').select('id', { count: 'exact', head: true }).eq('alert_type', 'churn_risk'),
        supabase.from('ready_for_quote_queue').select('id', { count: 'exact', head: true }).eq('status', 'waiting')
      ]);

      const leads = leadsRes.data || [];
      const aiDecisions = aiDecisionsRes.data || [];

      // Clients actifs = contrats signés + clients avec assurance active
      const activeContracts = leads.filter(l =>
        l.status === 'won' ||
        l.status === 'ACTIVE_CLIENT' ||
        l.status === 'active_client' ||
        l.current_stage_key === 'active_client' ||
        (l.metadata && l.metadata.is_active_client === true)
      ).length;

      const pendingDocs = leads.filter(l => l.current_stage_key === 'document_collection').length;
      const pendingPayments = leads.filter(l => l.current_stage_key === 'payment_pending').length;
      const renewalOps = leads.filter(l => l.status === 'CROSS_SELLING').length;
      const quotePending = leads.filter(l => l.current_stage_key === 'quote_pending').length;

      const newToday = leads.filter(l => new Date(l.created_at) >= today).length;
      const newThisWeek = leads.filter(l => new Date(l.created_at) >= weekAgo).length;

      const wonThisMonth = leads.filter(l =>
        (l.status === 'won' || l.status === 'ACTIVE_CLIENT' || l.status === 'active_client' || l.current_stage_key === 'active_client') &&
        new Date(l.updated_at) >= monthStart
      ).length;
      const lostThisMonth = leads.filter(l =>
        l.status === 'lost' &&
        new Date(l.updated_at) >= monthStart
      ).length;

      const closedWon = activeContracts;
      const totalClosed = closedWon + leads.filter(l => l.status === 'lost').length;
      const conversionRate = totalClosed > 0 ? (closedWon / totalClosed) * 100 : 0;

      const avgValue = 1450;
      const totalRevenue = activeContracts * avgValue;

      setStats({
        total_leads: leads.length,
        active_contracts: activeContracts,
        pending_documents: pendingDocs,
        pending_payments: pendingPayments,
        unread_messages: unreadCount.count || 0,
        ai_decisions_pending: aiDecisions.filter(d => d.status === 'pending').length,
        at_risk_clients: criticalAlerts.count || 0,
        renewal_opportunities: renewalOps,
        new_leads_today: newToday,
        new_leads_week: newThisWeek,
        conversion_rate: Math.round(conversionRate),
        avg_deal_value: avgValue,
        total_revenue: totalRevenue,
        ready_for_quote: quoteQueue.count || 0,
        quote_pending: quotePending,
        won_this_month: wonThisMonth,
        lost_this_month: lostThisMonth
      });

      setRecentLeads(leads.slice(0, 6).map(l => ({
        id: l.id,
        email: l.email,
        phone: l.phone,
        first_name: l.first_name,
        last_name: l.last_name,
        status: l.status,
        created_at: l.created_at,
        lead_score: l.ai_qualification_score || l.lead_score,
        current_stage_key: l.current_stage_key,
        city: l.city
      })));

      setRecentAIDecisions(aiDecisions.slice(0, 4));
      setLastUpdated(new Date());

    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loading]);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const quickActions: QuickAction[] = [
    { label: 'Nouveau Lead', icon: UserPlus, path: '/backoffice/crm/create-lead', color: 'green' },
    { label: 'Pipeline', icon: BarChart3, path: '/backoffice/crm-killer/pipeline', color: 'blue' },
    { label: 'File Devis', icon: ClipboardList, path: '/backoffice/quote-queue', color: 'green', badge: stats.ready_for_quote },
    { label: 'Inbox', icon: Inbox, path: '/backoffice/crm-killer/inbox', color: 'purple', badge: stats.unread_messages },
    { label: 'Retention', icon: Shield, path: '/backoffice/crm-killer/retention', color: 'red' },
    { label: 'IA', icon: Brain, path: '/backoffice/crm-killer/ia', color: 'cyan' },
    { label: 'Templates', icon: FileText, path: '/backoffice/crm-killer/templates', color: 'amber' },
    { label: 'Parametres', icon: Settings, path: '/backoffice/crm-killer/settings', color: 'gray' },
  ];

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'new': 'bg-blue-100 text-blue-800',
      'qualified': 'bg-cyan-100 text-cyan-800',
      'contacted': 'bg-amber-100 text-amber-800',
      'negotiation': 'bg-purple-100 text-purple-800',
      'won': 'bg-green-100 text-green-800',
      'lost': 'bg-red-100 text-red-800',
      'ACTIVE_CLIENT': 'bg-emerald-100 text-emerald-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStageLabel = (stage: string) => {
    const labels: Record<string, string> = {
      'new_lead': 'Nouveau',
      'qualification': 'Qualification',
      'first_contact': 'Premier contact',
      'document_collection': 'Collecte docs',
      'dossier_complete': 'Dossier complet',
      'quote_pending': 'Devis en cours',
      'quote_sent': 'Devis envoye',
      'negotiation': 'Negociation',
      'contract_pending': 'Contrat',
      'signature_pending': 'Signature',
      'payment_pending': 'Paiement',
      'won': 'Gagne',
    };
    return labels[stage] || stage;
  };

  const approveDecision = async (decisionId: string) => {
    await supabase.from('ai_decisions').update({ status: 'approved' }).eq('id', decisionId);
    loadDashboardData();
  };

  const rejectDecision = async (decisionId: string) => {
    await supabase.from('ai_decisions').update({ status: 'rejected' }).eq('id', decisionId);
    loadDashboardData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 rounded-full"></div>
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin absolute top-0"></div>
          </div>
          <p className="text-gray-700 font-medium mt-4">Chargement du CRM...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-[1800px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            CRM Dashboard
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Derniere maj: {lastUpdated.toLocaleTimeString('fr-FR')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/backoffice/crm/create-lead')}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all shadow-lg shadow-blue-600/25"
          >
            <UserPlus className="w-5 h-5" />
            <span>Nouveau Lead</span>
          </button>
          <button
            onClick={() => navigate('/backoffice/quote-queue')}
            className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
              stats.ready_for_quote > 0
                ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/25'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <ClipboardList className="w-5 h-5" />
            <span>{stats.ready_for_quote} dossier(s) pret(s)</span>
          </button>
          <button
            onClick={loadDashboardData}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">Actualiser</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 md:grid-cols-8 gap-2 mb-6">
        {quickActions.map((action) => (
          <button
            key={action.label}
            onClick={() => navigate(action.path)}
            className={`relative flex flex-col items-center gap-1 p-3 rounded-xl border border-gray-200 bg-white hover:shadow-md transition-all group`}
          >
            <div className={`p-2 rounded-lg bg-${action.color}-100 group-hover:bg-${action.color}-200 transition-colors`}>
              <action.icon className={`w-5 h-5 text-${action.color}-600`} />
            </div>
            <span className="text-xs font-medium text-gray-700">{action.label}</span>
            {action.badge && action.badge > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {action.badge > 9 ? '9+' : action.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
        <button
          onClick={() => navigate('/backoffice/crm-killer/pipeline')}
          className="bg-white rounded-xl p-5 border border-gray-200 hover:shadow-lg transition-all cursor-pointer hover:border-blue-300 text-left"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-blue-100 rounded-lg">
              <Users className="text-blue-600 w-5 h-5" />
            </div>
            <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
              <ArrowUpRight className="w-4 h-4" />
              +{stats.new_leads_today}
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.total_leads}</div>
          <div className="text-sm text-gray-500">Total Leads</div>
        </button>

        <button
          onClick={() => navigate('/backoffice/crm-killer/pipeline?filter=active_clients')}
          className="bg-white rounded-xl p-5 border border-gray-200 hover:shadow-lg transition-all cursor-pointer hover:border-green-300 text-left"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-green-100 rounded-lg">
              <CheckCircle className="text-green-600 w-5 h-5" />
            </div>
            <div className="text-sm font-medium text-green-600">
              {stats.conversion_rate}%
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.active_contracts}</div>
          <div className="text-sm text-gray-500">Clients Actifs</div>
        </button>

        <button
          onClick={() => navigate('/backoffice/crm-killer/pipeline?filter=won')}
          className="bg-white rounded-xl p-5 border border-gray-200 hover:shadow-lg transition-all cursor-pointer hover:border-emerald-300 text-left"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-emerald-100 rounded-lg">
              <Euro className="text-emerald-600 w-5 h-5" />
            </div>
            <TrendingUp className="text-emerald-500 w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{(stats.total_revenue / 1000).toFixed(0)}k</div>
          <div className="text-sm text-gray-500">Revenu Total</div>
        </button>

        <button
          onClick={() => navigate('/backoffice/quote-queue')}
          className="bg-white rounded-xl p-5 border border-gray-200 hover:shadow-lg transition-all cursor-pointer hover:border-amber-300 text-left"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-amber-100 rounded-lg">
              <ClipboardList className="text-amber-600 w-5 h-5" />
            </div>
            {stats.quote_pending > 0 && (
              <span className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {stats.quote_pending}
              </span>
            )}
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.ready_for_quote}</div>
          <div className="text-sm text-gray-500">Pret pour Devis</div>
        </button>

        <button
          onClick={() => navigate('/backoffice/crm-killer/inbox')}
          className="bg-white rounded-xl p-5 border border-gray-200 hover:shadow-lg transition-all cursor-pointer hover:border-purple-300 text-left"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-purple-100 rounded-lg">
              <Inbox className="text-purple-600 w-5 h-5" />
            </div>
            {stats.unread_messages > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                {stats.unread_messages}
              </span>
            )}
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.unread_messages}</div>
          <div className="text-sm text-gray-500">Messages</div>
        </button>

        <button
          onClick={() => navigate('/backoffice/crm-killer/ia')}
          className="bg-white rounded-xl p-5 border border-gray-200 hover:shadow-lg transition-all cursor-pointer hover:border-cyan-300 text-left"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-cyan-100 rounded-lg">
              <Brain className="text-cyan-600 w-5 h-5" />
            </div>
            <Zap className="text-cyan-500 w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.ai_decisions_pending}</div>
          <div className="text-sm text-gray-500">Decisions IA</div>
        </button>
      </div>

      {(stats.pending_documents > 0 || stats.pending_payments > 0 || stats.at_risk_clients > 0 || stats.ready_for_quote > 0) && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="text-amber-600 w-5 h-5" />
            <h3 className="font-bold text-amber-900">Actions Prioritaires</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {stats.ready_for_quote > 0 && (
              <button
                onClick={() => navigate('/backoffice/quote-queue')}
                className="bg-white hover:bg-green-50 border-2 border-green-300 rounded-xl p-4 text-left transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <ClipboardList className="text-green-600 w-5 h-5" />
                  <span className="text-2xl font-bold text-green-700">{stats.ready_for_quote}</span>
                </div>
                <div className="text-sm font-medium text-green-800">Dossiers Prets</div>
                <div className="text-xs text-green-600 mt-1 flex items-center gap-1 group-hover:underline">
                  Creer les devis <ArrowRight className="w-3 h-3" />
                </div>
              </button>
            )}

            {stats.pending_documents > 0 && (
              <button
                onClick={() => navigate('/backoffice/pending-documents')}
                className="bg-white hover:bg-amber-50 border border-amber-200 rounded-xl p-4 text-left transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <FileCheck className="text-amber-600 w-5 h-5" />
                  <span className="text-2xl font-bold text-amber-700">{stats.pending_documents}</span>
                </div>
                <div className="text-sm font-medium text-amber-800">Documents en attente</div>
              </button>
            )}

            {stats.pending_payments > 0 && (
              <button
                onClick={() => navigate('/backoffice/crm-killer/retention')}
                className="bg-white hover:bg-orange-50 border border-orange-200 rounded-xl p-4 text-left transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <Euro className="text-orange-600 w-5 h-5" />
                  <span className="text-2xl font-bold text-orange-700">{stats.pending_payments}</span>
                </div>
                <div className="text-sm font-medium text-orange-800">Paiements en attente</div>
              </button>
            )}

            {stats.at_risk_clients > 0 && (
              <button
                onClick={() => navigate('/backoffice/crm-killer/retention')}
                className="bg-white hover:bg-red-50 border border-red-200 rounded-xl p-4 text-left transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <Shield className="text-red-600 w-5 h-5" />
                  <span className="text-2xl font-bold text-red-700">{stats.at_risk_clients}</span>
                </div>
                <div className="text-sm font-medium text-red-800">Clients a risque</div>
              </button>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Users className="text-blue-600 w-5 h-5" />
              Leads Recents
            </h3>
            <button
              onClick={() => navigate('/backoffice/crm-killer/pipeline')}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
            >
              Voir tout <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {recentLeads.length > 0 ? recentLeads.map(lead => (
              <button
                key={lead.id}
                onClick={() => navigate(`/backoffice/crm-killer/lead/${lead.id}`)}
                className="w-full p-4 hover:bg-gray-50 text-left transition-colors flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {(lead.first_name?.[0] || lead.email[0]).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-medium text-gray-900 truncate">
                      {lead.first_name} {lead.last_name}
                    </span>
                    {lead.lead_score && lead.lead_score > 70 && (
                      <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">
                        {lead.lead_score}%
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 truncate">{lead.email}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(lead.status)}`}>
                    {lead.current_stage_key ? getStageLabel(lead.current_stage_key) : lead.status}
                  </span>
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(lead.created_at).toLocaleDateString('fr-FR')}
                  </div>
                </div>
              </button>
            )) : (
              <div className="p-8 text-center text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Aucun lead recent</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Brain className="text-purple-600 w-5 h-5" />
              Decisions IA
            </h3>
            <button
              onClick={() => navigate('/backoffice/crm-killer/ia')}
              className="text-purple-600 hover:text-purple-800 text-sm font-medium flex items-center gap-1"
            >
              Voir tout <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4 space-y-3">
            {recentAIDecisions.length > 0 ? recentAIDecisions.map(decision => (
              <div key={decision.id} className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-100 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-purple-900">
                    {decision.decision_type?.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs bg-purple-200 text-purple-800 px-2 py-0.5 rounded-full font-medium">
                    {Math.round((decision.confidence_score || 0) * 100)}%
                  </span>
                </div>
                {decision.decision_data?.reason && (
                  <p className="text-xs text-purple-700 mb-3 line-clamp-2">
                    {decision.decision_data.reason}
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => approveDecision(decision.id)}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                    <ThumbsUp className="w-3 h-3" /> Approuver
                  </button>
                  <button
                    onClick={() => rejectDecision(decision.id)}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-medium px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                    <ThumbsDown className="w-3 h-3" /> Refuser
                  </button>
                </div>
              </div>
            )) : (
              <div className="text-center py-8 text-gray-500">
                <Brain className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">Aucune decision en attente</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-6 text-white">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Performance Ce Mois
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 rounded-lg p-4">
              <div className="text-3xl font-bold">{stats.won_this_month}</div>
              <div className="text-blue-200 text-sm">Contrats signes</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <div className="text-3xl font-bold">{stats.new_leads_week}</div>
              <div className="text-blue-200 text-sm">Nouveaux leads (7j)</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <div className="text-3xl font-bold">{stats.conversion_rate}%</div>
              <div className="text-blue-200 text-sm">Taux conversion</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <div className="text-3xl font-bold">{stats.avg_deal_value}e</div>
              <div className="text-blue-200 text-sm">Valeur moyenne</div>
            </div>
          </div>
        </div>

        {stats.renewal_opportunities > 0 && (
          <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl p-6 text-white">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Target className="w-5 h-5" />
              Opportunites Cross-Selling
            </h3>
            <div className="text-5xl font-bold mb-2">{stats.renewal_opportunities}</div>
            <p className="text-emerald-100 mb-4">Clients prets pour des offres additionnelles</p>
            <button
              onClick={() => navigate('/backoffice/crm-killer/retention')}
              className="bg-white text-emerald-700 font-bold px-6 py-3 rounded-lg hover:bg-emerald-50 transition-colors flex items-center gap-2"
            >
              Voir les opportunites <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {stats.renewal_opportunities === 0 && (
          <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl p-6">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-gray-800">
              <Zap className="w-5 h-5 text-amber-500" />
              Pipeline Autonome Actif
            </h3>
            <p className="text-gray-600 mb-4">
              Le systeme gere automatiquement les leads jusqu'au devis.
              Vous n'intervenez que pour creer les devis et emettre les contrats.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/backoffice/crm-killer/ia')}
                className="flex-1 bg-white text-gray-700 font-medium px-4 py-2.5 rounded-lg hover:bg-gray-50 transition-colors border border-gray-300"
              >
                Voir IA
              </button>
              <button
                onClick={() => navigate('/backoffice/automations')}
                className="flex-1 bg-amber-500 text-white font-medium px-4 py-2.5 rounded-lg hover:bg-amber-600 transition-colors"
              >
                Automations
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CRMKillerDashboard;
