import React, { useState, useEffect } from 'react';
import { Mail, RefreshCw, Download, Check, X, User, Calendar, MessageCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import BackButton from './BackButton';

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
}

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  status: string;
}

const EmailInboxManager: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [emails, setEmails] = useState<EmailInbox[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailInbox | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'processed' | 'unprocessed'>('all');

  useEffect(() => {
    loadEmails();
    loadLeads();
  }, [filter]);

  const loadEmails = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('email_inbox')
        .select('*')
        .order('received_at', { ascending: false })
        .limit(100);

      if (filter === 'processed') {
        query = query.eq('processed', true);
      } else if (filter === 'unprocessed') {
        query = query.eq('processed', false);
      }

      const { data, error } = await query;
      if (error) throw error;

      setEmails(data || []);
      logger.info(`📧 ${data?.length || 0} emails chargés`);
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
        .limit(500);

      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      logger.error('Erreur chargement leads:', error);
    }
  };

  const syncEmails = async () => {
    setSyncing(true);
    try {
      logger.info('🔄 Synchronisation emails IMAP...');

      const { data, error } = await supabase.functions.invoke('fetch-email-replies', {
        body: {}
      });

      if (error) throw error;

      logger.info('✅ Synchronisation terminée:', data);
      await loadEmails();
    } catch (error) {
      logger.error('❌ Erreur synchronisation:', error);
      alert('Erreur lors de la synchronisation des emails. Vérifiez la configuration IMAP.');
    } finally {
      setSyncing(false);
    }
  };

  const linkToLead = async (emailId: string, leadId: string) => {
    try {
      const { error } = await supabase
        .from('email_inbox')
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

  const markAsProcessed = async (emailId: string) => {
    try {
      const { error } = await supabase
        .from('email_inbox')
        .update({ processed: true, processed_at: new Date().toISOString() })
        .eq('id', emailId);

      if (error) throw error;
      await loadEmails();
    } catch (error) {
      logger.error('Erreur marquage email:', error);
    }
  };

  const stats = {
    total: emails.length,
    unprocessed: emails.filter(e => !e.processed).length,
    withLead: emails.filter(e => e.lead_id).length,
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
          <BackButton to="/backoffice/crm" />
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Mail className="w-8 h-8 text-blue-600" />
                Inbox Email
              </h1>
              <p className="text-gray-600">Emails reçus sur team@taxiassur.com</p>
            </div>
            <button
              onClick={syncEmails}
              disabled={syncing}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Synchronisation...' : 'Synchroniser emails'}
            </button>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-3xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-blue-700">Total emails</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="text-3xl font-bold text-orange-600">{stats.unprocessed}</div>
              <div className="text-sm text-orange-700">Non traités</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-3xl font-bold text-green-600">{stats.withLead}</div>
              <div className="text-sm text-green-700">Liés à un lead</div>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <div className="text-3xl font-bold text-red-600">{stats.highPriority}</div>
              <div className="text-sm text-red-700">Haute priorité</div>
            </div>
          </div>

          <div className="flex gap-2">
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
              onClick={() => setFilter('processed')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'processed' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Traités ({stats.total - stats.unprocessed})
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : emails.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <Mail className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Aucun email</h3>
            <p className="text-gray-600 mb-4">Cliquez sur "Synchroniser emails" pour récupérer les emails</p>
            <button
              onClick={syncEmails}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Synchroniser maintenant
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-3">
              {emails.map(email => (
                <div
                  key={email.id}
                  onClick={() => setSelectedEmail(email)}
                  className={`bg-white rounded-lg shadow border-2 p-4 cursor-pointer transition-all ${
                    selectedEmail?.id === email.id
                      ? 'border-blue-500 shadow-lg'
                      : email.processed
                      ? 'border-gray-200 opacity-60'
                      : 'border-orange-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <User className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-bold text-gray-900">{email.from_name || email.from_email}</div>
                        <div className="text-xs text-gray-500">{email.from_email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {email.priority >= 8 && (
                        <AlertCircle className="w-5 h-5 text-red-500" />
                      )}
                      {email.processed ? (
                        <Check className="w-5 h-5 text-green-500" />
                      ) : (
                        <X className="w-5 h-5 text-orange-500" />
                      )}
                    </div>
                  </div>

                  <div className="text-sm font-medium text-gray-900 mb-1">{email.subject}</div>
                  <div className="text-xs text-gray-600 line-clamp-2 mb-2">
                    {email.body.substring(0, 150)}...
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-500">
                        {new Date(email.received_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    {email.sentiment && (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSentimentColor(email.sentiment)}`}>
                        {getSentimentIcon(email.sentiment)} {email.sentiment}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="lg:sticky lg:top-24 h-fit">
              {selectedEmail ? (
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{selectedEmail.subject}</h3>
                      <div className="text-sm text-gray-600">
                        De: <span className="font-medium">{selectedEmail.from_name || selectedEmail.from_email}</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        Email: <span className="font-medium">{selectedEmail.from_email}</span>
                      </div>
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

                  {!selectedEmail.processed && (
                    <>
                      <div className="border-t border-gray-200 pt-6 mb-6">
                        <h4 className="font-bold text-gray-900 mb-3">Lier à un lead existant</h4>
                        <div className="max-h-60 overflow-y-auto space-y-2">
                          {leads
                            .filter(lead => lead.email.toLowerCase() === selectedEmail.from_email.toLowerCase())
                            .map(lead => (
                              <button
                                key={lead.id}
                                onClick={() => linkToLead(selectedEmail.id, lead.id)}
                                className="w-full text-left p-3 bg-green-50 border-2 border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                              >
                                <div className="font-medium text-gray-900">
                                  {lead.first_name} {lead.last_name}
                                </div>
                                <div className="text-sm text-gray-600">{lead.email}</div>
                                <div className="text-xs text-gray-500">Correspondance exacte ✓</div>
                              </button>
                            ))}

                          {leads
                            .filter(lead => lead.email.toLowerCase() !== selectedEmail.from_email.toLowerCase())
                            .slice(0, 5)
                            .map(lead => (
                              <button
                                key={lead.id}
                                onClick={() => linkToLead(selectedEmail.id, lead.id)}
                                className="w-full text-left p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                              >
                                <div className="font-medium text-gray-900">
                                  {lead.first_name} {lead.last_name}
                                </div>
                                <div className="text-sm text-gray-600">{lead.email}</div>
                              </button>
                            ))}
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => createLeadFromEmail(selectedEmail)}
                          className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                        >
                          Créer nouveau lead
                        </button>
                        <button
                          onClick={() => markAsProcessed(selectedEmail.id)}
                          className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                        >
                          Marquer traité
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
    </div>
  );
};

export default EmailInboxManager;
