import React, { useEffect, useState, useCallback } from 'react';
import {
  Mail,
  RefreshCw,
  Star,
  User,
  Calendar,
  Paperclip,
  Tag,
  Search,
  ExternalLink,
  TrendingUp,
  CheckCircle,
  Send,
  Archive,
  AlertCircle,
  AlertTriangle,
  Settings,
  UserPlus,
  History,
  Clock,
  Link as LinkIcon,
  X,
  Trash2,
  ArchiveX,
  Folder,
  RotateCcw,
  Inbox,
  MailOpen,
  Users,
  Download,
  FileDown,
  Zap
} from 'lucide-react';
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
  email_status?: 'active' | 'archived' | 'deleted' | 'spam';
  folder_id?: string | null;
  deleted_at?: string | null;
  archived_at?: string | null;
}

interface ExtractedLeadInfo {
  name?: string;
  email?: string;
  phone?: string;
  city?: string;
}

interface LeadSearchResult {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  city: string | null;
  status: string;
}

interface FolderConfig {
  id: string;
  name: string;
  icon: React.ReactNode;
  count: number;
  color: string;
  filter: (email: EmailMessage) => boolean;
}

// Decoder et fonctions utilitaires
const decodeEmailContent = (text: string): string => {
  if (!text) return '';
  let decoded = text;
  decoded = decoded.replace(/=([0-9A-F]{2})/gi, (match, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });
  const utf8Fixes: Record<string, string> = {
    'Ã©': 'é', 'Ã¨': 'è', 'Ãª': 'ê', 'Ã§': 'ç', 'Ã ': 'à', 'Ã¢': 'â',
    'Ã´': 'ô', 'Ã®': 'î', 'Ã¹': 'ù', 'Ã»': 'û', 'Ã«': 'ë', 'Ã¯': 'ï',
    'Ã¼': 'ü', 'Ã‰': 'É', 'Ã€': 'À', 'â€™': "'", 'â€œ': '"',
    'â€': '"', 'â€¢': '•', 'â€"': '—', 'â‚¬': '€',
  };
  for (const [wrong, correct] of Object.entries(utf8Fixes)) {
    decoded = decoded.replace(new RegExp(wrong, 'g'), correct);
  }
  const textarea = document.createElement('textarea');
  textarea.innerHTML = decoded;
  decoded = textarea.value;
  return decoded;
};

const cleanEmailPreview = (text: string): string => {
  if (!text) return '';
  let cleaned = decodeEmailContent(text);
  cleaned = cleaned
    .replace(/--[0-9A-F]+_NextPart_[0-9A-F._]+/g, '')
    .replace(/Content-Type:.*?(?:\r?\n|$)/gi, '')
    .replace(/Content-Transfer-Encoding:.*?(?:\r?\n|$)/gi, '')
    .replace(/charset="?[^"\r\n]+"?/gi, '')
    .replace(/boundary="?[^"\r\n]+"?/gi, '')
    .replace(/={20,}/g, '')
    .replace(/\r?\n\s*\r?\n/g, '\n\n')
    .replace(/\s{3,}/g, ' ')
    .trim();
  return cleaned;
};

const stripAllInlineStyles = (html: string): string => {
  if (!html) return '';
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const allElements = doc.querySelectorAll('*');
    allElements.forEach(element => {
      element.removeAttribute('style');
      element.removeAttribute('bgcolor');
      element.removeAttribute('background');
      element.removeAttribute('color');
      element.removeAttribute('class');
    });
    return doc.body.innerHTML;
  } catch (error) {
    console.error('Erreur lors du nettoyage du HTML:', error);
    return html
      .replace(/style\s*=\s*["'][^"']*["']/gi, '')
      .replace(/bgcolor\s*=\s*["']?[^"'\s>]*["']?/gi, '')
      .replace(/background\s*=\s*["']?[^"'\s>]*["']?/gi, '')
      .replace(/color\s*=\s*["']?[^"'\s>]*["']?/gi, '')
      .replace(/class\s*=\s*["'][^"']*["']/gi, '');
  }
};

