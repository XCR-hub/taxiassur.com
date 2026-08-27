import { useState, useEffect } from 'react';
import { nativeAdminIntelligentInbox, nativeAdminIntelligentInboxAction, nativeAdminInboxWorkflow } from '@/lib/native-admin-data';
import { supabase } from '@/lib/supabase';
import { invokeIdempotentDelivery } from '@/lib/invoke-idempotent-delivery';
import { toast } from '@/lib/toast';
import {
  Mail,
  Inbox,
  Send,
  FileText,
  Trash2,
  Archive,
  AlertCircle,
  CheckCircle2,
  Loader2,
  FolderPlus,
  ChevronRight,
  ChevronDown,
  Star,
  Reply,
  Forward,
  MoreVertical,
  Search,
  Filter,
  RefreshCw,
  Tag,
  User,
  Building2,
  Bell,
  XCircle,
  Shield
} from 'lucide-react';

interface Email {
  id: string;
  from_email: string;
  from_name?: string;
  to_email: string;
  subject: string;
  body_text: string;
  body_html?: string;
  received_at: string;
  lead_id?: string;
  status: string;
  classification?: EmailClassification;
  folders?: EmailFolder[];
  thread?: EmailThread;
}

interface EmailClassification {
  id: string;
  classification_type: string;
  confidence_score: number;
  suggested_action: string;
  suggested_lead_id?: string;
  reason: string;
  keywords_matched: string[];
  is_reviewed: boolean;
}

interface EmailFolder {
  id: string;
  name: string;
  folder_type: string;
  icon?: string;
  color?: string;
  is_system: boolean;
  lead_id?: string;
  parent_folder_id?: string;
  email_count?: number;
  children?: EmailFolder[];
}

interface EmailThread {
  id: string;
  subject: string;
  message_count: number;
  participants: string[];
  lead_id?: string;
}

