import React from 'react';
import {
  User,
  FileText,
  Calculator,
  PenTool,
  MessageSquare,
  History,
  CheckCircle,
  AlertCircle,
  Bot,
  Inbox
} from 'lucide-react';

export type WorkflowTab = 'overview' | 'documents' | 'quotes' | 'contract' | 'history';

interface TabConfig {
  id: WorkflowTab;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  status?: 'complete' | 'pending' | 'warning';
}

interface LeadWorkflowTabsProps {
  activeTab: WorkflowTab;
  onTabChange: (tab: WorkflowTab) => void;
  stats: {
    documentsComplete: boolean;
    documentsMissing: number;
    basketCount?: number;
    quotesCount: number;
    hasContract: boolean;
    unreadMessages: number;
    totalInteractions: number;
    pendingAISuggestions?: number;
    scheduledFollowUps?: number;
  };
}

export const LeadWorkflowTabs: React.FC<LeadWorkflowTabsProps> = ({
  activeTab,
  onTabChange,
  stats
}) => {
  const tabs: TabConfig[] = [
    {
      id: 'overview',
      label: 'Vue d\'ensemble',
      icon: <User className="w-4 h-4" />
    },
    {
      id: 'documents',
      label: 'Documents & Pièces',
      icon: <FileText className="w-4 h-4" />,
      badge: stats.documentsMissing > 0 ? stats.documentsMissing : (stats.basketCount || 0) > 0 ? stats.basketCount : undefined,
      status: stats.documentsComplete ? 'complete' : stats.documentsMissing > 0 ? 'warning' : 'pending'
    },
    {
      id: 'quotes',
      label: 'Devis & Tarifs',
      icon: <Calculator className="w-4 h-4" />,
      badge: stats.quotesCount > 0 ? stats.quotesCount : undefined,
      status: stats.quotesCount > 0 ? 'complete' : 'pending'
    },
    {
      id: 'contract',
      label: 'Contrat',
      icon: <PenTool className="w-4 h-4" />,
      status: stats.hasContract ? 'complete' : 'pending'
    },
    {
      id: 'history',
      label: 'Historique & Communication',
      icon: <History className="w-4 h-4" />,
      badge: stats.totalInteractions > 0 ? stats.totalInteractions : undefined
    }
  ];

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-6">
        <nav className="flex gap-0.5 overflow-x-auto" aria-label="Workflow tabs">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`relative flex items-center gap-2 px-4 py-3.5 text-sm font-medium transition-all whitespace-nowrap group ${
                  isActive
                    ? 'text-gray-900'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50/70'
                }`}
              >
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-yellow-500 to-amber-400 rounded-t" />
                )}
                <span className={`transition-colors ${isActive ? 'text-amber-600' : 'text-gray-400 group-hover:text-gray-600'}`}>
                  {tab.icon}
                </span>
                <span>{tab.label}</span>

                {tab.status === 'complete' && (
                  <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                )}

                {tab.status === 'warning' && (
                  <AlertCircle className="w-3.5 h-3.5 text-orange-500" />
                )}

                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className={`px-1.5 py-0.5 text-[10px] rounded-full font-bold ${
                    tab.status === 'warning'
                      ? 'bg-orange-100 text-orange-700'
                      : tab.status === 'complete'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default LeadWorkflowTabs;
