import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Mail,
  Phone,
  MessageSquare,
  FileText,
  Users,
  DollarSign,
  Calendar,
  Settings,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ElementType;
  action: () => void;
  shortcut?: string;
  color?: string;
}

interface QuickActionsMenuProps {
  context?: 'lead' | 'contract' | 'global';
  leadId?: string;
  contractId?: string;
}

export default function QuickActionsMenu({ context = 'global', leadId, contractId }: QuickActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const getActions = (): QuickAction[] => {
    const baseActions: QuickAction[] = [
      {
        id: 'new-lead',
        label: 'Créer un lead',
        icon: Plus,
        action: () => navigate('/backoffice/manual-lead'),
        shortcut: 'Ctrl+N',
        color: 'text-blue-600'
      },
      {
        id: 'search',
        label: 'Rechercher',
        icon: Search,
        action: () => {
          setIsOpen(false);
          const searchButton = document.querySelector('[data-search-trigger]') as HTMLElement;
          searchButton?.click();
        },
        shortcut: 'Ctrl+K',
        color: 'text-purple-600'
      }
    ];

    if (context === 'lead' && leadId) {
      return [
        {
          id: 'send-email',
          label: 'Envoyer un email',
          icon: Mail,
          action: () => {
            navigate(`/backoffice/crm/lead/${leadId}?action=email`);
            setIsOpen(false);
          },
          color: 'text-blue-600'
        },
        {
          id: 'call',
          label: 'Logger un appel',
          icon: Phone,
          action: () => {
            navigate(`/backoffice/crm/lead/${leadId}?action=call`);
            setIsOpen(false);
          },
          color: 'text-green-600'
        },
        {
          id: 'send-sms',
          label: 'Envoyer un SMS',
          icon: MessageSquare,
          action: () => {
            navigate(`/backoffice/crm/lead/${leadId}?action=sms`);
            setIsOpen(false);
          },
          color: 'text-cyan-600'
        },
        {
          id: 'request-docs',
          label: 'Demander documents',
          icon: FileText,
          action: () => {
            navigate(`/backoffice/crm/lead/${leadId}?action=request-docs`);
            setIsOpen(false);
          },
          color: 'text-amber-600'
        },
        {
          id: 'create-quote',
          label: 'Créer un devis',
          icon: DollarSign,
          action: () => {
            navigate(`/backoffice/crm/lead/${leadId}?tab=devis&action=create`);
            setIsOpen(false);
          },
          color: 'text-emerald-600'
        },
        ...baseActions
      ];
    }

    if (context === 'contract' && contractId) {
      return [
        {
          id: 'send-email',
          label: 'Contacter le client',
          icon: Mail,
          action: () => {
            navigate(`/backoffice/crm-gestion/contrat/${contractId}?action=email`);
            setIsOpen(false);
          },
          color: 'text-blue-600'
        },
        {
          id: 'view-docs',
          label: 'Voir documents',
          icon: FileText,
          action: () => {
            navigate(`/backoffice/crm-gestion/contrat/${contractId}?tab=documents`);
            setIsOpen(false);
          },
          color: 'text-purple-600'
        },
        {
          id: 'schedule-renewal',
          label: 'Planifier renouvellement',
          icon: Calendar,
          action: () => {
            navigate(`/backoffice/crm-gestion/contrat/${contractId}?action=renewal`);
            setIsOpen(false);
          },
          color: 'text-amber-600'
        },
        ...baseActions
      ];
    }

    return [
      ...baseActions,
      {
        id: 'pipeline',
        label: 'Pipeline Kanban',
        icon: Users,
        action: () => navigate('/backoffice/crm-killer/pipeline'),
        shortcut: 'Ctrl+P',
        color: 'text-cyan-600'
      },
      {
        id: 'quote-queue',
        label: 'File de devis',
        icon: DollarSign,
        action: () => navigate('/backoffice/quote-queue'),
        shortcut: 'Ctrl+Q',
        color: 'text-emerald-600'
      },
      {
        id: 'inbox',
        label: 'Inbox',
        icon: Mail,
        action: () => navigate('/backoffice/crm-killer/inbox'),
        shortcut: 'Ctrl+I',
        color: 'text-blue-600'
      },
      {
        id: 'settings',
        label: 'Paramètres',
        icon: Settings,
        action: () => navigate('/backoffice/settings'),
        color: 'text-gray-600'
      }
    ];
  };

  const actions = getActions();

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
        title="Actions rapides"
      >
        <Zap className="w-4 h-4" />
        <span>Actions</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">Actions Rapides</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {context === 'lead' && 'Actions pour ce lead'}
              {context === 'contract' && 'Actions pour ce contrat'}
              {context === 'global' && 'Actions générales'}
            </p>
          </div>

          <div className="py-2">
            {actions.map(action => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={action.action}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left group"
                >
                  <div className={cn(
                    'p-2 rounded-lg bg-gray-100 group-hover:bg-gray-200 transition-colors',
                    action.color
                  )}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{action.label}</p>
                    {action.shortcut && (
                      <p className="text-xs text-gray-500">{action.shortcut}</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="p-3 bg-gray-50 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Appuyez sur <kbd className="px-1 py-0.5 bg-white border border-gray-300 rounded text-xs">ESC</kbd> pour fermer
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
