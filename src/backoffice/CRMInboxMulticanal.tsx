import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  Mail, RefreshCw, Star, User, Paperclip, Search,
  ExternalLink, CheckCircle, Send, Archive, AlertCircle,
  Settings, UserPlus, Clock, Link as LinkIcon, X, Trash2,
  Folder, Inbox, MailOpen, Users, Zap,
  ArrowLeft, Reply,
  CheckSquare, Square, AtSign,
  Phone, MapPin, Loader2, EyeOff
} from 'lucide-react';
import { SecureDocumentLink } from '@/components/crm/SecureDocumentLink';
import {
  nativeAdminLeads,
  nativeAdminInbox,
  nativeAdminInboxAction,
  nativeAdminInboxSync,
  nativeAdminInboxWorkflow,
} from '@/lib/native-admin-data';

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
  priority?: 'high' | 'normal' | 'low';
  github_status?: 'failure' | 'cancelled' | 'success' | 'unknown';
  confidence_score: number | null;
  lead_id: string | null;
  lead_name?: string | null;
  lead_email?: string | null;
  attachments: Array<{ filename?: string; content_type?: string; size?: number; storage_path?: string; url?: string }>;
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

interface LeadMailFolder {
  lead_id: string;
  lead_name: string;
  lead_email?: string | null;
  count: number;
}

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500',
  'bg-cyan-500', 'bg-violet-500', 'bg-orange-500', 'bg-teal-500',
];

const getAvatarColor = (email: string) => {
  let hash = 0;
  for (let i = 0; i < email.length; i++) hash = email.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const getInitials = (name: string | null, email: string): string => {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].substring(0, 2).toUpperCase();
  }
  return email.substring(0, 2).toUpperCase();
};

const conversationKey = (email: EmailMessage): string => {
  const subject = String(email.subject || '')
    .toLowerCase()
    .replace(/^\s*((re|réf?|fw|fwd|tr)\s*:\s*)+/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  const correspondent = email.direction === 'outbound'
    ? String(email.to_emails?.[0] || '').toLowerCase()
    : String(email.from_email || '').toLowerCase();
  return `${email.lead_id || correspondent}|${subject}`;
};

const decodeEmailContent = (text: string): string => {
  if (!text) return '';
  let decoded = text;
  decoded = decoded.replace(/=([0-9A-F]{2})/gi, (match, hex) => String.fromCharCode(parseInt(hex, 16)));
  const utf8Fixes: Record<string, string> = {
    'Ã©': 'é', 'Ã¨': 'è', 'Ãª': 'ê', 'Ã§': 'ç', 'Ã ': 'à', 'Ã¢': 'â',
    'Ã´': 'ô', 'Ã®': 'î', 'Ã¹': 'ù', 'Ã»': 'û', 'Ã«': 'ë', 'Ã¯': 'ï',
    'Ã¼': 'ü', 'Ã‰': 'É', 'Ã€': 'À', 'â€™': "'", 'â€œ': '"',
    'â€': '"', 'â€¢': '•', 'â€"': '—', 'â‚¬': '€',
  };
  for (const [wrong, correct] of Object.entries(utf8Fixes)) decoded = decoded.replace(new RegExp(wrong, 'g'), correct);
  const textarea = document.createElement('textarea');
  textarea.innerHTML = decoded;
  return textarea.value;
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
    doc.querySelectorAll('*').forEach(el => {
      el.removeAttribute('style');
      el.removeAttribute('bgcolor');
      el.removeAttribute('background');
      el.removeAttribute('color');
      el.removeAttribute('class');
    });
    return doc.body.innerHTML;
  } catch {
    return html.replace(/style\s*=\s*["'][^"']*["']/gi, '').replace(/bgcolor\s*=\s*["']?[^"'\s>]*["']?/gi, '');
  }
};

const extractLeadInfoFromEmail = (email: EmailMessage): ExtractedLeadInfo | null => {
  const text = email.body_text || '';
  const html = email.body_html || '';
  const content = text + ' ' + html;
  if (!email.subject?.toLowerCase().includes('nouveau lead') &&
    !email.subject?.toLowerCase().includes('new lead') &&
    !content.toLowerCase().includes('nouveau lead')) return null;
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
  const content = `${email.body_text || ''} ${email.body_html || ''} ${email.subject || ''}`;
  const matches = content.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g) || [];
  return [...new Set(matches)]
    .filter(e => !e.toLowerCase().includes('taxiassur') && e !== email.from_email);
};

const getFileIcon = (contentType: string) => {
  if (contentType?.includes('pdf')) return '📄';
  if (contentType?.includes('image')) return '🖼️';
  if (contentType?.includes('word') || contentType?.includes('document')) return '📝';
  if (contentType?.includes('sheet') || contentType?.includes('excel')) return '📊';
  return '📎';
};

