import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { CheckCircle2, Circle, Loader2, ChevronRight, ChevronLeft } from 'lucide-react';
import CollecteDocumentsStep from './CollecteDocumentsStep';
import SaisieDevisStep from './SaisieDevisStep';
import ValidationDevisStep from './ValidationDevisStep';
import SignatureDevisStep from './SignatureDevisStep';
import PaiementRIBStep from './PaiementRIBStep';
import ContratSignatureStep from './ContratSignatureStep';
import { CallDialog } from './CallDialog';

interface PipelineWorkflow7EtapesProps {
  leadId: string;
  leadData: any;
}

interface StepInfo {
  key: string;
  number: number;
  title: string;
  description: string;
}

const PIPELINE_STEPS: StepInfo[] = [
  {
    key: 'nouveau_lead',
    number: 1,
    title: 'Nouveau Lead',
    description: 'Contact multi-canal + qualification besoin'
  },
  {
    key: 'collecte_documents',
    number: 2,
    title: 'Collecte Documents',
    description: 'Récupération et validation des documents'
  },
  {
    key: 'saisie_devis',
    number: 3,
    title: 'Saisie Devis',
    description: 'Upload des 5 devis compagnies'
  },
  {
    key: 'validation_devis_prospect',
    number: 4,
    title: 'Validation Devis',
    description: 'Le prospect choisit son devis'
  },
  {
    key: 'signature_devis',
    number: 5,
    title: 'Signature Devis',
    description: 'Signature électronique du devis'
  },
  {
    key: 'paiement_rib',
    number: 6,
    title: 'Paiement RIB',
    description: 'Upload et validation du RIB'
  },
  {
    key: 'contrat_signature',
    number: 7,
    title: 'Contrat Final',
    description: 'Documents finaux → Client actif'
  }
];

