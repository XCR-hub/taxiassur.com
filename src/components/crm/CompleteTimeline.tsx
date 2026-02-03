import React, { useState, useEffect } from 'react';
import {
  Mail,
  Phone,
  MessageSquare,
  Send,
  Download,
  ArrowDownLeft,
  ArrowUpRight,
  Paperclip,
  ChevronDown,
  ChevronUp,
  Clock,
  User,
  FileText,
  Image as ImageIcon,
  File,
  Bot,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Filter,
  Search,
  TrendingUp,
  Calendar,
  Eye,
  Upload,
  Settings,
  Zap
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
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
  icon?: React.ReactNode;
  color?: string;
}

interface CompleteTimelineProps {
  leadId: string;
  leadEmail?: string;
  leadPhone?: string;
}

export const CompleteTimeline: React.FC<CompleteTimelineProps> = ({
  leadId,
  leadEmail,
  leadPhone
}) => {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'communication' | 'system' | 'documents' | 'ai'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingDoc, setViewingDoc] = useState<{url: string; fileName: string; mimeType: string} | null>(null);

  useEffect(() => {
    loadCompleteTimeline();
  }, [leadId]);

  const loadCompleteTimeline = async () => {
    setLoading(true);
    try {
      const allEvents: TimelineEvent[] = [];

      // 1. Charger les emails
      const { data: emails } = await supabase
        .from('email_messages')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (emails) {
        for (const email of emails) {
          // Charger les pièces jointes
          const { data: attachments } = await supabase
            .from('email_attachments')
            .select('*')
            .eq('email_id', email.id);

          allEvents.push({
            id: `email-${email.id}`,
            type: 'email',
            direction: email.direction,
            timestamp: email.received_at || email.created_at,
            title: email.subject || 'Sans objet',
            content: email.body_text || email.body_html || '',
            from: email.from_email,
            to: Array.isArray(email.to_emails) ? email.to_emails.join(', ') : email.to_emails,
            status: email.status,
            attachments: attachments?.map(a => ({
              id: a.id,
              file_name: a.filename,
              file_type: a.content_type,
              file_size: a.file_size,
              download_url: a.download_url || '',
              storage_path: a.storage_path,
              auto_detected_type: a.auto_detected_type
            })),
            icon: <Mail className="h-5 w-5" />,
            color: email.direction === 'inbound' ? 'blue' : 'green'
          });
        }
      }

      // 2. Charger les interactions (SMS, WhatsApp, appels, notes)
      const { data: interactions } = await supabase
        .from('crm_interactions')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (interactions) {
        interactions.forEach(int => {
          let icon = <MessageSquare className="h-5 w-5" />;
          let color = 'purple';
          let title = 'Interaction';

          switch (int.channel) {
            case 'call':
              icon = <Phone className="h-5 w-5" />;
              color = int.direction === 'inbound' ? 'orange' : 'teal';
              title = int.direction === 'inbound' ? 'Appel reçu' : 'Appel passé';
              break;
            case 'sms':
              icon = <MessageSquare className="h-5 w-5" />;
              color = 'indigo';
              title = int.direction === 'inbound' ? 'SMS reçu' : 'SMS envoyé';
              break;
            case 'whatsapp':
              icon = <MessageSquare className="h-5 w-5" />;
              color = 'green';
              title = int.direction === 'inbound' ? 'WhatsApp reçu' : 'WhatsApp envoyé';
              break;
            case 'note':
              icon = <FileText className="h-5 w-5" />;
              color = 'gray';
              title = 'Note ajoutée';
              break;
          }

          allEvents.push({
            id: `interaction-${int.id}`,
            type: int.channel,
            direction: int.direction,
            timestamp: int.created_at,
            title,
            content: int.content || int.notes || int.subject || '',
            metadata: int.metadata,
            icon,
            color
          });
        });
      }

      // 3. Charger les documents uploadés
      const { data: documents } = await supabase
        .from('crm_lead_documents')
        .select('*')
        .eq('lead_id', leadId)
        .order('uploaded_at', { ascending: false });

      if (documents) {
        documents.forEach(doc => {
          allEvents.push({
            id: `document-${doc.id}`,
            type: 'document',
            direction: 'inbound',
            timestamp: doc.uploaded_at,
            title: `Document uploadé: ${doc.file_name}`,
            content: `Type: ${doc.document_type || 'Non spécifié'} - Statut: ${doc.status || 'En attente'}`,
            attachments: [{
              id: doc.id,
              file_name: doc.file_name,
              file_type: doc.mime_type || 'application/octet-stream',
              file_size: doc.file_size || 0,
              download_url: supabase.storage.from('crm-documents').getPublicUrl(doc.file_path).data.publicUrl,
              storage_path: doc.file_path
            }],
            metadata: {
              validation_status: doc.status,
              validated_by: doc.validated_by,
              validated_at: doc.validated_at
            },
            icon: <Upload className="h-5 w-5" />,
            color: 'cyan'
          });
        });
      }

      // 4. Charger les décisions IA
      const { data: aiDecisions } = await supabase
        .from('crm_ai_decisions')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (aiDecisions) {
        aiDecisions.forEach(decision => {
          allEvents.push({
            id: `ai-${decision.id}`,
            type: 'ai_decision',
            timestamp: decision.created_at,
            title: `IA: ${decision.decision_type}`,
            content: decision.reasoning || decision.suggestion || '',
            status: decision.status,
            metadata: {
              confidence: decision.confidence_score,
              applied: decision.applied_at ? 'Appliqué' : 'En attente'
            },
            icon: <Bot className="h-5 w-5" />,
            color: 'violet'
          });
        });
      }

      // 5. Charger les événements système/notifications
      const { data: notifications } = await supabase
        .from('crm_event_notifications')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (notifications) {
        notifications.forEach(notif => {
          let icon = <Bell className="h-5 w-5" />;
          if (notif.event_type?.includes('document')) icon = <FileText className="h-5 w-5" />;
          if (notif.event_type?.includes('quote')) icon = <TrendingUp className="h-5 w-5" />;
          if (notif.event_type?.includes('contract')) icon = <CheckCircle className="h-5 w-5" />;

          allEvents.push({
            id: `notification-${notif.id}`,
            type: 'notification',
            timestamp: notif.created_at,
            title: notif.title || 'Notification système',
            content: notif.message || '',
            metadata: notif.metadata,
            icon,
            color: 'yellow'
          });
        });
      }

      // Trier tous les événements par date décroissante
      allEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setEvents(allEvents);
    } catch (error) {
      console.error('Error loading timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredEvents = () => {
    let filtered = events;

    // Filtre par type
    if (filter === 'communication') {
      filtered = filtered.filter(e => ['email', 'sms', 'whatsapp', 'call', 'note'].includes(e.type));
    } else if (filter === 'system') {
      filtered = filtered.filter(e => ['status_change', 'system', 'notification'].includes(e.type));
    } else if (filter === 'documents') {
      filtered = filtered.filter(e => e.type === 'document');
    } else if (filter === 'ai') {
      filtered = filtered.filter(e => e.type === 'ai_decision');
    }

    // Recherche
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(e =>
        e.title.toLowerCase().includes(query) ||
        e.content.toLowerCase().includes(query) ||
        e.from?.toLowerCase().includes(query) ||
        e.to?.toLowerCase().includes(query)
      );
    }

    return filtered;
  };

  const groupEventsByDate = (events: TimelineEvent[]) => {
    const groups: { [key: string]: TimelineEvent[] } = {};

    events.forEach(event => {
      const date = new Date(event.timestamp).toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(event);
    });

    return groups;
  };

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      blue: { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-300' },
      green: { bg: 'bg-green-100', text: 'text-green-600', border: 'border-green-300' },
      orange: { bg: 'bg-orange-100', text: 'text-orange-600', border: 'border-orange-300' },
      purple: { bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-300' },
      teal: { bg: 'bg-teal-100', text: 'text-teal-600', border: 'border-teal-300' },
      indigo: { bg: 'bg-indigo-100', text: 'text-indigo-600', border: 'border-indigo-300' },
      cyan: { bg: 'bg-cyan-100', text: 'text-cyan-600', border: 'border-cyan-300' },
      violet: { bg: 'bg-violet-100', text: 'text-violet-600', border: 'border-violet-300' },
      yellow: { bg: 'bg-yellow-100', text: 'text-yellow-600', border: 'border-yellow-300' },
      gray: { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-300' }
    };
    return colors[color] || colors.gray;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filteredEvents = getFilteredEvents();
  const groupedEvents = groupEventsByDate(filteredEvents);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de l'historique complet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header avec stats */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Historique Complet</h2>
            <p className="text-sm text-gray-600 mt-1">
              Tous les événements, communications et actions système
            </p>
          </div>
          <button
            onClick={loadCompleteTimeline}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Mail className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-medium text-blue-600">Emails</span>
            </div>
            <p className="text-2xl font-bold text-blue-900">
              {events.filter(e => e.type === 'email').length}
            </p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Phone className="h-4 w-4 text-green-600" />
              <span className="text-xs font-medium text-green-600">Appels</span>
            </div>
            <p className="text-2xl font-bold text-green-900">
              {events.filter(e => e.type === 'call').length}
            </p>
          </div>
          <div className="bg-cyan-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4 text-cyan-600" />
              <span className="text-xs font-medium text-cyan-600">Documents</span>
            </div>
            <p className="text-2xl font-bold text-cyan-900">
              {events.filter(e => e.type === 'document').length}
            </p>
          </div>
          <div className="bg-violet-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Bot className="h-4 w-4 text-violet-600" />
              <span className="text-xs font-medium text-violet-600">IA</span>
            </div>
            <p className="text-2xl font-bold text-violet-900">
              {events.filter(e => e.type === 'ai_decision').length}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Settings className="h-4 w-4 text-gray-600" />
              <span className="text-xs font-medium text-gray-600">Système</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {events.filter(e => ['notification', 'system', 'status_change'].includes(e.type)).length}
            </p>
          </div>
        </div>

        {/* Filtres et recherche */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher dans l'historique..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-2">
            {[
              { value: 'all', label: 'Tout', icon: <Calendar className="h-4 w-4" /> },
              { value: 'communication', label: 'Communication', icon: <MessageSquare className="h-4 w-4" /> },
              { value: 'documents', label: 'Documents', icon: <FileText className="h-4 w-4" /> },
              { value: 'ai', label: 'IA', icon: <Bot className="h-4 w-4" /> },
              { value: 'system', label: 'Système', icon: <Settings className="h-4 w-4" /> }
            ].map(({ value, label, icon }) => (
              <button
                key={value}
                onClick={() => setFilter(value as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  filter === value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {icon}
                <span className="hidden md:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline */}
      {Object.keys(groupedEvents).length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun événement</h3>
          <p className="text-gray-600">
            {searchQuery ? 'Aucun résultat pour votre recherche' : 'Aucun événement trouvé pour ce lead'}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedEvents).map(([date, dateEvents]) => (
            <div key={date}>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-lg">
                  <Calendar className="h-4 w-4 text-gray-600" />
                  <h3 className="text-sm font-semibold text-gray-900 capitalize">{date}</h3>
                </div>
                <div className="flex-1 h-px bg-gray-200"></div>
                <span className="text-sm text-gray-500">{dateEvents.length} événement(s)</span>
              </div>

              <div className="space-y-3">
                {dateEvents.map((event) => {
                  const isExpanded = expandedId === event.id;
                  const colors = getColorClasses(event.color || 'gray');

                  return (
                    <div
                      key={event.id}
                      className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                    >
                      <div
                        className="p-4 cursor-pointer"
                        onClick={() => setExpandedId(isExpanded ? null : event.id)}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`flex-shrink-0 w-10 h-10 rounded-full ${colors.bg} flex items-center justify-center ${colors.text}`}>
                            {event.icon}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4 mb-2">
                              <div className="flex-1">
                                <h4 className="text-sm font-semibold text-gray-900 mb-1">
                                  {event.title}
                                </h4>
                                <div className="flex items-center gap-3 text-xs text-gray-500">
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {new Date(event.timestamp).toLocaleTimeString('fr-FR', {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </div>
                                  {event.direction && (
                                    <div className="flex items-center gap-1">
                                      {event.direction === 'inbound' ? (
                                        <>
                                          <ArrowDownLeft className="h-3 w-3 text-blue-500" />
                                          <span>Reçu</span>
                                        </>
                                      ) : (
                                        <>
                                          <ArrowUpRight className="h-3 w-3 text-green-500" />
                                          <span>Envoyé</span>
                                        </>
                                      )}
                                    </div>
                                  )}
                                  {event.status && (
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                      event.status === 'delivered' ? 'bg-green-100 text-green-700' :
                                      event.status === 'failed' ? 'bg-red-100 text-red-700' :
                                      'bg-gray-100 text-gray-700'
                                    }`}>
                                      {event.status}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {event.attachments && event.attachments.length > 0 && (
                                  <div className="flex items-center gap-1 text-xs text-gray-500">
                                    <Paperclip className="h-3 w-3" />
                                    {event.attachments.length}
                                  </div>
                                )}
                                {isExpanded ? (
                                  <ChevronUp className="h-5 w-5 text-gray-400" />
                                ) : (
                                  <ChevronDown className="h-5 w-5 text-gray-400" />
                                )}
                              </div>
                            </div>

                            {!isExpanded && event.content && (
                              <p className="text-sm text-gray-600 line-clamp-2">
                                {event.content.substring(0, 150)}...
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="px-4 pb-4 border-t border-gray-100 pt-4 mt-2">
                          {/* Détails */}
                          {event.from && (
                            <div className="mb-2 text-sm">
                              <span className="font-medium text-gray-700">De:</span>{' '}
                              <span className="text-gray-600">{event.from}</span>
                            </div>
                          )}
                          {event.to && (
                            <div className="mb-2 text-sm">
                              <span className="font-medium text-gray-700">À:</span>{' '}
                              <span className="text-gray-600">{event.to}</span>
                            </div>
                          )}

                          {event.content && (
                            <div className="mb-4 text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 rounded p-3">
                              {event.content}
                            </div>
                          )}

                          {/* Métadonnées */}
                          {event.metadata && Object.keys(event.metadata).length > 0 && (
                            <div className="mb-4 p-3 bg-gray-50 rounded">
                              <p className="text-xs font-medium text-gray-700 mb-2">Informations complémentaires</p>
                              <div className="grid grid-cols-2 gap-2">
                                {Object.entries(event.metadata).map(([key, value]) => (
                                  <div key={key} className="text-xs">
                                    <span className="text-gray-500">{key}:</span>{' '}
                                    <span className="text-gray-900 font-medium">
                                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Pièces jointes */}
                          {event.attachments && event.attachments.length > 0 && (
                            <div>
                              <p className="text-sm font-medium text-gray-900 mb-2">
                                Pièces jointes ({event.attachments.length})
                              </p>
                              <div className="space-y-2">
                                {event.attachments.map((attachment) => {
                                  const isPDF = attachment.file_type?.includes('pdf');
                                  const isImage = attachment.file_type?.startsWith('image/');

                                  return (
                                    <div
                                      key={attachment.id}
                                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                    >
                                      <div className="flex items-center gap-3 flex-1 min-w-0">
                                        {isImage ? (
                                          <ImageIcon className="h-5 w-5 text-blue-500 flex-shrink-0" />
                                        ) : isPDF ? (
                                          <FileText className="h-5 w-5 text-red-500 flex-shrink-0" />
                                        ) : (
                                          <File className="h-5 w-5 text-gray-500 flex-shrink-0" />
                                        )}
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium text-gray-900 truncate">
                                            {attachment.file_name}
                                          </p>
                                          <p className="text-xs text-gray-500">
                                            {formatFileSize(attachment.file_size)}
                                            {attachment.auto_detected_type && ` • ${attachment.auto_detected_type}`}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {(isPDF || isImage) && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              let url = attachment.download_url;
                                              if (attachment.storage_path && !url) {
                                                url = supabase.storage.from('crm-documents').getPublicUrl(attachment.storage_path).data.publicUrl;
                                              }
                                              setViewingDoc({
                                                url,
                                                fileName: attachment.file_name,
                                                mimeType: attachment.file_type
                                              });
                                            }}
                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                            title="Voir"
                                          >
                                            <Eye className="h-4 w-4" />
                                          </button>
                                        )}
                                        <a
                                          href={attachment.download_url || '#'}
                                          download={attachment.file_name}
                                          onClick={(e) => e.stopPropagation()}
                                          className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                          title="Télécharger"
                                        >
                                          <Download className="h-4 w-4" />
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
                  );
                })}
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

export default CompleteTimeline;

// Import missing icon
import { Bell } from 'lucide-react';
