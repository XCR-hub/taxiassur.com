import React, { useEffect, useState, useCallback } from 'react';
import {
  Mail, RefreshCw, Star, User, Paperclip, Tag, Search,
  ExternalLink, CheckCircle, Send, Archive, AlertCircle,
  Settings, UserPlus, Clock, Link as LinkIcon, X, Trash2,
  Folder, Inbox, MailOpen, Users, Download, FileDown, Zap,
  ChevronDown, ArrowLeft, ArrowUp, ArrowDown, Reply,
  MoreHorizontal, Filter, CheckSquare, Square, AtSign,
  Phone, MapPin, Loader2, Eye, EyeOff
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
  const [stats, setStats] = useState({ total: 0, unread: 0, leads: 0, starred: 0, archived: 0, mails: 0 });
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

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadStats = async () => {
    try {
      const [total, unread, leads, starred, archived, mails] = await Promise.all([
        supabase.from('email_messages').select('*', { count: 'exact', head: true }).or('email_status.is.null,email_status.eq.active'),
        supabase.from('email_messages').select('*', { count: 'exact', head: true }).eq('is_read', false).or('email_status.is.null,email_status.eq.active'),
        supabase.from('email_messages').select('*', { count: 'exact', head: true }).not('lead_id', 'is', null).or('email_status.is.null,email_status.eq.active'),
        supabase.from('email_messages').select('*', { count: 'exact', head: true }).eq('is_starred', true).or('email_status.is.null,email_status.eq.active'),
        supabase.from('email_messages').select('*', { count: 'exact', head: true }).eq('email_status', 'archived'),
        supabase.from('email_messages').select('*', { count: 'exact', head: true }).eq('classification', 'non_lead').or('email_status.is.null,email_status.eq.active'),
      ]);
      setStats({ total: total.count || 0, unread: unread.count || 0, leads: leads.count || 0, starred: starred.count || 0, archived: archived.count || 0, mails: mails.count || 0 });
    } catch (err) { console.error(err); }
  };

  const loadMessages = async () => {
    setLoading(true);
    try {
      let query = supabase.from('email_messages').select('*').order('received_at', { ascending: false }).limit(500);
      if (filter === 'archived') {
        query = query.eq('email_status', 'archived');
      } else {
        query = query.or('email_status.is.null,email_status.eq.active');
        if (filter === 'unread') query = query.eq('is_read', false);
        else if (filter === 'starred') query = query.eq('is_starred', true);
        else if (filter === 'leads') query = query.not('lead_id', 'is', null);
        else if (filter === 'mails') query = query.eq('classification', 'non_lead');
      }
      if (searchQuery) query = query.or(`subject.ilike.%${searchQuery}%,from_email.ilike.%${searchQuery}%,body_text.ilike.%${searchQuery}%`);
      const { data, error } = await query;
      if (error) throw error;
      setMessages(data || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const syncEmails = async () => {
    setSyncing(true);
    showToast('Synchronisation en cours...', 'info');
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-all-emails-complete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
      });
      const result = await res.json();
      if (result.success) {
        showToast(`${result.stats?.emails_retrieved || 0} emails synchronisés`, 'success');
        await loadMessages(); await loadStats();
      } else showToast('Erreur de synchronisation', 'error');
    } catch { showToast('Erreur réseau', 'error'); } finally { setSyncing(false); }
  };

  const autoCreateLeads = async () => {
    setSyncing(true);
    showToast('Création automatique des leads...', 'info');
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auto-create-leads-from-emails`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
      });
      const result = await res.json();
      if (result.success) {
        showToast(`${result.summary?.leads_created || 0} leads créés, ${result.summary?.emails_linked || 0} liés`, 'success');
        await loadMessages(); await loadStats();
      } else showToast('Erreur création automatique', 'error');
    } catch { showToast('Erreur réseau', 'error'); } finally { setSyncing(false); }
  };

  const markAsRead = async (emailId: string) => {
    await supabase.from('email_messages').update({ is_read: true }).eq('id', emailId);
    setMessages(prev => prev.map(e => e.id === emailId ? { ...e, is_read: true } : e));
    await loadStats();
  };

  const markAllRead = async () => {
    setMarkingAllRead(true);
    try {
      await supabase.from('email_messages').update({ is_read: true }).eq('is_read', false).or('email_status.is.null,email_status.eq.active');
      await loadMessages(); await loadStats();
      showToast('Tous les emails marqués comme lus', 'success');
    } catch { showToast('Erreur', 'error'); } finally { setMarkingAllRead(false); }
  };

  const toggleStar = async (emailId: string, current: boolean) => {
    await supabase.from('email_messages').update({ is_starred: !current }).eq('id', emailId);
    setMessages(prev => prev.map(e => e.id === emailId ? { ...e, is_starred: !current } : e));
    await loadStats();
    showToast(!current ? 'Ajouté aux favoris' : 'Retiré des favoris', 'info');
  };

  const archiveEmail = async (emailId: string) => {
    try {
      await supabase.rpc('archive_email', { p_email_id: emailId });
      await loadMessages(); await loadStats();
      if (selectedMessage?.id === emailId) setSelectedMessage(null);
      showToast('Email archivé', 'success');
    } catch { showToast('Erreur archivage', 'error'); }
  };

  const deleteEmail = async (emailId: string) => {
    if (!confirm('Mettre cet email à la corbeille ?')) return;
    try {
      await supabase.rpc('delete_email', { p_email_id: emailId });
      await loadMessages(); await loadStats();
      if (selectedMessage?.id === emailId) setSelectedMessage(null);
      showToast('Email supprimé', 'success');
    } catch { showToast('Erreur suppression', 'error'); }
  };

  const classifyAsNonLead = async (emailId: string) => {
    try {
      await supabase.from('email_messages').update({ classification: 'non_lead', confidence_score: 1.0, is_read: true }).eq('id', emailId);
      setMessages(prev => prev.map(e => e.id === emailId ? { ...e, classification: 'non_lead', is_read: true } : e));
      await loadStats();
      showToast('Classé dans "Mails"', 'info');
      setSelectedMessage(null);
    } catch { showToast('Erreur classification', 'error'); }
  };

  const linkEmailHistoryToLead = async (leadId: string, senderEmail: string) => {
    const { data: allSenderEmails } = await supabase.from('email_messages').select('*').eq('from_email', senderEmail).order('received_at', { ascending: true });
    if (!allSenderEmails?.length) return { linkedCount: 0, interactionsCreated: 0 };
    await Promise.all(allSenderEmails.map(e => supabase.from('email_messages').update({ lead_id: leadId }).eq('id', e.id)));
    const interactions = allSenderEmails.map(e => ({
      lead_id: leadId, type: 'email' as const, direction: e.direction as 'inbound' | 'outbound',
      subject: e.subject, content: e.body_text?.substring(0, 5000) || '',
      created_at: e.received_at, metadata: { email_id: e.id, from: e.from_email, to: e.to_emails },
    }));
    const { data: existing } = await supabase.from('crm_interactions').select('metadata').eq('lead_id', leadId);
    const existingIds = new Set(existing?.map((i: { metadata?: { email_id?: string } }) => i.metadata?.email_id).filter(Boolean) || []);
    const newOnes = interactions.filter(i => !existingIds.has(i.metadata.email_id));
    if (newOnes.length > 0) await supabase.from('crm_interactions').insert(newOnes);
    return { linkedCount: allSenderEmails.length, interactionsCreated: newOnes.length };
  };

  const createLeadFromEmail = async (email: EmailMessage) => {
    if (!extractedInfo) return;
    try {
      const nameParts = (extractedInfo.name || email.from_name || '').split(' ');
      const { data: newLead, error } = await supabase.from('crm_leads').insert({
        first_name: nameParts[0] || '', last_name: nameParts.slice(1).join(' ') || '',
        email: extractedInfo.email || email.from_email, phone: extractedInfo.phone || null,
        status: 'NOUVEAU_LEAD', source: 'email',
        notes: `Lead créé depuis l'email: ${email.subject}\n\n${email.body_text?.substring(0, 500)}`,
      }).select().single();
      if (error) throw error;
      const { linkedCount, interactionsCreated } = await linkEmailHistoryToLead(newLead.id, email.from_email);
      setFoundLeadId(newLead.id);
      await loadMessages(); await loadStats();
      showToast(`Lead créé ! ${linkedCount} emails liés, ${interactionsCreated} interactions`, 'success');
    } catch { showToast('Erreur création lead', 'error'); }
  };

  const searchLeads = async (query: string) => {
    if (!query || query.length < 3) { setSearchResults([]); return; }
    setSearchingLeads(true);
    try {
      const { data } = await supabase.from('crm_leads').select('id, first_name, last_name, email, phone, city, status')
        .or(`email.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%,phone.ilike.%${query}%`).limit(10);
      setSearchResults(data || []);
    } catch { setSearchResults([]); } finally { setSearchingLeads(false); }
  };

  const assignEmailToLead = async (leadId: string, emailId: string) => {
    try {
      await supabase.from('email_messages').update({ lead_id: leadId, auto_matched: false }).eq('id', emailId);
      await loadMessages(); await loadStats();
      setShowAssignModal(false); setSelectedMessage(null);
      showToast('Email assigné au lead !', 'success');
    } catch { showToast('Erreur assignation', 'error'); }
  };

  const sendReply = async () => {
    if (!selectedMessage || !replyContent.trim()) { showToast('Veuillez saisir un message', 'error'); return; }
    setReplySending(true);
    try {
      await supabase.functions.invoke('send-crm-email', {
        body: {
          to: selectedMessage.from_email,
          subject: `Re: ${selectedMessage.subject}`,
          content: `<p>${replyContent.replace(/\n/g, '<br>')}</p><hr><blockquote>${selectedMessage.body_html || selectedMessage.body_text}</blockquote>`,
        },
      });
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
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const bulkArchive = async () => {
    for (const id of selectedIds) await supabase.rpc('archive_email', { p_email_id: id });
    setSelectedIds(new Set());
    await loadMessages(); await loadStats();
    showToast(`${selectedIds.size} emails archivés`, 'success');
  };

  const bulkMarkRead = async () => {
    await supabase.from('email_messages').update({ is_read: true }).in('id', [...selectedIds]);
    setMessages(prev => prev.map(e => selectedIds.has(e.id) ? { ...e, is_read: true } : e));
    setSelectedIds(new Set());
    await loadStats();
    showToast('Emails marqués comme lus', 'success');
  };

  const bulkDelete = async () => {
    if (!confirm(`Supprimer ${selectedIds.size} email(s) ?`)) return;
    try {
      const count = selectedIds.size;
      for (const id of selectedIds) {
        await supabase.rpc('delete_email', { p_email_id: id });
      }
      if (selectedMessage && selectedIds.has(selectedMessage.id)) setSelectedMessage(null);
      setSelectedIds(new Set());
      await loadMessages(); await loadStats();
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
        if (info.email) {
          const { data } = await supabase.from('crm_leads').select('id').eq('email', info.email).limit(1).maybeSingle();
          if (data) { setFoundLeadId(data.id); return; }
        }
        if (info.phone) {
          const clean = info.phone.replace(/\s/g, '');
          const { data } = await supabase.from('crm_leads').select('id').or(`phone.eq.${clean},phone.eq.${clean.replace(/^0/, '+33')}`).limit(1).maybeSingle();
          if (data) { setFoundLeadId(data.id); return; }
        }
      } catch (err) { console.error(err); }
    };
    findLead();
  }, [selectedMessage]);

  useEffect(() => {
    loadMessages(); loadStats();
    const interval = setInterval(() => { loadMessages(); loadStats(); }, 30000);
    return () => clearInterval(interval);
  }, [filter, searchQuery]);

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
    { id: 'starred', name: 'Favoris', icon: <Star size={16} />, count: stats.starred, color: 'text-yellow-500', filter: e => e.is_starred },
    { id: 'leads', name: 'Leads', icon: <Users size={16} />, count: stats.leads, color: 'text-emerald-500', filter: e => !!e.lead_id },
    { id: 'mails', name: 'Mails', icon: <Folder size={16} />, count: stats.mails, color: 'text-gray-400', filter: e => e.classification === 'non_lead' },
    { id: 'archived', name: 'Archives', icon: <Archive size={16} />, count: stats.archived, color: 'text-gray-500', filter: e => e.email_status === 'archived' },
  ];

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

  const currentFolder = folders.find(f => f.id === filter);
  const filteredMessages = filter === 'inbox' ? messages : messages.filter(currentFolder?.filter || (() => true));
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
              onClick={autoCreateLeads}
              disabled={syncing}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-amber-400 border border-gray-700 rounded-lg font-medium text-sm transition-colors"
            >
              <Zap size={14} />
              Créer leads auto
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
        <div className="w-80 flex-shrink-0 flex flex-col bg-white border-r border-gray-200">

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
              <span className="ml-auto text-xs text-gray-400">{filteredMessages.length} email(s)</span>
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
                  const isSelected = selectedMessage?.id === email.id;
                  const isChecked = selectedIds.has(email.id);
                  const initials = getInitials(email.from_name, email.from_email);
                  const avatarColor = getAvatarColor(email.from_email);

                  return (
                    <div
                      key={email.id}
                      draggable
                      onDragStart={e => handleDragStart(e, email.id)}
                      onClick={() => { setSelectedMessage(email); if (!email.is_read) markAsRead(email.id); }}
                      className={`relative flex items-start gap-3 px-4 py-3 cursor-pointer transition-all group ${
                        isSelected ? 'bg-amber-50 border-l-2 border-l-amber-500' : email.is_read ? 'hover:bg-gray-50 border-l-2 border-l-transparent' : 'bg-sky-50/40 hover:bg-sky-50 border-l-2 border-l-sky-400'
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
                          <span className={`text-xs truncate ${!email.is_read ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'}`}>
                            {email.from_name || email.from_email}
                          </span>
                          <span className="text-xs text-gray-400 flex-shrink-0">{formatDate(email.received_at)}</span>
                        </div>

                        <div className={`text-xs truncate mb-1 ${!email.is_read ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                          {email.subject || '(Sans objet)'}
                        </div>

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

                {!foundLeadId && extractedInfo && (
                  <button
                    onClick={() => createLeadFromEmail(selectedMessage)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold transition-colors"
                  >
                    <UserPlus size={13} />
                    Créer lead
                  </button>
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
                {/* View toggle */}
                {selectedMessage.body_html && selectedMessage.body_text && (
                  <div className="flex gap-1 px-6 pt-4">
                    <button
                      onClick={() => setShowEmailBody('html')}
                      className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${showEmailBody === 'html' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                    >
                      HTML
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
                    <div
                      dangerouslySetInnerHTML={{ __html: stripAllInlineStyles(selectedMessage.body_html) }}
                      className="text-sm text-gray-800 leading-relaxed prose max-w-none prose-sm"
                    />
                  ) : (
                    <pre className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed font-sans">
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
                            <a
                              href={att.storage_path ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/email-attachments/${att.storage_path}` : att.url}
                              download
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-700"
                            >
                              <Download size={13} />
                              Télécharger
                            </a>
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
