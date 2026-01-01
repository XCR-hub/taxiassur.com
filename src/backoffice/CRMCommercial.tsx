import React, { useState, useEffect } from 'react';
import {
  Phone, Mail, MessageSquare, Calendar, FileText, CheckCircle,
  XCircle, Clock, TrendingUp, Users, Send, Sparkles, Upload,
  AlertCircle, ChevronRight, Filter, Search, Plus, Edit, Trash2
} from 'lucide-react';
import { supabase } from '../lib/supabase';

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

const CRMCommercial: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [aiSuggestions, setAISuggestions] = useState<AISuggestion[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  const [activeTab, setActiveTab] = useState<'overview' | 'interactions' | 'documents' | 'ai'>('overview');
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Formulaires
  const [emailForm, setEmailForm] = useState({ subject: '', content: '' });
  const [smsForm, setSmsForm] = useState({ content: '' });
  const [callNote, setCallNote] = useState('');
  const [isImproving, setIsImproving] = useState(false);

  useEffect(() => {
    loadMyLeads();
    loadNotifications();

    const notifSubscription = supabase
      .channel('crm_notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'crm_notifications'
      }, handleNewNotification)
      .subscribe();

    return () => {
      notifSubscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (selectedLead) {
      loadLeadDetails(selectedLead.id);
    }
  }, [selectedLead]);

  const loadMyLeads = async () => {
    const { data, error } = await supabase
      .from('crm_leads_enhanced')
      .select('*')
      .order('lead_score', { ascending: false })
      .limit(100);

    if (data) {
      setLeads(data);
    }
    if (error) {
      console.error('Error loading leads:', error);
    }
  };

  const loadLeadDetails = async (leadId: string) => {
    const [interactionsRes, documentsRes, suggestionsRes] = await Promise.all([
      supabase.from('crm_interactions')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false }),

      supabase.from('crm_documents')
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
    if (documentsRes.data) setDocuments(documentsRes.data);
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
    setNotifications(prev => [payload.new, ...prev]);

    new Notification('TaxiAssur CRM', {
      body: payload.new.message,
      icon: '/logo.svg'
    });
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
      console.error('Error improving email:', error);
    } finally {
      setIsImproving(false);
    }
  };

  const sendEmail = async () => {
    if (!selectedLead || !emailForm.subject || !emailForm.content) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    const { error } = await supabase.from('crm_interactions').insert({
      lead_id: selectedLead.id,
      type: 'email',
      direction: 'outbound',
      subject: emailForm.subject,
      content: emailForm.content,
      to_email: selectedLead.email
    });

    if (!error) {
      alert('Email envoyé ! (Simulation - intégration email à configurer)');
      setEmailForm({ subject: '', content: '' });
      loadLeadDetails(selectedLead.id);
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
      alert('SMS envoyé ! (Simulation - intégration SMS à configurer)');
      setSmsForm({ content: '' });
      loadLeadDetails(selectedLead.id);
    }
  };

  const suggestSMS = async () => {
    if (!selectedLead) return;

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crm-ai-assistant`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'suggest_sms',
          lead_id: selectedLead.id
        })
      }
    );

    const data = await response.json();

    if (data.success) {
      setSmsForm({ content: data.suggested_sms });
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
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-blue-500';
    if (score >= 40) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getStageColor = (stage: string) => {
    const colors: Record<string, string> = {
      'Nouveau Lead': 'bg-blue-100 text-blue-800',
      'Premier Contact': 'bg-purple-100 text-purple-800',
      'Qualifié': 'bg-green-100 text-green-800',
      'Devis Envoyé': 'bg-yellow-100 text-yellow-800',
      'Négociation': 'bg-orange-100 text-orange-800',
      'Accord Verbal': 'bg-teal-100 text-teal-800',
      'Contrat Signé': 'bg-green-100 text-green-800',
      'Perdu': 'bg-red-100 text-red-800'
    };
    return colors[stage] || 'bg-gray-100 text-gray-800';
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
    return lead.stage === filter;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container-max py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black text-gray-900">CRM Commercial</h1>
              <p className="text-gray-600">Objectif : 80 contrats signés / 100 devis</p>
            </div>

            <div className="flex items-center space-x-4">
              <a
                href="/backoffice"
                className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold py-2 px-4 rounded-lg transition-colors"
              >
                <Users size={18} />
                <span>Accueil Admin</span>
              </a>
              <div className="relative">
                <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {notifications.length}
                </div>
                <button className="p-2 hover:bg-gray-100 rounded-lg">
                  <AlertCircle className="text-gray-600" size={24} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container-max py-6">
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-4 space-y-4">
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center space-x-2 mb-4">
                <Search className="text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Rechercher un lead..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 outline-none text-gray-900"
                />
              </div>

              <div className="flex items-center space-x-2 overflow-x-auto pb-2">
                {['all', 'Nouveau Lead', 'Qualifié', 'Devis Envoyé', 'Négociation'].map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1 rounded-lg text-sm whitespace-nowrap ${
                      filter === f
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {f === 'all' ? 'Tous' : f}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm max-h-[calc(100vh-250px)] overflow-y-auto">
              {filteredLeads.map(lead => (
                <div
                  key={lead.id}
                  onClick={() => setSelectedLead(lead)}
                  className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                    selectedLead?.id === lead.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-bold text-gray-900">
                        {lead.first_name} {lead.last_name}
                        {!lead.first_name && !lead.last_name && lead.email}
                      </h3>
                      <p className="text-sm text-gray-600">{lead.company_name || lead.email}</p>
                    </div>
                    <div className={`text-2xl font-black ${getScoreColor(lead.lead_score)}`}>
                      {lead.lead_score}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className={`text-xs px-2 py-1 rounded-full ${getStageColor(lead.stage)}`}>
                      {lead.stage}
                    </span>
                    <span className="text-xs text-gray-500">
                      {lead.vehicle_count} véhicule{lead.vehicle_count > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              ))}

              {filteredLeads.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  Aucun lead trouvé
                </div>
              )}
            </div>
          </div>

          <div className="col-span-8">
            {!selectedLead ? (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <Users className="mx-auto text-gray-300 mb-4" size={64} />
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Sélectionnez un lead
                </h3>
                <p className="text-gray-600">
                  Choisissez un prospect dans la liste pour voir ses détails
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-black text-gray-900">
                        {selectedLead.first_name} {selectedLead.last_name}
                      </h2>
                      <p className="text-gray-600">{selectedLead.company_name || selectedLead.email}</p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <div className="text-right mr-4">
                        <div className="text-sm text-gray-600">Prob. conversion</div>
                        <div className="text-2xl font-black text-green-600">
                          {selectedLead.conversion_probability}%
                        </div>
                      </div>
                      <div className={`text-4xl font-black ${getScoreColor(selectedLead.lead_score)}`}>
                        {selectedLead.lead_score}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div className="flex items-center space-x-2">
                      <Mail className="text-gray-400" size={18} />
                      <span className="text-sm text-gray-900">{selectedLead.email}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Phone className="text-gray-400" size={18} />
                      <span className="text-sm text-gray-900">{selectedLead.phone}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="text-gray-400" size={18} />
                      <span className="text-sm text-gray-900">{selectedLead.activity_type}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Users className="text-gray-400" size={18} />
                      <span className="text-sm text-gray-900">{selectedLead.vehicle_count} véhicules</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => window.open(`tel:${selectedLead.phone}`)}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center space-x-2"
                    >
                      <Phone size={20} />
                      <span>Appeler</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('interactions')}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center space-x-2"
                    >
                      <Mail size={20} />
                      <span>Email</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('interactions')}
                      className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center space-x-2"
                    >
                      <MessageSquare size={20} />
                      <span>SMS</span>
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm">
                  <div className="border-b border-gray-200 px-6 py-4">
                    <div className="flex items-center space-x-4">
                      {[
                        { key: 'overview', label: 'Vue d\'ensemble', icon: TrendingUp },
                        { key: 'interactions', label: 'Interactions', icon: MessageSquare },
                        { key: 'documents', label: 'Documents', icon: FileText },
                        { key: 'ai', label: 'IA Suggestions', icon: Sparkles }
                      ].map(tab => (
                        <button
                          key={tab.key}
                          onClick={() => setActiveTab(tab.key as any)}
                          className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-bold ${
                            activeTab === tab.key
                              ? 'bg-blue-100 text-blue-700'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          <tab.icon size={18} />
                          <span>{tab.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-6">
                    {activeTab === 'overview' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                          <div className="bg-blue-50 rounded-lg p-4">
                            <div className="text-sm text-blue-600 mb-1">Total interactions</div>
                            <div className="text-3xl font-black text-blue-900">{interactions.length}</div>
                          </div>
                          <div className="bg-green-50 rounded-lg p-4">
                            <div className="text-sm text-green-600 mb-1">Documents reçus</div>
                            <div className="text-3xl font-black text-green-900">{documents.length}</div>
                          </div>
                          <div className="bg-purple-50 rounded-lg p-4">
                            <div className="text-sm text-purple-600 mb-1">Actions IA suggérées</div>
                            <div className="text-3xl font-black text-purple-900">{aiSuggestions.length}</div>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-bold text-gray-900 mb-2">Historique récent</h4>
                          <div className="space-y-2">
                            {interactions.slice(0, 5).map(interaction => (
                              <div key={interaction.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                                <div className={`p-2 rounded-full ${
                                  interaction.type === 'email' ? 'bg-blue-100 text-blue-600' :
                                  interaction.type === 'sms' ? 'bg-purple-100 text-purple-600' :
                                  'bg-green-100 text-green-600'
                                }`}>
                                  {interaction.type === 'email' ? <Mail size={16} /> :
                                   interaction.type === 'sms' ? <MessageSquare size={16} /> :
                                   <Phone size={16} />}
                                </div>
                                <div className="flex-1">
                                  <div className="font-bold text-gray-900">{interaction.subject || interaction.type}</div>
                                  <div className="text-sm text-gray-600 line-clamp-2">{interaction.content}</div>
                                  <div className="text-xs text-gray-500 mt-1">
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
                        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4">
                          <h4 className="font-bold text-blue-900 mb-3 flex items-center">
                            <Mail className="mr-2" size={20} />
                            Envoyer un Email
                          </h4>

                          <input
                            type="text"
                            placeholder="Objet de l'email"
                            value={emailForm.subject}
                            onChange={(e) => setEmailForm(prev => ({ ...prev, subject: e.target.value }))}
                            className="w-full px-4 py-2 rounded-lg border border-blue-200 mb-2 text-gray-900"
                          />

                          <textarea
                            placeholder="Contenu de l'email..."
                            value={emailForm.content}
                            onChange={(e) => setEmailForm(prev => ({ ...prev, content: e.target.value }))}
                            rows={6}
                            className="w-full px-4 py-2 rounded-lg border border-blue-200 mb-2 text-gray-900"
                          />

                          <div className="flex items-center space-x-2">
                            <button
                              onClick={improveEmailWithAI}
                              disabled={isImproving || !emailForm.content}
                              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50"
                            >
                              <Sparkles size={18} />
                              <span>{isImproving ? 'IA en cours...' : 'Améliorer avec IA'}</span>
                            </button>

                            <button
                              onClick={sendEmail}
                              disabled={!emailForm.subject || !emailForm.content}
                              className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
                            >
                              <Send size={18} />
                              <span>Envoyer</span>
                            </button>
                          </div>
                        </div>

                        <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4">
                          <h4 className="font-bold text-purple-900 mb-3 flex items-center">
                            <MessageSquare className="mr-2" size={20} />
                            Envoyer un SMS
                          </h4>

                          <textarea
                            placeholder="Message SMS (160 caractères max)..."
                            value={smsForm.content}
                            onChange={(e) => setSmsForm({ content: e.target.value.slice(0, 160) })}
                            rows={3}
                            className="w-full px-4 py-2 rounded-lg border border-purple-200 mb-2 text-gray-900"
                          />

                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-purple-700">
                              {smsForm.content.length} / 160 caractères
                            </span>
                          </div>

                          <div className="flex items-center space-x-2">
                            <button
                              onClick={suggestSMS}
                              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
                            >
                              <Sparkles size={18} />
                              <span>Suggérer SMS</span>
                            </button>

                            <button
                              onClick={sendSMS}
                              disabled={!smsForm.content}
                              className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50"
                            >
                              <Send size={18} />
                              <span>Envoyer</span>
                            </button>
                          </div>
                        </div>

                        <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4">
                          <h4 className="font-bold text-green-900 mb-3 flex items-center">
                            <Phone className="mr-2" size={20} />
                            Logger un Appel
                          </h4>

                          <textarea
                            placeholder="Compte-rendu de l'appel..."
                            value={callNote}
                            onChange={(e) => setCallNote(e.target.value)}
                            rows={4}
                            className="w-full px-4 py-2 rounded-lg border border-green-200 mb-2 text-gray-900"
                          />

                          <button
                            onClick={logCall}
                            disabled={!callNote}
                            className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50"
                          >
                            <CheckCircle size={18} />
                            <span>Enregistrer l'appel</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {activeTab === 'documents' && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-gray-900">Documents du prospect</h4>

                            <label className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer">
                              <Upload size={18} />
                              <span>Upload document</span>
                              <input
                                type="file"
                                onChange={handleFileUpload}
                                className="hidden"
                              />
                            </label>
                          </div>

                          <div className="space-y-2">
                            {documents.map(doc => (
                              <div key={doc.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                <div className="flex items-center space-x-3">
                                  <FileText className="text-gray-400" size={24} />
                                  <div>
                                    <div className="font-bold text-gray-900">{doc.file_name}</div>
                                    <div className="text-sm text-gray-600">
                                      Type: {doc.document_type} • {new Date(doc.uploaded_at).toLocaleDateString('fr-FR')}
                                    </div>
                                  </div>
                                </div>

                                <span className={`px-3 py-1 rounded-full text-sm ${
                                  doc.status === 'validated' ? 'bg-green-100 text-green-800' :
                                  doc.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {doc.status}
                                </span>
                              </div>
                            ))}

                            {documents.length === 0 && (
                              <div className="text-center py-12 text-gray-500">
                                Aucun document uploadé
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                    {activeTab === 'ai' && (
                      <div className="space-y-4">
                        <h4 className="font-bold text-gray-900 flex items-center">
                          <Sparkles className="mr-2 text-purple-600" size={20} />
                          Suggestions IA en Temps Réel
                        </h4>

                        <div className="space-y-3">
                          {aiSuggestions.map(suggestion => (
                            <div
                              key={suggestion.id}
                              className={`p-4 rounded-lg border-2 ${
                                suggestion.urgency === 'critical' ? 'border-red-500 bg-red-50' :
                                suggestion.urgency === 'high' ? 'border-orange-500 bg-orange-50' :
                                'border-blue-500 bg-blue-50'
                              }`}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                                      suggestion.urgency === 'critical' ? 'bg-red-600 text-white' :
                                      suggestion.urgency === 'high' ? 'bg-orange-600 text-white' :
                                      'bg-blue-600 text-white'
                                    }`}>
                                      {suggestion.urgency.toUpperCase()}
                                    </span>
                                    <span className="text-sm text-gray-600">
                                      Score: {suggestion.priority_score}/100
                                    </span>
                                  </div>

                                  <h5 className="font-bold text-gray-900 mb-1">
                                    {suggestion.suggestion_text}
                                  </h5>

                                  <p className="text-sm text-gray-700">
                                    {suggestion.reasoning}
                                  </p>
                                </div>
                              </div>

                              <button
                                onClick={() => acceptSuggestion(suggestion.id)}
                                className="w-full mt-3 flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                              >
                                <CheckCircle size={18} />
                                <span>Accepter et exécuter</span>
                              </button>
                            </div>
                          ))}

                          {aiSuggestions.length === 0 && (
                            <div className="text-center py-12">
                              <Sparkles className="mx-auto text-gray-300 mb-4" size={48} />
                              <p className="text-gray-600">
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
      </div>
    </div>
  );
};

export default CRMCommercial;
