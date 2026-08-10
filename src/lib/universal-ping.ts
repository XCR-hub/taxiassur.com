import { logger } from '@/lib/logger';
import { internalFunctionHeaders } from '@/lib/internal-function-auth';

/**
 * Système de ping universel pour tous les moteurs de recherche
 * Objectif : Maximiser la visibilité et devenir n°1 en leads assurance taxi
 */

export interface SearchEngine {
  name: string;
  active: boolean;
  market: string;
  pingMethod: 'indexnow' | 'sitemap' | 'api' | 'manual';
  url?: string;
}

export const SEARCH_ENGINES: SearchEngine[] = [
  // Moteurs majeurs actifs
  { name: 'Google', active: true, market: 'Global (92%)', pingMethod: 'indexnow' },
  { name: 'Bing', active: true, market: 'Global (3%)', pingMethod: 'indexnow' },
  { name: 'Yahoo', active: true, market: 'Global (1%)', pingMethod: 'indexnow' },
  { name: 'DuckDuckGo', active: true, market: 'Privacy (0.5%)', pingMethod: 'indexnow' },
  { name: 'Yandex', active: true, market: 'Russia (60%)', pingMethod: 'indexnow' },
  { name: 'Baidu', active: true, market: 'China (70%)', pingMethod: 'manual' },
  { name: 'Qwant', active: true, market: 'France (0.3%)', pingMethod: 'sitemap' },
  { name: 'Ecosia', active: true, market: 'Green (0.1%)', pingMethod: 'sitemap' },
  { name: 'Brave Search', active: true, market: 'Privacy (0.05%)', pingMethod: 'sitemap' },
  { name: 'Startpage', active: true, market: 'Privacy', pingMethod: 'sitemap' },
  { name: 'Naver', active: true, market: 'Korea (55%)', pingMethod: 'manual' },
  { name: 'Seznam', active: true, market: 'Czech (50%)', pingMethod: 'manual' },
  { name: 'Swisscows', active: true, market: 'Switzerland', pingMethod: 'sitemap' },
  { name: 'Mojeek', active: true, market: 'UK Independent', pingMethod: 'sitemap' },

  // Moteurs spécialisés
  { name: 'Google News', active: true, market: 'Actualités', pingMethod: 'sitemap' },
  { name: 'Bing News', active: true, market: 'Actualités', pingMethod: 'sitemap' },

  // Métamoteurs
  { name: 'Dogpile', active: true, market: 'Métamoteur', pingMethod: 'sitemap' },
  { name: 'MetaGer', active: true, market: 'Allemagne', pingMethod: 'sitemap' },

  // Historiques encore actifs
  { name: 'Ask.com', active: true, market: 'Legacy', pingMethod: 'sitemap' },
  { name: 'Lycos', active: true, market: 'Legacy', pingMethod: 'manual' },
];

/**
 * Ping universel via IndexNow API
 * Supporte Google, Bing, Yandex simultanément
 */
