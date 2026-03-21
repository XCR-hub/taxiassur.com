import React, { useState, useEffect, useRef } from 'react';
import {
  Mail, Phone, MessageSquare, Send, Download, ArrowDownLeft, ArrowUpRight,
  Paperclip, ChevronDown, ChevronUp, Clock, FileText, Image as ImageIcon,
  File, Bot, CheckCircle, XCircle, AlertCircle, RefreshCw, Search, TrendingUp,
  Calendar, Eye, Upload, Settings, Bell, StickyNote, Plus, X, Loader2,
  Hash, Star, Tag, CornerDownRight, MailOpen, PhoneCall, PhoneMissed,
  PhoneIncoming, PhoneOutgoing, Inbox
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getDocumentPublicUrl } from '@/lib/utils';
import { DocumentViewer } from './index';

interface Attachment {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  download_url: string;
  storage_path?: string;
  auto_detected_type?: string;
}

interface TimelineEvent {
  id: string;
  type: 'email' | 'sms' | 'whatsapp' | 'call' | 'note' | 'document' | 'ai_decision' | 'status_change' | 'system' | 'notification';
  direction?: 'inbound' | 'outbound';
  timestamp: string;
  title: string;
  content: string;
  from?: string;
  to?: string;
  status?: string;
  attachments?: Attachment[];
  metadata?: any;
}

interface CompleteTimelineProps {
  leadId: string;
  leadEmail?: string;
  leadPhone?: string;
}

const stripHtml = (html: string): string => {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const formatFileSize = (bytes: number): string => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
};

const EVENT_CONFIG: Record<string, {
  icon: React.ReactNode;
  label: string;
  dotColor: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  badgeBg: string;
}> = {
  email_out: {
    icon: <Send className="w-4 h-4" />,
    label: 'Email envoyé',
    dotColor: 'bg-sky-500',
    bgColor: 'bg-sky-50',
    textColor: 'text-sky-700',
    borderColor: 'border-l-sky-400',
    badgeBg: 'bg-sky-100 text-sky-700',
  },
  email_in: {
    icon: <MailOpen className="w-4 h-4" />,
    label: 'Email reçu',
    dotColor: 'bg-blue-500',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-l-blue-400',
    badgeBg: 'bg-blue-100 text-blue-700',
  },
  call: {
    icon: <PhoneCall className="w-4 h-4" />,
    label: 'Appel',
    dotColor: 'bg-emerald-500',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    borderColor: 'border-l-emerald-400',
    badgeBg: 'bg-emerald-100 text-emerald-700',
  },
  sms: {
    icon: <MessageSquare className="w-4 h-4" />,
    label: 'SMS',
    dotColor: 'bg-violet-500',
    bgColor: 'bg-violet-50',
    textColor: 'text-violet-700',
    borderColor: 'border-l-violet-400',
    badgeBg: 'bg-violet-100 text-violet-700',
  },
  note: {
    icon: <StickyNote className="w-4 h-4" />,
    label: 'Note',
    dotColor: 'bg-amber-500',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    borderColor: 'border-l-amber-400',
    badgeBg: 'bg-amber-100 text-amber-700',
  },
  document: {
    icon: <FileText className="w-4 h-4" />,
    label: 'Document',
    dotColor: 'bg-teal-500',
    bgColor: 'bg-teal-50',
    textColor: 'text-teal-700',
    borderColor: 'border-l-teal-400',
    badgeBg: 'bg-teal-100 text-teal-700',
  },
  ai_decision: {
    icon: <Bot className="w-4 h-4" />,
    label: 'IA',
    dotColor: 'bg-rose-500',
    bgColor: 'bg-rose-50',
    textColor: 'text-rose-700',
    borderColor: 'border-l-rose-400',
    badgeBg: 'bg-rose-100 text-rose-700',
  },
  notification: {
    icon: <Bell className="w-4 h-4" />,
    label: 'Système',
    dotColor: 'bg-gray-400',
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-600',
    borderColor: 'border-l-gray-300',
    badgeBg: 'bg-gray-100 text-gray-600',
  },
};

const getEventConfig = (event: TimelineEvent) => {
  if (event.type === 'email') {
    return event.direction === 'inbound' ? EVENT_CONFIG.email_in : EVENT_CONFIG.email_out;
  }
  if (event.type === 'call') return EVENT_CONFIG.call;
  if (event.type === 'sms') return EVENT_CONFIG.sms;
  if (event.type === 'note') return EVENT_CONFIG.note;
  if (event.type === 'document') return EVENT_CONFIG.document;
  if (event.type === 'ai_decision') return EVENT_CONFIG.ai_decision;
  return EVENT_CONFIG.notification;
};

