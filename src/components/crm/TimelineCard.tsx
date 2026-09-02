import React, { useState, useEffect } from 'react';
import { MessageSquare, Maximize2, X, Mail, Phone as PhoneIcon, MessageCircle, ArrowDownLeft, ArrowUpRight, Clock } from 'lucide-react';
import { nativeAdminLeadSummary } from '@/lib/native-admin-data';
import CommunicationTimeline from './CommunicationTimeline';

interface TimelineCardProps {
  leadId: string;
  leadEmail: string;
  leadPhone: string;
  messageCount: number;
  onReply: (emailId: string, subject: string, originalContent: string) => void;
  onNewEmail: () => void;
  onNewSMS: () => void;
  onNewWhatsApp: () => void;
}

interface QuickEvent {
  id: string;
  type: 'email' | 'sms' | 'whatsapp' | 'call' | 'note';
  direction: 'inbound' | 'outbound';
  timestamp: string;
  label: string;
  preview: string;
}

const TimelineCard: React.FC<TimelineCardProps> = ({
  leadId,
  leadEmail,
  leadPhone,
  messageCount,
  onReply,
  onNewEmail,
  onNewSMS,
  onNewWhatsApp
}) => {
  const [showModal, setShowModal] = useState(false);
  const [recentEvents, setRecentEvents] = useState<QuickEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecentEvents();
  }, [leadId, messageCount]);

  const loadRecentEvents = async () => {
    try {
      const events: QuickEvent[] = [];

      // Charger les 3 derniers emails
      const { summary = {} } = await nativeAdminLeadSummary(leadId) as {
        summary?: { emails?: any[]; interactions?: any[] };
      };
      const emails = (summary.emails || [])
        .sort((a, b) => Date.parse(b.created_at || b.received_at || '') - Date.parse(a.created_at || a.received_at || ''))
        .slice(0, 5);

      if (emails) {
        emails.forEach(email => {
          events.push({
            id: email.id,
            type: 'email',
            direction: email.direction,
            timestamp: email.received_at || email.created_at,
            label: email.direction === 'inbound' ? 'Email reçu' : 'Email envoyé',
            preview: email.subject || 'Sans objet'
          });
        });
      }

      // Charger les 3 dernières interactions
      const interactions = (summary.interactions || [])
        .sort((a, b) => Date.parse(b.created_at || '') - Date.parse(a.created_at || ''))
        .slice(0, 5);

      if (interactions) {
        interactions.forEach(int => {
          const channelLabels: Record<string, string> = {
            call: int.direction === 'inbound' ? 'Appel reçu' : 'Appel passé',
            sms: int.direction === 'inbound' ? 'SMS reçu' : 'SMS envoyé',
            whatsapp: int.direction === 'inbound' ? 'WhatsApp reçu' : 'WhatsApp envoyé',
            note: 'Note ajoutée'
          };

          events.push({
            id: int.id,
            type: int.channel as any,
            direction: int.direction,
            timestamp: int.created_at,
            label: channelLabels[int.channel] || 'Interaction',
            preview: int.subject || int.content || int.notes || 'Pas de détails'
          });
        });
      }

      // Trier par date décroissante et garder les 3 plus récents
      events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setRecentEvents(events.slice(0, 3));
    } catch (error) {
      console.error('Error loading recent events:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: string, direction: string) => {
    const isInbound = direction === 'inbound';
    if (type === 'email') {
      return isInbound ? <ArrowDownLeft className="w-3 h-3 text-blue-600" /> : <ArrowUpRight className="w-3 h-3 text-green-600" />;
    }
    if (type === 'call') return <PhoneIcon className="w-3 h-3 text-orange-600" />;
    if (type === 'sms') return <MessageCircle className="w-3 h-3 text-purple-600" />;
    if (type === 'whatsapp') return <MessageCircle className="w-3 h-3 text-emerald-600" />;
    return <MessageSquare className="w-3 h-3 text-gray-600" />;
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "maintenant";
    if (diffMins < 60) return `${diffMins}min`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="text-blue-500" size={18} />
            <h3 className="text-sm font-bold text-gray-900">Timeline échanges</h3>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-all"
            title="Ouvrir en plein écran"
          >
            <Maximize2 size={14} className="text-gray-600" />
          </button>
        </div>

        <div className="space-y-2 mb-3">
          <div className="text-xs text-gray-600">
            <span className="font-medium text-gray-900">{messageCount}</span> interaction(s)
          </div>

          {loading ? (
            <div className="space-y-2">
              <div className="h-12 bg-gray-100 rounded-lg animate-pulse"></div>
              <div className="h-12 bg-gray-100 rounded-lg animate-pulse"></div>
            </div>
          ) : recentEvents.length > 0 ? (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {recentEvents.map(event => (
                <div
                  key={event.id}
                  className="flex items-start gap-2 p-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                  onClick={() => setShowModal(true)}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getIcon(event.type, event.direction)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold text-gray-900 truncate">
                        {event.label}
                      </span>
                      <span className="text-[10px] text-gray-500 whitespace-nowrap flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {formatDate(event.timestamp)}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-600 truncate mt-0.5">
                      {event.preview}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-gray-500 text-center py-3">
              Aucune interaction encore
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-200">
          <button
            onClick={onNewEmail}
            className="flex flex-col items-center gap-1 p-2 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all"
          >
            <Mail size={14} className="text-blue-600" />
            <span className="text-[10px] font-medium text-blue-700">Email</span>
          </button>
          <button
            onClick={onNewSMS}
            className="flex flex-col items-center gap-1 p-2 bg-purple-50 hover:bg-purple-100 rounded-lg transition-all"
          >
            <MessageCircle size={14} className="text-purple-600" />
            <span className="text-[10px] font-medium text-purple-700">SMS</span>
          </button>
          <button
            onClick={onNewWhatsApp}
            className="flex flex-col items-center gap-1 p-2 bg-green-50 hover:bg-green-100 rounded-lg transition-all"
          >
            <PhoneIcon size={14} className="text-green-600" />
            <span className="text-[10px] font-medium text-green-700">WhatsApp</span>
          </button>
        </div>
      </div>

      {/* Modal plein écran */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <MessageSquare className="text-blue-500" size={20} />
                Timeline des échanges
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-all"
              >
                <X size={20} className="text-gray-600" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <CommunicationTimeline
                leadId={leadId}
                leadEmail={leadEmail}
                leadPhone={leadPhone}
                onReply={onReply}
                onNewEmail={onNewEmail}
                onNewSMS={onNewSMS}
                onNewWhatsApp={onNewWhatsApp}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TimelineCard;
