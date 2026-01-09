import React from 'react';
import { Mail, MessageSquare, Phone, CheckCheck, Clock, AlertCircle } from 'lucide-react';
import { CommunicationMessage, InboxMessage } from '@/lib/crm-channel-engine';
import { cn } from '@/lib/utils';

interface MessagePreviewProps {
  message: CommunicationMessage | InboxMessage | any;
  onClick?: () => void;
  isSelected?: boolean;
}

const CHANNEL_ICONS = {
  email: Mail,
  sms: MessageSquare,
  whatsapp: MessageSquare,
  phone: Phone,
  meeting: Phone
};

const STATUS_COLORS = {
  queued: 'text-gray-500',
  sent: 'text-blue-500',
  delivered: 'text-green-500',
  read: 'text-green-600',
  failed: 'text-red-500',
  bounced: 'text-orange-500'
};

const STATUS_ICONS = {
  queued: Clock,
  sent: CheckCheck,
  delivered: CheckCheck,
  read: CheckCheck,
  failed: AlertCircle,
  bounced: AlertCircle
};

export const MessagePreview: React.FC<MessagePreviewProps> = ({
  message,
  onClick,
  isSelected
}) => {
  const ChannelIcon = CHANNEL_ICONS[message.channel] || Mail;

  // Gestion des deux types de messages (CommunicationMessage et InboxMessage)
  const isInboxMessage = 'lead_name' in message;
  const statusForIcon = isInboxMessage ? 'delivered' : message.status;
  const StatusIcon = STATUS_ICONS[statusForIcon] || Clock;
  const statusColor = STATUS_COLORS[statusForIcon] || 'text-gray-500';

  const displayName = isInboxMessage
    ? message.lead_name
    : (message.direction === 'outbound' ? message.to : message.from);

  const displayDirection = isInboxMessage
    ? (message.direction === 'outbound' ? 'Envoyé' : 'Reçu')
    : (message.direction === 'outbound' ? 'Envoyé' : 'Reçu');

  const displayBody = isInboxMessage
    ? message.snippet
    : message.body;

  const displayTime = isInboxMessage
    ? message.received_at
    : message.created_at;

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white border-l-4 p-4 cursor-pointer hover:bg-gray-50 transition-colors',
        isSelected ? 'border-l-blue-600 bg-blue-50' : 'border-l-transparent',
        (!isInboxMessage && message.direction === 'inbound' && !isSelected) && 'border-l-green-400',
        (!isInboxMessage && message.direction === 'outbound' && !isSelected) && 'border-l-blue-300',
        (isInboxMessage && message.direction === 'inbound' && !isSelected) && 'border-l-green-400',
        (isInboxMessage && message.direction === 'outbound' && !isSelected) && 'border-l-blue-300'
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center',
            (isInboxMessage && message.direction === 'outbound')
              ? 'bg-blue-100 text-blue-700'
              : (isInboxMessage && message.direction === 'inbound')
              ? 'bg-green-100 text-green-700'
              : (!isInboxMessage && message.direction === 'outbound')
              ? 'bg-blue-100 text-blue-700'
              : 'bg-green-100 text-green-700'
          )}>
            <ChannelIcon size={16} />
          </div>
          <div>
            <div className="font-semibold text-sm text-gray-900">
              {displayName}
            </div>
            <div className="text-xs text-gray-500">
              {displayDirection}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className={cn('flex items-center gap-1 text-xs', statusColor)}>
            <StatusIcon size={12} />
            <span className="capitalize">{isInboxMessage ? message.status : message.status}</span>
          </div>
        </div>
      </div>

      {message.subject && (
        <div className="font-medium text-sm text-gray-900 mb-1 line-clamp-1">
          {message.subject}
        </div>
      )}

      <div className="text-sm text-gray-600 line-clamp-2">
        {displayBody}
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
        <div>{new Date(displayTime).toLocaleString('fr-FR')}</div>
        <div className="flex items-center gap-3">
          {!isInboxMessage && message.opened_at && (
            <span className="text-green-600">Ouvert</span>
          )}
          {!isInboxMessage && message.clicked_at && (
            <span className="text-blue-600">Cliqué</span>
          )}
          {!isInboxMessage && message.replied_at && (
            <span className="text-purple-600">Répondu</span>
          )}
          {isInboxMessage && message.sentiment && (
            <span className={cn(
              'px-2 py-0.5 rounded-full text-xs font-medium',
              message.sentiment === 'positive' && 'bg-green-100 text-green-700',
              message.sentiment === 'negative' && 'bg-red-100 text-red-700',
              message.sentiment === 'neutral' && 'bg-gray-100 text-gray-700'
            )}>
              {message.sentiment}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
