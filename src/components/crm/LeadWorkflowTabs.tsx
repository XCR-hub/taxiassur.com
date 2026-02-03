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
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6">
        <nav className="flex gap-1 overflow-x-auto" aria-label="Workflow tabs">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                  isActive
                    ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <span className={isActive ? 'text-blue-600' : 'text-gray-400'}>
                  {tab.icon}
                </span>
                <span>{tab.label}</span>

                {tab.status === 'complete' && (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                )}

                {tab.status === 'warning' && (
                  <AlertCircle className="w-4 h-4 text-orange-500" />
                )}

                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className={`px-2 py-0.5 text-xs rounded-full font-semibold ${
                    tab.status === 'warning'
                      ? 'bg-orange-100 text-orange-700'
                      : tab.status === 'complete'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-blue-100 text-blue-700'
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
