import React, { useState, useEffect } from 'react';
import {
  Mail,
  Phone,
  MessageSquare,
  Send,
  ArrowDownLeft,
  ArrowUpRight,
  Paperclip,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  Image as ImageIcon,
  File
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { SecureDocumentLink } from './SecureDocumentLink';

interface Attachment {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path?: string;
  auto_detected_type?: string;
}

interface TimelineEvent {
  id: string;
  type: 'email' | 'sms' | 'whatsapp' | 'call' | 'note';
  direction: 'inbound' | 'outbound';
  timestamp: string;
  subject?: string;
  content: string;
  from?: string;
  to?: string;
  status?: string;
  attachments?: Attachment[];
  metadata?: Record<string, unknown>;
}

interface CommunicationTimelineProps {
  leadId: string;
  leadEmail?: string;
  leadPhone?: string;
  onReply?: (emailId: string, subject: string, originalContent: string) => void;
  onNewEmail?: () => void;
  onNewSMS?: () => void;
  onNewWhatsApp?: () => void;
}

export const CommunicationTimeline: React.FC<CommunicationTimelineProps> = ({
  leadId,
  leadEmail,
  leadPhone,
  onReply,
  onNewEmail,
  onNewSMS,
  onNewWhatsApp
}) => {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'email' | 'sms' | 'whatsapp' | 'call'>('all');

  useEffect(() => {
    loadTimeline();
  }, [leadId, filter]);

  const loadTimeline = async () => {
    setLoading(true);
    try {
      const allEvents: TimelineEvent[] = [];

      console.log('[CommunicationTimeline] Loading timeline for lead:', leadId);

      const { data: emails, error: emailError } = await supabase
        .from('email_messages')
        .select(`
          id,
          subject,
          body_text,
          body_html,
          from_email,
          from_name,
          to_emails,
          received_at,
          direction,
          status,
          created_at,
          attachments
        `)
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
        .limit(50);

      console.log('[CommunicationTimeline] Emails query result:', { emails, emailError, count: emails?.length || 0 });

      if (emails) {
        for (const email of emails) {
          // Nettoyer le contenu des emails avec encodage UTF-8 corrompu
          let cleanContent = email.body_text || email.body_html || '';

          // Premier niveau: corrections UTF-8 standards
          cleanContent = cleanContent
            .replace(/Ã©/g, 'é')
            .replace(/Ã /g, 'à')
            .replace(/Ã¨/g, 'è')
            .replace(/Ãª/g, 'ê')
            .replace(/Ã®/g, 'î')
            .replace(/Ã¯/g, 'ï')
            .replace(/Ã´/g, 'ô')
            .replace(/Ã¢/g, 'â')
            .replace(/Ã§/g, 'ç')
            .replace(/Ã¹/g, 'ù')
            .replace(/Ã»/g, 'û')
            .replace(/Ã/g, 'À')
            .replace(/Ã/g, 'É')
            .replace(/Ã/g, 'È')
            .replace(/Ã/g, 'Ê');

          // Deuxième niveau: corrections de patterns spécifiques
          cleanContent = cleanContent
            .replace(/Jâai/gi, 'J\'ai')
            .replace(/jâai/gi, 'j\'ai')
            .replace(/câest/gi, 'c\'est')
            .replace(/lâ/gi, 'l\'')
            .replace(/dâ/gi, 'd\'')
            .replace(/jâattends/gi, 'j\'attends')
            .replace(/auprÃ¨s/g, 'auprès')
            .replace(/dÃ©clinÃ©/g, 'décliné')
            .replace(/antÃ©cÃ©dents/g, 'antécédents')
            .replace(/demandÃ©s/g, 'demandés')
            .replace(/dÃ©jÃ /g, 'déjà');

          // Troisième niveau: corrections de caractères complexes
          cleanContent = cleanContent
            .replace(/[鲃饪翊]/g, '\'')  // Ces caractères chinois remplacent souvent les apostrophes
            .replace(/倁/g, 'ai')
            .replace(/䰀/g, 'é');

          // Mapper les attachments depuis le champ JSONB email_messages.attachments
          const mappedAttachments = ((email.attachments as Array<{ filename?: string; name?: string; contentType?: string; content_type?: string; size?: number; file_size?: number; storage_path?: string; path?: string; proposed_doc_type?: string }>) || []).map((att, idx: number) => ({
            id: `${email.id}-att-${idx}`,
            file_name: att.filename || att.name || 'Pièce jointe',
            file_type: att.contentType || att.content_type || 'application/octet-stream',
            file_size: att.size || att.file_size || 0,
            storage_path: att.storage_path || att.path,
            auto_detected_type: att.proposed_doc_type
          }));

          allEvents.push({
            id: email.id,
            type: 'email',
            direction: email.direction,
            timestamp: email.received_at || email.created_at,
            subject: email.subject,
            content: cleanContent,
            from: email.direction === 'inbound' ? `${email.from_name || ''} <${email.from_email}>` : 'TaxiAssur <team@taxiassur.com>',
            to: email.direction === 'outbound' ? (email.to_emails?.[0] || leadEmail) : 'team@taxiassur.com',
            status: email.status,
            attachments: mappedAttachments
          });
        }
      }

      const { data: interactions } = await supabase
        .from('crm_interactions')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (interactions) {
        interactions.forEach((interaction) => {
          allEvents.push({
            id: interaction.id,
            type: interaction.channel as any,
            direction: interaction.direction,
            timestamp: interaction.created_at,
            subject: interaction.subject,
            content: interaction.content || interaction.notes || '',
            status: interaction.status,
            metadata: interaction.metadata
          });
        });
      }

      allEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      console.log('[CommunicationTimeline] Total events loaded:', allEvents.length);

      const filtered = filter === 'all'
        ? allEvents
        : allEvents.filter(e => e.type === filter);

      console.log('[CommunicationTimeline] Filtered events:', { filter, count: filtered.length });

      setEvents(filtered);
    } catch (error) {
      console.error('Error loading timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: string, direction: string) => {
    const isInbound = direction === 'inbound';
    const iconClass = "w-4 h-4";

    switch (type) {
      case 'email':
        return isInbound ? <ArrowDownLeft className={`${iconClass} text-blue-600`} /> : <ArrowUpRight className={`${iconClass} text-green-600`} />;
      case 'sms':
        return isInbound ? <ArrowDownLeft className={`${iconClass} text-purple-600`} /> : <ArrowUpRight className={`${iconClass} text-purple-400`} />;
      case 'whatsapp':
        return isInbound ? <ArrowDownLeft className={`${iconClass} text-emerald-600`} /> : <ArrowUpRight className={`${iconClass} text-emerald-400`} />;
      case 'call':
        return isInbound ? <Phone className={`${iconClass} text-orange-600`} /> : <Phone className={`${iconClass} text-orange-400`} />;
      default:
        return <FileText className={iconClass} />;
    }
  };

  const getColor = (type: string, direction: string) => {
    const isInbound = direction === 'inbound';

    if (type === 'email') {
      return isInbound
        ? 'bg-blue-500/10 border-blue-500/30 text-blue-600'
        : 'bg-green-500/10 border-green-500/30 text-green-600';
    }
    if (type === 'sms') return 'bg-purple-500/10 border-purple-500/30 text-purple-600';
    if (type === 'whatsapp') return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600';
    if (type === 'call') return 'bg-orange-500/10 border-orange-500/30 text-orange-600';
    return 'bg-gray-500/10 border-gray-500/30 text-gray-600';
  };

  const getLabel = (type: string, direction: string) => {
    const isInbound = direction === 'inbound';

    switch (type) {
      case 'email':
        return isInbound ? 'Email reçu' : 'Email envoyé';
      case 'sms':
        return isInbound ? 'SMS reçu' : 'SMS envoyé';
      case 'whatsapp':
        return isInbound ? 'WhatsApp reçu' : 'WhatsApp envoyé';
      case 'call':
        return isInbound ? 'Appel entrant' : 'Appel sortant';
      default:
        return 'Note';
    }
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;

    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    const stripped = text.replace(/<[^>]+>/g, '').trim();
    if (stripped.length <= maxLength) return stripped;
    return stripped.substring(0, maxLength) + '...';
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.match(/image|png|jpg|jpeg/i)) return <ImageIcon className="w-4 h-4" />;
    if (fileType.match(/pdf/i)) return <FileText className="w-4 h-4 text-red-600" />;
    return <File className="w-4 h-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Timeline des échanges
            </h3>
            <p className="text-xs text-gray-500 mt-1">{events.length} interactions</p>
          </div>

          <div className="flex gap-2">
            {onNewEmail && (
              <button
                onClick={onNewEmail}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
              >
                <Mail className="w-3 h-3" />
                <span>Nouvel email</span>
              </button>
            )}
            {onNewSMS && leadPhone && (
              <button
                onClick={onNewSMS}
                className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-lg transition-colors"
              >
                <MessageSquare className="w-3 h-3" />
                <span>SMS</span>
              </button>
            )}
            {onNewWhatsApp && leadPhone && (
              <button
                onClick={onNewWhatsApp}
                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors"
              >
                <MessageSquare className="w-3 h-3" />
                <span>WhatsApp</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto">
          {['all', 'email', 'sms', 'whatsapp', 'call'].map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type as any)}
              className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition-all ${
                filter === type
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {type === 'all' ? 'Tout' : type === 'email' ? 'Emails' : type === 'sms' ? 'SMS' : type === 'whatsapp' ? 'WhatsApp' : 'Appels'}
            </button>
          ))}
        </div>
      </div>

      <div className="max-h-[600px] overflow-y-auto">
        {events.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Aucune interaction pour le moment</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {events.map((event) => {
              const isExpanded = expandedId === event.id;
              const colorClasses = getColor(event.type, event.direction);

              return (
                <div
                  key={event.id}
                  className="p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex gap-3">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full border flex items-center justify-center ${colorClasses}`}>
                      {getIcon(event.type, event.direction)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm text-gray-900 flex items-center gap-1.5">
                              {event.direction === 'inbound' ? (
                                <ArrowDownLeft className="w-3.5 h-3.5 text-blue-600" />
                              ) : (
                                <ArrowUpRight className="w-3.5 h-3.5 text-green-600" />
                              )}
                              {getLabel(event.type, event.direction)}
                            </span>
                            {event.attachments && event.attachments.length > 0 && (
                              <span className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                <Paperclip className="w-3 h-3" />
                                {event.attachments.length}
                              </span>
                            )}
                          </div>

                          {event.subject && (
                            <p className="text-sm font-medium text-gray-700 mb-1">
                              {event.subject}
                            </p>
                          )}

                          {event.type === 'email' && (
                            <div className="text-xs text-gray-500 mb-2">
                              {event.direction === 'inbound' ? (
                                <>De: {event.from}</>
                              ) : (
                                <>À: {event.to}</>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 whitespace-nowrap">
                            {formatDate(event.timestamp)}
                          </span>
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : event.id)}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {!isExpanded && event.content && (
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {truncateText(event.content)}
                        </p>
                      )}

                      {isExpanded && (
                        <div className="mt-3 space-y-3">
                          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                            <div
                              className="text-sm text-gray-700 whitespace-pre-wrap max-h-64 overflow-y-auto"
                              dangerouslySetInnerHTML={{
                                __html: event.content.replace(/<[^>]+>/g, '')
                              }}
                            />
                          </div>

                          {event.attachments && event.attachments.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                                <Paperclip className="w-3 h-3" />
                                Pièces jointes ({event.attachments.length})
                              </p>
                              <div className="space-y-2">
                                {event.attachments.map((attachment) => (
                                  <div
                                    key={attachment.id}
                                    className="flex items-center gap-3 p-2 bg-blue-50 border border-blue-200 rounded-lg"
                                  >
                                    <div className="text-blue-600">
                                      {getFileIcon(attachment.file_type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-gray-900 truncate">
                                        {attachment.file_name}
                                      </p>
                                      <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <span>{formatFileSize(attachment.file_size)}</span>
                                        {attachment.auto_detected_type && (
                                          <>
                                            <span>•</span>
                                            <span className="text-blue-600 font-medium">
                                              {attachment.auto_detected_type.replace(/_/g, ' ')}
                                            </span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                    {attachment.storage_path && <SecureDocumentLink filePath={attachment.storage_path} source="email_attachments" bucket="email-attachments" fileName={attachment.file_name} mode="download" className="flex-shrink-0 p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors" iconSize={16} />}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {event.status && (
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-gray-500">Statut:</span>
                              <span className={`px-2 py-1 rounded-full font-medium ${
                                event.status === 'sent' || event.status === 'delivered'
                                  ? 'bg-green-100 text-green-700'
                                  : event.status === 'failed'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}>
                                {event.status}
                              </span>
                            </div>
                          )}

                          {event.type === 'email' && event.direction === 'inbound' && onReply && (
                            <div className="pt-3 border-t border-gray-200">
                              <button
                                onClick={() => onReply(event.id, `Re: ${event.subject}`, event.content)}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                              >
                                <Send className="w-4 h-4" />
                                Répondre
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CommunicationTimeline;