export default function PipelineWorkflow7Etapes({ leadId, leadData }: PipelineWorkflow7EtapesProps) {
  const [currentStage, setCurrentStage] = useState<string>(leadData.pipeline_stage || 'nouveau_lead');
  const [loading, setLoading] = useState(false);
  const [showCallDialog, setShowCallDialog] = useState(false);

  // Extract first name intelligently from various sources
  const getFirstName = () => {
    if (leadData.first_name) return leadData.first_name;
    if (leadData.full_name) return leadData.full_name.split(' ')[0];
    if (leadData.email) {
      const username = leadData.email.split('@')[0];
      return username.charAt(0).toUpperCase() + username.slice(1);
    }
    return '';
  };

  const firstName = getFirstName();

  useEffect(() => {
    const channel = supabase
      .channel(`lead-${leadId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'crm_leads',
          filter: `id=eq.${leadId}`
        },
        (payload) => {
          if (payload.new.pipeline_stage) {
            setCurrentStage(payload.new.pipeline_stage);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [leadId]);

  async function moveToStage(targetStage: string) {
    setLoading(true);
    try {
      // First, verify the lead exists
      const { data: existingLead, error: fetchError } = await supabase
        .from('crm_leads')
        .select('id, pipeline_stage, status')
        .eq('id', leadId)
        .single();

      if (fetchError) {
        console.error('Error fetching lead:', fetchError);
        throw new Error(`Impossible de charger le lead: ${fetchError.message}`);
      }

      if (!existingLead) {
        throw new Error('Lead introuvable');
      }

      // Update the stage
      const { error: updateError } = await supabase
        .from('crm_leads')
        .update({
          pipeline_stage: targetStage,
          updated_at: new Date().toISOString()
        })
        .eq('id', leadId);

      if (updateError) {
        console.error('Error updating stage:', updateError);
        throw new Error(`Erreur de mise à jour: ${updateError.message}`);
      }

      setCurrentStage(targetStage);
    } catch (error: any) {
      console.error('Error moving to stage:', error);
      alert(error.message || 'Erreur lors du changement d\'étape');
    } finally {
      setLoading(false);
    }
  }

  const getCurrentStepNumber = () => {
    const step = PIPELINE_STEPS.find(s => s.key === currentStage);
    return step?.number || 1;
  };

  const getPreviousStage = () => {
    const currentIndex = PIPELINE_STEPS.findIndex(s => s.key === currentStage);
    if (currentIndex > 0) {
      return PIPELINE_STEPS[currentIndex - 1].key;
    }
    return null;
  };

  const getNextStage = () => {
    const currentIndex = PIPELINE_STEPS.findIndex(s => s.key === currentStage);
    if (currentIndex < PIPELINE_STEPS.length - 1) {
      return PIPELINE_STEPS[currentIndex + 1].key;
    }
    return null;
  };

  const currentStepNumber = getCurrentStepNumber();
  const previousStage = getPreviousStage();
  const nextStage = getNextStage();

  const progressPct = ((currentStepNumber - 1) / (PIPELINE_STEPS.length - 1)) * 100;

  return (
    <div className="space-y-4">
      {/* Progress Steps */}
      <div
        className="rounded-2xl shadow-xl border border-black/20 p-6 overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #0f1117 0%, #161b22 50%, #0f1117 100%)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-bold text-white flex items-center gap-2.5">
            <span className="w-1.5 h-5 bg-gradient-to-b from-yellow-400 to-yellow-600 rounded-full inline-block"></span>
            Pipeline Commercial
            <span className="text-yellow-400/70 font-normal text-sm">— 7 Étapes</span>
          </h2>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500">Progression</span>
            <div className="w-24 h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-yellow-500 to-amber-400 rounded-full transition-all duration-700"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-yellow-400 font-bold">{Math.round(progressPct)}%</span>
          </div>
        </div>

        <div className="relative">
          {/* Background track line */}
          <div className="absolute top-[22px] left-[20px] right-[20px] h-0.5 bg-gray-800/80" />
          {/* Progress fill */}
          <div
            className="absolute top-[22px] left-[20px] h-0.5 bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-400 transition-all duration-700 shadow-sm"
            style={{
              width: `calc(${progressPct}% * (100% - 40px) / 100)`,
              boxShadow: '0 0 8px rgba(245,158,11,0.5)'
            }}
          />

          {/* Steps */}
          <div className="relative grid grid-cols-7 gap-1">
            {PIPELINE_STEPS.map((step) => {
              const isActive = step.key === currentStage;
              const isCompleted = step.number < currentStepNumber;

              return (
                <button
                  key={step.key}
                  onClick={() => moveToStage(step.key)}
                  disabled={loading}
                  className="flex flex-col items-center group disabled:cursor-not-allowed transition-all duration-200"
                  title={`Aller à l'étape ${step.number}: ${step.title}`}
                >
                  <div
                    className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm mb-2 transition-all duration-200 shadow-md group-hover:scale-110 ${
                      isCompleted
                        ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-green-900/40'
                        : isActive
                        ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-black ring-4 ring-yellow-500/30 shadow-yellow-900/50 scale-110'
                        : 'bg-gray-800/80 text-gray-500 border border-gray-700/80 group-hover:bg-gray-700 group-hover:text-gray-300 group-hover:border-gray-500'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <span>{step.number}</span>
                    )}
                  </div>
                  <div className="text-center px-0.5">
                    <p
                      className={`text-[10px] font-semibold leading-tight ${
                        isActive ? 'text-yellow-400' : isCompleted ? 'text-green-400' : 'text-gray-600 group-hover:text-gray-400'
                      }`}
                    >
                      {step.title}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Current Step Content */}
      <div
        key={currentStage}
        className="bg-white rounded-xl shadow-sm border-l-4 p-6"
        style={{
          borderLeftColor: '#f59e0b',
          borderTopColor: '#e5e7eb',
          borderRightColor: '#e5e7eb',
          borderBottomColor: '#e5e7eb',
          borderTopWidth: '1px',
          borderRightWidth: '1px',
          borderBottomWidth: '1px',
        }}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-yellow-500 to-amber-500 text-black text-sm font-bold shadow-sm">{currentStepNumber}</span>
            {PIPELINE_STEPS.find(s => s.key === currentStage)?.title}
            <span className="text-xs font-normal text-gray-400 ml-1">
              {PIPELINE_STEPS.find(s => s.key === currentStage)?.description}
            </span>
          </h3>
          {loading && <Loader2 className="h-5 w-5 animate-spin text-yellow-500" />}
        </div>

        {/* Étape 1 : Nouveau Lead */}
        {currentStage === 'nouveau_lead' && (
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-900 mb-4">
                <strong>Objectif :</strong> Contacter le prospect par téléphone, email, SMS ou WhatsApp pour qualifier son besoin.
              </p>
              <button
                onClick={() => setShowCallDialog(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-yellow-600 to-yellow-500 text-black rounded-lg hover:from-yellow-700 hover:to-yellow-600 font-semibold shadow transition-all"
              >
                Appeler le Prospect
              </button>
            </div>

            <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200">
              {nextStage && (
                <button
                  onClick={() => moveToStage(nextStage)}
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-yellow-500 to-amber-500 text-black rounded-lg hover:from-yellow-400 hover:to-amber-400 font-bold disabled:opacity-50 transition-all shadow-sm text-sm"
                >
                  Étape Suivante
                  <ChevronRight className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Étape 2 : Collecte Documents */}
        {currentStage === 'collecte_documents' && (
          <div className="space-y-4">
            <CollecteDocumentsStep
              leadId={leadId}
              leadEmail={leadData.email}
              leadPhone={leadData.phone}
              leadFirstName={firstName}
              leadAccessToken={leadData.access_token}
              onComplete={() => {
                // Auto-advance handled by trigger
              }}
            />

            <div className="flex items-center justify-between gap-4 pt-4 border-t border-gray-200">
              {previousStage && (
                <button
                  onClick={() => moveToStage(previousStage)}
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-200 font-semibold disabled:opacity-50 transition-all text-sm"
                >
                  <ChevronLeft className="h-5 w-5" />
                  Étape Précédente
                </button>
              )}

              {nextStage && (
                <button
                  onClick={() => moveToStage(nextStage)}
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-yellow-500 to-amber-500 text-black rounded-lg hover:from-yellow-400 hover:to-amber-400 font-bold disabled:opacity-50 transition-all shadow-sm ml-auto text-sm"
                >
                  Étape Suivante
                  <ChevronRight className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Étape 3 : Saisie Devis */}
        {currentStage === 'saisie_devis' && (
          <div className="space-y-4">
            <SaisieDevisStep
              leadId={leadId}
              leadEmail={leadData.email}
              leadFirstName={firstName}
              leadAccessToken={leadData.access_token}
              onComplete={() => {
                // Auto-advance handled by trigger
              }}
            />

            <div className="flex items-center justify-between gap-4 pt-4 border-t border-gray-200">
              {previousStage && (
                <button
                  onClick={() => moveToStage(previousStage)}
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-200 font-semibold disabled:opacity-50 transition-all text-sm"
                >
                  <ChevronLeft className="h-5 w-5" />
                  Étape Précédente
                </button>
              )}

              {nextStage && (
                <button
                  onClick={() => moveToStage(nextStage)}
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-yellow-500 to-amber-500 text-black rounded-lg hover:from-yellow-400 hover:to-amber-400 font-bold disabled:opacity-50 transition-all shadow-sm ml-auto text-sm"
                >
                  Étape Suivante
                  <ChevronRight className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Étape 4 : Validation Devis Prospect */}
        {currentStage === 'validation_devis_prospect' && (
          <ValidationDevisStep
            leadId={leadId}
            leadEmail={leadData.email}
            leadPhone={leadData.phone}
            leadFirstName={firstName}
            leadAccessToken={leadData.access_token}
          />
        )}

        {/* Étape 5 : Signature Devis */}
        {currentStage === 'signature_devis' && (
          <div className="space-y-4">
            <SignatureDevisStep
              leadId={leadId}
              onComplete={() => {
                // Auto-advance handled by trigger
              }}
            />

            <div className="flex items-center justify-between gap-4 pt-4 border-t border-gray-200">
              {previousStage && (
                <button
                  onClick={() => moveToStage(previousStage)}
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-200 font-semibold disabled:opacity-50 transition-all text-sm"
                >
                  <ChevronLeft className="h-5 w-5" />
                  Étape Précédente
                </button>
              )}

              {nextStage && (
                <button
                  onClick={() => moveToStage(nextStage)}
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-yellow-500 to-amber-500 text-black rounded-lg hover:from-yellow-400 hover:to-amber-400 font-bold disabled:opacity-50 transition-all shadow-sm ml-auto text-sm"
                >
                  Étape Suivante
                  <ChevronRight className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Étape 6 : Paiement RIB */}
        {currentStage === 'paiement_rib' && (
          <div className="space-y-4">
            <PaiementRIBStep
              leadId={leadId}
              leadEmail={leadData.email}
              leadFirstName={firstName}
              leadAccessToken={leadData.access_token}
              onComplete={() => {
                // Auto-advance handled by trigger
              }}
            />

            <div className="flex items-center justify-between gap-4 pt-4 border-t border-gray-200">
              {previousStage && (
                <button
                  onClick={() => moveToStage(previousStage)}
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-200 font-semibold disabled:opacity-50 transition-all text-sm"
                >
                  <ChevronLeft className="h-5 w-5" />
                  Étape Précédente
                </button>
              )}

              {nextStage && (
                <button
                  onClick={() => moveToStage(nextStage)}
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-yellow-500 to-amber-500 text-black rounded-lg hover:from-yellow-400 hover:to-amber-400 font-bold disabled:opacity-50 transition-all shadow-sm ml-auto text-sm"
                >
                  Étape Suivante
                  <ChevronRight className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Étape 7 : Contrat Signature */}
        {currentStage === 'contrat_signature' && (
          <div className="space-y-4">
            <ContratSignatureStep
              leadId={leadId}
              onComplete={() => {
                // Auto-advance handled by trigger
              }}
            />

            <div className="flex items-center justify-between gap-4 pt-4 border-t border-gray-200">
              {previousStage && (
                <button
                  onClick={() => moveToStage(previousStage)}
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-200 font-semibold disabled:opacity-50 transition-all text-sm"
                >
                  <ChevronLeft className="h-5 w-5" />
                  Étape Précédente
                </button>
              )}

              {nextStage && (
                <button
                  onClick={() => moveToStage(nextStage)}
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-yellow-500 to-amber-500 text-black rounded-lg hover:from-yellow-400 hover:to-amber-400 font-bold disabled:opacity-50 transition-all shadow-sm ml-auto text-sm"
                >
                  Étape Suivante
                  <ChevronRight className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Client Actif */}
        {currentStage === 'client_actif' && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4 shadow-lg">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Client Actif !
            </h3>
            <p className="text-gray-600 mb-6">
              Ce prospect est maintenant un client actif. Tous les documents sont disponibles dans son espace client.
            </p>
            {leadData.access_token && (
              <a
                href={`${window.location.origin}/espace-client?token=${leadData.access_token}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-yellow-600 to-yellow-500 text-black rounded-lg hover:from-yellow-700 hover:to-yellow-600 font-semibold shadow transition-all"
              >
                Accéder à l'Espace Client
                <ChevronRight className="h-5 w-5" />
              </a>
            )}
          </div>
        )}
      </div>

      {/* Call Dialog */}
      <CallDialog
        isOpen={showCallDialog}
        leadId={leadId}
        leadName={`${leadData.first_name || ''} ${leadData.last_name || ''}`.trim()}
        leadPhone={leadData.phone}
        leadEmail={leadData.email}
        onClose={() => setShowCallDialog(false)}
      />
    </div>
  );
}
