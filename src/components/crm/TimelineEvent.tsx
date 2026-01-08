import React from 'react';
import {
  Clock,
  Mail,
  Phone,
  MessageSquare,
  FileText,
  CheckCircle,
  AlertCircle,
  CreditCard,
  User,
  Bot,
  Calendar
} from 'lucide-react';
import { TimelineEvent as TimelineEventType } from '@/lib/crm-pipeline';
import { cn } from '@/lib/utils';

interface TimelineEventProps {
  event: TimelineEventType;
  isLast?: boolean;
}

const EVENT_ICONS: Record<TimelineEventType['event_type'], React.ElementType> = {
  status_change: CheckCircle,
  note: MessageSquare,
  email_sent: Mail,
  email_received: Mail,
  call: Phone,
  meeting: Calendar,
  document_uploaded: FileText,
  ai_decision: Bot,
  payment: CreditCard
};

const EVENT_COLORS: Record<TimelineEventType['event_type'], string> = {
  status_change: 'bg-blue-100 text-blue-700 border-blue-200',
  note: 'bg-gray-100 text-gray-700 border-gray-200',
  email_sent: 'bg-purple-100 text-purple-700 border-purple-200',
  email_received: 'bg-green-100 text-green-700 border-green-200',
  call: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  meeting: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  document_uploaded: 'bg-orange-100 text-orange-700 border-orange-200',
  ai_decision: 'bg-pink-100 text-pink-700 border-pink-200',
  payment: 'bg-emerald-100 text-emerald-700 border-emerald-200'
};

export const TimelineEvent: React.FC<TimelineEventProps> = ({ event, isLast }) => {
  const Icon = EVENT_ICONS[event.event_type];
  const colorClass = EVENT_COLORS[event.event_type];

  return (
    <div className="flex gap-4 relative">
      {!isLast && (
        <div className="absolute left-5 top-10 bottom-0 w-0.5 bg-gray-200" />
      )}

      <div className={cn('w-10 h-10 rounded-full border-2 flex items-center justify-center flex-shrink-0 bg-white z-10', colorClass)}>
        <Icon size={18} />
      </div>

      <div className="flex-1 pb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-start justify-between mb-2">
            <h4 className="font-semibold text-gray-900 text-sm">{event.title}</h4>
            <div className="flex items-center text-xs text-gray-500 ml-2">
              <Clock size={12} className="mr-1" />
              {new Date(event.created_at).toLocaleString('fr-FR', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </div>

          {event.description && (
            <p className="text-sm text-gray-600 mb-2 whitespace-pre-wrap">
              {event.description}
            </p>
          )}

          {event.metadata && Object.keys(event.metadata).length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(event.metadata).map(([key, value]) => (
                  <div key={key}>
                    <span className="text-gray-500">{key}:</span>{' '}
                    <span className="text-gray-900 font-medium">
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {event.created_by && (
            <div className="mt-2 flex items-center text-xs text-gray-500">
              <User size={12} className="mr-1" />
              Par {event.created_by}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
