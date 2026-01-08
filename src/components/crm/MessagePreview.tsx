import React from 'react';
import { Mail, MessageSquare, Phone, CheckCheck, Clock, AlertCircle } from 'lucide-react';
import { CommunicationMessage } from '@/lib/crm-channel-engine';
import { cn } from '@/lib/utils';

interface MessagePreviewProps {
  message: CommunicationMessage;
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
  const ChannelIcon = CHANNEL_ICONS[message.channel];
  const StatusIcon = STATUS_ICONS[message.status];
  const statusColor = STATUS_COLORS[message.status];

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white border-l-4 p-4 cursor-pointer hover:bg-gray-50 transition-colors',
        isSelected ? 'border-l-blue-600 bg-blue-50' : 'border-l-transparent',
        message.direction === 'inbound' && !isSelected && 'border-l-green-400'
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center',
            message.direction === 'outbound' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
          )}>
            <ChannelIcon size={16} />
          </div>
          <div>
            <div className="font-semibold text-sm text-gray-900">
              {message.direction === 'outbound' ? message.to : message.from}
            </div>
            <div className="text-xs text-gray-500">
              {message.direction === 'outbound' ? 'Envoyé' : 'Reçu'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className={cn('flex items-center gap-1 text-xs', statusColor)}>
            <StatusIcon size={12} />
            <span className="capitalize">{message.status}</span>
          </div>
        </div>
      </div>

      {message.subject && (
        <div className="font-medium text-sm text-gray-900 mb-1 line-clamp-1">
          {message.subject}
        </div>
      )}

      <div className="text-sm text-gray-600 line-clamp-2">
        {message.body}
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
        <div>{new Date(message.created_at).toLocaleString('fr-FR')}</div>
        <div className="flex items-center gap-3">
          {message.opened_at && (
            <span className="text-green-600">Ouvert</span>
          )}
          {message.clicked_at && (
            <span className="text-blue-600">Cliqué</span>
          )}
          {message.replied_at && (
            <span className="text-purple-600">Répondu</span>
          )}
        </div>
      </div>
    </div>
  );
};
