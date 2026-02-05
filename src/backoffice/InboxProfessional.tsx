import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Inbox, Star, Send, FileEdit, Archive, Trash2, HelpCircle, Handshake,
  Bell, Mail, Plus, FolderPlus, Search, Filter, RefreshCw, ChevronDown,
  ChevronRight, Circle, CheckCircle, AlertCircle, Reply, Forward,
  MoreHorizontal, User, Building2, Sparkles, X, Check, Clock,
  Tag, Folder, MessageSquare, ExternalLink
} from 'lucide-react';

interface EmailFolder {
  id: string;
  name: string;
  folder_type: 'system' | 'lead' | 'category' | 'custom';
  icon: string;
  color: string;
  parent_folder_id?: string;
  lead_id?: string;
  unread_count: number;
  total_count: number;
  display_order: number;
  is_system: boolean;
  children?: EmailFolder[];
}

interface EmailMessage {
  id: string;
  from_email: string;
  from_name?: string;
  to_email: string;
  subject: string;
  body_text?: string;
  body_html?: string;
  received_at: string;
  is_read: boolean;
  is_starred: boolean;
  is_archived: boolean;
  is_deleted: boolean;
  lead_id?: string;
  folder_id?: string;
  thread_id?: string;
  classification?: {
    classification_type: string;
    confidence_score: number;
  };
  lead?: {
    id: string;
    full_name: string;
    email: string;
  };
}

interface EmailSuggestion {
  id: string;
  suggestion_type: string;
  reason: string;
  confidence: number;
  suggested_data: any;
  status: 'pending' | 'accepted' | 'rejected' | 'ignored';
}

const FOLDER_ICONS: Record<string, any> = {
  inbox: Inbox,
  star: Star,
  send: Send,
  'file-edit': FileEdit,
  archive: Archive,
  trash: Trash2,
  'help-circle': HelpCircle,
  handshake: Handshake,
  bell: Bell,
  mail: Mail,
  folder: Folder,
  user: User,
  building: Building2,
};

