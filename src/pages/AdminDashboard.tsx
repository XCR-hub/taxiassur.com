import React, { useState } from 'react';
import { useBlogPosts, useNews, useFAQs, useLeads } from '../hooks/useSupabaseData';
import DataDashboard from '../components/DataDashboard';
import { FileText, Newspaper, MessageSquare, Users, Search } from 'lucide-react';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'blog' | 'news' | 'faq' | 'leads'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: blogPosts, loading: blogLoading } = useBlogPosts(20);
  const { data: news, loading: newsLoading } = useNews(20);
  const { data: faqs, loading: faqLoading } = useFAQs();
  const { data: leads, loading: leadsLoading } = useLeads(undefined, 50);

  const tabs = [
    { id: 'dashboard', label: 'Tableau de bord', icon: FileText },
    { id: 'blog', label: 'Blog', icon: FileText, count: blogPosts.length },
    { id: 'news', label: 'Actualités', icon: Newspaper, count: news.length },
    { id: 'faq', label: 'FAQ', icon: MessageSquare, count: faqs.length },
    { id: 'leads', label: 'Leads', icon: Users, count: leads.length }
  ];

  const filterData = (data: any[], searchFields: string[]) => {
    if (!searchQuery) return data;

    return data.filter(item =>
      searchFields.some(field =>
        item[field]?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Administration</h1>
          <p className="text-gray-600">Gérez votre contenu et vos leads depuis Supabase</p>
        </div>

        {/* Barre de recherche */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              id="search"
              name="search"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 pb-4 px-1 border-b-2 transition-colors ${
                    isActive
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      isActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Contenu */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {activeTab === 'dashboard' && <DataDashboard />}

          {activeTab === 'blog' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Articles de blog</h2>
              {blogLoading ? (
                <div className="text-center py-8">Chargement...</div>
              ) : (
                <div className="space-y-4">
                  {filterData(blogPosts, ['title', 'excerpt', 'category']).map((post) => (
                    <div key={post.id} className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-1">{post.title}</h3>
                          <p className="text-sm text-gray-600 mb-2">{post.excerpt}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded">{post.category}</span>
                            <span>{post.views} vues</span>
                            <span>{post.read_time} min</span>
                            <span>
                              {new Date(post.published_at || post.created_at).toLocaleDateString('fr-FR')}
                            </span>
                          </div>
                        </div>
                        <span className={`px-3 py-1 text-xs rounded-full ${
                          post.published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {post.published ? 'Publié' : 'Brouillon'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'news' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Actualités</h2>
              {newsLoading ? (
                <div className="text-center py-8">Chargement...</div>
              ) : (
                <div className="space-y-4">
                  {filterData(news, ['title', 'excerpt', 'category']).map((item) => (
                    <div key={item.id} className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                      <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
                      <p className="text-sm text-gray-600 mb-2">{item.excerpt}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="px-2 py-1 bg-green-50 text-green-700 rounded">{item.category}</span>
                        <span>{item.views} vues</span>
                        <span>
                          {new Date(item.published_at).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'faq' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Questions fréquentes</h2>
              {faqLoading ? (
                <div className="text-center py-8">Chargement...</div>
              ) : (
                <div className="space-y-4">
                  {filterData(faqs, ['question', 'answer', 'category']).map((faq) => (
                    <div key={faq.id} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <MessageSquare className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-2">{faq.question}</h3>
                          <p className="text-sm text-gray-600 mb-2">{faq.answer}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded">{faq.category}</span>
                            <span>{faq.views} vues</span>
                            <span>👍 {faq.helpful_count}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'leads' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Leads</h2>
              {leadsLoading ? (
                <div className="text-center py-8">Chargement...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Contact
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ville
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Statut
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filterData(leads, ['first_name', 'last_name', 'email', 'city']).map((lead) => (
                        <tr key={lead.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {lead.first_name} {lead.last_name}
                            </div>
                            <div className="text-sm text-gray-500">{lead.email}</div>
                            <div className="text-sm text-gray-500">{lead.phone}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {lead.city}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div>{lead.vehicle_type}</div>
                            <div className="text-xs text-gray-500">{lead.contract_type}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              lead.status === 'nouveau' ? 'bg-blue-100 text-blue-800' :
                              lead.status === 'contacte' ? 'bg-yellow-100 text-yellow-800' :
                              lead.status === 'converti' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {lead.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(lead.created_at).toLocaleDateString('fr-FR')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
