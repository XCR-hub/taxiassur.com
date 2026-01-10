import React, { useEffect, useState } from 'react';
import {
  Mail,
  RefreshCw,
  Star,
  User,
  Calendar,
  Paperclip,
  Tag,
  Search,
  ArrowLeft,
  ExternalLink,
  TrendingUp,
  CheckCircle,
  Send,
  Archive,
  AlertCircle,
} from 'lucide-react';
import BackButton from './BackButton';
import { supabase } from '@/lib/supabase';

interface EmailMessage {
  id: string;
  from_email: string;
  from_name: string | null;
  to_emails: string[];
  subject: string;
  body_text: string;
  body_html: string;
  received_at: string;
  direction: 'inbound' | 'outbound';
  is_read: boolean;
  is_starred: boolean;
  classification: string | null;
  confidence_score: number | null;
  lead_id: string | null;
  attachments: any[];
  auto_matched: boolean;
}

const CRMInboxMulticanal: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<EmailMessage | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | 'starred' | 'leads'>('all');
  const [directionFilter, setDirectionFilter] = useState<'all' | 'inbound' | 'outbound'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'priority'>('date');
  const [stats, setStats] = useState({ total: 0, unread: 0, leads: 0, starred: 0 });
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState('');

  useEffect(() => {
    loadMessages();
    loadStats();
    const interval = setInterval(() => {
      loadMessages();
      loadStats();
    }, 30000);
    return () => clearInterval(interval);
  }, [filter, directionFilter, searchQuery, sortBy]);

  const loadStats = async () => {
    try {
      const { count: total } = await supabase
        .from('email_messages')
        .select('*', { count: 'exact', head: true });

      const { count: unread } = await supabase
        .from('email_messages')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false);

      const { count: leads } = await supabase
        .from('email_messages')
        .select('*', { count: 'exact', head: true })
        .not('lead_id', 'is', null);

      const { count: starred } = await supabase
        .from('email_messages')
        .select('*', { count: 'exact', head: true })
        .eq('is_starred', true);

      setStats({
        total: total || 0,
        unread: unread || 0,
        leads: leads || 0,
        starred: starred || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadMessages = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('email_messages')
        .select('*')
        .order('received_at', { ascending: false })
        .limit(500);

      if (filter === 'unread') {
        query = query.eq('is_read', false);
      } else if (filter === 'starred') {
        query = query.eq('is_starred', true);
      } else if (filter === 'leads') {
        query = query.not('lead_id', 'is', null);
      }

      if (directionFilter !== 'all') {
        query = query.eq('direction', directionFilter);
      }

      if (searchQuery) {
        query = query.or(
          `subject.ilike.%${searchQuery}%,from_email.ilike.%${searchQuery}%,body_text.ilike.%${searchQuery}%`
        );
      }

      const { data, error } = await query;

      if (error) throw error;

      let sortedData = data || [];
      if (sortBy === 'priority') {
        sortedData = sortedData.sort((a, b) => {
          const scoreA = calculatePriority(a);
          const scoreB = calculatePriority(b);
          return scoreB - scoreA;
        });
      }

      setMessages(sortedData);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePriority = (email: EmailMessage): number => {
    let score = 0;
    if (!email.is_read) score += 10;
    if (email.lead_id) score += 20;
    if (email.classification === 'lead_inquiry') score += 30;
    if (email.attachments?.length > 0) score += 5;
    if (email.is_starred) score += 15;
    const hoursSinceReceived =
      (Date.now() - new Date(email.received_at).getTime()) / (1000 * 60 * 60);
    if (hoursSinceReceived < 24) score += 10;
    return score;
  };

  const syncEmails = async () => {
    try {
      setSyncing(true);
      setSyncStatus('syncing');
      setSyncMessage('Connexion au serveur IMAP IONOS...');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-ionos-imap`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();
      console.log('Sync result:', result);

      if (result.success) {
        setSyncStatus('success');
        const { inserted, skipped, total_retrieved } = result.stats || {};
        setSyncMessage(`✅ Synchronisation réussie ! ${inserted} nouveaux emails, ${skipped} déjà synchronisés, ${total_retrieved} emails récupérés.`);
        await loadMessages();
        await loadStats();

        setTimeout(() => {
          setSyncStatus('idle');
          setSyncMessage('');
        }, 5000);
      } else {
        setSyncStatus('error');
        setSyncMessage(result.error || result.message || 'Erreur lors de la synchronisation');

        if (result.note) {
          setSyncMessage(prev => `${prev}\n\n💡 ${result.note}`);
        }
      }
    } catch (error) {
      console.error('Error syncing emails:', error);
      setSyncStatus('error');
      setSyncMessage(`❌ Erreur réseau : ${error instanceof Error ? error.message : 'Impossible de contacter le serveur'}`);
    } finally {
      setSyncing(false);
    }
  };

  const markAsRead = async (emailId: string) => {
    try {
      await supabase.from('email_messages').update({ is_read: true }).eq('id', emailId);

      setMessages(messages.map((e) => (e.id === emailId ? { ...e, is_read: true } : e)));
      await loadStats();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const toggleStar = async (emailId: string, currentState: boolean) => {
    try {
      await supabase
        .from('email_messages')
        .update({ is_starred: !currentState })
        .eq('id', emailId);

      setMessages(
        messages.map((e) => (e.id === emailId ? { ...e, is_starred: !currentState } : e))
      );
      await loadStats();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const classifyEmail = async (emailId: string) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/classify-email-ai`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ emailId }),
        }
      );

      const result = await response.json();

      if (result.success) {
        await loadMessages();
        alert(
          `Email classifié comme "${result.classification.category}" ${
            result.leadCreated ? '+ Lead créé !' : ''
          }`
        );
      }
    } catch (error) {
      console.error('Error classifying email:', error);
    }
  };

  const getCategoryBadge = (category: string | null) => {
    if (!category) return null;

    const colors: Record<string, string> = {
      lead_inquiry: 'bg-green-100 text-green-800',
      customer_support: 'bg-blue-100 text-blue-800',
      reply: 'bg-gray-100 text-gray-800',
      spam: 'bg-red-100 text-red-800',
      documents: 'bg-purple-100 text-purple-800',
      general: 'bg-yellow-100 text-yellow-800',
    };

    return (
      <span
        className={`px-2 py-1 text-xs font-medium rounded-full ${colors[category] || 'bg-gray-100 text-gray-800'}`}
      >
        {category.replace('_', ' ')}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `Il y a ${diffMins}m`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getPriorityIndicator = (email: EmailMessage) => {
    const priority = calculatePriority(email);
    if (priority >= 50) return <TrendingUp className="text-red-500" size={16} />;
    if (priority >= 30) return <TrendingUp className="text-orange-500" size={16} />;
    return null;
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white px-6 py-6">
        <BackButton />
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold">Inbox Multicanal</h1>
            <p className="text-blue-200 mt-1">Tous vos emails en un seul endroit</p>
          </div>
          <button
            onClick={syncEmails}
            disabled={syncing}
            className="flex items-center gap-2 px-6 py-3 bg-white text-blue-900 rounded-lg font-medium hover:bg-blue-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={20} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Synchronisation...' : 'Synchroniser'}
          </button>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="text-3xl font-bold">{stats.total}</div>
            <div className="text-blue-200 text-sm">Total emails</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="text-3xl font-bold">{stats.unread}</div>
            <div className="text-blue-200 text-sm">Non lus</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="text-3xl font-bold">{stats.leads}</div>
            <div className="text-blue-200 text-sm">Leads associés</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="text-3xl font-bold">{stats.starred}</div>
            <div className="text-blue-200 text-sm">Favoris</div>
          </div>
        </div>

        {syncMessage && (
          <div className={`mt-4 p-4 rounded-lg ${
            syncStatus === 'success' ? 'bg-green-100 text-green-800' :
            syncStatus === 'error' ? 'bg-red-100 text-red-800' :
            'bg-blue-100 text-blue-800'
          }`}>
            <div className="flex items-start gap-3">
              {syncStatus === 'syncing' && <RefreshCw className="animate-spin flex-shrink-0 mt-0.5" size={20} />}
              {syncStatus === 'success' && <CheckCircle className="flex-shrink-0 mt-0.5" size={20} />}
              {syncStatus === 'error' && <AlertCircle className="flex-shrink-0 mt-0.5" size={20} />}
              <div className="flex-1 whitespace-pre-wrap text-sm">{syncMessage}</div>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="bg-white border-b px-6 py-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1 relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="text"
                placeholder="Rechercher dans les emails..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'priority')}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="date">Par date</option>
              <option value="priority">Par priorité</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tous ({stats.total})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'unread'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Non lus ({stats.unread})
            </button>
            <button
              onClick={() => setFilter('starred')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'starred'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Favoris ({stats.starred})
            </button>
            <button
              onClick={() => setFilter('leads')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'leads'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Leads ({stats.leads})
            </button>

            <div className="ml-4 flex gap-2">
              <button
                onClick={() => setDirectionFilter('all')}
                className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                  directionFilter === 'all'
                    ? 'bg-gray-800 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Tous
              </button>
              <button
                onClick={() => setDirectionFilter('inbound')}
                className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                  directionFilter === 'inbound'
                    ? 'bg-gray-800 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Reçus
              </button>
              <button
                onClick={() => setDirectionFilter('outbound')}
                className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                  directionFilter === 'outbound'
                    ? 'bg-gray-800 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Envoyés
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Chargement des emails...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12">
              <Mail size={48} className="text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">Aucun email trouvé</p>
              <p className="text-gray-500 text-sm mt-2">
                Cliquez sur "Synchroniser" pour récupérer vos emails
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {messages.map((email) => (
                <div
                  key={email.id}
                  onClick={() => {
                    setSelectedMessage(email);
                    if (!email.is_read) markAsRead(email.id);
                  }}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:border-blue-300 ${
                    !email.is_read
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleStar(email.id, email.is_starred);
                      }}
                      className="flex-shrink-0 mt-1"
                    >
                      <Star
                        size={20}
                        className={
                          email.is_starred ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                        }
                      />
                    </button>

                    {email.direction === 'outbound' && (
                      <Send size={16} className="text-gray-400 mt-1" />
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span
                          className={`font-semibold ${!email.is_read ? 'text-gray-900' : 'text-gray-700'}`}
                        >
                          {email.direction === 'outbound'
                            ? email.to_emails?.[0] || 'Destinataire'
                            : email.from_name || email.from_email}
                        </span>
                        {email.lead_id && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
                            <User size={12} />
                            Lead
                          </span>
                        )}
                        {email.auto_matched && (
                          <CheckCircle size={16} className="text-green-600" />
                        )}
                        {getCategoryBadge(email.classification)}
                        {getPriorityIndicator(email)}
                      </div>

                      <div className="text-sm text-gray-600 mb-1">
                        {email.direction === 'outbound' ? 'À: ' : 'De: '}
                        {email.direction === 'outbound'
                          ? email.to_emails?.[0]
                          : email.from_email}
                      </div>

                      <div
                        className={`mb-2 ${!email.is_read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}
                      >
                        {email.subject || '(Pas de sujet)'}
                      </div>

                      <div className="text-sm text-gray-600 line-clamp-2">
                        {email.body_text?.substring(0, 200)}...
                      </div>

                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar size={14} />
                          {formatDate(email.received_at)}
                        </span>
                        {email.attachments?.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Paperclip size={14} />
                            {email.attachments.length} pièce(s)
                          </span>
                        )}
                        {email.confidence_score && (
                          <span className="flex items-center gap-1">
                            <Tag size={14} />
                            {Math.round(email.confidence_score * 100)}% confiance
                          </span>
                        )}
                      </div>
                    </div>

                    {!email.classification && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          classifyEmail(email.id);
                        }}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Classifier
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedMessage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b-2 border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeft size={20} />
                  Retour
                </button>

                <div className="flex items-center gap-2">
                  {selectedMessage.lead_id && (
                    <a
                      href={`/backoffice/crm-killer/lead/${selectedMessage.lead_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <ExternalLink size={16} />
                      Voir le lead
                    </a>
                  )}
                  <button
                    onClick={() =>
                      toggleStar(selectedMessage.id, selectedMessage.is_starred)
                    }
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Star
                      size={20}
                      className={
                        selectedMessage.is_starred
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-400'
                      }
                    />
                  </button>
                </div>
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {selectedMessage.subject || '(Pas de sujet)'}
              </h2>

              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">
                    {selectedMessage.direction === 'outbound' ? 'À: ' : 'De: '}
                  </span>
                  <span className="font-semibold">
                    {selectedMessage.direction === 'outbound'
                      ? selectedMessage.to_emails?.join(', ')
                      : selectedMessage.from_name || selectedMessage.from_email}
                  </span>
                  <span className="ml-2 text-gray-600">
                    {selectedMessage.direction === 'outbound'
                      ? ''
                      : `<${selectedMessage.from_email}>`}
                  </span>
                </div>
                <div className="text-gray-500">
                  {new Date(selectedMessage.received_at).toLocaleString('fr-FR')}
                </div>
              </div>

              {selectedMessage.classification && (
                <div className="mt-4 flex items-center gap-2">
                  {getCategoryBadge(selectedMessage.classification)}
                  {selectedMessage.confidence_score && (
                    <span className="text-sm text-gray-600">
                      Confiance: {Math.round(selectedMessage.confidence_score * 100)}%
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="p-6">
              {selectedMessage.body_html ? (
                <div
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: selectedMessage.body_html }}
                />
              ) : (
                <pre className="whitespace-pre-wrap font-sans text-gray-700">
                  {selectedMessage.body_text}
                </pre>
              )}

              {selectedMessage.attachments?.length > 0 && (
                <div className="mt-6 pt-6 border-t-2 border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-4">Pièces jointes</h3>
                  <div className="space-y-2">
                    {selectedMessage.attachments.map((attachment: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                      >
                        <Paperclip size={20} className="text-gray-400" />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {attachment.filename}
                          </div>
                          <div className="text-sm text-gray-600">
                            {(attachment.size / 1024).toFixed(2)} KB
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CRMInboxMulticanal;
