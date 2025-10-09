interface GuideLink {
  title: string;
  path: string;
  description: string;
  priority?: 'high' | 'medium' | 'low';
}

export const helpConfigs = {
  'social-media': {
    title: 'Réseaux Sociaux - Aide',
    description: 'Configuration et publication LinkedIn',
    guides: [
      {
        title: 'Guide Complet LinkedIn',
        path: '/LINKEDIN-COMPLETE-GUIDE.md',
        description: 'Configuration OAuth, page vitrine, formulaires Lead Gen',
        priority: 'high' as const
      },
      {
        title: 'Campaign Manager LinkedIn',
        path: '/LINKEDIN-CAMPAIGN-MANAGER-GUIDE.md',
        description: 'Créer campagnes, récupérer Partner ID, tracking',
        priority: 'high' as const
      },
      {
        title: 'OAuth Setup LinkedIn',
        path: '/LINKEDIN-OAUTH-SETUP.md',
        description: 'Configuration OAuth 2.0 détaillée',
        priority: 'medium' as const
      },
      {
        title: 'Automation Social Media',
        path: '/AUTOMATION-SOCIAL-MEDIA-GUIDE.md',
        description: 'Automatiser publications réseaux sociaux',
        priority: 'medium' as const
      }
    ]
  },

  'marketing-templates': {
    title: 'Templates Marketing - Aide',
    description: 'Messages prêts pour WhatsApp, LinkedIn, Email',
    guides: [
      {
        title: 'Guide Complet LinkedIn',
        path: '/LINKEDIN-COMPLETE-GUIDE.md',
        description: 'Posts LinkedIn, messages WhatsApp, communiqué presse',
        priority: 'high' as const
      },
      {
        title: 'Stratégie Leads Taxi #1',
        path: '/STRATEGIE-N1-LEADS-TAXI.md',
        description: 'Stratégie complète génération leads',
        priority: 'high' as const
      }
    ]
  },

  'qr-codes': {
    title: 'QR Codes - Aide',
    description: 'Génération et utilisation QR codes ambassadeurs',
    guides: [
      {
        title: 'Guide Complet LinkedIn',
        path: '/LINKEDIN-COMPLETE-GUIDE.md',
        description: 'Section QR Codes personnalisés (page 20)',
        priority: 'high' as const
      },
      {
        title: 'Système Parrainage Complet',
        path: '/SYSTEME-PARRAINAGE-COMPLET.md',
        description: 'Programme ambassadeurs et tracking',
        priority: 'medium' as const
      }
    ]
  },

  'leads': {
    title: 'Gestion Leads - Aide',
    description: 'CRM et gestion des prospects',
    guides: [
      {
        title: 'Solution Leads Backoffice',
        path: '/SOLUTION-LEADS-BACKOFFICE.md',
        description: 'Configuration complète système leads',
        priority: 'high' as const
      },
      {
        title: 'Fix Simple Leads',
        path: '/FIX-SIMPLE-LEADS.md',
        description: 'Résoudre problèmes leads',
        priority: 'high' as const
      },
      {
        title: 'Guide Complet LinkedIn',
        path: '/LINKEDIN-COMPLETE-GUIDE.md',
        description: 'Formulaire Lead Gen et webhook Make.com',
        priority: 'medium' as const
      }
    ]
  },

  'ai-generator': {
    title: 'Générateur IA - Aide',
    description: 'Génération de contenu avec IA',
    guides: [
      {
        title: 'Installation IA Complète',
        path: '/INSTALLATION-COMPLETE-IA.md',
        description: 'Installation et configuration IA',
        priority: 'high' as const
      },
      {
        title: 'IA Auto-Apprenante',
        path: '/IA-AUTO-APPRENANTE-COMPLETE.md',
        description: 'Système IA auto-apprenante',
        priority: 'high' as const
      },
      {
        title: 'Fix Générateur IA',
        path: '/FIX-GENERATEUR-IA.md',
        description: 'Résoudre erreurs générateur',
        priority: 'medium' as const
      },
      {
        title: 'Configuration OpenAI',
        path: '/CONFIGURATION-OPENAI-KEY.md',
        description: 'Configurer clé API OpenAI',
        priority: 'high' as const
      },
      {
        title: 'Diagnostic OpenAI',
        path: '/DIAGNOSTIC-OPENAI.md',
        description: 'Diagnostiquer problèmes OpenAI',
        priority: 'medium' as const
      }
    ]
  },

  'seo': {
    title: 'SEO Tools - Aide',
    description: 'Optimisation référencement naturel',
    guides: [
      {
        title: 'AI SEO Optimization',
        path: '/AI-SEO-OPTIMIZATION-GUIDE.md',
        description: 'SEO avec intelligence artificielle',
        priority: 'high' as const
      },
      {
        title: 'Stratégie Mots-Clés',
        path: '/KEYWORDS-STRATEGY.md',
        description: 'Recherche et optimisation mots-clés',
        priority: 'high' as const
      },
      {
        title: 'PageSpeed Optimization',
        path: '/PAGESPEED-OPTIMIZATION-REPORT.md',
        description: 'Rapport et optimisation PageSpeed',
        priority: 'medium' as const
      },
      {
        title: 'Optimisation Mobile',
        path: '/OPTIMISATION-MOBILE-COMPLETE.md',
        description: 'Optimisation complète mobile',
        priority: 'medium' as const
      },
      {
        title: 'Google My Business',
        path: '/GUIDE-GOOGLE-MY-BUSINESS.md',
        description: 'Configuration GMB',
        priority: 'medium' as const
      }
    ]
  },

  'backlinks': {
    title: 'Backlinks - Aide',
    description: 'Gestion et prospection backlinks',
    guides: [
      {
        title: 'Guide Backlinks SEO',
        path: '/GUIDE-BACKLINKS-SEO.md',
        description: 'Stratégie backlinks complète',
        priority: 'high' as const
      },
      {
        title: 'Backlink Prospector V2',
        path: '/BACKLINK-PROSPECTOR-V2.md',
        description: 'Outil de prospection backlinks',
        priority: 'high' as const
      }
    ]
  },

  'automation-scheduler': {
    title: 'Automation - Aide',
    description: 'Planification et automation',
    guides: [
      {
        title: 'Automation Complete',
        path: '/AUTOMATION-COMPLETE-GUIDE.md',
        description: 'Guide complet automation',
        priority: 'high' as const
      },
      {
        title: 'Pilotage Automatique',
        path: '/PILOTAGE-AUTOMATIQUE-FINAL.md',
        description: 'Système pilotage automatique final',
        priority: 'high' as const
      },
      {
        title: 'Activation Cron',
        path: '/GUIDE-ACTIVATION-CRON.md',
        description: 'Activer tâches cron Supabase',
        priority: 'medium' as const
      },
      {
        title: 'Résumé Cron',
        path: '/RESUME-RAPIDE-CRON.md',
        description: 'Configuration rapide cron',
        priority: 'medium' as const
      }
    ]
  },

  'analytics': {
    title: 'Analytics - Aide',
    description: 'Statistiques et analyses',
    guides: [
      {
        title: 'Dashboard Analytics',
        path: '/DASHBOARD-ANALYTICS-GUIDE.md',
        description: 'Configuration dashboard analytics',
        priority: 'high' as const
      },
      {
        title: 'Tableau de Bord',
        path: '/TABLEAU-DE-BORD.md',
        description: 'Guide tableau de bord',
        priority: 'medium' as const
      },
      {
        title: 'Trend Analyzer',
        path: '/TREND-ANALYZER-REAL-DATA.md',
        description: 'Analyseur tendances temps réel',
        priority: 'medium' as const
      }
    ]
  },

  'content': {
    title: 'Gestion Contenu - Aide',
    description: 'Création et gestion de contenu',
    guides: [
      {
        title: 'ChatGPT Integration',
        path: '/CHATGPT-INTEGRATION-GUIDE.md',
        description: 'Intégrer ChatGPT',
        priority: 'high' as const
      },
      {
        title: 'AnswerThePublic Strategy',
        path: '/ANSWERTHEPUBLIC-STRATEGY.md',
        description: 'Stratégie création contenu',
        priority: 'medium' as const
      }
    ]
  },

  'security': {
    title: 'Sécurité - Aide',
    description: 'Sécurité et protection',
    guides: [
      {
        title: 'Sécurité API CSE',
        path: '/SECURITE-API-CSE.md',
        description: 'Sécuriser API Google CSE',
        priority: 'high' as const
      },
      {
        title: 'Solution Google CSE 403',
        path: '/SOLUTION-GOOGLE-CSE-403.md',
        description: 'Résoudre erreur 403 Google',
        priority: 'high' as const
      }
    ]
  },

  'deployment': {
    title: 'Déploiement - Aide',
    description: 'Mise en production',
    guides: [
      {
        title: 'Guide Complet Déploiement',
        path: '/GUIDE-COMPLET-DEPLOYMENT.md',
        description: 'Déploiement complet étape par étape',
        priority: 'high' as const
      },
      {
        title: 'Guide Upload FTP IONOS',
        path: '/GUIDE-UPLOAD-FTP-IONOS.md',
        description: 'Upload fichiers sur IONOS',
        priority: 'high' as const
      },
      {
        title: 'IONOS Troubleshooting',
        path: '/IONOS-TROUBLESHOOTING.md',
        description: 'Résoudre problèmes IONOS',
        priority: 'medium' as const
      },
      {
        title: 'Checklist Acceptation',
        path: '/CHECKLIST-ACCEPTATION.md',
        description: 'Checklist avant mise en prod',
        priority: 'high' as const
      }
    ]
  },

  'setup': {
    title: 'Configuration - Aide',
    description: 'Configuration initiale système',
    guides: [
      {
        title: 'Setup Complete',
        path: '/SETUP-COMPLETE.md',
        description: 'Configuration complète système',
        priority: 'high' as const
      },
      {
        title: 'Démarrage Express',
        path: '/DEMARRAGE-EXPRESS.md',
        description: 'Guide rapide de démarrage',
        priority: 'high' as const
      },
      {
        title: 'Configuration API',
        path: '/CONFIGURATION-API.md',
        description: 'Configurer toutes les APIs',
        priority: 'high' as const
      },
      {
        title: 'Supabase Setup',
        path: '/SUPABASE-SETUP-GUIDE.md',
        description: 'Installation Supabase',
        priority: 'high' as const
      },
      {
        title: 'Variables Config',
        path: '/VARIABLES-CONFIG.md',
        description: 'Toutes les variables configuration',
        priority: 'medium' as const
      }
    ]
  },

  'dashboard': {
    title: 'Dashboard Principal - Aide',
    description: 'Vue d\'ensemble et navigation',
    guides: [
      {
        title: 'Backoffice README',
        path: '/BACKOFFICE-README.md',
        description: 'Documentation complète backoffice',
        priority: 'high' as const
      },
      {
        title: 'Menu Complet',
        path: '/MENU-COMPLET-BACKOFFICE.md',
        description: 'Guide navigation menu',
        priority: 'medium' as const
      },
      {
        title: 'Guide Lancement',
        path: '/GUIDE-LANCEMENT.md',
        description: 'Lancer votre plateforme',
        priority: 'high' as const
      },
      {
        title: 'Documentation Centrale',
        path: '/docs/guides/INDEX.md',
        description: 'Index de tous les guides',
        priority: 'high' as const
      }
    ]
  }
};

export type HelpConfigKey = keyof typeof helpConfigs;

export const getHelpConfig = (key: HelpConfigKey) => {
  return helpConfigs[key] || helpConfigs.dashboard;
};
