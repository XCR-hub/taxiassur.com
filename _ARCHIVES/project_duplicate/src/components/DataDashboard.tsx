import React from 'react';
import { useDashboardStats } from '../hooks/useSupabaseData';
import { FileText, Newspaper, MessageSquare, Users, TrendingUp, Calendar } from 'lucide-react';

export default function DataDashboard() {
  const { data: stats, loading, error } = useDashboardStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Erreur lors du chargement des statistiques : {error}</p>
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    {
      label: 'Articles de blog',
      value: stats.total_blog_posts,
      icon: FileText,
      color: 'blue'
    },
    {
      label: 'Actualités',
      value: stats.total_news,
      icon: Newspaper,
      color: 'green'
    },
    {
      label: 'FAQs',
      value: stats.total_faqs,
      icon: MessageSquare,
      color: 'purple'
    },
    {
      label: 'Leads totaux',
      value: stats.total_leads,
      icon: Users,
      color: 'orange'
    },
    {
      label: 'Nouveaux leads (7j)',
      value: stats.new_leads_week,
      icon: TrendingUp,
      color: 'indigo'
    },
    {
      label: "Leads aujourd'hui",
      value: stats.new_leads_today,
      icon: Calendar,
      color: 'pink'
    }
  ];

  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    pink: 'bg-pink-50 text-pink-600'
  };

  return (
    <div className="space-y-6">
      {/* Statistiques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${colorClasses[stat.color as keyof typeof colorClasses]}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Leads par statut */}
      {stats.leads_by_status && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Leads par statut</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(stats.leads_by_status).map(([status, count]) => (
              <div key={status} className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{count}</p>
                <p className="text-sm text-gray-600 capitalize mt-1">{status}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Articles récents */}
      {stats.recent_blog_posts && stats.recent_blog_posts.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Articles récents</h3>
          <div className="space-y-3">
            {stats.recent_blog_posts.map((post) => (
              <div
                key={post.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 truncate">{post.title}</h4>
                  <div className="flex items-center gap-4 mt-1 text-xs text-gray-600">
                    <span>/{post.slug}</span>
                    <span>{post.views} vues</span>
                    <span>
                      {new Date(post.published_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
