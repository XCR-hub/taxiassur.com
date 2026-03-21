import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Mail, TrendingUp, Target, Brain,
  MessageSquare, CheckCircle, Clock, AlertCircle,
  Sparkles, Home, RefreshCw, Filter, Search,
  Send, Eye, MousePointer, Reply, Award,
  Briefcase, Newspaper, Link2, Car
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface UnifiedContact {
  id: string;
  email: string;
  name: string;
  company_name: string;
  website: string;
  phone: string;
  contact_type: 'prospect_taxi' | 'client' | 'partner_media' | 'partner_directory' | 'backlink_site' | 'unknown';
  status: 'new' | 'contacted' | 'engaged' | 'converted' | 'inactive';
  source: string;
  classification_confidence: number;
  conversion_score: number;
  last_contact_at: string;
  created_at: string;
  ai_notes: Record<string, unknown>;
}

interface Campaign {
  id: string;
  name: string;
  campaign_type: string;
  status: string;
  total_sent: number;
  total_opened: number;
  total_clicked: number;
  total_replied: number;
  total_converted: number;
  conversion_rate: number;
}

interface AIDecision {
  id: string;
  decision_type: string;
  ai_agent: string;
  decision_made: Record<string, unknown>;
  confidence_score: number;
  created_at: string;
  success: boolean;
}

