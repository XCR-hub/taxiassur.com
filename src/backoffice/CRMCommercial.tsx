import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { logger } from '@/lib/logger';
import {
  Phone, Mail, MessageSquare, Calendar, FileText, CheckCircle,
  XCircle, Clock, TrendingUp, Users, Send, Sparkles, Upload,
  AlertCircle, ChevronRight, Filter, Search, Plus, Edit, Trash2,
  Download, Target, BarChart3, Activity, DollarSign, Zap, Eye,
  ArrowRight, Star, Tag, ExternalLink, RefreshCw, TrendingDown
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import DocumentsViewer from './DocumentsViewer';
import EmailTrendline from './EmailTrendline';

interface Lead {
  id: string;
  email: string;
  phone: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  activity_type: string;
  vehicle_count: number;
  lead_score: number;
  conversion_probability: number;
  stage: string;
  status: string;
  created_at: string;
  last_contact_at?: string;
  next_followup_at?: string;
  estimated_value?: number;
}

interface Interaction {
  id: string;
  type: string;
  direction: string;
  subject?: string;
  content?: string;
  sentiment_score?: number;
  created_at: string;
}

interface Document {
  id: string;
  file_name: string;
  document_type: string;
  status: string;
  uploaded_at: string;
}

interface AISuggestion {
  id: string;
  suggestion_type: string;
  suggestion_text: string;
  reasoning: string;
  priority_score: number;
  urgency: string;
  suggested_content: any;
}

interface Stats {
  total_leads: number;
  hot_leads: number;
  conversion_rate: number;
  avg_deal_value: number;
  pipeline_value: number;
  this_month_conversions: number;
}

const CRMCommercial: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [aiSuggestions, setAISuggestions] = useState<AISuggestion[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [stats, setStats] = useState<Stats>({
    total_leads: 0,
    hot_leads: 0,
    conversion_rate: 0,
    avg_deal_value: 0,
    pipeline_value: 0,
    this_month_conversions: 0
  });

  const [activeTab, setActiveTab] = useState<'overview' | 'interactions' | 'documents' | 'ai' | 'analytics'>('overview');
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [sortBy, setSortBy] = useState<'score' | 'date' | 'value'>('score');

  const [emailForm, setEmailForm] = useState({ subject: '', content: '' });
  const [smsForm, setSmsForm] = useState({ content: '' });
  const [callNote, setCallNote] = useState('');
  const [quickNote, setQuickNote] = useState('');
  const [isImproving, setIsImproving] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const stages = ['Nouveau Lead', 'Premier Contact', 'Qualifié', 'Devis Envoyé', 'Négociation', 'Accord Verbal', 'Contrat Signé', 'Perdu'];

  useEffect(() => {
    loadMyLeads();
    loadNotifications();
    loadStats();

    // Vérifier si un lead spécifique est demandé dans l'URL
    const leadIdFromUrl = searchParams.get('lead');
    if (leadIdFromUrl) {
      console.log('📧 Lead ID from URL:', leadIdFromUrl);
      // Charger et ouvrir ce lead automatiquement
      setTimeout(() => {
        loadAndSelectLeadById(leadIdFromUrl);
      }, 1000);
    }

    const notifSubscription = supabase
      .channel('crm_notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'crm_notifications'
      }, handleNewNotification)
      .subscribe();

    const interval = setInterval(() => {
      loadStats();
      if (selectedLead) {
        loadLeadDetails(selectedLead.id);
      }
    }, 30000);

    return () => {
      notifSubscription.unsubscribe();
      clearInterval(interval);
    };
  }, [searchParams]);

  useEffect(() => {
    if (selectedLead) {
      loadLeadDetails(selectedLead.id);
    }
  }, [selectedLead]);

  const loadStats = async () => {
    const { data: leadsData } = await supabase
      .from('leads')
      .select('behavior_score, lead_status, prime_realisee, created_at, client_at');

    if (leadsData) {
      const thisMonth = new Date();
      thisMonth.setDate(1);

      const hotLeads = leadsData.filter(l => (l.behavior_score || 0) >= 70).length;
      const signedThisMonth = leadsData.filter(
        l => l.lead_status === 'client' && l.client_at && new Date(l.client_at) >= thisMonth
      ).length;

      const totalValue = leadsData
        .filter(l => l.lead_status !== 'perdu' && l.lead_status !== 'client')
        .reduce((sum, l) => sum + (Number(l.prime_realisee) || 0), 0);

      const avgValue = leadsData.length > 0
        ? leadsData.reduce((sum, l) => sum + (Number(l.prime_realisee) || 0), 0) / leadsData.length
        : 0;

      const clientCount = leadsData.filter(l => l.lead_status === 'client').length;

      setStats({
        total_leads: leadsData.length,
        hot_leads: hotLeads,
        conversion_rate: leadsData.length > 0
          ? (clientCount / leadsData.length) * 100
          : 0,
        avg_deal_value: avgValue,
        pipeline_value: totalValue,
        this_month_conversions: signedThisMonth
      });
    }
  };

  const loadAndSelectLeadById = async (leadId: string) => {
    try {
      console.log('🔍 Loading lead with ID:', leadId);

      const { data: leadData, error } = await supabase
        .from('leads')
        .select('id, name, email, phone, city, status, lead_status, behavior_score, prime_realisee, created_at, contacted_at, devis_envoye_at, client_at, assigned_to, notes')
        .eq('id', leadId)
        .maybeSingle();

      if (error) {
        console.error('❌ Error loading lead:', error);
        logger.error('Error loading specific lead:', error);
        return;
      }

      if (!leadData) {
        console.warn('⚠️ Lead not found with ID:', leadId);
        return;
      }

      console.log('✅ Lead found:', leadData.name);

      // Transform to match interface
      const transformedLead: Lead = {
        id: leadData.id,
        email: leadData.email,
        phone: leadData.phone,
        first_name: leadData.name?.split(' ')[0] || '',
        last_name: leadData.name?.split(' ').slice(1).join(' ') || '',
        company_name: '',
        activity_type: leadData.status || 'taxi',
        vehicle_count: 1,
        lead_score: leadData.behavior_score || 0,
        conversion_probability: leadData.behavior_score || 0,
        stage: mapLeadStatusToStage(leadData.lead_status),
        status: leadData.lead_status || 'nouveau',
        created_at: leadData.created_at,
        last_contact_at: leadData.contacted_at || null,
        next_followup_at: null,
        estimated_value: Number(leadData.prime_realisee) || 0,
      };

      // Sélectionner le lead automatiquement
      setSelectedLead(transformedLead);

      // Scroller vers le détail du lead
      setTimeout(() => {
        const detailElement = document.querySelector('[data-lead-detail]');
        if (detailElement) {
          detailElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 300);

    } catch (error) {
      console.error('❌ Error in loadAndSelectLeadById:', error);
      logger.error('Error loading and selecting lead:', error);
    }
  };

  const loadMyLeads = async () => {
    let query = supabase
      .from('leads')
      .select('id, name, email, phone, city, status, lead_status, behavior_score, prime_realisee, created_at, contacted_at, devis_envoye_at, client_at, assigned_to, notes')
      .limit(200);

    if (sortBy === 'score') {
      query = query.order('behavior_score', { ascending: false, nullsLast: true });
    } else if (sortBy === 'date') {
      query = query.order('created_at', { ascending: false });
    } else {
      query = query.order('prime_realisee', { ascending: false, nullsLast: true });
    }

    const { data, error } = await query;

    if (data) {
      // Transform data to match expected interface
      const transformedLeads = data.map(lead => ({
        id: lead.id,
        email: lead.email,
        phone: lead.phone,
        first_name: lead.name?.split(' ')[0] || '',
        last_name: lead.name?.split(' ').slice(1).join(' ') || '',
        company_name: '',
        activity_type: lead.status || 'taxi',
        vehicle_count: 1,
        lead_score: lead.behavior_score || 0,
        conversion_probability: lead.behavior_score || 0,
        stage: mapLeadStatusToStage(lead.lead_status),
        status: lead.lead_status || 'nouveau',
        created_at: lead.created_at,
        last_contact_at: lead.contacted_at || null,
        next_followup_at: null,
        estimated_value: Number(lead.prime_realisee) || 0,
      }));
      setLeads(transformedLeads);
    }
    if (error) {
      logger.error('Error loading leads:', error);
    }
  };

  const mapLeadStatusToStage = (status?: string): string => {
    const statusMap: Record<string, string> = {
      'nouveau': 'Nouveau Lead',
      'contacte': 'Premier Contact',
      'qualifie': 'Qualifié',
      'devis_envoye': 'Devis Envoyé',
      'negociation': 'Négociation',
      'accord_verbal': 'Accord Verbal',
      'client': 'Contrat Signé',
      'perdu': 'Perdu'
    };
    return statusMap[status || 'nouveau'] || 'Nouveau Lead';
  };

  const loadLeadDetails = async (leadId: string) => {
    const [interactionsRes, crmDocsRes, prospectDocsRes, suggestionsRes] = await Promise.all([
      supabase.from('crm_interactions')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false }),

      supabase.from('crm_documents')
        .select('*')
        .eq('lead_id', leadId)
        .order('uploaded_at', { ascending: false }),

      supabase.from('prospect_documents')
        .select('*')
        .eq('lead_id', leadId)
        .order('uploaded_at', { ascending: false }),

      supabase.from('crm_ai_suggestions')
        .select('*')
        .eq('lead_id', leadId)
        .eq('status', 'pending')
        .order('priority_score', { ascending: false })
    ]);

    if (interactionsRes.data) setInteractions(interactionsRes.data);

    const allDocuments = [
      ...(crmDocsRes.data || []),
      ...(prospectDocsRes.data || []).map(doc => ({
        ...doc,
        document_type: doc.document_type,
        file_name: doc.file_name,
        uploaded_at: doc.uploaded_at,
        status: doc.status
      }))
    ].sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime());

    setDocuments(allDocuments);
    if (suggestionsRes.data) setAISuggestions(suggestionsRes.data);
  };

  const loadNotifications = async () => {
    const { data } = await supabase
      .from('crm_notifications')
      .select('*')
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) setNotifications(data);
  };

  const handleNewNotification = (payload: any) => {
  const navigate = useNavigate();
setNotifications(prev => [payload.new, ...prev]);

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('TaxiAssur CRM', {
        body: payload.new.message,
        icon: '/logo.svg'
      });
    }
  };

  const updateLeadStage = async (leadId: string, newStage: string) => {
    const { error } = await supabase
      .from('leads')
      .update({
        stage: newStage,
        last_contact_at: new Date().toISOString()
      })
      .eq('id', leadId);

    if (!error) {
      loadMyLeads();
      if (selectedLead?.id === leadId) {
        setSelectedLead(prev => prev ? { ...prev, stage: newStage } : null);
      }
    }
  };

  const addQuickNote = async () => {
    if (!selectedLead || !quickNote) return;

    await supabase.from('crm_interactions').insert({
      lead_id: selectedLead.id,
      type: 'note',
      direction: 'internal',
      content: quickNote
    });

    setQuickNote('');
    loadLeadDetails(selectedLead.id);
  };

  const improveEmailWithAI = async () => {
    if (!selectedLead || !emailForm.content) return;

    setIsImproving(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crm-ai-assistant`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'improve_email',
            lead_id: selectedLead.id,
            content: emailForm.content
          })
        }
      );

      const data = await response.json();

      if (data.success) {
        setEmailForm(prev => ({
          ...prev,
          content: data.improved_content
        }));
      }
    } catch (error) {
      logger.error('Error improving email:', error);
    } finally {
      setIsImproving(false);
    }
  };

  const sendEmail = async () => {
    if (!selectedLead || !emailForm.subject || !emailForm.content) {
      alert('⚠️ Veuillez remplir tous les champs (sujet et contenu)');
      return;
    }

    setIsSendingEmail(true);

    try {
      logger.log('📧 Envoi email à:', selectedLead.email);

      // Créer un timeout de 30 secondes
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-crm-email`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            to_email: selectedLead.email,
            to_name: `${selectedLead.first_name || ''} ${selectedLead.last_name || ''}`.trim() || selectedLead.email,
            subject: emailForm.subject,
            content: emailForm.content,
            lead_id: selectedLead.id
          }),
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);

      logger.log('📬 Réponse serveur:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('❌ Erreur HTTP:', errorText);
        throw new Error(`Erreur ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      logger.log('✅ Résultat:', result);

      if (!result.success) {
        throw new Error(result.error || 'Erreur inconnue lors de l\'envoi');
      }

      // Enregistrer l'interaction dans la base
      const { error: dbError } = await supabase.from('crm_interactions').insert({
        lead_id: selectedLead.id,
        type: 'email',
        direction: 'outbound',
        subject: emailForm.subject,
        content: emailForm.content,
        to_email: selectedLead.email
      });

      if (dbError) {
        logger.error('⚠️ Erreur BDD (interaction):', dbError);
      }

      // Succès !
      alert('✅ Email envoyé avec succès à ' + selectedLead.email + ' !\n\nUn email de confirmation sera visible dans l\'onglet Interactions.');
      setEmailForm({ subject: '', content: '' });

      // Recharger les détails du lead
      await loadLeadDetails(selectedLead.id);

    } catch (error: any) {
      logger.error('❌ Erreur envoi email:', error);

      if (error.name === 'AbortError') {
        alert('⏱️ Timeout: L\'envoi a pris trop de temps (>30s).\n\nVérifiez votre connexion internet et réessayez.');
      } else if (error.message.includes('BREVO_API_KEY')) {
        alert('🔑 Configuration manquante: La clé API Brevo n\'est pas configurée.\n\nContactez l\'administrateur système.');
      } else {
        alert('❌ Erreur lors de l\'envoi de l\'email:\n\n' + error.message + '\n\nVérifiez:\n- Que l\'adresse email est valide\n- Votre connexion internet\n- Les logs de la console (F12)');
      }
    } finally {
      setIsSendingEmail(false);
    }
  };

  const sendSMS = async () => {
    if (!selectedLead || !smsForm.content) {
      alert('Veuillez saisir le SMS');
      return;
    }

    const { error } = await supabase.from('crm_interactions').insert({
      lead_id: selectedLead.id,
      type: 'sms',
      direction: 'outbound',
      content: smsForm.content,
      to_phone: selectedLead.phone
    });

    if (!error) {
      alert('SMS envoyé !');
      setSmsForm({ content: '' });
      loadLeadDetails(selectedLead.id);
    }
  };

  const logCall = async () => {
    if (!selectedLead || !callNote) {
      alert('Veuillez saisir un compte-rendu');
      return;
    }

    const { error } = await supabase.from('crm_interactions').insert({
      lead_id: selectedLead.id,
      type: 'call',
      direction: 'outbound',
      content: callNote
    });

    if (!error) {
      alert('Appel enregistré');
      setCallNote('');
      loadLeadDetails(selectedLead.id);
    }
  };

  const exportLeads = () => {
    const csv = [
      ['Email', 'Téléphone', 'Nom', 'Entreprise', 'Score', 'Stage', 'Probabilité', 'Valeur'].join(','),
      ...filteredLeads.map(l => [
        l.email,
        l.phone,
        `${l.first_name || ''} ${l.last_name || ''}`,
        l.company_name || '',
        l.lead_score,
        l.stage,
        l.conversion_probability,
        l.estimated_value || 0
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedLead || !event.target.files || event.target.files.length === 0) return;

    const file = event.target.files[0];
    const filePath = `leads/${selectedLead.id}/${Date.now()}_${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from('crm-documents')
      .upload(filePath, file);

    if (uploadError) {
      alert('Erreur upload : ' + uploadError.message);
      return;
    }

    const { error: dbError } = await supabase.from('crm_documents').insert({
      lead_id: selectedLead.id,
      file_name: file.name,
      file_type: file.type,
      file_size_bytes: file.size,
      storage_path: filePath,
      document_type: 'other'
    });

    if (!dbError) {
      alert('Document uploadé !');
      loadLeadDetails(selectedLead.id);
    }
  };

  const acceptSuggestion = async (suggestionId: string) => {
    await supabase.from('crm_ai_suggestions')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', suggestionId);

    loadLeadDetails(selectedLead!.id);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-blue-600 bg-blue-100';
    if (score >= 40) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getStageColor = (stage: string) => {
    const colors: Record<string, string> = {
      'Nouveau Lead': 'bg-blue-500',
      'Premier Contact': 'bg-purple-500',
      'Qualifié': 'bg-green-500',
      'Devis Envoyé': 'bg-yellow-500',
      'Négociation': 'bg-orange-500',
      'Accord Verbal': 'bg-teal-500',
      'Contrat Signé': 'bg-green-600',
      'Perdu': 'bg-red-500'
    };
    return colors[stage] || 'bg-gray-500';
  };

  const filteredLeads = leads.filter(lead => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        lead.email?.toLowerCase().includes(query) ||
        lead.phone?.toLowerCase().includes(query) ||
        lead.first_name?.toLowerCase().includes(query) ||
        lead.last_name?.toLowerCase().includes(query) ||
        lead.company_name?.toLowerCase().includes(query)
      );
    }

    if (filter === 'all') return true;
    if (filter === 'hot') return lead.lead_score >= 70;
    if (filter === 'urgent') return lead.next_followup_at && new Date(lead.next_followup_at) < new Date();
    return lead.stage === filter;
  });

  const groupedByStage = stages.reduce((acc, stage) => {
    acc[stage] = filteredLeads.filter(l => l.stage === stage);
    return acc;
  }, {} as Record<string, Lead[]>);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
                <Target className="text-blue-600" size={32} />
                CRM Commercial Ultra
              </h1>
              <p className="text-gray-600 mt-1">Performance en temps réel • {stats.total_leads} leads actifs</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => loadMyLeads()}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium rounded-lg transition-colors"
              >
                <RefreshCw size={18} />
                Actualiser
              </button>

              <button
                onClick={exportLeads}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
              >
                <Download size={18} />
                Exporter CSV
              </button>

              <a
                href="/backoffice/automations"
                className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
              >
                <Zap size={18} />
                Automatisations
              </a>

              <button onClick={() => navigate("/backoffice")} className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                <Users size={18} />
                Menu Admin
              </button>

              <div className="relative">
                {notifications.length > 0 && (
                  <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    {notifications.length}
                  </div>
                )}
                <button className="p-2 hover:bg-gray-100 rounded-lg">
                  <AlertCircle className="text-gray-600" size={24} />
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-6 gap-3 mt-4">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <Users size={20} className="opacity-80" />
                <TrendingUp size={16} className="opacity-80" />
              </div>
              <div className="text-2xl font-black">{stats.total_leads}</div>
              <div className="text-xs opacity-90 mt-1">Total Leads</div>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-red-500 text-white rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <Zap size={20} className="opacity-80" />
                <Activity size={16} className="opacity-80" />
              </div>
              <div className="text-2xl font-black">{stats.hot_leads}</div>
              <div className="text-xs opacity-90 mt-1">Leads Chauds (≥70)</div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <Target size={20} className="opacity-80" />
                <CheckCircle size={16} className="opacity-80" />
              </div>
              <div className="text-2xl font-black">{stats.conversion_rate.toFixed(1)}%</div>
              <div className="text-xs opacity-90 mt-1">Taux Conversion</div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <DollarSign size={20} className="opacity-80" />
                <TrendingUp size={16} className="opacity-80" />
              </div>
              <div className="text-2xl font-black">{Math.round(stats.avg_deal_value)}€</div>
              <div className="text-xs opacity-90 mt-1">Valeur Moyenne</div>
            </div>

            <div className="bg-gradient-to-br from-yellow-500 to-amber-600 text-white rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <BarChart3 size={20} className="opacity-80" />
                <Activity size={16} className="opacity-80" />
              </div>
              <div className="text-2xl font-black">{Math.round(stats.pipeline_value)}€</div>
              <div className="text-xs opacity-90 mt-1">Pipeline Total</div>
            </div>

            <div className="bg-gradient-to-br from-teal-500 to-cyan-600 text-white rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <Star size={20} className="opacity-80" />
                <Calendar size={16} className="opacity-80" />
              </div>
              <div className="text-2xl font-black">{stats.this_month_conversions}</div>
              <div className="text-xs opacity-90 mt-1">Ce Mois-ci</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto px-6 py-6">
        <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 flex items-center gap-2">
              <Search className="text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Rechercher un lead par email, téléphone, nom..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 outline-none text-gray-900 text-lg font-medium"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value as any);
                  loadMyLeads();
                }}
                className="px-4 py-2 bg-gray-100 text-gray-900 rounded-lg font-medium border-2 border-gray-200 focus:border-blue-500 outline-none"
              >
                <option value="score">Trier par Score</option>
                <option value="date">Trier par Date</option>
                <option value="value">Trier par Valeur</option>
              </select>

              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-2 rounded font-medium transition-colors ${
                    viewMode === 'list'
                      ? 'bg-white text-blue-600 shadow'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Liste
                </button>
                <button
                  onClick={() => setViewMode('kanban')}
                  className={`px-4 py-2 rounded font-medium transition-colors ${
                    viewMode === 'kanban'
                      ? 'bg-white text-blue-600 shadow'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Kanban
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-2">
            {[
              { key: 'all', label: 'Tous', icon: Users },
              { key: 'hot', label: 'Chauds', icon: Zap },
              { key: 'urgent', label: 'Urgents', icon: AlertCircle },
              ...stages.slice(0, 5).map(s => ({ key: s, label: s, icon: Target }))
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  filter === f.key
                    ? 'bg-blue-600 text-white shadow-lg scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <f.icon size={16} />
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {viewMode === 'list' ? (
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-4">
              <div className="bg-white rounded-xl shadow-lg max-h-[calc(100vh-400px)] overflow-y-auto">
                {filteredLeads.map(lead => (
                  <div
                    key={lead.id}
                    onClick={() => setSelectedLead(lead)}
                    className={`p-5 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-all ${
                      selectedLead?.id === lead.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 text-lg mb-1">
                          {lead.first_name} {lead.last_name}
                          {!lead.first_name && !lead.last_name && lead.email}
                        </h3>
                        <p className="text-sm text-gray-600 mb-1">{lead.company_name || lead.email}</p>
                        <p className="text-xs text-gray-500">{lead.phone}</p>
                      </div>
                      <div className={`px-4 py-2 rounded-xl text-2xl font-black ${getScoreColor(lead.lead_score)}`}>
                        {lead.lead_score}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mb-2">
                      <div className={`h-2 flex-1 rounded-full ${getStageColor(lead.stage)}`} />
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-gray-700">{lead.stage}</span>
                      <span className="text-gray-500">{lead.vehicle_count} véh. • {lead.conversion_probability}%</span>
                    </div>

                    {lead.estimated_value && (
                      <div className="mt-2 flex items-center gap-2 text-sm font-bold text-green-600">
                        <DollarSign size={14} />
                        {lead.estimated_value}€
                      </div>
                    )}
                  </div>
                ))}

                {filteredLeads.length === 0 && (
                  <div className="p-12 text-center text-gray-500">
                    <Search className="mx-auto mb-4 text-gray-300" size={48} />
                    <p className="font-medium">Aucun lead trouvé</p>
                  </div>
                )}
              </div>
            </div>

            <div className="col-span-8">
              {!selectedLead ? (
                <div className="bg-white rounded-xl shadow-lg p-16 text-center">
                  <Users className="mx-auto text-gray-300 mb-6" size={80} />
                  <h3 className="text-2xl font-black text-gray-900 mb-3">
                    Sélectionnez un lead
                  </h3>
                  <p className="text-gray-600 text-lg">
                    Choisissez un prospect dans la liste pour voir tous les détails et interagir
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg p-6 border-2 border-gray-100">
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex-1">
                        <h2 className="text-3xl font-black text-gray-900 mb-2">
                          {selectedLead.first_name} {selectedLead.last_name}
                        </h2>
                        <p className="text-gray-600 text-lg mb-3">{selectedLead.company_name || selectedLead.email}</p>

                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2 text-gray-700">
                            <Mail size={18} />
                            <span className="font-medium">{selectedLead.email}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-700">
                            <Phone size={18} />
                            <span className="font-medium">{selectedLead.phone}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm text-gray-600 mb-1">Probabilité</div>
                          <div className="text-3xl font-black text-green-600">
                            {selectedLead.conversion_probability}%
                          </div>
                        </div>
                        <div className={`px-6 py-4 rounded-2xl text-5xl font-black ${getScoreColor(selectedLead.lead_score)}`}>
                          {selectedLead.lead_score}
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-4 mb-4">
                      <label className="block text-sm font-bold text-gray-700 mb-2">Étape actuelle :</label>
                      <select
                        value={selectedLead.stage}
                        onChange={(e) => updateLeadStage(selectedLead.id, e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg font-bold text-gray-900 focus:border-blue-500 outline-none"
                      >
                        {stages.map(stage => (
                          <option key={stage} value={stage}>{stage}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <button
                        onClick={() => window.open(`tel:${selectedLead.phone}`)}
                        className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl transition-all hover:scale-105"
                      >
                        <Phone size={20} />
                        Appeler
                      </button>
                      <button
                        onClick={() => setActiveTab('interactions')}
                        className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all hover:scale-105"
                      >
                        <Mail size={20} />
                        Email
                      </button>
                      <a
                        href={`/backoffice/whatsapp?phone=${selectedLead.phone}`}
                        className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl transition-all hover:scale-105"
                      >
                        <MessageSquare size={20} />
                        WhatsApp
                      </a>
                    </div>

                    <div className="mt-4">
                      <input
                        type="text"
                        placeholder="Note rapide... (Appuyez sur Entrée)"
                        value={quickNote}
                        onChange={(e) => setQuickNote(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addQuickNote()}
                        className="w-full px-4 py-3 bg-yellow-50 border-2 border-yellow-200 rounded-lg text-gray-900 placeholder-yellow-600 focus:border-yellow-400 outline-none"
                      />
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-lg">
                    <div className="border-b border-gray-200 px-6 py-4">
                      <div className="flex items-center gap-3">
                        {[
                          { key: 'overview', label: 'Vue d\'ensemble', icon: TrendingUp },
                          { key: 'interactions', label: 'Interactions', icon: MessageSquare },
                          { key: 'documents', label: 'Documents', icon: FileText },
                          { key: 'analytics', label: 'Analytics Emails', icon: BarChart3 },
                          { key: 'ai', label: 'IA Suggestions', icon: Sparkles }
                        ].map(tab => (
                          <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key as any)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all ${
                              activeTab === tab.key
                                ? 'bg-blue-600 text-white shadow-lg'
                                : 'text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            <tab.icon size={18} />
                            {tab.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="p-6">
                      {activeTab === 'overview' && (
                        <div className="space-y-6">
                          <div className="grid grid-cols-3 gap-4">
                            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6">
                              <div className="text-sm text-blue-700 font-bold mb-2">Interactions</div>
                              <div className="text-4xl font-black text-blue-900">{interactions.length}</div>
                            </div>
                            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6">
                              <div className="text-sm text-green-700 font-bold mb-2">Documents</div>
                              <div className="text-4xl font-black text-green-900">{documents.length}</div>
                            </div>
                            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6">
                              <div className="text-sm text-purple-700 font-bold mb-2">Actions IA</div>
                              <div className="text-4xl font-black text-purple-900">{aiSuggestions.length}</div>
                            </div>
                          </div>

                          <div>
                            <h4 className="font-black text-gray-900 text-xl mb-4">Timeline Récente</h4>
                            <div className="space-y-3">
                              {interactions.slice(0, 8).map(interaction => (
                                <div key={interaction.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                                  <div className={`p-3 rounded-xl ${
                                    interaction.type === 'email' ? 'bg-blue-100 text-blue-600' :
                                    interaction.type === 'sms' ? 'bg-purple-100 text-purple-600' :
                                    interaction.type === 'note' ? 'bg-yellow-100 text-yellow-600' :
                                    'bg-green-100 text-green-600'
                                  }`}>
                                    {interaction.type === 'email' ? <Mail size={20} /> :
                                     interaction.type === 'sms' ? <MessageSquare size={20} /> :
                                     interaction.type === 'note' ? <FileText size={20} /> :
                                     <Phone size={20} />}
                                  </div>
                                  <div className="flex-1">
                                    <div className="font-bold text-gray-900 mb-1">{interaction.subject || interaction.type.toUpperCase()}</div>
                                    <div className="text-sm text-gray-700 line-clamp-2 mb-2">{interaction.content}</div>
                                    <div className="text-xs text-gray-500">
                                      {new Date(interaction.created_at).toLocaleString('fr-FR')}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {activeTab === 'interactions' && (
                        <div className="space-y-6">
                          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6">
                            <h4 className="font-black text-blue-900 mb-4 flex items-center text-xl">
                              <Mail className="mr-3" size={24} />
                              Envoyer un Email
                            </h4>

                            <input
                              type="text"
                              placeholder="Objet de l'email"
                              value={emailForm.subject}
                              onChange={(e) => setEmailForm(prev => ({ ...prev, subject: e.target.value }))}
                              className="w-full px-4 py-3 rounded-lg border-2 border-blue-200 mb-3 text-gray-900 font-medium focus:border-blue-400 outline-none"
                            />

                            <textarea
                              placeholder="Contenu de l'email..."
                              value={emailForm.content}
                              onChange={(e) => setEmailForm(prev => ({ ...prev, content: e.target.value }))}
                              rows={8}
                              className="w-full px-4 py-3 rounded-lg border-2 border-blue-200 mb-3 text-gray-900 focus:border-blue-400 outline-none"
                            />

                            <div className="flex items-center gap-3">
                              <button
                                onClick={improveEmailWithAI}
                                disabled={isImproving || !emailForm.content}
                                className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg disabled:opacity-50 transition-all"
                              >
                                <Sparkles size={18} />
                                {isImproving ? 'IA en cours...' : 'Améliorer avec IA'}
                              </button>

                              <button
                                onClick={sendEmail}
                                disabled={!emailForm.subject || !emailForm.content || isSendingEmail}
                                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                              >
                                {isSendingEmail ? (
                                  <>
                                    <RefreshCw size={18} className="animate-spin" />
                                    Envoi en cours...
                                  </>
                                ) : (
                                  <>
                                    <Send size={18} />
                                    Envoyer
                                  </>
                                )}
                              </button>
                            </div>
                          </div>

                          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6">
                            <h4 className="font-black text-purple-900 mb-4 flex items-center text-xl">
                              <MessageSquare className="mr-3" size={24} />
                              Envoyer un SMS
                            </h4>

                            <textarea
                              placeholder="Message SMS (160 caractères max)..."
                              value={smsForm.content}
                              onChange={(e) => setSmsForm({ content: e.target.value.slice(0, 160) })}
                              rows={4}
                              className="w-full px-4 py-3 rounded-lg border-2 border-purple-200 mb-3 text-gray-900 focus:border-purple-400 outline-none"
                            />

                            <div className="flex items-center justify-between mb-3">
                              <span className="text-sm text-purple-700 font-bold">
                                {smsForm.content.length} / 160 caractères
                              </span>
                            </div>

                            <div className="flex items-center gap-3">
                              <button
                                onClick={sendSMS}
                                disabled={!smsForm.content}
                                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg disabled:opacity-50 transition-all"
                              >
                                <Send size={18} />
                                Envoyer SMS
                              </button>
                            </div>
                          </div>

                          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6">
                            <h4 className="font-black text-green-900 mb-4 flex items-center text-xl">
                              <Phone className="mr-3" size={24} />
                              Logger un Appel
                            </h4>

                            <textarea
                              placeholder="Compte-rendu de l'appel..."
                              value={callNote}
                              onChange={(e) => setCallNote(e.target.value)}
                              rows={5}
                              className="w-full px-4 py-3 rounded-lg border-2 border-green-200 mb-3 text-gray-900 focus:border-green-400 outline-none"
                            />

                            <button
                              onClick={logCall}
                              disabled={!callNote}
                              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg disabled:opacity-50 transition-all"
                            >
                              <CheckCircle size={18} />
                              Enregistrer l'appel
                            </button>
                          </div>
                        </div>
                      )}

                      {activeTab === 'documents' && selectedLead && (
                        <DocumentsViewer leadId={selectedLead.id} />
                      )}

                      {activeTab === 'analytics' && selectedLead && (
                        <EmailTrendline leadId={selectedLead.id} period="month" />
                      )}

                      {activeTab === 'ai' && (
                        <div className="space-y-4">
                          <h4 className="font-black text-gray-900 text-xl flex items-center">
                            <Sparkles className="mr-3 text-purple-600" size={24} />
                            Suggestions IA en Temps Réel
                          </h4>

                          <div className="space-y-4">
                            {aiSuggestions.map(suggestion => (
                              <div
                                key={suggestion.id}
                                className={`p-6 rounded-xl border-2 ${
                                  suggestion.urgency === 'critical' ? 'border-red-500 bg-red-50' :
                                  suggestion.urgency === 'high' ? 'border-orange-500 bg-orange-50' :
                                  'border-blue-500 bg-blue-50'
                                }`}
                              >
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className={`px-3 py-1 rounded-lg text-xs font-black ${
                                        suggestion.urgency === 'critical' ? 'bg-red-600 text-white' :
                                        suggestion.urgency === 'high' ? 'bg-orange-600 text-white' :
                                        'bg-blue-600 text-white'
                                      }`}>
                                        {suggestion.urgency.toUpperCase()}
                                      </span>
                                      <span className="text-sm text-gray-600 font-bold">
                                        Score: {suggestion.priority_score}/100
                                      </span>
                                    </div>

                                    <h5 className="font-black text-gray-900 text-lg mb-2">
                                      {suggestion.suggestion_text}
                                    </h5>

                                    <p className="text-sm text-gray-700 mb-3">
                                      {suggestion.reasoning}
                                    </p>
                                  </div>
                                </div>

                                <button
                                  onClick={() => acceptSuggestion(suggestion.id)}
                                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-all"
                                >
                                  <CheckCircle size={18} />
                                  Accepter et exécuter
                                </button>
                              </div>
                            ))}

                            {aiSuggestions.length === 0 && (
                              <div className="text-center py-16">
                                <Sparkles className="mx-auto text-gray-300 mb-6" size={64} />
                                <p className="text-gray-600 font-medium text-lg">
                                  Aucune suggestion IA pour le moment
                                </p>
                                <p className="text-sm text-gray-500 mt-2">
                                  L'IA analyse en continu et vous proposera des actions optimales
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto pb-6">
            <div className="flex gap-4" style={{ minWidth: 'max-content' }}>
              {stages.map(stage => (
                <div key={stage} className="bg-white rounded-xl shadow-lg p-4" style={{ width: '320px' }}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-black text-gray-900">{stage}</h3>
                    <span className="bg-gray-200 text-gray-900 px-3 py-1 rounded-full text-sm font-bold">
                      {groupedByStage[stage]?.length || 0}
                    </span>
                  </div>

                  <div className="space-y-3 max-h-[calc(100vh-350px)] overflow-y-auto">
                    {groupedByStage[stage]?.map(lead => (
                      <div
                        key={lead.id}
                        onClick={() => setSelectedLead(lead)}
                        className="p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-all border-2 border-transparent hover:border-blue-500"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-bold text-gray-900 text-sm">
                            {lead.first_name} {lead.last_name || lead.email}
                          </h4>
                          <div className={`px-2 py-1 rounded text-xs font-black ${getScoreColor(lead.lead_score)}`}>
                            {lead.lead_score}
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 mb-2">{lead.company_name}</p>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">{lead.vehicle_count} véh.</span>
                          <span className="font-bold text-green-600">{lead.conversion_probability}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CRMCommercial;
