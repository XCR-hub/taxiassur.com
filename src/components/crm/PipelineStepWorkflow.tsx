import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Lightbulb,
  Clock,
  TrendingUp,
  Phone,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { CallDialog } from './CallDialog';

interface PipelineStage {
  id: string;
  name: string;
  display_order: number;
  avg_time_in_stage_days: string;
  conversion_rate_to_next: string;
  ai_tips: string[];
  is_active: boolean;
}

interface Lead {
  id: string;
  pipeline_stage_id: string;
  status: string;
  stage_entered_at: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  created_at: string;
}

interface PipelineStepWorkflowProps {
  leadId: string;
  onStageChanged?: () => void;
}

export const PipelineStepWorkflow: React.FC<PipelineStepWorkflowProps> = ({
  leadId,
  onStageChanged
}) => {
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [currentStage, setCurrentStage] = useState<PipelineStage | null>(null);
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState(false);
  const [showCallDialog, setShowCallDialog] = useState(false);
  const [showUrgencyAlert, setShowUrgencyAlert] = useState(false);

  useEffect(() => {
    loadData();
  }, [leadId]);

  const loadData = async () => {
    try {
      setLoading(true);

      const { data: stagesData, error: stagesError } = await supabase
        .from('crm_pipeline_stages')
        .select('*')
        .eq('is_active', true)
        .neq('name', 'Perdu')
        .order('display_order');

      if (stagesError) throw stagesError;

      setStages(stagesData || []);

      const { data: leadData, error: leadError } = await supabase
        .from('crm_leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (leadError) throw leadError;

      setLead(leadData);

      const current = stagesData?.find(s => s.id === leadData?.pipeline_stage_id);
      setCurrentStage(current || stagesData?.[0] || null);

      // Check if lead is new and needs urgent call
      if (current?.name === 'Nouveau Lead') {
        const leadAge = Date.now() - new Date(leadData.created_at).getTime();
        const minutesSinceCreation = leadAge / (1000 * 60);
        if (minutesSinceCreation < 15) {
          setShowUrgencyAlert(true);
        }
      }
    } catch (err) {
      logger.error('Error loading pipeline stages:', err);
    } finally {
      setLoading(false);
    }
  };

  const changeStage = async (newStageId: string, direction: 'forward' | 'backward') => {
    if (!lead) return;

    try {
      setChanging(true);

      const newStage = stages.find(s => s.id === newStageId);
      if (!newStage) return;

      const { error: updateError } = await supabase
        .from('crm_leads')
        .update({
          pipeline_stage_id: newStageId,
          stage_entered_at: new Date().toISOString()
        })
        .eq('id', leadId);

      if (updateError) throw updateError;

      const { data: { user } } = await supabase.auth.getUser();

      await supabase.from('crm_interactions').insert({
        lead_id: leadId,
        type: 'note',
        subject: `Changement d'étape ${direction === 'forward' ? 'vers' : 'retour à'}`,
        content: `Passage à l'étape "${newStage.name}" (${direction === 'forward' ? 'avancée' : 'retour en arrière'})`,
        created_by: user?.id
      });

      await loadData();
      onStageChanged?.();
    } catch (err) {
      logger.error('Error changing stage:', err);
      alert('Erreur lors du changement d\'étape');
    } finally {
      setChanging(false);
    }
  };

  const goToNextStage = () => {
    if (!currentStage) return;
    const currentIndex = stages.findIndex(s => s.id === currentStage.id);
    if (currentIndex < stages.length - 1) {
      changeStage(stages[currentIndex + 1].id, 'forward');
    }
  };

  const goToPreviousStage = () => {
    if (!currentStage) return;
    const currentIndex = stages.findIndex(s => s.id === currentStage.id);
    if (currentIndex > 0) {
      changeStage(stages[currentIndex - 1].id, 'backward');
    }
  };

  const goToStage = (stageId: string) => {
    if (!currentStage) return;
    const currentIndex = stages.findIndex(s => s.id === currentStage.id);
    const targetIndex = stages.findIndex(s => s.id === stageId);

    if (targetIndex !== currentIndex) {
      const direction = targetIndex > currentIndex ? 'forward' : 'backward';
      changeStage(stageId, direction);
    }
  };

  const getDaysInStage = () => {
    if (!lead?.stage_entered_at) return 0;
    const entered = new Date(lead.stage_entered_at);
    const now = new Date();
    return Math.floor((now.getTime() - entered.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getMinutesSinceCreation = () => {
    if (!lead?.created_at) return 0;
    const created = new Date(lead.created_at);
    const now = new Date();
    return Math.floor((now.getTime() - created.getTime()) / (1000 * 60));
  };

  const getProgressPercentage = () => {
    if (!currentStage) return 0;
    const currentIndex = stages.findIndex(s => s.id === currentStage.id);
    return ((currentIndex + 1) / stages.length) * 100;
  };

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-lg p-6 animate-pulse">
        <div className="h-8 bg-gray-800 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-gray-800 rounded w-full"></div>
      </div>
    );
  }

  const currentIndex = currentStage ? stages.findIndex(s => s.id === currentStage.id) : -1;
  const canGoBack = currentIndex > 0;
  const canGoForward = currentIndex < stages.length - 1;
  const daysInStage = getDaysInStage();
  const minutesSinceCreation = getMinutesSinceCreation();
  const progress = getProgressPercentage();
  const isNewLead = currentStage?.name === 'Nouveau Lead';
  const isUrgent = isNewLead && minutesSinceCreation < 15;

  return (
    <>
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg p-6 border border-gray-700">
        {/* Urgency Alert for New Leads */}
        {isNewLead && showUrgencyAlert && (
          <div className="mb-6 bg-gradient-to-r from-orange-900/40 to-red-900/40 border-2 border-orange-500 rounded-lg p-4 animate-pulse">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-orange-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-bold text-orange-100 mb-1 flex items-center gap-2">
                  ⚡ Action Urgente Requise
                  <span className="text-xs bg-red-600 px-2 py-0.5 rounded-full">
                    {15 - minutesSinceCreation} min restantes
                  </span>
                </h4>
                <p className="text-orange-200 text-sm mb-3">
                  Les statistiques montrent que contacter un lead dans les 15 premières minutes augmente le taux de conversion de <strong>x7</strong>. N'attendez pas !
                </p>
                <button
                  onClick={() => setShowCallDialog(true)}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-lg transition-all shadow-lg shadow-green-500/30"
                >
                  <Phone className="w-4 h-4" />
                  Appeler maintenant
                </button>
              </div>
              <button
                onClick={() => setShowUrgencyAlert(false)}
                className="text-orange-400 hover:text-orange-300"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-1">
              Pipeline Commercial
            </h3>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span>Étape {currentIndex + 1} sur {stages.length}</span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {daysInStage} jour{daysInStage > 1 ? 's' : ''} dans cette étape
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-white">{progress.toFixed(0)}%</div>
            <div className="text-xs text-gray-400">Progression</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Stages Stepper */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            {stages.map((stage, index) => {
              const isActive = stage.id === currentStage?.id;
              const isPassed = index < currentIndex;

              return (
                <React.Fragment key={stage.id}>
                  <button
                    onClick={() => goToStage(stage.id)}
                    disabled={changing}
                    className={`
                      flex flex-col items-center gap-2 transition-all relative group
                      ${changing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105'}
                    `}
                  >
                    <div
                      className={`
                        w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm
                        transition-all duration-300 border-2
                        ${
                          isActive
                            ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/50 scale-110'
                            : isPassed
                            ? 'bg-green-600 border-green-400 text-white'
                            : 'bg-gray-800 border-gray-600 text-gray-400'
                        }
                      `}
                    >
                      {isPassed ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <span>{index + 1}</span>
                      )}
                    </div>

                    <div
                      className={`
                        text-xs font-medium text-center max-w-[100px]
                        ${isActive ? 'text-blue-400' : isPassed ? 'text-green-400' : 'text-gray-500'}
                      `}
                    >
                      {stage.name}
                    </div>

                    <div className="absolute top-full mt-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-950 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap z-10 pointer-events-none">
                      Cliquer pour aller à cette étape
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-950 rotate-45"></div>
                    </div>
                  </button>

                  {index < stages.length - 1 && (
                    <div className="flex-1 h-0.5 mx-2 relative">
                      <div className="absolute inset-0 bg-gray-700"></div>
                      <div
                        className={`
                          absolute inset-0 transition-all duration-500
                          ${index < currentIndex ? 'bg-green-500' : 'bg-transparent'}
                        `}
                      ></div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Current Stage Info */}
        {currentStage && (
          <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="font-semibold text-white mb-1">{currentStage.name}</h4>
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Moyenne: {parseFloat(currentStage.avg_time_in_stage_days).toFixed(0)} jours
                  </span>
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    Taux: {parseFloat(currentStage.conversion_rate_to_next).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Call Action for New Lead */}
            {isNewLead && (
              <div className="mb-4 pb-4 border-b border-gray-700">
                <button
                  onClick={() => setShowCallDialog(true)}
                  className={`
                    w-full flex items-center justify-center gap-2 font-semibold py-3 rounded-lg transition-all
                    ${
                      isUrgent
                        ? 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white shadow-lg shadow-orange-500/30 animate-pulse'
                        : 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/30'
                    }
                  `}
                >
                  <Phone className="w-5 h-5" />
                  {isUrgent ? `Appeler maintenant (${15 - minutesSinceCreation} min restantes)` : 'Appeler le client'}
                </button>
              </div>
            )}

            {/* AI Tips */}
            {currentStage.ai_tips && currentStage.ai_tips.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-yellow-400">
                  <Lightbulb className="w-4 h-4" />
                  Conseils IA pour cette étape
                </div>
                <div className="space-y-1">
                  {currentStage.ai_tips.map((tip, index) => (
                    <div key={index} className="text-sm text-gray-300 pl-6">
                      • {tip}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={goToPreviousStage}
            disabled={!canGoBack || changing}
            className={`
              flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium
              transition-all
              ${
                canGoBack && !changing
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-gray-800 text-gray-300 cursor-not-allowed'
              }
            `}
          >
            <ChevronLeft className="w-4 h-4" />
            Revenir en arrière
          </button>

          <button
            onClick={goToNextStage}
            disabled={!canGoForward || changing}
            className={`
              flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium
              transition-all
              ${
                canGoForward && !changing
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30'
                  : 'bg-gray-800 text-gray-300 cursor-not-allowed'
              }
            `}
          >
            Passer à l'étape suivante
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Jump */}
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="text-xs text-gray-500 mb-2">Aller directement à :</div>
          <div className="flex flex-wrap gap-2">
            {stages.map((stage, index) => {
              const isActive = stage.id === currentStage?.id;
              const isPassed = index < currentIndex;

              return (
                <button
                  key={stage.id}
                  onClick={() => goToStage(stage.id)}
                  disabled={isActive || changing}
                  className={`
                    text-xs px-3 py-1.5 rounded-full transition-all
                    ${
                      isActive
                        ? 'bg-blue-600 text-white cursor-default'
                        : isPassed
                        ? 'bg-green-900/30 text-green-400 hover:bg-green-900/50'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }
                    ${changing ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  {stage.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Call Dialog */}
      {lead && (
        <CallDialog
          isOpen={showCallDialog}
          onClose={() => setShowCallDialog(false)}
          leadId={leadId}
          leadName={`${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'Client'}
          leadPhone={lead.phone}
          leadEmail={lead.email}
          onCallCompleted={() => {
            loadData();
            onStageChanged?.();
          }}
        />
      )}
    </>
  );
};
