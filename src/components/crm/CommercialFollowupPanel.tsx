import React, { useState } from 'react';
import {
  CheckCircle,
  Clock,
  Send,
  Phone,
  Mail,
  MessageSquare,
  FileText,
  AlertCircle,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Loader2
} from 'lucide-react';
import { getWorkflowStage, getWorkflowPhase, QuickAction } from '@/lib/commercial-workflow';
import { PipelineStatus } from '@/lib/crm-pipeline';
import { cn } from '@/lib/utils';

interface CommercialFollowupPanelProps {
  leadId: string;
  currentStatus: PipelineStatus;
  onAction: (action: QuickAction, additionalData?: any) => Promise<void>;
  disabled?: boolean;
}

export function CommercialFollowupPanel({
  leadId,
  currentStatus,
  onAction,
  disabled = false
}: CommercialFollowupPanelProps) {
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);
  const [showTips, setShowTips] = useState(false);
  const [noteInput, setNoteInput] = useState('');
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<QuickAction | null>(null);

  const workflowStage = getWorkflowStage(currentStatus);
  const phase = getWorkflowPhase(currentStatus);

  if (!workflowStage) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">Aucun workflow défini pour ce statut</p>
      </div>
    );
  }

  const handleActionClick = async (action: QuickAction) => {
    if (disabled) return;

    if (action.requiresNote || action.requiresInput) {
      setPendingAction(action);
      setShowNoteModal(true);
      return;
    }

    await executeAction(action);
  };

  const executeAction = async (action: QuickAction, note?: string) => {
    try {
      setLoadingActionId(action.id);
      await onAction(action, { note });
      setShowNoteModal(false);
      setPendingAction(null);
      setNoteInput('');
    } catch (error) {
      console.error('Action failed:', error);
    } finally {
      setLoadingActionId(null);
    }
  };

  const getActionIcon = (action: QuickAction) => {
    if (loadingActionId === action.id) {
      return <Loader2 className="w-5 h-5 animate-spin" />;
    }

    switch (action.type) {
      case 'send_email':
        return <Mail className="w-5 h-5" />;
      case 'send_sms':
        return <MessageSquare className="w-5 h-5" />;
      case 'add_note':
        return <FileText className="w-5 h-5" />;
      case 'custom':
        return <Phone className="w-5 h-5" />;
      case 'status_change':
      default:
        return <span className="text-lg">{action.icon}</span>;
    }
  };

  const getActionButtonClass = (action: QuickAction) => {
    const baseClass = "flex items-center gap-3 w-full px-6 py-4 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed";

    switch (action.variant) {
      case 'success':
        return cn(baseClass, "bg-green-600 text-white hover:bg-green-700");
      case 'warning':
        return cn(baseClass, "bg-orange-500 text-white hover:bg-orange-600");
      case 'danger':
        return cn(baseClass, "bg-red-600 text-white hover:bg-red-700");
      case 'primary':
        return cn(baseClass, "bg-blue-600 text-white hover:bg-blue-700");
      case 'secondary':
      default:
        return cn(baseClass, "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300");
    }
  };

  const getPhaseColor = (phaseStr: string) => {
    if (phaseStr.includes('Qualification')) return 'blue';
    if (phaseStr.includes('Documentation')) return 'orange';
    if (phaseStr.includes('Devis')) return 'purple';
    if (phaseStr.includes('Conversion')) return 'green';
    if (phaseStr.includes('Client')) return 'emerald';
    if (phaseStr.includes('Perdu')) return 'gray';
    return 'gray';
  };

  const phaseColor = getPhaseColor(phase);

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Header avec phase et titre */}
      <div className={`bg-gradient-to-r from-${phaseColor}-600 to-${phaseColor}-700 p-6 text-white`}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`bg-white bg-opacity-20 rounded-lg px-3 py-1 text-sm font-semibold`}>
              {phase}
            </div>
            <Clock className="w-4 h-4 opacity-75" />
          </div>
          <button
            onClick={() => setShowTips(!showTips)}
            className="flex items-center gap-1 text-sm opacity-90 hover:opacity-100 transition-opacity"
          >
            <Lightbulb className="w-4 h-4" />
            <span>Conseils</span>
            {showTips ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
        <h2 className="text-2xl font-bold mb-2">{workflowStage.title}</h2>
        <p className="text-white text-opacity-90">{workflowStage.description}</p>
      </div>

      {/* Conseils (repliable) */}
      {showTips && workflowStage.tips && workflowStage.tips.length > 0 && (
        <div className="bg-yellow-50 border-b border-yellow-100 p-6">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-900 mb-3">💡 Conseils pour cette étape</h3>
              <ul className="space-y-2">
                {workflowStage.tips.map((tip, index) => (
                  <li key={index} className="text-sm text-yellow-800 flex items-start gap-2">
                    <span className="text-yellow-600 flex-shrink-0">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Actions contextuelles */}
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-blue-600" />
          Actions Disponibles
        </h3>

        {workflowStage.actions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Aucune action disponible pour ce statut</p>
          </div>
        ) : (
          <div className="space-y-3">
            {workflowStage.actions.map((action) => (
              <div key={action.id}>
                <button
                  onClick={() => handleActionClick(action)}
                  disabled={disabled || loadingActionId !== null}
                  className={getActionButtonClass(action)}
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white bg-opacity-20">
                    {getActionIcon(action)}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-semibold">{action.label}</div>
                    {action.description && (
                      <div className="text-sm opacity-90 mt-0.5">{action.description}</div>
                    )}
                  </div>
                  {action.requiresNote && (
                    <span className="text-xs opacity-75 bg-white bg-opacity-20 px-2 py-1 rounded">
                      Note requise
                    </span>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal pour note/input */}
      {showNoteModal && pendingAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <h3 className="text-xl font-bold mb-4">{pendingAction.label}</h3>

            {pendingAction.requiresNote && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Note ou commentaire
                  {pendingAction.nextStatus === 'CLIENT_LOST' ||
                   pendingAction.nextStatus === 'LOST_RECONTACT_SCHEDULED' ? (
                    <span className="text-red-600"> *</span>
                  ) : null}
                </label>
                <textarea
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="Expliquez la raison ou ajoutez un commentaire..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={4}
                  autoFocus
                />
              </div>
            )}

            {pendingAction.description && (
              <p className="text-sm text-gray-600 mb-4">{pendingAction.description}</p>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowNoteModal(false);
                  setPendingAction(null);
                  setNoteInput('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                disabled={loadingActionId !== null}
              >
                Annuler
              </button>
              <button
                onClick={() => executeAction(pendingAction, noteInput)}
                disabled={
                  loadingActionId !== null ||
                  (pendingAction.requiresNote &&
                   (pendingAction.nextStatus === 'CLIENT_LOST' ||
                    pendingAction.nextStatus === 'LOST_RECONTACT_SCHEDULED') &&
                   !noteInput.trim())
                }
                className={cn(
                  "px-6 py-2 rounded-lg font-medium flex items-center gap-2",
                  pendingAction.variant === 'danger'
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-blue-600 text-white hover:bg-blue-700",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {loadingActionId !== null ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Traitement...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Confirmer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