export default function InboxIntelligent() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [folders, setFolders] = useState<EmailFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<string>('all');
  const [classifying, setClassifying] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  useEffect(() => {
    loadFolders();
    loadEmails();
  }, []);

  useEffect(() => {
    if (selectedFolder) {
      loadEmailsForFolder(selectedFolder);
    }
  }, [selectedFolder]);

  async function loadFolders() {
    try {
      const response = await nativeAdminIntelligentInbox() as { folders?: EmailFolder[] };
      const data = response.folders || [];

      // Organiser en arborescence
      const folderTree = buildFolderTree(data || []);
      setFolders(folderTree);

      // Sélectionner la boîte de réception par défaut
      const inbox = data?.find(f => f.name === 'Boîte de réception');
      if (inbox && !selectedFolder) {
        setSelectedFolder(inbox.id);
      }
    } catch (error) {
      console.error('Error loading folders:', error);
    }
  }

  function buildFolderTree(folders: any[]): EmailFolder[] {
    const folderMap = new Map<string, EmailFolder>();
    const rootFolders: EmailFolder[] = [];

    // Créer une map de tous les dossiers
    folders.forEach(folder => {
      folderMap.set(folder.id, { ...folder, children: [] });
    });

    // Construire l'arborescence
    folders.forEach(folder => {
      const folderNode = folderMap.get(folder.id)!;
      if (folder.parent_folder_id) {
        const parent = folderMap.get(folder.parent_folder_id);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(folderNode);
        }
      } else {
        rootFolders.push(folderNode);
      }
    });

    return rootFolders;
  }

  async function loadEmails() {
    try {
      setLoading(true);
      const data = await nativeAdminIntelligentInbox() as { emails?: Email[] };
      setEmails(data.emails || []);
    } catch (error) {
      console.error('Error loading emails:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadEmailsForFolder(folderId: string) {
    try {
      setLoading(true);
      const data = await nativeAdminIntelligentInbox(folderId) as { emails?: Email[] };
      setEmails(data.emails || []);
    } catch (error) {
      console.error('Error loading folder emails:', error);
    } finally {
      setLoading(false);
    }
  }

  async function classifyEmail(emailId: string) {
    try {
      setClassifying(emailId);
      const response = await nativeAdminIntelligentInboxAction('classify', { email_id: emailId }) as { classification: EmailClassification };
      const data = response.classification;

      toast.success(`✅ Email classifié: ${data.classification_type}\n${data.reason}`);
      loadEmails();
      if (selectedFolder) {
        loadEmailsForFolder(selectedFolder);
      }
    } catch (error) {
      console.error('Error classifying email:', error);
      toast.error(`❌ Erreur: ${error.message}`);
    } finally {
      setClassifying(null);
    }
  }

  async function createFolder() {
    if (!newFolderName.trim()) return;

    try {
      await nativeAdminIntelligentInboxAction('create_folder', { name: newFolderName, parent_folder_id: selectedFolder });

      setNewFolderName('');
      setShowNewFolderModal(false);
      loadFolders();
      toast.success('✅ Dossier créé avec succès');
    } catch (error) {
      console.error('Error creating folder:', error);
      toast.error(`❌ Erreur: ${error.message}`);
    }
  }

  async function moveToFolder(emailId: string, folderId: string) {
    try {
      await nativeAdminIntelligentInboxAction('move', { email_id: emailId, folder_id: folderId });

      toast.success('✅ Email déplacé');
      loadEmails();
    } catch (error) {
      console.error('Error moving email:', error);
      toast.error(`❌ Erreur: ${error.message}`);
    }
  }

  async function createLeadFromEmail(emailId: string) {
    const email = emails.find(e => e.id === emailId);
    if (!email) return;

    const confirmed = confirm(
      `Créer un nouveau lead à partir de cet email ?\n\n` +
      `De: ${email.from_email}\n` +
      `Sujet: ${email.subject}`
    );

    if (!confirmed) return;

    try {
      // Créer le lead
      const response = await nativeAdminInboxWorkflow('create_lead', {
        email_id: emailId,
        email: email.from_email,
        name: email.from_name || email.from_email.split('@')[0],
      }) as { lead: { id: string } };
      const lead = response.lead;

      // Lier l'email au lead
      void lead;

      // Créer le dossier lead automatique

      toast.success('✅ Lead créé avec succès !');
      loadEmails();
      loadFolders();
    } catch (error) {
      console.error('Error creating lead:', error);
      toast.error(`❌ Erreur: ${error.message}`);
    }
  }

  async function linkToExistingLead(emailId: string) {
    const leadId = prompt('Entrez l\'ID du lead ou son email:');
    if (!leadId) return;

    try {
      // Chercher le lead
      const { data: lead, error: searchError } = await supabase
        .from('crm_leads')
        .select('id, email, full_name')
        .or(`id.eq.${leadId},email.ilike.%${leadId}%`)
        .limit(1)
        .single();

      if (searchError) throw new Error('Lead non trouvé');

      const confirmed = confirm(
        `Lier cet email au lead ?\n\n` +
        `Lead: ${lead.full_name} (${lead.email})`
      );

      if (!confirmed) return;

      // Lier l'email
      await supabase
        .from('email_messages')
        .update({ lead_id: lead.id })
        .eq('id', emailId);

      // Assigner au dossier lead
      await supabase.rpc('assign_email_to_folder', {
        p_email_id: emailId,
        p_classification_type: 'lead',
        p_lead_id: lead.id
      });

      toast.success('✅ Email lié au lead');
      loadEmails();
    } catch (error) {
      console.error('Error linking to lead:', error);
      toast.error(`❌ Erreur: ${error.message}`);
    }
  }

  async function sendReply(emailId: string) {
    if (!replyContent.trim()) {
      toast.warning('Veuillez saisir un message');
      return;
    }

    const email = emails.find(e => e.id === emailId);
    if (!email) return;

    try {
      const { data: sendResult, error } = await invokeIdempotentDelivery(supabase, 'email', 'send-crm-email', {
        body: {
          to: email.from_email,
          subject: `Re: ${email.subject}`,
          content: replyContent,
          reply_to_message_id: emailId
        }
      });

      if (error || !sendResult?.success) throw error || new Error("Envoi refusé");

      // Enregistrer l'action
      await supabase
        .from('email_actions')
        .insert({
          email_id: emailId,
          action_type: 'reply',
          metadata: { content: replyContent }
        });

      toast.success('✅ Réponse envoyée');
      setReplyingTo(null);
      setReplyContent('');
    } catch (error) {
      console.error('Error sending reply:', error);
      toast.error(`❌ Erreur: ${error.message}`);
    }
  }

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const getClassificationColor = (type: string) => {
    const colors: Record<string, string> = {
      lead: 'text-green-600 bg-green-50',
      reply: 'text-blue-600 bg-blue-50',
      spam: 'text-red-600 bg-red-50',
      notification: 'text-gray-600 bg-gray-50',
      partnership: 'text-purple-600 bg-purple-50',
      other: 'text-gray-600 bg-gray-50'
    };
    return colors[type] || colors.other;
  };

  const getClassificationIcon = (type: string) => {
    const icons: Record<string, any> = {
      lead: User,
      reply: Reply,
      spam: XCircle,
      notification: Bell,
      partnership: Building2,
      other: Mail
    };
    const Icon = icons[type] || Mail;
    return <Icon className="h-4 w-4" />;
  };

  const renderFolder = (folder: EmailFolder, level: number = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const hasChildren = folder.children && folder.children.length > 0;

    return (
      <div key={folder.id}>
        <button
          onClick={() => {
            setSelectedFolder(folder.id);
            if (hasChildren) toggleFolder(folder.id);
          }}
          className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 rounded-lg transition-colors ${
            selectedFolder === folder.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
          }`}
          style={{ paddingLeft: `${12 + level * 16}px` }}
        >
          {hasChildren && (
            <span onClick={(e) => { e.stopPropagation(); toggleFolder(folder.id); }}>
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </span>
          )}
          <span>{folder.icon}</span>
          <span className="flex-1 text-left truncate">{folder.name}</span>
          {folder.email_count !== undefined && folder.email_count > 0 && (
            <span className="px-2 py-0.5 text-xs bg-gray-200 text-gray-700 rounded-full">
              {folder.email_count}
            </span>
          )}
        </button>

        {hasChildren && isExpanded && (
          <div>
            {folder.children!.map(child => renderFolder(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const filteredEmails = emails.filter(email => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        email.from_email?.toLowerCase().includes(query) ||
        email.subject?.toLowerCase().includes(query) ||
        email.body_text?.toLowerCase().includes(query)
      );
    }
    if (filterType !== 'all') {
      return email.classification?.classification_type === filterType;
    }
    return true;
  });

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">📥 Inbox Multicanal Intelligent</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={loadEmails}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Synchroniser
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Dossiers */}
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <button
              onClick={() => setShowNewFolderModal(true)}
              className="w-full px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 flex items-center justify-center gap-2 font-medium"
            >
              <FolderPlus className="h-4 w-4" />
              Nouveau dossier
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {folders.map(folder => renderFolder(folder))}
          </div>
        </div>

        {/* Liste des emails */}
        <div className="w-96 bg-white border-r border-gray-200 flex flex-col">
          {/* Barre de recherche et filtres */}
          <div className="p-4 border-b border-gray-200 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1 text-xs rounded-full whitespace-nowrap ${
                  filterType === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                Tous
              </button>
              <button
                onClick={() => setFilterType('lead')}
                className={`px-3 py-1 text-xs rounded-full whitespace-nowrap ${
                  filterType === 'lead' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                Leads
              </button>
              <button
                onClick={() => setFilterType('notification')}
                className={`px-3 py-1 text-xs rounded-full whitespace-nowrap ${
                  filterType === 'notification' ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                Notifications
              </button>
              <button
                onClick={() => setFilterType('spam')}
                className={`px-3 py-1 text-xs rounded-full whitespace-nowrap ${
                  filterType === 'spam' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                Spam
              </button>
            </div>
          </div>

          {/* Liste */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : filteredEmails.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Mail className="h-12 w-12 mb-3" />
                <p>Aucun email</p>
              </div>
            ) : (
              filteredEmails.map(email => (
                <div
                  key={email.id}
                  onClick={() => setSelectedEmail(email)}
                  className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedEmail?.id === email.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {email.from_name || email.from_email}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{email.from_email}</p>
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                      {new Date(email.received_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short'
                      })}
                    </span>
                  </div>

                  <p className="text-sm font-medium text-gray-800 truncate mb-1">
                    {email.subject || '(sans objet)'}
                  </p>

                  <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                    {email.body_text?.substring(0, 100)}...
                  </p>

                  {email.classification && (
                    <div className="flex items-center gap-2">
                      <span className={`flex items-center gap-1 px-2 py-1 text-xs rounded-full ${getClassificationColor(email.classification.classification_type)}`}>
                        {getClassificationIcon(email.classification.classification_type)}
                        {email.classification.classification_type}
                      </span>
                      {email.classification.confidence_score && (
                        <span className="text-xs text-gray-500">
                          {Math.round(email.classification.confidence_score * 100)}%
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Détail de l'email */}
        <div className="flex-1 bg-white flex flex-col">
          {selectedEmail ? (
            <>
              {/* En-tête du détail */}
              <div className="border-b border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                      {selectedEmail.subject || '(sans objet)'}
                    </h2>
                    <div className="space-y-1 text-sm">
                      <p>
                        <span className="font-medium text-gray-700">De:</span>{' '}
                        <span className="text-gray-600">
                          {selectedEmail.from_name} &lt;{selectedEmail.from_email}&gt;
                        </span>
                      </p>
                      <p>
                        <span className="font-medium text-gray-700">À:</span>{' '}
                        <span className="text-gray-600">{selectedEmail.to_email}</span>
                      </p>
                      <p>
                        <span className="font-medium text-gray-700">Date:</span>{' '}
                        <span className="text-gray-600">
                          {new Date(selectedEmail.received_at).toLocaleString('fr-FR')}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => setReplyingTo(replyingTo === selectedEmail.id ? null : selectedEmail.id)}
                      className="px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 flex items-center gap-2"
                    >
                      <Reply className="h-4 w-4" />
                      Répondre
                    </button>
                    <button
                      className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
                    >
                      <Forward className="h-4 w-4" />
                      Transférer
                    </button>
                    <button
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                      <MoreVertical className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Classification et actions suggérées */}
                {selectedEmail.classification && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Shield className="h-5 w-5 text-blue-600" />
                          <span className="font-medium text-gray-900">Classification IA</span>
                          <span className={`px-2 py-1 text-xs rounded-full ${getClassificationColor(selectedEmail.classification.classification_type)}`}>
                            {selectedEmail.classification.classification_type}
                          </span>
                          <span className="text-xs text-gray-500">
                            Confiance: {Math.round(selectedEmail.classification.confidence_score * 100)}%
                          </span>
                        </div>

                        <p className="text-sm text-gray-700 mb-3">
                          {selectedEmail.classification.reason}
                        </p>

                        {selectedEmail.classification.suggested_action && !selectedEmail.classification.is_reviewed && (
                          <div className="flex flex-wrap gap-2">
                            {selectedEmail.classification.suggested_action === 'create_lead' && (
                              <button
                                onClick={() => createLeadFromEmail(selectedEmail.id)}
                                className="px-3 py-1 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                              >
                                <User className="h-4 w-4" />
                                Créer le lead
                              </button>
                            )}
                            {selectedEmail.classification.suggested_action === 'link_to_lead' && (
                              <>
                                <button
                                  onClick={() => linkToExistingLead(selectedEmail.id)}
                                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                                >
                                  <Tag className="h-4 w-4" />
                                  Lier au lead
                                </button>
                                <button
                                  onClick={() => createLeadFromEmail(selectedEmail.id)}
                                  className="px-3 py-1 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                                >
                                  Ou créer nouveau lead
                                </button>
                              </>
                            )}
                            {selectedEmail.classification.suggested_action === 'archive' && (
                              <button
                                onClick={() => moveToFolder(selectedEmail.id, folders.find(f => f.name === 'Archives')?.id || '')}
                                className="px-3 py-1 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
                              >
                                <Archive className="h-4 w-4" />
                                Archiver
                              </button>
                            )}
                            <button
                              onClick={() => classifyEmail(selectedEmail.id)}
                              disabled={classifying === selectedEmail.id}
                              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                            >
                              {classifying === selectedEmail.id ? 'Reclassification...' : 'Reclassifier'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Formulaire de réponse */}
              {replyingTo === selectedEmail.id && (
                <div className="border-b border-gray-200 p-6 bg-blue-50">
                  <h3 className="font-medium text-gray-900 mb-3">Répondre à {selectedEmail.from_name || selectedEmail.from_email}</h3>
                  <textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Votre réponse..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={6}
                  />
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => sendReply(selectedEmail.id)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                    >
                      <Send className="h-4 w-4" />
                      Envoyer
                    </button>
                    <button
                      onClick={() => {
                        setReplyingTo(null);
                        setReplyContent('');
                      }}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}

              {/* Contenu de l'email */}
              <div className="flex-1 overflow-y-auto p-6">
                {selectedEmail.body_html ? (
                  <div
                    className="prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: selectedEmail.body_html }}
                  />
                ) : (
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
                    {selectedEmail.body_text}
                  </pre>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <Mail className="h-16 w-16 mx-auto mb-4" />
                <p className="text-lg">Sélectionnez un email pour le lire</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal nouveau dossier */}
      {showNewFolderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Créer un nouveau dossier</h3>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Nom du dossier"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              autoFocus
              onKeyPress={(e) => e.key === 'Enter' && createFolder()}
            />
            <div className="flex gap-3">
              <button
                onClick={createFolder}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Créer
              </button>
              <button
                onClick={() => {
                  setShowNewFolderModal(false);
                  setNewFolderName('');
                }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
