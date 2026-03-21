import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { logger } from '@/lib/logger';
import { Users, Mail, Phone, MessageSquare, Calendar, FileText, CheckCircle, XCircle, Clock, TrendingUp, Send, Sparkles, Upload, AlertCircle, ChevronRight, Filter, Search, Plus, CreditCard as Edit, Trash2, Download, Target, BarChart3, Activity, DollarSign, Zap, Eye, ArrowRight, Star, Tag, ExternalLink, RefreshCw, TrendingDown, Home, Settings, Award, Briefcase, Newspaper, Link2, Car, Building2, Globe, MousePointer, Reply, Brain, Share2, Archive, UserPlus, MapPin } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import DocumentsViewer from './DocumentsViewer';
import EmailTrendline from './EmailTrendline';
import EmailComposer from './EmailComposer';

interface Contact {
  id: string;
  email: string;
  phone: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  website?: string;
  activity_type?: string;
  vehicle_count?: number;
  city?: string;

  contact_type: 'prospect_taxi' | 'client' | 'partner_media' | 'partner_directory' | 'backlink_site' | 'unknown';
  stage: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
  status: 'nouveau' | 'contacte' | 'qualifie' | 'devis_envoye' | 'client' | 'perdu' | 'inactive';
  source: string;

  lead_score: number;
  conversion_probability: number;
  classification_confidence?: number;
  conversion_score?: number;
  estimated_value?: number;

  created_at: string;
  last_contact_at?: string;
  next_followup_at?: string;

  ai_notes?: Record<string, unknown>;
  assigned_to?: string;
  tags?: string[];
}

interface Interaction {
  id: string;
  contact_id: string;
  type: 'email' | 'call' | 'sms' | 'whatsapp' | 'meeting' | 'note';
  direction: 'inbound' | 'outbound';
  subject?: string;
  content?: string;
  sentiment_score?: number;
  created_at: string;
  created_by?: string;
}

interface Document {
  id: string;
  contact_id: string;
  file_name: string;
  document_type: string;
  status: string;
  upload_date: string;
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
  contact_id?: string;
  decision_type: string;
  ai_agent: string;
  decision_made: Record<string, unknown>;
  confidence_score: number;
  created_at: string;
  success: boolean;
}

const STAGES = [
  { id: 'new', label: 'Nouveau', color: 'bg-blue-500' },
  { id: 'contacted', label: 'Contacté', color: 'bg-purple-500' },
  { id: 'qualified', label: 'Qualifié', color: 'bg-yellow-500' },
  { id: 'proposal', label: 'Devis envoyé', color: 'bg-orange-500' },
  { id: 'negotiation', label: 'Négociation', color: 'bg-pink-500' },
  { id: 'closed_won', label: 'Client', color: 'bg-green-500' },
  { id: 'closed_lost', label: 'Perdu', color: 'bg-red-500' }
];

const CONTACT_TYPES = [
  { id: 'prospect_taxi', label: 'Prospect Taxi', icon: Car, color: 'text-blue-600' },
  { id: 'client', label: 'Client', icon: CheckCircle, color: 'text-green-600' },
  { id: 'partner_media', label: 'Partenaire Média', icon: Newspaper, color: 'text-purple-600' },
  { id: 'partner_directory', label: 'Annuaire', icon: Building2, color: 'text-orange-600' },
  { id: 'backlink_site', label: 'Site Backlink', icon: Link2, color: 'text-pink-600' },
  { id: 'unknown', label: 'Non classifié', icon: AlertCircle, color: 'text-gray-600' }
];

