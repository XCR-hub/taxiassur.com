import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, FileText, Inbox, ClipboardList, CheckCircle2, Send,
  CreditCard, ShieldCheck, Bell, Bot, Phone, AlertTriangle,
  TrendingUp, Mail, Clock, Target, Zap, BarChart3, Sparkles,
} from 'lucide-react';

interface PipelineStep {
  num: number;
  title: string;
  status: string;
  who: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  description: string;
}

const PIPELINE_STEPS: PipelineStep[] = [
  {
    num: 1, title: 'Nouveau lead', status: 'NOUVEAU_LEAD', who: 'Système',
    icon: Inbox, color: '#2563eb', bg: '#eff6ff',
    description: "Création automatique depuis le formulaire site, l'inbox email ou la saisie manuelle.",
  },
  {
    num: 2, title: 'Collecte documents', status: 'COLLECTE_DOCUMENTS', who: 'Prospect / Commercial',
    icon: FileText, color: '#d97706', bg: '#fffbeb',
    description: "Le prospect dépose ses pièces dans son espace. Le commercial valide ou demande des compléments.",
  },
  {
    num: 3, title: 'Saisie devis', status: 'DEVIS', who: 'Commercial',
    icon: ClipboardList, color: '#0891b2', bg: '#ecfeff',
    description: "Le commercial saisit chez les compagnies (Solly Azar, MFA, Generali, Zéphir, Plu) puis envoie au prospect.",
  },
  {
    num: 4, title: 'Décision client', status: 'DECISION_CLIENT', who: 'Prospect',
    icon: CheckCircle2, color: '#16a34a', bg: '#f0fdf4',
    description: "Le prospect accepte, refuse ou demande une modification depuis son espace dédié.",
  },
  {
    num: 5, title: 'Signature', status: 'CONTRAT_SIGNATURE', who: 'Prospect',
    icon: Send, color: '#0ea5e9', bg: '#f0f9ff',
    description: "Signature électronique du contrat depuis l'espace prospect.",
  },
  {
    num: 6, title: 'Paiement', status: 'PAIEMENT', who: 'Prospect',
    icon: CreditCard, color: '#16a34a', bg: '#f0fdf4',
    description: "Apport via Monetico puis mise en place du prélèvement mensuel.",
  },
  {
    num: 7, title: 'Client actif', status: 'CLIENT_ACTIF', who: 'Système',
    icon: ShieldCheck, color: '#16a34a', bg: '#f0fdf4',
    description: "Activation du contrat, suivi sinistres, fidélisation et opportunités de cross-sell.",
  },
];

interface AutoTask {
  icon: React.ElementType;
  title: string;
  detail: string;
  frequency: string;
  audience: 'prospect' | 'commercial';
}

const AUTOMATIONS: AutoTask[] = [
  {
    icon: Bot, title: 'Document collector IA',
    detail: "Scanne les pièces manquantes et relance le prospect avec la liste précise.",
    frequency: 'Toutes les 15 min', audience: 'prospect',
  },
  {
    icon: Mail, title: 'Relance documents quotidienne',
    detail: "Email de rappel tant que des pièces sont manquantes (max 5 envois).",
    frequency: 'Tous les jours à 10h', audience: 'prospect',
  },
  {
    icon: Send, title: 'Relance "accepter ou refuser"',
    detail: "Email avec bouton direct vers l'onglet Devis à J+3, J+7 puis J+14.",
    frequency: 'Toutes les 2h', audience: 'prospect',
  },
  {
    icon: AlertTriangle, title: 'Escalade documents bloqués',
    detail: "Notification commerciale si un lead reste +5 jours sans avancement.",
    frequency: 'Toutes les 2h', audience: 'commercial',
  },
  {
    icon: Clock, title: 'Escalade devis stagnant',
    detail: "Alerte si un devis envoyé reste +7 jours sans décision.",
    frequency: 'Toutes les 2h', audience: 'commercial',
  },
  {
    icon: Bell, title: 'Notification de refus',
    detail: "Alerte priorité haute avec le motif dès qu'un prospect refuse un devis.",
    frequency: 'Toutes les 2h', audience: 'commercial',
  },
  {
    icon: ClipboardList, title: 'Prêt pour devis',
    detail: "Alerte commerciale quand un dossier est complet et prêt à être tarifé.",
    frequency: 'Toutes les 30 min', audience: 'commercial',
  },
];

