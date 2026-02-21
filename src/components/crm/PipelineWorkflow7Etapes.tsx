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

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">
          Pipeline Commercial - 7 Étapes
        </h2>

        <div className="relative">
          {/* Progress Line */}
          <div className="absolute top-6 left-0 right-0 h-1 bg-gray-200">
            <div
              className="h-full bg-blue-600 transition-all duration-500"
              style={{ width: `${((currentStepNumber - 1) / (PIPELINE_STEPS.length - 1)) * 100}%` }}
            />
          </div>

          {/* Steps */}
          <div className="relative grid grid-cols-7 gap-2">
            {PIPELINE_STEPS.map((step) => {
              const isActive = step.key === currentStage;
              const isCompleted = step.number < currentStepNumber;
              const isFuture = step.number > currentStepNumber;

              return (
                <button
                  key={step.key}
                  onClick={() => moveToStage(step.key)}
                  disabled={loading}
                  className="flex flex-col items-center group disabled:cursor-not-allowed hover:scale-105 transition-transform"
                  title={`Aller à l'étape ${step.number}: ${step.title}`}
                >
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg mb-2 transition-all ${
                      isCompleted
                        ? 'bg-green-600 text-white group-hover:bg-green-700'
                        : isActive
                        ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                        : 'bg-gray-200 text-gray-500 group-hover:bg-gray-300'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-6 w-6" />
                    ) : (
                      <span>{step.number}</span>
                    )}
                  </div>
                  <div className="text-center">
                    <p
                      className={`text-xs font-semibold mb-1 ${
                        isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                      }`}
                    >
                      {step.title}
                    </p>
                    <p className="text-xs text-gray-500 hidden xl:block">{step.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Current Step Content */}
      <div key={currentStage} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            Étape {currentStepNumber} : {PIPELINE_STEPS.find(s => s.key === currentStage)?.title}
          </h3>
          {loading && <Loader2 className="h-5 w-5 animate-spin text-blue-600" />}
        </div>

        {/* Étape 1 : Nouveau Lead */}
        {currentStage === 'nouveau_lead' && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900 mb-4">
                <strong>Objectif :</strong> Contacter le prospect par téléphone, email, SMS ou WhatsApp pour qualifier son besoin.
              </p>
              <button
                onClick={() => setShowCallDialog(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
              >
                Appeler le Prospect
              </button>
            </div>

            <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200">
              {nextStage && (
                <button
                  onClick={() => moveToStage(nextStage)}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50 transition-colors"
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
                  className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold disabled:opacity-50 transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                  Étape Précédente
                </button>
              )}

              {nextStage && (
                <button
                  onClick={() => moveToStage(nextStage)}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50 transition-colors ml-auto"
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
                  className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold disabled:opacity-50 transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                  Étape Précédente
                </button>
              )}

              {nextStage && (
                <button
                  onClick={() => moveToStage(nextStage)}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50 transition-colors ml-auto"
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
                  className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold disabled:opacity-50 transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                  Étape Précédente
                </button>
              )}

              {nextStage && (
                <button
                  onClick={() => moveToStage(nextStage)}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50 transition-colors ml-auto"
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
                  className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold disabled:opacity-50 transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                  Étape Précédente
                </button>
              )}

              {nextStage && (
                <button
                  onClick={() => moveToStage(nextStage)}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50 transition-colors ml-auto"
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
                  className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold disabled:opacity-50 transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                  Étape Précédente
                </button>
              )}

              {nextStage && (
                <button
                  onClick={() => moveToStage(nextStage)}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50 transition-colors ml-auto"
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
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Client Actif !
            </h3>
            <p className="text-gray-600 mb-4">
              Ce prospect est maintenant un client actif. Tous les documents sont disponibles dans son espace client.
            </p>
            {leadData.access_token && (
              <a
                href={`${window.location.origin}/espace-client?token=${leadData.access_token}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
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
