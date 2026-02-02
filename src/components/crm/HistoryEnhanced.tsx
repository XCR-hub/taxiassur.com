import { useState, useEffect, useMemo } from 'react';
import {
  History,
  Mail,
  MessageSquare,
  Phone,
  FileText,
  Bot,
  RefreshCw,
  Search,
  Filter,
  ChevronDown,
  Eye,
  Calendar,
  Clock,
  User,
  TrendingUp,
  Send,
  Inbox
} from 'lucide-react';
import AnimatedStatCard from '@/components/AnimatedStatCard';
import ContextualTooltip from '@/components/ContextualTooltip';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface HistoryEvent {
  id: string;
  type: 'email' | 'sms' | 'whatsapp' | 'call' | 'note' | 'system' | 'status_change';
  title: string;
  content: string;
  fullContent?: string;
  subject?: string;
  created_at: string;
  created_by?: string;
  direction?: 'inbound' | 'outbound';
  status?: string;
  metadata?: any;
}

interface HistoryEnhancedProps {
  leadId: string;
  onRefresh?: () => void;
}

const EVENT_TYPES = [
  { id: 'all', label: 'Tous', icon: History, color: 'text-gray-600' },
  { id: 'email', label: 'Emails', icon: Mail, color: 'text-blue-600' },
  { id: 'sms', label: 'SMS', icon: MessageSquare, color: 'text-green-600' },
  { id: 'whatsapp', label: 'WhatsApp', icon: Phone, color: 'text-emerald-600' },
  { id: 'call', label: 'Appels', icon: Phone, color: 'text-purple-600' },
  { id: 'system', label: 'Système', icon: Bot, color: 'text-orange-600' }
];