const CRMUniversal: React.FC = () => {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<UnifiedContact[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [aiDecisions, setAIDecisions] = useState<AIDecision[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [stats, setStats] = useState({
    totalContacts: 0,
    newContacts: 0,
    activeConversations: 0,
    conversionRate: 0,
    prospectsTaxi: 0,
    clients: 0,
    partnersMedia: 0,
    partnersDirectory: 0,
    backlinkSites: 0,
    aiDecisionsToday: 0
  });

  useEffect(() => {
    loadData();
  }, [filterType, filterStatus]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Charger d'abord les leads de la table principale
      let leadsQuery = supabase
        .from('crm_leads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      const { data: leadsData, error: leadsError } = await leadsQuery;

      if (leadsError) {
        console.error('Erreur chargement leads:', leadsError);
      }

      // Transformer les leads en unified_contacts format
      const transformedContacts = (leadsData || []).map(lead => ({
        id: lead.id,
        email: lead.email || '',
        name: lead.name || '',
        company_name: '',
        website: '',
        phone: lead.phone || '',
        contact_type: lead.status === 'taxi' ? 'prospect_taxi' : 'unknown' as const,
        status: (lead.lead_status === 'nouveau' ? 'new' :
                 lead.lead_status === 'contacté' ? 'contacted' :
                 lead.lead_status === 'client' ? 'converted' : 'new') as const,
        source: 'website',
        classification_confidence: lead.behavior_score || 0,
        conversion_score: lead.behavior_score || 0,
        last_contact_at: lead.contacted_at || lead.created_at,
        created_at: lead.created_at,
        ai_notes: { notes: lead.notes }
      }));

      // Essayer aussi de charger unified_contacts s'il existe
      let query = supabase
        .from('unified_contacts')
        .select('*')
        .order('created_at', { ascending: false });

      if (filterType !== 'all') {
        query = query.eq('contact_type', filterType);
      }

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      if (searchQuery) {
        query = query.or(`email.ilike.%${searchQuery}%,name.ilike.%${searchQuery}%,company_name.ilike.%${searchQuery}%`);
      }

      const { data: contactsData, error: contactsError } = await query.limit(100);

      // Combiner les deux sources, prioriser unified_contacts
      const finalContacts = contactsData && contactsData.length > 0
        ? contactsData
        : transformedContacts;

      const { data: campaignsData } = await supabase
        .from('unified_email_campaigns')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      const { data: decisionsData } = await supabase
        .from('ai_decision_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      // Compter depuis unified_contacts si disponible, sinon depuis leads
      let { count: totalCount } = await supabase
        .from('unified_contacts')
        .select('*', { count: 'exact', head: true });

      if (!totalCount) {
        const { count: leadsCount } = await supabase
          .from('crm_leads')
          .select('*', { count: 'exact', head: true });
        totalCount = leadsCount || 0;
      }

      const { count: newCount } = await supabase
        .from('crm_leads')
        .select('*', { count: 'exact', head: true })
        .eq('lead_status', 'nouveau');

      const { count: conversationsCount } = await supabase
        .from('crm_interactions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      const { count: prospectsTaxiCount } = await supabase
        .from('crm_leads')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'taxi');

      const { count: clientsCount } = await supabase
        .from('crm_leads')
        .select('*', { count: 'exact', head: true })
        .eq('lead_status', 'client');

      const { count: partnersMediaCount } = await supabase
        .from('partners')
        .select('*', { count: 'exact', head: true });

      const { count: partnersDirectoryCount } = await supabase
        .from('outreach_prospects')
        .select('*', { count: 'exact', head: true });

      const { count: backlinkSitesCount } = await supabase
        .from('backlinks_sites')
        .select('*', { count: 'exact', head: true });

      const { count: aiDecisionsTodayCount } = await supabase
        .from('ai_decision_log')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString());

      const { count: convertedCount } = await supabase
        .from('crm_leads')
        .select('*', { count: 'exact', head: true })
        .eq('lead_status', 'client');

      const conversionRate = totalCount ? ((convertedCount || 0) / totalCount * 100) : 0;

      setContacts(finalContacts || []);
      setCampaigns(campaignsData || []);
      setAIDecisions(decisionsData || []);
      setStats({
        totalContacts: totalCount || 0,
        newContacts: newCount || 0,
        activeConversations: conversationsCount || 0,
        conversionRate: Math.round(conversionRate * 10) / 10,
        prospectsTaxi: prospectsTaxiCount || 0,
        clients: clientsCount || 0,
        partnersMedia: partnersMediaCount || 0,
        partnersDirectory: partnersDirectoryCount || 0,
        backlinkSites: backlinkSitesCount || 0,
        aiDecisionsToday: aiDecisionsTodayCount || 0
      });

    } catch (error) {
      console.error('Erreur chargement données:', error);
    } finally {
      setLoading(false);
    }
  };

  const getContactTypeIcon = (type: string) => {
    switch (type) {
      case 'prospect_taxi': return <Car className="text-orange-600" size={20} />;
      case 'client': return <Award className="text-green-600" size={20} />;
      case 'partner_media': return <Newspaper className="text-blue-600" size={20} />;
      case 'partner_directory': return <Briefcase className="text-purple-600" size={20} />;
      case 'backlink_site': return <Link2 className="text-indigo-600" size={20} />;
      default: return <Users className="text-gray-400" size={20} />;
    }
  };

  const getContactTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      prospect_taxi: 'Prospect Taxi',
      client: 'Client',
      partner_media: 'Partenaire Média',
      partner_directory: 'Partenaire Annuaire',
      backlink_site: 'Site Backlink',
      unknown: 'Non classifié'
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; label: string }> = {
      new: { color: 'bg-blue-100 text-blue-800', label: 'Nouveau' },
      contacted: { color: 'bg-yellow-100 text-yellow-800', label: 'Contacté' },
      engaged: { color: 'bg-purple-100 text-purple-800', label: 'Engagé' },
      converted: { color: 'bg-green-100 text-green-800', label: 'Converti' },
      inactive: { color: 'bg-gray-100 text-gray-800', label: 'Inactif' }
    };
    const badge = badges[status] || badges.new;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  const getCampaignTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      devis_taxi: 'Devis Taxi',
      backlink_request: 'Demande Backlink',
      partnership_media: 'Partenariat Média',
      partnership_directory: 'Partenariat Annuaire',
      newsletter: 'Newsletter'
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="animate-spin text-orange-600 mx-auto mb-4" size={48} />
          <p className="text-gray-600">Chargement du CRM Universel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <Brain className="text-orange-600" size={36} />
              <h1 className="text-3xl font-bold text-gray-900">CRM Universel Intelligent</h1>
            </div>
            <p className="text-gray-600">Système unifié avec IA collaborative</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={loadData}
              className="bg-white hover:bg-gray-50 text-gray-700 font-medium px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 border border-gray-300"
            >
              <RefreshCw size={16} />
              <span>Actualiser</span>
            </button>
            <button
              onClick={() => navigate('/backoffice/crm-commercial')}
              className="bg-orange-600 hover:bg-orange-700 text-white font-medium px-6 py-2 rounded-lg transition-colors flex items-center space-x-2"
            >
              <Home size={16} />
              <span>Accueil CRM</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <Users size={24} />
              <Sparkles size={20} className="opacity-75" />
            </div>
            <div className="text-3xl font-bold mb-1">{stats.totalContacts}</div>
            <div className="text-orange-100 text-sm">Contacts totaux</div>
            <div className="mt-3 pt-3 border-t border-orange-400">
              <div className="text-xs text-orange-100">
                {stats.newContacts} nouveaux cette semaine
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <MessageSquare size={24} />
              <Brain size={20} className="opacity-75" />
            </div>
            <div className="text-3xl font-bold mb-1">{stats.activeConversations}</div>
            <div className="text-blue-100 text-sm">Conversations actives</div>
            <div className="mt-3 pt-3 border-t border-blue-400">
              <div className="text-xs text-blue-100">
                {stats.aiDecisionsToday} décisions IA aujourd'hui
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <Target size={24} />
              <TrendingUp size={20} className="opacity-75" />
            </div>
            <div className="text-3xl font-bold mb-1">{stats.conversionRate}%</div>
            <div className="text-green-100 text-sm">Taux de conversion</div>
            <div className="mt-3 pt-3 border-t border-green-400">
              <div className="text-xs text-green-100">
                {stats.clients} clients actifs
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <Sparkles size={24} />
              <CheckCircle size={20} className="opacity-75" />
            </div>
            <div className="text-3xl font-bold mb-1">{campaigns.length}</div>
            <div className="text-purple-100 text-sm">Campagnes actives</div>
            <div className="mt-3 pt-3 border-t border-purple-400">
              <div className="text-xs text-purple-100">
                Automatisation IA activée
              </div>
            </div>
          </div>
        </div>

        {/* Type Distribution */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
            <Target size={24} className="text-orange-600" />
            <span>Répartition des contacts</span>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <Car className="text-orange-600 mx-auto mb-2" size={32} />
              <div className="text-2xl font-bold text-gray-900">{stats.prospectsTaxi}</div>
              <div className="text-sm text-gray-600">Prospects Taxi</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <Award className="text-green-600 mx-auto mb-2" size={32} />
              <div className="text-2xl font-bold text-gray-900">{stats.clients}</div>
              <div className="text-sm text-gray-600">Clients</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Newspaper className="text-blue-600 mx-auto mb-2" size={32} />
              <div className="text-2xl font-bold text-gray-900">{stats.partnersMedia}</div>
              <div className="text-sm text-gray-600">Médias</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <Briefcase className="text-purple-600 mx-auto mb-2" size={32} />
              <div className="text-2xl font-bold text-gray-900">{stats.partnersDirectory}</div>
              <div className="text-sm text-gray-600">Annuaires</div>
            </div>
            <div className="text-center p-4 bg-indigo-50 rounded-lg">
              <Link2 className="text-indigo-600 mx-auto mb-2" size={32} />
              <div className="text-2xl font-bold text-gray-900">{stats.backlinkSites}</div>
              <div className="text-sm text-gray-600">Backlinks</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <Filter size={20} className="text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Filtrer par:</span>
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="all">Tous les types</option>
              <option value="prospect_taxi">Prospects Taxi</option>
              <option value="client">Clients</option>
              <option value="partner_media">Partenaires Média</option>
              <option value="partner_directory">Partenaires Annuaire</option>
              <option value="backlink_site">Sites Backlink</option>
              <option value="unknown">Non classifiés</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="all">Tous les statuts</option>
              <option value="new">Nouveaux</option>
              <option value="contacted">Contactés</option>
              <option value="engaged">Engagés</option>
              <option value="converted">Convertis</option>
              <option value="inactive">Inactifs</option>
            </select>

            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Rechercher par email, nom, entreprise..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadData()}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>

            <button
              onClick={loadData}
              className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Rechercher
            </button>
          </div>
        </div>

        {/* Contacts List */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
              <Users size={24} className="text-orange-600" />
              <span>Contacts ({contacts.length})</span>
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dernier contact</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {contacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getContactTypeIcon(contact.contact_type)}
                        <span className="text-sm text-gray-900">{getContactTypeLabel(contact.contact_type)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{contact.name || 'Sans nom'}</div>
                      {contact.company_name && (
                        <div className="text-sm text-gray-500">{contact.company_name}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{contact.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(contact.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-orange-600 h-2 rounded-full"
                            style={{ width: `${contact.conversion_score}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-700">{Math.round(contact.conversion_score)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {contact.last_contact_at
                        ? new Date(contact.last_contact_at).toLocaleDateString('fr-FR')
                        : 'Jamais'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Campaigns */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
              <Send size={24} className="text-orange-600" />
              <span>Campagnes automatisées</span>
            </h2>
          </div>
          <div className="divide-y divide-gray-200">
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{campaign.name}</h3>
                    <p className="text-sm text-gray-600">{getCampaignTypeLabel(campaign.campaign_type)}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    campaign.status === 'active' ? 'bg-green-100 text-green-800' :
                    campaign.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {campaign.status === 'active' ? 'Active' : campaign.status === 'paused' ? 'En pause' : 'Terminée'}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <Send className="text-blue-600 mx-auto mb-1" size={20} />
                    <div className="text-lg font-bold text-gray-900">{campaign.total_sent}</div>
                    <div className="text-xs text-gray-600">Envoyés</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <Eye className="text-green-600 mx-auto mb-1" size={20} />
                    <div className="text-lg font-bold text-gray-900">{campaign.total_opened}</div>
                    <div className="text-xs text-gray-600">Ouverts</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <MousePointer className="text-purple-600 mx-auto mb-1" size={20} />
                    <div className="text-lg font-bold text-gray-900">{campaign.total_clicked}</div>
                    <div className="text-xs text-gray-600">Clics</div>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <Reply className="text-orange-600 mx-auto mb-1" size={20} />
                    <div className="text-lg font-bold text-gray-900">{campaign.total_replied}</div>
                    <div className="text-xs text-gray-600">Réponses</div>
                  </div>
                  <div className="text-center p-3 bg-indigo-50 rounded-lg">
                    <Award className="text-indigo-600 mx-auto mb-1" size={20} />
                    <div className="text-lg font-bold text-gray-900">{campaign.conversion_rate}%</div>
                    <div className="text-xs text-gray-600">Conversion</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Decisions Log */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
              <Brain size={24} className="text-orange-600" />
              <span>Journal des décisions IA</span>
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agent IA</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type de décision</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Confiance</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Résultat</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {aiDecisions.map((decision) => (
                  <tr key={decision.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <Brain className="text-purple-600" size={16} />
                        <span className="text-sm font-medium text-gray-900">{decision.ai_agent}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{decision.decision_type}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-purple-600 h-2 rounded-full"
                            style={{ width: `${decision.confidence_score}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-700">{Math.round(decision.confidence_score)}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {decision.success ? (
                        <CheckCircle className="text-green-600" size={20} />
                      ) : (
                        <AlertCircle className="text-red-600" size={20} />
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(decision.created_at).toLocaleString('fr-FR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CRMUniversal;