export async function pingAllSearchEngines(urls: string[]): Promise<{
  success: boolean;
  results: Array<{ engine: string; status: string; note?: string }>;
}> {
  try {
    // Use Supabase Edge Function to bypass CORS
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      logger.error('Supabase URL missing');
      return { success: false, results: [] };
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/indexnow-ping`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': (await internalFunctionHeaders()).Authorization
      },
      body: JSON.stringify({ urls })
    });

    if (!response.ok) {
      throw new Error(`Edge Function error: ${response.status}`);
    }

    const data = await response.json();
    return {
      success: data.success,
      results: data.results || []
    };

  } catch (error) {
    logger.error('Ping error:', error);

    // Fallback results if edge function fails
    return {
      success: false,
      results: [
        {
          engine: 'IndexNow',
          status: 'error',
          note: 'La soumission IndexNow a échoué. Reconnectez-vous puis réessayez.'
        },
        {
          engine: 'Google',
          status: 'monitoring',
          note: 'Crawl automatique actif'
        },
        {
          engine: 'DuckDuckGo',
          status: 'monitoring',
          note: 'Indexé via Bing'
        }
      ]
    };
  }
}

/**
 * Stratégie SEO pour devenir n°1 en leads assurance taxi
 */
export const SEO_STRATEGY = {
  keywords: {
    primary: [
      'assurance taxi',
      'assurance taxi pas cher',
      'devis assurance taxi',
      'assurance professionnelle taxi',
      'comparateur assurance taxi'
    ],
    longTail: [
      'assurance taxi paris prix',
      'assurance taxi vtc comparatif',
      'meilleure assurance taxi 2025',
      'assurance taxi jeune conducteur',
      'assurance taxi resilié',
      'assurance taxi tesla',
      'assurance flotte taxi'
    ],
    local: [
      'assurance taxi [VILLE]',
      'courtier assurance taxi [VILLE]',
      'devis assurance taxi [VILLE]'
    ]
  },

  contentPillars: [
    {
      title: 'Guides Complets',
      pages: [
        '/assurance-taxi',
        '/prix-assurance-taxi',
        '/comparateur-assurance-taxi',
        '/devis-instantane'
      ]
    },
    {
      title: 'Pages Locales',
      strategy: 'Créer une page par grande ville française (100+ villes)',
      template: '/assurance-taxi-[ville]'
    },
    {
      title: 'Blog SEO',
      frequency: 'minimum 2 articles/semaine',
      topics: [
        'Actualités réglementation taxi',
        'Comparatifs assureurs',
        'Témoignages clients',
        'Conseils économie assurance'
      ]
    },
    {
      title: 'FAQ Structurée',
      format: 'Schema.org FAQ + Rich Snippets',
      target: 'Position 0 Google'
    }
  ],

  technicalSEO: [
    'Vitesse chargement < 1.5s',
    'Core Web Vitals excellents',
    'Mobile-first design',
    'Schema.org markup complet',
    'Sitemap XML dynamique',
    'Internal linking optimisé',
    'Breadcrumbs structurés',
    'Canonical tags corrects'
  ],

  backlinkStrategy: [
    'Partenariats blogs auto/finance (DA 30+)',
    'Guest posts sites assurance',
    'Annuaires professionnels ORIAS',
    'Liens presse locale (100+ villes)',
    'Partenariats fédérations taxi',
    'Témoignages clients = backlinks naturels'
  ],

  conversionOptimization: [
    'Formulaire ultra-simple (3 champs)',
    'Devis instantané visible',
    'Téléphone cliquable partout',
    'Chatbot intelligent 24/7',
    'Social proof (avis, chiffres)',
    'Urgence (offre limitée)',
    'Garantie satisfaction',
    'Exit intent popup'
  ]
};

/**
 * URLs prioritaires pour indexation rapide
 */
export function getPriorityUrls(): string[] {
  const baseUrl = 'https://taxiassur.com';

  // Top 20 pages stratégiques
  return [
    baseUrl,
    `${baseUrl}/assurance-taxi`,
    `${baseUrl}/prix-assurance-taxi`,
    `${baseUrl}/devis-instantane`,
    `${baseUrl}/assurance-taxi-paris`,
    `${baseUrl}/assurance-taxi-lyon`,
    `${baseUrl}/assurance-taxi-marseille`,
    `${baseUrl}/assurance-taxi-toulouse`,
    `${baseUrl}/assurance-taxi-nice`,
    `${baseUrl}/assurance-taxi-vtc`,
    `${baseUrl}/assurance-moto-taxi`,
    `${baseUrl}/assurance-flotte-taxi`,
    `${baseUrl}/blog`,
    `${baseUrl}/faq`,
    `${baseUrl}/avis`,
    `${baseUrl}/contact`,
    `${baseUrl}/comparateur`,
    `${baseUrl}/assurance-taxi-jeune-conducteur`,
    `${baseUrl}/assurance-taxi-resilie`,
    `${baseUrl}/partenaires`
  ];
}

/**
 * Vérifier la position dans les SERPs
 */
export async function checkSERPPosition(keyword: string): Promise<{
  position: number | null;
  url: string | null;
  note: string;
}> {
  // Cette fonction nécessiterait une API comme DataForSEO ou SEMrush
  // Pour l'instant, c'est un placeholder

  return {
    position: null,
    url: null,
    note: 'Intégration API SEO à configurer (SEMrush, Ahrefs, DataForSEO)'
  };
}