const CRMInboxMulticanal: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<EmailMessage | null>(null);
  const [foundLeadId, setFoundLeadId] = useState<string | null>(null);
  const [extractedInfo, setExtractedInfo] = useState<ExtractedLeadInfo | null>(null);
  const [filter, setFilter] = useState<string>('inbox');
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({ total: 0, unread: 0, alerts: 0, leads: 0, partners: 0, services: 0, starred: 0, archived: 0, mails: 0 });
  const [leadMailFolders, setLeadMailFolders] = useState<LeadMailFolder[]>([]);
  const [draggedEmail, setDraggedEmail] = useState<string | null>(null);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [emailsFoundInContent, setEmailsFoundInContent] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<LeadSearchResult[]>([]);
  const [leadSearchQuery, setLeadSearchQuery] = useState('');
  const [searchingLeads, setSearchingLeads] = useState(false);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [replySending, setReplySending] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [showEmailBody, setShowEmailBody] = useState<'html' | 'text'>('html');
  const messageRequestSequence = useRef(0);

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadMessages = async (showLoader = false) => {
    const requestSequence = ++messageRequestSequence.current;
    if (showLoader) setLoading(true);
    try {
      const result = await nativeAdminInbox(filter, searchQuery) as { messages?: EmailMessage[]; stats?: typeof stats; lead_folders?: LeadMailFolder[] };
      if (requestSequence !== messageRequestSequence.current) return;
      setMessages(result.messages || []);
      if (result.stats) setStats(result.stats);
      setLeadMailFolders(result.lead_folders || []);
    } catch (err) {
      console.error(err);
      if (showLoader && requestSequence === messageRequestSequence.current) {
        showToast('Impossible de charger la boîte de réception', 'error');
      }
    } finally {
      if (showLoader && requestSequence === messageRequestSequence.current) setLoading(false);
    }
  };

  const syncEmails = async () => {
    setSyncing(true);
    showToast('Synchronisation en cours...', 'info');
    try {
      const result = await nativeAdminInboxSync() as { success?: boolean; stats?: { emails_retrieved?: number } };
      if (result.success) {
        showToast(`${result.stats?.emails_retrieved || 0} emails synchronisés`, 'success');
        await loadMessages();
      } else showToast('Erreur de synchronisation', 'error');
    } catch { showToast('Erreur réseau', 'error'); } finally { setSyncing(false); }
  };

  const autoLinkExistingLeads = async () => {
    setSyncing(true);
    showToast('Rattachement aux leads existants...', 'info');
    try {
      const result = await nativeAdminInboxWorkflow('auto_create_leads') as { success?: boolean; summary?: { leads_created?: number; emails_linked?: number } };
      if (result.success) {
        showToast(`${result.summary?.emails_linked || 0} email(s) rattaché(s), aucun lead créé`, 'success');
        await loadMessages();
      } else showToast('Erreur de rattachement', 'error');
    } catch { showToast('Erreur réseau', 'error'); } finally { setSyncing(false); }
  };

  const markAsRead = async (emailId: string) => {
    await nativeAdminInboxAction('mark_read', [emailId]);
    setMessages(prev => prev.map(e => e.id === emailId ? { ...e, is_read: true } : e));
    setStats(prev => ({ ...prev, unread: Math.max(0, prev.unread - 1) }));
  };

  const markAllRead = async () => {
    setMarkingAllRead(true);
    try {
      const ids = messages.filter(message => !message.is_read).map(message => message.id);
      if (ids.length > 0) await nativeAdminInboxAction('mark_all_read', ids);
      await loadMessages();
      showToast('Tous les emails marqués comme lus', 'success');
    } catch { showToast('Erreur', 'error'); } finally { setMarkingAllRead(false); }
  };

  const toggleStar = async (emailId: string, current: boolean) => {
    await nativeAdminInboxAction('star', [emailId], { value: !current });
    setMessages(prev => prev.map(e => e.id === emailId ? { ...e, is_starred: !current } : e));
    await loadMessages();
    showToast(!current ? 'Ajouté aux favoris' : 'Retiré des favoris', 'info');
  };

  const archiveEmail = async (emailId: string) => {
    try {
      await nativeAdminInboxAction('archive', [emailId]);
      await loadMessages();
      if (selectedMessage?.id === emailId) setSelectedMessage(null);
      showToast('Email archivé', 'success');
    } catch { showToast('Erreur archivage', 'error'); }
  };

  const deleteEmail = async (emailId: string) => {
    if (!confirm('Mettre cet email à la corbeille ?')) return;
    try {
      await nativeAdminInboxAction('delete', [emailId]);
      await loadMessages();
      if (selectedMessage?.id === emailId) setSelectedMessage(null);
      showToast('Email supprimé', 'success');
    } catch { showToast('Erreur suppression', 'error'); }
  };

  const classifyAsNonLead = async (emailId: string) => {
    try {
      await nativeAdminInboxAction('classify_non_lead', [emailId]);
      setMessages(prev => prev.map(e => e.id === emailId ? { ...e, classification: 'non_lead', is_read: true } : e));
      await loadMessages();
      showToast('Classé dans "Mails"', 'info');
      setSelectedMessage(null);
    } catch { showToast('Erreur classification', 'error'); }
  };

  const createLeadFromEmail = async (email: EmailMessage) => {
    if (!extractedInfo) return;
    try {
      const result = await nativeAdminInboxWorkflow('create_lead', {
        email_id: email.id,
        email: extractedInfo.email || email.from_email,
        name: extractedInfo.name || email.from_name || '',
        phone: extractedInfo.phone || '',
        city: extractedInfo.city || '',
        notes: `Lead créé depuis l'email: ${email.subject}\n\n${email.body_text?.substring(0, 500)}`,
      }) as { lead?: { id?: string }; linkedCount?: number; interactionsCreated?: number };
      if (!result.lead?.id) throw new Error('lead_creation_failed');
      const linkedCount = result.linkedCount || 0;
      const interactionsCreated = result.interactionsCreated || 0;
      setFoundLeadId(result.lead.id);
      await loadMessages();
      showToast(`Lead créé ! ${linkedCount} emails liés, ${interactionsCreated} interactions`, 'success');
    } catch { showToast('Erreur création lead', 'error'); }
  };

  const searchLeads = async (query: string) => {
    if (!query || query.length < 3) { setSearchResults([]); return; }
    setSearchingLeads(true);
    try {
      const result = await nativeAdminLeads(query) as { leads?: LeadSearchResult[] };
      const needle = query.trim().toLowerCase();
      setSearchResults((result.leads || []).filter(lead =>
        [lead.email, lead.first_name, lead.last_name, lead.phone]
          .some(value => String(value || '').toLowerCase().includes(needle))
      ).slice(0, 10));
    } catch { setSearchResults([]); } finally { setSearchingLeads(false); }
  };

  const assignEmailToLead = async (leadId: string, emailId: string) => {
    try {
      await nativeAdminInboxAction('assign', [emailId], { lead_id: leadId });
      await loadMessages();
      setShowAssignModal(false); setSelectedMessage(null);
      showToast('Email assigné au lead !', 'success');
    } catch { showToast('Erreur assignation', 'error'); }
  };

  const sendReply = async () => {
    if (!selectedMessage || !replyContent.trim()) { showToast('Veuillez saisir un message', 'error'); return; }
    setReplySending(true);
    try {
      const sendResult = await nativeAdminInboxWorkflow('reply', {
        email_id: selectedMessage.id,
        content: replyContent,
      }) as { queued?: boolean };
      if (!sendResult.queued) throw new Error('Envoi refusé');
      await loadMessages();
      setShowReplyModal(false); setReplyContent('');
      showToast('Réponse envoyée !', 'success');
    } catch { showToast('Erreur envoi réponse', 'error'); } finally { setReplySending(false); }
  };

  const openAssignModal = () => {
    if (!selectedMessage) return;
    const emails = extractAllEmailsFromContent(selectedMessage);
    setEmailsFoundInContent(emails);
    if (emails.length > 0) { setLeadSearchQuery(emails[0]); searchLeads(emails[0]); }
    setShowAssignModal(true);
  };

  const toggleSelectEmail = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const bulkArchive = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    await nativeAdminInboxAction('archive', ids);
    setSelectedIds(new Set());
    await loadMessages();
    showToast(`${ids.length} emails archivés`, 'success');
  };

  const bulkResolveAlerts = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    try {
      await nativeAdminInboxAction('resolve_alert', ids);
      setSelectedIds(new Set());
      if (selectedMessage && ids.includes(selectedMessage.id)) setSelectedMessage(null);
      await loadMessages();
      showToast(`${ids.length} alerte(s) marquée(s) comme traitée(s)`, 'success');
    } catch { showToast('Erreur lors du traitement des alertes', 'error'); }
  };

  const resolveAlert = async (emailId: string) => {
    try {
      await nativeAdminInboxAction('resolve_alert', [emailId]);
      await loadMessages();
      setSelectedMessage(null);
      showToast('Alerte marquée comme traitée', 'success');
    } catch { showToast('Erreur lors du traitement de l’alerte', 'error'); }
  };

  const openConversation = (email: EmailMessage) => {
    setSelectedMessage(email);
    setShowEmailBody(email.body_html ? 'html' : 'text');
    const key = conversationKey(email);
    const unreadIds = messages.filter(item => conversationKey(item) === key && !item.is_read).map(item => item.id);
    if (!unreadIds.length) return;
    setMessages(prev => prev.map(item => unreadIds.includes(item.id) ? { ...item, is_read: true } : item));
    setStats(prev => ({ ...prev, unread: Math.max(0, prev.unread - unreadIds.length) }));
    void nativeAdminInboxAction('mark_read', unreadIds).catch(() => loadMessages());
  };

  const bulkMarkRead = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    await nativeAdminInboxAction('mark_read', ids);
    setMessages(prev => prev.map(e => selectedIds.has(e.id) ? { ...e, is_read: true } : e));
    setSelectedIds(new Set());
    await loadMessages();
    showToast('Emails marqués comme lus', 'success');
  };

  const bulkDelete = async () => {
    if (!confirm(`Supprimer ${selectedIds.size} email(s) ?`)) return;
    try {
      const count = selectedIds.size;
      if (count === 0) return;
      await nativeAdminInboxAction('delete', [...selectedIds]);
      if (selectedMessage && selectedIds.has(selectedMessage.id)) setSelectedMessage(null);
      setSelectedIds(new Set());
      await loadMessages();
      showToast(`${count} email(s) supprimé(s)`, 'success');
    } catch { showToast('Erreur suppression', 'error'); }
  };

  useEffect(() => {
    const findLead = async () => {
      setFoundLeadId(null); setExtractedInfo(null);
      if (!selectedMessage) return;
      if (selectedMessage.lead_id) { setFoundLeadId(selectedMessage.lead_id); return; }
      const info = extractLeadInfoFromEmail(selectedMessage);
      if (!info) return;
      setExtractedInfo(info);
      try {
        const lookup = info.email || info.phone || '';
        if (!lookup) return;
        const result = await nativeAdminLeads(lookup) as { leads?: LeadSearchResult[] };
        const leads = result.leads || [];
        const email = info.email?.trim().toLowerCase();
        const phone = info.phone?.replace(/\D/g, '');
        const frenchPhone = phone?.replace(/^0/, '33');
        const lead = leads.find(candidate => {
          if (email && candidate.email?.trim().toLowerCase() === email) return true;
          const candidatePhone = candidate.phone?.replace(/\D/g, '');
          return Boolean(phone && candidatePhone && (candidatePhone === phone || candidatePhone === frenchPhone));
        });
        if (lead) setFoundLeadId(lead.id);
      } catch (err) { console.error(err); }
    };
    findLead();
  }, [selectedMessage]);

  useEffect(() => {
    void loadMessages(true);
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') void loadMessages(false);
    }, 30000);
    return () => clearInterval(interval);
  }, [filter, searchQuery]);

  useEffect(() => {
    let active = true;
    const synchronize = async () => {
      try {
        await nativeAdminInboxSync();
        if (active) await loadMessages(false);
      } catch (error) {
        console.error('[crm-inbox-auto-sync]', error);
      }
    };
    // The inbox content is loaded immediately by the effect above. Starting a
    // full IMAP synchronization at the same time can saturate the API and make
    // the initial screen look unavailable. Keep background refresh periodic;
    // the toolbar button remains available for an immediate manual sync.
    const interval = window.setInterval(synchronize, 5 * 60 * 1000);
    return () => { active = false; window.clearInterval(interval); };
  }, []);

  const handleDragStart = (e: React.DragEvent, emailId: string) => {
    setDraggedEmail(emailId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetFolder: string) => {
    e.preventDefault();
    setDragOverFolder(null);
    if (!draggedEmail) return;
    const email = messages.find(m => m.id === draggedEmail);
    if (!email) return;
    if (targetFolder === 'archived') await archiveEmail(draggedEmail);
    else if (targetFolder === 'starred') await toggleStar(draggedEmail, email.is_starred);
    else if (targetFolder === 'mails') await classifyAsNonLead(draggedEmail);
    setDraggedEmail(null);
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!selectedMessage) return;
    if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;
    const idx = messages.findIndex(m => m.id === selectedMessage.id);
    switch (e.key.toLowerCase()) {
      case 'r': e.preventDefault(); setReplyContent(''); setShowReplyModal(true); break;
      case 'e': case 'a': e.preventDefault(); archiveEmail(selectedMessage.id); break;
      case 's': e.preventDefault(); toggleStar(selectedMessage.id, selectedMessage.is_starred); break;
      case 'delete': e.preventDefault(); deleteEmail(selectedMessage.id); break;
      case 'escape': e.preventDefault(); setSelectedMessage(null); break;
      case 'arrowdown': e.preventDefault(); if (idx < messages.length - 1) { const next = messages[idx + 1]; setSelectedMessage(next); if (!next.is_read) markAsRead(next.id); } break;
      case 'arrowup': e.preventDefault(); if (idx > 0) { const prev = messages[idx - 1]; setSelectedMessage(prev); if (!prev.is_read) markAsRead(prev.id); } break;
    }
  }, [selectedMessage, messages]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const folders: FolderConfig[] = [
    { id: 'inbox', name: 'Boite de reception', icon: <Inbox size={16} />, count: stats.total, color: 'text-sky-500', filter: () => true },
    { id: 'unread', name: 'Non lus', icon: <MailOpen size={16} />, count: stats.unread, color: 'text-amber-500', filter: e => !e.is_read },
    { id: 'alerts', name: 'Alertes techniques', icon: <AlertCircle size={16} />, count: stats.alerts, color: 'text-red-400', filter: e => e.priority === 'high' },
    { id: 'starred', name: 'Favoris', icon: <Star size={16} />, count: stats.starred, color: 'text-yellow-500', filter: e => e.is_starred },
    { id: 'leads', name: 'Leads', icon: <Users size={16} />, count: stats.leads, color: 'text-emerald-500', filter: e => !!e.lead_id },
    { id: 'partners', name: 'Partenaires', icon: <Users size={16} />, count: stats.partners, color: 'text-violet-400', filter: e => e.classification === 'partner' },
    { id: 'services', name: 'Interne et services', icon: <Settings size={16} />, count: stats.services, color: 'text-cyan-400', filter: e => ['internal', 'system'].includes(String(e.classification || '')) },
    { id: 'unassigned', name: 'Non rattaches', icon: <UserPlus size={16} />, count: Math.max(0, stats.total - stats.leads), color: 'text-orange-400', filter: e => !e.lead_id },
    { id: 'mails', name: 'Mails', icon: <Folder size={16} />, count: stats.mails, color: 'text-gray-400', filter: e => e.classification === 'non_lead' },
    { id: 'archived', name: 'Archives', icon: <Archive size={16} />, count: stats.archived, color: 'text-gray-500', filter: e => e.email_status === 'archived' },
  ];

  const leadFolders: FolderConfig[] = useMemo(() => leadMailFolders.map(lead => ({
    id: `lead:${lead.lead_id}`,
    name: lead.lead_name || lead.lead_email || `Lead ${lead.lead_id.slice(0, 8)}`,
    icon: <User size={15} />,
    count: Number(lead.count || 0),
    color: 'text-sky-400',
    filter: (email: EmailMessage) => email.lead_id === lead.lead_id,
  })), [leadMailFolders]);

  const threadCounts = useMemo(() => messages.reduce<Record<string, number>>((counts, email) => {
    const key = conversationKey(email);
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {}), [messages]);
  const unreadThreadCounts = useMemo(() => messages.reduce<Record<string, number>>((counts, email) => {
    if (!email.is_read) {
      const key = conversationKey(email);
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }, {}), [messages]);

  const conversationMessages = useMemo(() => selectedMessage
    ? messages.filter(email => conversationKey(email) === conversationKey(selectedMessage))
      .sort((a, b) => Date.parse(a.received_at) - Date.parse(b.received_at))
    : [], [messages, selectedMessage]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 2) return 'Maintenant';
    if (diffMins < 60) return `${diffMins}min`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) return `${diffDays}j`;
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  };

  const currentFolder = [...folders, ...leadFolders].find(f => f.id === filter);
  const filteredMessagesRaw = filter === 'inbox' ? messages : messages.filter(currentFolder?.filter || (() => true));
  const filteredMessages = useMemo(() => {
    const latestByThread = new Map<string, EmailMessage>();
    for (const email of filteredMessagesRaw) {
      const key = conversationKey(email);
      const current = latestByThread.get(key);
      if (!current || Date.parse(email.received_at) > Date.parse(current.received_at)) latestByThread.set(key, email);
    }
    return [...latestByThread.values()].sort((a, b) => Date.parse(b.received_at) - Date.parse(a.received_at));
  }, [filteredMessagesRaw]);
  const allSelected = filteredMessages.length > 0 && filteredMessages.every(m => selectedIds.has(m.id));

  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredMessages.map(m => m.id)));
  };

  const toastColors = { success: 'bg-emerald-600', error: 'bg-red-600', info: 'bg-gray-800' };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-[100] flex items-center gap-2.5 px-5 py-3 rounded-xl shadow-2xl text-white text-sm font-medium transition-all ${toastColors[toast.type]}`}>
          {toast.type === 'success' && <CheckCircle size={16} />}
          {toast.type === 'error' && <AlertCircle size={16} />}
          {toast.type === 'info' && <Loader2 size={16} className="animate-spin" />}
          {toast.msg}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">

        {/* COLONNE 1 — Dossiers */}
        <div className="w-60 flex-shrink-0 flex flex-col bg-gray-900 border-r border-gray-800">
          {/* Logo / titre */}
          <div className="px-4 py-5 border-b border-gray-800">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
                <Mail size={16} className="text-white" />
              </div>
              <span className="text-white font-bold text-base">Inbox</span>
            </div>

            <button
              onClick={syncEmails}
              disabled={syncing}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-gray-900 rounded-lg font-semibold text-sm transition-colors mb-2"
            >
              <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Sync...' : 'Synchroniser'}
            </button>

            <button
              onClick={autoLinkExistingLeads}
              disabled={syncing}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-amber-400 border border-gray-700 rounded-lg font-medium text-sm transition-colors"
            >
              <Zap size={14} />
              Rattacher aux leads
            </button>
          </div>

          {/* Dossiers */}
          <nav className="flex-1 overflow-y-auto py-3 px-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 mb-2">Dossiers</p>
            <div className="space-y-0.5">
              {folders.map(folder => (
                <div
                  key={folder.id}
                  onClick={() => { setFilter(folder.id); setSelectedMessage(null); setSelectedIds(new Set()); }}
                  onDragOver={e => { e.preventDefault(); setDragOverFolder(folder.id); }}
                  onDragLeave={() => setDragOverFolder(null)}
                  onDrop={e => handleDrop(e, folder.id)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all ${
                    filter === folder.id
                      ? 'bg-amber-500/20 border border-amber-500/40'
                      : dragOverFolder === folder.id
                      ? 'bg-gray-700 border border-dashed border-gray-500'
                      : 'hover:bg-gray-800 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={filter === folder.id ? 'text-amber-400' : folder.color}>{folder.icon}</span>
                    <span className={`text-sm font-medium ${filter === folder.id ? 'text-amber-300' : 'text-gray-300'}`}>
                      {folder.name}
                    </span>
                  </div>
                  {folder.count > 0 && (
                    <span className={`text-xs font-bold min-w-[20px] text-center px-1.5 py-0.5 rounded-full ${
                      filter === folder.id ? 'bg-amber-500 text-gray-900' : 'bg-gray-700 text-gray-400'
                    }`}>
                      {folder.count > 99 ? '99+' : folder.count}
                    </span>
                  )}
                </div>
              ))}
            </div>
            {leadFolders.length > 0 && (
              <>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 mt-5 mb-2">Sous-dossiers leads</p>
                <div className="space-y-0.5">
                  {leadFolders.map(folder => (
                    <button
                      type="button"
                      key={folder.id}
                      onClick={() => { setFilter(folder.id); setSelectedMessage(null); setSelectedIds(new Set()); }}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg transition-all ${filter === folder.id ? 'bg-sky-500/20 border border-sky-500/40' : 'hover:bg-gray-800 border border-transparent'}`}
                      title={folder.name}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span className={filter === folder.id ? 'text-sky-300' : folder.color}>{folder.icon}</span>
                        <span className={`text-sm truncate ${filter === folder.id ? 'font-semibold text-sky-200' : 'text-gray-300'}`}>{folder.name}</span>
                      </span>
                      <span className="text-xs font-bold min-w-[20px] px-1.5 py-0.5 rounded-full bg-gray-700 text-gray-400">{folder.count > 99 ? '99+' : folder.count}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </nav>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-gray-800">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <Clock size={11} />
                Auto-refresh 30s
              </span>
              <a href="/backoffice/email-settings" className="text-amber-500 hover:text-amber-400 flex items-center gap-1">
                <Settings size={11} />
                Config
              </a>
            </div>
          </div>
        </div>

        {/* COLONNE 2 — Liste emails */}
        <div className="w-72 2xl:w-80 flex-shrink-0 flex flex-col bg-white border-r border-gray-200">

          {/* Header liste */}
          <div className="px-4 pt-4 pb-3 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-gray-900 text-sm truncate">{currentFolder?.name || 'Boite de reception'}</h2>
              <div className="flex items-center gap-1">
                {stats.unread > 0 && (
                  <button
                    onClick={markAllRead}
                    disabled={markingAllRead}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Tout marquer comme lu"
                  >
                    {markingAllRead ? <Loader2 size={14} className="animate-spin text-gray-400" /> : <EyeOff size={14} className="text-gray-400 hover:text-gray-600" />}
                  </button>
                )}
                <button onClick={loadMessages} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                  <RefreshCw size={14} className="text-gray-400" />
                </button>
              </div>
            </div>

            {/* Recherche */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-8 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                  <X size={13} className="text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
          </div>

          {/* Bulk actions */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border-b border-amber-100">
              <span className="text-xs font-semibold text-amber-800">{selectedIds.size} sélectionné(s)</span>
              <div className="flex items-center gap-1 ml-auto">
                {filter === 'alerts' && (
                  <button onClick={bulkResolveAlerts} className="px-2.5 py-1 text-xs bg-emerald-600 border border-emerald-700 rounded-lg hover:bg-emerald-700 text-white font-semibold flex items-center gap-1">
                    <CheckCircle size={12} />
                    Traitées
                  </button>
                )}
                <button onClick={bulkMarkRead} className="px-2.5 py-1 text-xs bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700 font-medium">Lu</button>
                <button onClick={bulkArchive} className="px-2.5 py-1 text-xs bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700 font-medium">Archiver</button>
                <button onClick={bulkDelete} className="px-2.5 py-1 text-xs bg-white border border-red-200 rounded-lg hover:bg-red-50 text-red-600 font-medium flex items-center gap-1">
                  <Trash2 size={12} />
                  Supprimer
                </button>
                <button onClick={() => setSelectedIds(new Set())} className="p-1 hover:bg-amber-100 rounded">
                  <X size={13} className="text-amber-700" />
                </button>
              </div>
            </div>
          )}

          {/* Select all */}
          {filteredMessages.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 bg-gray-50/50">
              <button onClick={toggleSelectAll} className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700">
                {allSelected ? <CheckSquare size={14} className="text-amber-500" /> : <Square size={14} />}
                <span>Tout sélectionner</span>
              </button>
              <span className="ml-auto text-xs text-gray-400">
                {filteredMessages.length} conversation(s){filteredMessagesRaw.length !== filteredMessages.length ? ` · ${filteredMessagesRaw.length} emails` : ''}
              </span>
            </div>
          )}

          {/* Liste */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 size={24} className="animate-spin text-amber-500" />
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-400 px-6">
                <Mail size={36} className="mb-2 opacity-40" />
                <p className="text-sm font-medium">Aucun email</p>
                {searchQuery && <p className="text-xs mt-1">Essayez un autre terme de recherche</p>}
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredMessages.map(email => {
                  const isSelected = selectedMessage ? conversationKey(selectedMessage) === conversationKey(email) : false;
                  const isChecked = selectedIds.has(email.id);
                  const hasUnread = (unreadThreadCounts[conversationKey(email)] || 0) > 0;
                  const initials = getInitials(email.from_name, email.from_email);
                  const avatarColor = getAvatarColor(email.from_email);

                  return (
                    <div
                      key={email.id}
                      draggable
                      onDragStart={e => handleDragStart(e, email.id)}
                      onClick={() => openConversation(email)}
                      className={`relative flex items-start gap-3 px-4 py-3 cursor-pointer transition-all group ${
                        isSelected ? 'bg-amber-50 border-l-2 border-l-amber-500' : !hasUnread ? 'hover:bg-gray-50 border-l-2 border-l-transparent' : 'bg-sky-50/40 hover:bg-sky-50 border-l-2 border-l-sky-400'
                      }`}
                    >
                      {/* Checkbox */}
                      <button
                        onClick={e => { e.stopPropagation(); toggleSelectEmail(email.id); }}
                        className={`flex-shrink-0 mt-0.5 transition-all ${isChecked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                      >
                        {isChecked
                          ? <CheckSquare size={16} className="text-amber-500" />
                          : <Square size={16} className="text-gray-300" />}
                      </button>

                      {/* Avatar */}
                      <div className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold ${avatarColor} mt-0.5`}>
                        {initials}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className={`text-xs truncate ${hasUnread ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'}`}>
                            {email.from_name || email.from_email}
                          </span>
                          <span className="text-xs text-gray-400 flex-shrink-0">{formatDate(email.received_at)}</span>
                        </div>

                        <div className={`text-xs truncate mb-1 ${hasUnread ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                          {email.subject || '(Sans objet)'}
                        </div>

                        {(threadCounts[conversationKey(email)] || 0) > 1 && (
                          <div className="mb-1 inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                            <Mail size={10} /> {threadCounts[conversationKey(email)]} messages
                            {hasUnread && <span className="ml-1 text-sky-700">· {unreadThreadCounts[conversationKey(email)]} non lu(s)</span>}
                          </div>
                        )}

                        {email.priority === 'high' && (
                          <div className="mb-1 inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-red-700 ring-1 ring-red-200">
                            <AlertCircle size={10} /> Alerte technique
                          </div>
                        )}

                        {email.github_status === 'success' && (
                          <div className="mb-1 ml-1 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200">
                            <CheckCircle size={10} /> GitHub réussi
                          </div>
                        )}
                        {email.github_status === 'cancelled' && (
                          <div className="mb-1 ml-1 inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600 ring-1 ring-gray-200">
                            <Clock size={10} /> GitHub annulé
                          </div>
                        )}

                        {email.lead_id && (
                          <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-emerald-700 truncate">
                            <User size={11} className="flex-shrink-0" />
                            {email.lead_name || email.lead_email || 'Lead rattache'}
                          </div>
                        )}

                        <div className="text-xs text-gray-400 truncate leading-relaxed">
                          {cleanEmailPreview(email.body_text).substring(0, 70)}
                        </div>

                        {/* Badges */}
                        <div className="flex items-center gap-1.5 mt-1.5">
                          {email.lead_id && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">
                              <User size={9} />
                              Lead
                            </span>
                          )}
                          {email.is_starred && <Star size={11} className="text-amber-400 fill-amber-400" />}
                          {email.attachments?.length > 0 && (
                            <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
                              <Paperclip size={9} />
                              {email.attachments.length}
                            </span>
                          )}
                          {email.direction === 'outbound' && (
                            <span className="text-[10px] text-sky-600 font-medium">Envoyé</span>
                          )}
                        </div>
                      </div>

                      {/* Quick action hover */}
                      <button
                        onClick={e => { e.stopPropagation(); archiveEmail(email.id); }}
                        className="absolute top-3 right-3 p-1 hover:bg-white rounded opacity-0 group-hover:opacity-100 transition-opacity shadow-sm border border-gray-100"
                        title="Archiver"
                      >
                        <Archive size={12} className="text-gray-500" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* COLONNE 3 — Detail email */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden">
          {!selectedMessage ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 select-none">
              <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mb-5">
                <Mail size={36} className="text-gray-300" />
              </div>
              <p className="text-lg font-semibold text-gray-700">Sélectionnez un email</p>
              <p className="text-sm mt-1 text-gray-400 mb-8">Cliquez sur un message pour le lire</p>

              <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50 border border-gray-100 rounded-xl p-4 max-w-xs w-full">
                <div className="flex items-center gap-2 text-gray-500">
                  <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px] font-mono">R</kbd>
                  <span>Répondre</span>
                </div>
                <div className="flex items-center gap-2 text-gray-500">
                  <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px] font-mono">E</kbd>
                  <span>Archiver</span>
                </div>
                <div className="flex items-center gap-2 text-gray-500">
                  <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px] font-mono">S</kbd>
                  <span>Favoris</span>
                </div>
                <div className="flex items-center gap-2 text-gray-500">
                  <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px] font-mono">↑↓</kbd>
                  <span>Naviguer</span>
                </div>
                <div className="flex items-center gap-2 text-gray-500">
                  <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px] font-mono">Del</kbd>
                  <span>Supprimer</span>
                </div>
                <div className="flex items-center gap-2 text-gray-500">
                  <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px] font-mono">Esc</kbd>
                  <span>Fermer</span>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Toolbar */}
              <div className="flex items-center gap-1.5 px-5 py-3 border-b border-gray-100 bg-gray-50/80 flex-shrink-0">
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors mr-1"
                  title="Fermer (Esc)"
                >
                  <ArrowLeft size={16} className="text-gray-600" />
                </button>

                <div className="h-4 w-px bg-gray-200 mx-1" />

                {/* Lead actions */}
                {foundLeadId && (
                  <a
                    href={`/backoffice/crm-killer/lead/${foundLeadId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors"
                  >
                    <ExternalLink size={13} />
                    Voir le lead
                  </a>
                )}

                {!foundLeadId && (
                  <>
                    <button
                      onClick={openAssignModal}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold transition-colors"
                    >
                      <LinkIcon size={13} />
                      Rattacher
                    </button>
                    <button
                      onClick={() => classifyAsNonLead(selectedMessage.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-xs font-semibold transition-colors"
                    >
                      <Folder size={13} />
                      Mails
                    </button>
                  </>
                )}

                <div className="flex items-center gap-0.5 ml-auto">
                  {selectedMessage.priority === 'high' && (
                    <button
                      onClick={() => resolveAlert(selectedMessage.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 mr-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors"
                      title="Marquer cette alerte comme traitée"
                    >
                      <CheckCircle size={14} />
                      Traité
                    </button>
                  )}
                  <button
                    onClick={() => toggleStar(selectedMessage.id, selectedMessage.is_starred)}
                    className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                    title="Favoris (S)"
                  >
                    <Star size={16} className={selectedMessage.is_starred ? 'fill-amber-400 text-amber-400' : 'text-gray-400'} />
                  </button>

                  {selectedMessage.direction === 'inbound' && (
                    <button
                      onClick={() => { setReplyContent(''); setShowReplyModal(true); }}
                      className="p-2 hover:bg-amber-50 rounded-lg transition-colors"
                      title="Répondre (R)"
                    >
                      <Reply size={16} className="text-amber-600" />
                    </button>
                  )}

                  <button
                    onClick={() => archiveEmail(selectedMessage.id)}
                    className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                    title="Archiver (E)"
                  >
                    <Archive size={16} className="text-gray-500" />
                  </button>

                  <button
                    onClick={() => deleteEmail(selectedMessage.id)}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                    title="Supprimer (Del)"
                  >
                    <Trash2 size={16} className="text-red-500" />
                  </button>
                </div>
              </div>

              {/* Email header */}
              <div className="px-6 py-5 border-b border-gray-100 flex-shrink-0">
                <h2 className="text-xl font-bold text-gray-900 mb-4 leading-snug">
                  {selectedMessage.subject || '(Sans objet)'}
                </h2>

                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-bold ${getAvatarColor(selectedMessage.from_email)}`}>
                    {getInitials(selectedMessage.from_name, selectedMessage.from_email)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 text-sm">
                        {selectedMessage.from_name || selectedMessage.from_email}
                      </span>
                      <span className="text-xs text-gray-500">&lt;{selectedMessage.from_email}&gt;</span>

                      {selectedMessage.direction === 'outbound' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-sky-700 bg-sky-50 border border-sky-200 rounded-full px-2 py-0.5">
                          <Send size={9} />
                          Envoyé
                        </span>
                      )}
                      {selectedMessage.lead_id && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                          <User size={9} />
                          Lié à un lead
                        </span>
                      )}
                      {!selectedMessage.is_read && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">
                          <MailOpen size={9} />
                          Non lu
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(selectedMessage.received_at).toLocaleString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>

                {/* Lead info auto-extracted */}
                {extractedInfo && !foundLeadId && (
                  <div className="mt-4 flex flex-wrap gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <span className="text-xs font-semibold text-amber-800 w-full flex items-center gap-1.5">
                      <AlertCircle size={13} />
                      Informations détectées dans cet email :
                    </span>
                    {extractedInfo.name && <span className="inline-flex items-center gap-1 text-xs bg-white border border-amber-200 text-amber-900 rounded-full px-2.5 py-1 font-medium"><User size={11} />{extractedInfo.name}</span>}
                    {extractedInfo.email && <span className="inline-flex items-center gap-1 text-xs bg-white border border-amber-200 text-amber-900 rounded-full px-2.5 py-1 font-medium"><AtSign size={11} />{extractedInfo.email}</span>}
                    {extractedInfo.phone && <span className="inline-flex items-center gap-1 text-xs bg-white border border-amber-200 text-amber-900 rounded-full px-2.5 py-1 font-medium"><Phone size={11} />{extractedInfo.phone}</span>}
                    {extractedInfo.city && <span className="inline-flex items-center gap-1 text-xs bg-white border border-amber-200 text-amber-900 rounded-full px-2.5 py-1 font-medium"><MapPin size={11} />{extractedInfo.city}</span>}
                  </div>
                )}
              </div>

              {/* Email body */}
              <div className="flex-1 overflow-y-auto">
                {conversationMessages.length > 1 && (
                  <div className="mx-6 mt-5 rounded-xl border border-violet-200 bg-violet-50/60 p-3">
                    <div className="mb-2 flex items-center gap-2 text-sm font-bold text-violet-900">
                      <Mail size={15} /> Conversation ({conversationMessages.length} messages)
                    </div>
                    <div className="space-y-2">
                      {conversationMessages.filter(message => message.id !== selectedMessage.id).map(message => (
                        <details key={message.id} className="group rounded-lg border border-violet-100 bg-white">
                          <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-xs">
                            <span className={`rounded-full px-2 py-0.5 font-bold ${message.direction === 'outbound' ? 'bg-sky-100 text-sky-700' : 'bg-emerald-100 text-emerald-700'}`}>
                              {message.direction === 'outbound' ? 'Envoye' : 'Recu'}
                            </span>
                            <span className="min-w-0 flex-1 truncate font-semibold text-gray-700">
                              {message.direction === 'outbound' ? `A : ${message.to_emails?.[0] || message.lead_email || ''}` : message.from_name || message.from_email}
                            </span>
                            <span className="flex-shrink-0 text-gray-400">{new Date(message.received_at).toLocaleString('fr-FR')}</span>
                          </summary>
                          <div className="border-t border-gray-100 px-4 py-3">
                            {message.body_html ? (
                              <iframe title={`Message ${message.id}`} sandbox="allow-popups allow-popups-to-escape-sandbox" srcDoc={message.body_html} className="block min-h-[300px] w-full bg-white" />
                            ) : (
                              <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-6 text-gray-700">{cleanEmailPreview(message.body_text || '')}</pre>
                            )}
                          </div>
                        </details>
                      ))}
                    </div>
                  </div>
                )}
                {/* View toggle */}
                {selectedMessage.body_html && selectedMessage.body_text && (
                  <div className="flex gap-1 px-6 pt-4">
                    <button
                      onClick={() => setShowEmailBody('html')}
                      className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${showEmailBody === 'html' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                    >
                      Mise en page
                    </button>
                    <button
                      onClick={() => setShowEmailBody('text')}
                      className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${showEmailBody === 'text' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                    >
                      Texte brut
                    </button>
                  </div>
                )}

                <div className="px-6 py-4">
                  {showEmailBody === 'html' && selectedMessage.body_html ? (
                    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                      <iframe
                        title={`Email - ${selectedMessage.subject || 'Sans objet'}`}
                        sandbox="allow-popups allow-popups-to-escape-sandbox"
                        srcDoc={selectedMessage.body_html}
                        className="block min-h-[560px] w-full bg-white"
                      />
                    </div>
                  ) : (
                    <pre className="whitespace-pre-wrap break-words rounded-xl border border-gray-100 bg-white p-5 text-[15px] text-gray-800 leading-7 font-sans shadow-sm">
                      {cleanEmailPreview(selectedMessage.body_text || '')}
                    </pre>
                  )}
                </div>

                {/* Attachments */}
                {selectedMessage.attachments?.length > 0 && (
                  <div className="mx-6 mb-6 mt-2 pt-5 border-t border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <Paperclip size={15} className="text-gray-400" />
                      Pièces jointes ({selectedMessage.attachments.length})
                    </h3>
                    <div className="grid grid-cols-1 gap-2">
                      {selectedMessage.attachments.map((att, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors group">
                          <div className="w-9 h-9 flex items-center justify-center bg-white border border-gray-200 rounded-lg text-lg flex-shrink-0 shadow-sm">
                            {getFileIcon(att.content_type || '')}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">{att.filename || `Fichier ${idx + 1}`}</div>
                            <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                              {att.size && <span>{(att.size / 1024).toFixed(1)} KB</span>}
                              {att.content_type && <span className="px-1.5 py-0.5 bg-gray-200 rounded text-[10px] uppercase font-medium">{att.content_type.split('/')[1] || 'file'}</span>}
                            </div>
                          </div>
                          {(att.storage_path || att.url) && (
                            <SecureDocumentLink                               filePath={att.storage_path!}                               source="email_attachments"                               bucket="email-attachments"                               fileName={att.filename}                               mode="download"                               showText                               customText="Télécharger"                               iconSize={13}                               className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-700"                             />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal assigner */}
      {showAssignModal && selectedMessage && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={e => { if (e.target === e.currentTarget) setShowAssignModal(false); }}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <LinkIcon size={18} className="text-sky-600" />
                  Rattacher l'email à un lead
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">De: {selectedMessage.from_email}</p>
              </div>
              <button onClick={() => setShowAssignModal(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {emailsFoundInContent.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Emails trouvés dans le contenu</p>
                  <div className="flex flex-wrap gap-2">
                    {emailsFoundInContent.map((email, idx) => (
                      <button
                        key={idx}
                        onClick={() => { setLeadSearchQuery(email); searchLeads(email); }}
                        className="text-xs px-3 py-1.5 bg-sky-50 border border-sky-200 text-sky-800 rounded-full hover:bg-sky-100 font-medium transition-colors"
                      >
                        {email}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Rechercher un lead</label>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={leadSearchQuery}
                    onChange={e => { setLeadSearchQuery(e.target.value); searchLeads(e.target.value); }}
                    placeholder="Email, nom, téléphone (min. 3 caractères)..."
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:border-sky-500 focus:ring-2 focus:ring-sky-100 focus:outline-none text-sm"
                  />
                </div>
              </div>

              {searchingLeads && (
                <div className="flex justify-center py-6">
                  <Loader2 size={24} className="animate-spin text-sky-500" />
                </div>
              )}

              {!searchingLeads && searchResults.length === 0 && leadSearchQuery.length >= 3 && (
                <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <AlertCircle size={32} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-sm font-medium text-gray-500">Aucun lead trouvé</p>
                </div>
              )}

              {!searchingLeads && searchResults.length > 0 && (
                <div className="space-y-2">
                  {searchResults.map(lead => (
                    <div key={lead.id} className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl hover:border-sky-200 hover:bg-sky-50/50 transition-all">
                      <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-bold ${getAvatarColor(lead.email)}`}>
                        {getInitials(`${lead.first_name} ${lead.last_name}`, lead.email)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 text-sm">{lead.first_name || ''} {lead.last_name || '(Sans nom)'}</div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-gray-500">{lead.email}</span>
                          {lead.phone && <span className="text-xs text-gray-400">{lead.phone}</span>}
                        </div>
                        <span className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-full">{lead.status}</span>
                      </div>
                      <button
                        onClick={() => assignEmailToLead(lead.id, selectedMessage.id)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-sm font-semibold transition-colors flex-shrink-0"
                      >
                        <LinkIcon size={14} />
                        Assigner
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal réponse */}
      {showReplyModal && selectedMessage && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end justify-center z-[60] p-4 sm:items-center" onClick={e => { if (e.target === e.currentTarget) setShowReplyModal(false); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Reply size={15} className="text-amber-700" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">Répondre</p>
                  <p className="text-xs text-gray-500">A : {selectedMessage.from_email}</p>
                </div>
              </div>
              <button onClick={() => setShowReplyModal(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            {/* Subject */}
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
              <p className="text-xs text-gray-500">Objet : <span className="text-gray-800 font-medium">Re: {selectedMessage.subject}</span></p>
            </div>

            {/* Body */}
            <div className="p-5">
              <textarea
                value={replyContent}
                onChange={e => setReplyContent(e.target.value)}
                placeholder="Tapez votre réponse..."
                rows={8}
                autoFocus
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent resize-none text-sm text-gray-900 placeholder-gray-400"
              />

              {/* Original message */}
              <div className="mt-3 border-l-2 border-gray-200 pl-3">
                <p className="text-xs font-semibold text-gray-400 mb-1">Message original</p>
                <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">
                  {cleanEmailPreview(selectedMessage.body_text || selectedMessage.body_html || '').substring(0, 300)}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 bg-gray-50/50">
              <p className="text-xs text-gray-400">{replyContent.length} caractères</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowReplyModal(false)}
                  disabled={replySending}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={sendReply}
                  disabled={replySending || !replyContent.trim()}
                  className="flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  {replySending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  {replySending ? 'Envoi...' : 'Envoyer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CRMInboxMulticanal;
