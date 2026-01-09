import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Inbox,
  FileCheck,
  Shield,
  TrendingUp,
  Settings,
  Bot,
  Mail,
  AlertTriangle,
  CheckCircle,
  Clock,
  Euro,
  BarChart3,
  Zap,
  Phone,
  MessageSquare,
  Calendar,
  Target,
  Activity,
  DollarSign,
  Award,
  Briefcase,
  Car,
  Building2,
  Link2,
  Newspaper,
  Filter,
  Search,
  Plus,
  ArrowRight,
  TrendingDown,
  Eye,
  RefreshCw
} from 'lucide-react';
import { pipelineService } from '@/lib/crm-pipeline';
import { aiGovernanceService } from '@/lib/crm-ai-governance';
import { channelEngineService } from '@/lib/crm-channel-engine';
import { retentionService } from '@/lib/crm-retention';
import { AIDecisionCard } from '@/components/crm/AIDecisionCard';
import { supabase } from '@/lib/supabase';
import BackButton from './BackButton';

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

interface Contact {
  id: string;
  email: string;
  phone: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  contact_type: string;
  stage: string;
  lead_score: number;
  conversion_probability: number;
  created_at: string;
  last_contact_at?: string;
}

const CRMKillerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'contacts' | 'pipeline' | 'campaigns' | 'analytics'>('overview');

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

  const [recentAIDecisions, setRecentAIDecisions] = useState<any[]>([]);
  const [pipelineDistribution, setPipelineDistribution] = useState<Record<string, number>>({});
  const [recentContacts, setRecentContacts] = useState<Contact[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    loadDashboardData();

    // Rafraîchir toutes les 30 secondes
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [
        leads,
        aiDecisions,
        unreadCount,
        criticalAlerts,
        kanbanData
      ] = await Promise.all([
        pipelineService.getLeads(),
        aiGovernanceService.getDecisions(undefined, 'pending'),
        channelEngineService.getUnreadCount(),
        retentionService.getCriticalAlertsCount(),
        pipelineService.getKanbanData()
      ]);

      // Calculer les stats
      const activeContracts = leads.filter(l => l.status === 'ACTIVE_CLIENT').length;
      const pendingDocs = leads.filter(l => l.status === 'DOCUMENTS_REQUIRED').length;
      const pendingPayments = leads.filter(l => l.status === 'PAYMENT_PENDING').length;
      const renewalOps = leads.filter(l => l.status === 'CROSS_SELLING').length;

      // Nouveaux leads aujourd'hui
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const newToday = leads.filter(l => new Date(l.created_at) >= today).length;

      // Taux de conversion
      const closedWon = leads.filter(l => l.status === 'ACTIVE_CLIENT').length;
      const conversionRate = leads.length > 0 ? (closedWon / leads.length) * 100 : 0;

      // Valeur moyenne
      const avgValue = 1200; // À calculer depuis les vraies données
      const totalRevenue = activeContracts * avgValue;

      setStats({
        total_leads: leads.length,
        active_contracts: activeContracts,
        pending_documents: pendingDocs,
        pending_payments: pendingPayments,
        unread_messages: unreadCount,
        ai_decisions_pending: aiDecisions.length,
        at_risk_clients: criticalAlerts,
        renewal_opportunities: renewalOps,
        new_leads_today: newToday,
        conversion_rate: Math.round(conversionRate),
        avg_deal_value: avgValue,
        total_revenue: totalRevenue
      });

      setRecentAIDecisions(aiDecisions.slice(0, 3));

      // Distribution pipeline
      const distribution: Record<string, number> = {};
      Object.entries(kanbanData).forEach(([status, leadsArray]) => {
        if ((leadsArray as any[]).length > 0) {
          distribution[status] = (leadsArray as any[]).length;
        }
      });
      setPipelineDistribution(distribution);

      // Charger les contacts récents
      await loadRecentContacts();

      // Charger les campagnes
      await loadCampaigns();

    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentContacts = async () => {
    try {
      const { data: leadsData } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (leadsData) {
        const contacts: Contact[] = leadsData.map(lead => ({
          id: lead.id,
          email: lead.email,
          phone: lead.phone,
          first_name: lead.first_name,
          last_name: lead.last_name,
          company_name: lead.company_name,
          contact_type: 'prospect_taxi',
          stage: lead.status || 'new',
          lead_score: lead.lead_score || 0,
          conversion_probability: lead.conversion_probability || 0,
          created_at: lead.created_at,
          last_contact_at: lead.last_contact_at
        }));
        setRecentContacts(contacts);
      }
    } catch (error) {
      console.error('Failed to load contacts:', error);
    }
  };

  const loadCampaigns = async () => {
    try {
      const { data } = await supabase
        .from('email_campaigns')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (data) {
        setCampaigns(data);
      }
    } catch (error) {
      console.error('Failed to load campaigns:', error);
    }
  };

  const quickActions = [
    {
      title: 'Pipeline Kanban',
      description: 'Vue kanban du pipeline complet',
      icon: LayoutDashboard,
      color: 'from-blue-500 to-blue-600',
      path: '/backoffice/crm-killer/pipeline'
    },
    {
      title: 'Inbox Multicanal',
      description: 'Messages email/SMS/WhatsApp',
      icon: Inbox,
      color: 'from-purple-500 to-purple-600',
      path: '/backoffice/crm-killer/inbox',
      badge: stats.unread_messages
    },
    {
      title: 'Production',
      description: 'Documents, signature, paiement',
      icon: FileCheck,
      color: 'from-orange-500 to-orange-600',
      path: '/backoffice/crm-killer/production',
      badge: stats.pending_documents + stats.pending_payments
    },
    {
      title: 'Rétention',
      description: 'Anti-churn & cross-sell',
      icon: Shield,
      color: 'from-green-500 to-green-600',
      path: '/backoffice/crm-killer/retention',
      badge: stats.at_risk_clients
    },
    {
      title: 'IA Governance',
      description: 'Council & décisions IA',
      icon: Bot,
      color: 'from-pink-500 to-pink-600',
      path: '/backoffice/crm-killer/ia',
      badge: stats.ai_decisions_pending
    },
    {
      title: 'Templates',
      description: 'Templates multicanaux & A/B tests',
      icon: Mail,
      color: 'from-indigo-500 to-indigo-600',
      path: '/backoffice/crm-killer/templates'
    },
    {
      title: 'Email Marketing Hub',
      description: 'Campagnes & newsletters',
      icon: Mail,
      color: 'from-cyan-500 to-cyan-600',
      path: '/backoffice/email-marketing'
    },
    {
      title: 'Analytics',
      description: 'Rapports & statistiques',
      icon: BarChart3,
      color: 'from-yellow-500 to-yellow-600',
      path: '/backoffice/analytics'
    },
    {
      title: 'WhatsApp Manager',
      description: 'Gestion conversations WhatsApp',
      icon: MessageSquare,
      color: 'from-emerald-500 to-emerald-600',
      path: '/backoffice/whatsapp'
    }
  ];

  const kpiCards = [
    {
      title: 'Total Leads',
      value: stats.total_leads,
      icon: Users,
      color: 'text-blue-600 bg-blue-100',
      change: `+${stats.new_leads_today} aujourd'hui`,
      trend: 'up'
    },
    {
      title: 'Contrats Actifs',
      value: stats.active_contracts,
      icon: CheckCircle,
      color: 'text-green-600 bg-green-100',
      change: `${stats.conversion_rate}% conv.`,
      trend: 'up'
    },
    {
      title: 'Chiffre d\'Affaires',
      value: `${Math.round(stats.total_revenue / 1000)}K€`,
      icon: Euro,
      color: 'text-emerald-600 bg-emerald-100',
      change: `${stats.avg_deal_value}€ moy.`,
      trend: 'up'
    },
    {
      title: 'Messages Non Lus',
      value: stats.unread_messages,
      icon: Mail,
      color: 'text-purple-600 bg-purple-100',
      urgent: stats.unread_messages > 10
    },
    {
      title: 'Docs en Attente',
      value: stats.pending_documents,
      icon: Clock,
      color: 'text-orange-600 bg-orange-100',
      urgent: stats.pending_documents > 5
    },
    {
      title: 'Paiements en Attente',
      value: stats.pending_payments,
      icon: DollarSign,
      color: 'text-yellow-600 bg-yellow-100',
      urgent: stats.pending_payments > 3
    },
    {
      title: 'Clients à Risque',
      value: stats.at_risk_clients,
      icon: AlertTriangle,
      color: 'text-red-600 bg-red-100',
      urgent: stats.at_risk_clients > 0
    },
    {
      title: 'Opportunités',
      value: stats.renewal_opportunities,
      icon: TrendingUp,
      color: 'text-teal-600 bg-teal-100'
    },
    {
      title: 'Décisions IA',
      value: stats.ai_decisions_pending,
      icon: Bot,
      color: 'text-pink-600 bg-pink-100',
      urgent: stats.ai_decisions_pending > 5
    }
  ];

  const tabs = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: LayoutDashboard },
    { id: 'contacts', label: 'Contacts', icon: Users },
    { id: 'pipeline', label: 'Pipeline', icon: Target },
    { id: 'campaigns', label: 'Campagnes', icon: Mail },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-32 bg-gray-200 rounded-xl"></div>
            <div className="grid grid-cols-3 gap-6">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header avec gradient */}
      <div className="bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <BackButton />
              <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
                <Zap className="text-yellow-400" size={40} />
                CRM Killer Dashboard
              </h1>
              <p className="text-blue-200 text-lg">
                Système de gestion client ultra-automatisé avec IA collaborative
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={loadDashboardData}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <RefreshCw size={20} />
                Actualiser
              </button>
              <button
                onClick={() => navigate('/backoffice/crm-killer/settings')}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Settings size={20} />
                Paramètres
              </button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-9 gap-4">
            {kpiCards.map((kpi, index) => {
              const Icon = kpi.icon;
              return (
                <div
                  key={index}
                  className={`bg-white/10 backdrop-blur-sm rounded-xl p-4 border ${
                    kpi.urgent ? 'border-red-400 animate-pulse' : 'border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className={`w-10 h-10 rounded-lg ${kpi.color} flex items-center justify-center`}>
                      <Icon size={20} />
                    </div>
                  </div>
                  <div className="text-3xl font-bold mb-1">{kpi.value}</div>
                  <div className="text-sm text-blue-200">{kpi.title}</div>
                  {kpi.change && (
                    <div className={`text-xs mt-1 ${kpi.trend === 'up' ? 'text-green-400' : 'text-gray-400'}`}>
                      {kpi.change}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-6 py-4 font-medium transition-colors flex items-center gap-2 border-b-2 ${
                    activeTab === tab.id
                      ? 'text-blue-600 border-blue-600'
                      : 'text-gray-600 border-transparent hover:text-gray-900'
                  }`}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'overview' && (
          <>
            {/* Actions Rapides */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Actions Rapides</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {quickActions.map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={index}
                      onClick={() => navigate(action.path)}
                      className="relative bg-white rounded-xl border-2 border-gray-200 p-6 hover:border-blue-400 hover:shadow-lg transition-all text-left group"
                    >
                      {action.badge && action.badge > 0 && (
                        <div className="absolute top-4 right-4 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                          {action.badge}
                        </div>
                      )}
                      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                        <Icon size={28} className="text-white" />
                      </div>
                      <h3 className="font-bold text-gray-900 mb-1">{action.title}</h3>
                      <p className="text-sm text-gray-600">{action.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* AI Decisions */}
            {recentAIDecisions.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Bot className="text-pink-600" size={28} />
                    Décisions IA en Attente
                  </h2>
                  <button
                    onClick={() => navigate('/backoffice/crm-killer/ia')}
                    className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                  >
                    Voir tout <ArrowRight size={16} />
                  </button>
                </div>
                <div className="grid gap-4">
                  {recentAIDecisions.map((decision) => (
                    <AIDecisionCard
                      key={decision.id}
                      decision={decision}
                      onApprove={async () => {
                        await aiGovernanceService.approveDecision(decision.id, 'admin');
                        loadDashboardData();
                      }}
                      onReject={async () => {
                        await aiGovernanceService.rejectDecision(decision.id);
                        loadDashboardData();
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Pipeline Distribution */}
            <div className="bg-white rounded-xl border-2 border-gray-200 p-6 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Target size={28} />
                Distribution Pipeline
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {Object.entries(pipelineDistribution).map(([status, count]) => (
                  <div key={status} className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors cursor-pointer" onClick={() => navigate('/backoffice/crm-killer/pipeline')}>
                    <div className="text-3xl font-bold text-blue-600 mb-2">{count}</div>
                    <div className="text-xs text-gray-600 uppercase">{status.replace(/_/g, ' ')}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Contacts récents */}
            <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Users size={28} />
                  Contacts Récents
                </h2>
                <button
                  onClick={() => setActiveTab('contacts')}
                  className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                >
                  Voir tout <ArrowRight size={16} />
                </button>
              </div>
              <div className="space-y-2">
                {recentContacts.slice(0, 5).map((contact) => (
                  <div
                    key={contact.id}
                    onClick={() => navigate(`/backoffice/crm-killer/lead/${contact.id}`)}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
                        {contact.first_name?.[0] || contact.email[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">
                          {contact.first_name} {contact.last_name}
                        </div>
                        <div className="text-sm text-gray-600">{contact.email}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-blue-600">Score: {contact.lead_score}%</div>
                      <div className="text-xs text-gray-500">{new Date(contact.created_at).toLocaleDateString('fr-FR')}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {activeTab === 'contacts' && (
          <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Tous les Contacts</h2>
              <button
                onClick={() => navigate('/backoffice/crm-killer/pipeline')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus size={20} />
                Nouveau Contact
              </button>
            </div>

            <div className="mb-4 flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Rechercher par nom, email, téléphone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tous types</option>
                <option value="prospect_taxi">Prospects Taxi</option>
                <option value="client">Clients</option>
                <option value="partner">Partenaires</option>
              </select>
            </div>

            <div className="space-y-2">
              {recentContacts.map((contact) => (
                <div
                  key={contact.id}
                  onClick={() => navigate(`/backoffice/crm-killer/lead/${contact.id}`)}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors border border-gray-200"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-lg">
                      {contact.first_name?.[0] || contact.email[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 flex items-center gap-2">
                        {contact.first_name} {contact.last_name}
                        {contact.company_name && (
                          <span className="text-sm text-gray-600">• {contact.company_name}</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 flex items-center gap-3">
                        <span>{contact.email}</span>
                        <span>•</span>
                        <span>{contact.phone}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm font-medium text-blue-600">Score: {contact.lead_score}%</div>
                      <div className="text-xs text-gray-500">Conv: {contact.conversion_probability}%</div>
                    </div>
                    <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                      {contact.stage.replace(/_/g, ' ')}
                    </div>
                    <ArrowRight size={20} className="text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'pipeline' && (
          <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Pipeline de Vente</h2>
              <button
                onClick={() => navigate('/backoffice/crm-killer/pipeline')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Eye size={20} />
                Vue Kanban Complète
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {Object.entries(pipelineDistribution).map(([status, count]) => (
                <div key={status} className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border-2 border-blue-200">
                  <div className="text-4xl font-bold text-blue-600 mb-2">{count}</div>
                  <div className="text-sm text-gray-700 font-medium uppercase">{status.replace(/_/g, ' ')}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'campaigns' && (
          <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Campagnes Email</h2>
              <button
                onClick={() => navigate('/backoffice/email-marketing')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus size={20} />
                Nouvelle Campagne
              </button>
            </div>
            {campaigns.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Mail size={48} className="mx-auto mb-4 text-gray-300" />
                <p>Aucune campagne active</p>
              </div>
            ) : (
              <div className="space-y-4">
                {campaigns.map((campaign) => (
                  <div key={campaign.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-900">{campaign.name}</h3>
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                        {campaign.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-gray-600">Envoyés</div>
                        <div className="text-xl font-bold text-blue-600">{campaign.total_sent || 0}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Ouverts</div>
                        <div className="text-xl font-bold text-green-600">{campaign.total_opened || 0}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Clics</div>
                        <div className="text-xl font-bold text-purple-600">{campaign.total_clicked || 0}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Conversions</div>
                        <div className="text-xl font-bold text-orange-600">{campaign.total_converted || 0}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Statistiques Avancées</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
                  <div className="text-4xl font-bold text-blue-600 mb-2">{stats.conversion_rate}%</div>
                  <div className="text-sm text-gray-700 font-medium">Taux de Conversion</div>
                </div>
                <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
                  <div className="text-4xl font-bold text-green-600 mb-2">{stats.avg_deal_value}€</div>
                  <div className="text-sm text-gray-700 font-medium">Valeur Moyenne</div>
                </div>
                <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl">
                  <div className="text-4xl font-bold text-purple-600 mb-2">{Math.round(stats.total_revenue / 1000)}K€</div>
                  <div className="text-sm text-gray-700 font-medium">CA Total</div>
                </div>
                <div className="text-center p-6 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl">
                  <div className="text-4xl font-bold text-orange-600 mb-2">{stats.new_leads_today}</div>
                  <div className="text-sm text-gray-700 font-medium">Nouveaux Aujourd'hui</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Rapports Détaillés</h2>
              <div className="text-center py-8 text-gray-500">
                <BarChart3 size={48} className="mx-auto mb-4 text-gray-300" />
                <p className="mb-4">Accédez aux rapports complets et graphiques détaillés</p>
                <button
                  onClick={() => navigate('/backoffice/analytics')}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
                >
                  <BarChart3 size={20} />
                  Ouvrir Analytics
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CRMKillerDashboard;