interface BestPractice {
  icon: React.ElementType;
  title: string;
  text: string;
}

const BEST_PRACTICES: BestPractice[] = [
  { icon: Bell, title: 'Vider les notifications chaque matin',
    text: "Toute alerte ignorée +48h augmente fortement le risque de perte du lead." },
  { icon: Target, title: 'Toujours soumettre plusieurs devis',
    text: "Solly Azar + 1 ou 2 alternatives augmente le taux de validation." },
  { icon: Phone, title: 'Préférer un appel à un 5e email',
    text: "Quand l'IA n'a rien obtenu après 3 relances, la voix humaine débloque." },
  { icon: Zap, title: 'Réagir aux refus en 24h',
    text: "Proposer une compagnie alternative avant que le prospect signe ailleurs." },
];

interface Kpi {
  icon: React.ElementType;
  label: string;
  description: string;
  color: string;
  bg: string;
}

const KPIS: Kpi[] = [
  { icon: FileText, label: 'Taux de complétion documents J+5',
    description: "Mesure l'efficacité de la phase 2.", color: '#d97706', bg: '#fffbeb' },
  { icon: Clock, label: 'Délai moyen de saisie devis',
    description: "Temps entre dossier complet et envoi du devis.", color: '#0891b2', bg: '#ecfeff' },
  { icon: TrendingUp, label: 'Taux d\'acceptation devis J+14',
    description: "% de prospects qui valident dans les 14 jours.", color: '#16a34a', bg: '#f0fdf4' },
  { icon: BarChart3, label: 'Motifs de refus fréquents',
    description: "Champ refusal_reason agrégé sur 30 jours.", color: '#dc2626', bg: '#fef2f2' },
];

