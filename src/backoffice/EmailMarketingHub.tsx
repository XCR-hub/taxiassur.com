import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  Mail,
  Send,
  Eye,
  MousePointer,
  MessageSquare,
  Users,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Sparkles,
  Beaker,
  Bell,
  BarChart3,
  Zap,
  RefreshCw,
  CheckCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';

interface Stats {
  totalSent: number;
  totalOpens: number;
  totalClicks: number;
  totalReplies: number;
  openRate: number;
  clickRate: number;
  replyRate: number;
  topEngagedCount: number;
  activeTests: number;
  activeNotifications: number;
  smartTemplates: number;
  activeSubscribers: number;
  recentCampaigns: RecentCampaign[];
}

interface RecentCampaign {
  id: string;
  name: string;
  subject: string;
  status: string;
  total_sent: number;
  total_opened: number;
  total_clicked: number;
  created_at: string;
}

const KPICard: React.FC<{
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  color: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}> = ({ label, value, sub, icon, color, trend, trendValue }) => (
  <div className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between mb-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        {icon}
      </div>
      {trend && trendValue && (
        <div className={`flex items-center gap-1 text-xs font-medium ${trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-500' : 'text-gray-400'}`}>
          {trend === 'up' ? <TrendingUp size={12} /> : trend === 'down' ? <TrendingDown size={12} /> : null}
          {trendValue}
        </div>
      )}
    </div>
    <div className="text-2xl font-bold text-gray-900 mb-0.5">{value}</div>
    <div className="text-sm text-gray-500">{label}</div>
    {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
  </div>
);

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, { label: string; cls: string }> = {
    sent: { label: 'Envoyée', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    sending: { label: 'En cours', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    draft: { label: 'Brouillon', cls: 'bg-gray-50 text-gray-600 border-gray-200' },
    scheduled: { label: 'Planifiée', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  };
  const { label, cls } = map[status] || { label: status, cls: 'bg-gray-50 text-gray-600 border-gray-200' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${cls}`}>
      {label}
    </span>
  );
};

export default function EmailMarketingHub() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    totalSent: 0, totalOpens: 0, totalClicks: 0, totalReplies: 0,
    openRate: 0, clickRate: 0, replyRate: 0,
    topEngagedCount: 0, activeTests: 0, activeNotifications: 0,
    smartTemplates: 0, activeSubscribers: 0, recentCampaigns: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadStats(); }, []);

  const loadStats = async () => {
    try {
      const [sentRes, opensRes, clicksRes, repliesRes, scoresRes, testsRes, templatesRes, subscribersRes, campaignsRes] = await Promise.all([
        supabase.from('email_sends').select('*', { count: 'exact', head: true }),
        supabase.from('email_opens').select('*', { count: 'exact', head: true }),
        supabase.from('email_clicks').select('*', { count: 'exact', head: true }),
        supabase.from('email_replies').select('*', { count: 'exact', head: true }),
        supabase.from('lead_engagement_scores').select('*', { count: 'exact', head: true }).gte('engagement_score', 70),
        supabase.from('email_ab_tests').select('*', { count: 'exact', head: true }).eq('status', 'running'),
        supabase.from('email_templates_smart').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('newsletter_subscribers').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('newsletter_campaigns').select('id,name,subject,status,total_sent,total_opened,total_clicked,created_at').order('created_at', { ascending: false }).limit(5),
      ]);

      const sent = sentRes.count || 0;
      const opens = opensRes.count || 0;
      const clicks = clicksRes.count || 0;
      const replies = repliesRes.count || 0;

      setStats({
        totalSent: sent,
        totalOpens: opens,
        totalClicks: clicks,
        totalReplies: replies,
        openRate: sent > 0 ? (opens / sent) * 100 : 0,
        clickRate: sent > 0 ? (clicks / sent) * 100 : 0,
        replyRate: sent > 0 ? (replies / sent) * 100 : 0,
        topEngagedCount: scoresRes.count || 0,
        activeTests: testsRes.count || 0,
        activeNotifications: 0,
        smartTemplates: templatesRes.count || 0,
        activeSubscribers: subscribersRes.count || 0,
        recentCampaigns: (campaignsRes.data || []) as RecentCampaign[],
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const quickLinks = [
    { icon: <Send size={16} />, label: 'Nouvelle campagne', path: '/backoffice/newsletter', color: 'bg-emerald-500 hover:bg-emerald-600' },
    { icon: <Sparkles size={16} />, label: 'Templates IA', path: '/backoffice/smart-templates', color: 'bg-blue-500 hover:bg-blue-600' },
    { icon: <Beaker size={16} />, label: 'Tests A/B', path: '/backoffice/ab-testing', color: 'bg-orange-500 hover:bg-orange-600' },
    { icon: <BarChart3 size={16} />, label: 'Analytics', path: '/backoffice/email-analytics', color: 'bg-gray-700 hover:bg-gray-800' },
  ];

  const moduleCards = [
    {
      icon: <Send size={20} className="text-emerald-500" />,
      title: 'Campagnes',
      desc: 'Newsletter & envois groupés',
      path: '/backoffice/newsletter',
      stat: `${stats.activeSubscribers} abonnés actifs`,
      statColor: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      icon: <Sparkles size={20} className="text-blue-500" />,
      title: 'Templates IA',
      desc: 'Emails adaptatifs par score',
      path: '/backoffice/smart-templates',
      stat: `${stats.smartTemplates} templates actifs`,
      statColor: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      icon: <Beaker size={20} className="text-orange-500" />,
      title: 'Tests A/B',
      desc: 'Optimisation automatique',
      path: '/backoffice/ab-testing',
      stat: `${stats.activeTests} test(s) en cours`,
      statColor: 'text-orange-600',
      bg: 'bg-orange-50',
    },
    {
      icon: <BarChart3 size={20} className="text-gray-700" />,
      title: 'Analytics',
      desc: 'Performance & engagement',
      path: '/backoffice/email-analytics',
      stat: `${stats.topEngagedCount} leads chauds`,
      statColor: 'text-gray-700',
      bg: 'bg-gray-100',
    },
    {
      icon: <Bell size={20} className="text-amber-500" />,
      title: 'Notifications',
      desc: 'Alertes temps réel',
      path: '/backoffice/notifications',
      stat: 'Actif',
      statColor: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      icon: <Users size={20} className="text-blue-600" />,
      title: 'Abonnés',
      desc: 'Gestion des inscrits',
      path: '/backoffice/newsletter',
      stat: `${stats.activeSubscribers} actifs`,
      statColor: 'text-blue-600',
      bg: 'bg-blue-50',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw size={28} className="animate-spin text-green-500" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Marketing</h1>
          <p className="text-sm text-gray-500 mt-0.5">Vue d'ensemble de vos campagnes et performances</p>
        </div>
        <div className="flex items-center gap-2">
          {quickLinks.map((q) => (
            <button
              key={q.path}
              onClick={() => navigate(q.path)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-white text-xs font-medium transition-colors ${q.color}`}
            >
              {q.icon}
              {q.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          label="Emails envoyés"
          value={stats.totalSent.toLocaleString('fr-FR')}
          icon={<Mail size={18} className="text-white" />}
          color="bg-emerald-500"
          sub="Total cumulé"
        />
        <KPICard
          label="Taux d'ouverture"
          value={`${stats.openRate.toFixed(1)}%`}
          icon={<Eye size={18} className="text-white" />}
          color="bg-blue-500"
          trend={stats.openRate >= 25 ? 'up' : 'neutral'}
          trendValue={stats.openRate >= 25 ? 'Bon' : undefined}
        />
        <KPICard
          label="Taux de clic"
          value={`${stats.clickRate.toFixed(1)}%`}
          icon={<MousePointer size={18} className="text-white" />}
          color="bg-orange-500"
          trend={stats.clickRate >= 5 ? 'up' : 'neutral'}
          trendValue={stats.clickRate >= 5 ? 'Bon' : undefined}
        />
        <KPICard
          label="Taux de réponse"
          value={`${stats.replyRate.toFixed(1)}%`}
          icon={<MessageSquare size={18} className="text-white" />}
          color="bg-gray-700"
        />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
            <Users size={18} className="text-emerald-600" />
          </div>
          <div>
            <div className="text-lg font-bold text-gray-900">{stats.activeSubscribers.toLocaleString('fr-FR')}</div>
            <div className="text-xs text-gray-500">Abonnés actifs</div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
            <Zap size={18} className="text-orange-500" />
          </div>
          <div>
            <div className="text-lg font-bold text-gray-900">{stats.topEngagedCount}</div>
            <div className="text-xs text-gray-500">Leads chauds (≥70)</div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <Sparkles size={18} className="text-blue-500" />
          </div>
          <div>
            <div className="text-lg font-bold text-gray-900">{stats.smartTemplates}</div>
            <div className="text-xs text-gray-500">Templates actifs</div>
          </div>
        </div>
      </div>

      {/* Main 2-col layout */}
      <div className="grid grid-cols-5 gap-6">
        {/* Recent campaigns */}
        <div className="col-span-3 bg-white rounded-xl border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">Campagnes récentes</h2>
              <p className="text-xs text-gray-500 mt-0.5">Dernières newsletters envoyées</p>
            </div>
            <button
              onClick={() => navigate('/backoffice/newsletter')}
              className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 font-medium"
            >
              Voir tout <ArrowRight size={12} />
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {stats.recentCampaigns.length === 0 ? (
              <div className="py-12 text-center">
                <Mail size={32} className="text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-400">Aucune campagne créée</p>
                <button
                  onClick={() => navigate('/backoffice/newsletter')}
                  className="mt-3 text-xs text-green-600 hover:underline"
                >
                  Créer une campagne
                </button>
              </div>
            ) : (
              stats.recentCampaigns.map((c) => {
                const openRate = c.total_sent > 0 ? ((c.total_opened / c.total_sent) * 100).toFixed(1) : '0.0';
                const clickRate = c.total_sent > 0 ? ((c.total_clicked / c.total_sent) * 100).toFixed(1) : '0.0';
                return (
                  <div key={c.id} className="px-5 py-3.5 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-900 truncate">{c.name}</span>
                          <StatusBadge status={c.status} />
                        </div>
                        <p className="text-xs text-gray-500 truncate mb-2">{c.subject}</p>
                        {c.total_sent > 0 && (
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Send size={10} className="text-gray-400" />
                              {c.total_sent} envoyés
                            </span>
                            <span className="flex items-center gap-1">
                              <Eye size={10} className="text-blue-400" />
                              {openRate}% ouvertures
                            </span>
                            <span className="flex items-center gap-1">
                              <MousePointer size={10} className="text-orange-400" />
                              {clickRate}% clics
                            </span>
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {new Date(c.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Performance + tips */}
        <div className="col-span-2 space-y-4">
          {/* Performance gauge */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Performance globale</h3>
            {[
              { label: 'Ouvertures', value: stats.openRate, max: 50, color: 'bg-blue-500', benchmark: '25% standard' },
              { label: 'Clics', value: stats.clickRate, max: 20, color: 'bg-orange-500', benchmark: '5% standard' },
              { label: 'Réponses', value: stats.replyRate, max: 10, color: 'bg-emerald-500', benchmark: '2% standard' },
            ].map((m) => (
              <div key={m.label} className="mb-3 last:mb-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-700">{m.label}</span>
                  <span className="text-xs text-gray-500">{m.value.toFixed(1)}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${m.color}`}
                    style={{ width: `${Math.min((m.value / m.max) * 100, 100)}%` }}
                  />
                </div>
                <div className="text-xs text-gray-400 mt-0.5">{m.benchmark}</div>
              </div>
            ))}
          </div>

          {/* System status */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Statut du système</h3>
            <div className="space-y-2">
              {[
                { label: 'Envoi SMTP IONOS', status: 'ok' },
                { label: 'Suivi ouvertures', status: 'ok' },
                { label: `Tests A/B: ${stats.activeTests} actif(s)`, status: stats.activeTests > 0 ? 'ok' : 'warn' },
                { label: `Templates: ${stats.smartTemplates} actif(s)`, status: stats.smartTemplates > 0 ? 'ok' : 'warn' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  {item.status === 'ok' ? (
                    <CheckCircle size={13} className="text-emerald-500 flex-shrink-0" />
                  ) : item.status === 'warn' ? (
                    <AlertCircle size={13} className="text-amber-500 flex-shrink-0" />
                  ) : (
                    <Clock size={13} className="text-gray-400 flex-shrink-0" />
                  )}
                  <span className="text-xs text-gray-600">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick tip */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 rounded-xl p-4">
            <div className="flex items-start gap-2.5">
              <TrendingUp size={15} className="text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-green-800 mb-1">Conseil du jour</p>
                <p className="text-xs text-green-700 leading-relaxed">
                  Envoyez vos campagnes le mardi ou jeudi entre 9h–11h pour maximiser les ouvertures. Personnalisez le sujet avec le prénom pour +26% d'ouvertures.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Module cards */}
      <div>
        <h2 className="font-semibold text-gray-900 mb-3">Modules email</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {moduleCards.map((m) => (
            <button
              key={m.path + m.title}
              onClick={() => navigate(m.path)}
              className="bg-white rounded-xl border border-gray-100 p-4 text-left hover:shadow-md hover:border-gray-200 transition-all group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-9 h-9 ${m.bg} rounded-lg flex items-center justify-center`}>
                  {m.icon}
                </div>
                <ArrowRight size={14} className="text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all" />
              </div>
              <div className="font-semibold text-gray-900 text-sm mb-0.5">{m.title}</div>
              <div className="text-xs text-gray-400 mb-2">{m.desc}</div>
              <div className={`text-xs font-medium ${m.statColor}`}>{m.stat}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
