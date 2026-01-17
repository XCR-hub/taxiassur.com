import React, { useState, useEffect } from 'react';
import {
  Mail, RefreshCw, Check, X, User, Calendar, MessageCircle, AlertCircle,
  Send, Trash2, Archive, Tag, Filter, Search, Reply, ExternalLink,
  CheckSquare, Square, MoreVertical, Settings, Zap, UserPlus
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

interface EmailInbox {
  id: string;
  from_email: string;
  from_name: string;
  to_email: string;
  subject: string;
  body: string;
  received_at: string;
  processed: boolean;
  lead_id?: string;
  intent?: string;
  sentiment?: string;
  priority: number;
  thread_id?: string;
}

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  status: string;
}

interface LeadSuggestion extends Lead {
  matchScore: number;
  matchReason: string;
}

interface EmailRule {
  id: string;
  name: string;
  condition_field: string;
  condition_operator: string;
  condition_value: string;
  action_type: string;
  action_value: string;
  enabled: boolean;
}

type FilterType = 'all' | 'unprocessed' | 'processed' | 'unassigned' | 'starred' | 'leads';

const EmailInboxManager: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [emails, setEmails] = useState<EmailInbox[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailInbox | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [rules, setRules] = useState<EmailRule[]>([]);
  const [groupByThread, setGroupByThread] = useState(false);

  useEffect(() => {
    loadEmails();
    loadLeads();
    loadRules();
  }, [filter]);

  const loadEmails = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('email_messages')
        .select('*')
        .order('received_at', { ascending: false })
        .limit(200);

      if (filter === 'processed') {
        query = query.eq('processed', true);
      } else if (filter === 'unprocessed') {
        query = query.eq('processed', false);
      } else if (filter === 'unassigned') {
        query = query.is('lead_id', null);
      } else if (filter === 'leads') {
        query = query.not('lead_id', 'is', null);
      }

      const { data, error } = await query;
      if (error) throw error;

      const emailsData = (data || []).map(email => ({
        id: email.id,
        from_email: email.from_email || email.sender_email,
        from_name: email.from_name || email.sender_name,
        to_email: email.to_email || email.recipient_email,
        subject: email.subject,
        body: email.body || email.content,
        received_at: email.received_at || email.sent_at,
        processed: email.processed || false,
        lead_id: email.lead_id,
        intent: email.intent,
        sentiment: email.sentiment,
        priority: email.priority || 5,
        thread_id: email.thread_id
      }));

      setEmails(emailsData);
      logger.info(`📧 ${emailsData.length} emails chargés`);
    } catch (error) {
      logger.error('Erreur chargement emails:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('crm_leads')
        .select('id, first_name, last_name, email, phone, status')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      logger.error('Erreur chargement leads:', error);
    }
  };

  const loadRules = async () => {
    try {
      const { data, error } = await supabase
        .from('email_automation_rules')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        logger.warn('Table email_automation_rules pas encore créée');
        return;
      }
      setRules(data || []);
    } catch (error) {
      logger.error('Erreur chargement règles:', error);
    }
  };

  const syncEmails = async () => {
    setSyncing(true);
    try {
      logger.info('🔄 Synchronisation emails IMAP...');

      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        throw new Error('Session expirée');
      }

      const { data, error } = await supabase.functions.invoke('sync-all-emails-complete', {
        body: {},
        headers: {
          'Authorization': `Bearer ${session.data.session.access_token}`
        }
      });

      if (error) {
        logger.error('Erreur invoke:', error);
        throw error;
      }

      logger.info('✅ Synchronisation terminée:', data);
      alert(`✅ ${data?.count || 0} emails récupérés !`);
      await loadEmails();
    } catch (error) {
      logger.error('❌ Erreur synchronisation:', error);
      alert('❌ Erreur: ' + (error as Error).message);
    } finally {
      setSyncing(false);
    }
  };

  const getLeadSuggestions = (email: EmailInbox): LeadSuggestion[] => {
    const suggestions: LeadSuggestion[] = [];

    leads.forEach(lead => {
      let matchScore = 0;
      let matchReasons: string[] = [];

      if (lead.email.toLowerCase() === email.from_email.toLowerCase()) {
        matchScore += 100;
        matchReasons.push('Email identique');
      } else if (lead.email.toLowerCase().includes(email.from_email.split('@')[0].toLowerCase())) {
        matchScore += 50;
        matchReasons.push('Email similaire');
      }

      const emailName = email.from_name?.toLowerCase() || '';
      const leadFullName = `${lead.first_name} ${lead.last_name}`.toLowerCase();

      if (emailName && leadFullName.includes(emailName)) {
        matchScore += 70;
        matchReasons.push('Nom correspond');
      }

      const words = emailName.split(' ');
      words.forEach(word => {
        if (word.length > 2 && leadFullName.includes(word)) {
          matchScore += 20;
        }
      });

      if (matchScore > 0) {
        suggestions.push({
          ...lead,
          matchScore,
          matchReason: matchReasons.join(' • ')
        });
      }
    });

    return suggestions.sort((a, b) => b.matchScore - a.matchScore).slice(0, 10);
  };

  const linkToLead = async (emailId: string, leadId: string) => {
    try {
      const { error } = await supabase
        .from('email_messages')
        .update({
          lead_id: leadId,
          processed: true,
          processed_at: new Date().toISOString()
        })
        .eq('id', emailId);

      if (error) throw error;

      logger.info('✅ Email lié au lead');
      await loadEmails();
      setSelectedEmail(null);
    } catch (error) {
      logger.error('Erreur liaison lead:', error);
    }
  };

  const createLeadFromEmail = async (email: EmailInbox) => {
    try {
      const nameParts = email.from_name?.split(' ') || ['', ''];
      const { data: newLead, error } = await supabase
        .from('crm_leads')
        .insert({
          email: email.from_email,
          first_name: nameParts[0] || 'Lead',
          last_name: nameParts.slice(1).join(' ') || 'Email',
          source: 'email_inbox',
          status: 'NEW_LEAD',
          lead_score: 60,
          metadata: {
            first_email_subject: email.subject,
            first_email_date: email.received_at
          }
        })
        .select()
        .single();

      if (error) throw error;

      await linkToLead(email.id, newLead.id);
      await loadLeads();
      logger.info('✅ Nouveau lead créé depuis email');
    } catch (error) {
      logger.error('Erreur création lead:', error);
    }
  };

  const sendReply = async () => {
    if (!selectedEmail || !replyContent.trim()) return;

    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) throw new Error('Session expirée');

      const { error } = await supabase.functions.invoke('send-email-universal', {
        body: {
          to: selectedEmail.from_email,
          subject: `Re: ${selectedEmail.subject}`,
          html: replyContent,
          lead_id: selectedEmail.lead_id
        },
        headers: {
          'Authorization': `Bearer ${session.data.session.access_token}`
        }
      });

      if (error) throw error;

      alert('✅ Réponse envoyée !');
      setShowReplyModal(false);
      setReplyContent('');
    } catch (error) {
      logger.error('Erreur envoi réponse:', error);
      alert('❌ Erreur lors de l\'envoi');
    }
  };

  const toggleEmailSelection = (emailId: string) => {
    const newSelection = new Set(selectedEmails);
    if (newSelection.has(emailId)) {
      newSelection.delete(emailId);
    } else {
      newSelection.add(emailId);
    }
    setSelectedEmails(newSelection);
  };

  const bulkCreateLeads = async () => {
    const emailsToProcess = emails.filter(e => selectedEmails.has(e.id));

    for (const email of emailsToProcess) {
      await createLeadFromEmail(email);
    }

    setSelectedEmails(new Set());
    alert(`✅ ${emailsToProcess.length} leads créés !`);
  };

  const bulkMarkAsProcessed = async () => {
    try {
      const { error } = await supabase
        .from('email_messages')
        .update({ processed: true, processed_at: new Date().toISOString() })
        .in('id', Array.from(selectedEmails));

      if (error) throw error;

      await loadEmails();
      setSelectedEmails(new Set());
      alert('✅ Emails marqués comme traités !');
    } catch (error) {
      logger.error('Erreur marquage bulk:', error);
    }
  };

  const bulkArchive = async () => {
    try {
      const { error } = await supabase
        .from('email_messages')
        .update({ archived: true })
        .in('id', Array.from(selectedEmails));

      if (error) throw error;

      await loadEmails();
      setSelectedEmails(new Set());
      alert('✅ Emails archivés !');
    } catch (error) {
      logger.error('Erreur archivage bulk:', error);
    }
  };

  const getLeadName = (leadId: string | undefined): string => {
    if (!leadId) return '';
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return '';
    return `${lead.first_name} ${lead.last_name}`;
  };

  const filteredEmails = emails.filter(email => {
    if (!searchTerm) return true;

    const searchLower = searchTerm.toLowerCase();
    return (
      email.subject.toLowerCase().includes(searchLower) ||
      email.from_email.toLowerCase().includes(searchLower) ||
      email.from_name?.toLowerCase().includes(searchLower) ||
      email.body.toLowerCase().includes(searchLower)
    );
  });

  const groupedEmails = groupByThread
    ? Object.values(
        filteredEmails.reduce((acc, email) => {
          const threadId = email.thread_id || email.id;
          if (!acc[threadId]) {
            acc[threadId] = [];
          }
          acc[threadId].push(email);
          return acc;
        }, {} as Record<string, EmailInbox[]>)
      )
    : filteredEmails.map(e => [e]);

  const stats = {
    total: emails.length,
    unprocessed: emails.filter(e => !e.processed).length,
    withLead: emails.filter(e => e.lead_id).length,
    unassigned: emails.filter(e => !e.lead_id).length,
    highPriority: emails.filter(e => e.priority >= 8).length
  };

  const getSentimentIcon = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive': return '😊';
      case 'negative': return '😞';
      default: return '😐';
    }
  };

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive': return 'bg-green-100 text-green-700';
      case 'negative': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Mail className="w-8 h-8 text-blue-600" />
                Inbox Email
              </h1>
              <p className="text-gray-600">Gestion intelligente des emails</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRulesModal(true)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center gap-2"
              >
                <Settings className="w-5 h-5" />
                Règles
              </button>
              <button
                onClick={syncEmails}
                disabled={syncing}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Synchronisation...' : 'Synchroniser'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-4 mb-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-3xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-blue-700">Total emails</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="text-3xl font-bold text-orange-600">{stats.unprocessed}</div>
              <div className="text-sm text-orange-700">Non traités</div>
            </div>
            <div className="bg-red-50 rounded-lg p-4 cursor-pointer hover:bg-red-100 transition-colors" onClick={() => setFilter('unassigned')}>
              <div className="text-3xl font-bold text-red-600 flex items-center gap-2">
                <AlertCircle className="w-6 h-6" />
                {stats.unassigned}
              </div>
              <div className="text-sm text-red-700 font-medium">Non affectés</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-3xl font-bold text-green-600">{stats.withLead}</div>
              <div className="text-sm text-green-700">Liés à un lead</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-3xl font-bold text-purple-600">{stats.highPriority}</div>
              <div className="text-sm text-purple-700">Haute priorité</div>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher dans les emails..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setGroupByThread(!groupByThread)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                groupByThread ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <MessageCircle className="w-5 h-5" />
            </button>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tous ({stats.total})
            </button>
            <button
              onClick={() => setFilter('unprocessed')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'unprocessed' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Non traités ({stats.unprocessed})
            </button>
            <button
              onClick={() => setFilter('unassigned')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                filter === 'unassigned' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <AlertCircle className="w-4 h-4" />
              Non affectés ({stats.unassigned})
            </button>
            <button
              onClick={() => setFilter('leads')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'leads' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Avec leads ({stats.withLead})
            </button>
            <button
              onClick={() => setFilter('processed')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'processed' ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Traités ({stats.total - stats.unprocessed})
            </button>
          </div>

          {selectedEmails.size > 0 && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-blue-900">
                    {selectedEmails.size} email{selectedEmails.size > 1 ? 's' : ''} sélectionné{selectedEmails.size > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={bulkCreateLeads}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    Créer les leads
                  </button>
                  <button
                    onClick={bulkMarkAsProcessed}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Marquer traités
                  </button>
                  <button
                    onClick={bulkArchive}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors flex items-center gap-2"
                  >
                    <Archive className="w-4 h-4" />
                    Archiver
                  </button>
                  <button
                    onClick={() => setSelectedEmails(new Set())}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : filteredEmails.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <Mail className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Aucun email</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm ? 'Aucun résultat pour cette recherche' : 'Cliquez sur "Synchroniser" pour récupérer les emails'}
            </p>
            {!searchTerm && (
              <button
                onClick={syncEmails}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Synchroniser maintenant
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-3">
              {groupedEmails.map((thread, threadIndex) => {
                const mainEmail = thread[0];
                const isThread = thread.length > 1;

                return (
                  <div key={threadIndex}>
                    <div
                      onClick={() => setSelectedEmail(mainEmail)}
                      className={`bg-white rounded-lg shadow border-2 p-4 cursor-pointer transition-all ${
                        selectedEmail?.id === mainEmail.id
                          ? 'border-blue-500 shadow-lg'
                          : mainEmail.processed
                          ? 'border-gray-200 opacity-60'
                          : mainEmail.lead_id
                          ? 'border-green-200 hover:border-green-300'
                          : 'border-red-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3 flex-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleEmailSelection(mainEmail.id);
                            }}
                            className="flex-shrink-0"
                          >
                            {selectedEmails.has(mainEmail.id) ? (
                              <CheckSquare className="w-5 h-5 text-blue-600" />
                            ) : (
                              <Square className="w-5 h-5 text-gray-400" />
                            )}
                          </button>
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <User className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-gray-900 truncate">
                              {mainEmail.from_name || mainEmail.from_email}
                            </div>
                            <div className="text-xs text-gray-500 truncate">{mainEmail.from_email}</div>
                            {mainEmail.lead_id && (
                              <div className="text-xs text-green-600 font-medium flex items-center gap-1 mt-1">
                                <User className="w-3 h-3" />
                                Lead: {getLeadName(mainEmail.lead_id)}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {!mainEmail.lead_id && (
                            <AlertCircle className="w-5 h-5 text-red-500" />
                          )}
                          {mainEmail.priority >= 8 && (
                            <Zap className="w-5 h-5 text-orange-500" />
                          )}
                          {mainEmail.processed ? (
                            <Check className="w-5 h-5 text-green-500" />
                          ) : (
                            <X className="w-5 h-5 text-orange-500" />
                          )}
                        </div>
                      </div>

                      <div className="text-sm font-medium text-gray-900 mb-1 truncate">
                        {isThread && `[${thread.length}] `}
                        {mainEmail.subject}
                      </div>
                      <div className="text-xs text-gray-600 line-clamp-2 mb-2">
                        {mainEmail.body.substring(0, 150)}...
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-500">
                            {new Date(mainEmail.received_at).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        {mainEmail.sentiment && (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSentimentColor(mainEmail.sentiment)}`}>
                            {getSentimentIcon(mainEmail.sentiment)}
                          </span>
                        )}
                      </div>
                    </div>

                    {isThread && (
                      <div className="ml-12 mt-2 space-y-2">
                        {thread.slice(1).map(email => (
                          <div
                            key={email.id}
                            onClick={() => setSelectedEmail(email)}
                            className="bg-gray-50 rounded-lg border border-gray-200 p-3 cursor-pointer hover:bg-gray-100 transition-colors"
                          >
                            <div className="text-xs text-gray-600 line-clamp-1 mb-1">
                              {email.subject}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(email.received_at).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="lg:sticky lg:top-24 h-fit">
              {selectedEmail ? (
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{selectedEmail.subject}</h3>
                      <div className="text-sm text-gray-600">
                        De: <span className="font-medium">{selectedEmail.from_name || selectedEmail.from_email}</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        Email: <span className="font-medium">{selectedEmail.from_email}</span>
                      </div>
                      {selectedEmail.lead_id && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium flex items-center gap-1">
                            <User className="w-4 h-4" />
                            Lead: {getLeadName(selectedEmail.lead_id)}
                          </span>
                          <a
                            href={`/backoffice/crm/lead/${selectedEmail.lead_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      )}
                      <div className="text-xs text-gray-500 mt-2">
                        Reçu le {new Date(selectedEmail.received_at).toLocaleString('fr-FR')}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {selectedEmail.sentiment && (
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getSentimentColor(selectedEmail.sentiment)}`}>
                          {getSentimentIcon(selectedEmail.sentiment)}
                        </span>
                      )}
                      {selectedEmail.processed ? (
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                          Traité
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                          Non traité
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4 mb-6">
                    <h4 className="font-bold text-gray-900 mb-2">Message</h4>
                    <div className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
                      {selectedEmail.body}
                    </div>
                  </div>

                  <div className="flex gap-2 mb-6">
                    <button
                      onClick={() => setShowReplyModal(true)}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Reply className="w-4 h-4" />
                      Répondre
                    </button>
                    {selectedEmail.lead_id && (
                      <a
                        href={`/backoffice/crm/lead/${selectedEmail.lead_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Voir le lead
                      </a>
                    )}
                  </div>

                  {!selectedEmail.lead_id && (
                    <>
                      <div className="border-t border-gray-200 pt-6 mb-6">
                        <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                          <Zap className="w-5 h-5 text-orange-500" />
                          Suggestions intelligentes
                        </h4>
                        <div className="max-h-60 overflow-y-auto space-y-2">
                          {getLeadSuggestions(selectedEmail).map(suggestion => (
                            <button
                              key={suggestion.id}
                              onClick={() => linkToLead(selectedEmail.id, suggestion.id)}
                              className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
                                suggestion.matchScore >= 100
                                  ? 'bg-green-50 border-green-300 hover:bg-green-100'
                                  : suggestion.matchScore >= 50
                                  ? 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                                  : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <div className="font-medium text-gray-900">
                                  {suggestion.first_name} {suggestion.last_name}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                    suggestion.matchScore >= 100
                                      ? 'bg-green-200 text-green-800'
                                      : suggestion.matchScore >= 50
                                      ? 'bg-blue-200 text-blue-800'
                                      : 'bg-gray-200 text-gray-800'
                                  }`}>
                                    {suggestion.matchScore}%
                                  </span>
                                </div>
                              </div>
                              <div className="text-sm text-gray-600">{suggestion.email}</div>
                              {suggestion.phone && (
                                <div className="text-sm text-gray-600">{suggestion.phone}</div>
                              )}
                              <div className="text-xs text-gray-500 mt-1">
                                {suggestion.matchReason}
                              </div>
                            </button>
                          ))}

                          {getLeadSuggestions(selectedEmail).length === 0 && (
                            <div className="text-center text-gray-500 py-4">
                              Aucune correspondance trouvée
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => createLeadFromEmail(selectedEmail)}
                          className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                        >
                          <UserPlus className="w-5 h-5" />
                          Créer nouveau lead
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                  <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">Sélectionnez un email pour voir les détails</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showReplyModal && selectedEmail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Reply className="w-6 h-6 text-blue-600" />
                Répondre à {selectedEmail.from_name || selectedEmail.from_email}
              </h2>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Destinataire
                </label>
                <input
                  type="text"
                  value={selectedEmail.from_email}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sujet
                </label>
                <input
                  type="text"
                  value={`Re: ${selectedEmail.subject}`}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message
                </label>
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  rows={10}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Écrivez votre réponse..."
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={sendReply}
                  disabled={!replyContent.trim()}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  Envoyer
                </button>
                <button
                  onClick={() => {
                    setShowReplyModal(false);
                    setReplyContent('');
                  }}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRulesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Settings className="w-6 h-6 text-blue-600" />
                Règles d'automatisation
              </h2>
              <p className="text-gray-600 mt-2">
                Créez des règles pour automatiser le traitement des emails
              </p>
            </div>
            <div className="p-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800">
                  <strong>Fonctionnalité en cours de développement</strong><br />
                  Les règles automatiques vous permettront de :
                </p>
                <ul className="text-sm text-blue-700 mt-2 space-y-1 ml-4">
                  <li>• Classer automatiquement les emails par catégorie</li>
                  <li>• Lier automatiquement aux leads correspondants</li>
                  <li>• Notifier les commerciaux selon des critères</li>
                  <li>• Archiver ou marquer comme spam</li>
                  <li>• Assigner des priorités automatiquement</li>
                </ul>
              </div>

              {rules.length > 0 ? (
                <div className="space-y-3">
                  {rules.map(rule => (
                    <div key={rule.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-gray-900">{rule.name}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          rule.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {rule.enabled ? 'Activée' : 'Désactivée'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        Si <strong>{rule.condition_field}</strong> {rule.condition_operator} "{rule.condition_value}"
                        → <strong>{rule.action_type}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Aucune règle configurée
                </div>
              )}

              <div className="mt-6">
                <button
                  onClick={() => setShowRulesModal(false)}
                  className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailInboxManager;
