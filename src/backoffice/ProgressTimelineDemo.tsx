import { useState } from 'react';
import {
  TrendingUp, CheckCircle, Clock, FileText, Mail, Phone, User, MessageSquare,
  Calendar, Target, Zap, Award
} from 'lucide-react';
import { Progress, CircularProgress, Stepper } from '../components/Progress';
import { Timeline, ActivityTimeline } from '../components/Timeline';

export default function ProgressTimelineDemo() {
  const [currentStep, setCurrentStep] = useState(2);

  const timelineItems = [
    {
      id: '1',
      title: 'Lead créé',
      description: 'Nouveau lead reçu depuis le formulaire web',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      icon: <Zap className="w-5 h-5" />,
      iconColor: 'bg-green-500',
      user: { name: 'Système Auto' },
      content: (
        <div className="bg-gray-950 rounded p-3 border border-gray-800 text-sm">
          <div className="font-semibold mb-1">Jean Dupont</div>
          <div className="text-gray-400">Email: jean@example.com</div>
          <div className="text-gray-400">Tél: 06 12 34 56 78</div>
        </div>
      )
    },
    {
      id: '2',
      title: 'Lead qualifié',
      description: 'Score de qualification: 85/100',
      timestamp: new Date(Date.now() - 1.5 * 60 * 60 * 1000),
      icon: <CheckCircle className="w-5 h-5" />,
      iconColor: 'bg-blue-500',
      user: { name: 'Marie Martin' }
    },
    {
      id: '3',
      title: 'Premier contact',
      description: 'Appel téléphonique effectué - Client intéressé',
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
      icon: <Phone className="w-5 h-5" />,
      iconColor: 'bg-purple-500',
      user: { name: 'Pierre Dubois' },
      content: (
        <div className="text-sm text-gray-400 italic">
          "Client très intéressé par l'offre flotte. Demande un devis pour 3 véhicules.
          RDV prévu mardi prochain à 14h."
        </div>
      )
    },
    {
      id: '4',
      title: 'Devis envoyé',
      description: 'Devis personnalisé avec tarif préférentiel',
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
      icon: <FileText className="w-5 h-5" />,
      iconColor: 'bg-yellow-500',
      user: { name: 'Marie Martin' }
    },
    {
      id: '5',
      title: 'Rendez-vous planifié',
      description: 'RDV le 15/01/2026 à 14h00',
      timestamp: new Date(Date.now() - 10 * 60 * 1000),
      icon: <Calendar className="w-5 h-5" />,
      iconColor: 'bg-orange-500',
      user: { name: 'Système Auto' }
    }
  ];

  const activities = [
    {
      id: '1',
      type: 'created' as const,
      title: 'a créé le lead',
      description: 'Lead reçu depuis le formulaire contact',
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
      user: { name: 'Système' }
    },
    {
      id: '2',
      type: 'assigned' as const,
      title: 'a assigné le lead à Marie Martin',
      timestamp: new Date(Date.now() - 2.5 * 60 * 60 * 1000),
      user: { name: 'Admin' }
    },
    {
      id: '3',
      type: 'commented' as const,
      title: 'a ajouté un commentaire',
      description: 'Client très réactif, bonne opportunité',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      user: { name: 'Marie Martin' }
    },
    {
      id: '4',
      type: 'updated' as const,
      title: 'a mis à jour le statut',
      description: 'Statut changé de "Nouveau" à "En négociation"',
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
      user: { name: 'Marie Martin' }
    },
    {
      id: '5',
      type: 'created' as const,
      title: 'a créé un devis',
      description: 'Devis #2024-0156 pour 3 véhicules',
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
      user: { name: 'Marie Martin' }
    },
    {
      id: '6',
      type: 'commented' as const,
      title: 'a ajouté un commentaire',
      description: 'Client demande une remise de 10%. À valider avec le manager.',
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
      user: { name: 'Pierre Dubois' }
    }
  ];

  const steps = [
    {
      label: 'Informations',
      description: 'Coordonnées client',
      icon: <User className="w-5 h-5" />
    },
    {
      label: 'Véhicule',
      description: 'Type et usage',
      icon: <FileText className="w-5 h-5" />
    },
    {
      label: 'Garanties',
      description: 'Options souhaitées',
      icon: <CheckCircle className="w-5 h-5" />
    },
    {
      label: 'Paiement',
      description: 'Modalités',
      icon: <Target className="w-5 h-5" />
    },
    {
      label: 'Confirmation',
      description: 'Validation finale',
      icon: <Award className="w-5 h-5" />
    }
  ];

  return (
    <div className="min-h-screen bg-gray-950 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <TrendingUp className="w-10 h-10 text-blue-500" />
            Progress, Stepper & Timeline
          </h1>
          <p className="text-gray-400 text-lg">
            Indicateurs de progression et historique d'activités
          </p>
        </div>

        <div className="space-y-8">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Progress Bars</h2>

            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Tailles</h3>
                <div className="space-y-4">
                  <Progress value={30} size="sm" label="Small" showLabel />
                  <Progress value={60} size="md" label="Medium" showLabel />
                  <Progress value={90} size="lg" label="Large" showLabel />
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Variants</h3>
                <div className="space-y-4">
                  <Progress value={75} variant="default" label="Default" showLabel />
                  <Progress value={85} variant="success" label="Success" showLabel />
                  <Progress value={50} variant="warning" label="Warning" showLabel />
                  <Progress value={30} variant="danger" label="Danger" showLabel />
                  <Progress value={65} variant="info" label="Info" showLabel />
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Exemples Réels</h3>
                <div className="space-y-4">
                  <Progress
                    value={147}
                    max={200}
                    variant="success"
                    label="Objectif leads mensuel"
                    showLabel
                  />
                  <Progress
                    value={28}
                    max={50}
                    variant="warning"
                    label="Devis en attente"
                    showLabel
                  />
                  <Progress
                    value={12}
                    max={15}
                    variant="info"
                    label="Signatures ce mois"
                    showLabel
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl border border-gray-800 p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Circular Progress</h2>

            <div className="flex flex-wrap gap-12 justify-center">
              <CircularProgress value={75} variant="default" label="Conversion" />
              <CircularProgress value={90} variant="success" size={140} strokeWidth={10} label="Satisfaction" />
              <CircularProgress value={60} variant="warning" size={100} label="Objectif" />
              <CircularProgress value={45} variant="danger" size={120} label="Taux échec" />
              <CircularProgress value={85} variant="info" size={130} strokeWidth={12} label="Performance" />
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl border border-gray-800 p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Stepper Horizontal</h2>

            <Stepper
              steps={steps}
              currentStep={currentStep}
              onStepClick={setCurrentStep}
            />

            <div className="mt-8 flex gap-4">
              <button
                onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                disabled={currentStep === 0}
                className="px-6 py-3 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors"
              >
                Précédent
              </button>
              <button
                onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
                disabled={currentStep === steps.length - 1}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors"
              >
                Suivant
              </button>
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl border border-gray-800 p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Stepper Vertical</h2>

            <Stepper
              steps={steps}
              currentStep={currentStep}
              orientation="vertical"
              onStepClick={setCurrentStep}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-8">
              <h2 className="text-2xl font-bold text-white mb-6">Timeline Simple</h2>

              <Timeline items={timelineItems} variant="minimal" />
            </div>

            <div className="bg-gray-900 rounded-xl border border-gray-800 p-8">
              <h2 className="text-2xl font-bold text-white mb-6">Activity Timeline</h2>

              <ActivityTimeline activities={activities} />
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl border border-gray-800 p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Timeline Détaillée</h2>

            <Timeline items={timelineItems} />
          </div>

          <div className="bg-gray-900 rounded-xl border border-gray-800 p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Dashboard Exemple</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-950 rounded-lg p-6 border border-gray-800">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-semibold">Leads du mois</h3>
                  <Target className="w-5 h-5 text-blue-500" />
                </div>
                <CircularProgress value={73.5} variant="success" size={140} />
                <div className="text-center mt-4">
                  <div className="text-2xl font-bold text-white">147 / 200</div>
                  <div className="text-sm text-gray-400">Objectif atteint à 73.5%</div>
                </div>
              </div>

              <div className="bg-gray-950 rounded-lg p-6 border border-gray-800">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-semibold">Taux conversion</h3>
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
                <CircularProgress value={28} variant="warning" size={140} />
                <div className="text-center mt-4">
                  <div className="text-2xl font-bold text-white">2.8%</div>
                  <div className="text-sm text-gray-400">Objectif: 3.5%</div>
                </div>
              </div>

              <div className="bg-gray-950 rounded-lg p-6 border border-gray-800">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-semibold">Satisfaction</h3>
                  <Award className="w-5 h-5 text-purple-500" />
                </div>
                <CircularProgress value={92} variant="success" size={140} />
                <div className="text-center mt-4">
                  <div className="text-2xl font-bold text-white">4.6 / 5</div>
                  <div className="text-sm text-gray-400">248 avis clients</div>
                </div>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <div className="bg-gray-950 rounded-lg p-4 border border-gray-800">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-blue-500" />
                    <span className="text-white font-semibold">Emails envoyés</span>
                  </div>
                  <span className="text-white font-bold">450 / 500</span>
                </div>
                <Progress value={450} max={500} variant="info" showLabel />
              </div>

              <div className="bg-gray-950 rounded-lg p-4 border border-gray-800">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-green-500" />
                    <span className="text-white font-semibold">Appels effectués</span>
                  </div>
                  <span className="text-white font-bold">85 / 100</span>
                </div>
                <Progress value={85} max={100} variant="success" showLabel />
              </div>

              <div className="bg-gray-950 rounded-lg p-4 border border-gray-800">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-5 h-5 text-purple-500" />
                    <span className="text-white font-semibold">Réponses leads</span>
                  </div>
                  <span className="text-white font-bold">128 / 150</span>
                </div>
                <Progress value={128} max={150} variant="info" showLabel />
              </div>

              <div className="bg-gray-950 rounded-lg p-4 border border-gray-800">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-yellow-500" />
                    <span className="text-white font-semibold">Temps de réponse moyen</span>
                  </div>
                  <span className="text-white font-bold">2.5h / 4h</span>
                </div>
                <Progress value={62.5} variant="success" showLabel />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