export default function InboxProfessional() {
  const [folders, setFolders] = useState<EmailFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<EmailFolder | null>(null);
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
  const [suggestions, setSuggestions] = useState<EmailSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'starred'>('all');

  useEffect(() => {
    loadInbox();
  }, []);

  async function loadInbox() {
    try {
      setLoading(true);

      // Charger les dossiers réels depuis la base
      const { data: foldersData, error: foldersError } = await supabase
        .from('email_folders')
        .select('*')
        .order('display_order');

      if (foldersError) throw foldersError;

      // Compter les emails par dossier
      const foldersWithCounts = await Promise.all((foldersData || []).map(async (folder) => {
        const { count: totalCount } = await supabase
          .from('email_messages')
          .select('*', { count: 'exact', head: true })
          .eq('folder_id', folder.id)
          .is('is_deleted', false);

        const { count: unreadCount } = await supabase
          .from('email_messages')
          .select('*', { count: 'exact', head: true })
          .eq('folder_id', folder.id)
          .eq('is_read', false)
          .is('is_deleted', false);

        return {
          ...folder,
          total_count: totalCount || 0,
          unread_count: unreadCount || 0,
          folder_type: folder.folder_type || (folder.is_system ? 'system' : 'custom')
        };
      }));

      setFolders(foldersWithCounts);
      setSelectedFolder(foldersWithCounts[0]);

      // Charger les emails
      const { data: emailData, error: emailError } = await supabase
        .from('email_messages')
        .select(`
          *,
          lead:lead_id(id, full_name, email)
        `)
        .is('is_deleted', false)
        .order('received_at', { ascending: false })
        .limit(100);

      if (emailError) throw emailError;

      setEmails(emailData || []);

      // Charger les suggestions en attente
      const { data: suggestionsData, error: suggestionsError } = await supabase
        .from('email_suggestions')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (!suggestionsError) {
        setSuggestions(suggestionsData || []);
      }
    } catch (error) {
      console.error('Erreur chargement inbox:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailAction(emailId: string, action: string) {
    try {
      // Enregistrer l'action
      await supabase.from('email_actions').insert({
        email_id: emailId,
        action_type: action,
        performed_by: (await supabase.auth.getUser()).data.user?.id
      });

      // Mettre à jour l'email selon l'action
      const updates: any = {};
      if (action === 'star') updates.is_starred = true;
      if (action === 'unstar') updates.is_starred = false;
      if (action === 'archive') updates.is_archived = true;
      if (action === 'delete') updates.is_deleted = true;
      if (action === 'mark_read') updates.is_read = true;
      if (action === 'mark_unread') updates.is_read = false;

      await supabase
        .from('email_messages')
        .update(updates)
        .eq('id', emailId);

      // Rafraîchir
      loadInbox();
    } catch (error) {
      console.error('Erreur action email:', error);
    }
  }

  async function classifyAllEmails() {
    try {
      setLoading(true);

      // Classifier tous les emails non classés
      const { data: unclassifiedEmails } = await supabase
        .from('email_messages')
        .select('id')
        .is('folder_id', null)
        .is('is_deleted', false)
        .limit(50);

      if (unclassifiedEmails && unclassifiedEmails.length > 0) {
        for (const email of unclassifiedEmails) {
          await supabase.rpc('classify_email_intelligent', {
            p_email_id: email.id
          });
        }

        alert(`✅ ${unclassifiedEmails.length} emails classifiés avec succès !`);
        loadInbox();
      } else {
        alert('Aucun email à classifier');
      }
    } catch (error) {
      console.error('Erreur classification:', error);
      alert('Erreur lors de la classification automatique');
    } finally {
      setLoading(false);
    }
  }

  async function handleSuggestion(suggestionId: string, action: 'accept' | 'reject') {
    try {
      const suggestion = suggestions.find(s => s.id === suggestionId);
      if (!suggestion) return;

      if (action === 'accept') {
        // Appliquer la suggestion
        if (suggestion.suggestion_type === 'create_lead') {
          // Créer un nouveau lead
          const email = emails.find(e => e.id === suggestion.email_id);
          if (email) {
            const { data: newLead } = await supabase
              .from('crm_leads')
              .insert({
                email: email.from_email,
                full_name: email.from_name || email.from_email,
                status: 'NEW_LEAD',
                source: 'Email'
              })
              .select()
              .single();

            if (newLead) {
              await supabase
                .from('email_messages')
                .update({ lead_id: newLead.id })
                .eq('id', suggestion.email_id);
            }
          }
        } else if (suggestion.suggestion_type === 'link_to_lead') {
          // Lier à un lead existant
          await supabase
            .from('email_messages')
            .update({ lead_id: suggestion.suggested_data.lead_id })
            .eq('id', suggestion.email_id);
        } else if (suggestion.suggestion_type === 'move_to_folder') {
          // Déplacer vers un dossier
          await supabase
            .from('email_messages')
            .update({ folder_id: suggestion.suggested_data.folder_id })
            .eq('id', suggestion.email_id);
        }
      }

      // Mettre à jour le statut de la suggestion
      await supabase
        .from('email_suggestions')
        .update({
          status: action === 'accept' ? 'accepted' : 'rejected',
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', suggestionId);

      loadInbox();
    } catch (error) {
      console.error('Erreur traitement suggestion:', error);
    }
  }

  function toggleFolder(folderId: string) {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  }

  function renderFolder(folder: EmailFolder, level: number = 0) {
    const FolderIcon = FOLDER_ICONS[folder.icon] || Folder;
    const isExpanded = expandedFolders.has(folder.id);
    const hasChildren = folder.children && folder.children.length > 0;

    return (
      <div key={folder.id}>
        <button
          onClick={() => {
            setSelectedFolder(folder);
            if (hasChildren) toggleFolder(folder.id);
          }}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
            selectedFolder?.id === folder.id
              ? 'bg-blue-600 text-white font-semibold'
              : 'text-gray-300 hover:bg-gray-700'
          }`}
          style={{ paddingLeft: `${level * 16 + 12}px` }}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFolder(folder.id);
              }}
              className="p-0.5"
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          )}
          <FolderIcon className="w-5 h-5 flex-shrink-0" style={{ color: folder.color }} />
          <span className="flex-1 text-left text-sm truncate">{folder.name}</span>
          {folder.unread_count > 0 && (
            <span className="bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {folder.unread_count}
            </span>
          )}
          <span className="text-xs text-gray-500">
            {folder.total_count}
          </span>
        </button>
        {hasChildren && isExpanded && (
          <div className="ml-2">
            {folder.children!.map(child => renderFolder(child, level + 1))}
          </div>
        )}
      </div>
    );
  }

  const filteredEmails = emails.filter(email => {
    if (filterType === 'unread' && email.is_read) return false;
    if (filterType === 'starred' && !email.is_starred) return false;
    if (searchQuery && !email.subject.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !email.from_email.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Chargement de l'inbox...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex bg-gray-900">
      {/* Sidebar - Dossiers */}
      <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Inbox className="w-5 h-5" />
            Inbox Multicanal
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {folders.map(folder => renderFolder(folder))}
        </div>

        <div className="p-3 border-t border-gray-700">
          <button
            onClick={() => setShowNewFolderDialog(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
          >
            <FolderPlus className="w-4 h-4" />
            Nouveau dossier
          </button>
        </div>
      </div>

      {/* Liste des emails */}
      <div className="w-96 bg-gray-850 border-r border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700 space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <button
              onClick={() => loadInbox()}
              className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filterType === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Tous
            </button>
            <button
              onClick={() => setFilterType('unread')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filterType === 'unread' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Non lus
            </button>
            <button
              onClick={() => setFilterType('starred')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filterType === 'starred' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Favoris
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredEmails.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <Mail className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Aucun email dans ce dossier</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {filteredEmails.map((email) => (
                <button
                  key={email.id}
                  onClick={() => setSelectedEmail(email)}
                  className={`w-full p-4 text-left hover:bg-gray-750 transition-colors ${
                    selectedEmail?.id === email.id ? 'bg-gray-750' : ''
                  } ${!email.is_read ? 'bg-blue-900/20' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 pt-1">
                      {!email.is_read && <Circle className="w-2 h-2 fill-blue-500 text-blue-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className={`text-sm truncate ${!email.is_read ? 'font-bold text-white' : 'text-gray-300'}`}>
                          {email.from_name || email.from_email}
                        </p>
                        {email.is_starred && <Star className="w-4 h-4 fill-yellow-400 text-yellow-400 flex-shrink-0" />}
                      </div>
                      <p className={`text-sm mb-1 truncate ${!email.is_read ? 'font-semibold text-white' : 'text-gray-400'}`}>
                        {email.subject}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {email.body_text?.substring(0, 80)}...
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Clock className="w-3 h-3 text-gray-500" />
                        <span className="text-xs text-gray-500">
                          {new Date(email.received_at).toLocaleString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        {email.lead && (
                          <>
                            <User className="w-3 h-3 text-green-500 ml-2" />
                            <span className="text-xs text-green-400">{email.lead.full_name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Détail de l'email */}
      <div className="flex-1 bg-gray-900 flex flex-col">
        {selectedEmail ? (
          <>
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-white mb-2">{selectedEmail.subject}</h2>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span>{selectedEmail.from_name || selectedEmail.from_email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>
                        {new Date(selectedEmail.received_at).toLocaleString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedEmail(null)}
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEmailAction(selectedEmail.id, 'reply')}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  <Reply className="w-4 h-4" />
                  Répondre
                </button>
                <button
                  onClick={() => handleEmailAction(selectedEmail.id, 'forward')}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                >
                  <Forward className="w-4 h-4" />
                  Transférer
                </button>
                <button
                  onClick={() => handleEmailAction(selectedEmail.id, selectedEmail.is_starred ? 'unstar' : 'star')}
                  className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  <Star className={`w-5 h-5 ${selectedEmail.is_starred ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`} />
                </button>
                <button
                  onClick={() => handleEmailAction(selectedEmail.id, 'archive')}
                  className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  <Archive className="w-5 h-5 text-gray-400" />
                </button>
                <button
                  onClick={() => handleEmailAction(selectedEmail.id, 'delete')}
                  className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  <Trash2 className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="prose prose-invert max-w-none">
                {selectedEmail.body_html ? (
                  <div dangerouslySetInnerHTML={{ __html: selectedEmail.body_html }} />
                ) : (
                  <p className="whitespace-pre-wrap text-gray-300">{selectedEmail.body_text}</p>
                )}
              </div>

              {selectedEmail.lead && (
                <div className="mt-6 p-4 bg-green-900/20 border border-green-700 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5 text-green-400" />
                      <div>
                        <p className="text-sm font-semibold text-green-400">Lead associé</p>
                        <p className="text-sm text-gray-300">{selectedEmail.lead.full_name}</p>
                      </div>
                    </div>
                    <a
                      href={`/backoffice/crm/lead/${selectedEmail.lead.id}`}
                      className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Voir le lead
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <Mail className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg">Sélectionnez un email pour le lire</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
