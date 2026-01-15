import { PipelineStatus } from './crm-pipeline';

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  type: 'status_change' | 'send_email' | 'send_sms' | 'add_note' | 'request_docs' | 'send_quote' | 'custom';
  nextStatus?: PipelineStatus;
  requiresNote?: boolean;
  requiresInput?: boolean;
  emailTemplate?: {
    subject: string;
    body: string;
  };
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  description?: string;
}

export interface WorkflowStage {
  status: PipelineStatus;
  title: string;
  description: string;
  phase: 'qualification' | 'documentation' | 'quotation' | 'conversion' | 'client' | 'lost';
  actions: QuickAction[];
  tips?: string[];
}

export const COMMERCIAL_WORKFLOW: Record<PipelineStatus, WorkflowStage> = {
  NEW_LEAD: {
    status: 'NEW_LEAD',
    title: '📞 Contact Téléphonique Initial',
    description: 'Première prise de contact avec le prospect',
    phase: 'qualification',
    actions: [
      {
        id: 'call_initial',
        label: 'Appel effectué - Répondu',
        icon: '✅',
        type: 'status_change',
        nextStatus: 'CONTACT_CONFIRMED',
        variant: 'success',
        description: 'Le prospect a répondu et l\'entretien est confirmé',
        emailTemplate: {
          subject: 'Confirmation de notre entretien téléphonique - TaxiAssur',
          body: `Bonjour,

Suite à notre échange téléphonique de ce jour, je vous confirme votre demande de devis pour votre assurance taxi.

Pour établir votre devis personnalisé, merci de nous transmettre les documents suivants :
• Carte grise du véhicule
• Permis de conduire
• Relevé d'information (historique assurance)
• Carte professionnelle taxi
• RIB pour le prélèvement

Vous pouvez les envoyer directement en répondant à cet email ou via votre espace personnel.

Je reste à votre disposition pour toute question.

Cordialement,
L'équipe TaxiAssur`
        }
      },
      {
        id: 'call_no_answer',
        label: 'Appel effectué - Sans réponse',
        icon: '❌',
        type: 'status_change',
        nextStatus: 'CONTACT_ATTEMPTED',
        variant: 'warning',
        description: 'Le prospect n\'a pas répondu, envoi d\'un email de suivi',
        emailTemplate: {
          subject: 'Nous avons essayé de vous joindre - TaxiAssur',
          body: `Bonjour,

Nous avons essayé de vous joindre aujourd'hui concernant votre demande de devis pour votre assurance taxi, sans succès.

Pour accélérer le traitement de votre dossier, vous pouvez :
• Nous appeler au [NUMERO]
• Nous transmettre directement vos documents via votre espace personnel
• Répondre à cet email pour convenir d'un rendez-vous téléphonique

Documents nécessaires pour le devis :
• Carte grise du véhicule
• Permis de conduire
• Relevé d'information
• Carte professionnelle taxi
• RIB

Nous restons à votre disposition.

Cordialement,
L'équipe TaxiAssur`
        }
      },
      {
        id: 'add_note',
        label: 'Ajouter une note',
        icon: '📝',
        type: 'add_note',
        variant: 'secondary'
      }
    ],
    tips: [
      'Appelez dans les 5 minutes suivant la demande pour maximiser les chances de réponse',
      'Préparez les questions de qualification avant l\'appel',
      'Notez les détails importants pour personnaliser le suivi'
    ]
  },

  CONTACT_ATTEMPTED: {
    status: 'CONTACT_ATTEMPTED',
    title: '🔄 Relance et Suivi',
    description: 'Le contact a été tenté sans succès, relance en cours',
    phase: 'qualification',
    actions: [
      {
        id: 'second_call',
        label: 'Nouvel appel - Répondu',
        icon: '✅',
        type: 'status_change',
        nextStatus: 'CONTACT_CONFIRMED',
        variant: 'success',
        emailTemplate: {
          subject: 'Confirmation de notre entretien - TaxiAssur',
          body: `Bonjour,

Merci pour votre disponibilité lors de notre échange téléphonique.

Pour établir votre devis personnalisé, merci de nous transmettre :
• Carte grise du véhicule
• Permis de conduire
• Relevé d'information
• Carte professionnelle taxi
• RIB

Transmission possible par email ou via votre espace personnel.

Cordialement,
L'équipe TaxiAssur`
        }
      },
      {
        id: 'send_reminder',
        label: 'Envoyer un email de rappel',
        icon: '📧',
        type: 'send_email',
        variant: 'warning',
        emailTemplate: {
          subject: 'Rappel - Votre demande de devis assurance taxi',
          body: `Bonjour,

Nous avons tenté de vous joindre à plusieurs reprises concernant votre demande de devis.

Restez-vous intéressé par notre offre d'assurance taxi ?

Si oui, vous pouvez :
• Nous appeler directement
• Nous transmettre vos documents
• Répondre à cet email

Documents requis :
• Carte grise
• Permis de conduire
• Relevé d'information
• Carte professionnelle taxi
• RIB

À très bientôt,
L'équipe TaxiAssur`
        }
      },
      {
        id: 'send_sms',
        label: 'Envoyer un SMS',
        icon: '💬',
        type: 'send_sms',
        variant: 'secondary'
      },
      {
        id: 'mark_lost',
        label: 'Marquer comme perdu',
        icon: '❌',
        type: 'status_change',
        nextStatus: 'LOST_RECONTACT_SCHEDULED',
        variant: 'danger',
        requiresNote: true
      }
    ],
    tips: [
      'Réessayez à des horaires différents (matin, midi, soir)',
      'Variez les canaux de communication (tel, email, SMS)',
      'Après 3 tentatives sans réponse sur 5 jours, envisagez le statut perdu avec recontact'
    ]
  },

  CONTACT_CONFIRMED: {
    status: 'CONTACT_CONFIRMED',
    title: '📋 Demande de Documents',
    description: 'Contact établi, en attente des documents',
    phase: 'documentation',
    actions: [
      {
        id: 'docs_requested',
        label: 'Documents demandés',
        icon: '📧',
        type: 'status_change',
        nextStatus: 'DOCUMENTS_REQUIRED',
        variant: 'primary',
        emailTemplate: {
          subject: 'Liste des documents pour votre devis - TaxiAssur',
          body: `Bonjour,

Pour finaliser votre devis d'assurance taxi, nous avons besoin des documents suivants :

📄 Documents obligatoires :
• Carte grise du véhicule
• Permis de conduire (recto-verso)
• Relevé d'information de votre assureur actuel
• Carte professionnelle taxi
• RIB pour le prélèvement

Vous pouvez les transmettre :
• Par email en répondant à ce message
• Via votre espace personnel sécurisé
• Par courrier si nécessaire

⏱️ Délai de traitement : 24h après réception complète des documents

Nous restons à votre disposition pour toute question.

Cordialement,
L'équipe TaxiAssur`
        }
      },
      {
        id: 'add_note',
        label: 'Ajouter une note',
        icon: '📝',
        type: 'add_note',
        variant: 'secondary'
      }
    ],
    tips: [
      'Expliquez clairement pourquoi chaque document est nécessaire',
      'Proposez plusieurs moyens de transmission',
      'Indiquez le délai de traitement une fois les documents reçus'
    ]
  },

  DOCUMENTS_REQUIRED: {
    status: 'DOCUMENTS_REQUIRED',
    title: '⏳ Attente Documents',
    description: 'En attente de la réception des documents',
    phase: 'documentation',
    actions: [
      {
        id: 'docs_received_partial',
        label: 'Documents partiels reçus',
        icon: '📄',
        type: 'status_change',
        nextStatus: 'DOCUMENTS_PARTIAL',
        variant: 'warning',
        description: 'Certains documents sont arrivés mais il en manque'
      },
      {
        id: 'docs_received_complete',
        label: 'Tous les documents reçus',
        icon: '✅',
        type: 'status_change',
        nextStatus: 'READY_FOR_QUOTE',
        variant: 'success',
        description: 'Dossier complet, prêt pour le devis'
      },
      {
        id: 'send_reminder',
        label: 'Relancer pour les documents',
        icon: '🔔',
        type: 'send_email',
        variant: 'warning',
        emailTemplate: {
          subject: 'Rappel - Documents manquants pour votre devis',
          body: `Bonjour,

Nous n'avons pas encore reçu les documents nécessaires à l'établissement de votre devis.

Documents manquants :
• [LISTE DES DOCUMENTS MANQUANTS]

Pour accélérer le traitement, vous pouvez les transmettre :
• Par email en répondant à ce message
• Via votre espace personnel

⏱️ Votre devis sera établi dans les 24h suivant la réception.

Merci de votre confiance.

Cordialement,
L'équipe TaxiAssur`
        }
      },
      {
        id: 'add_note',
        label: 'Ajouter une note',
        icon: '📝',
        type: 'add_note',
        variant: 'secondary'
      }
    ],
    tips: [
      'Relancez après 48h si aucun document n\'est reçu',
      'Vérifiez que l\'email de demande n\'est pas en spam',
      'Proposez un accompagnement si le prospect rencontre des difficultés'
    ]
  },

  DOCUMENTS_PARTIAL: {
    status: 'DOCUMENTS_PARTIAL',
    title: '📄 Documents Incomplets',
    description: 'Documents partiellement reçus, relance nécessaire',
    phase: 'documentation',
    actions: [
      {
        id: 'send_missing_docs_email',
        label: 'Relancer pièces manquantes',
        icon: '📧',
        type: 'send_email',
        variant: 'warning',
        emailTemplate: {
          subject: 'Documents complémentaires nécessaires - TaxiAssur',
          body: `Bonjour,

Merci pour les documents déjà transmis.

Pour finaliser votre dossier, il nous manque :
• [LISTE DES DOCUMENTS MANQUANTS]

Documents déjà reçus :
• [LISTE DES DOCUMENTS REÇUS]

Merci de nous transmettre les pièces manquantes par email ou via votre espace personnel.

⏱️ Dès réception, votre devis sera établi sous 24h.

Cordialement,
L'équipe TaxiAssur`
        }
      },
      {
        id: 'docs_complete',
        label: 'Dossier complété',
        icon: '✅',
        type: 'status_change',
        nextStatus: 'READY_FOR_QUOTE',
        variant: 'success'
      },
      {
        id: 'call_client',
        label: 'Appeler le prospect',
        icon: '📞',
        type: 'custom',
        variant: 'primary'
      },
      {
        id: 'add_note',
        label: 'Ajouter une note',
        icon: '📝',
        type: 'add_note',
        variant: 'secondary'
      }
    ],
    tips: [
      'Listez précisément les documents déjà reçus et ceux manquants',
      'Proposez de l\'aide pour obtenir les documents difficiles',
      'Relancez toutes les 48h jusqu\'à réception complète'
    ]
  },

  READY_FOR_QUOTE: {
    status: 'READY_FOR_QUOTE',
    title: '🎯 Établissement du Devis',
    description: 'Dossier complet, devis en préparation',
    phase: 'quotation',
    actions: [
      {
        id: 'generate_quote',
        label: 'Générer et envoyer le devis',
        icon: '📨',
        type: 'status_change',
        nextStatus: 'QUOTE_SENT',
        variant: 'success',
        emailTemplate: {
          subject: 'Votre devis personnalisé TaxiAssur',
          body: `Bonjour,

Suite à l'analyse de votre dossier, nous avons le plaisir de vous transmettre votre devis personnalisé pour l'assurance de votre taxi.

📊 Votre devis :
[DETAILS DU DEVIS]

✅ Garanties incluses :
• Responsabilité Civile Professionnelle
• Protection juridique
• Assistance 24h/24
• [AUTRES GARANTIES]

💰 Tarif : [MONTANT] €/mois ou [MONTANT] €/an

Pour valider votre contrat :
1. Consultez le devis en pièce jointe
2. Signez électroniquement via votre espace personnel
3. Transmettez votre RIB si non fait

Questions ? Appelez-nous au [NUMERO]

Cordialement,
L'équipe TaxiAssur`
        }
      },
      {
        id: 'request_company_quotes',
        label: 'Demander devis compagnies',
        icon: '🏢',
        type: 'custom',
        variant: 'primary',
        description: 'Lancer les demandes auprès des compagnies'
      },
      {
        id: 'add_note',
        label: 'Ajouter une note',
        icon: '📝',
        type: 'add_note',
        variant: 'secondary'
      }
    ],
    tips: [
      'Vérifiez que toutes les informations sont correctes avant génération',
      'Comparez plusieurs offres de compagnies pour le meilleur tarif',
      'Ajoutez une touche personnelle dans l\'email d\'envoi'
    ]
  },

  QUOTE_SENT: {
    status: 'QUOTE_SENT',
    title: '⏳ Attente Réponse Devis',
    description: 'Devis envoyé, en attente de retour du prospect',
    phase: 'quotation',
    actions: [
      {
        id: 'quote_accepted',
        label: 'Devis accepté - Demander signature',
        icon: '✅',
        type: 'status_change',
        nextStatus: 'SIGNATURE_PENDING',
        variant: 'success',
        emailTemplate: {
          subject: 'Signature de votre contrat - TaxiAssur',
          body: `Bonjour,

Merci d'avoir accepté notre proposition !

Pour finaliser votre contrat d'assurance :

📝 Étape 1 : Signature électronique
Cliquez sur le lien ci-dessous pour signer votre contrat :
[LIEN SIGNATURE ELECTRONIQUE]

💳 Étape 2 : Modalités de paiement
Vous pourrez choisir entre :
• Paiement mensuel par prélèvement
• Paiement comptant avec réduction

⏱️ Votre contrat prendra effet dès réception de la signature et du paiement.

Questions ? Nous sommes là : [NUMERO]

Bienvenue chez TaxiAssur !

Cordialement,
L'équipe TaxiAssur`
        }
      },
      {
        id: 'followup_call',
        label: 'Appel de suivi',
        icon: '📞',
        type: 'custom',
        variant: 'primary',
        description: 'Appeler pour répondre aux questions'
      },
      {
        id: 'send_followup',
        label: 'Relancer le devis',
        icon: '🔔',
        type: 'send_email',
        variant: 'warning',
        emailTemplate: {
          subject: 'Avez-vous des questions sur votre devis ?',
          body: `Bonjour,

Vous avez reçu votre devis TaxiAssur il y a quelques jours.

Avez-vous des questions ? Souhaitez-vous des éclaircissements sur :
• Les garanties proposées
• Les modalités de paiement
• La procédure de souscription

Je suis disponible pour vous accompagner :
• Par téléphone : [NUMERO]
• Par email en répondant à ce message

Votre devis reste valable [DUREE].

Cordialement,
L'équipe TaxiAssur`
        }
      },
      {
        id: 'no_response',
        label: 'Pas de réponse',
        icon: '❓',
        type: 'status_change',
        nextStatus: 'NO_RESPONSE',
        variant: 'warning'
      },
      {
        id: 'mark_lost',
        label: 'Prospect perdu',
        icon: '❌',
        type: 'status_change',
        nextStatus: 'CLIENT_LOST',
        variant: 'danger',
        requiresNote: true
      }
    ],
    tips: [
      'Relancez après 3 jours si aucun retour',
      'Proposez un appel pour répondre aux questions',
      'Soyez à l\'écoute des objections et adaptez l\'offre si possible'
    ]
  },

  NO_RESPONSE: {
    status: 'NO_RESPONSE',
    title: '❓ Sans Réponse',
    description: 'Pas de réponse après envoi du devis',
    phase: 'quotation',
    actions: [
      {
        id: 'activate_relance',
        label: 'Activer la relance automatique',
        icon: '🔔',
        type: 'status_change',
        nextStatus: 'RELANCE_ACTIVE',
        variant: 'warning',
        emailTemplate: {
          subject: 'Dernière chance - Votre devis TaxiAssur',
          body: `Bonjour,

Nous n'avons pas eu de retour suite à l'envoi de votre devis.

Restez-vous intéressé par notre offre d'assurance taxi ?

✨ Rappel de notre proposition :
• Tarif : [MONTANT]€/mois
• Garanties complètes
• Assistance 24h/24

🎁 Offre spéciale : -10% si souscription sous 7 jours

Pour toute question, contactez-nous :
📞 [NUMERO]
📧 Répondez à cet email

Votre devis reste valable encore [DUREE].

À très bientôt,
L'équipe TaxiAssur`
        }
      },
      {
        id: 'schedule_recontact',
        label: 'Programmer un recontact',
        icon: '📅',
        type: 'status_change',
        nextStatus: 'LOST_RECONTACT_SCHEDULED',
        variant: 'secondary',
        requiresNote: true
      },
      {
        id: 'mark_lost',
        label: 'Abandonner définitivement',
        icon: '❌',
        type: 'status_change',
        nextStatus: 'CLIENT_LOST',
        variant: 'danger',
        requiresNote: true
      }
    ],
    tips: [
      'Dernière tentative avec une offre limitée dans le temps',
      'Demandez explicitement si le prospect est toujours intéressé',
      'Si aucune réponse après cette relance, passez en recontact programmé'
    ]
  },

  RELANCE_ACTIVE: {
    status: 'RELANCE_ACTIVE',
    title: '🔔 Relance en Cours',
    description: 'Campagne de relance active',
    phase: 'quotation',
    actions: [
      {
        id: 'response_received',
        label: 'Réponse reçue - Revenir au devis',
        icon: '✅',
        type: 'status_change',
        nextStatus: 'QUOTE_SENT',
        variant: 'success'
      },
      {
        id: 'schedule_recontact',
        label: 'Programmer recontact ultérieur',
        icon: '📅',
        type: 'status_change',
        nextStatus: 'LOST_RECONTACT_SCHEDULED',
        variant: 'warning',
        requiresNote: true
      },
      {
        id: 'mark_lost',
        label: 'Abandonner',
        icon: '❌',
        type: 'status_change',
        nextStatus: 'CLIENT_LOST',
        variant: 'danger',
        requiresNote: true
      }
    ],
    tips: [
      'Surveillez les ouvertures d\'emails et les clics',
      'Adaptez le message si les précédents n\'ont pas fonctionné',
      'Proposez un contact direct par téléphone'
    ]
  },

  SIGNATURE_PENDING: {
    status: 'SIGNATURE_PENDING',
    title: '✍️ Attente Signature',
    description: 'En attente de la signature électronique',
    phase: 'conversion',
    actions: [
      {
        id: 'signature_received',
        label: 'Signature reçue',
        icon: '✅',
        type: 'status_change',
        nextStatus: 'SIGNED',
        variant: 'success',
        description: 'Le contrat a été signé électroniquement'
      },
      {
        id: 'send_reminder',
        label: 'Relancer pour signature',
        icon: '🔔',
        type: 'send_email',
        variant: 'warning',
        emailTemplate: {
          subject: 'Rappel - Signature de votre contrat TaxiAssur',
          body: `Bonjour,

Il ne vous reste plus qu'une étape pour finaliser votre assurance taxi : la signature !

📝 Signez en 2 minutes :
[LIEN SIGNATURE ELECTRONIQUE]

✅ Avantages de la signature électronique :
• Rapide et sécurisé
• Juridiquement valable
• Contrat actif immédiatement

Une question ? Contactez-nous au [NUMERO]

À très vite,
L'équipe TaxiAssur`
        }
      },
      {
        id: 'call_client',
        label: 'Appeler le client',
        icon: '📞',
        type: 'custom',
        variant: 'primary'
      }
    ],
    tips: [
      'Relancez après 24h si pas de signature',
      'Vérifiez que le lien de signature fonctionne',
      'Proposez de l\'aide si le client rencontre des difficultés techniques'
    ]
  },

  SIGNED: {
    status: 'SIGNED',
    title: '✅ Contrat Signé',
    description: 'Contrat signé, en attente du paiement',
    phase: 'conversion',
    actions: [
      {
        id: 'comptant_required',
        label: 'Paiement comptant requis',
        icon: '💳',
        type: 'status_change',
        nextStatus: 'DOWN_PAYMENT_REQUIRED',
        variant: 'warning',
        description: 'Le client doit payer comptant (CIC)'
      },
      {
        id: 'monthly_payment',
        label: 'Paiement mensuel',
        icon: '💰',
        type: 'status_change',
        nextStatus: 'PAYMENT_PENDING',
        variant: 'primary',
        description: 'Envoi du lien de paiement mensuel'
      }
    ],
    tips: [
      'Vérifiez la modalité de paiement choisie',
      'Envoyez le lien de paiement rapidement',
      'Confirmez la date de prise d\'effet du contrat'
    ]
  },

  DOWN_PAYMENT_REQUIRED: {
    status: 'DOWN_PAYMENT_REQUIRED',
    title: '💳 Paiement Comptant',
    description: 'En attente du paiement comptant',
    phase: 'conversion',
    actions: [
      {
        id: 'payment_received',
        label: 'Paiement reçu - Activer client',
        icon: '✅',
        type: 'status_change',
        nextStatus: 'ACTIVE_CLIENT',
        variant: 'success',
        emailTemplate: {
          subject: 'Bienvenue chez TaxiAssur ! 🎉',
          body: `Bonjour,

Votre paiement a bien été reçu. Félicitations, vous êtes maintenant assuré chez TaxiAssur !

📄 Vos documents :
• Attestation d'assurance (en pièce jointe)
• Conditions générales
• Contrat signé

🗓️ Date de prise d'effet : [DATE]

📞 Vos contacts :
• Service client : [NUMERO]
• Déclaration sinistre : [NUMERO_SINISTRE]
• Email : contact@taxiassur.com

Merci de votre confiance !

L'équipe TaxiAssur`
        }
      },
      {
        id: 'send_reminder',
        label: 'Relancer pour le paiement',
        icon: '🔔',
        type: 'send_email',
        variant: 'warning',
        emailTemplate: {
          subject: 'Finalisation de votre contrat - Paiement en attente',
          body: `Bonjour,

Votre contrat est signé, il ne manque plus que le paiement pour activer votre assurance.

💳 Payez en ligne de manière sécurisée :
[LIEN PAIEMENT CIC]

⏱️ Activation immédiate après paiement.

Des questions ? Contactez-nous au [NUMERO]

Cordialement,
L'équipe TaxiAssur`
        }
      }
    ],
    tips: [
      'Relancez rapidement si le paiement n\'est pas effectué',
      'Vérifiez que le lien de paiement CIC fonctionne',
      'Proposez une assistance téléphonique si nécessaire'
    ]
  },

  PAYMENT_PENDING: {
    status: 'PAYMENT_PENDING',
    title: '💰 Paiement Mensuel en Cours',
    description: 'En attente du premier prélèvement',
    phase: 'conversion',
    actions: [
      {
        id: 'payment_ok',
        label: 'Premier paiement effectué',
        icon: '✅',
        type: 'status_change',
        nextStatus: 'ACTIVE_CLIENT',
        variant: 'success'
      },
      {
        id: 'send_reminder',
        label: 'Relancer pour le RIB',
        icon: '🔔',
        type: 'send_email',
        variant: 'warning'
      }
    ],
    tips: [
      'Vérifiez que le RIB est valide',
      'Confirmez la date du premier prélèvement',
      'Envoyez un récapitulatif des échéances'
    ]
  },

  ACTIVE_CLIENT: {
    status: 'ACTIVE_CLIENT',
    title: '🎉 Client Actif',
    description: 'Client actif et assuré',
    phase: 'client',
    actions: [
      {
        id: 'cross_sell',
        label: 'Opportunité cross-sell',
        icon: '🎁',
        type: 'status_change',
        nextStatus: 'CROSS_SELLING',
        variant: 'primary'
      },
      {
        id: 'risk_churn',
        label: 'Risque de départ détecté',
        icon: '⚠️',
        type: 'status_change',
        nextStatus: 'RISK_CHURN',
        variant: 'warning'
      },
      {
        id: 'declare_sinister',
        label: 'Déclarer un sinistre',
        icon: '🚨',
        type: 'status_change',
        nextStatus: 'SINISTER',
        variant: 'danger'
      },
      {
        id: 'attestation_request',
        label: 'Demande d\'attestation',
        icon: '📜',
        type: 'status_change',
        nextStatus: 'ATTESTATION_REQUEST',
        variant: 'secondary'
      }
    ],
    tips: [
      'Maintenez le contact régulièrement',
      'Proposez des services complémentaires',
      'Surveillez les indicateurs de satisfaction'
    ]
  },

  CROSS_SELLING: {
    status: 'CROSS_SELLING',
    title: '🎁 Opportunité Vente Additionnelle',
    description: 'Proposition de services complémentaires',
    phase: 'client',
    actions: [
      {
        id: 'cross_sell_success',
        label: 'Vente additionnelle réussie',
        icon: '✅',
        type: 'status_change',
        nextStatus: 'ACTIVE_CLIENT',
        variant: 'success'
      },
      {
        id: 'cross_sell_declined',
        label: 'Pas intéressé - Retour client actif',
        icon: '↩️',
        type: 'status_change',
        nextStatus: 'ACTIVE_CLIENT',
        variant: 'secondary'
      }
    ],
    tips: [
      'Identifiez le bon moment pour proposer',
      'Personnalisez l\'offre selon les besoins',
      'Ne soyez pas trop insistant'
    ]
  },

  RISK_CHURN: {
    status: 'RISK_CHURN',
    title: '⚠️ Risque de Départ',
    description: 'Client à risque, rétention nécessaire',
    phase: 'client',
    actions: [
      {
        id: 'retention_success',
        label: 'Client conservé',
        icon: '✅',
        type: 'status_change',
        nextStatus: 'ACTIVE_CLIENT',
        variant: 'success'
      },
      {
        id: 'client_lost',
        label: 'Client perdu définitivement',
        icon: '❌',
        type: 'status_change',
        nextStatus: 'CLIENT_LOST',
        variant: 'danger',
        requiresNote: true
      },
      {
        id: 'schedule_recontact',
        label: 'Programmer recontact futur',
        icon: '📅',
        type: 'status_change',
        nextStatus: 'LOST_RECONTACT_SCHEDULED',
        variant: 'warning',
        requiresNote: true
      }
    ],
    tips: [
      'Identifiez la raison du risque de départ',
      'Proposez des solutions adaptées',
      'Impliquez un manager si nécessaire'
    ]
  },

  CLIENT_LOST: {
    status: 'CLIENT_LOST',
    title: '❌ Client Perdu',
    description: 'Client perdu définitivement',
    phase: 'lost',
    actions: [
      {
        id: 'add_note',
        label: 'Documenter la raison',
        icon: '📝',
        type: 'add_note',
        variant: 'secondary'
      }
    ],
    tips: [
      'Documentez précisément la raison de perte',
      'Analysez pour éviter les mêmes erreurs',
      'Gardez la porte ouverte pour le futur'
    ]
  },

  LOST_RECONTACT_SCHEDULED: {
    status: 'LOST_RECONTACT_SCHEDULED',
    title: '📅 Recontact Programmé',
    description: 'Recontact prévu ultérieurement',
    phase: 'lost',
    actions: [
      {
        id: 'reactivate',
        label: 'Réactiver maintenant',
        icon: '🔄',
        type: 'status_change',
        nextStatus: 'NEW_LEAD',
        variant: 'primary',
        emailTemplate: {
          subject: 'Reprenons contact - TaxiAssur',
          body: `Bonjour,

Il y a quelques temps, vous aviez manifesté un intérêt pour nos solutions d'assurance taxi.

Les choses ont-elles évoluées de votre côté ?

🆕 Nouveautés TaxiAssur :
• Nouvelles garanties
• Tarifs optimisés
• Service client renforcé

Souhaitez-vous qu'on reprenne contact pour un nouveau devis ?

Répondez simplement à cet email ou appelez-nous au [NUMERO].

Cordialement,
L'équipe TaxiAssur`
        }
      },
      {
        id: 'abandon',
        label: 'Abandonner définitivement',
        icon: '❌',
        type: 'status_change',
        nextStatus: 'CLIENT_LOST',
        variant: 'danger',
        requiresNote: true
      }
    ],
    tips: [
      'Respectez la date de recontact programmée',
      'Apportez de nouvelles informations lors du recontact',
      'Soyez à l\'écoute de l\'évolution de ses besoins'
    ]
  },

  SINISTER: {
    status: 'SINISTER',
    title: '🚨 Sinistre en Cours',
    description: 'Gestion d\'un sinistre',
    phase: 'client',
    actions: [
      {
        id: 'sinister_closed',
        label: 'Sinistre clôturé',
        icon: '✅',
        type: 'status_change',
        nextStatus: 'ACTIVE_CLIENT',
        variant: 'success'
      },
      {
        id: 'add_note',
        label: 'Ajouter une note',
        icon: '📝',
        type: 'add_note',
        variant: 'secondary'
      }
    ],
    tips: [
      'Accompagnez le client dans les démarches',
      'Communiquez régulièrement sur l\'avancement',
      'Vérifiez la satisfaction à la clôture'
    ]
  },

  ATTESTATION_REQUEST: {
    status: 'ATTESTATION_REQUEST',
    title: '📜 Demande Attestation',
    description: 'Traitement d\'une demande d\'attestation',
    phase: 'client',
    actions: [
      {
        id: 'attestation_sent',
        label: 'Attestation envoyée',
        icon: '✅',
        type: 'status_change',
        nextStatus: 'ACTIVE_CLIENT',
        variant: 'success',
        emailTemplate: {
          subject: 'Votre attestation d\'assurance - TaxiAssur',
          body: `Bonjour,

Vous trouverez en pièce jointe votre attestation d'assurance.

📄 Document joint :
• Attestation d'assurance valide

Cette attestation est valable pour la période en cours.

Pour toute question, contactez-nous au [NUMERO].

Cordialement,
L'équipe TaxiAssur`
        }
      }
    ],
    tips: [
      'Traitez la demande rapidement (sous 24h)',
      'Vérifiez que l\'attestation est à jour',
      'Proposez l\'accès à l\'espace client pour les futures demandes'
    ]
  },

  SUPPORT_ASSISTANCE: {
    status: 'SUPPORT_ASSISTANCE',
    title: '�� Demande d\'Assistance',
    description: 'Support client en cours',
    phase: 'client',
    actions: [
      {
        id: 'assistance_done',
        label: 'Assistance terminée',
        icon: '✅',
        type: 'status_change',
        nextStatus: 'ACTIVE_CLIENT',
        variant: 'success'
      },
      {
        id: 'add_note',
        label: 'Ajouter une note',
        icon: '📝',
        type: 'add_note',
        variant: 'secondary'
      }
    ],
    tips: [
      'Répondez rapidement aux demandes',
      'Assurez le suivi jusqu\'à résolution',
      'Vérifiez la satisfaction du client'
    ]
  }
};

export function getWorkflowStage(status: PipelineStatus): WorkflowStage {
  return COMMERCIAL_WORKFLOW[status];
}

export function getNextActions(status: PipelineStatus): QuickAction[] {
  return COMMERCIAL_WORKFLOW[status]?.actions || [];
}

export function getWorkflowPhase(status: PipelineStatus): string {
  const phase = COMMERCIAL_WORKFLOW[status]?.phase;
  const phaseLabels = {
    qualification: '🎯 Qualification',
    documentation: '📄 Documentation',
    quotation: '💰 Devis',
    conversion: '✍️ Conversion',
    client: '🎉 Client',
    lost: '❌ Perdu'
  };
  return phaseLabels[phase as keyof typeof phaseLabels] || phase || '';
}
