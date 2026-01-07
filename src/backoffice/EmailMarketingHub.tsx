import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  Mail,
  Sparkles,
  Beaker,
  Bell,
  BarChart3,
  TrendingUp,
  Users,
  Globe,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';

export default function EmailMarketingHub() {
  const [stats, setStats] = useState({
    totalSent: 0,
    totalOpens: 0,
    totalClicks: 0,
    totalReplies: 0,
    openRate: 0,
    clickRate: 0,
    replyRate: 0,
    topEngagedCount: 0,
    activeTests: 0,
    activeNotifications: 0,
    smartTemplates: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const { count: sent } = await supabase
        .from('email_sends')
        .select('*', { count: 'exact', head: true });

      const { count: opens } = await supabase
        .from('email_opens')
        .select('*', { count: 'exact', head: true });

      const { count: clicks } = await supabase
        .from('email_clicks')
        .select('*', { count: 'exact', head: true });

      const { count: replies } = await supabase
        .from('email_replies')
        .select('*', { count: 'exact', head: true });

      const { count: highScores } = await supabase
        .from('lead_engagement_scores')
        .select('*', { count: 'exact', head: true })
        .gte('engagement_score', 70);

      const { count: activeTests } = await supabase
        .from('email_ab_tests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'running');

      const { data: { user } } = await supabase.auth.getUser();
      let activeNotifs = 0;
      if (user) {
        const { count } = await supabase
          .from('email_notifications_config')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('enabled', true);
        activeNotifs = count || 0;
      }

      const { count: templates } = await supabase
        .from('email_templates_smart')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      setStats({
        totalSent: sent || 0,
        totalOpens: opens || 0,
        totalClicks: clicks || 0,
        totalReplies: replies || 0,
        openRate: sent ? ((opens || 0) / sent * 100) : 0,
        clickRate: sent ? ((clicks || 0) / sent * 100) : 0,
        replyRate: sent ? ((replies || 0) / sent * 100) : 0,
        topEngagedCount: highScores || 0,
        activeTests: activeTests || 0,
        activeNotifications: activeNotifs,
        smartTemplates: templates || 0
      });

      setLoading(false);
    } catch (error) {
      console.error('Erreur chargement stats:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const tools = [
    {
      icon: <Sparkles className="w-8 h-8" />,
      title: 'Templates Intelligents',
      description: 'Emails adaptatifs selon l\'engagement',
      color: 'from-purple-600 to-pink-600',
      link: '/backoffice/smart-templates',
      stat: `${stats.smartTemplates} actifs`,
      statColor: 'text-purple-600'
    },
    {
      icon: <Beaker className="w-8 h-8" />,
      title: 'Tests A/B',
      description: 'Optimisez vos campagnes automatiquement',
      color: 'from-blue-600 to-purple-600',
      link: '/backoffice/ab-testing',
      stat: `${stats.activeTests} en cours`,
      statColor: 'text-blue-600'
    },
    {
      icon: <Bell className="w-8 h-8" />,
      title: 'Notifications',
      description: 'Alertes temps réel sur les interactions',
      color: 'from-indigo-600 to-purple-600',
      link: '/backoffice/notifications',
      stat: `${stats.activeNotifications} activées`,
      statColor: 'text-indigo-600'
    },
    {
      icon: <BarChart3 className="w-8 h-8" />,
      title: 'Analytics Avancées',
      description: 'Analyse approfondie de vos emails',
      color: 'from-green-600 to-emerald-600',
      link: '/backoffice/email-analytics',
      stat: `${stats.topEngagedCount} leads chauds`,
      statColor: 'text-green-600'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-lg p-8 text-white">
        <div className="flex items-center gap-3 mb-4">
          <Mail className="w-12 h-12" />
          <div>
            <h1 className="text-4xl font-bold">Email Marketing Hub</h1>
            <p className="text-green-100 text-lg">Centre de contrôle de vos campagnes emails</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white bg-opacity-20 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold">{stats.totalSent}</div>
            <div className="text-sm text-green-100">Emails Envoyés</div>
          </div>
          <div className="bg-white bg-opacity-20 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold">{stats.openRate.toFixed(1)}%</div>
            <div className="text-sm text-green-100">Taux Ouverture</div>
          </div>
          <div className="bg-white bg-opacity-20 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold">{stats.clickRate.toFixed(1)}%</div>
            <div className="text-sm text-green-100">Taux Clic</div>
          </div>
          <div className="bg-white bg-opacity-20 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold">{stats.replyRate.toFixed(1)}%</div>
            <div className="text-sm text-green-100">Taux Réponse</div>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-600 rounded-lg text-white">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-blue-900 text-lg mb-2">Système Email Marketing Complet Actif</h3>
            <p className="text-sm text-blue-800 mb-3">
              Vous disposez d'un système professionnel avec géolocalisation, A/B testing, notifications push,
              scoring d'engagement et templates adaptatifs. Valeur estimée : <strong>15 600€/an</strong> !
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                Géolocalisation IP
              </span>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                A/B Testing
              </span>
              <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-semibold">
                Notifications Push
              </span>
              <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-semibold">
                Score Engagement
              </span>
              <span className="px-3 py-1 bg-pink-100 text-pink-800 rounded-full text-xs font-semibold">
                Templates Intelligents
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {tools.map((tool, index) => (
          <Link
            key={index}
            to={tool.link}
            className="group bg-white rounded-lg shadow-md hover:shadow-xl transition overflow-hidden"
          >
            <div className={`bg-gradient-to-r ${tool.color} p-6 text-white`}>
              <div className="flex items-center justify-between mb-3">
                {tool.icon}
                <ArrowRight className="w-6 h-6 opacity-0 group-hover:opacity-100 transform translate-x-0 group-hover:translate-x-2 transition" />
              </div>
              <h3 className="text-xl font-bold mb-1">{tool.title}</h3>
              <p className="text-sm opacity-90">{tool.description}</p>
            </div>
            <div className="p-4">
              <div className={`text-2xl font-bold ${tool.statColor}`}>{tool.stat}</div>
            </div>
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-green-600" />
          Statistiques Détaillées
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
            <div className="text-3xl font-bold text-green-600 mb-1">{stats.totalOpens}</div>
            <div className="text-sm text-gray-700">Ouvertures Totales</div>
          </div>
          <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
            <div className="text-3xl font-bold text-blue-600 mb-1">{stats.totalClicks}</div>
            <div className="text-sm text-gray-700">Clics Totaux</div>
          </div>
          <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-200">
            <div className="text-3xl font-bold text-purple-600 mb-1">{stats.totalReplies}</div>
            <div className="text-sm text-gray-700">Réponses Totales</div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="text-5xl">🎯</div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Actions Recommandées Cette Semaine</h3>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span><strong>Créer 3 templates intelligents</strong> (faible/moyen/haut engagement)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span><strong>Lancer votre premier test A/B</strong> pour optimiser vos sujets</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span><strong>Activer les notifications VIP</strong> pour leads à fort potentiel</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span><strong>Analyser les analytics</strong> pour identifier vos meilleurs leads</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