export default function HistoryEnhanced({ leadId, onRefresh }: HistoryEnhancedProps) {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<HistoryEvent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadHistory();
  }, [leadId]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      // Load emails
      const { data: emails } = await supabase
        .from('email_messages')
        .select('*')
        .eq('lead_id', leadId)
        .order('sent_at', { ascending: false });

      // Load timeline
      const { data: timeline } = await supabase
        .from('crm_lead_timeline')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      // Load interactions
      const { data: interactions } = await supabase
        .from('crm_interactions')
        .select('*')
        .eq('lead_id', leadId)
        .order('interaction_date', { ascending: false });

      // Merge all events
      const allEvents: HistoryEvent[] = [];

      // Add emails
      if (emails) {
        emails.forEach(email => {
          allEvents.push({
            id: `email-${email.id}`,
            type: 'email',
            title: email.direction === 'inbound' ? 'Email reçu' : 'Email envoyé',
            content: email.preview || email.subject || '',
            fullContent: email.body_text || email.body_html || '',
            subject: email.subject,
            created_at: email.sent_at || email.created_at,
            created_by: email.from_email,
            direction: email.direction,
            status: email.status
          });
        });
      }

      // Add timeline events
      if (timeline) {
        timeline.forEach(event => {
          allEvents.push({
            id: `timeline-${event.id}`,
            type: event.event_type === 'status_change' ? 'system' : (event.event_type as any),
            title: event.title || event.event_type,
            content: event.description || '',
            created_at: event.created_at,
            created_by: event.created_by_name,
            metadata: event.metadata
          });
        });
      }

      // Add interactions
      if (interactions) {
        interactions.forEach(interaction => {
          allEvents.push({
            id: `interaction-${interaction.id}`,
            type: interaction.interaction_type as any,
            title: `${interaction.interaction_type} - ${interaction.subject || 'Sans objet'}`,
            content: interaction.notes || '',
            created_at: interaction.interaction_date,
            created_by: 'TaxiAssur',
            direction: interaction.direction
          });
        });
      }

      // Sort by date desc
      allEvents.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setEvents(allEvents);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = useMemo(() => {
    let filtered = events;

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(e => e.type === selectedType);
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(e =>
        e.title.toLowerCase().includes(query) ||
        e.content.toLowerCase().includes(query) ||
        e.subject?.toLowerCase().includes(query) ||
        e.created_by?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [events, selectedType, searchQuery]);

  const groupedEvents = useMemo(() => {
    const groups: Record<string, HistoryEvent[]> = {};

    filteredEvents.forEach(event => {
      const date = new Date(event.created_at);
      const dateKey = date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }

      groups[dateKey].push(event);
    });

    return groups;
  }, [filteredEvents]);

  const stats = {
    total: events.length,
    emails: events.filter(e => e.type === 'email').length,
    inbound: events.filter(e => e.direction === 'inbound').length,
    outbound: events.filter(e => e.direction === 'outbound').length
  };

  const toggleExpanded = (eventId: string) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
    }
    setExpandedEvents(newExpanded);
  };

  const getEventIcon = (type: string) => {
    const iconMap = {
      email: Mail,
      sms: MessageSquare,
      whatsapp: Phone,
      call: Phone,
      note: FileText,
      system: Bot
    };
    return iconMap[type as keyof typeof iconMap] || FileText;
  };

  const getEventColor = (type: string, direction?: string) => {
    if (type === 'email') {
      return direction === 'inbound' ? 'bg-blue-100 text-blue-600' : 'bg-blue-50 text-blue-600';
    }
    const colorMap = {
      sms: 'bg-green-100 text-green-600',
      whatsapp: 'bg-emerald-100 text-emerald-600',
      call: 'bg-purple-100 text-purple-600',
      note: 'bg-gray-100 text-gray-600',
      system: 'bg-orange-100 text-orange-600'
    };
    return colorMap[type as keyof typeof colorMap] || 'bg-gray-100 text-gray-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs Historique */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <AnimatedStatCard
          title="Total Événements"
          value={stats.total}
          icon={History}
          color="blue"
          animationDuration={1000}
        />

        <AnimatedStatCard
          title="Emails"
          value={stats.emails}
          icon={Mail}
          color="purple"
          animationDuration={1000}
        />

        <AnimatedStatCard
          title="Entrants"
          value={stats.inbound}
          icon={Inbox}
          color="green"
          trend={stats.inbound > 0 ? {
            value: stats.inbound,
            label: "messages reçus",
            direction: "up"
          } : undefined}
          animationDuration={1000}
        />

        <AnimatedStatCard
          title="Sortants"
          value={stats.outbound}
          icon={Send}
          color="amber"
          animationDuration={1000}
        />
      </div>

      {/* Filtres et Recherche */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Recherche */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher dans l'historique..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filtres par type */}
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
            {EVENT_TYPES.map((eventType) => {
              const Icon = eventType.icon;
              const isActive = selectedType === eventType.id;

              return (
                <ContextualTooltip
                  key={eventType.id}
                  content={`Filtrer par ${eventType.label}`}
                  type="tip"
                >
                  <button
                    onClick={() => setSelectedType(eventType.id)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg border transition-all whitespace-nowrap",
                      isActive
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{eventType.label}</span>
                  </button>
                </ContextualTooltip>
              );
            })}
          </div>

          <ContextualTooltip content="Actualiser l'historique" type="help">
            <button
              onClick={() => {
                loadHistory();
                onRefresh?.();
              }}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4 text-gray-600" />
            </button>
          </ContextualTooltip>
        </div>
      </div>

      {/* Timeline par dates */}
      <div className="space-y-6">
        {Object.entries(groupedEvents).map(([date, dateEvents]) => (
          <div key={date}>
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-bold text-gray-900">{date}</h3>
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-sm text-gray-500">{dateEvents.length} événement(s)</span>
            </div>

            <div className="space-y-3 pl-8 border-l-2 border-gray-200">
              {dateEvents.map((event) => {
                const EventIcon = getEventIcon(event.type);
                const isExpanded = expandedEvents.has(event.id);
                const hasFullContent = event.fullContent && event.fullContent.length > event.content.length;

                return (
                  <div
                    key={event.id}
                    className={cn(
                      "relative ml-6 rounded-xl shadow-sm border p-4 transition-all hover:shadow-md",
                      event.direction === 'inbound'
                        ? "bg-blue-50 border-blue-200"
                        : "bg-white border-gray-200"
                    )}
                  >
                    {/* Bullet point */}
                    <div
                      className={cn(
                        "absolute -left-[30px] w-10 h-10 rounded-full flex items-center justify-center",
                        getEventColor(event.type, event.direction)
                      )}
                    >
                      <EventIcon className="w-5 h-5" />
                    </div>

                    {/* Content */}
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{event.title}</h4>
                          {event.subject && event.subject !== event.title && (
                            <p className="text-sm text-gray-700 mt-1">{event.subject}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          {new Date(event.created_at).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>

                      {event.created_by && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <User className="w-3 h-3" />
                          {event.created_by}
                        </div>
                      )}

                      <div className="text-sm text-gray-700">
                        {isExpanded && event.fullContent ? event.fullContent : event.content}
                      </div>

                      {hasFullContent && (
                        <button
                          onClick={() => toggleExpanded(event.id)}
                          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium mt-2"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronDown className="w-3 h-3" />
                              Réduire
                            </>
                          ) : (
                            <>
                              <Eye className="w-3 h-3" />
                              Lire le message complet
                            </>
                          )}
                        </button>
                      )}

                      {event.status && (
                        <div className={cn(
                          "inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium",
                          event.status === 'sent' && "bg-green-100 text-green-700",
                          event.status === 'delivered' && "bg-blue-100 text-blue-700",
                          event.status === 'read' && "bg-purple-100 text-purple-700",
                          event.status === 'failed' && "bg-red-100 text-red-700"
                        )}>
                          {event.status}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {filteredEvents.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
            <History className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">
              {searchQuery || selectedType !== 'all'
                ? 'Aucun résultat pour ces filtres'
                : 'Aucun historique'}
            </p>
            {(searchQuery || selectedType !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedType('all');
                }}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium mt-2"
              >
                Réinitialiser les filtres
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