const CRMMaster: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [aiDecisions, setAiDecisions] = useState<AIDecision[]>([]);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'contacts' | 'pipeline' | 'campaigns' | 'analytics'>('overview');
  const [activeView, setActiveView] = useState<'list' | 'kanban' | 'table'>('list');

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStage, setFilterStage] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');

  const [pageSize] = useState(100);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalContacts, setTotalContacts] = useState(0);

  const [showContactModal, setShowContactModal] = useState(false);
  const [showInteractionModal, setShowInteractionModal] = useState(false);
  const [showEmailComposer, setShowEmailComposer] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);

  useEffect(() => {
    loadAllData();

    const contactId = searchParams.get('contact');
    if (contactId) {
      loadContactDetails(contactId);
    }
  }, [searchParams]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await loadContacts();
      setLoading(false);

      loadCampaigns();
      loadAIDecisions();
    } catch (error) {
      logger.error('Erreur chargement données CRM:', error);
      setLoading(false);
    }
  };

  const loadContacts = async (append = false) => {
    try {
      logger.info('🔍 Chargement des contacts...', { append, currentPage, pageSize });

      const offset = append ? currentPage * pageSize : 0;
      const { data: leadsData, error: leadsError, count: leadsCount } = await supabase
        .from('crm_leads')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1);

      logger.info('📊 Leads reçus:', { count: leadsData?.length, total: leadsCount, error: leadsError });

      const { data: unifiedData, error: unifiedError } = await supabase
        .from('unified_contacts')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + Math.floor(pageSize / 2) - 1);

      logger.info('📊 Unified reçus:', { count: unifiedData?.length, error: unifiedError });

      if (leadsError) logger.error('Erreur leads:', leadsError);
      if (unifiedError) logger.error('Erreur unified:', unifiedError);

      const mergedContacts: Contact[] = [];
      const emailMap = new Map<string, Contact>();

      if (leadsData) {
        leadsData.forEach(lead => {
          const contact: Contact = {
            id: lead.id,
            email: lead.email,
            phone: lead.phone,
            first_name: lead.first_name,
            last_name: lead.last_name,
            company_name: lead.company_name,
            activity_type: lead.activity_type,
            vehicle_count: lead.vehicle_count || 1,
            city: lead.city,
            contact_type: 'prospect_taxi',
            stage: mapStatusToStage(lead.lead_status || lead.status),
            status: lead.lead_status || lead.status || 'nouveau',
            source: lead.utm_source || 'Direct',
            lead_score: lead.lead_score || 0,
            conversion_probability: lead.conversion_probability || 0,
            estimated_value: lead.estimated_value,
            created_at: lead.created_at,
            last_contact_at: lead.last_contact_at,
            next_followup_at: lead.next_followup_at,
            ai_notes: lead.ai_notes,
            assigned_to: lead.assigned_to
          };
          emailMap.set(contact.email, contact);
        });
      }

      if (unifiedData) {
        unifiedData.forEach(unified => {
          if (emailMap.has(unified.email)) {
            const existing = emailMap.get(unified.email)!;
            existing.contact_type = unified.contact_type;
            existing.classification_confidence = unified.classification_confidence;
            existing.conversion_score = unified.conversion_score;
            existing.website = unified.website;
          } else {
            const contact: Contact = {
              id: unified.id,
              email: unified.email,
              phone: unified.phone || '',
              first_name: unified.name?.split(' ')[0],
              last_name: unified.name?.split(' ').slice(1).join(' '),
              company_name: unified.company_name,
              website: unified.website,
              contact_type: unified.contact_type,
              stage: unified.status === 'converted' ? 'closed_won' : 'contacted',
              status: unified.status,
              source: unified.source || 'Unknown',
              lead_score: unified.conversion_score || 0,
              conversion_probability: unified.conversion_score || 0,
              classification_confidence: unified.classification_confidence,
              created_at: unified.created_at,
              last_contact_at: unified.last_contact_at,
              ai_notes: unified.ai_notes
            };
            emailMap.set(contact.email, contact);
          }
        });
      }

      const newContacts = Array.from(emailMap.values());

      logger.info('✅ Contacts fusionnés:', { count: newContacts.length, append });

      if (append) {
        setContacts(prev => [...prev, ...newContacts]);
      } else {
        setContacts(newContacts);
      }

      if (leadsCount !== null) {
        setTotalContacts(leadsCount);
        setHasMore((offset + pageSize) < leadsCount);
      }

      logger.info('✅ État mis à jour:', { totalContacts: leadsCount, hasMore: (offset + pageSize) < leadsCount });
    } catch (error) {
      logger.error('❌ Erreur fusion contacts:', error);
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
      'closed_lost': 'closed_lost',
      'inactive': 'closed_lost'
    };
    return mapping[status] || 'new';
  };

  const loadContactDetails = async (contactId: string) => {
    try {
      const contact = contacts.find(c => c.id === contactId);
      if (contact) {
        setSelectedContact(contact);
        await Promise.all([
          loadInteractions(contactId),
          loadDocuments(contactId)
        ]);
      }
    } catch (error) {
      logger.error('Erreur chargement détails contact:', error);
    }
  };

  const loadInteractions = async (contactId: string) => {
    try {
      const { data, error } = await supabase
        .from('crm_interactions')
        .select('*')
        .eq('lead_id', contactId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        logger.error('Erreur chargement interactions:', error);
        return;
      }

      setInteractions(data || []);
    } catch (error) {
      logger.error('Erreur interactions:', error);
    }
  };

  const loadDocuments = async (contactId: string) => {
    try {
      const { data, error } = await supabase
        .from('lead_documents')
        .select('*')
        .eq('lead_id', contactId)
        .order('upload_date', { ascending: false })
        .limit(20);

      if (error) {
        logger.error('Erreur chargement documents:', error);
        return;
      }

      setDocuments(data || []);
    } catch (error) {
      logger.error('Erreur documents:', error);
    }
  };

  const loadCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('email_campaigns')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (!error && data) {
        setCampaigns(data);
      }
    } catch (error) {
      logger.error('Erreur campaigns:', error);
    }
  };

  const loadAIDecisions = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_decisions_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && data) {
        setAiDecisions(data);
      }
    } catch (error) {
      logger.error('Erreur AI decisions:', error);
    }
  };

  const filteredContacts = useMemo(() => {
    return contacts.filter(contact => {
      const matchesSearch = searchQuery === '' ||
        contact.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.phone?.includes(searchQuery);

      const matchesType = filterType === 'all' || contact.contact_type === filterType;
      const matchesStage = filterStage === 'all' || contact.stage === filterStage;
      const matchesSource = filterSource === 'all' || contact.source === filterSource;

      return matchesSearch && matchesType && matchesStage && matchesSource;
    });
  }, [contacts, searchQuery, filterType, filterStage, filterSource]);

  const stats = useMemo(() => {
    const total = contacts.length;
    const prospects = contacts.filter(c => c.contact_type === 'prospect_taxi').length;
    const clients = contacts.filter(c => c.stage === 'closed_won').length;
    const thisMonth = contacts.filter(c => {
      const created = new Date(c.created_at);
      const now = new Date();
      return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
    }).length;

    const avgScore = contacts.length > 0
      ? contacts.reduce((sum, c) => sum + (c.lead_score || 0), 0) / contacts.length
      : 0;

    const conversionRate = prospects > 0 ? (clients / prospects) * 100 : 0;

    const pipelineValue = contacts
      .filter(c => c.stage !== 'closed_won' && c.stage !== 'closed_lost')
      .reduce((sum, c) => sum + (c.estimated_value || 0), 0);

    return {
      total,
      prospects,
      clients,
      thisMonth,
      avgScore: avgScore.toFixed(1),
      conversionRate: conversionRate.toFixed(1),
      pipelineValue
    };
  }, [contacts]);

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-900/40 to-pink-900/40 rounded-xl border border-purple-500/30 p-6 backdrop-blur-sm mb-6">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Zap className="w-6 h-6 text-yellow-400" />
          Actions Rapides
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => setShowContactModal(true)}
            className="flex items-center gap-3 p-4 bg-slate-800/50 hover:bg-slate-800 rounded-lg transition-all border border-purple-500/30 hover:border-purple-500 text-left group"
          >
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
              <UserPlus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-medium text-white">Nouveau Contact</h3>
              <p className="text-xs text-purple-200">Ajouter un prospect</p>
            </div>
          </button>

          <button
            onClick={() => {
              setActiveTab('contacts');
              setFilterStage('new');
            }}
            className="flex items-center gap-3 p-4 bg-slate-800/50 hover:bg-slate-800 rounded-lg transition-all border border-purple-500/30 hover:border-purple-500 text-left group"
          >
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-medium text-white">Nouveaux Leads</h3>
              <p className="text-xs text-purple-200">Contacts à traiter</p>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('campaigns')}
            className="flex items-center gap-3 p-4 bg-slate-800/50 hover:bg-slate-800 rounded-lg transition-all border border-purple-500/30 hover:border-purple-500 text-left group"
          >
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
              <Send className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-medium text-white">Campagnes</h3>
              <p className="text-xs text-purple-200">Gérer vos emails</p>
            </div>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div
          onClick={() => setActiveTab('contacts')}
          className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg hover:shadow-2xl hover:scale-105 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-4">
            <Users className="w-8 h-8 opacity-80" />
            <span className="text-2xl font-bold">{stats.total}</span>
          </div>
          <h3 className="text-sm font-medium opacity-90">Total Contacts</h3>
          <p className="text-xs opacity-75 mt-1">+{stats.thisMonth} ce mois</p>
          <div className="mt-3 flex items-center gap-1 text-xs font-medium opacity-80">
            Voir tous <ArrowRight className="w-3 h-3" />
          </div>
        </div>

        <div
          onClick={() => {
            setActiveTab('contacts');
            setFilterStage('closed_won');
          }}
          className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg hover:shadow-2xl hover:scale-105 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-4">
            <CheckCircle className="w-8 h-8 opacity-80" />
            <span className="text-2xl font-bold">{stats.clients}</span>
          </div>
          <h3 className="text-sm font-medium opacity-90">Clients</h3>
          <p className="text-xs opacity-75 mt-1">{stats.conversionRate}% conversion</p>
          <div className="mt-3 flex items-center gap-1 text-xs font-medium opacity-80">
            Voir clients <ArrowRight className="w-3 h-3" />
          </div>
        </div>

        <div
          onClick={() => {
            setActiveTab('contacts');
            setFilterType('prospect_taxi');
          }}
          className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg hover:shadow-2xl hover:scale-105 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-4">
            <Target className="w-8 h-8 opacity-80" />
            <span className="text-2xl font-bold">{stats.prospects}</span>
          </div>
          <h3 className="text-sm font-medium opacity-90">Prospects Actifs</h3>
          <p className="text-xs opacity-75 mt-1">Score moyen: {stats.avgScore}/100</p>
          <div className="mt-3 flex items-center gap-1 text-xs font-medium opacity-80">
            Voir prospects <ArrowRight className="w-3 h-3" />
          </div>
        </div>

        <div
          onClick={() => setActiveTab('pipeline')}
          className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg hover:shadow-2xl hover:scale-105 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-4">
            <DollarSign className="w-8 h-8 opacity-80" />
            <span className="text-2xl font-bold">{(stats.pipelineValue / 1000).toFixed(0)}K</span>
          </div>
          <h3 className="text-sm font-medium opacity-90">Valeur Pipeline</h3>
          <p className="text-xs opacity-75 mt-1">Opportunités en cours</p>
          <div className="mt-3 flex items-center gap-1 text-xs font-medium opacity-80">
            Voir pipeline <ArrowRight className="w-3 h-3" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg hover:border-purple-300 transition-all">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Dernières Campagnes
            </h3>
            <button
              onClick={() => setActiveTab('campaigns')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              Voir tout
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3">
            {campaigns.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Send className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Aucune campagne récente</p>
              </div>
            ) : (
              campaigns.slice(0, 5).map(campaign => (
                <div
                  key={campaign.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                  onClick={() => setActiveTab('campaigns')}
                >
                  <div className="flex-1">
                    <h4 className="font-medium text-sm text-gray-900">{campaign.name}</h4>
                    <p className="text-xs text-gray-600 mt-1">
                      {campaign.total_sent} envoyés • {campaign.total_opened} ouvertures
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-green-600">
                      {campaign.conversion_rate.toFixed(1)}%
                    </span>
                    <p className="text-xs text-gray-600">conversion</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg hover:border-purple-300 transition-all">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-600" />
              Décisions IA Récentes
            </h3>
            <button
              onClick={() => setActiveTab('analytics')}
              className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
            >
              Voir tout
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {aiDecisions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Brain className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Aucune décision IA récente</p>
              </div>
            ) : (
              aiDecisions.slice(0, 8).map(decision => (
                <div
                  key={decision.id}
                  className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                  onClick={() => {
                    if (decision.contact_id) {
                      loadContactDetails(decision.contact_id);
                    }
                  }}
                >
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${decision.success ? 'bg-green-500' : 'bg-red-500'}`} />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm text-gray-900">{decision.decision_type}</h4>
                    <p className="text-xs text-gray-600 mt-1">
                      Agent: {decision.ai_agent} • Confiance: {(decision.confidence_score * 100).toFixed(0)}%
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(decision.created_at).toLocaleString('fr-FR')}
                    </p>
                  </div>
                  {decision.contact_id && (
                    <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderContactsList = () => (
    <div className="space-y-4">
      {filteredContacts.map(contact => {
        const contactTypeInfo = CONTACT_TYPES.find(t => t.id === contact.contact_type);
        const stageInfo = STAGES.find(s => s.id === contact.stage);
        const Icon = contactTypeInfo?.icon || Users;

        return (
          <div
            key={contact.id}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => {
              setSelectedContact(contact);
              loadContactDetails(contact.id);
            }}
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-full ${stageInfo?.color} flex items-center justify-center text-white`}>
                <Icon className="w-6 h-6" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900">
                    {contact.first_name} {contact.last_name} {contact.company_name && `(${contact.company_name})`}
                  </h3>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${stageInfo?.color} text-white`}>
                    {stageInfo?.label}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                  <span className="flex items-center gap-1">
                    <Mail className="w-4 h-4" />
                    {contact.email}
                  </span>
                  {contact.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-4 h-4" />
                      {contact.phone}
                    </span>
                  )}
                  {contact.city && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {contact.city}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600">Score:</span>
                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"
                        style={{ width: `${contact.lead_score}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium">{contact.lead_score}/100</span>
                  </div>

                  <span className={`text-xs ${contactTypeInfo?.color}`}>
                    {contactTypeInfo?.label}
                  </span>

                  <span className="text-xs text-gray-500">
                    {new Date(contact.created_at).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedContact(contact);
                    setShowEmailComposer(true);
                  }}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Envoyer un email"
                >
                  <Mail className="w-5 h-5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedContact(contact);
                    setShowWhatsAppModal(true);
                  }}
                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                  title="Envoyer WhatsApp"
                >
                  <MessageSquare className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {hasMore && filteredContacts.length > 0 && (
        <div className="flex justify-center mt-6">
          <button
            onClick={() => {
              setCurrentPage(prev => prev + 1);
              loadContacts(true);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg shadow-purple-500/50"
          >
            <RefreshCw className="w-4 h-4" />
            Charger plus ({totalContacts - contacts.length} restants)
          </button>
        </div>
      )}

      {filteredContacts.length === 0 && (
        <div className="text-center py-12 bg-slate-800/30 rounded-xl border border-purple-500/20">
          <Users className="w-16 h-16 text-purple-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Aucun contact trouvé</h3>
          <p className="text-purple-200">Essayez de modifier vos filtres ou votre recherche</p>
          <div className="mt-4 p-4 bg-slate-900/50 rounded-lg text-left">
            <p className="text-xs text-gray-400 mb-2">Debug Info:</p>
            <pre className="text-xs text-gray-300">{JSON.stringify({
              totalContacts: contacts.length,
              totalInDB: totalContacts,
              filters: { searchQuery, filterType, filterStage, filterSource },
              loading
            }, null, 2)}</pre>
          </div>
          <button
            onClick={() => {
              setSearchQuery('');
              setFilterType('all');
              setFilterStage('all');
              setFilterSource('all');
            }}
            className="mt-4 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
          >
            Réinitialiser les filtres
          </button>
        </div>
      )}
    </div>
  );

  const renderPipeline = () => (
    <div className="space-y-6">
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map(stage => {
          const stageContacts = filteredContacts.filter(c => c.stage === stage.id);
          const stageValue = stageContacts.reduce((sum, c) => sum + (c.estimated_value || 0), 0);

          return (
            <div key={stage.id} className="flex-shrink-0 w-80">
              <div className={`${stage.color} text-white rounded-t-lg p-4`}>
                <h3 className="font-semibold mb-1">{stage.label}</h3>
                <div className="flex items-center justify-between text-sm opacity-90">
                  <span>{stageContacts.length} contacts</span>
                  {stageValue > 0 && <span>{(stageValue / 1000).toFixed(0)}K €</span>}
                </div>
              </div>

              <div className="bg-gray-50 rounded-b-lg p-3 space-y-2 min-h-[400px] max-h-[600px] overflow-y-auto">
                {stageContacts.map(contact => (
                  <div
                    key={contact.id}
                    className="bg-white rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => {
                      setSelectedContact(contact);
                      loadContactDetails(contact.id);
                    }}
                  >
                    <h4 className="font-medium text-sm mb-1">
                      {contact.first_name} {contact.last_name}
                    </h4>
                    {contact.company_name && (
                      <p className="text-xs text-gray-600 mb-2">{contact.company_name}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-700">Score: {contact.lead_score}</span>
                      {contact.estimated_value && (
                        <span className="text-xs font-medium text-green-600">
                          {contact.estimated_value.toLocaleString()} €
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
          <p className="text-purple-300">Chargement du CRM Master...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900">
      <div className="max-w-[1920px] mx-auto p-6">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/backoffice')}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors border border-purple-500/30"
                title="Retour au dashboard"
              >
                <Home className="w-6 h-6 text-purple-400" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                  <Sparkles className="w-8 h-8 text-purple-500 animate-pulse" />
                  CRM Master Ultra-Complet
                </h1>
                <p className="text-slate-200 mt-1">
                  Gestion unifiée de tous vos contacts, prospects et clients
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={loadAllData}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 text-slate-100 rounded-lg hover:bg-slate-800 transition-colors shadow-lg border border-purple-500/30"
              >
                <RefreshCw className="w-4 h-4" />
                Actualiser
              </button>
              <button
                onClick={() => setShowContactModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg shadow-purple-500/50"
              >
                <Plus className="w-4 h-4" />
                Nouveau Contact
              </button>
            </div>
          </div>

          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-lg transition-all ${
                activeTab === 'overview'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/50'
                  : 'bg-slate-800/50 text-slate-100 hover:bg-slate-800 border border-purple-500/30'
              }`}
            >
              <BarChart3 className="w-4 h-4 inline mr-2" />
              Vue d'ensemble
            </button>
            <button
              onClick={() => setActiveTab('contacts')}
              className={`px-4 py-2 rounded-lg transition-all ${
                activeTab === 'contacts'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/50'
                  : 'bg-slate-800/50 text-slate-100 hover:bg-slate-800 border border-purple-500/30'
              }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              Contacts ({filteredContacts.length})
            </button>
            <button
              onClick={() => setActiveTab('pipeline')}
              className={`px-4 py-2 rounded-lg transition-all ${
                activeTab === 'pipeline'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/50'
                  : 'bg-slate-800/50 text-slate-100 hover:bg-slate-800 border border-purple-500/30'
              }`}
            >
              <Target className="w-4 h-4 inline mr-2" />
              Pipeline
            </button>
            <button
              onClick={() => setActiveTab('campaigns')}
              className={`px-4 py-2 rounded-lg transition-all ${
                activeTab === 'campaigns'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/50'
                  : 'bg-slate-800/50 text-slate-100 hover:bg-slate-800 border border-purple-500/30'
              }`}
            >
              <Send className="w-4 h-4 inline mr-2" />
              Campagnes
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-2 rounded-lg transition-all ${
                activeTab === 'analytics'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/50'
                  : 'bg-slate-800/50 text-slate-100 hover:bg-slate-800 border border-purple-500/30'
              }`}
            >
              <Activity className="w-4 h-4 inline mr-2" />
              Analytics
            </button>
          </div>

          {activeTab === 'contacts' && (
            <div className="bg-slate-800/50 rounded-xl shadow-lg border border-purple-500/30 p-4 mb-6 backdrop-blur-sm">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[300px]">
                  <div className="relative">
                    <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-purple-400" />
                    <input
                      type="text"
                      placeholder="Rechercher un contact..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-purple-500/30 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-white placeholder-gray-400"
                    />
                  </div>
                </div>

                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-4 py-2 bg-slate-900/50 border border-purple-500/30 rounded-lg focus:ring-2 focus:ring-purple-500 text-white"
                >
                  <option value="all">Tous les types</option>
                  {CONTACT_TYPES.map(type => (
                    <option key={type.id} value={type.id}>{type.label}</option>
                  ))}
                </select>

                <select
                  value={filterStage}
                  onChange={(e) => setFilterStage(e.target.value)}
                  className="px-4 py-2 bg-slate-900/50 border border-purple-500/30 rounded-lg focus:ring-2 focus:ring-purple-500 text-white"
                >
                  <option value="all">Tous les stages</option>
                  {STAGES.map(stage => (
                    <option key={stage.id} value={stage.id}>{stage.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'contacts' && renderContactsList()}
        {activeTab === 'pipeline' && renderPipeline()}
        {activeTab === 'campaigns' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4">Campagnes Email</h2>
            <EmailTrendline />
          </div>
        )}
        {activeTab === 'analytics' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4">Analytics détaillées</h2>
            <p className="text-gray-600">Section en cours de développement...</p>
          </div>
        )}

        {selectedContact && (
          <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-purple-500/30 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-gradient-to-r from-slate-900 via-purple-900/20 to-slate-900 border-b border-purple-500/30 p-6 flex items-center justify-between backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-purple-500/50">
                    {selectedContact.first_name?.[0]}{selectedContact.last_name?.[0]}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      {selectedContact.first_name} {selectedContact.last_name}
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      <span className="text-purple-300 text-sm">Score: {selectedContact.lead_score || 0}/100</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedContact(null);
                    setInteractions([]);
                    setDocuments([]);
                  }}
                  className="text-gray-400 hover:text-white transition-colors hover:bg-slate-800 p-2 rounded-lg"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-slate-800/50 backdrop-blur-sm border border-purple-500/20 rounded-xl p-4 hover:border-purple-500/40 transition-all">
                    <p className="text-sm text-purple-300 mb-2 flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Email
                    </p>
                    <p className="font-medium text-white">{selectedContact.email}</p>
                  </div>
                  <div className="bg-slate-800/50 backdrop-blur-sm border border-purple-500/20 rounded-xl p-4 hover:border-purple-500/40 transition-all">
                    <p className="text-sm text-purple-300 mb-2 flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      Téléphone
                    </p>
                    <p className="font-medium text-white">{selectedContact.phone || 'N/A'}</p>
                  </div>
                  <div className="bg-slate-800/50 backdrop-blur-sm border border-purple-500/20 rounded-xl p-4 hover:border-purple-500/40 transition-all">
                    <p className="text-sm text-purple-300 mb-2 flex items-center gap-2">
                      <Tag className="w-4 h-4" />
                      Type
                    </p>
                    <p className="font-medium text-white">
                      {CONTACT_TYPES.find(t => t.id === selectedContact.contact_type)?.label}
                    </p>
                  </div>
                  <div className="bg-slate-800/50 backdrop-blur-sm border border-purple-500/20 rounded-xl p-4 hover:border-purple-500/40 transition-all">
                    <p className="text-sm text-purple-300 mb-2 flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Stage
                    </p>
                    <p className="font-medium text-white">
                      {STAGES.find(s => s.id === selectedContact.stage)?.label}
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Activity className="w-5 h-5 text-purple-400" />
                        Interactions ({interactions.length})
                      </h3>
                      <button
                        onClick={() => setShowEmailComposer(true)}
                        className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm rounded-lg hover:from-purple-500 hover:to-pink-500 transition-all flex items-center gap-2"
                      >
                        <Mail className="w-4 h-4" />
                        Envoyer Email
                      </button>
                    </div>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                      {interactions.length === 0 ? (
                        <div className="bg-slate-800/30 backdrop-blur-sm border border-purple-500/10 p-6 rounded-xl text-center">
                          <Activity className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                          <p className="text-gray-400 text-sm">Aucune interaction pour le moment</p>
                        </div>
                      ) : (
                        interactions.map(interaction => {
                          const getIcon = () => {
                            switch (interaction.type) {
                              case 'email': return <Mail className="w-5 h-5" />;
                              case 'call': return <Phone className="w-5 h-5" />;
                              case 'sms': return <MessageSquare className="w-5 h-5" />;
                              case 'whatsapp': return <MessageSquare className="w-5 h-5" />;
                              case 'meeting': return <Calendar className="w-5 h-5" />;
                              default: return <FileText className="w-5 h-5" />;
                            }
                          };

                          const getTypeColor = () => {
                            switch (interaction.type) {
                              case 'email': return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
                              case 'call': return 'text-green-400 bg-green-500/10 border-green-500/30';
                              case 'sms': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
                              case 'whatsapp': return 'text-green-400 bg-green-500/10 border-green-500/30';
                              case 'meeting': return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
                              default: return 'text-gray-400 bg-gray-500/10 border-gray-500/30';
                            }
                          };

                          const isInbound = interaction.direction === 'inbound';

                          return (
                            <div
                              key={interaction.id}
                              className="bg-slate-800/50 backdrop-blur-sm border border-purple-500/20 p-4 rounded-xl hover:border-purple-500/40 transition-all"
                            >
                              <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-lg border ${getTypeColor()}`}>
                                  {getIcon()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <span className="text-sm font-medium text-white capitalize">
                                      {interaction.type}
                                    </span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                                      isInbound
                                        ? 'bg-green-500/20 text-green-300'
                                        : 'bg-blue-500/20 text-blue-300'
                                    }`}>
                                      {isInbound ? 'Entrant' : 'Sortant'}
                                    </span>
                                    {interaction.type === 'email' && interaction.opened_at && (
                                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 flex items-center gap-1">
                                        <Eye className="w-3 h-3" />
                                        Ouvert
                                      </span>
                                    )}
                                    {interaction.type === 'email' && interaction.clicked_at && (
                                      <span className="text-xs px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 flex items-center gap-1">
                                        <MousePointer className="w-3 h-3" />
                                        Cliqué
                                      </span>
                                    )}
                                  </div>

                                  {interaction.subject && (
                                    <p className="text-sm font-medium text-white mb-1">
                                      {interaction.subject}
                                    </p>
                                  )}

                                  {interaction.content && (
                                    <p className="text-sm text-gray-400 line-clamp-2">
                                      {interaction.content}
                                    </p>
                                  )}

                                  {interaction.ai_summary && (
                                    <div className="mt-2 p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
                                      <p className="text-xs text-purple-300 flex items-center gap-1">
                                        <Brain className="w-3 h-3" />
                                        {interaction.ai_summary}
                                      </p>
                                    </div>
                                  )}

                                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {new Date(interaction.created_at).toLocaleString('fr-FR', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </span>
                                    {interaction.response_time_minutes && (
                                      <span className="text-purple-400">
                                        Réponse: {interaction.response_time_minutes}min
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-purple-400" />
                      Documents ({documents.length})
                    </h3>
                    <DocumentsViewer leadId={selectedContact.id} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {showEmailComposer && selectedContact && (
          <EmailComposer
            contact={selectedContact}
            onClose={() => setShowEmailComposer(false)}
            onSent={() => {
              if (selectedContact) {
                loadInteractions(selectedContact.id);
              }
            }}
          />
        )}
      </div>
    </div>
  );
};

export default CRMMaster;