export const CompleteTimeline: React.FC<CompleteTimelineProps> = ({ leadId, leadEmail }) => {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'communication' | 'system' | 'documents' | 'ai'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingDoc, setViewingDoc] = useState<{ url: string; fileName: string; mimeType: string } | null>(null);
  const [showNoteComposer, setShowNoteComposer] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { loadCompleteTimeline(); }, [leadId]);
  useEffect(() => { if (showNoteComposer) noteRef.current?.focus(); }, [showNoteComposer]);

  const loadCompleteTimeline = async () => {
    setLoading(true);
    try {
      const allEvents: TimelineEvent[] = [];
      let allLeadIds = [leadId];
      if (leadEmail) {
        const { data: siblings } = await supabase.from('crm_leads').select('id').ilike('email', leadEmail.trim());
        if (siblings?.length) allLeadIds = [...new Set([leadId, ...siblings.map((l: any) => l.id)])];
      }

      const [emailsRes, interactionsRes, documentsRes, aiRes, notifRes] = await Promise.all([
        supabase.from('email_messages').select('*, attachments').in('lead_id', allLeadIds).order('created_at', { ascending: false }),
        supabase.from('crm_interactions').select('*').in('lead_id', allLeadIds).order('created_at', { ascending: false }),
        supabase.from('crm_lead_documents').select('*').in('lead_id', allLeadIds).order('uploaded_at', { ascending: false }),
        supabase.from('crm_ai_decisions').select('*').in('lead_id', allLeadIds).order('created_at', { ascending: false }),
        supabase.from('crm_event_notifications').select('*').in('lead_id', allLeadIds).order('created_at', { ascending: false }),
      ]);

      (emailsRes.data || []).forEach((email: any) => {
        allEvents.push({
          id: `email-${email.id}`,
          type: 'email',
          direction: email.direction,
          timestamp: email.received_at || email.created_at,
          title: email.subject || '(Sans objet)',
          content: email.body_text || stripHtml(email.body_html || ''),
          from: email.from_email,
          to: Array.isArray(email.to_emails) ? email.to_emails.join(', ') : email.to_emails,
          status: email.status,
          attachments: ((email.attachments as any[]) || []).map((a: any, idx: number) => ({
            id: `${email.id}-${idx}`,
            file_name: a.filename || a.name || 'Pièce jointe',
            file_type: a.contentType || a.content_type || 'application/octet-stream',
            file_size: a.size || a.file_size || 0,
            download_url: a.url || '',
            storage_path: a.path || a.storage_path,
            auto_detected_type: a.proposed_doc_type,
          })),
        });
      });

      (interactionsRes.data || []).forEach((int: any) => {
        const labelMap: Record<string, string> = {
          call: int.direction === 'inbound' ? 'Appel reçu' : 'Appel passé',
          sms: int.direction === 'inbound' ? 'SMS reçu' : 'SMS envoyé',
          whatsapp: int.direction === 'inbound' ? 'WhatsApp reçu' : 'WhatsApp envoyé',
          note: 'Note ajoutée',
        };
        allEvents.push({
          id: `interaction-${int.id}`,
          type: int.channel || 'note',
          direction: int.direction,
          timestamp: int.created_at,
          title: labelMap[int.channel] || 'Interaction',
          content: int.content || int.notes || int.subject || '',
          metadata: int.metadata,
        });
      });

      (documentsRes.data || []).forEach((doc: any) => {
        allEvents.push({
          id: `document-${doc.id}`,
          type: 'document',
          direction: 'inbound',
          timestamp: doc.uploaded_at,
          title: doc.file_name,
          content: `${doc.document_type || 'Document'} — statut : ${doc.status || 'En attente'}`,
          attachments: [{
            id: doc.id, file_name: doc.file_name,
            file_type: doc.mime_type || 'application/octet-stream',
            file_size: doc.file_size || 0,
            download_url: getDocumentPublicUrl(doc.file_path, 'crm_lead_documents', supabase),
            storage_path: doc.file_path,
          }],
          metadata: { statut: doc.status, validé_par: doc.validated_by },
        });
      });

      (aiRes.data || []).forEach((d: any) => {
        allEvents.push({
          id: `ai-${d.id}`, type: 'ai_decision', timestamp: d.created_at,
          title: `IA : ${d.decision_type}`,
          content: d.reasoning || d.suggestion || '',
          status: d.status,
          metadata: { confiance: d.confidence_score ? `${Math.round(d.confidence_score * 100)}%` : undefined, statut: d.applied_at ? 'Appliqué' : 'En attente' },
        });
      });

      (notifRes.data || []).forEach((n: any) => {
        allEvents.push({
          id: `notification-${n.id}`, type: 'notification', timestamp: n.created_at,
          title: n.title || 'Notification système',
          content: n.message || '',
          metadata: n.metadata,
        });
      });

      const seen = new Set<string>();
      const deduped = allEvents.filter(e => { if (seen.has(e.id)) return false; seen.add(e.id); return true; });
      deduped.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setEvents(deduped);
    } catch (err) {
      console.error('Error loading timeline:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setSavingNote(true);
    try {
      await supabase.from('crm_interactions').insert([{
        lead_id: leadId, channel: 'note', direction: 'outbound',
        content: newNote.trim(), created_at: new Date().toISOString(),
      }]);
      setNewNote('');
      setShowNoteComposer(false);
      await loadCompleteTimeline();
    } catch (err) {
      console.error('Error saving note:', err);
    } finally {
      setSavingNote(false);
    }
  };

  const getFilteredEvents = () => {
    let filtered = events;
    if (filter === 'communication') filtered = filtered.filter(e => ['email', 'sms', 'whatsapp', 'call', 'note'].includes(e.type));
    else if (filter === 'system') filtered = filtered.filter(e => ['status_change', 'system', 'notification'].includes(e.type));
    else if (filter === 'documents') filtered = filtered.filter(e => e.type === 'document');
    else if (filter === 'ai') filtered = filtered.filter(e => e.type === 'ai_decision');
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(e =>
        e.title.toLowerCase().includes(q) || e.content.toLowerCase().includes(q) ||
        e.from?.toLowerCase().includes(q) || e.to?.toLowerCase().includes(q)
      );
    }
    return filtered;
  };

  const groupByDate = (evts: TimelineEvent[]) => {
    const groups: Record<string, TimelineEvent[]> = {};
    evts.forEach(e => {
      const d = new Date(e.timestamp);
      const today = new Date();
      const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
      let label: string;
      if (d.toDateString() === today.toDateString()) label = "Aujourd'hui";
      else if (d.toDateString() === yesterday.toDateString()) label = 'Hier';
      else label = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      if (!groups[label]) groups[label] = [];
      groups[label].push(e);
    });
    return groups;
  };

  const stats = {
    email: events.filter(e => e.type === 'email').length,
    call: events.filter(e => e.type === 'call').length,
    document: events.filter(e => e.type === 'document').length,
    ai: events.filter(e => e.type === 'ai_decision').length,
    system: events.filter(e => ['notification', 'system', 'status_change'].includes(e.type)).length,
  };

  const filteredEvents = getFilteredEvents();
  const grouped = groupByDate(filteredEvents);

  const STAT_CARDS = [
    { key: 'communication', label: 'Emails', count: stats.email, icon: <Mail className="w-4 h-4" />, color: 'text-sky-600', bg: 'bg-sky-50 hover:bg-sky-100', active: 'bg-sky-600 text-white' },
    { key: 'communication', label: 'Appels', count: stats.call, icon: <Phone className="w-4 h-4" />, color: 'text-emerald-600', bg: 'bg-emerald-50 hover:bg-emerald-100', active: 'bg-emerald-600 text-white' },
    { key: 'documents', label: 'Documents', count: stats.document, icon: <FileText className="w-4 h-4" />, color: 'text-teal-600', bg: 'bg-teal-50 hover:bg-teal-100', active: 'bg-teal-600 text-white' },
    { key: 'ai', label: 'IA', count: stats.ai, icon: <Bot className="w-4 h-4" />, color: 'text-rose-600', bg: 'bg-rose-50 hover:bg-rose-100', active: 'bg-rose-600 text-white' },
    { key: 'system', label: 'Système', count: stats.system, icon: <Settings className="w-4 h-4" />, color: 'text-gray-600', bg: 'bg-gray-50 hover:bg-gray-100', active: 'bg-gray-700 text-white' },
  ] as const;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-sky-500 animate-spin" />
          <p className="text-gray-500 text-sm font-medium">Chargement de l'historique...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Header / Stats ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Historique & Communication</h2>
            <p className="text-xs text-gray-500 mt-0.5">{events.length} événement{events.length > 1 ? 's' : ''} au total</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNoteComposer(v => !v)}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
            >
              <StickyNote className="w-4 h-4" />
              Ajouter une note
            </button>
            <button
              onClick={loadCompleteTimeline}
              className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Actualiser
            </button>
          </div>
        </div>

        {/* Stats clickable */}
        <div className="grid grid-cols-5 divide-x divide-gray-100">
          {STAT_CARDS.map((s, i) => (
            <button
              key={i}
              onClick={() => setFilter(f => f === s.key ? 'all' : s.key)}
              className={`flex flex-col items-center gap-1.5 py-4 transition-colors ${filter === s.key ? s.active : s.bg}`}
            >
              <div className={filter === s.key ? 'text-white' : s.color}>{s.icon}</div>
              <span className={`text-2xl font-black leading-none ${filter === s.key ? 'text-white' : 'text-gray-900'}`}>{s.count}</span>
              <span className={`text-xs font-semibold ${filter === s.key ? 'text-white/80' : 'text-gray-500'}`}>{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Note composer ── */}
      {showNoteComposer && (
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-amber-100 bg-amber-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StickyNote className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-bold text-amber-800">Nouvelle note</span>
            </div>
            <button onClick={() => { setShowNoteComposer(false); setNewNote(''); }} className="text-amber-500 hover:text-amber-700">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4">
            <textarea
              ref={noteRef}
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              placeholder="Écrivez votre note ici..."
              rows={4}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 resize-none"
            />
            <div className="flex items-center justify-end gap-2 mt-3">
              <button onClick={() => { setShowNoteComposer(false); setNewNote(''); }} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors">
                Annuler
              </button>
              <button
                onClick={handleAddNote}
                disabled={!newNote.trim() || savingNote}
                className="flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-colors shadow-sm"
              >
                {savingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Search + Filter tabs ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-4 py-3 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher dans l'historique..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 focus:bg-white transition-all"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          {([
            { value: 'all', label: 'Tout', icon: <Calendar className="w-3.5 h-3.5" /> },
            { value: 'communication', label: 'Communication', icon: <Mail className="w-3.5 h-3.5" /> },
            { value: 'documents', label: 'Documents', icon: <FileText className="w-3.5 h-3.5" /> },
            { value: 'ai', label: 'IA', icon: <Bot className="w-3.5 h-3.5" /> },
            { value: 'system', label: 'Système', icon: <Settings className="w-3.5 h-3.5" /> },
          ] as const).map(btn => (
            <button
              key={btn.value}
              onClick={() => setFilter(btn.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filter === btn.value
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {btn.icon}
              <span className="hidden lg:inline">{btn.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Timeline ── */}
      {Object.keys(grouped).length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-16 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Inbox className="w-7 h-7 text-gray-400" />
          </div>
          <h3 className="text-base font-bold text-gray-700 mb-1">Aucun événement</h3>
          <p className="text-sm text-gray-400">
            {searchQuery ? 'Aucun résultat pour votre recherche.' : 'Aucun événement trouvé pour ce lead.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, dateEvents]) => (
            <div key={date}>
              {/* Date separator */}
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-full shadow-sm">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-xs font-bold text-gray-700 capitalize">{date}</span>
                </div>
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400 font-medium whitespace-nowrap">
                  {dateEvents.length} événement{dateEvents.length > 1 ? 's' : ''}
                </span>
              </div>

              {/* Events list with vertical line */}
              <div className="relative ml-4">
                <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200" />
                <div className="space-y-2">
                  {dateEvents.map(event => (
                    <EventCard
                      key={event.id}
                      event={event}
                      isExpanded={expandedId === event.id}
                      onToggle={() => setExpandedId(expandedId === event.id ? null : event.id)}
                      onViewDoc={(url, fileName, mimeType) => setViewingDoc({ url, fileName, mimeType })}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {viewingDoc && (
        <DocumentViewer
          url={viewingDoc.url}
          fileName={viewingDoc.fileName}
          mimeType={viewingDoc.mimeType}
          onClose={() => setViewingDoc(null)}
        />
      )}
    </div>
  );
};

/* ── EventCard ── */
const EventCard: React.FC<{
  event: TimelineEvent;
  isExpanded: boolean;
  onToggle: () => void;
  onViewDoc: (url: string, fileName: string, mimeType: string) => void;
}> = ({ event, isExpanded, onToggle, onViewDoc }) => {
  const cfg = getEventConfig(event);
  const plainContent = event.type === 'email' ? event.content : event.content;
  const previewText = plainContent ? plainContent.substring(0, 180) : '';
  const hasMore = plainContent.length > 180;
  const hasAttachments = event.attachments && event.attachments.length > 0;
  const time = new Date(event.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="relative pl-10">
      {/* Dot on timeline */}
      <div className={`absolute left-0 top-4 w-9 h-9 rounded-full flex items-center justify-center ${cfg.bgColor} border-2 border-white shadow-sm z-10`}>
        <span className={cfg.textColor}>{cfg.icon}</span>
      </div>

      <div className={`bg-white rounded-xl border border-gray-200 border-l-4 ${cfg.borderColor} shadow-sm hover:shadow-md transition-shadow overflow-hidden`}>
        {/* Card header */}
        <div className="px-4 py-3 cursor-pointer" onClick={onToggle}>
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${cfg.badgeBg}`}>
                  {cfg.icon}
                  {cfg.label}
                </span>
                {event.direction && (
                  <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                    event.direction === 'inbound'
                      ? 'bg-blue-50 text-blue-600'
                      : 'bg-green-50 text-green-600'
                  }`}>
                    {event.direction === 'inbound'
                      ? <ArrowDownLeft className="w-3 h-3" />
                      : <ArrowUpRight className="w-3 h-3" />
                    }
                    {event.direction === 'inbound' ? 'Reçu' : 'Envoyé'}
                  </span>
                )}
                {event.status && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    event.status === 'delivered' || event.status === 'sent' ? 'bg-emerald-50 text-emerald-700'
                    : event.status === 'failed' ? 'bg-red-50 text-red-700'
                    : event.status === 'validated' ? 'bg-green-50 text-green-700'
                    : 'bg-gray-100 text-gray-600'
                  }`}>
                    {event.status}
                  </span>
                )}
                {hasAttachments && (
                  <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                    <Paperclip className="w-3 h-3" />
                    {event.attachments!.length}
                  </span>
                )}
              </div>
              <h4 className="text-sm font-semibold text-gray-900 truncate">{event.title}</h4>
              {event.from && (
                <p className="text-xs text-gray-500 mt-0.5">
                  <span className="font-medium">De :</span> {event.from}
                  {event.to && <><span className="mx-1">→</span><span className="font-medium">À :</span> {event.to}</>}
                </p>
              )}
              {!isExpanded && previewText && (
                <p className="text-xs text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">
                  {previewText}{hasMore && '…'}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs text-gray-400 font-medium">{time}</span>
              {isExpanded
                ? <ChevronUp className="w-4 h-4 text-gray-400" />
                : <ChevronDown className="w-4 h-4 text-gray-400" />
              }
            </div>
          </div>
        </div>

        {/* Expanded content */}
        {isExpanded && (
          <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
            {plainContent && (
              <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto border border-gray-100">
                {plainContent}
              </div>
            )}

            {event.metadata && Object.values(event.metadata).some(v => v !== undefined && v !== null) && (
              <div className="flex flex-wrap gap-2">
                {Object.entries(event.metadata).filter(([, v]) => v !== undefined && v !== null).map(([k, v]) => (
                  <span key={k} className="inline-flex items-center gap-1.5 text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200">
                    <Tag className="w-3 h-3 text-gray-400" />
                    <span className="font-medium text-gray-500">{k} :</span>
                    <span className="font-semibold">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                  </span>
                ))}
              </div>
            )}

            {hasAttachments && (
              <div>
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">
                  Pièces jointes ({event.attachments!.length})
                </p>
                <div className="space-y-1.5">
                  {event.attachments!.map(att => {
                    const isPDF = att.file_type?.includes('pdf');
                    const isImage = att.file_type?.startsWith('image/');
                    return (
                      <div key={att.id} className="flex items-center justify-between px-3 py-2.5 bg-gray-50 rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isImage ? 'bg-blue-100' : isPDF ? 'bg-red-100' : 'bg-gray-200'}`}>
                            {isImage ? <ImageIcon className="w-4 h-4 text-blue-600" /> : isPDF ? <FileText className="w-4 h-4 text-red-600" /> : <File className="w-4 h-4 text-gray-500" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">{att.file_name}</p>
                            <p className="text-xs text-gray-500">
                              {formatFileSize(att.file_size)}
                              {att.auto_detected_type && ` · ${att.auto_detected_type}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                          {(isPDF || isImage) && (
                            <button
                              onClick={e => { e.stopPropagation(); let url = att.download_url; if (att.storage_path && !url) url = getDocumentPublicUrl(att.storage_path, 'crm_lead_documents', supabase); onViewDoc(url, att.file_name, att.file_type); }}
                              className="p-1.5 text-sky-600 hover:bg-sky-100 rounded-lg transition-colors"
                              title="Voir"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                          <a
                            href={att.download_url || '#'}
                            download={att.file_name}
                            onClick={e => e.stopPropagation()}
                            className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-lg transition-colors"
                            title="Télécharger"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CompleteTimeline;
