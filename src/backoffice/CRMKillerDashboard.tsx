import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, FileCheck, Shield, TrendingUp, Bot, AlertTriangle,
  CheckCircle, Euro, Zap, Target, Activity, DollarSign,
  ArrowRight, RefreshCw, Inbox, ChevronRight, Brain,
  ThumbsUp, ThumbsDown, Clock, Phone, Mail, MessageSquare,
  FileText, Calendar, BarChart3, PieChart, ArrowUpRight,
  ArrowDownRight, Sparkles, ClipboardList, Bell, Settings,
  UserPlus, Search, Star
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
  iconColor: string;
  iconBg: string;
  badge?: number;
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  'new':          { label: 'Nouveau',     color: '#2563eb', bg: '#eff6ff' },
  'nouveau_lead': { label: 'Nouveau',     color: '#2563eb', bg: '#eff6ff' },
  'qualified':    { label: 'Qualifié',    color: '#0891b2', bg: '#ecfeff' },
  'contacted':    { label: 'Contacté',    color: '#d97706', bg: '#fffbeb' },
  'won':          { label: 'Gagné',       color: '#16a34a', bg: '#f0fdf4' },
  'CLIENT_ACTIF': { label: 'Client Actif', color: '#16a34a', bg: '#f0fdf4' },
  'ACTIVE_CLIENT':{ label: 'Client Actif', color: '#16a34a', bg: '#f0fdf4' },
  'lost':         { label: 'Perdu',       color: '#6b7280', bg: '#f9fafb' },
  'PERDU':        { label: 'Perdu',       color: '#6b7280', bg: '#f9fafb' },
};

const STAGE_LABELS: Record<string, string> = {
  'nouveau_lead':              'Nouveau Lead',
  'collecte_documents':        'Collecte docs',
  'saisie_devis':              'Saisie devis',
  'validation_devis_prospect': 'Validation devis',
  'signature_devis':           'Signature devis',
  'paiement_rib':              'Paiement RIB',
  'contrat_signature':         'Contrat final',
  'document_collection':       'Collecte docs',
  'quote_pending':             'Devis en cours',
  'quote_sent':                'Devis envoyé',
};

const AVATAR_GRADIENTS = [
  'from-yellow-400 to-amber-500',
  'from-sky-400 to-blue-500',
  'from-emerald-400 to-green-500',
  'from-rose-400 to-pink-500',
  'from-violet-400 to-purple-500',
  'from-orange-400 to-amber-500',
];

const CRMKillerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const [stats, setStats] = useState<DashboardStats>({
    total_leads: 0, active_contracts: 0, pending_documents: 0, pending_payments: 0,
    unread_messages: 0, ai_decisions_pending: 0, at_risk_clients: 0, renewal_opportunities: 0,
    new_leads_today: 0, new_leads_week: 0, conversion_rate: 0, avg_deal_value: 0,
    total_revenue: 0, ready_for_quote: 0, quote_pending: 0, won_this_month: 0, lost_this_month: 0,
  });

  const [recentLeads, setRecentLeads] = useState<RecentLead[]>([]);
  const [recentAIDecisions, setRecentAIDecisions] = useState<AIDecision[]>([]);

  const loadDashboardData = useCallback(async () => {
    if (!loading) setRefreshing(true);
    try {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

      const [leadsRes, aiDecisionsRes, unreadCount, criticalAlerts, quoteQueue] = await Promise.all([
        supabase.from('crm_leads').select('*').order('created_at', { ascending: false }),
        supabase.from('ai_decisions').select('*').order('created_at', { ascending: false }).limit(5),
        supabase.from('email_messages').select('id', { count: 'exact', head: true }).eq('is_read', false),
        supabase.from('crm_retention_alerts').select('id', { count: 'exact', head: true }).eq('alert_type', 'churn_risk'),
        supabase.from('ready_for_quote_queue').select('id', { count: 'exact', head: true }).eq('status', 'waiting'),
      ]);

      const leads = leadsRes.data || [];
      const aiDecisions = aiDecisionsRes.data || [];

      const activeContracts = leads.filter(l =>
        ['won', 'ACTIVE_CLIENT', 'active_client', 'CLIENT_ACTIF'].includes(l.status) ||
        l.current_stage_key === 'active_client' ||
        (l.metadata && l.metadata.is_active_client === true)
      ).length;

      const newToday = leads.filter(l => new Date(l.created_at) >= today).length;
      const newThisWeek = leads.filter(l => new Date(l.created_at) >= weekAgo).length;
      const wonThisMonth = leads.filter(l =>
        ['won', 'ACTIVE_CLIENT', 'active_client', 'CLIENT_ACTIF'].includes(l.status) &&
        new Date(l.updated_at) >= monthStart
      ).length;
      const lostThisMonth = leads.filter(l => l.status === 'lost' && new Date(l.updated_at) >= monthStart).length;
      const totalClosed = activeContracts + leads.filter(l => l.status === 'lost').length;
      const conversionRate = totalClosed > 0 ? (activeContracts / totalClosed) * 100 : 0;
      const avgValue = 1450;

      setStats({
        total_leads: leads.length, active_contracts: activeContracts,
        pending_documents: leads.filter(l => l.current_stage_key === 'document_collection').length,
        pending_payments: leads.filter(l => l.current_stage_key === 'payment_pending').length,
        unread_messages: unreadCount.count || 0,
        ai_decisions_pending: aiDecisions.filter(d => d.status === 'pending').length,
        at_risk_clients: criticalAlerts.count || 0,
        renewal_opportunities: leads.filter(l => l.status === 'CROSS_SELLING').length,
        new_leads_today: newToday, new_leads_week: newThisWeek,
        conversion_rate: Math.round(conversionRate), avg_deal_value: avgValue,
        total_revenue: activeContracts * avgValue,
        ready_for_quote: quoteQueue.count || 0,
        quote_pending: leads.filter(l => l.current_stage_key === 'quote_pending').length,
        won_this_month: wonThisMonth, lost_this_month: lostThisMonth,
      });

      setRecentLeads(leads.slice(0, 6).map(l => ({
        id: l.id, email: l.email, phone: l.phone,
        first_name: l.first_name, last_name: l.last_name,
        status: l.status, created_at: l.created_at,
        lead_score: l.ai_qualification_score || l.lead_score,
        current_stage_key: l.current_stage_key, city: l.city,
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
    { label: 'Nouveau Lead',  icon: UserPlus,      path: '/backoffice/crm/create-lead',      iconColor: '#16a34a', iconBg: '#f0fdf4' },
    { label: 'Pipeline',      icon: BarChart3,      path: '/backoffice/crm-killer/pipeline',  iconColor: '#2563eb', iconBg: '#eff6ff' },
    { label: 'File Devis',    icon: ClipboardList,  path: '/backoffice/quote-queue',          iconColor: '#16a34a', iconBg: '#f0fdf4',  badge: stats.ready_for_quote },
    { label: 'Inbox',         icon: Inbox,          path: '/backoffice/crm-killer/inbox',     iconColor: '#7c3aed', iconBg: '#f5f3ff',  badge: stats.unread_messages },
    { label: 'Sinistres',     icon: AlertTriangle,  path: '/backoffice/claims',               iconColor: '#ea580c', iconBg: '#fff7ed' },
    { label: 'SEO #1',        icon: Search,         path: '/backoffice/gsc-autonomous',       iconColor: '#0891b2', iconBg: '#ecfeff' },
    { label: 'Retention',     icon: Shield,         path: '/backoffice/crm-killer/retention', iconColor: '#dc2626', iconBg: '#fef2f2' },
    { label: 'IA',            icon: Brain,          path: '/backoffice/crm-killer/ia',        iconColor: '#0891b2', iconBg: '#ecfeff' },
    { label: 'Templates',     icon: FileText,       path: '/backoffice/crm-killer/templates', iconColor: '#d97706', iconBg: '#fffbeb' },
    { label: 'Parametres',    icon: Settings,       path: '/backoffice/crm-killer/settings',  iconColor: '#6b7280', iconBg: '#f9fafb' },
  ];

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
      <div className="min-h-screen bg-[#f0f2f5] flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-14 h-14 mx-auto mb-4">
            <div className="w-14 h-14 border-4 border-yellow-100 rounded-full" />
            <div className="w-14 h-14 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin absolute top-0" />
          </div>
          <p className="text-gray-500 font-medium text-sm">Chargement du CRM...</p>
        </div>
      </div>
    );
  }

  const hasPriorityAlerts = stats.pending_documents > 0 || stats.pending_payments > 0 || stats.at_risk_clients > 0 || stats.ready_for_quote > 0;

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      <div className="max-w-[1700px] mx-auto p-5 md:p-6 space-y-4">

        {/* ─── HEADER ──────────────────────────────────────────────── */}
        <div
          className="rounded-2xl px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl border border-black/10 relative overflow-hidden"
          style={{ background: 'linear-gradient(145deg, #111318 0%, #161b22 60%, #111318 100%)' }}
        >
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-500" />
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-xl shadow-md shadow-yellow-900/30">
                <Sparkles className="w-5 h-5 text-black" />
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight">CRM Dashboard</h1>
            </div>
            <p className="text-gray-500 text-xs ml-11">
              Dernière mise à jour : <span className="text-gray-400 font-medium">{lastUpdated.toLocaleTimeString('fr-FR')}</span>
            </p>
          </div>
          <div className="flex items-center gap-2.5 ml-11 md:ml-0">
            <button
              onClick={() => navigate('/backoffice/crm/create-lead')}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-yellow-400 to-amber-500 text-black rounded-xl font-bold text-sm transition-all hover:from-yellow-300 hover:to-amber-400 shadow-md shadow-yellow-900/30"
            >
              <UserPlus className="w-4 h-4" />
              Nouveau Lead
            </button>
            <button
              onClick={() => navigate('/backoffice/quote-queue')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition-all text-sm border ${
                stats.ready_for_quote > 0
                  ? 'bg-green-500/15 border-green-500/40 text-green-400 hover:bg-green-500/25'
                  : 'bg-white/[0.06] border-white/[0.12] text-gray-400 hover:bg-white/10 hover:text-gray-200'
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              {stats.ready_for_quote} dossier{stats.ready_for_quote !== 1 ? 's' : ''} prêt{stats.ready_for_quote !== 1 ? 's' : ''}
            </button>
            <button
              onClick={loadDashboardData}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-2.5 bg-white/[0.06] border border-white/[0.12] text-gray-400 hover:text-gray-200 hover:bg-white/10 rounded-xl transition-all text-sm"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline">Actualiser</span>
            </button>
          </div>
        </div>

        {/* ─── QUICK ACTIONS ───────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
          <div className="grid grid-cols-5 md:grid-cols-10 gap-1.5">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => navigate(action.path)}
                className="relative flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-50 transition-all group"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-all group-hover:scale-110 shadow-sm border border-black/[0.04]"
                  style={{ background: action.iconBg }}
                >
                  <action.icon size={17} style={{ color: action.iconColor }} />
                </div>
                <span className="text-[11px] font-medium text-gray-600 group-hover:text-gray-900 text-center leading-tight">{action.label}</span>
                {action.badge !== undefined && action.badge > 0 && (
                  <span className="absolute -top-0.5 right-1.5 bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center shadow-sm">
                    {action.badge > 9 ? '9+' : action.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ─── KPI STATS ───────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            {
              label: 'Total Leads', value: stats.total_leads, sub: `${stats.new_leads_week} cette semaine`,
              icon: Users, iconColor: '#d97706', iconBg: '#fffbeb',
              accent: 'from-yellow-400 to-amber-400',
              badge: stats.new_leads_today > 0 ? { text: `+${stats.new_leads_today}`, color: 'text-green-500' } : null,
              path: '/backoffice/crm-killer/pipeline',
            },
            {
              label: 'Clients Actifs', value: stats.active_contracts, sub: `${stats.won_this_month} ce mois`,
              icon: CheckCircle, iconColor: '#16a34a', iconBg: '#f0fdf4',
              accent: 'from-green-400 to-emerald-400',
              badge: { text: `${stats.conversion_rate}%`, color: 'text-green-600' },
              path: '/backoffice/crm-killer/pipeline?filter=active_clients',
            },
            {
              label: 'Revenu Total', value: `${(stats.total_revenue / 1000).toFixed(0)}k€`, sub: `${stats.avg_deal_value}€ / contrat`,
              icon: Euro, iconColor: '#059669', iconBg: '#ecfdf5',
              accent: 'from-emerald-400 to-teal-400',
              badge: null,
              path: '/backoffice/crm-killer/pipeline?filter=won',
            },
            {
              label: 'Prêt pour Devis', value: stats.ready_for_quote, sub: 'À traiter maintenant',
              icon: ClipboardList, iconColor: '#d97706', iconBg: '#fffbeb',
              accent: 'from-amber-400 to-yellow-400',
              badge: stats.quote_pending > 0 ? { text: `${stats.quote_pending} en cours`, color: 'text-amber-600' } : null,
              path: '/backoffice/quote-queue',
            },
            {
              label: 'Messages', value: stats.unread_messages, sub: 'Non lus',
              icon: Inbox, iconColor: '#7c3aed', iconBg: '#f5f3ff',
              accent: 'from-violet-400 to-purple-400',
              badge: stats.unread_messages > 0 ? { text: 'Urgent', color: 'text-red-500' } : null,
              path: '/backoffice/crm-killer/inbox',
            },
            {
              label: 'Décisions IA', value: stats.ai_decisions_pending, sub: 'En attente',
              icon: Brain, iconColor: '#0891b2', iconBg: '#ecfeff',
              accent: 'from-sky-400 to-cyan-400',
              badge: null,
              path: '/backoffice/crm-killer/ia',
            },
          ].map((card) => (
            <button
              key={card.label}
              onClick={() => navigate(card.path)}
              className="bg-white rounded-2xl p-5 border border-gray-200 hover:shadow-md transition-all text-left group relative overflow-hidden"
            >
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${card.accent} rounded-t-2xl`} />
              <div className="flex items-center justify-between mb-3 mt-1">
                <div className="p-2 rounded-xl border border-black/[0.04]" style={{ background: card.iconBg }}>
                  <card.icon size={16} style={{ color: card.iconColor }} />
                </div>
                {card.badge && (
                  <span className={`text-xs font-bold ${card.badge.color}`}>{card.badge.text}</span>
                )}
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-0.5 group-hover:text-gray-800">{card.value}</div>
              <div className="text-xs text-gray-500 font-medium">{card.label}</div>
              <div className="text-[10px] text-gray-400 mt-0.5">{card.sub}</div>
            </button>
          ))}
        </div>

        {/* ─── PRIORITY ALERTS ─────────────────────────────────────── */}
        {hasPriorityAlerts && (
          <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
              <div className="p-1.5 bg-amber-100 rounded-lg">
                <AlertTriangle className="text-amber-600 w-4 h-4" />
              </div>
              <h3 className="font-bold text-amber-900 text-sm">Actions Prioritaires</h3>
              <span className="ml-auto text-xs text-amber-600 font-semibold">
                {[stats.ready_for_quote > 0, stats.pending_documents > 0, stats.pending_payments > 0, stats.at_risk_clients > 0].filter(Boolean).length} alerte(s)
              </span>
            </div>
            <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              {stats.ready_for_quote > 0 && (
                <button onClick={() => navigate('/backoffice/quote-queue')}
                  className="group flex items-start gap-3 p-4 rounded-xl border-2 border-green-200 bg-green-50 hover:bg-green-100 hover:border-green-300 transition-all text-left"
                >
                  <div className="p-2 bg-white rounded-lg shadow-sm flex-shrink-0">
                    <ClipboardList className="text-green-600 w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-700 leading-none mb-1">{stats.ready_for_quote}</div>
                    <div className="text-xs font-bold text-green-800">Dossiers prêts</div>
                    <div className="text-[10px] text-green-600 mt-1 flex items-center gap-0.5 group-hover:underline">Créer les devis <ArrowRight className="w-3 h-3" /></div>
                  </div>
                </button>
              )}
              {stats.pending_documents > 0 && (
                <button onClick={() => navigate('/backoffice/pending-documents')}
                  className="group flex items-start gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 transition-all text-left"
                >
                  <div className="p-2 bg-white rounded-lg shadow-sm flex-shrink-0">
                    <FileCheck className="text-amber-600 w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-amber-700 leading-none mb-1">{stats.pending_documents}</div>
                    <div className="text-xs font-bold text-amber-800">Docs en attente</div>
                  </div>
                </button>
              )}
              {stats.pending_payments > 0 && (
                <button onClick={() => navigate('/backoffice/crm-killer/retention')}
                  className="group flex items-start gap-3 p-4 rounded-xl border border-orange-200 bg-orange-50 hover:bg-orange-100 transition-all text-left"
                >
                  <div className="p-2 bg-white rounded-lg shadow-sm flex-shrink-0">
                    <Euro className="text-orange-600 w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-orange-700 leading-none mb-1">{stats.pending_payments}</div>
                    <div className="text-xs font-bold text-orange-800">Paiements en attente</div>
                  </div>
                </button>
              )}
              {stats.at_risk_clients > 0 && (
                <button onClick={() => navigate('/backoffice/crm-killer/retention')}
                  className="group flex items-start gap-3 p-4 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 transition-all text-left"
                >
                  <div className="p-2 bg-white rounded-lg shadow-sm flex-shrink-0">
                    <Shield className="text-red-600 w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-700 leading-none mb-1">{stats.at_risk_clients}</div>
                    <div className="text-xs font-bold text-red-800">Clients à risque</div>
                  </div>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ─── LEADS + AI DECISIONS ────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
                <div className="p-1.5 bg-yellow-50 rounded-lg border border-yellow-100">
                  <Users className="text-yellow-600 w-4 h-4" />
                </div>
                Leads Récents
              </h3>
              <button
                onClick={() => navigate('/backoffice/crm-killer/pipeline')}
                className="text-yellow-600 hover:text-yellow-800 text-xs font-bold flex items-center gap-1 transition-colors"
              >
                Voir tout <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="divide-y divide-gray-50">
              {recentLeads.length > 0 ? recentLeads.map((lead, idx) => {
                const statusInfo = STATUS_MAP[lead.status] || { label: lead.status, color: '#6b7280', bg: '#f9fafb' };
                const stageLabel = lead.current_stage_key ? (STAGE_LABELS[lead.current_stage_key] || lead.current_stage_key) : null;
                const displayName = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || lead.email;
                const initial = (lead.first_name?.[0] || lead.email[0]).toUpperCase();

                return (
                  <button
                    key={lead.id}
                    onClick={() => navigate(`/backoffice/crm-killer/lead/${lead.id}`)}
                    className="w-full px-5 py-3 hover:bg-gray-50/80 text-left transition-colors flex items-center gap-3.5 group"
                  >
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length]} flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm`}>
                      {initial}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-semibold text-gray-900 truncate text-sm group-hover:text-yellow-700 transition-colors">
                          {displayName}
                        </span>
                        {lead.lead_score && lead.lead_score > 70 && (
                          <span className="flex items-center gap-0.5 text-[10px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded-full font-bold border border-green-100">
                            <Star className="w-2.5 h-2.5" />{lead.lead_score}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 truncate">{lead.email}</div>
                    </div>
                    <div className="text-right flex-shrink-0 space-y-1">
                      <span
                        className="text-[10px] px-2.5 py-1 rounded-full font-semibold inline-block"
                        style={{ color: statusInfo.color, background: statusInfo.bg }}
                      >
                        {stageLabel || statusInfo.label}
                      </span>
                      <div className="text-[10px] text-gray-400">
                        {new Date(lead.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                      </div>
                    </div>
                  </button>
                );
              }) : (
                <div className="p-12 text-center">
                  <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Users className="w-7 h-7 text-gray-300" />
                  </div>
                  <p className="text-sm text-gray-400">Aucun lead récent</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm flex flex-col">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
                <div className="p-1.5 bg-sky-50 rounded-lg border border-sky-100">
                  <Brain className="text-sky-600 w-4 h-4" />
                </div>
                Décisions IA
              </h3>
              <button
                onClick={() => navigate('/backoffice/crm-killer/ia')}
                className="text-yellow-600 hover:text-yellow-800 text-xs font-bold flex items-center gap-1 transition-colors"
              >
                Voir tout <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex-1 p-4 space-y-3">
              {recentAIDecisions.length > 0 ? recentAIDecisions.map(decision => (
                <div key={decision.id} className="rounded-xl border border-gray-100 bg-gray-50/70 p-3.5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-800 leading-tight">
                      {decision.decision_type?.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[10px] bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full font-bold border border-yellow-100">
                      {Math.round((decision.confidence_score || 0) * 100)}%
                    </span>
                  </div>
                  {decision.decision_data?.reason && (
                    <p className="text-[11px] text-gray-500 mb-3 line-clamp-2 leading-relaxed">
                      {decision.decision_data.reason}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => approveDecision(decision.id)}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1"
                    >
                      <ThumbsUp className="w-3 h-3" /> Approuver
                    </button>
                    <button
                      onClick={() => rejectDecision(decision.id)}
                      className="flex-1 bg-white border border-gray-200 hover:bg-gray-100 text-gray-600 text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1"
                    >
                      <ThumbsDown className="w-3 h-3" /> Refuser
                    </button>
                  </div>
                </div>
              )) : (
                <div className="h-full flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
                    <Brain className="w-7 h-7 text-gray-300" />
                  </div>
                  <p className="text-sm text-gray-400 font-medium">Aucune décision en attente</p>
                  <p className="text-xs text-gray-300 mt-1">L'IA monitore en continu</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─── PERFORMANCE + PIPELINE ──────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <div
            className="rounded-2xl p-6 text-white relative overflow-hidden"
            style={{ background: 'linear-gradient(145deg, #0f1117 0%, #161b22 60%, #0f1117 100%)' }}
          >
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-500" />
            <h3 className="font-bold text-base mb-5 flex items-center gap-2 mt-1">
              <div className="p-1.5 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                <TrendingUp className="w-4 h-4 text-yellow-400" />
              </div>
              Performance Ce Mois
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/[0.05] rounded-xl p-4 border border-white/[0.07]">
                <div className="text-2xl font-bold text-yellow-400 mb-0.5">{stats.won_this_month}</div>
                <div className="text-xs text-gray-400 font-medium">Contrats signés</div>
              </div>
              <div className="bg-white/[0.05] rounded-xl p-4 border border-white/[0.07]">
                <div className="text-2xl font-bold text-white mb-0.5">{stats.new_leads_week}</div>
                <div className="text-xs text-gray-400 font-medium">Nouveaux leads (7j)</div>
              </div>
              <div className="bg-white/[0.05] rounded-xl p-4 border border-white/[0.07]">
                <div className="text-2xl font-bold text-green-400 mb-0.5">{stats.conversion_rate}%</div>
                <div className="text-xs text-gray-400 font-medium mb-2">Taux conversion</div>
                <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-700" style={{ width: `${Math.min(stats.conversion_rate, 100)}%` }} />
                </div>
              </div>
              <div className="bg-white/[0.05] rounded-xl p-4 border border-white/[0.07]">
                <div className="text-2xl font-bold text-white mb-0.5">{stats.avg_deal_value}€</div>
                <div className="text-xs text-gray-400 font-medium">Valeur moyenne</div>
              </div>
            </div>
          </div>

          {stats.renewal_opportunities > 0 ? (
            <div
              className="rounded-2xl p-6 text-white relative overflow-hidden"
              style={{ background: 'linear-gradient(145deg, #14532d, #166534)' }}
            >
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-green-400 to-emerald-300" />
              <h3 className="font-bold text-base mb-3 flex items-center gap-2 mt-1">
                <div className="p-1.5 bg-white/10 rounded-lg">
                  <Target className="w-4 h-4 text-white" />
                </div>
                Cross-Selling
              </h3>
              <div className="text-5xl font-bold mb-2">{stats.renewal_opportunities}</div>
              <p className="text-green-100 mb-5 text-sm">Clients prêts pour des offres additionnelles</p>
              <button
                onClick={() => navigate('/backoffice/crm-killer/retention')}
                className="bg-white text-emerald-700 font-bold px-5 py-2.5 rounded-xl hover:bg-emerald-50 transition-colors flex items-center gap-2 text-sm shadow-md"
              >
                Voir les opportunités <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-sky-400 to-violet-400" />
              <h3 className="font-bold text-base mb-2 flex items-center gap-2 text-gray-900 mt-1">
                <div className="p-1.5 bg-sky-50 rounded-lg border border-sky-100">
                  <Zap className="w-4 h-4 text-sky-600" />
                </div>
                Pipeline Autonome Actif
              </h3>
              <p className="text-gray-500 mb-5 text-sm leading-relaxed">
                Le système gère automatiquement les leads jusqu'au devis. Vous n'intervenez que pour créer les devis et émettre les contrats.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => navigate('/backoffice/crm-killer/ia')}
                  className="flex-1 bg-gray-50 text-gray-700 font-semibold px-4 py-2.5 rounded-xl hover:bg-gray-100 transition-colors text-sm border border-gray-200"
                >
                  Voir IA
                </button>
                <button
                  onClick={() => navigate('/backoffice/automations')}
                  className="flex-1 bg-gradient-to-r from-yellow-500 to-amber-500 text-black font-bold px-4 py-2.5 rounded-xl hover:from-yellow-400 hover:to-amber-400 transition-all text-sm shadow-md shadow-yellow-200"
                >
                  Automations
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default CRMKillerDashboard;
