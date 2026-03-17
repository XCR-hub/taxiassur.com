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
        l.status === 'CLIENT_ACTIF' ||  // Statut en français
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
        (l.status === 'won' || l.status === 'ACTIVE_CLIENT' || l.status === 'active_client' || l.status === 'CLIENT_ACTIF' || l.current_stage_key === 'active_client') &&
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
          <div className="relative w-16 h-16 mx-auto">
            <div className="w-16 h-16 border-4 border-yellow-100 rounded-full"></div>
            <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin absolute top-0"></div>
          </div>
          <p className="text-gray-600 font-medium mt-4">Chargement du CRM...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 md:p-7 max-w-[1800px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-7 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-md">
              <Sparkles className="w-6 h-6 text-black" />
            </div>
            CRM Dashboard
          </h1>
          <p className="text-gray-400 mt-1 text-sm">
            Derniere maj : {lastUpdated.toLocaleTimeString('fr-FR')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/backoffice/crm/create-lead')}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black rounded-xl font-semibold transition-all shadow-md shadow-yellow-500/25"
          >
            <UserPlus className="w-4 h-4" />
            <span>Nouveau Lead</span>
          </button>
          <button
            onClick={() => navigate('/backoffice/quote-queue')}
            className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all text-sm ${
              stats.ready_for_quote > 0
                ? 'bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-600/25'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>{stats.ready_for_quote} dossier(s) pret(s)</span>
          </button>
          <button
            onClick={loadDashboardData}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all text-sm text-gray-600"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">Actualiser</span>
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-4 md:grid-cols-8 gap-2 mb-6">
        {quickActions.map((action) => (
          <button
            key={action.label}
            onClick={() => navigate(action.path)}
            className="relative flex flex-col items-center gap-1.5 p-3 rounded-xl border border-gray-200 bg-white hover:border-yellow-400 hover:shadow-md transition-all group"
          >
            <div className="p-2 rounded-lg bg-gray-100 group-hover:bg-yellow-50 transition-colors">
              <action.icon className="w-4 h-4 text-gray-700 group-hover:text-yellow-700" />
            </div>
            <span className="text-xs font-medium text-gray-600 group-hover:text-gray-900">{action.label}</span>
            {action.badge && action.badge > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
                {action.badge > 9 ? '9+' : action.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
        <button
          onClick={() => navigate('/backoffice/crm-killer/pipeline')}
          className="bg-white rounded-2xl p-5 border border-gray-200 hover:shadow-lg hover:border-yellow-300 transition-all text-left group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-gray-100 rounded-xl group-hover:bg-yellow-50 transition-colors">
              <Users className="text-gray-700 group-hover:text-yellow-700 w-5 h-5" />
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
          className="bg-white rounded-2xl p-5 border border-gray-200 hover:shadow-lg hover:border-green-300 transition-all text-left group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-green-50 rounded-xl">
              <CheckCircle className="text-green-600 w-5 h-5" />
            </div>
            <div className="text-sm font-semibold text-green-600">
              {stats.conversion_rate}%
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.active_contracts}</div>
          <div className="text-sm text-gray-500">Clients Actifs</div>
        </button>

        <button
          onClick={() => navigate('/backoffice/crm-killer/pipeline?filter=won')}
          className="bg-white rounded-2xl p-5 border border-gray-200 hover:shadow-lg hover:border-emerald-300 transition-all text-left group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-emerald-50 rounded-xl">
              <Euro className="text-emerald-600 w-5 h-5" />
            </div>
            <TrendingUp className="text-emerald-500 w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{(stats.total_revenue / 1000).toFixed(0)}k€</div>
          <div className="text-sm text-gray-500">Revenu Total</div>
        </button>

        <button
          onClick={() => navigate('/backoffice/quote-queue')}
          className="bg-white rounded-2xl p-5 border border-gray-200 hover:shadow-lg hover:border-yellow-300 transition-all text-left group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-yellow-50 rounded-xl">
              <ClipboardList className="text-yellow-600 w-5 h-5" />
            </div>
            {stats.quote_pending > 0 && (
              <span className="bg-yellow-500 text-black text-xs font-bold px-2 py-0.5 rounded-full">
                {stats.quote_pending}
              </span>
            )}
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.ready_for_quote}</div>
          <div className="text-sm text-gray-500">Pret pour Devis</div>
        </button>

        <button
          onClick={() => navigate('/backoffice/crm-killer/inbox')}
          className="bg-white rounded-2xl p-5 border border-gray-200 hover:shadow-lg hover:border-gray-400 transition-all text-left group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-gray-100 rounded-xl">
              <Inbox className="text-gray-700 w-5 h-5" />
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
          className="bg-white rounded-2xl p-5 border border-gray-200 hover:shadow-lg hover:border-gray-400 transition-all text-left group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-gray-100 rounded-xl">
              <Brain className="text-gray-700 w-5 h-5" />
            </div>
            <Zap className="text-yellow-500 w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.ai_decisions_pending}</div>
          <div className="text-sm text-gray-500">Decisions IA</div>
        </button>
      </div>

      {/* Priority Actions */}
      {(stats.pending_documents > 0 || stats.pending_payments > 0 || stats.at_risk_clients > 0 || stats.ready_for_quote > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6">
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
                <div className="text-sm font-semibold text-green-800">Dossiers Prets</div>
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
                <div className="text-sm font-semibold text-amber-800">Documents en attente</div>
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
                <div className="text-sm font-semibold text-orange-800">Paiements en attente</div>
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
                <div className="text-sm font-semibold text-red-800">Clients a risque</div>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Leads + AI Decisions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Users className="text-gray-700 w-5 h-5" />
              Leads Recents
            </h3>
            <button
              onClick={() => navigate('/backoffice/crm-killer/pipeline')}
              className="text-yellow-600 hover:text-yellow-800 text-sm font-semibold flex items-center gap-1"
            >
              Voir tout <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {recentLeads.length > 0 ? recentLeads.map(lead => (
              <button
                key={lead.id}
                onClick={() => navigate(`/backoffice/crm-killer/lead/${lead.id}`)}
                className="w-full px-5 py-3.5 hover:bg-gray-50 text-left transition-colors flex items-center gap-4 group"
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center text-black font-bold text-sm flex-shrink-0">
                  {(lead.first_name?.[0] || lead.email[0]).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-gray-900 truncate text-sm">
                      {lead.first_name} {lead.last_name}
                    </span>
                    {lead.lead_score && lead.lead_score > 70 && (
                      <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">
                        {lead.lead_score}%
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 truncate">{lead.email}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusColor(lead.status)}`}>
                    {lead.current_stage_key ? getStageLabel(lead.current_stage_key) : lead.status}
                  </span>
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(lead.created_at).toLocaleDateString('fr-FR')}
                  </div>
                </div>
              </button>
            )) : (
              <div className="p-10 text-center text-gray-400">
                <Users className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                <p className="text-sm">Aucun lead recent</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Brain className="text-gray-700 w-5 h-5" />
              Decisions IA
            </h3>
            <button
              onClick={() => navigate('/backoffice/crm-killer/ia')}
              className="text-yellow-600 hover:text-yellow-800 text-sm font-semibold flex items-center gap-1"
            >
              Voir tout <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4 space-y-3">
            {recentAIDecisions.length > 0 ? recentAIDecisions.map(decision => (
              <div key={decision.id} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-900">
                    {decision.decision_type?.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-semibold">
                    {Math.round((decision.confidence_score || 0) * 100)}%
                  </span>
                </div>
                {decision.decision_data?.reason && (
                  <p className="text-xs text-gray-500 mb-3 line-clamp-2">
                    {decision.decision_data.reason}
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => approveDecision(decision.id)}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                    <ThumbsUp className="w-3 h-3" /> Approuver
                  </button>
                  <button
                    onClick={() => rejectDecision(decision.id)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                    <ThumbsDown className="w-3 h-3" /> Refuser
                  </button>
                </div>
              </div>
            )) : (
              <div className="text-center py-10 text-gray-400">
                <Brain className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                <p className="text-sm">Aucune decision en attente</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Performance & Pipeline */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-black rounded-2xl p-6 text-white">
          <h3 className="font-bold text-lg mb-5 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-yellow-400" />
            Performance Ce Mois
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="text-3xl font-bold text-yellow-400">{stats.won_this_month}</div>
              <div className="text-gray-400 text-sm mt-1">Contrats signes</div>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="text-3xl font-bold text-white">{stats.new_leads_week}</div>
              <div className="text-gray-400 text-sm mt-1">Nouveaux leads (7j)</div>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="text-3xl font-bold text-green-400">{stats.conversion_rate}%</div>
              <div className="text-gray-400 text-sm mt-1">Taux conversion</div>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="text-3xl font-bold text-white">{stats.avg_deal_value}€</div>
              <div className="text-gray-400 text-sm mt-1">Valeur moyenne</div>
            </div>
          </div>
        </div>

        {stats.renewal_opportunities > 0 ? (
          <div className="bg-gradient-to-br from-green-600 to-emerald-700 rounded-2xl p-6 text-white">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Target className="w-5 h-5" />
              Opportunites Cross-Selling
            </h3>
            <div className="text-5xl font-bold mb-2">{stats.renewal_opportunities}</div>
            <p className="text-green-100 mb-5 text-sm">Clients prets pour des offres additionnelles</p>
            <button
              onClick={() => navigate('/backoffice/crm-killer/retention')}
              className="bg-white text-emerald-700 font-bold px-5 py-2.5 rounded-xl hover:bg-emerald-50 transition-colors flex items-center gap-2 text-sm"
            >
              Voir les opportunites <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <h3 className="font-bold text-lg mb-3 flex items-center gap-2 text-gray-900">
              <Zap className="w-5 h-5 text-yellow-500" />
              Pipeline Autonome Actif
            </h3>
            <p className="text-gray-500 mb-5 text-sm leading-relaxed">
              Le systeme gere automatiquement les leads jusqu'au devis.
              Vous n'intervenez que pour creer les devis et emettre les contrats.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/backoffice/crm-killer/ia')}
                className="flex-1 bg-gray-100 text-gray-700 font-medium px-4 py-2.5 rounded-xl hover:bg-gray-200 transition-colors text-sm border border-gray-200"
              >
                Voir IA
              </button>
              <button
                onClick={() => navigate('/backoffice/automations')}
                className="flex-1 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-semibold px-4 py-2.5 rounded-xl hover:from-yellow-600 hover:to-yellow-700 transition-colors text-sm shadow-md"
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
