# 🚀 Synthèse complète : Adapter TaxiAssur.com vers XCR.com

**Date**: 12 janvier 2026
**Objectif**: Transférer toutes les innovations et systèmes avancés de TaxiAssur vers XCR (courtage en assurances généraliste) sans perdre les acquis existants.

---

## 📋 TABLE DES MATIÈRES

1. [Architecture Globale](#1-architecture-globale)
2. [CRM Ultra-Avancé](#2-crm-ultra-avancé)
3. [Système d'Emails Intelligent](#3-système-demails-intelligent)
4. [Automatisations IA](#4-automatisations-ia)
5. [SEO & Génération de Contenu](#5-seo--génération-de-contenu)
6. [Réseaux Sociaux Automatisés](#6-réseaux-sociaux-automatisés)
7. [Espace Prospect & Client](#7-espace-prospect--client)
8. [Gestion Documentaire Intelligente](#8-gestion-documentaire-intelligente)
9. [Analytics & Monitoring](#9-analytics--monitoring)
10. [Optimisations Performance](#10-optimisations-performance)
11. [Prompts Bolt.new](#11-prompts-boltew)

---

## 1. ARCHITECTURE GLOBALE

### Stack Technique (identique)
```
Frontend: React 18 + TypeScript + Vite + TailwindCSS
Backend: Supabase (PostgreSQL + Edge Functions)
Storage: Supabase Storage
Auth: Supabase Auth avec RLS
IA: OpenAI GPT-4o-mini, Anthropic Claude, LLMs multiples
Emails: Brevo + IONOS IMAP
```

### Structure Base de Données

**Tables principales à créer:**
```sql
-- CRM Core
crm_leads (prospects/clients toutes assurances)
crm_interactions (historique communications)
crm_documents (stockage fichiers)
crm_quotes (devis multi-produits)
crm_contracts (contrats signés)
crm_claims (sinistres)

-- Automation
automation_logs (traçabilité)
automation_rules (règles métier)
ai_decisions (décisions IA)
social_posts (publications sociales)
social_networks (comptes connectés)

-- Content
blog_posts (articles blog)
seo_pages (pages dynamiques)
faq_items (FAQ)
email_templates (modèles emails)

-- Emails
email_messages (boîte de réception)
email_tracking (ouvertures/clics)

-- Analytics
page_analytics (statistiques pages)
conversion_tracking (tunnels conversion)
```

### Différences XCR vs TaxiAssur

| Aspect | TaxiAssur | XCR |
|--------|-----------|-----|
| **Public cible** | Chauffeurs taxi/VTC | Particuliers + Professionnels |
| **Produits** | Assurance taxi uniquement | Auto, Habitation, Santé, Pro, Vie |
| **Tunnel** | Formulaire unique | Formulaire par produit |
| **Documents** | Permis, carte grise, carte pro | Variables selon produit |
| **SEO** | Pages ville + blog taxi | Pages produit + ville + comparatifs |
| **Réassurance** | Badge taxi, stats pros | Labels assurance, comparateurs |

---

## 2. CRM ULTRA-AVANCÉ

### Fonctionnalités Principales

#### A. Pipeline Kanban Intelligent
```typescript
// Statuts adaptés courtage multi-produits
enum LeadStatus {
  NOUVEAU = 'nouveau',
  QUALIFIE = 'qualifié',
  DEVIS_ENVOYE = 'devis_envoyé',
  NEGOCIATION = 'négociation',
  GAGNE = 'gagné',
  PERDU = 'perdu',
  ATTENTE_DOCUMENTS = 'attente_documents',
  SIGNATURE = 'signature',
  PRODUCTION = 'production'
}

// Produits XCR
enum ProductType {
  AUTO = 'auto',
  HABITATION = 'habitation',
  SANTE = 'santé',
  PREVOYANCE = 'prévoyance',
  PRO = 'professionnel',
  VIE = 'vie',
  EPARGNE = 'épargne'
}
```

#### B. Système de Scoring Multi-Critères
```typescript
interface LeadScoring {
  // Qualité prospect
  completeness: number; // 0-100 (complétude dossier)
  engagement: number; // 0-100 (ouvertures emails, clics)
  urgency: number; // 0-100 (délai avant échéance)

  // Potentiel commercial
  estimated_premium: number; // Prime annuelle estimée
  cross_sell_potential: number; // 0-100 (potentiel ventes croisées)
  lifetime_value: number; // Valeur client sur 5 ans

  // Comportemental
  response_rate: number; // Taux réponse
  document_upload_speed: number; // Rapidité envoi docs
  last_interaction: Date;
}
```

#### C. IA Collaborative Multi-LLM
```typescript
// Système de conseil IA avec plusieurs modèles
interface AICouncil {
  models: {
    openai: 'gpt-4o-mini', // Rédaction
    anthropic: 'claude-3.5-sonnet', // Analyse
    mistral: 'mistral-large', // Comparaison
  };

  // Cas d'usage
  tasks: {
    analyze_risk: 'anthropic', // Analyse risque
    generate_quote: 'openai', // Génération devis
    recommend_products: 'mistral', // Recommandations
    write_email: 'openai', // Rédaction emails
    detect_fraud: 'anthropic', // Détection fraude
  };
}
```

#### D. Communications Multicanal Unifiées
```typescript
interface Communication {
  channels: ['email', 'sms', 'whatsapp', 'phone', 'rdv'];
  inbox_unified: true; // Boîte réception unique
  auto_routing: true; // Routage automatique commercial
  ai_responses: true; // Réponses automatiques IA
  sentiment_analysis: true; // Analyse sentiment
}
```

### Composants React à Créer

```typescript
// src/backoffice/CRMXCRDashboard.tsx
- Vue kanban multi-produits
- Filtres par produit/commercial/période
- Actions rapides (appel, email, SMS)
- Scoring visuel avec jauges

// src/backoffice/CRMLeadDetailXCR.tsx
- Timeline interactions
- Documents checklist par produit
- Devis comparatifs
- Recommandations IA
- Historique modifications

// src/backoffice/CRMInboxMulticanal.tsx
- Emails + SMS + WhatsApp unifiés
- Classification automatique IA
- Réponses suggérées
- Assignation automatique

// src/backoffice/CRMQuoteEngine.tsx
- Comparateur multi-compagnies
- Génération devis PDF
- Envoi automatique + tracking
- A/B testing présentations
```

---

## 3. SYSTÈME D'EMAILS INTELLIGENT

### Architecture

```typescript
// Synchronisation IMAP temps réel
Email Flow:
1. IONOS IMAP → Edge Function sync-ionos-imap-v2
2. Emails stockés → email_messages table
3. IA Classification → ai-email-classifier
4. Auto-assignment → lead matching via email
5. Notifications commerciaux
6. Réponses automatiques si applicable
```

### Fonctionnalités Clés

#### A. Inbox Intelligent
```typescript
interface EmailIntelligence {
  // Classification automatique
  categories: [
    'nouveau_lead',
    'demande_info',
    'documents',
    'reclamation',
    'resiliation',
    'renouvellement',
    'cross_sell'
  ];

  // Priorité IA
  priority: 'urgent' | 'high' | 'normal' | 'low';

  // Extraction données
  extracted_data: {
    product_interest: ProductType[];
    current_insurer?: string;
    renewal_date?: Date;
    premium_budget?: number;
    documents_attached: string[];
  };

  // Actions suggérées
  suggested_actions: [
    'send_quote',
    'request_documents',
    'schedule_call',
    'send_comparison'
  ];
}
```

#### B. Templates Dynamiques
```sql
-- Table email_templates avec variables
{
  name: "Relance devis auto",
  subject: "{{first_name}}, votre devis assurance auto {{vehicle_brand}}",
  body: "...",
  variables: ["first_name", "vehicle_brand", "quote_amount", "savings"],
  trigger: "quote_sent + 3 days no response",
  product: "auto"
}
```

#### C. Tracking Avancé
```typescript
interface EmailTracking {
  opens: number;
  clicks: number;
  geolocation: { city, country };
  device: 'desktop' | 'mobile' | 'tablet';
  time_spent: number; // secondes
  links_clicked: string[];

  // Actions automatiques
  triggers: {
    opened_3_times: 'high_interest_tag',
    clicked_quote: 'send_reminder_24h',
    no_open_7days: 'change_subject_resend'
  };
}
```

### Edge Functions à Déployer

```typescript
// supabase/functions/
- sync-ionos-imap-v2 (IMAP → DB)
- ai-email-classifier (Classification IA)
- send-email-ionos (Envoi SMTP)
- track-email-open (Pixel tracking)
- track-email-click (Liens trackés)
- generate-inbox-response (Réponses IA)
- email-send-smtp (SMTP natif)
```

---

## 4. AUTOMATISATIONS IA

### Système Autonome

```typescript
// Automatisations critiques XCR
interface Automations {
  // Acquisition
  lead_qualification: {
    trigger: 'form_submit',
    action: 'ai_analyze_quality',
    output: 'score + assignation commercial'
  };

  // Nurturing
  drip_campaigns: {
    trigger: 'status_change',
    sequences: {
      auto: [D+0, D+1, D+3, D+7, D+14],
      habitation: [D+0, D+2, D+5, D+10],
      santé: [D+0, D+1, D+3, D+7, D+14, D+21]
    }
  };

  // Documents
  document_collector: {
    trigger: 'missing_document_detected',
    action: 'send_personalized_request',
    reminder_schedule: [D+1, D+3, D+7]
  };

  // Relances intelligentes
  smart_followup: {
    ai_timing: true, // IA calcule meilleur moment
    ai_channel: true, // IA choisit email/SMS/WhatsApp
    ai_content: true // IA génère message personnalisé
  };

  // Rétention
  renewal_automation: {
    trigger: 'contract_expires_in_60_days',
    actions: [
      'send_renewal_quote',
      'compare_market',
      'schedule_review_call'
    ]
  };

  // Cross-sell
  cross_sell_engine: {
    trigger: 'contract_signed',
    ai_recommendations: true,
    timing: 'D+30, D+90, D+180',
    products_suggest: 'complementary'
  };
}
```

### Crons à Configurer

```sql
-- Crons critiques (format PostgreSQL pg_cron)
SELECT cron.schedule(
  'lead_qualification_hourly',
  '0 * * * *', -- Toutes les heures
  $$ SELECT net.http_post(...) $$
);

-- Liste complète pour XCR:
- lead_qualification_hourly (qualification nouveaux leads)
- document_collector_15min (collecte documents)
- renewal_alerts_daily (alertes renouvellements)
- cross_sell_weekly (opportunités ventes croisées)
- ai_email_responder_hourly (réponses automatiques)
- linkedin_posts_2x_day (publications LinkedIn)
- blog_auto_daily (génération articles)
- seo_pages_daily (pages dynamiques)
- analytics_report_daily (rapport quotidien)
```

---

## 5. SEO & GÉNÉRATION DE CONTENU

### Stratégie SEO XCR

#### A. Architecture Pages

```typescript
// Structure URL XCR
/assurance-auto
/assurance-auto/[ville] (ex: /assurance-auto/paris)
/assurance-auto/comparateur
/assurance-auto/jeune-conducteur
/assurance-auto/resilie

/assurance-habitation
/assurance-habitation/[ville]
/assurance-habitation/locataire
/assurance-habitation/proprietaire

/assurance-sante
/assurance-sante/[ville]
/assurance-sante/famille
/assurance-sante/senior

/blog/[slug] (articles génération IA)
/comparateurs/[produit]
/guides/[theme]
```

#### B. Génération Contenu IA

```typescript
interface ContentGeneration {
  // Fréquence
  blog_posts: '1-2 par jour',
  city_pages: '3-5 par jour',
  faq: '5-10 par semaine',

  // Prompts anti-détection
  techniques: [
    'variation_style',
    'multiple_llm_mixing',
    'human_errors_simulation',
    'fact_checking',
    'schema_markup_auto'
  ];

  // Templates par produit
  templates: {
    auto: {
      title_patterns: [
        "Assurance Auto {{ville}} : Prix, Devis & Comparateur 2026",
        "Assurance Auto {{ville}} : Trouvez la Moins Chère",
        "Comparateur Assurance Auto {{ville}} - Économisez jusqu'à 30%"
      ],
      h2_sections: [
        "Prix moyen assurance auto à {{ville}}",
        "Top 5 assureurs à {{ville}}",
        "Comment économiser sur son assurance auto",
        "Obligations légales assurance auto",
        "FAQ assurance auto {{ville}}"
      ]
    }
    // Idem pour habitation, santé, etc.
  };
}
```

#### C. Edge Functions SEO

```typescript
// supabase/functions/
- auto-generate-blog-post (articles quotidiens)
- auto-generate-city-page (pages villes)
- auto-generate-faq (FAQ dynamiques)
- seo-booster (optimisation on-page)
- generate-seo-content (contenu générique)
- gsc-auto-learner (apprentissage GSC)
```

### Système de Publication

```typescript
// Workflow automatisé
1. IA génère contenu → blog_posts table (status: draft)
2. Validation qualité automatique (score > 80/100)
3. Publication programmée (status: published)
4. Création JSON /public/content/blog/[slug].json
5. Indexation Google (IndexNow API)
6. Monitoring positions (rank tracking)
7. A/B testing titres/meta
8. Optimisation continue basée analytics
```

---

## 6. RÉSEAUX SOCIAUX AUTOMATISÉS

### Plateformes & Fréquence

```typescript
interface SocialAutomation {
  platforms: {
    linkedin: {
      frequency: '2x/jour (9h, 15h)',
      content_types: [
        'educational', // Conseils assurance
        'regulatory', // Nouvelles lois
        'testimonials', // Témoignages clients
        'comparisons', // Comparaifs produits
        'tips' // Astuces économies
      ]
    },

    pinterest: {
      frequency: '3x/jour (10h, 14h, 19h)',
      content_types: [
        'infographics', // Infographies prix
        'guides', // Guides pratiques
        'checklists', // Check-lists
        'comparisons' // Tableaux comparatifs
      ]
    },

    twitter: {
      frequency: '4x/jour',
      content_types: ['tips', 'news', 'stats']
    },

    facebook: {
      frequency: '1x/jour',
      content_types: ['articles', 'offers', 'testimonials']
    }
  };
}
```

### Prompts Génération Contenu

```typescript
// Exemple LinkedIn XCR
const linkedinPrompts = {
  educational: [
    "Crée un post LinkedIn sur les 5 erreurs à éviter en assurance habitation. Ton expert mais accessible. Stats + conseils. 1300 chars + hashtags.",
    "Rédige un post sur comment économiser sur son assurance auto en 2026. 3 astuces chiffrées. Ton professionnel. 1300 chars.",
    "Écris un post sur les changements réglementaires assurance santé 2026. Ton informatif. 1300 chars + hashtags."
  ],

  comparisons: [
    "Crée un post comparant assurance auto au tiers vs tous risques. Tableau clair + conseils choix. 1300 chars.",
    "Rédige un comparatif assurance emprunteur : banque vs délégation. Économies chiffrées. 1300 chars."
  ]
};

// Exemple Pinterest XCR
const pinterestPrompts = {
  infographics: [
    "Description Pinterest pour infographie prix moyens assurance auto 2026 par région. 500 chars + CTA + hashtags.",
    "Description pour tableau comparatif garanties assurance habitation. Clair et utile. 500 chars."
  ]
};
```

### Configuration OAuth

```typescript
// Variables environnement requises
VITE_LINKEDIN_CLIENT_ID=your_client_id
VITE_LINKEDIN_CLIENT_SECRET=your_secret
VITE_LINKEDIN_REDIRECT_URI=https://xcr.com/auth/callback/linkedin

VITE_PINTEREST_APP_ID=your_app_id
VITE_PINTEREST_APP_SECRET=your_secret
VITE_PINTEREST_REDIRECT_URI=https://xcr.com/auth/callback/pinterest

VITE_FACEBOOK_APP_ID=your_app_id
VITE_FACEBOOK_APP_SECRET=your_secret

VITE_TWITTER_CLIENT_ID=your_client_id
VITE_TWITTER_CLIENT_SECRET=your_secret
```

---

## 7. ESPACE PROSPECT & CLIENT

### Espace Prospect (Avant Signature)

```typescript
interface ProspectPortal {
  url: '/espace-prospect/:access_token',

  sections: {
    // 1. Vue d'ensemble
    dashboard: {
      progress_bar: 'Avancement dossier 0-100%',
      next_steps: 'Prochaines actions requises',
      status: 'État temps réel',
      timeline: 'Historique interactions'
    },

    // 2. Documents
    documents: {
      checklist_dynamic: true, // Par produit
      upload_drag_drop: true,
      validation_status: ['missing', 'uploaded', 'validated', 'rejected'],
      rejection_reasons: true,
      notifications_email: true
    },

    // 3. Devis
    quotes: {
      comparison_table: true, // Multi-assureurs
      details_guarantees: true,
      accept_online: true,
      payment_simulation: true,
      validity_countdown: true
    },

    // 4. Signature
    signature: {
      electronic_signature: true, // DocuSign-like
      contract_preview: true,
      legal_mentions: true,
      audit_trail: true
    },

    // 5. Paiement
    payment: {
      methods: ['CB', 'prelevement', 'virement'],
      schedule_choice: ['mensuel', 'trimestriel', 'annuel'],
      secure_3ds: true,
      iban_validation: true
    }
  };
}
```

### Espace Client (Après Signature)

```typescript
interface ClientPortal {
  url: '/espace-client/:client_id',

  sections: {
    // 1. Tableau de bord
    dashboard: {
      contracts_active: 'Liste contrats en cours',
      renewals_upcoming: 'Échéances à venir',
      claims_tracking: 'Suivi sinistres',
      documents_vault: 'Coffre-fort numérique',
      recommendations: 'Produits suggérés (cross-sell)'
    },

    // 2. Contrats
    contracts: {
      details_per_contract: true,
      download_pdf: true,
      modify_options: true, // Certaines garanties
      cancel_request: true,
      renewal_quotes: true
    },

    // 3. Sinistres
    claims: {
      declare_online: true,
      upload_photos: true,
      tracking_status: true,
      messages_expert: true,
      settlement_history: true
    },

    // 4. Paiements
    payments: {
      history: true,
      invoices_download: true,
      payment_methods_manage: true,
      schedule_modify: true
    },

    // 5. Assistance
    assistance: {
      chatbot_ia: true,
      rdv_booking: true,
      faq_contextual: true,
      contact_advisor: true
    }
  };
}
```

### Composants React

```typescript
// src/pages/EspaceProspect.tsx (existant, à adapter)
// src/pages/client/ClientDashboard.tsx
// src/pages/client/ClientContracts.tsx
// src/pages/client/ClientClaims.tsx
// src/pages/client/ClientPayments.tsx
// src/pages/client/ClientDocuments.tsx
// src/components/client/ContractCard.tsx
// src/components/client/ClaimTracker.tsx
// src/components/client/PaymentHistory.tsx
```

---

## 8. GESTION DOCUMENTAIRE INTELLIGENTE

### Système de Checklist Dynamique

```typescript
interface DocumentChecklist {
  // Documents par produit
  auto: [
    'permis_conduire',
    'carte_grise',
    'releve_information',
    'rib',
    'justificatif_domicile'
  ],

  habitation: [
    'justificatif_domicile',
    'rib',
    'bail_locataire', // Si locataire
    'titre_propriete', // Si propriétaire
    'diagnostic_electrique',
    'diagnostic_gaz'
  ],

  sante: [
    'rib',
    'attestation_securite_sociale',
    'contrat_actuel', // Si portabilité
    'bulletin_salaire' // Si TNS
  ],

  pro: [
    'kbis',
    'rib',
    'bilan_comptable',
    'rc_actuelle',
    'liste_vehicules' // Si flotte
  ];
}
```

### IA Collecteur de Documents

```typescript
// Edge Function: document-collector-ia
interface DocumentCollector {
  // Détection manquants
  analyze_missing: () => string[];

  // Génération email personnalisé
  generate_request: (missing: string[]) => {
    subject: "{{first_name}}, il manque {{count}} documents",
    body: "Liste personnalisée + raisons + lien upload",
    attachments: ['guide_photo.pdf']
  };

  // Relances intelligentes
  reminder_schedule: {
    first: 'D+1 - Email doux',
    second: 'D+3 - Email + SMS',
    third: 'D+7 - Appel commercial'
  };

  // Validation automatique
  ai_validation: {
    ocr: true, // Lecture automatique
    fraud_detection: true, // Détection falsification
    expiry_check: true, // Vérif dates validité
    quality_check: true // Lisibilité
  };
}
```

### Storage Supabase

```typescript
// Buckets organisation
buckets: {
  'prospect-documents': {
    public: false,
    size_limit: '10MB per file',
    allowed_types: ['pdf', 'jpg', 'png', 'doc', 'docx'],
    retention: '90 days after contract or rejection'
  },

  'client-documents': {
    public: false,
    size_limit: '20MB per file',
    encryption: true,
    retention: '10 years' // Légal
  },

  'contracts-signed': {
    public: false,
    immutable: true,
    audit_trail: true,
    retention: 'permanent'
  }
}
```

---

## 9. ANALYTICS & MONITORING

### Dashboards Critiques

```typescript
interface Analytics {
  // Dashboard Commercial
  commercial: {
    metrics: [
      'leads_nouveaux_jour',
      'conversion_rate_global',
      'conversion_par_produit',
      'pipeline_value',
      'forecast_mensuel',
      'time_to_close',
      'won_deals_montant',
      'lost_reasons'
    ],

    charts: [
      'leads_evolution_7_30_90_days',
      'conversion_funnel',
      'products_repartition',
      'commercials_leaderboard',
      'cohort_analysis'
    ]
  };

  // Dashboard Marketing
  marketing: {
    metrics: [
      'traffic_sources',
      'cost_per_lead',
      'roi_campaigns',
      'organic_vs_paid',
      'bounce_rate_pages',
      'avg_time_on_site',
      'form_completion_rate'
    ],

    seo: [
      'positions_keywords',
      'pages_indexed',
      'backlinks_count',
      'domain_authority',
      'featured_snippets'
    ]
  };

  // Dashboard Automation
  automation: {
    metrics: [
      'emails_sent_delivered_opened',
      'ai_decisions_count',
      'automations_triggered',
      'errors_rate',
      'avg_response_time',
      'cost_per_automation'
    ],

    health: [
      'crons_status',
      'edge_functions_uptime',
      'database_performance',
      'api_latency'
    ]
  };
}
```

### Event Tracking

```typescript
// Événements critiques à tracker
const events = {
  acquisition: [
    'page_view',
    'form_start',
    'form_complete',
    'cta_click',
    'phone_click',
    'chat_open'
  ],

  engagement: [
    'email_open',
    'email_click',
    'document_upload',
    'quote_view',
    'quote_download',
    'portal_login'
  ],

  conversion: [
    'quote_accepted',
    'contract_signed',
    'payment_completed',
    'cross_sell_accepted'
  ],

  retention: [
    'renewal_accepted',
    'claim_declared',
    'modification_requested',
    'cancellation_requested'
  ]
};
```

---

## 10. OPTIMISATIONS PERFORMANCE

### Code Splitting

```typescript
// router.tsx - Lazy loading
const HomePage = lazy(() => import('./pages/Home'));
const AssuranceAuto = lazy(() => import('./pages/AssuranceAuto'));
const BackofficeCRM = lazy(() => import('./backoffice/CRMDashboard'));

// Groupes critiques
{
  'backoffice-crm': ['Dashboard', 'LeadDetail', 'Inbox'],
  'backoffice-analytics': ['Analytics', 'Reports'],
  'client-portal': ['Dashboard', 'Contracts', 'Claims'],
  'public': ['Home', 'Products', 'Blog']
}
```

### Optimisations Images

```typescript
// next/image like - responsive + lazy
<ImageOptimized
  src="/images/hero.jpg"
  alt="..."
  width={1920}
  height={1080}
  sizes="(max-width: 768px) 100vw, 50vw"
  priority={false}
  loading="lazy"
/>
```

### Caching Strategy

```typescript
// Service Worker PWA
workbox: {
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/api\./,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        expiration: { maxEntries: 50, maxAgeSeconds: 300 }
      }
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|webp)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'images-cache',
        expiration: { maxEntries: 200, maxAgeSeconds: 86400 }
      }
    }
  ]
}
```

---

## 11. PROMPTS BOLT.NEW

### Prompt Principal (Copier-Coller)

```
Je souhaite transformer mon site XCR.com (courtage en assurances) en reprenant TOUTES les innovations du système TaxiAssur.com, mais adapté pour un courtier multi-produits (auto, habitation, santé, pro, vie).

CONTEXTE:
- Site actuel XCR.com déjà en ligne avec du contenu
- Objectif: ajouter CRM ultra-avancé + automatisations IA + génération contenu + social media
- Ne PAS casser l'existant, AJOUTER les fonctionnalités

STACK TECHNIQUE (identique TaxiAssur):
- Frontend: React 18 + TypeScript + Vite + TailwindCSS
- Backend: Supabase (PostgreSQL + Edge Functions + Storage + Auth)
- IA: OpenAI GPT-4o-mini + Anthropic Claude (multi-LLM)
- Emails: Brevo API + IONOS IMAP sync
- Réseaux sociaux: LinkedIn, Pinterest, Facebook, Twitter (OAuth + auto-publication)

PHASE 1 - INFRASTRUCTURE BASE (URGENT):

1. **Base de données Supabase - Schema complet**
   - Créer les tables CRM: crm_leads, crm_interactions, crm_documents, crm_quotes, crm_contracts, crm_claims
   - Tables automation: automation_logs, automation_rules, ai_decisions, crm_automation_rules
   - Tables social: social_networks, social_posts
   - Tables content: blog_posts, seo_pages, faq_items
   - Tables email: email_messages, email_templates, email_tracking
   - **IMPORTANT**: Activer RLS sur TOUTES les tables
   - Créer les fonctions PL/pgSQL: increment_social_network_posts(), get_missing_documents(), validate_document()

2. **Structure projet React**
   - Créer dossiers: /src/backoffice/, /src/pages/client/, /src/components/crm/
   - Setup router avec lazy loading
   - Créer contextes: AuthContext, CRMContext
   - Setup Supabase client singleton

3. **Edge Functions Supabase - Liste prioritaire**
   Déployer ces Edge Functions (code Deno TypeScript):

   a) **Emails**:
   - sync-ionos-imap-v2 (synchronisation IMAP → DB)
   - ai-email-classifier (classification automatique)
   - send-email-ionos (envoi SMTP)
   - track-email-open (tracking ouvertures)
   - track-email-click (tracking clics)

   b) **Automation**:
   - crm-automation-engine (règles métier)
   - document-collector-ia (collecte documents)
   - ai-decision-engine (décisions IA)
   - pipeline-automation-engine (pipeline kanban)

   c) **SEO/Content**:
   - auto-generate-blog-post (génération articles)
   - auto-generate-city-page (pages villes)
   - auto-generate-faq (FAQ dynamiques)
   - seo-booster (optimisation on-page)

   d) **Social Media**:
   - social-media-publisher (orchestrateur)
   - linkedin-publisher (publication LinkedIn)
   - pinterest-publisher (publication Pinterest)
   - linkedin-oauth-exchange (OAuth LinkedIn)
   - pinterest-oauth-exchange (OAuth Pinterest)

4. **Crons PostgreSQL (pg_cron)**
   Créer ces tâches planifiées:
   ```sql
   - lead_qualification_hourly (chaque heure)
   - document_collector_15min (toutes les 15min)
   - ai_email_responder_hourly (chaque heure)
   - linkedin_morning_post (9h lun-ven)
   - linkedin_afternoon_post (15h lun-ven)
   - pinterest_morning_pin (10h quotidien)
   - pinterest_afternoon_pin (14h quotidien)
   - pinterest_evening_pin (19h quotidien)
   - blog_auto_daily (quotidien 6h)
   - analytics_report_daily (quotidien 8h)
   ```

PHASE 2 - CRM BACKOFFICE:

Créer ces composants React/TypeScript:

1. **src/backoffice/CRMXCRDashboard.tsx**
   - Pipeline Kanban multi-colonnes (drag & drop)
   - Statuts: nouveau, qualifié, devis_envoyé, négociation, gagné, perdu, attente_documents, signature, production
   - Filtres: produit (auto/habitation/santé/pro/vie), commercial, date, statut
   - Cards leads avec: nom, produit, score (0-100), dernière interaction, actions rapides
   - Graphiques: évolution leads 7/30/90j, taux conversion, pipeline value, top commerciaux

2. **src/backoffice/CRMLeadDetailXCR.tsx**
   - Header: nom, produit, score, statut, commercial assigné
   - Onglets:
     * Informations (formulaire éditable)
     * Timeline (interactions chronologiques avec filtres)
     * Documents (checklist dynamique par produit avec upload/validation)
     * Devis (comparateur multi-assureurs, génération PDF, envoi tracked)
     * Communications (emails/SMS/WhatsApp unifiés)
     * IA Insights (recommandations, next best action, risk analysis)
   - Sidebar: actions rapides (appel, email, SMS, programmer RDV)

3. **src/backoffice/CRMInboxMulticanal.tsx**
   - Liste emails unifiés (IMAP sync temps réel)
   - Filtres: non-lus, assignés à moi, par produit, par priorité
   - Preview email avec:
     * Classification IA (demande_info, documents, réclamation, etc.)
     * Lead matching automatique (recherche par email)
     * Réponses suggérées IA (3 propositions)
     * Actions rapides (assigner, créer lead, envoyer doc)
   - Compositeur email avec templates

4. **src/backoffice/DocumentChecklistPanelXCR.tsx**
   - Checklist dynamique selon produit (auto/habitation/santé/pro)
   - Badges statut: ❌ Manquant, ⏳ Uploadé, ✅ Validé, ⛔ Rejeté
   - Actions: valider, rejeter (avec motif), relancer prospect
   - Lien direct vers espace prospect
   - Historique modifications

PHASE 3 - ESPACE PROSPECT & CLIENT:

1. **src/pages/EspaceProspect.tsx**
   - URL: /espace-prospect/:access_token
   - Auth via access_token (pas de mot de passe)
   - 4 onglets:
     * Documents (upload drag&drop, statuts, instructions)
     * Devis (comparateur, détails, acceptation)
     * Signature (signature électronique, preview contrat)
     * Paiement (CB/prélèvement, simulation mensualités)
   - Progress bar (0-100%) selon documents + actions
   - Notifications temps réel (Supabase Realtime)

2. **src/pages/client/ClientDashboard.tsx**
   - URL: /espace-client (auth Supabase classique)
   - Vue d'ensemble:
     * Contrats actifs (cards avec détails)
     * Prochaines échéances
     * Sinistres en cours
     * Recommandations cross-sell
   - Actions rapides: déclarer sinistre, télécharger attestation, modifier infos

3. **src/pages/client/ClientContracts.tsx**
   - Liste contrats avec filtres (produit, statut)
   - Détail par contrat: garanties, franchises, tarif, échéance
   - Actions: télécharger PDF, modifier options, demander résiliation

4. **src/pages/client/ClientClaims.tsx**
   - Déclarer sinistre en ligne (formulaire + photos)
   - Suivi étapes (déclaration → expertise → indemnisation)
   - Historique sinistres
   - Chat avec expert

PHASE 4 - AUTOMATISATIONS IA:

1. **Qualification automatique leads**
   - À chaque nouveau lead (trigger: insert crm_leads)
   - Edge Function ai-decision-engine analyse:
     * Complétude informations
     * Cohérence données
     * Score qualité (0-100)
     * Produits recommandés
     * Commercial optimal selon charge/spécialité
   - Assignation automatique + notification

2. **Collecte documents intelligente**
   - Cron document_collector_15min
   - Détecte documents manquants par lead
   - Génère email personnalisé avec IA
   - Liste documents + raisons + lien upload
   - Relances automatiques D+1, D+3, D+7

3. **Réponses emails automatiques**
   - Cron ai_email_responder_hourly
   - Classifie emails entrants
   - Répond automatiquement si:
     * Demande info standard (FAQ)
     * Confirmation réception doc
     * Accusé réception
   - Sinon: assigne commercial + draft réponse suggérée

4. **Cross-sell automation**
   - Trigger: contrat signé + D+30/D+90/D+180
   - IA analyse profil client
   - Recommande produits complémentaires
   - Score opportunité (0-100)
   - Email personnalisé + devis comparatif

5. **Relances renouvellement**
   - Trigger: contrat expire dans 60 jours
   - Génère nouveau devis (prix actualisés)
   - Compare avec marché (scraping concurrents)
   - Email comparatif "Vous économisez X€ en restant"
   - Relances D-60, D-30, D-15, D-7

PHASE 5 - SEO & GÉNÉRATION CONTENU:

1. **Articles de blog automatiques**
   - Cron blog_auto_daily (6h, 14h, 22h)
   - Thèmes: assurance auto, habitation, santé, conseils, actualités
   - Prompts anti-détection:
     * Mélange de 3 LLMs (OpenAI, Claude, Mistral)
     * Erreurs humaines simulées
     * Fact-checking automatique
     * Variations style
   - Structure: titre SEO, intro, 5 H2, FAQ, CTA
   - Publication automatique + indexation Google

2. **Pages villes dynamiques**
   - Template: /assurance-[produit]/[ville]
   - Génération contenu localisé:
     * Prix moyens ville
     * Top assureurs disponibles
     * Spécificités locales
     * Témoignages géolocalisés
   - Variables dynamiques depuis DB
   - 1000+ villes France

3. **Comparateurs interactifs**
   - /comparateur/assurance-auto
   - Formulaire 5 étapes
   - Calcul en direct avec APIs assureurs
   - Tableau comparatif détaillé
   - Filtres par garanties/prix/avis
   - Génération devis PDF

PHASE 6 - RÉSEAUX SOCIAUX:

1. **Configuration OAuth**
   - Créer apps: LinkedIn, Pinterest, Facebook, Twitter
   - Variables env: CLIENT_ID, CLIENT_SECRET, REDIRECT_URI
   - Page backoffice /social-connections
   - Boutons connexion OAuth
   - Stockage tokens dans social_networks table

2. **Publications automatiques**
   - LinkedIn: 9h et 15h (lun-ven) - Posts éducatifs/promotionnels
   - Pinterest: 10h, 14h, 19h (quotidien) - Infographies/guides
   - Facebook: 12h (quotidien) - Articles/témoignages
   - Twitter: 8h, 13h, 18h, 22h - Tips/stats/actu

3. **Génération contenu**
   - Templates par plateforme
   - Prompts variables aléatoires
   - Images Pexels automatiques
   - Hashtags optimisés
   - Liens trackés vers site

PHASE 7 - EMAILS & COMMUNICATIONS:

1. **Synchronisation IMAP**
   - Edge Function sync-ionos-imap-v2
   - Cron toutes les 15min
   - Fetch nouveaux emails contact@xcr.com
   - Stockage table email_messages
   - Classification IA automatique

2. **Templates dynamiques**
   - 20+ templates par scénario:
     * Confirmation lead
     * Demande documents
     * Envoi devis
     * Relance sans réponse
     * Remerciement signature
     * Renouvellement
   - Variables: {{first_name}}, {{product}}, {{amount}}, etc.
   - A/B testing sujets

3. **Tracking avancé**
   - Pixel ouverture (track-email-open)
   - Liens cliqués (track-email-click)
   - Géolocalisation
   - Device utilisé
   - Temps passé
   - Triggers automatiques selon comportement

PHASE 8 - ANALYTICS & MONITORING:

1. **Dashboard commercial**
   - Métriques temps réel:
     * Leads jour/semaine/mois
     * Taux conversion global + par produit
     * Pipeline value
     * Forecast mensuel
     * Time to close moyen
   - Graphiques:
     * Évolution leads (chart.js)
     * Funnel conversion
     * Répartition produits (pie)
     * Leaderboard commerciaux

2. **Dashboard marketing**
   - Sources trafic
   - Coût par lead
   - ROI campagnes
   - Positions SEO keywords
   - Pages indexées Google
   - Taux rebond pages

3. **Monitoring système**
   - Santé crons (uptime)
   - Edge Functions latency
   - Database performance
   - Taux erreur automations
   - Logs centralisés

CONTRAINTES IMPORTANTES:

1. **Sécurité maximale**
   - RLS activé sur TOUTES les tables
   - Policies restrictives (auth.uid() checks)
   - Tokens OAuth chiffrés
   - Documents storage privé
   - HTTPS only
   - CORS configuré

2. **Performance**
   - Lazy loading routes
   - Code splitting agressif
   - Images optimisées (WebP + responsive)
   - Cache API (5min TTL)
   - CDN pour static assets
   - Service Worker PWA

3. **Compatibilité**
   - NE PAS casser routes existantes XCR
   - Migrer données existantes
   - Redirections 301 si URLs changent
   - Backward compatibility APIs

4. **Monitoring erreurs**
   - Tous les try/catch loggent dans automation_logs
   - Alertes email si erreurs critiques
   - Retry automatique failed jobs
   - Dead letter queue

LIVRABLES ATTENDUS:

1. Schema SQL complet Supabase (migrations)
2. Tous les Edge Functions (code Deno)
3. Tous les composants React (TypeScript)
4. Configuration crons pg_cron
5. Documentation .env.example
6. Guide déploiement
7. Scripts migration données

ORDRE D'IMPLÉMENTATION:
1. Base données + Edge Functions critiques
2. CRM Backoffice (dashboard + lead detail + inbox)
3. Espace prospect
4. Automatisations (emails + documents)
5. Génération contenu (blog + pages)
6. Réseaux sociaux
7. Espace client complet
8. Analytics + monitoring

Commence par la PHASE 1, créé les migrations SQL Supabase avec RLS, puis demande validation avant de passer aux Edge Functions.
```

### Prompts Complémentaires (Après Phase 1)

```
PROMPT 2 - Edge Functions Emails:
"Crée les Edge Functions Supabase pour le système email:
1. sync-ionos-imap-v2: connexion IMAP, fetch emails, parse, stockage DB
2. ai-email-classifier: classification (demande_info, documents, réclamation, etc.) + extraction données + priorité
3. send-email-ionos: envoi SMTP avec tracking
4. track-email-open: pixel 1x1, log ouverture + geoloc + device
5. track-email-click: redirect trackant, log clic
Utilise @supabase/supabase-js@2, OpenAI API pour classification."

PROMPT 3 - CRM Dashboard:
"Crée src/backoffice/CRMXCRDashboard.tsx:
- Pipeline Kanban avec react-beautiful-dnd
- Colonnes: nouveau, qualifié, devis_envoyé, négociation, attente_documents, signature, gagné, perdu
- Cards leads: nom, produit (badge couleur), score (jauge 0-100), dernière interaction, boutons actions
- Filtres: produit, commercial, date, recherche
- Stats header: leads jour, conversion rate, pipeline value
- Graphiques: chart.js pour évolution + funnel
Utilise Supabase Realtime pour mises à jour live."

PROMPT 4 - Document Collector:
"Crée Edge Function document-collector-ia:
1. Analyse lead: quels documents manquent selon produit
2. Génère email personnalisé OpenAI: ton professionnel, liste docs, raisons, lien upload
3. Schedule relances automatiques D+1, D+3, D+7
4. Log automation_logs
Inclus templates par produit (auto, habitation, santé, pro)."

PROMPT 5 - Social Media:
"Configure système publications automatiques:
1. Edge Function social-media-publisher: génère contenu OpenAI selon templates, crée post DB, appelle publisher spécifique
2. linkedin-publisher: API v2 ugcPosts
3. pinterest-publisher: API v5 pins
4. Crons: LinkedIn 9h+15h, Pinterest 10h+14h+19h
5. Page backoffice /social-connections avec OAuth buttons
Inclus 10+ prompts variés par plateforme."
```

---

## 📊 INDICATEURS DE SUCCÈS

Après implémentation complète, voici les KPIs attendus:

### Performance Commerciale
- ⏱️ **Time to close**: -40% (de 14j à 8j)
- 📈 **Taux conversion**: +35% (de 12% à 16%)
- 💰 **Pipeline value**: +50%
- 🎯 **Leads qualifiés**: +60%

### Productivité Équipe
- ⚡ **Temps admin**: -70% (automatisation)
- 📧 **Temps réponse emails**: -85% (de 4h à 30min)
- 📄 **Collecte documents**: -60% délai
- 👥 **Leads/commercial**: +45% capacité

### Marketing Digital
- 🔍 **Trafic organique**: +120% (6 mois)
- 📝 **Pages indexées**: +500%
- 🔗 **Backlinks**: +200%
- 📱 **Engagement social**: +300%

### Satisfaction Client
- ⭐ **NPS**: +25 points
- 💬 **Réactivité**: -80% délai réponse
- 📊 **Transparence**: 100% suivi temps réel
- 🎁 **Cross-sell**: +40% taux acceptation

---

## 🎯 CHECKLIST FINALE

### Avant Lancement
- [ ] Migrations SQL appliquées + RLS vérifié
- [ ] Edge Functions déployées + testées
- [ ] Crons configurés + actifs
- [ ] OAuth configuré (LinkedIn, Pinterest, Facebook)
- [ ] Templates emails créés (20+)
- [ ] Prompts IA testés (génération contenu)
- [ ] Webhooks configurés (Brevo, IONOS)
- [ ] Storage buckets + policies
- [ ] Variables environnement production
- [ ] SSL/TLS certificats
- [ ] CDN configuré
- [ ] Monitoring alertes email
- [ ] Backup automatique activé
- [ ] Documentation technique
- [ ] Formation équipe commerciale
- [ ] Tests end-to-end complets

### Post-Lancement J+7
- [ ] Vérifier taux erreur < 1%
- [ ] Confirmer emails délivrés > 95%
- [ ] Valider publications sociales quotidiennes
- [ ] Contrôler articles blog générés
- [ ] Analyser premiers leads CRM
- [ ] Tester parcours prospect complet
- [ ] Optimiser prompts IA si besoin
- [ ] Ajuster scoring leads
- [ ] Fine-tuner automations

---

## 📞 SUPPORT & RESSOURCES

### Documentation Officielle
- Supabase: https://supabase.com/docs
- OpenAI: https://platform.openai.com/docs
- Brevo: https://developers.brevo.com
- LinkedIn API: https://learn.microsoft.com/linkedin/marketing/
- Pinterest API: https://developers.pinterest.com

### Communauté
- Discord Supabase
- Forum Bolt.new
- GitHub issues TaxiAssur (si open-source)

---

**Version**: 1.0
**Dernière mise à jour**: 12 janvier 2026
**Auteur**: Système TaxiAssur → XCR Migration

---

*Ce document est un guide complet pour reproduire l'excellence de TaxiAssur sur XCR. Suivez les phases dans l'ordre, testez à chaque étape, et adaptez selon vos spécificités métier.*
