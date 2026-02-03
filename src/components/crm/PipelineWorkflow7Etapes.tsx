import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { CheckCircle2, Circle, Loader2, ChevronRight } from 'lucide-react';
import CollecteDocumentsStep from './CollecteDocumentsStep';
import SaisieDevisStep from './SaisieDevisStep';
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

  async function moveToNextStage(nextStage: string) {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('crm_leads')
        .update({
          pipeline_stage: nextStage,
          updated_at: new Date().toISOString()
        })
        .eq('id', leadId);

      if (error) throw error;

      setCurrentStage(nextStage);
    } catch (error) {
      console.error('Error moving to next stage:', error);
      alert('Erreur lors du changement d\'étape');
    } finally {
      setLoading(false);
    }
  }

  const getCurrentStepNumber = () => {
    const step = PIPELINE_STEPS.find(s => s.key === currentStage);
    return step?.number || 1;
  };

  const currentStepNumber = getCurrentStepNumber();

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
                <div key={step.key} className="flex flex-col items-center">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg mb-2 transition-all ${
                      isCompleted
                        ? 'bg-green-600 text-white'
                        : isActive
                        ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                        : 'bg-gray-200 text-gray-500'
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
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Current Step Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
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

            <button
              onClick={() => moveToNextStage('collecte_documents')}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50"
            >
              Besoin Qualifié - Passer à la Collecte de Documents
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Étape 2 : Collecte Documents */}
        {currentStage === 'collecte_documents' && (
          <CollecteDocumentsStep
            leadId={leadId}
            leadEmail={leadData.email}
            leadPhone={leadData.phone}
            leadFirstName={leadData.first_name}
            leadAccessToken={leadData.access_token}
            onComplete={() => {
              // Auto-advance handled by trigger
            }}
          />
        )}

        {/* Étape 3 : Saisie Devis */}
        {currentStage === 'saisie_devis' && (
          <SaisieDevisStep
            leadId={leadId}
            leadEmail={leadData.email}
            leadFirstName={leadData.first_name}
            leadAccessToken={leadData.access_token}
            onComplete={() => {
              // Auto-advance handled by trigger
            }}
          />
        )}

        {/* Étape 4 : Validation Devis Prospect */}
        {currentStage === 'validation_devis_prospect' && (
          <div className="space-y-4">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <p className="text-sm text-purple-900 mb-3">
                <strong>En attente de validation par le prospect</strong>
              </p>
              <p className="text-sm text-purple-800">
                Le prospect doit se connecter à son espace pour consulter les 5 devis et en valider un.
                Une fois validé, le lead passera automatiquement à l'étape suivante.
              </p>
            </div>

            {leadData.access_token && (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Lien Espace Prospect :</p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/espace-prospect?token=${leadData.access_token}`}
                    className="flex-1 px-3 py-2 text-sm bg-white border border-gray-300 rounded"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/espace-prospect?token=${leadData.access_token}`);
                      alert('Lien copié !');
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Copier
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Étape 5 : Signature Devis */}
        {currentStage === 'signature_devis' && (
          <SignatureDevisStep
            leadId={leadId}
            onComplete={() => {
              // Auto-advance handled by trigger
            }}
          />
        )}

        {/* Étape 6 : Paiement RIB */}
        {currentStage === 'paiement_rib' && (
          <PaiementRIBStep
            leadId={leadId}
            leadEmail={leadData.email}
            leadFirstName={leadData.first_name}
            leadAccessToken={leadData.access_token}
            onComplete={() => {
              // Auto-advance handled by trigger
            }}
          />
        )}

        {/* Étape 7 : Contrat Signature */}
        {currentStage === 'contrat_signature' && (
          <ContratSignatureStep
            leadId={leadId}
            onComplete={() => {
              // Auto-advance handled by trigger
            }}
          />
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
      {showCallDialog && (
        <CallDialog
          leadId={leadId}
          leadName={`${leadData.first_name || ''} ${leadData.last_name || ''}`.trim()}
          leadPhone={leadData.phone}
          onClose={() => setShowCallDialog(false)}
        />
      )}
    </div>
  );
}
