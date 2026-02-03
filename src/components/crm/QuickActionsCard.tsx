import React, { useState } from 'react';
import {
  Mail,
  Phone,
  FileText,
  Zap,
  MessageSquare,
  Clock,
  DollarSign,
  Send,
  CheckCircle,
  Calendar,
  Sparkles
} from 'lucide-react';
import ContextualTooltip from '@/components/ContextualTooltip';
import { cn } from '@/lib/utils';

interface QuickActionsCardProps {
  onSendEmail: () => void;
  onCall: () => void;
  onRequestDocuments: () => void;
  onSendSMS?: () => void;
  onSendWhatsApp?: () => void;
  onScheduleReminder?: () => void;
  onSendQuote?: () => void;
  onScheduleMeeting?: () => void;
  leadStatus?: string;
  hasDocuments?: boolean;
  hasQuotes?: boolean;
}

const QuickActionsCard: React.FC<QuickActionsCardProps> = ({
  onSendEmail,
  onCall,
  onRequestDocuments,
  onSendSMS,
  onSendWhatsApp,
  onScheduleReminder,
  onSendQuote,
  onScheduleMeeting,
  leadStatus,
  hasDocuments = false,
  hasQuotes = false
}) => {
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);

  const actions = [
    {
      id: 'email',
      label: 'Envoyer Email',
      icon: Mail,
      color: 'bg-blue-600 hover:bg-blue-700',
      hoverColor: 'group-hover:scale-110',
      onClick: onSendEmail,
      tooltip: 'Envoyer un email au prospect',
      show: true
    },
    {
      id: 'call',
      label: 'Appeler',
      icon: Phone,
      color: 'bg-green-600 hover:bg-green-700',
      hoverColor: 'group-hover:rotate-12',
      onClick: onCall,
      tooltip: 'Appeler le prospect et logger l\'appel',
      show: true
    },
    {
      id: 'sms',
      label: 'Envoyer SMS',
      icon: MessageSquare,
      color: 'bg-teal-600 hover:bg-teal-700',
      hoverColor: 'group-hover:scale-110',
      onClick: onSendSMS,
      tooltip: 'Envoyer un SMS rapide',
      show: !!onSendSMS
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      icon: Send,
      color: 'bg-emerald-600 hover:bg-emerald-700',
      hoverColor: 'group-hover:translate-x-1',
      onClick: onSendWhatsApp,
      tooltip: 'Envoyer un message WhatsApp',
      show: !!onSendWhatsApp
    },
    {
      id: 'documents',
      label: 'Demander docs',
      icon: FileText,
      color: 'bg-orange-600 hover:bg-orange-700',
      hoverColor: 'group-hover:scale-110',
      onClick: onRequestDocuments,
      tooltip: 'Demander les documents manquants',
      show: true,
      badge: !hasDocuments ? '!' : undefined
    },
    {
      id: 'quote',
      label: 'Envoyer devis',
      icon: DollarSign,
      color: 'bg-violet-600 hover:bg-violet-700',
      hoverColor: 'group-hover:rotate-12',
      onClick: onSendQuote,
      tooltip: 'Envoyer un devis au prospect',
      show: !!onSendQuote && leadStatus !== 'nouveau_lead'
    },
    {
      id: 'reminder',
      label: 'Programmer rappel',
      icon: Clock,
      color: 'bg-amber-600 hover:bg-amber-700',
      hoverColor: 'group-hover:scale-110',
      onClick: onScheduleReminder,
      tooltip: 'Créer un rappel automatique',
      show: !!onScheduleReminder
    },
    {
      id: 'meeting',
      label: 'Rendez-vous',
      icon: Calendar,
      color: 'bg-pink-600 hover:bg-pink-700',
      hoverColor: 'group-hover:scale-110',
      onClick: onScheduleMeeting,
      tooltip: 'Planifier un rendez-vous',
      show: !!onScheduleMeeting
    }
  ];

  const visibleActions = actions.filter(action => action.show);

  return (
    <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
          <Zap className="text-white" size={16} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-900">Actions rapides</h3>
          <p className="text-xs text-gray-500">Gagnez du temps</p>
        </div>
        <Sparkles className="w-4 h-4 text-amber-500 ml-auto animate-pulse" />
      </div>

      <div className="space-y-2">
        {visibleActions.map((action) => {
          const Icon = action.icon;
          return (
            <ContextualTooltip key={action.id} content={action.tooltip} type="tip">
              <button
                onClick={action.onClick}
                onMouseEnter={() => setHoveredAction(action.id)}
                onMouseLeave={() => setHoveredAction(null)}
                className={cn(
                  "group w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-sm font-medium relative overflow-hidden",
                  action.color,
                  "text-white shadow-sm hover:shadow-md"
                )}
              >
                <div className={cn(
                  "transition-transform duration-200",
                  action.hoverColor
                )}>
                  <Icon size={16} />
                </div>
                <span className="flex-1 text-left">{action.label}</span>

                {action.badge && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                    {action.badge}
                  </span>
                )}

                {hoveredAction === action.id && (
                  <CheckCircle size={14} className="animate-in fade-in zoom-in" />
                )}
              </button>
            </ContextualTooltip>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">
            {visibleActions.length} actions disponibles
          </span>
          {hasDocuments && (
            <span className="flex items-center gap-1 text-green-600">
              <CheckCircle size={12} />
              Documents OK
            </span>
          )}
          {hasQuotes && (
            <span className="flex items-center gap-1 text-blue-600">
              <CheckCircle size={12} />
              Devis envoyés
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuickActionsCard;
