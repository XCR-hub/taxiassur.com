import React, { useEffect, useState } from 'react';
import { toast } from '@/lib/toast';
import {
  Mail,
  RefreshCw,
  Star,
  Send,
  Archive,
  Trash2,
  Search,
  Settings,
  Paperclip,
  Reply,
  Forward,
  MoreVertical,
  UserPlus,
  Inbox,
  Clock,
  AlertCircle,
  CheckCircle,
  User
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { invokeIdempotentDelivery } from '@/lib/invoke-idempotent-delivery';
import { useNavigate } from 'react-router-dom';

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
  lead_id: string | null;
  attachments: any[];
}

type FolderType = 'inbox' | 'sent' | 'starred' | 'leads' | 'all';

const EmailInboxOutlook: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<EmailMessage | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<FolderType>('inbox');
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({ inbox: 0, sent: 0, starred: 0, leads: 0, total: 0 });
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyContent, setReplyContent] = useState('');

  useEffect(() => {
    loadMessages();
    loadStats();
    const interval = setInterval(() => {
      loadMessages();
      loadStats();
    }, 30000);
    return () => clearInterval(interval);
  }, [selectedFolder, searchQuery]);

  const loadStats = async () => {
    try {
      const { count: total } = await supabase
        .from('email_messages')
        .select('*', { count: 'exact', head: true });

      const { count: inbox } = await supabase
        .from('email_messages')
        .select('*', { count: 'exact', head: true })
        .eq('direction', 'inbound');

      const { count: sent } = await supabase
        .from('email_messages')
        .select('*', { count: 'exact', head: true })
        .eq('direction', 'outbound');

      const { count: starred } = await supabase
        .from('email_messages')
        .select('*', { count: 'exact', head: true })
        .eq('is_starred', true);

      const { count: leads } = await supabase
        .from('email_messages')
        .select('*', { count: 'exact', head: true })
        .not('lead_id', 'is', null);

      setStats({
        inbox: inbox || 0,
        sent: sent || 0,
        starred: starred || 0,
        leads: leads || 0,
        total: total || 0,
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
        .limit(200);

      if (selectedFolder === 'inbox') {
        query = query.eq('direction', 'inbound');
      } else if (selectedFolder === 'sent') {
        query = query.eq('direction', 'outbound');
      } else if (selectedFolder === 'starred') {
        query = query.eq('is_starred', true);
      } else if (selectedFolder === 'leads') {
        query = query.not('lead_id', 'is', null);
      }

      if (searchQuery) {
        query = query.or(
          `subject.ilike.%${searchQuery}%,from_email.ilike.%${searchQuery}%,body_text.ilike.%${searchQuery}%`
        );
      }

      const { data, error } = await query;

      if (error) throw error;

      setMessages(data || []);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const syncEmails = async () => {
    setSyncing(true);
    try {
      const { error } = await supabase.functions.invoke('sync-all-emails-complete', {
        body: { forceFullSync: true }
      });

      if (error) throw error;

      await loadMessages();
      await loadStats();
      toast.success('✅ Synchronisation réussie !');
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('❌ Erreur lors de la synchronisation');
    } finally {
      setSyncing(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await supabase
        .from('email_messages')
        .update({ is_read: true })
        .eq('id', id);

      setMessages(prev =>
        prev.map(m => m.id === id ? { ...m, is_read: true } : m)
      );
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const toggleStar = async (id: string, currentState: boolean) => {
    try {
      await supabase
        .from('email_messages')
        .update({ is_starred: !currentState })
        .eq('id', id);

      setMessages(prev =>
        prev.map(m => m.id === id ? { ...m, is_starred: !currentState } : m)
      );
    } catch (error) {
      console.error('Error toggling star:', error);
    }
  };

  // Fonction avancée de décodage et nettoyage email
  const decodeEmailContent = (text: string): string => {
    if (!text) return '';

    let decoded = text;

    // 1. Décoder quoted-printable (=E9, =C3=A9, etc.)
    decoded = decoded.replace(/=([0-9A-F]{2})/gi, (match, hex) => {
      return String.fromCharCode(parseInt(hex, 16));
    });

    // 2. Corriger double encodage UTF-8
    const utf8Fixes: Record<string, string> = {
      'Ã©': 'é', 'Ã¨': 'è', 'Ãª': 'ê', 'Ã§': 'ç', 'Ã ': 'à',
      'Ã¢': 'â', 'Ã´': 'ô', 'Ã®': 'î', 'Ã¹': 'ù', 'Ã»': 'û',
      'Ã«': 'ë', 'Ã¯': 'ï', 'Ã¼': 'ü', 'Ã‰': 'É', 'Ã€': 'À',
      'â€™': "'", 'â€œ': '"', 'â€': '"', 'â€¢': '•',
      'â€"': '—', 'â‚¬': '€', 'Â«': '«', 'Â»': '»'
    };

    for (const [wrong, correct] of Object.entries(utf8Fixes)) {
      decoded = decoded.replace(new RegExp(wrong, 'g'), correct);
    }

    // 3. Décoder entités HTML numériques
    decoded = decoded.replace(/&#(\d+);/g, (match, dec) => {
      return String.fromCharCode(parseInt(dec, 10));
    });
    decoded = decoded.replace(/&#x([0-9A-F]+);/gi, (match, hex) => {
      return String.fromCharCode(parseInt(hex, 16));
    });

    // 4. Décoder entités HTML nommées
    const textarea = document.createElement('textarea');
    textarea.innerHTML = decoded;
    decoded = textarea.value;

    return decoded;
  };

  const cleanEmailContent = (text: string, html?: string): string => {
    if (!text && !html) return '';

    // Préférer le HTML si disponible
    let content = html || text;

    // Décoder d'abord
    content = decodeEmailContent(content);

    // Supprimer balises VML/CSS inline
    content = content.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    content = content.replace(/[vow]\\:\*\s*\{[^}]*\}/gi, '');
    content = content.replace(/\.shape\s*\{[^}]*\}/gi, '');

    // Supprimer boundaries MIME
    content = content.replace(/------=_NextPart_[^\n]*/g, '');
    content = content.replace(/--[0-9A-F]+_NextPart_[^\n]*/g, '');

    // Supprimer headers MIME
    content = content.replace(/^Content-Type:.*$/gm, '');
    content = content.replace(/^Content-Transfer-Encoding:.*$/gm, '');
    content = content.replace(/^Content-Disposition:.*$/gm, '');
    content = content.replace(/^charset=.*$/gm, '');
    content = content.replace(/^boundary=.*$/gm, '');

    // Nettoyer lignes vides multiples
    content = content.replace(/\n{3,}/g, '\n\n');
    content = content.replace(/^\s+|\s+$/gm, '');

    return content.trim();
  };

  const renderEmailHTML = (html: string) => {
    const cleanHtml = cleanEmailContent('', html);
    return (
      <div
        className="prose prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: cleanHtml }}
        style={{
          lineHeight: '1.6',
          wordWrap: 'break-word'
        }}
      />
    );
  };

  const handleReply = () => {
    if (!selectedMessage) return;
    setReplyContent('');
    setShowReplyModal(true);
  };

  const handleForward = () => {
    if (!selectedMessage) return;
    toast.info('Fonction de transfert en développement');
  };

  const handleArchive = async () => {
    if (!selectedMessage) return;
    try {
      await supabase
        .from('email_messages')
        .update({ email_status: 'archived', archived_at: new Date().toISOString() })
        .eq('id', selectedMessage.id);

      toast.success('✅ Email archivé');
      await loadMessages();
      setSelectedMessage(null);
    } catch (error) {
      console.error('Error archiving:', error);
      toast.error('❌ Erreur lors de l\'archivage');
    }
  };

  const handleDelete = async () => {
    if (!selectedMessage) return;
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet email ?')) return;

    try {
      await supabase
        .from('email_messages')
        .update({ email_status: 'deleted', deleted_at: new Date().toISOString() })
        .eq('id', selectedMessage.id);

      toast.success('✅ Email supprimé');
      await loadMessages();
      setSelectedMessage(null);
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('❌ Erreur lors de la suppression');
    }
  };

  const sendReply = async () => {
    if (!selectedMessage || !replyContent.trim()) return;

    try {
      const { data: sendResult, error } = await invokeIdempotentDelivery(supabase, 'email', 'send-crm-email', {
        body: {
          to: selectedMessage.from_email,
          subject: `Re: ${selectedMessage.subject}`,
          body: replyContent,
          lead_id: selectedMessage.lead_id
        }
      });

      if (error || !sendResult?.success) throw error || new Error("Envoi refusé");

      toast.success('✅ Réponse envoyée !');
      setShowReplyModal(false);
      setReplyContent('');
      await loadMessages();
    } catch (error) {
      console.error('Error sending reply:', error);
      toast.error('❌ Erreur lors de l\'envoi');
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'Il y a moins d\'1h';
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) return `Il y a ${diffDays}j`;

    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const getFolderIcon = (folder: FolderType) => {
    switch (folder) {
      case 'inbox': return <Inbox className="w-5 h-5" />;
      case 'sent': return <Send className="w-5 h-5" />;
      case 'starred': return <Star className="w-5 h-5" />;
      case 'leads': return <UserPlus className="w-5 h-5" />;
      case 'all': return <Mail className="w-5 h-5" />;
      default: return <Inbox className="w-5 h-5" />;
    }
  };

  const getFolderLabel = (folder: FolderType) => {
    switch (folder) {
      case 'inbox': return 'Boîte de réception';
      case 'sent': return 'Envoyés';
      case 'starred': return 'Suivis';
      case 'leads': return 'Leads associés';
      case 'all': return 'Tous les messages';
      default: return 'Boîte de réception';
    }
  };

  const getFolderCount = (folder: FolderType) => {
    switch (folder) {
      case 'inbox': return stats.inbox;
      case 'sent': return stats.sent;
      case 'starred': return stats.starred;
      case 'leads': return stats.leads;
      case 'all': return stats.total;
      default: return 0;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Mail className="w-7 h-7 text-blue-600" />
            Inbox Multicanal
          </h1>
          <div className="flex items-center gap-3">
            <button
              onClick={syncEmails}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 font-medium"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Synchronisation...' : 'Synchroniser'}
            </button>
            <button
              onClick={() => navigate('/backoffice/crm-killer/email-settings')}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
            >
              <Settings className="w-4 h-4" />
              Paramètres
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
          {/* Search */}
          <div className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
              />
            </div>
          </div>

          {/* Folders */}
          <div className="flex-1 overflow-y-auto px-2">
            {(['inbox', 'sent', 'starred', 'leads', 'all'] as FolderType[]).map((folder) => (
              <button
                key={folder}
                onClick={() => {
                  setSelectedFolder(folder);
                  setSelectedMessage(null);
                }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg mb-1 transition ${
                  selectedFolder === folder
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  {getFolderIcon(folder)}
                  <span className="text-sm">{getFolderLabel(folder)}</span>
                </div>
                {getFolderCount(folder) > 0 && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    selectedFolder === folder
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {getFolderCount(folder)}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Email List */}
        <div className="w-96 bg-white border-r border-gray-200 flex flex-col">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">{getFolderLabel(selectedFolder)}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{messages.length} message{messages.length > 1 ? 's' : ''}</p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-12 px-4">
                <Mail className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600 text-sm">
                  {selectedFolder === 'sent'
                    ? 'Aucun email envoyé pour l\'instant'
                    : 'Aucun message trouvé'}
                </p>
              </div>
            ) : (
              messages.map((email) => (
                <div
                  key={email.id}
                  onClick={() => {
                    setSelectedMessage(email);
                    if (!email.is_read) markAsRead(email.id);
                  }}
                  className={`px-4 py-3 border-b border-gray-100 cursor-pointer transition hover:bg-gray-50 ${
                    selectedMessage?.id === email.id ? 'bg-blue-50' : ''
                  } ${!email.is_read ? 'bg-blue-50/30' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleStar(email.id, email.is_starred);
                      }}
                      className="flex-shrink-0 mt-1"
                    >
                      <Star
                        className={`w-4 h-4 ${
                          email.is_starred ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                        }`}
                      />
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm truncate ${!email.is_read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                          {email.direction === 'outbound' ? 'À: ' : ''}{email.from_name || email.from_email}
                        </span>
                        <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                          {formatDate(email.received_at)}
                        </span>
                      </div>

                      <p className={`text-sm truncate ${!email.is_read ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                        {email.subject || '(Aucun objet)'}
                      </p>

                      <p className="text-xs text-gray-500 truncate mt-1">
                        {cleanEmailContent(email.body_text, email.body_html).substring(0, 100)}
                      </p>

                      <div className="flex items-center gap-2 mt-2">
                        {email.lead_id && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">
                            <User className="w-3 h-3" />
                            Lead
                          </span>
                        )}
                        {email.attachments && email.attachments.length > 0 && (
                          <span className="inline-flex items-center gap-1 text-gray-500">
                            <Paperclip className="w-3 h-3" />
                            <span className="text-xs">{email.attachments.length}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Email Detail */}
        <div className="flex-1 bg-white flex flex-col">
          {selectedMessage ? (
            <>
              {/* Email Header */}
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-start justify-between mb-3">
                  <h2 className="text-xl font-semibold text-gray-900 flex-1">
                    {selectedMessage.subject || '(Aucun objet)'}
                  </h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleReply}
                      className="p-2 hover:bg-gray-100 rounded-lg transition"
                      title="Répondre"
                    >
                      <Reply className="w-5 h-5 text-gray-600" />
                    </button>
                    <button
                      onClick={handleForward}
                      className="p-2 hover:bg-gray-100 rounded-lg transition"
                      title="Transférer"
                    >
                      <Forward className="w-5 h-5 text-gray-600" />
                    </button>
                    <button
                      onClick={handleArchive}
                      className="p-2 hover:bg-gray-100 rounded-lg transition"
                      title="Archiver"
                    >
                      <Archive className="w-5 h-5 text-gray-600" />
                    </button>
                    <button
                      onClick={handleDelete}
                      className="p-2 hover:bg-gray-100 rounded-lg transition"
                      title="Supprimer"
                    >
                      <Trash2 className="w-5 h-5 text-gray-600" />
                    </button>
                    <button className="p-2 hover:bg-gray-100 rounded-lg transition">
                      <MoreVertical className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold text-sm">
                        {(selectedMessage.from_name || selectedMessage.from_email).charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{selectedMessage.from_name || selectedMessage.from_email}</p>
                      <p className="text-sm text-gray-500">{selectedMessage.from_email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">
                      {new Date(selectedMessage.received_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(selectedMessage.received_at).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>

                {selectedMessage.lead_id && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-green-900">Lead associé</span>
                      </div>
                      <button
                        onClick={() => navigate(`/backoffice/crm-killer/lead/${selectedMessage.lead_id}`)}
                        className="text-sm text-green-700 hover:text-green-800 font-medium"
                      >
                        Voir le lead →
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Email Body */}
              <div className="flex-1 overflow-y-auto px-6 py-6">
                {selectedMessage.body_html ? (
                  renderEmailHTML(selectedMessage.body_html)
                ) : (
                  <div className="prose prose-sm max-w-none">
                    <div className="whitespace-pre-wrap text-gray-900" style={{ lineHeight: '1.6' }}>
                      {cleanEmailContent(selectedMessage.body_text, '')}
                    </div>
                  </div>
                )}

                {selectedMessage.attachments && selectedMessage.attachments.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">
                      Pièces jointes ({selectedMessage.attachments.length})
                    </h3>
                    <div className="space-y-2">
                      {(selectedMessage.attachments as Array<{ filename: string; size: string }>).map((attachment, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                        >
                          <Paperclip className="w-5 h-5 text-gray-400" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{attachment.filename}</p>
                            <p className="text-xs text-gray-500">{attachment.size}</p>
                          </div>
                          <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                            Télécharger
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <Mail className="w-16 h-16 mx-auto mb-4" />
                <p className="text-lg">Sélectionnez un message pour le lire</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reply Modal */}
      {showReplyModal && selectedMessage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Répondre à : {selectedMessage.from_name || selectedMessage.from_email}</h3>
              <button
                onClick={() => {
                  setShowReplyModal(false);
                  setReplyContent('');
                }}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Objet : Re: {selectedMessage.subject}
                </label>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Votre message
                </label>
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Tapez votre réponse..."
                  className="w-full h-64 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              {/* Original Message */}
              <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-gray-300">
                <p className="text-xs font-semibold text-gray-600 mb-2">Message original :</p>
                <div className="text-sm text-gray-700">
                  <p className="mb-1"><strong>De :</strong> {selectedMessage.from_email}</p>
                  <p className="mb-1"><strong>Date :</strong> {new Date(selectedMessage.received_at).toLocaleString('fr-FR')}</p>
                  <div className="mt-3 pt-3 border-t border-gray-200 max-h-32 overflow-y-auto text-xs">
                    {cleanEmailContent(selectedMessage.body_text, '').substring(0, 500)}...
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
              <button
                onClick={sendReply}
                disabled={!replyContent.trim()}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Send className="w-5 h-5" />
                Envoyer la réponse
              </button>
              <button
                onClick={() => {
                  setShowReplyModal(false);
                  setReplyContent('');
                }}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailInboxOutlook;
