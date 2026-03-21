import { useState, useEffect } from 'react';
import { toast } from '@/lib/toast';
import { Mail, Phone, Check, ChevronRight, Clock, FileText, AlertCircle, Send, X, Calendar, MessageSquare, CheckCircle2, XCircle, CreditCard as Edit3 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { DocumentValidationWithReasons } from './DocumentValidationWithReasons';

interface WorkflowStep {
  step_number: number;
  step_key: string;
  step_title: string;
  step_description: string;
  is_completed: boolean;
  last_action_at: string | null;
}

interface CallLog {
  call_date: string;
  call_status: string;
  duration_minutes: number;
  call_notes: string;
  call_result: string;
  next_action: string;
}

interface StepByStepWorkflowProps {
  leadId: string;
  leadEmail?: string;
  leadPhone?: string;
  onStepCompleted?: () => void;
}

export function StepByStepWorkflow({ leadId, leadEmail, leadPhone, onStepCompleted }: StepByStepWorkflowProps) {
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [currentStep, setCurrentStep] = useState<WorkflowStep | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCallModal, setShowCallModal] = useState(false);
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [callHistory, setCallHistory] = useState<CallLog[]>([]);
  const [showCallHistory, setShowCallHistory] = useState(false);

  // Call form
  const [callForm, setCallForm] = useState({
    status: 'answered',
    duration: 5,
    notes: '',
    result: 'qualified',
    nextAction: '',
    nextActionDate: ''
  });

  useEffect(() => {
    loadWorkflowSteps();
    loadCallHistory();
  }, [leadId]);

  const loadWorkflowSteps = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading workflow steps for lead:', leadId);

      const { data, error } = await supabase
        .rpc('get_lead_current_workflow_step', { p_lead_id: leadId });

      if (error) {
        console.error('❌ RPC error:', error);
        throw error;
      }

      console.log('✅ Workflow steps loaded:', data);
      setSteps(data || []);

      // Find first uncompleted step
      const firstUncompleted = data?.find((s: WorkflowStep) => !s.is_completed);
      const currentStepToSet = firstUncompleted || data?.[data.length - 1] || null;
      console.log('📍 Current step:', currentStepToSet);
      setCurrentStep(currentStepToSet);
    } catch (err) {
      console.error('❌ Error loading workflow steps:', err);
      logger.error('Error loading workflow steps:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCallHistory = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_lead_call_history', { p_lead_id: leadId });

      if (error) throw error;
      setCallHistory(data || []);
    } catch (err) {
      logger.error('Error loading call history:', err);
    }
  };

  const handleCallSubmit = async () => {
    if (!callForm.notes.trim()) {
      toast.warning('Les notes de l\'appel sont obligatoires');
      return;
    }

    try {
      // Save call log
      const { data: { user } } = await supabase.auth.getUser();

      const { error: callError } = await supabase
        .from('crm_call_logs')
        .insert({
          lead_id: leadId,
          call_status: callForm.status,
          duration_minutes: callForm.duration,
          call_notes: callForm.notes,
          call_result: callForm.result,
          next_action: callForm.nextAction,
          next_action_date: callForm.nextActionDate || null,
          created_by: user?.id
        });

      if (callError) throw callError;

      // Mark step as completed
      const { error: actionError } = await supabase
        .from('crm_workflow_step_actions')
        .insert({
          lead_id: leadId,
          step_key: currentStep?.step_key,
          action_type: 'call',
          action_data: callForm,
          notes: callForm.notes,
          completed_by: user?.id
        });

      if (actionError) throw actionError;

      // Add interaction to timeline
      await supabase.from('crm_interactions').insert({
        lead_id: leadId,
        type: 'call',
        direction: 'outbound',
        subject: `Appel - ${callForm.status}`,
        content: callForm.notes,
        created_by: user?.id
      });

      setShowCallModal(false);
      setCallForm({
        status: 'answered',
        duration: 5,
        notes: '',
        result: 'qualified',
        nextAction: '',
        nextActionDate: ''
      });

      await loadWorkflowSteps();
      await loadCallHistory();
      onStepCompleted?.();
    } catch (err) {
      logger.error('Error saving call:', err);
      toast.error('Erreur lors de l\'enregistrement de l\'appel');
    }
  };

  const handleSendQualificationEmail = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Mark step as completed
      await supabase.from('crm_workflow_step_actions').insert({
        lead_id: leadId,
        step_key: currentStep?.step_key,
        action_type: 'email',
        action_data: { type: 'qualification', recipient: leadEmail },
        completed_by: user?.id
      });

      // Send email via edge function
      await supabase.functions.invoke('send-crm-email', {
        body: {
          to: leadEmail,
          template: 'qualification',
          leadId: leadId
        }
      });

      // Add to timeline
      await supabase.from('crm_interactions').insert({
        lead_id: leadId,
        type: 'email',
        direction: 'outbound',
        subject: 'Email de qualification envoyé',
        content: `Email de qualification envoyé à ${leadEmail}`,
        created_by: user?.id
      });

      await loadWorkflowSteps();
      onStepCompleted?.();
    } catch (err) {
      logger.error('Error sending email:', err);
      toast.error('Erreur lors de l\'envoi de l\'email');
    }
  };

  const handleSendDocumentRequest = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Mark step as completed
      await supabase.from('crm_workflow_step_actions').insert({
        lead_id: leadId,
        step_key: currentStep?.step_key,
        action_type: 'email',
        action_data: { type: 'document_request', recipient: leadEmail },
        completed_by: user?.id
      });

      // Send document request email
      console.log('[WORKFLOW] Sending document request email...');
      const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-intelligent-document-request', {
        body: {
          lead_id: leadId
        }
      });

      console.log('[WORKFLOW] Email result:', emailResult);
      console.log('[WORKFLOW] Email error:', emailError);

      // In development (bolt.new), email sending may fail due to missing API keys
      // This is expected and normal - emails will work in production
      const isDevelopment = window.location.hostname.includes('bolt.new') ||
                           window.location.hostname.includes('localhost') ||
                           window.location.hostname.includes('webcontainer');

      if (emailError || !emailResult?.success) {
        const errorMsg = emailError?.message || emailResult?.error || 'Email non envoyé';
        const errorDetails = emailResult?.details || emailError?.details || '';
        const fullError = errorDetails ? `${errorMsg} - ${errorDetails}` : errorMsg;

        console.error('[WORKFLOW] Email error details:', fullError);

        if (isDevelopment) {
          console.warn('[DEV MODE] Email envoi simulé (clés API non configurées dans bolt.new):', fullError);
          toast.error(`[DEV] Email simulé - En production cela fonctionnera.\nErreur: ${fullError}`);
          // Continue anyway in development
        } else {
          throw new Error(fullError);
        }
      }

      // Add to timeline
      const timelineNote = isDevelopment
        ? `[DEV] Simulation d'envoi d'email de demande de documents à ${leadEmail}`
        : `Email de demande de documents envoyé à ${leadEmail} avec lien vers l'espace prospect`;

      await supabase.from('crm_interactions').insert({
        lead_id: leadId,
        type: 'email',
        direction: 'outbound',
        subject: isDevelopment ? '[DEV] Demande de documents (simulée)' : 'Demande de documents envoyée',
        content: timelineNote,
        created_by: user?.id
      });

      if (isDevelopment) {
        toast.success('Mode développement: Email simulé avec succès.\n\nEn production, un vrai email sera envoyé via Brevo API.');
      }

      setShowDocumentsModal(true);
      await loadWorkflowSteps();
      onStepCompleted?.();
    } catch (err) {
      logger.error('Error sending document request:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      toast.error(`Erreur lors de l'envoi de la demande de documents: ${errorMessage}`);
    }
  };

  const handleMarkAsQualified = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      await supabase.from('crm_workflow_step_actions').insert({
        lead_id: leadId,
        step_key: currentStep?.step_key,
        action_type: 'manual',
        notes: 'Marqué comme qualifié manuellement',
        completed_by: user?.id
      });

      await supabase.from('crm_interactions').insert({
        lead_id: leadId,
        type: 'note',
        subject: 'Besoin qualifié',
        content: 'Lead marqué comme qualifié manuellement',
        created_by: user?.id
      });

      await loadWorkflowSteps();
      onStepCompleted?.();
    } catch (err) {
      logger.error('Error marking as qualified:', err);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-800 rounded w-1/3"></div>
          <div className="h-24 bg-gray-800 rounded"></div>
        </div>
      </div>
    );
  }

  const completedSteps = steps.filter(s => s.is_completed).length;
  const progress = steps.length > 0 ? Math.round((completedSteps / steps.length) * 100) : 0;

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
      {/* Header with Progress */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">Workflow Commercial Guidé</h3>
          <div className="text-right">
            <div className="text-3xl font-bold text-white">{progress}%</div>
            <div className="text-sm text-blue-100">
              Étape {currentStep?.step_number || 0} sur {steps.length}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-blue-900/50 rounded-full h-3 overflow-hidden">
          <div
            className="h-full bg-white transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Steps Stepper */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.step_key} className="flex items-center">
              <div className={`flex flex-col items-center ${
                step.is_completed ? 'opacity-100' :
                step.step_number === currentStep?.step_number ? 'opacity-100' :
                'opacity-40'
              }`}>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
                  step.is_completed ? 'bg-green-500' :
                  step.step_number === currentStep?.step_number ? 'bg-blue-500' :
                  'bg-gray-700'
                }`}>
                  {step.is_completed ? (
                    <Check className="w-6 h-6 text-white" />
                  ) : (
                    <span className="text-white font-bold">{step.step_number}</span>
                  )}
                </div>
                <span className={`text-xs text-center max-w-[100px] ${
                  step.step_number === currentStep?.step_number ? 'text-white font-medium' : 'text-gray-400'
                }`}>
                  {step.step_title}
                </span>
              </div>

              {index < steps.length - 1 && (
                <ChevronRight className="w-6 h-6 text-gray-600 mx-2" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Current Step Actions */}
      {currentStep && !currentStep.is_completed && (
        <div className="p-6">
          <div className="mb-6">
            <h4 className="text-lg font-bold text-white mb-2">
              Étape {currentStep.step_number}: {currentStep.step_title}
            </h4>
            <p className="text-gray-400 text-sm">
              {currentStep.step_description}
            </p>
          </div>

          {/* Step 1: Need Qualified */}
          {currentStep.step_key === 'need_qualified' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-400 mb-4">
                Vous devez effectuer au moins une action pour valider cette étape:
              </p>

              <button
                onClick={() => setShowCallModal(true)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-lg flex items-center gap-3 transition-colors"
              >
                <Phone className="w-5 h-5" />
                <div className="flex-1 text-left">
                  <div className="font-medium">Appeler le prospect</div>
                  <div className="text-xs text-blue-200">
                    Enregistrer l'appel avec des notes détaillées
                  </div>
                </div>
              </button>

              <button
                onClick={handleSendQualificationEmail}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white px-6 py-4 rounded-lg flex items-center gap-3 transition-colors"
              >
                <Mail className="w-5 h-5" />
                <div className="flex-1 text-left">
                  <div className="font-medium">Envoyer email de qualification</div>
                  <div className="text-xs text-purple-200">
                    Email automatique pour comprendre le besoin
                  </div>
                </div>
              </button>

              <button
                onClick={handleMarkAsQualified}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white px-6 py-4 rounded-lg flex items-center gap-3 transition-colors"
              >
                <CheckCircle2 className="w-5 h-5" />
                <div className="flex-1 text-left">
                  <div className="font-medium">Marquer comme qualifié</div>
                  <div className="text-xs text-gray-300">
                    Si la qualification a déjà été faite autrement
                  </div>
                </div>
              </button>

              {callHistory.length > 0 && (
                <button
                  onClick={() => setShowCallHistory(!showCallHistory)}
                  className="w-full bg-gray-800 hover:bg-gray-750 text-gray-300 px-4 py-3 rounded-lg flex items-center gap-2 text-sm transition-colors mt-4"
                >
                  <MessageSquare className="w-4 h-4" />
                  Voir l'historique des appels ({callHistory.length})
                </button>
              )}
            </div>
          )}

          {/* Step 2: Documents */}
          {currentStep.step_key === 'documents_collected' && (
            <div className="space-y-4">
              <button
                onClick={handleSendDocumentRequest}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-lg flex items-center gap-3 transition-colors"
              >
                <Mail className="w-5 h-5" />
                <div className="flex-1 text-left">
                  <div className="font-medium">Envoyer demande de documents</div>
                  <div className="text-xs text-blue-200">
                    Email avec lien vers l'espace prospect sécurisé
                  </div>
                </div>
              </button>

              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-gray-300">
                    <p className="font-medium text-white mb-1">Validation des documents</p>
                    <p>
                      Validez ou rejetez les documents uploadés par le prospect ci-dessous.
                      En cas de rejet avec motif, un email automatique sera envoyé au prospect.
                    </p>
                  </div>
                </div>
              </div>

              <DocumentValidationWithReasons
                leadId={leadId}
                leadEmail={leadEmail}
                onValidationComplete={() => {
                  loadWorkflowSteps();
                  onStepCompleted?.();
                }}
              />
            </div>
          )}

          {/* Step 3: Quote Sent */}
          {currentStep.step_key === 'quote_sent' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-400 mb-4">
                Envoyez un devis personnalisé au prospect :
              </p>

              <button
                onClick={async () => {
                  try {
                    const { data: { user } } = await supabase.auth.getUser();

                    // Mark step as completed
                    await supabase.from('crm_workflow_step_actions').insert({
                      lead_id: leadId,
                      step_key: currentStep?.step_key,
                      action_type: 'email',
                      action_data: { type: 'quote', recipient: leadEmail },
                      completed_by: user?.id
                    });

                    // Send quote email via edge function
                    await supabase.functions.invoke('send-quote-email', {
                      body: { leadId: leadId, recipientEmail: leadEmail }
                    });

                    // Add to timeline
                    await supabase.from('crm_interactions').insert({
                      lead_id: leadId,
                      type: 'email',
                      direction: 'outbound',
                      subject: 'Devis envoyé',
                      content: `Devis personnalisé envoyé à ${leadEmail}`,
                      created_by: user?.id
                    });

                    await loadWorkflowSteps();
                    onStepCompleted?.();
                  } catch (err) {
                    logger.error('Error sending quote:', err);
                    toast.error('Erreur lors de l\'envoi du devis');
                  }
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-lg flex items-center gap-3 transition-colors"
              >
                <Mail className="w-5 h-5" />
                <div className="flex-1 text-left">
                  <div className="font-medium">Envoyer le devis par email</div>
                  <div className="text-xs text-blue-200">
                    Devis personnalisé basé sur les informations du lead
                  </div>
                </div>
              </button>

              <button
                onClick={async () => {
                  try {
                    const { data: { user } } = await supabase.auth.getUser();

                    await supabase.from('crm_workflow_step_actions').insert({
                      lead_id: leadId,
                      step_key: currentStep?.step_key,
                      action_type: 'manual',
                      notes: 'Devis envoyé manuellement',
                      completed_by: user?.id
                    });

                    await supabase.from('crm_interactions').insert({
                      lead_id: leadId,
                      type: 'note',
                      subject: 'Devis envoyé manuellement',
                      content: 'Le commercial a envoyé le devis via un autre canal',
                      created_by: user?.id
                    });

                    await loadWorkflowSteps();
                    onStepCompleted?.();
                  } catch (err) {
                    logger.error('Error marking quote sent:', err);
                  }
                }}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white px-6 py-4 rounded-lg flex items-center gap-3 transition-colors"
              >
                <CheckCircle2 className="w-5 h-5" />
                <div className="flex-1 text-left">
                  <div className="font-medium">Marquer comme envoyé</div>
                  <div className="text-xs text-gray-300">
                    Si le devis a déjà été envoyé autrement
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* Step 4: Objections Handled */}
          {currentStep.step_key === 'objections_handled' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-400 mb-4">
                Répondez aux questions et levez les objections du prospect :
              </p>

              <button
                onClick={() => setShowCallModal(true)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-lg flex items-center gap-3 transition-colors"
              >
                <Phone className="w-5 h-5" />
                <div className="flex-1 text-left">
                  <div className="font-medium">Appeler pour traiter les objections</div>
                  <div className="text-xs text-blue-200">
                    Discussion pour lever les freins et répondre aux questions
                  </div>
                </div>
              </button>

              <button
                onClick={async () => {
                  try {
                    const { data: { user } } = await supabase.auth.getUser();

                    await supabase.from('crm_workflow_step_actions').insert({
                      lead_id: leadId,
                      step_key: currentStep?.step_key,
                      action_type: 'email',
                      action_data: { type: 'objections_response', recipient: leadEmail },
                      completed_by: user?.id
                    });

                    await supabase.functions.invoke('send-crm-email', {
                      body: {
                        to: leadEmail,
                        template: 'objections_response',
                        leadId: leadId
                      }
                    });

                    await supabase.from('crm_interactions').insert({
                      lead_id: leadId,
                      type: 'email',
                      direction: 'outbound',
                      subject: 'Réponse aux objections',
                      content: `Email de réponse aux objections envoyé à ${leadEmail}`,
                      created_by: user?.id
                    });

                    await loadWorkflowSteps();
                    onStepCompleted?.();
                  } catch (err) {
                    logger.error('Error sending objections response:', err);
                    toast.error('Erreur lors de l\'envoi de l\'email');
                  }
                }}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white px-6 py-4 rounded-lg flex items-center gap-3 transition-colors"
              >
                <Mail className="w-5 h-5" />
                <div className="flex-1 text-left">
                  <div className="font-medium">Envoyer email de réponse</div>
                  <div className="text-xs text-purple-200">
                    Email automatique avec réponses aux objections courantes
                  </div>
                </div>
              </button>

              <button
                onClick={async () => {
                  try {
                    const { data: { user } } = await supabase.auth.getUser();

                    await supabase.from('crm_workflow_step_actions').insert({
                      lead_id: leadId,
                      step_key: currentStep?.step_key,
                      action_type: 'manual',
                      notes: 'Objections traitées manuellement',
                      completed_by: user?.id
                    });

                    await supabase.from('crm_interactions').insert({
                      lead_id: leadId,
                      type: 'note',
                      subject: 'Objections traitées',
                      content: 'Le commercial a traité les objections avec succès',
                      created_by: user?.id
                    });

                    await loadWorkflowSteps();
                    onStepCompleted?.();
                  } catch (err) {
                    logger.error('Error marking objections handled:', err);
                  }
                }}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white px-6 py-4 rounded-lg flex items-center gap-3 transition-colors"
              >
                <CheckCircle2 className="w-5 h-5" />
                <div className="flex-1 text-left">
                  <div className="font-medium">Marquer comme traité</div>
                  <div className="text-xs text-gray-300">
                    Si les objections ont déjà été levées
                  </div>
                </div>
              </button>

              {callHistory.length > 0 && (
                <button
                  onClick={() => setShowCallHistory(!showCallHistory)}
                  className="w-full bg-gray-800 hover:bg-gray-750 text-gray-300 px-4 py-3 rounded-lg flex items-center gap-2 text-sm transition-colors mt-4"
                >
                  <MessageSquare className="w-4 h-4" />
                  Voir l'historique des appels ({callHistory.length})
                </button>
              )}
            </div>
          )}

          {/* Step 5: Closing */}
          {currentStep.step_key === 'closing' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-400 mb-4">
                Finalisez la vente avec la signature et le paiement :
              </p>

              <button
                onClick={async () => {
                  try {
                    const { data: { user } } = await supabase.auth.getUser();

                    // Create contract
                    const { data: contract } = await supabase
                      .from('crm_contracts')
                      .insert({
                        lead_id: leadId,
                        status: 'pending_signature',
                        contract_data: { created_from_workflow: true }
                      })
                      .select()
                      .single();

                    // Send signature request
                    await supabase.functions.invoke('send-crm-email', {
                      body: {
                        to: leadEmail,
                        template: 'signature_request',
                        data: {
                          leadId: leadId,
                          contractId: contract?.id
                        }
                      }
                    });

                    await supabase.from('crm_interactions').insert({
                      lead_id: leadId,
                      type: 'email',
                      direction: 'outbound',
                      subject: 'Demande de signature envoyée',
                      content: `Email avec lien de signature envoyé à ${leadEmail}`,
                      created_by: user?.id
                    });

                    toast.success('Demande de signature envoyée avec succès !');
                  } catch (err) {
                    logger.error('Error sending signature request:', err);
                    toast.error('Erreur lors de l\'envoi de la demande de signature');
                  }
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-lg flex items-center gap-3 transition-colors"
              >
                <Send className="w-5 h-5" />
                <div className="flex-1 text-left">
                  <div className="font-medium">Envoyer demande de signature électronique</div>
                  <div className="text-xs text-blue-200">
                    Email avec lien vers l'espace de signature sécurisé
                  </div>
                </div>
              </button>

              <button
                onClick={async () => {
                  try {
                    const { data: { user } } = await supabase.auth.getUser();

                    // Update lead status to signed
                    await supabase
                      .from('crm_leads')
                      .update({ status: 'contrat_signe' })
                      .eq('id', leadId);

                    // Mark step as completed
                    await supabase.from('crm_workflow_step_actions').insert({
                      lead_id: leadId,
                      step_key: currentStep?.step_key,
                      action_type: 'manual',
                      notes: 'Contrat signé et paiement reçu',
                      completed_by: user?.id
                    });

                    await supabase.from('crm_interactions').insert({
                      lead_id: leadId,
                      type: 'note',
                      subject: 'Vente finalisée',
                      content: 'Contrat signé et paiement reçu - Client converti',
                      created_by: user?.id
                    });

                    await loadWorkflowSteps();
                    onStepCompleted?.();
                    toast.success('Félicitations ! La vente est finalisée.');
                  } catch (err) {
                    logger.error('Error finalizing sale:', err);
                  }
                }}
                className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-4 rounded-lg flex items-center gap-3 transition-colors"
              >
                <CheckCircle2 className="w-5 h-5" />
                <div className="flex-1 text-left">
                  <div className="font-medium">Marquer comme signé et payé</div>
                  <div className="text-xs text-green-200">
                    Le contrat est signé et le paiement est reçu
                  </div>
                </div>
              </button>

              <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4 mt-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-green-300">
                    <p className="font-medium text-green-400 mb-1">Dernière étape !</p>
                    <p>
                      Une fois cette étape validée, le lead sera automatiquement converti en client
                      et son statut passera à "Contrat signé".
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* All Steps Completed */}
      {currentStep?.is_completed && completedSteps === steps.length && (
        <div className="p-6">
          <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-6 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-3" />
            <h4 className="text-xl font-bold text-white mb-2">
              Toutes les étapes sont complétées !
            </h4>
            <p className="text-gray-400">
              Vous pouvez maintenant passer à la signature du contrat
            </p>
          </div>
        </div>
      )}

      {/* Call History Modal */}
      {showCallHistory && callHistory.length > 0 && (
        <div className="border-t border-gray-800 p-6 bg-gray-950">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Historique des appels
            </h4>
            <button
              onClick={() => setShowCallHistory(false)}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {callHistory.map((call, index) => (
              <div key={index} className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-400">
                      {new Date(call.call_date).toLocaleDateString('fr-FR')} à{' '}
                      {new Date(call.call_date).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${
                    call.call_status === 'answered' ? 'bg-green-900/30 text-green-400' :
                    call.call_status === 'voicemail' ? 'bg-yellow-900/30 text-yellow-400' :
                    'bg-red-900/30 text-red-400'
                  }`}>
                    {call.call_status}
                  </span>
                </div>

                <p className="text-sm text-gray-300 mb-2 whitespace-pre-wrap">
                  {call.call_notes}
                </p>

                {call.duration_minutes && (
                  <div className="text-xs text-gray-500">
                    Durée: {call.duration_minutes} minutes
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Call Modal */}
      {showCallModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl border border-gray-800 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-800 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Phone className="w-6 h-6" />
                Enregistrer un appel
              </h3>
              <button
                onClick={() => setShowCallModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Statut de l'appel *
                </label>
                <select
                  value={callForm.status}
                  onChange={(e) => setCallForm({ ...callForm, status: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                >
                  <option value="answered">Répondu</option>
                  <option value="no_answer">Pas de réponse</option>
                  <option value="voicemail">Messagerie</option>
                  <option value="busy">Occupé</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Durée (minutes)
                </label>
                <input
                  type="number"
                  value={callForm.duration}
                  onChange={(e) => setCallForm({ ...callForm, duration: parseInt(e.target.value) })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Notes de l'appel * (OBLIGATOIRE)
                </label>
                <textarea
                  value={callForm.notes}
                  onChange={(e) => setCallForm({ ...callForm, notes: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white h-32"
                  placeholder="Décrivez ce qui a été dit pendant l'appel, les besoins exprimés, les questions posées..."
                  required
                />
                <p className="text-xs text-gray-400 mt-1">
                  Ces notes seront consultables à chaque étape du workflow
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Résultat de l'appel
                </label>
                <select
                  value={callForm.result}
                  onChange={(e) => setCallForm({ ...callForm, result: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                >
                  <option value="qualified">Qualifié</option>
                  <option value="not_interested">Pas intéressé</option>
                  <option value="callback">Rappeler plus tard</option>
                  <option value="wrong_number">Mauvais numéro</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Prochaine action à prévoir
                </label>
                <input
                  type="text"
                  value={callForm.nextAction}
                  onChange={(e) => setCallForm({ ...callForm, nextAction: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                  placeholder="Ex: Envoyer le devis, Rappeler pour objections..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Date de la prochaine action
                </label>
                <input
                  type="date"
                  value={callForm.nextActionDate}
                  onChange={(e) => setCallForm({ ...callForm, nextActionDate: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-800 flex gap-3">
              <button
                onClick={handleCallSubmit}
                disabled={!callForm.notes.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Enregistrer l'appel
              </button>
              <button
                onClick={() => setShowCallModal(false)}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
