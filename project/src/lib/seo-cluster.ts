/**
 * SEO Cluster System - Maillage Interne Intelligent
 * Gère automatiquement les liens entre pages piliers et satellites
 */

export interface SEOPage {
  url: string;
  title: string;
  type: 'pillar' | 'satellite' | 'blog';
  keywords: string[];
  relatedPages?: string[];
}

export const SEO_CLUSTER: Record<string, SEOPage> = {
  // PAGE PILIER PRINCIPALE
  '/assurance-taxi': {
    url: '/assurance-taxi',
    title: 'Assurance Taxi Professionnelle',
    type: 'pillar',
    keywords: ['assurance taxi', 'assurance professionnelle taxi', 'rc pro taxi'],
    relatedPages: [
      '/devis-instantane',
      '/comparateur-axa',
      '/rc-professionnelle',
      '/flotte-vehicules',
      '/assurance-taxi-vtc',
      '/prix-assurance-taxi',
      '/quelle-assurance-taxi'
    ]
  },

  // PAGES SATELLITES - SERVICES
  '/devis-instantane': {
    url: '/devis-instantane',
    title: 'Devis Assurance Taxi Gratuit en 2min',
    type: 'satellite',
    keywords: ['devis assurance taxi', 'devis gratuit taxi', 'simulation assurance taxi'],
    relatedPages: ['/assurance-taxi', '/prix-assurance-taxi']
  },

  '/comparateur-axa': {
    url: '/comparateur-axa',
    title: 'Comparatif Assurance Taxi 2025',
    type: 'satellite',
    keywords: ['comparatif assurance taxi', 'comparateur taxi', 'meilleure assurance taxi'],
    relatedPages: ['/assurance-taxi', '/prix-assurance-taxi']
  },

  '/rc-professionnelle': {
    url: '/rc-professionnelle',
    title: 'RC Professionnelle Taxi Obligatoire',
    type: 'satellite',
    keywords: ['rc pro taxi', 'responsabilité civile taxi', 'assurance obligatoire taxi'],
    relatedPages: ['/assurance-taxi', '/assurance-obligatoire-taxi']
  },

  '/flotte-vehicules': {
    url: '/flotte-vehicules',
    title: 'Assurance Flotte Taxi Multi-Véhicules',
    type: 'satellite',
    keywords: ['assurance flotte taxi', 'assurance multi-véhicules', 'flotte professionnelle'],
    relatedPages: ['/assurance-taxi']
  },

  '/assurance-taxi-vtc': {
    url: '/assurance-taxi-vtc',
    title: 'Assurance VTC et Taxi Combinée',
    type: 'satellite',
    keywords: ['assurance vtc', 'assurance taxi vtc', 'double activité taxi vtc'],
    relatedPages: ['/assurance-taxi', '/assurance-taxi-vtc-combine']
  },

  // PAGES LOCALES (Top 10 villes)
  '/assurance-taxi-paris': {
    url: '/assurance-taxi-paris',
    title: 'Assurance Taxi Paris - Devis Gratuit',
    type: 'satellite',
    keywords: ['assurance taxi paris', 'taxi paris assurance', 'assurance g7 paris'],
    relatedPages: ['/assurance-taxi', '/devis-instantane']
  },

  '/assurance-taxi-lyon': {
    url: '/assurance-taxi-lyon',
    title: 'Assurance Taxi Lyon - Tarifs Compétitifs',
    type: 'satellite',
    keywords: ['assurance taxi lyon', 'taxi lyon assurance'],
    relatedPages: ['/assurance-taxi', '/devis-instantane']
  },

  '/assurance-taxi-marseille': {
    url: '/assurance-taxi-marseille',
    title: 'Assurance Taxi Marseille - Devis Rapide',
    type: 'satellite',
    keywords: ['assurance taxi marseille', 'taxi marseille assurance'],
    relatedPages: ['/assurance-taxi', '/devis-instantane']
  },

  '/assurance-taxi-toulouse': {
    url: '/assurance-taxi-toulouse',
    title: 'Assurance Taxi Toulouse - Expert Local',
    type: 'satellite',
    keywords: ['assurance taxi toulouse', 'taxi toulouse'],
    relatedPages: ['/assurance-taxi', '/devis-instantane']
  },

  '/assurance-taxi-bordeaux': {
    url: '/assurance-taxi-bordeaux',
    title: 'Assurance Taxi Bordeaux - Devis Gratuit',
    type: 'satellite',
    keywords: ['assurance taxi bordeaux', 'taxi bordeaux'],
    relatedPages: ['/assurance-taxi', '/devis-instantane']
  },

  '/assurance-taxi-nice': {
    url: '/assurance-taxi-nice',
    title: 'Assurance Taxi Nice - Côte d\'Azur',
    type: 'satellite',
    keywords: ['assurance taxi nice', 'taxi nice'],
    relatedPages: ['/assurance-taxi', '/devis-instantane']
  },

  '/assurance-taxi-nantes': {
    url: '/assurance-taxi-nantes',
    title: 'Assurance Taxi Nantes - Devis en Ligne',
    type: 'satellite',
    keywords: ['assurance taxi nantes', 'taxi nantes'],
    relatedPages: ['/assurance-taxi', '/devis-instantane']
  },

  '/assurance-taxi-strasbourg': {
    url: '/assurance-taxi-strasbourg',
    title: 'Assurance Taxi Strasbourg - Alsace',
    type: 'satellite',
    keywords: ['assurance taxi strasbourg', 'taxi strasbourg'],
    relatedPages: ['/assurance-taxi', '/devis-instantane']
  },

  '/assurance-taxi-montpellier': {
    url: '/assurance-taxi-montpellier',
    title: 'Assurance Taxi Montpellier - Hérault',
    type: 'satellite',
    keywords: ['assurance taxi montpellier', 'taxi montpellier'],
    relatedPages: ['/assurance-taxi', '/devis-instantane']
  },

  '/assurance-taxi-lille': {
    url: '/assurance-taxi-lille',
    title: 'Assurance Taxi Lille - Nord',
    type: 'satellite',
    keywords: ['assurance taxi lille', 'taxi lille'],
    relatedPages: ['/assurance-taxi', '/devis-instantane']
  }
};

