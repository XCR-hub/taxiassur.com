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
  Zap
} from 'lucide-react';
import { pipelineService } from '@/lib/crm-pipeline';
import { aiGovernanceService } from '@/lib/crm-ai-governance';
import { channelEngineService } from '@/lib/crm-channel-engine';
import { retentionService } from '@/lib/crm-retention';
import { AIDecisionCard } from '@/components/crm/AIDecisionCard';
import BackButton from './BackButton';

const CRMKillerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total_leads: 0,
    active_contracts: 0,
    pending_documents: 0,
    pending_payments: 0,
    unread_messages: 0,
    ai_decisions_pending: 0,
    at_risk_clients: 0,
    renewal_opportunities: 0
  });

  const [recentAIDecisions, setRecentAIDecisions] = useState<any[]>([]);
  const [pipelineDistribution, setPipelineDistribution] = useState<Record<string, number>>({});

  useEffect(() => {
    loadDashboardData();
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

      const activeContracts = leads.filter(l => l.status === 'ACTIVE_CLIENT').length;
      const pendingDocs = leads.filter(l => l.status === 'DOCUMENTS_REQUIRED').length;
      const pendingPayments = leads.filter(l => l.status === 'PAYMENT_PENDING').length;
      const renewalOps = leads.filter(l => l.status === 'CROSS_SELLING').length;

      setStats({
        total_leads: leads.length,
        active_contracts: activeContracts,
        pending_documents: pendingDocs,
        pending_payments: pendingPayments,
        unread_messages: unreadCount,
        ai_decisions_pending: aiDecisions.length,
        at_risk_clients: criticalAlerts,
        renewal_opportunities: renewalOps
      });

      setRecentAIDecisions(aiDecisions.slice(0, 3));

      const distribution: Record<string, number> = {};
      Object.entries(kanbanData).forEach(([status, leadsArray]) => {
        if ((leadsArray as any[]).length > 0) {
          distribution[status] = (leadsArray as any[]).length;
        }
      });
      setPipelineDistribution(distribution);

    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
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
    }
  ];

  const kpiCards = [
    {
      title: 'Total Leads',
      value: stats.total_leads,
      icon: Users,
      color: 'text-blue-600 bg-blue-100',
      change: '+12%'
    },
    {
      title: 'Contrats Actifs',
      value: stats.active_contracts,
      icon: CheckCircle,
      color: 'text-green-600 bg-green-100',
      change: '+8%'
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
      icon: Euro,
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
      title: 'Renouvellements',
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-32 bg-gray-200 rounded-xl"></div>
            <div className="grid grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
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
      <div className="bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <BackButton />
              <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
                <Zap className="text-yellow-400" size={40} />
                CRM Killer
              </h1>
              <p className="text-blue-200 text-lg">
                Système de gestion client ultra-automatisé avec IA collaborative
              </p>
            </div>
            <button
              onClick={loadDashboardData}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <BarChart3 size={20} />
              Actualiser
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
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
                    <div className="text-xs text-green-400 mt-1">{kpi.change}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
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

        {recentAIDecisions.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Bot className="text-pink-600" size={28} />
                Décisions IA en Attente
              </h2>
              <button
                onClick={() => navigate('/backoffice/crm-killer/ia')}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Voir tout →
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

        <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <LayoutDashboard size={28} />
            Distribution Pipeline
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Object.entries(pipelineDistribution).map(([status, count]) => (
              <div key={status} className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-3xl font-bold text-blue-600 mb-2">{count}</div>
                <div className="text-xs text-gray-600">{status.replace(/_/g, ' ')}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CRMKillerDashboard;