export default function WorkflowGuide() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f0f2f5] dark:bg-[#0b0d12]">
      <div className="max-w-[1400px] mx-auto p-5 md:p-8 space-y-8">

        <div
          className="rounded-3xl px-8 py-10 shadow-xl border border-black/10 relative overflow-hidden"
          style={{ background: 'linear-gradient(145deg, #111318 0%, #161b22 60%, #111318 100%)' }}
        >
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-500" />
          <button
            onClick={() => navigate('/backoffice')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour au tableau de bord
          </button>
          <div className="flex items-start gap-4">
            <div className="p-3 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-2xl shadow-md shadow-yellow-900/30">
              <Sparkles className="w-7 h-7 text-black" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-2">
                Workflow commercial TaxiAssur
              </h1>
              <p className="text-gray-400 text-base max-w-2xl leading-relaxed">
                Le pipeline complet de la création du lead à l'activation du client.
                Découvrez ce que le système automatise et où votre intervention fait la différence.
              </p>
            </div>
          </div>
        </div>

        <section>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-1 h-8 bg-gradient-to-b from-yellow-400 to-amber-500 rounded-full" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Le pipeline en 7 étapes</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {PIPELINE_STEPS.map((step) => (
              <div
                key={step.num}
                className="bg-white dark:bg-[#161b22] rounded-2xl border border-gray-200 dark:border-white/[0.08] shadow-sm p-5 hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm"
                    style={{ background: step.bg }}
                  >
                    <step.icon size={22} style={{ color: step.color }} />
                  </div>
                  <span className="text-3xl font-bold text-gray-200 dark:text-gray-700 tabular-nums">
                    {String(step.num).padStart(2, '0')}
                  </span>
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">{step.title}</h3>
                <p className="text-xs font-mono text-gray-400 dark:text-gray-500 mb-3">{step.status}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-3">{step.description}</p>
                <div className="pt-3 border-t border-gray-100 dark:border-white/[0.06]">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Acteur · </span>
                  <span className="text-xs font-semibold" style={{ color: step.color }}>{step.who}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-1 h-8 bg-gradient-to-b from-cyan-400 to-cyan-600 rounded-full" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Ce que le système fait pour vous</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {AUTOMATIONS.map((task) => {
              const isProspect = task.audience === 'prospect';
              return (
                <div
                  key={task.title}
                  className="bg-white dark:bg-[#161b22] rounded-2xl border border-gray-200 dark:border-white/[0.08] shadow-sm p-5 hover:shadow-md transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                      style={{ background: isProspect ? '#ecfeff' : '#fffbeb' }}
                    >
                      <task.icon size={22} style={{ color: isProspect ? '#0891b2' : '#d97706' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">{task.title}</h3>
                        <span
                          className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                          style={{
                            background: isProspect ? '#ecfeff' : '#fffbeb',
                            color: isProspect ? '#0891b2' : '#d97706',
                          }}
                        >
                          {isProspect ? 'Prospect' : 'Commercial'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-2">{task.detail}</p>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-500">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{task.frequency}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-1 h-8 bg-gradient-to-b from-green-400 to-green-600 rounded-full" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Vos points d'intervention</h2>
          </div>
          <div className="bg-white dark:bg-[#161b22] rounded-2xl border border-gray-200 dark:border-white/[0.08] shadow-sm overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100 dark:divide-white/[0.06]">
              <div className="p-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: '#fffbeb' }}>
                  <FileText size={20} style={{ color: '#d97706' }} />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">Étape 2 — Collecte</h3>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li>Vérifier la qualité des pièces dans le panier documents</li>
                  <li>Appel obligatoire après 3 relances email sans retour</li>
                  <li>Sur alerte "+5 jours" → action immédiate</li>
                </ul>
              </div>
              <div className="p-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: '#ecfeff' }}>
                  <ClipboardList size={20} style={{ color: '#0891b2' }} />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">Étape 3 — Saisie devis</h3>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li>Soumettre chez plusieurs compagnies en parallèle</li>
                  <li>Renseigner options Solly Azar, prime mensuelle, frais de dossier</li>
                  <li>Envoyer au prospect via le bouton dédié</li>
                </ul>
              </div>
              <div className="p-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: '#f0fdf4' }}>
                  <CheckCircle2 size={20} style={{ color: '#16a34a' }} />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">Étape 4 — Décision</h3>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li>Traiter les demandes de modification dans la journée</li>
                  <li>Sur alerte "+7 jours" → appel pour débloquer</li>
                  <li>Sur refus → proposer une alternative en 24h</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-1 h-8 bg-gradient-to-b from-orange-400 to-orange-600 rounded-full" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Indicateurs à suivre</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {KPIS.map((kpi) => (
              <div
                key={kpi.label}
                className="bg-white dark:bg-[#161b22] rounded-2xl border border-gray-200 dark:border-white/[0.08] shadow-sm p-5"
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3" style={{ background: kpi.bg }}>
                  <kpi.icon size={20} style={{ color: kpi.color }} />
                </div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1.5 leading-snug">{kpi.label}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{kpi.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-1 h-8 bg-gradient-to-b from-yellow-400 to-amber-500 rounded-full" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Bonnes pratiques</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {BEST_PRACTICES.map((bp) => (
              <div
                key={bp.title}
                className="bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-500/[0.04] dark:to-amber-500/[0.04] rounded-2xl border border-yellow-200/60 dark:border-yellow-500/[0.15] p-5"
              >
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-white dark:bg-[#161b22] flex items-center justify-center shadow-sm shrink-0">
                    <bp.icon size={20} style={{ color: '#d97706' }} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white mb-1.5">{bp.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{bp.text}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div
          className="rounded-3xl px-8 py-8 shadow-xl border border-black/10 relative overflow-hidden"
          style={{ background: 'linear-gradient(145deg, #111318 0%, #161b22 60%, #111318 100%)' }}
        >
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-500" />
          <p className="text-gray-400 text-sm leading-relaxed max-w-3xl">
            Le système travaille pour vous 24h/24. Votre valeur ajoutée :
            <span className="text-white font-semibold"> les appels au bon moment </span>
            signalés par les alertes, et la
            <span className="text-white font-semibold"> qualité de saisie </span>
            des devis.
          </p>
        </div>

      </div>
    </div>
  );
}