/**
 * Génère les liens internes recommandés pour une page donnée
 */
export function getInternalLinks(currentUrl: string): Array<{ url: string; title: string; anchor: string }> {
  const currentPage = SEO_CLUSTER[currentUrl];
  if (!currentPage) return [];

  const links: Array<{ url: string; title: string; anchor: string }> = [];

  // Toujours linker vers la page pilier (sauf si on est déjà dessus)
  if (currentPage.type !== 'pillar') {
    const pillar = SEO_CLUSTER['/assurance-taxi'];
    links.push({
      url: pillar.url,
      title: pillar.title,
      anchor: 'Découvrez notre assurance taxi professionnelle'
    });
  }

  // Ajouter les pages reliées
  if (currentPage.relatedPages) {
    currentPage.relatedPages.forEach(relatedUrl => {
      const relatedPage = SEO_CLUSTER[relatedUrl];
      if (relatedPage) {
        links.push({
          url: relatedPage.url,
          title: relatedPage.title,
          anchor: `En savoir plus sur ${relatedPage.title.toLowerCase()}`
        });
      }
    });
  }

  return links;
}

/**
 * Génère l'ancre automatique basée sur le contexte
 */
export function generateContextualAnchor(targetUrl: string, context: 'cta' | 'inline' | 'footer'): string {
  const page = SEO_CLUSTER[targetUrl];
  if (!page) return 'En savoir plus';

  const mainKeyword = page.keywords[0] || '';

  switch (context) {
    case 'cta':
      return `Demander un devis ${mainKeyword}`;
    case 'inline':
      return `Découvrez notre ${mainKeyword}`;
    case 'footer':
      return page.title;
    default:
      return 'En savoir plus';
  }
}

/**
 * Obtient les pages similaires (même type ou mêmes keywords)
 */
export function getSimilarPages(currentUrl: string, limit: number = 3): SEOPage[] {
  const currentPage = SEO_CLUSTER[currentUrl];
  if (!currentPage) return [];

  const allPages = Object.values(SEO_CLUSTER);

  return allPages
    .filter(page => page.url !== currentUrl)
    .filter(page => {
      // Même type ou keywords communs
      const hasCommonKeywords = page.keywords.some(kw =>
        currentPage.keywords.includes(kw)
      );
      return page.type === currentPage.type || hasCommonKeywords;
    })
    .slice(0, limit);
}

/**
 * Breadcrumb automatique basé sur l'architecture
 */
export function generateBreadcrumb(currentUrl: string): Array<{ name: string; url: string }> {
  const breadcrumb = [{ name: 'Accueil', url: '/' }];

  const currentPage = SEO_CLUSTER[currentUrl];
  if (!currentPage) return breadcrumb;

  // Si c'est une page satellite, ajouter la pilier avant
  if (currentPage.type === 'satellite') {
    breadcrumb.push({
      name: 'Assurance Taxi',
      url: '/assurance-taxi'
    });
  }

  // Ajouter la page courante
  breadcrumb.push({
    name: currentPage.title,
    url: currentPage.url
  });

  return breadcrumb;
}
