/**
 * SEO Canonical URL Management
 * Ensures proper canonical tags to prevent duplicate content issues
 */

const SITE_URL = 'https://taxiassur.com';

export interface CanonicalConfig {
  path: string;
  title: string;
  description: string;
  keywords?: string;
  priority?: number;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
}

export function getCanonicalUrl(pathname: string): string {
  const cleanPath = pathname.replace(/\/$/, '');

  if (cleanPath === '' || cleanPath === '/') {
    return SITE_URL;
  }

  return `${SITE_URL}${cleanPath}`;
}

export function generateAlternateLinks(pathname: string): Array<{ rel: string; href: string; hreflang?: string }> {
  const canonical = getCanonicalUrl(pathname);

  return [
    { rel: 'canonical', href: canonical },
    { rel: 'alternate', href: canonical, hreflang: 'fr' },
    { rel: 'alternate', href: canonical, hreflang: 'x-default' }
  ];
}

export const PAGE_CANONICAL_MAP: Record<string, CanonicalConfig> = {
  '/': {
    path: '/',
    title: 'Assurance Taxi Professionnelle - Devis Gratuit',
    description: 'Courtier spécialiste en assurance taxi. Devis gratuit, tarifs négociés, réponse rapide. RC Pro, flotte, tous risques.',
    keywords: 'assurance taxi, courtier taxi, RC pro taxi, assurance flotte taxi',
    priority: 1.0,
    changefreq: 'daily'
  },
  '/assurance-taxi': {
    path: '/assurance-taxi',
    title: 'Assurance Taxi - Couverture Complète',
    description: 'Assurance taxi complète : RC Pro obligatoire, protection conducteur, tous risques. Devis personnalisé gratuit.',
    priority: 1.0,
    changefreq: 'weekly'
  },
  '/assurance-moto-taxi': {
    path: '/assurance-moto-taxi',
    title: 'Assurance Moto Taxi',
    description: 'Assurance spécialisée pour moto taxi. RC Pro, protection optimale, tarifs compétitifs.',
    priority: 0.9,
    changefreq: 'weekly'
  },
  '/assurance-taxi-vtc': {
    path: '/assurance-taxi-vtc',
    title: 'Assurance Taxi VTC',
    description: 'Assurance double activité taxi et VTC. Couverture complète, RC Pro incluse.',
    priority: 0.9,
    changefreq: 'weekly'
  },
  '/prix-assurance-taxi': {
    path: '/prix-assurance-taxi',
    title: 'Prix Assurance Taxi - Tarifs 2025',
    description: 'Découvrez les tarifs d\'assurance taxi en France. Comparaison, conseils pour économiser.',
    priority: 0.9,
    changefreq: 'weekly'
  },
  '/rc-professionnelle': {
    path: '/rc-professionnelle',
    title: 'RC Professionnelle Taxi Obligatoire',
    description: 'RC Pro taxi obligatoire pour tous les taxis. Garanties, tarifs, souscription rapide.',
    priority: 0.9,
    changefreq: 'weekly'
  },
  '/flotte-vehicules': {
    path: '/flotte-vehicules',
    title: 'Assurance Flotte de Taxis',
    description: 'Assurance flotte taxi : tarifs dégressifs, gestion centralisée, assistance 24/7.',
    priority: 0.8,
    changefreq: 'weekly'
  },
  '/gestion-sinistres': {
    path: '/gestion-sinistres',
    title: 'Gestion des Sinistres Taxi',
    description: 'Accompagnement sinistre taxi : déclaration, expertise, indemnisation rapide.',
    priority: 0.8,
    changefreq: 'monthly'
  },
  '/contact': {
    path: '/contact',
    title: 'Contact - Devis Gratuit',
    description: 'Contactez-nous pour un devis d\'assurance taxi gratuit. Réponse sous 24h.',
    priority: 0.8,
    changefreq: 'monthly'
  },
  '/blog': {
    path: '/blog',
    title: 'Blog Assurance Taxi',
    description: 'Conseils, actualités et guides sur l\'assurance taxi professionnelle.',
    priority: 0.7,
    changefreq: 'daily'
  },
  '/avis': {
    path: '/avis',
    title: 'Avis Clients TaxiAssur',
    description: 'Découvrez les avis de nos clients taxis sur nos services d\'assurance.',
    priority: 0.6,
    changefreq: 'weekly'
  },
  '/faq': {
    path: '/faq',
    title: 'FAQ Assurance Taxi',
    description: 'Questions fréquentes sur l\'assurance taxi : RC Pro, tarifs, garanties.',
    priority: 0.7,
    changefreq: 'monthly'
  },
  '/villes': {
    path: '/villes',
    title: 'Assurance Taxi par Ville en France',
    description: 'Assurance taxi disponible dans toutes les villes de France. Trouvez votre ville.',
    priority: 0.8,
    changefreq: 'weekly'
  }
};

export function getPageCanonical(pathname: string): CanonicalConfig | null {
  const cleanPath = pathname.replace(/\/$/, '') || '/';
  return PAGE_CANONICAL_MAP[cleanPath] || null;
}

export function isValidCanonicalUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' &&
           parsed.hostname === 'taxiassur.com' &&
           !parsed.hostname.startsWith('www.');
  } catch {
    return false;
  }
}

export function normalizeUrl(url: string): string {
  return url
    .replace(/^http:/, 'https:')
    .replace(/^https:\/\/www\./, 'https://')
    .replace(/\/$/, '');
}