const extractLeadInfoFromEmail = (email: EmailMessage): ExtractedLeadInfo | null => {
  const text = email.body_text || '';
  const html = email.body_html || '';
  const content = text + ' ' + html;
  if (!email.subject?.toLowerCase().includes('nouveau lead') &&
      !email.subject?.toLowerCase().includes('new lead') &&
      !content.toLowerCase().includes('nouveau lead')) {
    return null;
  }
  const info: ExtractedLeadInfo = {};
  const emailMatch = content.match(/(?:EMAIL|E-mail|Courriel)[:\s]*(?:<[^>]*>)*\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
  if (emailMatch) info.email = emailMatch[1].toLowerCase();
  const phoneMatch = content.match(/(?:TELEPHONE|Tel|Phone|Portable|Mobile)[:\s]*(?:<[^>]*>)*\s*(0[1-9][0-9]{8,9})/i);
  if (phoneMatch) info.phone = phoneMatch[1];
  const nameMatch = content.match(/(?:NOM COMPLET|Nom|Name)[:\s]*(?:<[^>]*>)*\s*([A-Za-zÀ-ÿ\s-]+?)(?:<|$|\n)/i);
  if (nameMatch) info.name = nameMatch[1].trim();
  const cityMatch = content.match(/(?:VILLE|City|Localisation)[:\s]*(?:<[^>]*>)*\s*([A-Za-zÀ-ÿ\s-]+?)(?:<|$|\n)/i);
  if (cityMatch) info.city = cityMatch[1].trim();
  const subjectMatch = email.subject?.match(/Nouveau Lead\s*:\s*([^-]+)\s*-\s*(.+)/i);
  if (subjectMatch) {
    if (!info.name) info.name = subjectMatch[1].trim();
    if (!info.city) info.city = subjectMatch[2].trim();
  }
  return (info.email || info.phone || info.name) ? info : null;
};

const extractAllEmailsFromContent = (email: EmailMessage): string[] => {
  const text = email.body_text || '';
  const html = email.body_html || '';
  const content = `${text} ${html} ${email.subject || ''}`;
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
  const matches = content.match(emailRegex) || [];
  const uniqueEmails = [...new Set(matches)]
    .filter(e => !e.toLowerCase().includes('taxiassur'))
    .filter(e => e !== email.from_email);
  return [email.from_email, ...uniqueEmails];
};

const CRMInboxMulticanal: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<EmailMessage | null>(null);
  const [foundLeadId, setFoundLeadId] = useState<string | null>(null);
  const [extractedInfo, setExtractedInfo] = useState<ExtractedLeadInfo | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | 'starred' | 'leads' | 'mails' | 'archived'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({ total: 0, unread: 0, leads: 0, starred: 0, archived: 0, mails: 0 });
  const [autoSyncActive, setAutoSyncActive] = useState(false);
  const [lastAutoSync, setLastAutoSync] = useState<string | null>(null);
  const [draggedEmail, setDraggedEmail] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [emailsFoundInContent, setEmailsFoundInContent] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<LeadSearchResult[]>([]);
  const [leadSearchQuery, setLeadSearchQuery] = useState('');
  const [searchingLeads, setSearchingLeads] = useState(false);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [replySending, setReplySending] = useState(false);

  // Afficher un toast
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Charger les stats
  const loadStats = async () => {
    try {
      const { count: total } = await supabase
        .from('email_messages')
        .select('*', { count: 'exact', head: true })
        .or('email_status.is.null,email_status.eq.active');
      const { count: unread } = await supabase
        .from('email_messages')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false)
        .or('email_status.is.null,email_status.eq.active');
      const { count: leads } = await supabase
        .from('email_messages')
        .select('*', { count: 'exact', head: true })
        .not('lead_id', 'is', null)
        .or('email_status.is.null,email_status.eq.active');
      const { count: starred } = await supabase
        .from('email_messages')
        .select('*', { count: 'exact', head: true })
        .eq('is_starred', true)
        .or('email_status.is.null,email_status.eq.active');
      const { count: archived } = await supabase
        .from('email_messages')
        .select('*', { count: 'exact', head: true })
        .eq('email_status', 'archived');
      const { count: mails } = await supabase
        .from('email_messages')
        .select('*', { count: 'exact', head: true })
        .eq('classification', 'non_lead')
        .or('email_status.is.null,email_status.eq.active');
      setStats({
        total: total || 0,
        unread: unread || 0,
        leads: leads || 0,
        starred: starred || 0,
        archived: archived || 0,
        mails: mails || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  // Charger les messages
  const loadMessages = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('email_messages')
        .select('*')
        .order('received_at', { ascending: false })
        .limit(500);
      if (filter === 'archived') {
        query = query.eq('email_status', 'archived');
      } else {
        query = query.or('email_status.is.null,email_status.eq.active');
        if (filter === 'unread') {
          query = query.eq('is_read', false);
        } else if (filter === 'starred') {
          query = query.eq('is_starred', true);
        } else if (filter === 'leads') {
          query = query.not('lead_id', 'is', null);
        } else if (filter === 'mails') {
          query = query.eq('classification', 'non_lead');
        }
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

  // Synchroniser les emails
  const syncEmails = async () => {
    try {
      setSyncing(true);
      showToast('🔄 Synchronisation en cours...');
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-all-emails-complete`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );
      const result = await response.json();
      if (result.success) {
        showToast(`✅ ${result.stats?.emails_retrieved || 0} emails synchronisés !`);
        await loadMessages();
        await loadStats();
      } else {
        showToast('❌ Erreur de synchronisation');
      }
    } catch (error) {
      console.error('Error syncing emails:', error);
      showToast('❌ Erreur réseau');
    } finally {
      setSyncing(false);
    }
  };

  // Créer automatiquement les leads depuis les emails
  const autoCreateLeads = async () => {
    try {
      setSyncing(true);
      showToast('🤖 Création automatique des leads...');
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auto-create-leads-from-emails`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );
      const result = await response.json();
      if (result.success) {
        showToast(`✅ ${result.summary?.leads_created || 0} leads créés, ${result.summary?.emails_linked || 0} emails liés !`);
        await loadMessages();
        await loadStats();
      } else {
        showToast('❌ Erreur création automatique');
      }
    } catch (error) {
      console.error('Error auto-creating leads:', error);
      showToast('❌ Erreur réseau');
    } finally {
      setSyncing(false);
    }
  };

  // Marquer comme lu
  const markAsRead = async (emailId: string) => {
    try {
      await supabase.from('email_messages').update({ is_read: true }).eq('id', emailId);
      setMessages(messages.map((e) => (e.id === emailId ? { ...e, is_read: true } : e)));
      await loadStats();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // Toggle star
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
      showToast(!currentState ? '⭐ Ajouté aux favoris' : 'Retiré des favoris');
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // Archiver
  const archiveEmail = async (emailId: string) => {
    try {
      await supabase.rpc('archive_email', { p_email_id: emailId });
      await loadMessages();
      await loadStats();
      setSelectedMessage(null);
      showToast('📦 Email archivé');
    } catch (error) {
      console.error('Error archiving email:', error);
      showToast('❌ Erreur archivage');
    }
  };

  // Supprimer
  const deleteEmail = async (emailId: string) => {
    if (!confirm('Mettre cet email à la corbeille ?')) return;
    try {
      await supabase.rpc('delete_email', { p_email_id: emailId });
      await loadMessages();
      await loadStats();
      setSelectedMessage(null);
      showToast('🗑️ Email supprimé');
    } catch (error) {
      console.error('Error deleting email:', error);
      showToast('❌ Erreur suppression');
    }
  };

  // Classer comme non-lead
  const classifyAsNonLead = async (emailId: string) => {
    try {
      await supabase
        .from('email_messages')
        .update({
          classification: 'non_lead',
          confidence_score: 1.0,
          is_read: true,
        })
        .eq('id', emailId);
      setMessages(
        messages.map((e) =>
          e.id === emailId
            ? { ...e, classification: 'non_lead', confidence_score: 1.0, is_read: true }
            : e
        )
      );
      await loadStats();
      showToast('📁 Classé dans "Mails"');
      setSelectedMessage(null);
    } catch (error) {
      console.error('Error classifying email:', error);
      showToast('❌ Erreur classification');
    }
  };

  // Lier l'historique des emails à un lead
  const linkEmailHistoryToLead = async (leadId: string, senderEmail: string) => {
    const { data: allSenderEmails, error: emailsError } = await supabase
      .from('email_messages')
      .select('*')
      .eq('from_email', senderEmail)
      .order('received_at', { ascending: true });
    if (emailsError) throw emailsError;
    let linkedCount = 0;
    let interactionsCreated = 0;
    if (allSenderEmails && allSenderEmails.length > 0) {
      const emailUpdates = allSenderEmails.map((e) =>
        supabase.from('email_messages').update({ lead_id: leadId }).eq('id', e.id)
      );
      await Promise.all(emailUpdates);
      linkedCount = allSenderEmails.length;
      const interactions = allSenderEmails.map((e) => ({
        lead_id: leadId,
        type: 'email' as const,
        direction: e.direction as 'inbound' | 'outbound',
        subject: e.subject,
        content: e.body_text?.substring(0, 5000) || '',
        created_at: e.received_at,
        metadata: {
          email_id: e.id,
          from: e.from_email,
          to: e.to_emails,
        },
      }));
      const { data: existingInteractions } = await supabase
        .from('crm_interactions')
        .select('metadata')
        .eq('lead_id', leadId);
      const existingEmailIds = new Set(
        existingInteractions?.map((i: any) => i.metadata?.email_id).filter(Boolean) || []
      );
      const newInteractions = interactions.filter(
        (i) => !existingEmailIds.has(i.metadata.email_id)
      );
      if (newInteractions.length > 0) {
        const { error: interactionsError } = await supabase
          .from('crm_interactions')
          .insert(newInteractions);
        if (!interactionsError) {
          interactionsCreated = newInteractions.length;
        }
      }
    }
    return { linkedCount, interactionsCreated };
  };

  // Créer un lead depuis l'email
  const createLeadFromEmail = async (email: EmailMessage) => {
    if (!extractedInfo) return;
    try {
      const nameParts = (extractedInfo.name || email.from_name || '').split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      const { data: newLead, error: leadError } = await supabase
        .from('crm_leads')
        .insert({
          first_name: firstName,
          last_name: lastName,
          email: extractedInfo.email || email.from_email,
          phone: extractedInfo.phone || null,
          status: 'NOUVEAU_LEAD',
          source: 'email',
          notes: `Lead créé depuis l'email: ${email.subject}\n\nContenu:\n${email.body_text?.substring(0, 500)}`,
        })
        .select()
        .single();
      if (leadError) throw leadError;
      const { linkedCount, interactionsCreated } = await linkEmailHistoryToLead(
        newLead.id,
        email.from_email
      );
      setFoundLeadId(newLead.id);
      await loadMessages();
      await loadStats();
      showToast(`✅ Lead créé ! ${linkedCount} emails liés, ${interactionsCreated} interactions`);
    } catch (error) {
      console.error('Error creating lead from email:', error);
      showToast('❌ Erreur création lead');
    }
  };

  // Rechercher des leads
  const searchLeads = async (query: string) => {
    if (!query || query.length < 3) {
      setSearchResults([]);
      return;
    }
    setSearchingLeads(true);
    try {
      const { data, error } = await supabase
        .from('crm_leads')
        .select('id, first_name, last_name, email, phone, city, status')
        .or(`email.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%,phone.ilike.%${query}%`)
        .limit(10);
      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching leads:', error);
      setSearchResults([]);
    } finally {
      setSearchingLeads(false);
    }
  };

  // Assigner manuellement un email à un lead
  const assignEmailToLead = async (leadId: string, emailId: string) => {
    try {
      const { error } = await supabase
        .from('email_messages')
        .update({ lead_id: leadId, auto_matched: false })
        .eq('id', emailId);
      if (error) throw error;
      await loadMessages();
      await loadStats();
      setShowAssignModal(false);
      setSelectedMessage(null);
      showToast('✅ Email assigné au lead !');
    } catch (error) {
      console.error('Error assigning email to lead:', error);
      showToast('❌ Erreur assignation');
    }
  };

  // Envoyer une réponse
  const sendReply = async () => {
    if (!selectedMessage || !replyContent.trim()) {
      showToast('⚠️ Veuillez saisir un message');
      return;
    }
    setReplySending(true);
    try {
      const { error } = await supabase.functions.invoke('send-crm-email', {
        body: {
          to: selectedMessage.from_email,
          subject: `Re: ${selectedMessage.subject}`,
          content: `<p>${replyContent.replace(/\n/g, '<br>')}</p>
                 <hr>
                 <p><em>Message original :</em></p>
                 <blockquote>${selectedMessage.body_html || selectedMessage.body_text}</blockquote>`,
        },
      });
      if (error) throw error;
      await loadMessages();
      setShowReplyModal(false);
      setReplyContent('');
      showToast('✅ Réponse envoyée !');
    } catch (error) {
      console.error('Error sending reply:', error);
      showToast('❌ Erreur envoi réponse');
    } finally {
      setReplySending(false);
    }
  };

  // Ouvrir la modal d'assignation
  const openAssignModal = () => {
    if (!selectedMessage) return;
    const emails = extractAllEmailsFromContent(selectedMessage);
    setEmailsFoundInContent(emails);
    if (emails.length > 0) {
      setLeadSearchQuery(emails[0]);
      searchLeads(emails[0]);
    }
    setShowAssignModal(true);
  };

  // Trouver le lead depuis l'email
  useEffect(() => {
    const findLeadFromNotification = async () => {
      setFoundLeadId(null);
      setExtractedInfo(null);
      if (!selectedMessage) return;
      if (selectedMessage.lead_id) {
        setFoundLeadId(selectedMessage.lead_id);
        return;
      }
      const info = extractLeadInfoFromEmail(selectedMessage);
      if (!info) return;
      setExtractedInfo(info);
      try {
        let query = supabase.from('crm_leads').select('id').limit(1);
        if (info.email) {
          const { data } = await query.eq('email', info.email).maybeSingle();
          if (data) {
            setFoundLeadId(data.id);
            return;
          }
        }
        if (info.phone) {
          const cleanPhone = info.phone.replace(/\s/g, '');
          const { data } = await supabase
            .from('crm_leads')
            .select('id')
            .or(`phone.eq.${cleanPhone},phone.eq.${cleanPhone.replace(/^0/, '+33')}`)
            .limit(1)
            .maybeSingle();
          if (data) {
            setFoundLeadId(data.id);
            return;
          }
        }
      } catch (error) {
        console.error('Error finding lead from notification:', error);
      }
    };
    findLeadFromNotification();
  }, [selectedMessage]);

  // Charger les données au montage
  useEffect(() => {
    loadMessages();
    loadStats();
    const interval = setInterval(() => {
      loadMessages();
      loadStats();
    }, 30000);
    return () => clearInterval(interval);
  }, [filter, searchQuery]);

  // Drag & Drop
  const handleDragStart = (e: React.DragEvent, emailId: string) => {
    setDraggedEmail(emailId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetFolder: string) => {
    e.preventDefault();
    if (!draggedEmail) return;
    const email = messages.find(e => e.id === draggedEmail);
    if (!email) return;
    try {
      if (targetFolder === 'archived') {
        await archiveEmail(draggedEmail);
      } else if (targetFolder === 'starred') {
        await toggleStar(draggedEmail, email.is_starred);
      } else if (targetFolder === 'mails') {
        await classifyAsNonLead(draggedEmail);
      }
    } finally {
      setDraggedEmail(null);
    }
  };

  // Raccourcis clavier
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!selectedMessage) return;
    if ((e.target as HTMLElement).tagName === 'INPUT' ||
        (e.target as HTMLElement).tagName === 'TEXTAREA') {
      return;
    }
    switch (e.key.toLowerCase()) {
      case 'r':
        e.preventDefault();
        setReplyContent('');
        setShowReplyModal(true);
        break;
      case 'e':
      case 'a':
        e.preventDefault();
        archiveEmail(selectedMessage.id);
        break;
      case 's':
        e.preventDefault();
        toggleStar(selectedMessage.id, selectedMessage.is_starred);
        break;
      case 'delete':
        e.preventDefault();
        deleteEmail(selectedMessage.id);
        break;
      case 'escape':
        e.preventDefault();
        setSelectedMessage(null);
        break;
    }
  }, [selectedMessage, messages]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Configuration des dossiers
  const folders: FolderConfig[] = [
    {
      id: 'inbox',
      name: 'Boîte de réception',
      icon: <Inbox size={18} />,
      count: stats.total,
      color: 'text-blue-600',
      filter: () => true,
    },
    {
      id: 'unread',
      name: 'Non lus',
      icon: <MailOpen size={18} />,
      count: stats.unread,
      color: 'text-orange-600',
      filter: (e) => !e.is_read,
    },
    {
      id: 'starred',
      name: 'Favoris',
      icon: <Star size={18} />,
      count: stats.starred,
      color: 'text-yellow-500',
      filter: (e) => e.is_starred,
    },
    {
      id: 'leads',
      name: 'Leads',
      icon: <Users size={18} />,
      count: stats.leads,
      color: 'text-green-600',
      filter: (e) => !!e.lead_id,
    },
    {
      id: 'mails',
      name: 'Mails',
      icon: <Folder size={18} />,
      count: stats.mails,
      color: 'text-gray-600',
      filter: (e) => e.classification === 'non_lead',
    },
    {
      id: 'archived',
      name: 'Archives',
      icon: <Archive size={18} />,
      count: stats.archived,
      color: 'text-gray-500',
      filter: (e) => e.email_status === 'archived',
    },
  ];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}j`;
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  };

  const currentFolder = folders.find(f => f.id === filter);
  const filteredMessages = filter === 'all'
    ? messages
    : messages.filter(currentFolder?.filter || (() => true));

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-[100] bg-gray-900 text-white px-6 py-3 rounded-lg shadow-2xl animate-fade-in">
          {toastMessage}
        </div>
      )}

      {/* COLONNE 1: Dossiers */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200 space-y-3">
          <button
            onClick={syncEmails}
            disabled={syncing}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
          >
            <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Sync...' : 'Synchroniser'}
          </button>

          <button
            onClick={autoCreateLeads}
            disabled={syncing}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 font-medium"
            title="Créer automatiquement les leads depuis les emails sans lead"
          >
            <Zap size={18} />
            Créer leads auto
          </button>

          {autoSyncActive && lastAutoSync && (
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <CheckCircle size={12} className="text-green-500" />
              Auto: {new Date(lastAutoSync).toLocaleTimeString('fr-FR')}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          <div className="space-y-1">
            {folders.map((folder) => (
              <div
                key={folder.id}
                onClick={() => setFilter(folder.id as any)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, folder.id)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
                  filter === folder.id
                    ? 'bg-blue-50 border-2 border-blue-500'
                    : 'hover:bg-gray-100 border-2 border-transparent'
                }`}
              >
                <div className="flex items-center gap-3 flex-1">
                  <span className={folder.color}>{folder.icon}</span>
                  <span className={`text-sm font-medium ${filter === folder.id ? 'text-blue-900' : 'text-gray-700'}`}>
                    {folder.name}
                  </span>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  filter === folder.id ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
                }`}>
                  {folder.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-gray-200">
          <div className="text-xs text-gray-500 space-y-1">
            <div className="flex items-center gap-2">
              <Clock size={12} />
              <span>Auto-refresh: 30s</span>
            </div>
            <div className="flex items-center gap-2">
              <Settings size={12} />
              <a href="/backoffice/email-settings" className="text-blue-600 hover:underline">
                Configuration
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* COLONNE 2: Liste des emails */}
      <div className="w-96 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 p-6">
              <Mail size={48} className="mb-3" />
              <p className="text-sm font-medium">Aucun email</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredMessages.map((email) => (
                <div
                  key={email.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, email.id)}
                  onClick={() => {
                    setSelectedMessage(email);
                    if (!email.is_read) markAsRead(email.id);
                  }}
                  className={`p-3 cursor-pointer transition-all relative group ${
                    selectedMessage?.id === email.id
                      ? 'bg-blue-50 border-l-4 border-l-blue-600'
                      : email.is_read
                      ? 'hover:bg-gray-50'
                      : 'bg-blue-50/30 hover:bg-blue-50/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleStar(email.id, email.is_starred);
                      }}
                      className="flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Star
                        size={16}
                        className={email.is_starred ? 'fill-yellow-400 text-yellow-400 opacity-100' : 'text-gray-300'}
                      />
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-sm font-semibold truncate ${!email.is_read ? 'text-gray-900' : 'text-gray-700'}`}>
                          {email.from_name || email.from_email}
                        </span>
                        {email.lead_id && (
                          <User size={12} className="text-green-600 flex-shrink-0" />
                        )}
                      </div>

                      <div className={`text-sm truncate mb-1 ${!email.is_read ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                        {email.subject || '(Sans objet)'}
                      </div>

                      <div className="text-xs text-gray-500 truncate">
                        {cleanEmailPreview(email.body_text).substring(0, 80)}...
                      </div>

                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-gray-400">
                          {formatDate(email.received_at)}
                        </span>
                        {email.attachments?.length > 0 && (
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <Paperclip size={12} />
                            {email.attachments.length}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions rapides au hover */}
                  <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        archiveEmail(email.id);
                      }}
                      className="p-1 hover:bg-white rounded transition-colors"
                      title="Archiver"
                    >
                      <Archive size={14} className="text-gray-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* COLONNE 3: Détails de l'email */}
      <div className="flex-1 bg-white flex flex-col">
        {!selectedMessage ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <Mail size={64} className="mb-4" />
            <p className="text-lg font-medium">Sélectionnez un email</p>
            <p className="text-sm mt-2">Utilisez les raccourcis clavier pour naviguer</p>
            <div className="mt-6 space-y-2 text-xs bg-gray-50 p-4 rounded-lg">
              <div><kbd className="px-2 py-1 bg-white border rounded">R</kbd> Répondre</div>
              <div><kbd className="px-2 py-1 bg-white border rounded">E</kbd> Archiver</div>
              <div><kbd className="px-2 py-1 bg-white border rounded">S</kbd> Favoris</div>
              <div><kbd className="px-2 py-1 bg-white border rounded">Del</kbd> Supprimer</div>
              <div><kbd className="px-2 py-1 bg-white border rounded">Esc</kbd> Fermer</div>
            </div>
          </div>
        ) : (
          <>
            {/* Header de l'email */}
            <div className="border-b border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Fermer (Esc)"
                >
                  <X size={20} className="text-gray-500" />
                </button>

                <div className="flex items-center gap-2">
                  {foundLeadId && (
                    <a
                      href={`/backoffice/crm-killer/lead/${foundLeadId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                    >
                      <ExternalLink size={16} />
                      Voir le lead
                    </a>
                  )}

                  {!foundLeadId && extractedInfo && (
                    <button
                      onClick={() => createLeadFromEmail(selectedMessage)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      <UserPlus size={16} />
                      Créer le lead
                    </button>
                  )}

                  {!foundLeadId && (
                    <>
                      <button
                        onClick={openAssignModal}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
                      >
                        <LinkIcon size={16} />
                        Rattacher
                      </button>
                      <button
                        onClick={() => classifyAsNonLead(selectedMessage.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
                      >
                        <Folder size={16} />
                        Mails
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => toggleStar(selectedMessage.id, selectedMessage.is_starred)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Star
                      size={20}
                      className={selectedMessage.is_starred ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}
                    />
                  </button>

                  {selectedMessage.direction === 'inbound' && (
                    <button
                      onClick={() => {
                        setReplyContent('');
                        setShowReplyModal(true);
                      }}
                      className="p-2 hover:bg-blue-50 rounded-lg transition-colors text-blue-600"
                      title="Répondre (R)"
                    >
                      <Send size={20} />
                    </button>
                  )}

                  <button
                    onClick={() => archiveEmail(selectedMessage.id)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
                    title="Archiver (E)"
                  >
                    <Archive size={20} />
                  </button>

                  <button
                    onClick={() => deleteEmail(selectedMessage.id)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-red-600"
                    title="Supprimer (Del)"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                {selectedMessage.subject || '(Sans objet)'}
              </h2>

              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">De: </span>
                  <span className="font-semibold text-gray-900">
                    {selectedMessage.from_name || selectedMessage.from_email}
                  </span>
                  <span className="ml-2 text-gray-500">
                    &lt;{selectedMessage.from_email}&gt;
                  </span>
                </div>
                <div className="text-gray-500">
                  {new Date(selectedMessage.received_at).toLocaleString('fr-FR')}
                </div>
                {selectedMessage.lead_id && (
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
                      <User size={12} />
                      Lié à un lead
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Contenu de l'email */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="prose max-w-none">
                {selectedMessage.body_html ? (
                  <div
                    dangerouslySetInnerHTML={{
                      __html: stripAllInlineStyles(selectedMessage.body_html)
                    }}
                    className="text-gray-800 leading-relaxed"
                  />
                ) : (
                  <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                    {selectedMessage.body_text}
                  </div>
                )}
              </div>

              {selectedMessage.attachments?.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Paperclip size={18} />
                    Pièces jointes ({selectedMessage.attachments.length})
                  </h3>
                  <div className="space-y-2">
                    {selectedMessage.attachments.map((attachment: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors group"
                      >
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <FileDown size={18} className="text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 text-sm truncate">
                            {attachment.filename || `Fichier ${idx + 1}`}
                          </div>
                          <div className="text-xs text-gray-500 flex items-center gap-2">
                            <span>{attachment.size ? `${(attachment.size / 1024).toFixed(2)} KB` : 'Taille inconnue'}</span>
                            {attachment.content_type && (
                              <span className="px-2 py-0.5 bg-gray-200 rounded text-xs">
                                {attachment.content_type.split('/')[1]?.toUpperCase() || 'FILE'}
                              </span>
                            )}
                          </div>
                        </div>
                        {attachment.storage_path ? (
                          <a
                            href={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/email-attachments/${attachment.storage_path}`}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium opacity-0 group-hover:opacity-100"
                          >
                            <Download size={16} />
                            Télécharger
                          </a>
                        ) : attachment.url ? (
                          <a
                            href={attachment.url}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium opacity-0 group-hover:opacity-100"
                          >
                            <Download size={16} />
                            Télécharger
                          </a>
                        ) : (
                          <button
                            disabled
                            className="flex items-center gap-2 px-3 py-2 bg-gray-300 text-gray-500 rounded-lg text-sm font-medium cursor-not-allowed opacity-0 group-hover:opacity-100"
                          >
                            <Download size={16} />
                            Non disponible
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800 flex items-center gap-2">
                      <AlertCircle size={16} />
                      <span>
                        Les pièces jointes sont automatiquement extraites et peuvent être transférées au lead.
                        {selectedMessage.lead_id && (
                          <span className="font-semibold"> Ce email est lié au lead #{selectedMessage.lead_id.slice(0, 8)}.</span>
                        )}
                      </span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modal d'assignation manuelle */}
      {showAssignModal && selectedMessage && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAssignModal(false);
            }
          }}
        >
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b-2 border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <LinkIcon className="text-orange-600" size={28} />
                  Assigner l'email à un lead
                </h2>
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
              <p className="text-sm text-gray-600">
                Email de: <span className="font-semibold">{selectedMessage.from_email}</span>
              </p>
            </div>

            <div className="p-6 space-y-6">
              {emailsFoundInContent.length > 0 && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                  <p className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Mail size={18} className="text-blue-600" />
                    Emails trouvés dans le contenu:
                  </p>
                  <div className="space-y-2">
                    {emailsFoundInContent.map((email, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setLeadSearchQuery(email);
                          searchLeads(email);
                        }}
                        className="w-full text-left px-4 py-2 bg-white border border-blue-300 rounded-lg hover:bg-blue-100 hover:border-blue-400 transition-colors"
                      >
                        <code className="text-sm font-mono text-blue-900">{email}</code>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block font-semibold text-gray-900 mb-2">
                  Rechercher un lead par email, nom ou téléphone:
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    value={leadSearchQuery}
                    onChange={(e) => {
                      setLeadSearchQuery(e.target.value);
                      searchLeads(e.target.value);
                    }}
                    placeholder="Tapez au moins 3 caractères..."
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none text-gray-900"
                  />
                </div>
              </div>

              {searchingLeads && (
                <div className="text-center py-4">
                  <div className="animate-spin w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full mx-auto"></div>
                  <p className="text-sm text-gray-600 mt-2">Recherche en cours...</p>
                </div>
              )}

              {!searchingLeads && searchResults.length === 0 && leadSearchQuery.length >= 3 && (
                <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <AlertCircle size={48} className="mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-600 font-medium">Aucun lead trouvé</p>
                </div>
              )}

              {!searchingLeads && searchResults.length > 0 && (
                <div>
                  <p className="font-semibold text-gray-900 mb-3">
                    {searchResults.length} lead(s) trouvé(s):
                  </p>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {searchResults.map((lead) => (
                      <div
                        key={lead.id}
                        className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-orange-400 hover:shadow-md transition-all"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="font-bold text-gray-900 text-lg mb-1">
                              {lead.first_name || ''} {lead.last_name || '(Sans nom)'}
                            </div>
                            <div className="space-y-1 text-sm">
                              <div className="flex items-center gap-2 text-gray-700">
                                <Mail size={14} className="text-blue-600" />
                                <span className="font-mono">{lead.email}</span>
                              </div>
                              {lead.phone && (
                                <div className="flex items-center gap-2 text-gray-700">
                                  <User size={14} className="text-green-600" />
                                  {lead.phone}
                                </div>
                              )}
                              <div>
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                                  {lead.status}
                                </span>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => assignEmailToLead(lead.id, selectedMessage.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium whitespace-nowrap"
                          >
                            <LinkIcon size={16} />
                            Assigner
                          </button>
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

      {/* Modal de réponse */}
      {showReplyModal && selectedMessage && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowReplyModal(false);
          }}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Send className="w-5 h-5 text-blue-600" />
                  Répondre à : {selectedMessage.from_email}
                </h2>
                <button
                  onClick={() => setShowReplyModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={24} className="text-gray-400" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Objet : Re: {selectedMessage.subject}
                </label>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Votre message
                </label>
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Tapez votre réponse..."
                  rows={10}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Message original :</h4>
                <div className="text-sm text-gray-600 max-h-40 overflow-y-auto">
                  {cleanEmailPreview(selectedMessage.body_text || selectedMessage.body_html).substring(0, 500)}...
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowReplyModal(false)}
                className="px-6 py-2.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={replySending}
              >
                Annuler
              </button>
              <button
                onClick={sendReply}
                disabled={replySending || !replyContent.trim()}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {replySending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Envoi...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Envoyer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CRMInboxMulticanal;
