import React, { useState } from 'react';
import { toast } from '@/lib/toast';
import {
  CheckCircle,
  X,
  Send,
  MessageSquare,
  FileText,
  AlertCircle,
  ArrowRight,
  Phone,
  Mail,
  Upload,
  Clock,
  Loader2
} from 'lucide-react';
import { PipelineStatus, PIPELINE_STATUSES } from '@/lib/crm-pipeline';
import { supabase } from '@/lib/supabase';

interface WorkflowAction {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  variant: 'success' | 'warning' | 'primary' | 'secondary';
  nextStatus?: PipelineStatus;
  requiresNote?: boolean;
  emailTemplate?: {
    subject: string;
    body: string;
  };
}

interface WorkflowStage {
  title: string;
  description: string;
  actions: WorkflowAction[];
  tips: string[];
}

const WORKFLOW_BY_STATUS: Record<PipelineStatus, WorkflowStage> = {
  NEW_LEAD: {
    title: '📞 Contact Téléphonique Initial',
    description: 'Première prise de contact avec le prospect sous 15 minutes',
    actions: [
      {
        id: 'call_answered',
        label: 'Appel effectué - Prospect joignable',
        description: 'Le prospect a répondu, entretien confirmé',
        icon: <CheckCircle className="w-5 h-5" />,
        variant: 'success',
        nextStatus: 'CONTACT_CONFIRMED',
        requiresNote: true,
        emailTemplate: {
          subject: 'Confirmation de notre entretien - Documents requis',
          body: `Bonjour {first_name},

Suite à notre échange téléphonique de ce jour, je vous confirme votre demande de devis pour votre assurance taxi.

✅ Vos informations enregistrées
📞 Contact confirmé
🎯 Prochaine étape : réception de vos documents

Pour établir votre devis personnalisé sous 24h, merci de nous transmettre :
• Licence de taxi professionnelle
• Permis de conduire (recto-verso)
• Pièce d'identité
• Carte grise du véhicule
• Relevé d'information assurance
• Autorisation de stationnement
• RIB

Vous pouvez les envoyer via votre espace personnel : {prospect_link}
Ou directement par email en répondant à ce message.

Je reste à votre disposition pour toute question.

Cordialement,
L'équipe TaxiAssur
01 80 85 57 86`
        }
      },
      {
        id: 'call_no_answer',
        label: 'Appel effectué - Sans réponse',
        description: 'Messagerie/pas de réponse',
        icon: <AlertCircle className="w-5 h-5" />,
        variant: 'warning',
        nextStatus: 'CONTACT_ATTEMPTED',
        requiresNote: true,
        emailTemplate: {
          subject: 'Nous avons essayé de vous joindre - TaxiAssur',
          body: `Bonjour {first_name},

Nous avons essayé de vous joindre ce jour concernant votre demande de devis pour votre assurance taxi, sans succès.

Pour accélérer le traitement de votre dossier, vous pouvez :
📞 Nous rappeler au 01 80 85 57 86
📧 Répondre à cet email pour convenir d'un rendez-vous
📤 Transmettre vos documents via votre espace personnel : {prospect_link}

Documents nécessaires :
✓ Licence taxi + Permis + Pièce d'identité
✓ Carte grise + Relevé d'information
✓ Autorisation stationnement + RIB

Notre équipe reste à votre disposition.

Cordialement,
L'équipe TaxiAssur`
        }
      }
    ],
    tips: [
      'Appeler dans les 15 minutes suivant la demande',
      'Qualifier le besoin : type de taxi, ville, expérience',
      'Confirmer l\'email et le numéro de téléphone',
      'Expliquer le processus : docs → devis → signature'
    ]
  },

  CONTACT_ATTEMPTED: {
    title: '🔄 Relance - Contact en attente',
    description: 'Le prospect n\'a pas répondu au premier appel',
    actions: [
      {
        id: 'retry_call_success',
        label: 'Nouvel appel - Prospect joignable',
        description: 'Le prospect a répondu cette fois',
        icon: <CheckCircle className="w-5 h-5" />,
        variant: 'success',
        nextStatus: 'CONTACT_CONFIRMED',
        requiresNote: true
      },
      {
        id: 'docs_received_no_call',
        label: 'Documents reçus sans appel',
        description: 'Le prospect a envoyé ses documents',
        icon: <Upload className="w-5 h-5" />,
        variant: 'success',
        nextStatus: 'DOCUMENTS_REQUIRED',
        requiresNote: false
      },
      {
        id: 'send_reminder',
        label: 'Envoyer email de relance',
        description: 'Relancer par email automatiquement',
        icon: <Send className="w-5 h-5" />,
        variant: 'primary',
        requiresNote: false,
        emailTemplate: {
          subject: '⏰ Votre devis assurance taxi en attente - TaxiAssur',
          body: `Bonjour {first_name},

Nous n'avons pas réussi à vous joindre concernant votre demande de devis assurance taxi à {city}.

⚡ ACCÉLÉREZ VOTRE DEVIS
Gagnez du temps en nous transmettant directement vos documents via votre espace personnel :
{prospect_link}

📋 Documents requis (7 pièces) :
✓ Licence taxi
✓ Permis de conduire
✓ Pièce d'identité
✓ Carte grise
✓ Relevé d'information
✓ Autorisation stationnement
✓ RIB

Une fois vos documents reçus : devis sous 24h ! ⚡

Vous préférez qu'on vous rappelle ? Répondez à cet email avec vos disponibilités.

L'équipe TaxiAssur
01 80 85 57 86`
        }
      }
    ],
    tips: [
      'Relancer par téléphone à différents horaires',
      'Envoyer un email de relance après 24h',
      'Vérifier si les documents ont été uploadés',
      'Proposer un rappel à un horaire précis'
    ]
  },

  CONTACT_CONFIRMED: {
    title: '📄 Documents Demandés',
    description: 'Le prospect est qualifié, en attente des documents',
    actions: [
      {
        id: 'docs_sent_email',
        label: 'Email documents demandés envoyé',
        description: 'Confirmation envoi demande documents',
        icon: <Send className="w-5 h-5" />,
        variant: 'primary',
        nextStatus: 'DOCUMENTS_REQUIRED',
        requiresNote: false,
        emailTemplate: {
          subject: '📋 Liste des documents pour votre devis taxi',
          body: `Bonjour {first_name},

Comme convenu lors de notre échange, voici la liste complète des documents à nous transmettre pour établir votre devis :

📤 UPLOADEZ VOS DOCUMENTS EN 2 MIN
Accédez à votre espace personnel sécurisé :
{prospect_link}

📋 DOCUMENTS REQUIS (7 pièces)

1️⃣ Licence de taxi professionnelle (en cours de validité)
2️⃣ Permis de conduire (recto-verso, lisible)
3️⃣ Pièce d'identité (CNI ou passeport valide)
4️⃣ Carte grise du véhicule
5️⃣ Relevé d'information assurance (historique sinistres)
6️⃣ Autorisation de stationnement préfectorale
7️⃣ RIB (pour le prélèvement)

⏱️ DÉLAI : Devis sous 24h après réception complète

💬 Besoin d'aide ? Contactez-nous :
📞 01 80 85 57 86
📧 team@taxiassur.com

Cordialement,
L'équipe TaxiAssur`
        }
      }
    ],
    tips: [
      'Envoyer immédiatement l\'email avec la liste des documents',
      'Vérifier régulièrement l\'espace prospect',
      'Relancer après 48h si aucun document reçu'
    ]
  },

  DOCUMENTS_REQUIRED: {
    title: '⏳ En attente des documents',
    description: 'Documents demandés, en attente de réception',
    actions: [
      {
        id: 'docs_partial_received',
        label: 'Documents partiels reçus',
        description: 'Quelques documents reçus, pas tous',
        icon: <FileText className="w-5 h-5" />,
        variant: 'warning',
        nextStatus: 'DOCUMENTS_PARTIAL',
        requiresNote: false
      },
      {
        id: 'docs_complete',
        label: 'Tous les documents reçus',
        description: 'Dossier complet, prêt pour devis',
        icon: <CheckCircle className="w-5 h-5" />,
        variant: 'success',
        nextStatus: 'READY_FOR_QUOTE',
        requiresNote: false
      },
      {
        id: 'remind_docs',
        label: 'Relancer pour les documents',
        description: 'Envoyer un rappel',
        icon: <Clock className="w-5 h-5" />,
        variant: 'secondary',
        requiresNote: false,
        emailTemplate: {
          subject: '⏰ Documents en attente pour votre devis taxi',
          body: `Bonjour {first_name},

Nous n'avons pas encore reçu les documents nécessaires pour établir votre devis assurance taxi.

⚡ OBTENEZ VOTRE DEVIS SOUS 24H
Uploadez vos documents maintenant :
{prospect_link}

📋 Documents requis :
✓ Licence taxi
✓ Permis de conduire
✓ Pièce d'identité
✓ Carte grise
✓ Relevé d'information
✓ Autorisation stationnement
✓ RIB

💡 Vous pouvez aussi nous les envoyer par email en répondant à ce message.

Des questions ? Appelez-nous au 01 80 85 57 86

L'équipe TaxiAssur`
        }
      }
    ],
    tips: [
      'Relancer par email après 48h',
      'Appeler le prospect après 72h',
      'Vérifier l\'espace prospect régulièrement',
      'Proposer d\'envoyer les docs par email si besoin'
    ]
  },

  DOCUMENTS_PARTIAL: {
    title: '📄 Documents Partiels',
    description: 'Certains documents reçus, d\'autres manquants',
    actions: [
      {
        id: 'remind_missing_docs',
        label: 'Relancer pièces manquantes',
        description: 'Email listant les docs manquants',
        icon: <Mail className="w-5 h-5" />,
        variant: 'warning',
        requiresNote: false,
        emailTemplate: {
          subject: '📋 Documents manquants pour votre devis taxi',
          body: `Bonjour {first_name},

Merci pour les documents déjà transmis ! ✅

Il nous manque encore quelques pièces pour finaliser votre devis :

{missing_docs_list}

📤 COMPLÉTEZ VOTRE DOSSIER
Accédez à votre espace : {prospect_link}

⏱️ Dès réception : devis sous 24h garanti !

Besoin d'aide ? 01 80 85 57 86

Cordialement,
L'équipe TaxiAssur`
        }
      },
      {
        id: 'docs_completed',
        label: 'Tous les documents reçus',
        description: 'Dossier désormais complet',
        icon: <CheckCircle className="w-5 h-5" />,
        variant: 'success',
        nextStatus: 'READY_FOR_QUOTE',
        requiresNote: false
      }
    ],
    tips: [
      'Lister précisément les documents manquants',
      'Préciser les documents déjà reçus pour rassurer',
      'Proposer un appel pour clarifier si nécessaire'
    ]
  },

  READY_FOR_QUOTE: {
    title: '🎯 Prêt pour Devis',
    description: 'Tous les documents sont reçus, création du devis',
    actions: [
      {
        id: 'quote_sent',
        label: 'Devis envoyé au client',
        description: 'Devis créé et envoyé par email',
        icon: <Send className="w-5 h-5" />,
        variant: 'success',
        nextStatus: 'QUOTE_SENT',
        requiresNote: true,
        emailTemplate: {
          subject: '🎉 Votre devis assurance taxi personnalisé',
          body: `Bonjour {first_name},

Excellente nouvelle ! Votre devis assurance taxi est prêt ! 🎉

💰 VOTRE TARIF PERSONNALISÉ
Voir le devis : {prospect_link}

✅ Couverture complète incluse
🚕 Assurance adaptée aux taxis professionnels
💳 Paiement mensuel ou comptant
⚡ Activation rapide sous 24h

📞 QUESTIONS SUR VOTRE DEVIS ?
Appelez-nous au 01 80 85 57 86
Notre équipe est à votre disposition.

👉 PROCHAINE ÉTAPE
Pour valider votre contrat :
1. Consultez votre devis
2. Signez électroniquement
3. Effectuez le paiement

Activez votre assurance dès aujourd'hui !

Cordialement,
L'équipe TaxiAssur`
        }
      }
    ],
    tips: [
      'Créer le devis dans les 24h maximum',
      'Comparer plusieurs compagnies pour le meilleur tarif',
      'Appeler le client pour présenter le devis',
      'Envoyer le devis par email et dans l\'espace prospect'
    ]
  },

  QUOTE_SENT: {
    title: '📨 Devis Envoyé',
    description: 'En attente de la réponse du prospect',
    actions: [
      {
        id: 'quote_accepted',
        label: 'Devis accepté - Demander signature',
        description: 'Le prospect accepte, passer à la signature',
        icon: <CheckCircle className="w-5 h-5" />,
        variant: 'success',
        nextStatus: 'SIGNATURE_PENDING',
        requiresNote: false
      },
      {
        id: 'no_response_yet',
        label: 'Aucune réponse',
        description: 'Pas de retour du prospect',
        icon: <AlertCircle className="w-5 h-5" />,
        variant: 'warning',
        nextStatus: 'NO_RESPONSE',
        requiresNote: false
      },
      {
        id: 'remind_quote',
        label: 'Relancer sur le devis',
        description: 'Envoyer un rappel',
        icon: <Clock className="w-5 h-5" />,
        variant: 'secondary',
        requiresNote: false,
        emailTemplate: {
          subject: '❓ Avez-vous des questions sur votre devis ?',
          body: `Bonjour {first_name},

J'espère que vous avez bien reçu votre devis assurance taxi.

Avez-vous eu l'occasion de le consulter ?
Des questions sur les garanties ou le tarif ?

📄 Consultez votre devis : {prospect_link}

💬 Je suis disponible pour :
• Vous expliquer les garanties en détail
• Ajuster votre devis si besoin
• Vous accompagner dans la souscription

📞 Appelez-moi : 01 80 85 57 86
Ou répondez à cet email, je vous rappelle.

Cordialement,
L'équipe TaxiAssur`
        }
      }
    ],
    tips: [
      'Appeler le prospect 2h après l\'envoi du devis',
      'Relancer par email après 48h',
      'Être disponible pour répondre aux questions',
      'Proposer d\'ajuster le devis si besoin'
    ]
  },

  NO_RESPONSE: {
    title: '❓ Sans Réponse',
    description: 'Le prospect ne répond plus',
    actions: [
      {
        id: 'activate_relance',
        label: 'Activer relance automatique',
        description: 'Campagne de relance sur 7 jours',
        icon: <Clock className="w-5 h-5" />,
        variant: 'warning',
        nextStatus: 'RELANCE_ACTIVE',
        requiresNote: false
      },
      {
        id: 'mark_lost',
        label: 'Marquer comme perdu',
        description: 'Abandonner ce prospect',
        icon: <X className="w-5 h-5" />,
        variant: 'secondary',
        nextStatus: 'CLIENT_LOST',
        requiresNote: true
      }
    ],
    tips: [
      'Tenter plusieurs canaux : téléphone, email, SMS',
      'Varier les horaires d\'appel',
      'Proposer un nouveau créneau d\'appel',
      'Ne pas abandonner trop vite'
    ]
  },

  RELANCE_ACTIVE: {
    title: '🔔 Relance Active',
    description: 'Campagne de relance en cours',
    actions: [
      {
        id: 'prospect_responded',
        label: 'Le prospect a répondu',
        description: 'Retour au devis',
        icon: <CheckCircle className="w-5 h-5" />,
        variant: 'success',
        nextStatus: 'QUOTE_SENT',
        requiresNote: true
      },
      {
        id: 'still_no_response',
        label: 'Toujours sans réponse',
        description: 'Marquer comme perdu',
        icon: <X className="w-5 h-5" />,
        variant: 'secondary',
        nextStatus: 'CLIENT_LOST',
        requiresNote: true
      }
    ],
    tips: [
      'Laisser 7 jours de relance automatique',
      'Tenter un dernier appel personnel',
      'Proposer un avantage (remise) si pertinent'
    ]
  },

  SIGNATURE_PENDING: {
    title: '✍️ Signature en Attente',
    description: 'Le contrat attend la signature électronique',
    actions: [
      {
        id: 'contract_signed',
        label: 'Contrat signé',
        description: 'Signature électronique reçue',
        icon: <CheckCircle className="w-5 h-5" />,
        variant: 'success',
        nextStatus: 'SIGNED',
        requiresNote: false
      },
      {
        id: 'remind_signature',
        label: 'Relancer pour signature',
        description: 'Rappel signature en attente',
        icon: <Clock className="w-5 h-5" />,
        variant: 'warning',
        requiresNote: false,
        emailTemplate: {
          subject: '✍️ Votre signature est attendue - TaxiAssur',
          body: `Bonjour {first_name},

Votre contrat d'assurance taxi est prêt pour signature !

✍️ SIGNEZ EN 2 MINUTES
Accédez à votre espace : {prospect_link}

Une fois signé, votre assurance sera active sous 24h.

Des questions ? 01 80 85 57 86

Cordialement,
L'équipe TaxiAssur`
        }
      }
    ],
    tips: [
      'Vérifier que le lien de signature fonctionne',
      'Appeler pour expliquer le processus si besoin',
      'Relancer après 24h'
    ]
  },

  SIGNED: {
    title: '✅ Contrat Signé',
    description: 'En attente du paiement',
    actions: [
      {
        id: 'require_down_payment',
        label: 'Paiement comptant requis',
        description: 'Créer lien paiement CIC Comptant',
        icon: <Send className="w-5 h-5" />,
        variant: 'primary',
        nextStatus: 'DOWN_PAYMENT_REQUIRED',
        requiresNote: false
      },
      {
        id: 'monthly_payment',
        label: 'Paiement mensuel',
        description: 'Mandat de prélèvement',
        icon: <Clock className="w-5 h-5" />,
        variant: 'secondary',
        nextStatus: 'PAYMENT_PENDING',
        requiresNote: false
      }
    ],
    tips: [
      'Proposer les 2 options de paiement',
      'Expliquer les avantages du paiement comptant',
      'Envoyer le lien de paiement immédiatement'
    ]
  },

  DOWN_PAYMENT_REQUIRED: {
    title: '💳 Paiement Comptant en Attente',
    description: 'Le client doit effectuer le paiement comptant',
    actions: [
      {
        id: 'payment_received',
        label: 'Paiement reçu',
        description: 'Paiement confirmé, activer le contrat',
        icon: <CheckCircle className="w-5 h-5" />,
        variant: 'success',
        nextStatus: 'ACTIVE_CLIENT',
        requiresNote: false
      },
      {
        id: 'remind_payment',
        label: 'Relancer pour le paiement',
        description: 'Rappel paiement en attente',
        icon: <Clock className="w-5 h-5" />,
        variant: 'warning',
        requiresNote: false
      }
    ],
    tips: [
      'Vérifier le statut du paiement régulièrement',
      'Relancer après 24h si pas de paiement',
      'Proposer de l\'aide en cas de problème'
    ]
  },

  PAYMENT_PENDING: {
    title: '💰 Paiement Mensuel en Attente',
    description: 'Mandat de prélèvement en attente',
    actions: [
      {
        id: 'mandate_signed',
        label: 'Mandat signé',
        description: 'Activer le client',
        icon: <CheckCircle className="w-5 h-5" />,
        variant: 'success',
        nextStatus: 'ACTIVE_CLIENT',
        requiresNote: false
      }
    ],
    tips: [
      'Vérifier la signature du mandat',
      'Confirmer le prélèvement avec la banque'
    ]
  },

  ACTIVE_CLIENT: {
    title: '🎉 Client Actif',
    description: 'Contrat actif, client assuré',
    actions: [
      {
        id: 'send_welcome',
        label: 'Envoyer email bienvenue',
        description: 'Confirmer activation du contrat',
        icon: <Send className="w-5 h-5" />,
        variant: 'success',
        requiresNote: false
      }
    ],
    tips: [
      'Envoyer les documents d\'assurance',
      'Planifier un suivi à 3 mois',
      'Proposer des services complémentaires'
    ]
  },

  CROSS_SELLING: {
    title: '🎁 Opportunité Cross-sell',
    description: 'Proposer des assurances complémentaires',
    actions: [],
    tips: []
  },

  RISK_CHURN: {
    title: '⚠️ Risque de Churn',
    description: 'Client à risque de départ',
    actions: [],
    tips: []
  },

  CLIENT_LOST: {
    title: '❌ Client Perdu',
    description: 'Prospect/client perdu définitivement',
    actions: [],
    tips: []
  },

  LOST_RECONTACT_SCHEDULED: {
    title: '📅 Recontact Programmé',
    description: 'Relance programmée dans le futur',
    actions: [],
    tips: []
  },

  SINISTER: {
    title: '🚨 Sinistre en Cours',
    description: 'Gestion d\'un sinistre',
    actions: [],
    tips: []
  },

  ATTESTATION_REQUEST: {
    title: '📜 Demande d\'Attestation',
    description: 'Le client demande une attestation',
    actions: [],
    tips: []
  },

  SUPPORT_ASSISTANCE: {
    title: '💬 Assistance',
    description: 'Demande d\'assistance du client',
    actions: [],
    tips: []
  },

  // 🎯 NOUVEAUX STATUTS DU PIPELINE 2026
  NOUVEAU_LEAD: {
    title: '🆕 Nouveau Lead',
    description: 'Demande reçue via site web, email ou téléphone',
    actions: [
      {
        id: 'first_contact',
        label: 'Premier contact effectué',
        description: 'Contacter le lead sous 15 minutes',
        icon: <Phone className="w-5 h-5" />,
        variant: 'success',
        nextStatus: 'COLLECTE_DOCUMENTS',
        requiresNote: true
      }
    ],
    tips: [
      'Contacter le prospect dans les 15 minutes',
      'Qualifier le besoin et noter les informations',
      'Expliquer les prochaines étapes'
    ]
  },

  COLLECTE_DOCUMENTS: {
    title: '📋 Collecte de Documents',
    description: 'En attente des documents obligatoires et complémentaires',
    actions: [
      {
        id: 'docs_complete',
        label: 'Documents complets reçus',
        description: 'Tous les documents sont validés',
        icon: <CheckCircle className="w-5 h-5" />,
        variant: 'success',
        nextStatus: 'DEVIS',
        requiresNote: false
      },
      {
        id: 'remind_docs',
        label: 'Relancer pour documents',
        description: 'Envoyer un rappel au prospect',
        icon: <Clock className="w-5 h-5" />,
        variant: 'warning',
        requiresNote: false,
        emailTemplate: {
          subject: '📋 Documents en attente pour votre devis assurance taxi',
          body: `Bonjour {first_name},

Nous n'avons pas encore reçu tous les documents nécessaires pour établir votre devis assurance taxi.

⚡ OBTENEZ VOTRE DEVIS SOUS 24H
Uploadez vos documents maintenant via votre espace personnel sécurisé :
{prospect_link}

📋 Documents requis (7 pièces) :
✓ Licence taxi professionnelle
✓ Permis de conduire (recto-verso)
✓ Pièce d'identité (CNI ou passeport)
✓ Carte grise du véhicule
✓ Relevé d'information assurance
✓ Autorisation de stationnement
✓ RIB (pour le prélèvement)

💡 Vous pouvez aussi nous les envoyer par email en répondant directement à ce message.

📞 Besoin d'aide ? Contactez-nous au 01 80 85 57 86

Nous sommes là pour vous accompagner !

Cordialement,
L'équipe TaxiAssur
01 80 85 57 86`
        }
      }
    ],
    tips: [
      'Vérifier l\'espace prospect régulièrement',
      'Relancer après 48h sans documents',
      'Aider le prospect si besoin'
    ]
  },

  DEVIS: {
    title: '📨 Devis Envoyé',
    description: 'Devis personnalisé envoyé avec documents fixes (DG, IPID)',
    actions: [
      {
        id: 'quote_accepted',
        label: 'Devis accepté',
        description: 'Le client accepte l\'offre',
        icon: <CheckCircle className="w-5 h-5" />,
        variant: 'success',
        nextStatus: 'DECISION_CLIENT',
        requiresNote: false
      },
      {
        id: 'follow_up',
        label: 'Relancer le client',
        description: 'Rappeler pour discuter du devis',
        icon: <Phone className="w-5 h-5" />,
        variant: 'primary',
        requiresNote: false
      }
    ],
    tips: [
      'Appeler 2h après l\'envoi du devis',
      'Être disponible pour les questions',
      'Proposer des ajustements si besoin'
    ]
  },

  DECISION_CLIENT: {
    title: '🤔 Décision Client',
    description: 'Accepté ✓ / Refusé ✗ / Inactif ⏳',
    actions: [
      {
        id: 'proceed_payment',
        label: 'Passer au paiement',
        description: 'Le client est prêt à payer',
        icon: <CheckCircle className="w-5 h-5" />,
        variant: 'success',
        nextStatus: 'PAIEMENT',
        requiresNote: false
      },
      {
        id: 'mark_inactive',
        label: 'Marquer inactif',
        description: 'Pas de réponse du client',
        icon: <Clock className="w-5 h-5" />,
        variant: 'warning',
        nextStatus: 'RELANCE',
        requiresNote: true
      }
    ],
    tips: [
      'Être réactif aux questions du client',
      'Rassurer sur les garanties',
      'Faciliter la signature et le paiement'
    ]
  },

  PAIEMENT: {
    title: '💰 Paiement',
    description: 'CB ou Prélèvement (compagnie ou TaxiAssur)',
    actions: [
      {
        id: 'payment_confirmed',
        label: 'Paiement confirmé',
        description: 'Passer à la signature',
        icon: <CheckCircle className="w-5 h-5" />,
        variant: 'success',
        nextStatus: 'CONTRAT_SIGNATURE',
        requiresNote: false
      }
    ],
    tips: [
      'Vérifier le paiement rapidement',
      'Envoyer la confirmation',
      'Préparer les documents de signature'
    ]
  },

  CONTRAT_SIGNATURE: {
    title: '✍️ Contrat & Signature',
    description: 'Signature électronique + documents complémentaires',
    actions: [
      {
        id: 'contract_signed',
        label: 'Contrat signé',
        description: 'Activer le client',
        icon: <CheckCircle className="w-5 h-5" />,
        variant: 'success',
        nextStatus: 'CLIENT_ACTIF',
        requiresNote: false
      }
    ],
    tips: [
      'S\'assurer que la signature est valide',
      'Envoyer les documents finaux',
      'Préparer l\'accès espace client'
    ]
  },

  CLIENT_ACTIF: {
    title: '🎉 Client Actif',
    description: 'Contrat actif - Accès espace client',
    actions: [
      {
        id: 'send_welcome',
        label: 'Envoyer email de bienvenue',
        description: 'Confirmer l\'activation',
        icon: <Send className="w-5 h-5" />,
        variant: 'success',
        requiresNote: false
      }
    ],
    tips: [
      'Envoyer les accès espace client',
      'Fournir les documents d\'assurance',
      'Planifier un suivi à 3 mois'
    ]
  },

  RELANCE: {
    title: '🔔 Relance Nécessaire',
    description: 'Relance suite à inactivité',
    actions: [
      {
        id: 'recontact_success',
        label: 'Client recontacté',
        description: 'Retour au processus',
        icon: <CheckCircle className="w-5 h-5" />,
        variant: 'success',
        requiresNote: true
      }
    ],
    tips: [
      'Essayer différents canaux',
      'Proposer un avantage',
      'Être persévérant mais respectueux'
    ]
  },

  PERDU: {
    title: '❌ Perdu Définitif',
    description: 'Lead perdu, fin du processus',
    actions: [],
    tips: ['Analyser les raisons', 'Améliorer le processus']
  },

  RECONTACT_PROGRAMME: {
    title: '📅 Recontact Programmé',
    description: 'Recontact futur planifié',
    actions: [],
    tips: ['Respecter la date de recontact', 'Préparer l\'approche']
  }
};

