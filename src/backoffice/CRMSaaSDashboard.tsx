import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { logger } from '@/lib/logger';
import {
  Users, Mail, Phone, MessageSquare, Calendar, FileText, CheckCircle,
  XCircle, Clock, TrendingUp, Send, Sparkles, Plus, Edit, Trash2, Download, Target,
  BarChart3, Activity, DollarSign, Zap, Eye, ArrowRight, Star, Tag,
  RefreshCw, Home, Settings, Bell, Search, Filter, Menu, X,
  LayoutDashboard, UserPlus, Briefcase, PieChart, LineChart,
  TrendingDown, AlertCircle, Award, MousePointer, Car, Building2,
  Newspaper, Link2, MapPin, ChevronRight, ChevronDown
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Contact {
  id: string;
  email: string;
  phone: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  city?: string;
  contact_type: 'prospect_taxi' | 'client' | 'partner_media' | 'partner_directory' | 'backlink_site' | 'unknown';
  stage: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
  lead_score: number;
  conversion_probability: number;
  estimated_value?: number;
  created_at: string;
  last_contact_at?: string;
}

interface Stats {
  totalContacts: number;
  newToday: number;
  clients: number;
  prospects: number;
  pipelineValue: number;
  conversionRate: number;
  avgScore: number;
  thisMonth: number;
}

const STAGES = [
  { id: 'new', label: 'Nouveau', color: 'bg-blue-500', textColor: 'text-blue-700', bgColor: 'bg-blue-50' },
  { id: 'contacted', label: 'Contacté', color: 'bg-purple-500', textColor: 'text-purple-700', bgColor: 'bg-purple-50' },
  { id: 'qualified', label: 'Qualifié', color: 'bg-yellow-500', textColor: 'text-yellow-700', bgColor: 'bg-yellow-50' },
  { id: 'proposal', label: 'Devis envoyé', color: 'bg-orange-500', textColor: 'text-orange-700', bgColor: 'bg-orange-50' },
  { id: 'negotiation', label: 'Négociation', color: 'bg-pink-500', textColor: 'text-pink-700', bgColor: 'bg-pink-50' },
  { id: 'closed_won', label: 'Client', color: 'bg-green-500', textColor: 'text-green-700', bgColor: 'bg-green-50' },
  { id: 'closed_lost', label: 'Perdu', color: 'bg-red-500', textColor: 'text-red-700', bgColor: 'bg-red-50' }
];

const CRMSaaSDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState<'dashboard' | 'contacts' | 'pipeline' | 'analytics'>('dashboard');

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStage, setFilterStage] = useState<string>('all');

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      logger.info('🔄 Chargement données CRM SaaS...');

      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (leadsError) {
        logger.error('Erreur chargement leads:', leadsError);
        setLoading(false);
        return;
      }

      const transformedContacts: Contact[] = (leadsData || []).map(lead => ({
        id: lead.id,
        email: lead.email || '',
        phone: lead.phone || '',
        first_name: lead.first_name || lead.name?.split(' ')[0],
        last_name: lead.last_name || lead.name?.split(' ').slice(1).join(' '),
        company_name: lead.company_name,
        city: lead.city,
        contact_type: 'prospect_taxi',
        stage: mapStatusToStage(lead.lead_status || lead.status || 'nouveau'),
        lead_score: lead.lead_score || lead.behavior_score || 0,
        conversion_probability: lead.conversion_probability || lead.behavior_score || 0,
        estimated_value: lead.estimated_value,
        created_at: lead.created_at,
        last_contact_at: lead.last_contact_at || lead.contacted_at
      }));

      logger.info(`✅ ${transformedContacts.length} contacts chargés`);
      setContacts(transformedContacts);
      setLoading(false);
    } catch (error) {
      logger.error('Erreur chargement données:', error);
      setLoading(false);
    }
  };

  const mapStatusToStage = (status: string): Contact['stage'] => {
    const mapping: Record<string, Contact['stage']> = {
      'nouveau': 'new',
      'new': 'new',
      'contacte': 'contacted',
      'contacted': 'contacted',
      'qualifie': 'qualified',
      'qualified': 'qualified',
      'devis_envoye': 'proposal',
      'proposal': 'proposal',
      'negociation': 'negotiation',
      'negotiation': 'negotiation',
      'client': 'closed_won',
      'closed_won': 'closed_won',
      'perdu': 'closed_lost',
      'closed_lost': 'closed_lost'
    };
    return mapping[status?.toLowerCase()] || 'new';
  };

  const stats: Stats = useMemo(() => {
    const total = contacts.length;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const newToday = contacts.filter(c => {
      const created = new Date(c.created_at);
      created.setHours(0, 0, 0, 0);
      return created.getTime() === today.getTime();
    }).length;

    const clients = contacts.filter(c => c.stage === 'closed_won').length;
    const prospects = contacts.filter(c => c.contact_type === 'prospect_taxi' && c.stage !== 'closed_won').length;

    const thisMonth = contacts.filter(c => {
      const created = new Date(c.created_at);
      const now = new Date();
      return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
    }).length;

    const pipelineValue = contacts
      .filter(c => c.stage !== 'closed_won' && c.stage !== 'closed_lost')
      .reduce((sum, c) => sum + (c.estimated_value || 3500), 0);

    const conversionRate = prospects > 0 ? (clients / (prospects + clients)) * 100 : 0;

    const avgScore = total > 0
      ? contacts.reduce((sum, c) => sum + c.lead_score, 0) / total
      : 0;

    return {
      totalContacts: total,
      newToday,
      clients,
      prospects,
      pipelineValue,
      conversionRate,
      avgScore,
      thisMonth
    };
  }, [contacts]);

  const filteredContacts = useMemo(() => {
    return contacts.filter(contact => {
      const matchesSearch = searchQuery === '' ||
        contact.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.company_name?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType = filterType === 'all' || contact.contact_type === filterType;
      const matchesStage = filterStage === 'all' || contact.stage === filterStage;

      return matchesSearch && matchesType && matchesStage;
    });
  }, [contacts, searchQuery, filterType, filterStage]);

  const pipelineByStage = useMemo(() => {
    return STAGES.map(stage => ({
      ...stage,
      count: contacts.filter(c => c.stage === stage.id).length,
      value: contacts.filter(c => c.stage === stage.id).reduce((sum, c) => sum + (c.estimated_value || 3500), 0)
    }));
  }, [contacts]);

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-sm font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
              +{stats.thisMonth} ce mois
            </span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-1">{stats.totalContacts}</h3>
          <p className="text-sm text-gray-600">Total Contacts</p>
          <div className="mt-3 pt-3 border-t border-gray-100">
            <span className="text-xs text-gray-500">{stats.newToday} nouveau(x) aujourd'hui</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-sm font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
              {stats.conversionRate.toFixed(1)}% conv.
            </span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-1">{stats.clients}</h3>
          <p className="text-sm text-gray-600">Clients Actifs</p>
          <div className="mt-3 pt-3 border-t border-gray-100">
            <span className="text-xs text-gray-500">{stats.prospects} prospects en cours</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
              <Target className="w-6 h-6 text-orange-600" />
            </div>
            <span className="text-sm font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
              Score {stats.avgScore.toFixed(0)}
            </span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-1">{stats.prospects}</h3>
          <p className="text-sm text-gray-600">Prospects Actifs</p>
          <div className="mt-3 pt-3 border-t border-gray-100">
            <span className="text-xs text-gray-500">Score moyen: {stats.avgScore.toFixed(1)}/100</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
            <span className="text-sm font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
              Pipeline
            </span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-1">{(stats.pipelineValue / 1000).toFixed(0)}K €</h3>
          <p className="text-sm text-gray-600">Valeur Pipeline</p>
          <div className="mt-3 pt-3 border-t border-gray-100">
            <span className="text-xs text-gray-500">Opportunités en cours</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              Pipeline Commercial
            </h3>
            <button
              onClick={() => setActiveSection('pipeline')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              Voir détail
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3">
            {pipelineByStage.map(stage => (
              <div key={stage.id} className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{stage.label}</span>
                    <span className="text-sm font-bold text-gray-900">{stage.count} contacts</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${stage.color} transition-all duration-500`}
                      style={{ width: `${stats.totalContacts > 0 ? (stage.count / stats.totalContacts) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                {stage.value > 0 && (
                  <div className="text-right">
                    <span className="text-sm font-bold text-gray-900">{(stage.value / 1000).toFixed(0)}K€</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-600" />
              Activité Récente
            </h3>
          </div>
          <div className="space-y-4">
            {contacts.slice(0, 8).map((contact, idx) => (
              <div key={contact.id} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0 last:pb-0">
                <div className={`w-8 h-8 rounded-full ${STAGES.find(s => s.id === contact.stage)?.color} flex items-center justify-center text-white text-xs font-bold`}>
                  {contact.first_name?.[0]}{contact.last_name?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {contact.first_name} {contact.last_name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{contact.email}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(contact.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${STAGES.find(s => s.id === contact.stage)?.bgColor} ${STAGES.find(s => s.id === contact.stage)?.textColor}`}>
                  {STAGES.find(s => s.id === contact.stage)?.label}
                </span>
              </div>
            ))}
          </div>
          <button
            onClick={() => setActiveSection('contacts')}
            className="w-full mt-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm font-medium"
          >
            Voir tous les contacts
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Performance du Mois
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats.thisMonth}</div>
              <div className="text-xs text-gray-600 mt-1">Nouveaux contacts</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.conversionRate.toFixed(1)}%</div>
              <div className="text-xs text-gray-600 mt-1">Taux conversion</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{stats.avgScore.toFixed(0)}</div>
              <div className="text-xs text-gray-600 mt-1">Score moyen</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{(stats.pipelineValue / 1000).toFixed(0)}K</div>
              <div className="text-xs text-gray-600 mt-1">Pipeline (€)</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-600" />
            Top Prospects
          </h3>
          <div className="space-y-3">
            {contacts
              .filter(c => c.stage !== 'closed_won' && c.stage !== 'closed_lost')
              .sort((a, b) => b.lead_score - a.lead_score)
              .slice(0, 5)
              .map((contact, idx) => (
                <div key={contact.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white text-xs font-bold">
                    #{idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {contact.first_name} {contact.last_name}
                    </p>
                    <p className="text-xs text-gray-500">Score: {contact.lead_score}/100</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-gray-900">{(contact.estimated_value || 3500) / 1000}K€</div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderContacts = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un contact..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <select
            value={filterStage}
            onChange={(e) => setFilterStage(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tous les stages</option>
            {STAGES.map(stage => (
              <option key={stage.id} value={stage.id}>{stage.label}</option>
            ))}
          </select>

          <button
            onClick={loadData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Actualiser
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Téléphone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ville</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stage</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valeur</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredContacts.map(contact => {
                const stage = STAGES.find(s => s.id === contact.stage);
                return (
                  <tr key={contact.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full ${stage?.color} flex items-center justify-center text-white font-bold`}>
                          {contact.first_name?.[0]}{contact.last_name?.[0]}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {contact.first_name} {contact.last_name}
                          </div>
                          {contact.company_name && (
                            <div className="text-xs text-gray-500">{contact.company_name}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{contact.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{contact.phone || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{contact.city || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${stage?.bgColor} ${stage?.textColor}`}>
                        {stage?.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 h-2 rounded-full transition-all"
                            style={{ width: `${contact.lead_score}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-700">{contact.lead_score}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {((contact.estimated_value || 3500) / 1000).toFixed(1)}K€
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(contact.created_at).toLocaleDateString('fr-FR')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredContacts.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Aucun contact trouvé</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderPipeline = () => (
    <div className="space-y-6">
      <div className="flex gap-4 overflow-x-auto pb-4">
        {pipelineByStage.map(stage => (
          <div key={stage.id} className="flex-shrink-0 w-80">
            <div className={`${stage.color} text-white rounded-t-lg p-4`}>
              <h3 className="font-bold text-lg mb-1">{stage.label}</h3>
              <div className="flex items-center justify-between text-sm opacity-90">
                <span>{stage.count} contacts</span>
                {stage.value > 0 && <span>{(stage.value / 1000).toFixed(0)}K €</span>}
              </div>
            </div>

            <div className="bg-white rounded-b-lg border border-gray-200 p-3 space-y-2 min-h-[400px] max-h-[600px] overflow-y-auto">
              {contacts
                .filter(c => c.stage === stage.id)
                .map(contact => (
                  <div
                    key={contact.id}
                    className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-sm text-gray-900">
                        {contact.first_name} {contact.last_name}
                      </h4>
                      <span className="text-xs font-bold text-gray-700">{contact.lead_score}</span>
                    </div>
                    {contact.company_name && (
                      <p className="text-xs text-gray-600 mb-2">{contact.company_name}</p>
                    )}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">{contact.city || 'N/A'}</span>
                      {contact.estimated_value && (
                        <span className="font-medium text-green-600">
                          {(contact.estimated_value / 1000).toFixed(1)}K€
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              {contacts.filter(c => c.stage === stage.id).length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-sm">Aucun contact</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Chargement du CRM...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <div
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-gradient-to-b from-slate-900 to-slate-800 text-white transition-all duration-300 flex-shrink-0 border-r border-slate-700`}
      >
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-slate-700">
            <div className="flex items-center justify-between">
              {sidebarOpen && (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h1 className="font-bold text-sm">CRM SaaS Pro</h1>
                    <p className="text-xs text-slate-400">TaxiAssur</p>
                  </div>
                </div>
              )}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            <button
              onClick={() => setActiveSection('dashboard')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                activeSection === 'dashboard'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span className="text-sm font-medium">Dashboard</span>}
            </button>

            <button
              onClick={() => setActiveSection('contacts')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                activeSection === 'contacts'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Users className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && (
                <div className="flex items-center justify-between flex-1">
                  <span className="text-sm font-medium">Contacts</span>
                  <span className="text-xs bg-slate-600 px-2 py-0.5 rounded-full">{stats.totalContacts}</span>
                </div>
              )}
            </button>

            <button
              onClick={() => setActiveSection('pipeline')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                activeSection === 'pipeline'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Target className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && (
                <div className="flex items-center justify-between flex-1">
                  <span className="text-sm font-medium">Pipeline</span>
                  <span className="text-xs bg-slate-600 px-2 py-0.5 rounded-full">{stats.prospects}</span>
                </div>
              )}
            </button>

            <button
              onClick={() => setActiveSection('analytics')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                activeSection === 'analytics'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              <PieChart className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span className="text-sm font-medium">Analytics</span>}
            </button>

            <div className="pt-4 mt-4 border-t border-slate-700">
              <button
                onClick={() => navigate('/backoffice')}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-700 transition-colors"
              >
                <Home className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span className="text-sm font-medium">Retour Dashboard</span>}
              </button>
            </div>
          </nav>

          <div className="p-4 border-t border-slate-700">
            {sidebarOpen && (
              <div className="bg-slate-700 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                    MA
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">Master Admin</p>
                    <p className="text-xs text-slate-400 truncate">admin@taxiassur.com</p>
                  </div>
                </div>
                <button className="w-full px-3 py-1.5 bg-slate-600 hover:bg-slate-500 rounded text-xs font-medium transition-colors">
                  Paramètres
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {activeSection === 'dashboard' && 'Dashboard'}
                {activeSection === 'contacts' && `Contacts (${filteredContacts.length})`}
                {activeSection === 'pipeline' && 'Pipeline Commercial'}
                {activeSection === 'analytics' && 'Analytics'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {activeSection === 'dashboard' && 'Vue d\'ensemble de votre activité'}
                {activeSection === 'contacts' && 'Gestion de tous vos contacts prospects et clients'}
                {activeSection === 'pipeline' && 'Suivi du cycle de vente complet'}
                {activeSection === 'analytics' && 'Analyses et statistiques détaillées'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative">
                <Bell className="w-5 h-5 text-gray-600" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <button
                onClick={loadData}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Actualiser
              </button>
              <button
                onClick={() => {}}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Nouveau Contact
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeSection === 'dashboard' && renderDashboard()}
          {activeSection === 'contacts' && renderContacts()}
          {activeSection === 'pipeline' && renderPipeline()}
          {activeSection === 'analytics' && (
            <div className="text-center py-12">
              <PieChart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Analytics Avancées</h3>
              <p className="text-gray-600">Section en cours de développement</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CRMSaaSDashboard;