interface Props {
  leadId: string;
  currentStatus: PipelineStatus;
  leadData: {
    first_name?: string;
    last_name?: string;
    email: string;
    phone: string;
    city?: string;
    access_token?: string;
  };
  onStatusChange: () => void;
}

export const DynamicCommercialWorkflow: React.FC<Props> = ({
  leadId,
  currentStatus,
  leadData,
  onStatusChange
}) => {
  const [loading, setLoading] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [showNoteInput, setShowNoteInput] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [nextStepHint, setNextStepHint] = useState<string | null>(null);

  const workflow = WORKFLOW_BY_STATUS[currentStatus];
  const statusInfo = PIPELINE_STATUSES[currentStatus];

  // Protection: si le workflow n'existe pas pour ce statut, ne rien afficher
  if (!workflow || !statusInfo) {
    return null;
  }

  const handleAction = async (action: WorkflowAction) => {
    if (action.requiresNote && !showNoteInput) {
      setShowNoteInput(action.id);
      return;
    }

    setLoading(true);

    try {
      // Add note if required
      if (action.requiresNote && noteText.trim()) {
        await supabase.from('crm_interactions').insert({
          lead_id: leadId,
          type: 'note',
          content: noteText,
          direction: 'internal'
        });
      }

      // Send email if template exists
      if (action.emailTemplate) {
        const prospectLink = leadData.access_token
          ? `https://taxiassur.com/espace-prospect/${leadData.access_token}`
          : '';

        const emailBody = action.emailTemplate.body
          .replace(/{first_name}/g, leadData.first_name || leadData.email.split('@')[0])
          .replace(/{last_name}/g, leadData.last_name || '')
          .replace(/{city}/g, leadData.city || '')
          .replace(/{prospect_link}/g, prospectLink);

        await supabase.functions.invoke('send-crm-email', {
          body: {
            to: leadData.email,
            subject: action.emailTemplate.subject,
            body: emailBody,
            leadId
          }
        });

        // Log interaction
        await supabase.from('crm_interactions').insert({
          lead_id: leadId,
          type: 'email',
          subject: action.emailTemplate.subject,
          content: emailBody,
          direction: 'outbound',
          to_email: leadData.email
        });
      }

      // Change status if needed
      if (action.nextStatus) {
        await supabase
          .from('crm_leads')
          .update({
            status: action.nextStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', leadId);

        // Log status change
        await supabase.from('crm_timeline').insert({
          lead_id: leadId,
          event_type: 'status_change',
          title: `Statut changé : ${PIPELINE_STATUSES[action.nextStatus].label}`,
          metadata: {
            from_status: currentStatus,
            to_status: action.nextStatus,
            action: action.label
          }
        });
      }

      setNoteText('');
      setShowNoteInput(null);

      // Show success message
      setSuccessMessage(`✅ Action "${action.label}" exécutée avec succès !`);

      // Show next step hint
      if (action.nextStatus) {
        const nextWorkflow = WORKFLOW_BY_STATUS[action.nextStatus];
        if (nextWorkflow && nextWorkflow.actions.length > 0) {
          setNextStepHint(`📍 Prochaine étape : ${nextWorkflow.title}`);
        }
      }

      // Clear messages after 5 seconds
      setTimeout(() => {
        setSuccessMessage(null);
        setNextStepHint(null);
      }, 5000);

      // Reload lead data to show new workflow
      onStatusChange();
    } catch (error) {
      console.error('Error executing action:', error);
      toast.error('❌ Erreur lors de l\'exécution de l\'action : ' + (error instanceof Error ? error.message : 'Erreur inconnue'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
      {/* Success Message */}
      {successMessage && (
        <div className="mb-4 p-4 bg-green-50 border-2 border-green-500 rounded-lg animate-pulse">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-green-900">{successMessage}</p>
              {nextStepHint && (
                <p className="text-sm text-green-700 mt-1">{nextStepHint}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Current Stage Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">{statusInfo.icon}</span>
          <div>
            <h3 className="text-xl font-bold text-gray-900">{workflow.title}</h3>
            <p className="text-sm text-gray-600">{workflow.description}</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      {workflow.actions.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Actions Rapides</h4>
          <div className="space-y-3">
            {workflow.actions.map((action) => (
              <div key={action.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div
                      className={`
                        p-2 rounded-lg
                        ${action.variant === 'success' ? 'bg-green-100 text-green-700' : ''}
                        ${action.variant === 'warning' ? 'bg-amber-100 text-amber-700' : ''}
                        ${action.variant === 'primary' ? 'bg-blue-100 text-blue-700' : ''}
                        ${action.variant === 'secondary' ? 'bg-gray-100 text-gray-700' : ''}
                      `}
                    >
                      {action.icon}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 mb-1">{action.label}</div>
                      <div className="text-sm text-gray-600 mb-2">{action.description}</div>

                      {showNoteInput === action.id && (
                        <div className="mt-3">
                          <textarea
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            placeholder="Ajoutez une note sur cette action..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            rows={3}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleAction(action)}
                    disabled={loading || (action.requiresNote && showNoteInput === action.id && !noteText.trim())}
                    className={`
                      px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap
                      flex items-center gap-2 transition-all
                      ${action.variant === 'success' ? 'bg-green-600 hover:bg-green-700 text-white' : ''}
                      ${action.variant === 'warning' ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}
                      ${action.variant === 'primary' ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}
                      ${action.variant === 'secondary' ? 'bg-gray-600 hover:bg-gray-700 text-white' : ''}
                      disabled:opacity-50 disabled:cursor-not-allowed
                    `}
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        {showNoteInput === action.id ? 'Valider' : 'Exécuter'}
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tips */}
      {workflow.tips.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900 mb-2">💡 Conseils</h4>
              <ul className="space-y-1 text-sm text-blue-800">
                {workflow.tips.map((tip, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-blue-400 mt-1">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DynamicCommercialWorkflow;
