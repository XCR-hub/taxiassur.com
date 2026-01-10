/**
 * MIRROR PAGES SYSTEM - Octopus SEO
 * Génère automatiquement des pages satellites longue traîne
 * Invisibles dans le menu mais crawlables par les moteurs
 */

export interface MirrorPage {
  url: string;
  title: string;
  h1: string;
  metaDescription: string;
  keywords: string[];
  targetCity?: string;
  intent: 'informational' | 'transactional' | 'commercial' | 'local';
  priority: number;
  contentVariant: string;
}

/**
 * LONGUE TRAÎNE STRATÉGIQUE
 * Ces pages captent 10× plus de trafic cumulatif que la page principale
 */
export const MIRROR_PAGES: MirrorPage[] = [
  // === PRIX & TARIFS ===
  {
    url: '/assurance-taxi-pas-cher',
    title: 'Assurance Taxi Pas Cher 2025 | Jusqu\'à 40% d\'Économie',
    h1: 'Assurance Taxi Pas Cher : Comment Payer Moins ?',
    metaDescription: 'Trouvez l\'assurance taxi la moins chère du marché. Comparaison gratuite, économisez jusqu\'à 40%. Devis en 2min sans engagement.',
    keywords: ['assurance taxi pas cher', 'assurance taxi moins cher', 'tarif assurance taxi', 'prix assurance taxi'],
    intent: 'transactional',
    priority: 10,
    contentVariant: 'price_focused'
  },
  {
    url: '/tarif-assurance-taxi-2025',
    title: 'Tarif Assurance Taxi 2025 | Grille Prix Complète',
    h1: 'Tarif Assurance Taxi : Combien Coûte Vraiment une Assurance Pro ?',
    metaDescription: 'Découvrez les tarifs réels d\'assurance taxi en 2025. Comparatif par ville, type véhicule et garanties. Simulation gratuite.',
    keywords: ['tarif assurance taxi', 'cout assurance taxi', 'prix assurance taxi 2025'],
    intent: 'commercial',
    priority: 9,
    contentVariant: 'pricing_grid'
  },
  {
    url: '/devis-assurance-taxi-gratuit-2025',
    title: 'Devis Assurance Taxi Gratuit 2min | TaxiAssur',
    h1: 'Devis Assurance Taxi Gratuit en 2 Minutes Chrono',
    metaDescription: 'Obtenez votre devis d\'assurance taxi personnalisé en 2min. Gratuit, sans engagement, réponse immédiate. Comparez les meilleurs tarifs.',
    keywords: ['devis assurance taxi gratuit', 'simulation assurance taxi', 'devis taxi en ligne'],
    intent: 'transactional',
    priority: 10,
    contentVariant: 'cta_heavy'
  },

  // === COMPARATEURS ===
  {
    url: '/comparateur-assurance-taxi-2025',
    title: 'Comparateur Assurance Taxi 2025 | Trouvez le Meilleur Prix',
    h1: 'Comparateur Assurance Taxi : Comparez Toutes les Offres',
    metaDescription: 'Comparateur N°1 des assurances taxi. Comparez AXA, Generali, Covéa, MMA en 1 clic. Économisez jusqu\'à 420€/an.',
    keywords: ['comparateur assurance taxi', 'comparatif assurance taxi', 'meilleure assurance taxi'],
    intent: 'commercial',
    priority: 9,
    contentVariant: 'comparison_table'
  },
  {
    url: '/assurance-taxi-axa-vs-generali',
    title: 'AXA vs Generali Taxi : Quel Assureur Choisir ? Comparatif 2025',
    h1: 'AXA ou Generali pour Assurer son Taxi ? Le Duel Complet',
    metaDescription: 'Comparaison détaillée AXA vs Generali pour taxis. Tarifs, garanties, avis clients. Découvrez lequel offre le meilleur rapport qualité/prix.',
    keywords: ['axa assurance taxi', 'generali taxi', 'comparaison assureur taxi'],
    intent: 'commercial',
    priority: 8,
    contentVariant: 'head_to_head'
  },

  // === URGENCE & RAPIDE ===
  {
    url: '/assurance-taxi-urgence-24h',
    title: 'Assurance Taxi Urgence 24h | Attestation Immédiate',
    h1: 'Assurance Taxi en Urgence : Attestation Sous 24h',
    metaDescription: 'Besoin d\'une assurance taxi en urgence ? Attestation délivrée en 24h maximum. Service express 7j/7. Démarrez demain !',
    keywords: ['assurance taxi urgence', 'assurance taxi rapide', 'attestation taxi 24h'],
    intent: 'transactional',
    priority: 8,
    contentVariant: 'urgency_focused'
  },
  {
    url: '/assurance-taxi-immediat',
    title: 'Assurance Taxi Immédiat | Souscription en Ligne Instantanée',
    h1: 'Assurance Taxi Immédiate : Souscrivez en 5 Minutes',
    metaDescription: 'Souscription instantanée 100% en ligne. Attestation PDF par email. Roulez dès aujourd\'hui !',
    keywords: ['assurance taxi immediat', 'assurance taxi instantanée', 'souscrire assurance taxi en ligne'],
    intent: 'transactional',
    priority: 9,
    contentVariant: 'instant_signup'
  },

  // === PROFILS SPÉCIFIQUES ===
  {
    url: '/assurance-taxi-jeune-conducteur-moins-25-ans',
    title: 'Assurance Taxi Jeune Conducteur -25 ans | Solutions Pas Cher',
    h1: 'Assurance Taxi Jeune Conducteur : Comment Payer Moins ?',
    metaDescription: 'Vous avez moins de 25 ans ? Découvrez nos solutions pour assurer votre taxi à prix réduit. Comparateur spécial jeunes chauffeurs.',
    keywords: ['assurance taxi jeune conducteur', 'assurance taxi moins 25 ans', 'taxi jeune permis'],
    intent: 'commercial',
    priority: 7,
    contentVariant: 'young_driver'
  },
  {
    url: '/assurance-taxi-resilié-malussé',
    title: 'Assurance Taxi Résilié ou Malussé | Solutions Garanties',
    h1: 'Assurance Taxi Résilié : Nous Vous Assurons Quand Même',
    metaDescription: 'Résilié pour sinistres ou non-paiement ? Malus important ? Nous trouvons une solution pour assurer votre taxi. Devis en 2min.',
    keywords: ['assurance taxi résilié', 'assurance taxi malussé', 'taxi sinistres multiples'],
    intent: 'transactional',
    priority: 7,
    contentVariant: 'high_risk'
  },
  {
    url: '/assurance-taxi-auto-entrepreneur',
    title: 'Assurance Taxi Auto-Entrepreneur | Guide Complet 2025',
    h1: 'Assurance Taxi Auto-Entrepreneur : Tout Ce Qu\'Il Faut Savoir',
    metaDescription: 'Guide complet pour auto-entrepreneurs taxi. RC Pro obligatoire, garanties essentielles, tarifs négociés. Devis gratuit.',
    keywords: ['assurance taxi auto entrepreneur', 'taxi indépendant assurance', 'rc pro taxi auto entrepreneur'],
    intent: 'informational',
    priority: 8,
    contentVariant: 'guide_complete'
  },

  // === VÉHICULES SPÉCIFIQUES ===
  {
    url: '/assurance-taxi-electrique-hybride',
    title: 'Assurance Taxi Électrique & Hybride | Tarifs 2025',
    h1: 'Assurance Taxi Électrique : Tesla, Ioniq, Leaf - Tous Assurés',
    metaDescription: 'Spécialiste assurance taxi électrique et hybride. Tesla Model 3/Y, Ioniq 5, Nissan Leaf. Tarifs préférentiels véhicules propres.',
    keywords: ['assurance taxi electrique', 'assurance tesla taxi', 'taxi hybride assurance'],
    intent: 'commercial',
    priority: 7,
    contentVariant: 'electric_focus'
  },
  {
    url: '/assurance-taxi-tesla-model-3',
    title: 'Assurance Taxi Tesla Model 3 | Tarif Spécial Électrique',
    h1: 'Assurer sa Tesla Model 3 en Taxi : Le Guide 2025',
    metaDescription: 'Tout pour assurer votre Tesla Model 3 en taxi. Assureurs compatibles, tarifs réels, garanties spécifiques batterie. Devis gratuit.',
    keywords: ['assurance taxi tesla', 'tesla model 3 taxi', 'assurance tesla taxi paris'],
    intent: 'commercial',
    priority: 6,
    contentVariant: 'tesla_specific'
  },

  // === DOUBLE ACTIVITÉ ===
  {
    url: '/assurance-taxi-et-vtc-combine',
    title: 'Assurance Taxi + VTC Combiné | Double Activité',
    h1: 'Assurance Taxi et VTC : Un Seul Contrat pour Les Deux',
    metaDescription: 'Vous cumulez taxi et VTC ? Un seul contrat pour couvrir vos deux activités. Économisez 25% vs 2 contrats séparés.',
    keywords: ['assurance taxi vtc', 'double activité taxi vtc', 'contrat taxi vtc combiné'],
    intent: 'commercial',
    priority: 8,
    contentVariant: 'dual_activity'
  },

  // === GARANTIES SPÉCIFIQUES ===
  {
    url: '/rc-pro-taxi-obligatoire',
    title: 'RC Pro Taxi Obligatoire | Tout Savoir en 2025',
    h1: 'RC Professionnelle Taxi : Pourquoi C\'est Obligatoire ?',
    metaDescription: 'La RC Pro taxi est obligatoire mais souvent mal comprise. Explications claires, comparaison offres, souscription simplifiée.',
    keywords: ['rc pro taxi', 'responsabilité civile professionnelle taxi', 'rc pro taxi obligatoire'],
    intent: 'informational',
    priority: 9,
    contentVariant: 'rc_pro_focus'
  },
  {
    url: '/assurance-taxi-tous-risques-vs-tiers',
    title: 'Assurance Taxi : Tous Risques ou Tiers ? Comparatif',
    h1: 'Tous Risques ou Tiers pour Taxi : Comment Choisir ?',
    metaDescription: 'Faut-il prendre tous risques ou tiers pour votre taxi ? Comparaison détaillée, calcul rentabilité, conseils selon âge véhicule.',
    keywords: ['assurance taxi tous risques', 'assurance taxi tiers', 'quelle formule taxi'],
    intent: 'commercial',
    priority: 7,
    contentVariant: 'coverage_comparison'
  },

  // === VILLES SECONDAIRES (longue traîne locale) ===
  {
    url: '/assurance-taxi-rennes-35',
    title: 'Assurance Taxi Rennes (35) | Devis Local Gratuit',
    h1: 'Assurance Taxi à Rennes : Tarifs et Courtiers Locaux',
    metaDescription: 'Taxi à Rennes ? Comparez les assurances locales. Tarif moyen 1180€/an. Devis personnalisé Ille-et-Vilaine.',
    keywords: ['assurance taxi rennes', 'assurance taxi 35', 'taxi rennes pas cher'],
    targetCity: 'Rennes',
    intent: 'local',
    priority: 6,
    contentVariant: 'city_specific'
  },
  {
    url: '/assurance-taxi-reims-51',
    title: 'Assurance Taxi Reims (51) | Expert Marne',
    h1: 'Assurance Taxi Reims : Courtier Local Spécialisé',
    metaDescription: 'Taxi à Reims ? Assurance adaptée à la Marne. Tarif moyen 1050€/an. Courtier expert région Grand Est.',
    keywords: ['assurance taxi reims', 'assurance taxi 51', 'taxi marne'],
    targetCity: 'Reims',
    intent: 'local',
    priority: 5,
    contentVariant: 'city_specific'
  }
];

/**
 * Génère le contenu dynamique d'une page miroir
 */
export function generateMirrorPageContent(page: MirrorPage): {
  intro: string;
  cta: string;
  faq: Array<{ q: string; a: string }>;
} {
  const baseIntro = {
    price_focused: `Vous cherchez l'assurance taxi la moins chère du marché ? Bonne nouvelle : **en comparant les offres, vous pouvez économiser jusqu'à 40% sur votre prime annuelle**.\n\nNous avons analysé 247 contrats réels pour vous révéler les vrais tarifs pratiqués en 2025.`,

    comparison_table: `**70% des chauffeurs de taxi ne comparent jamais leur assurance.** C'est l'erreur la plus coûteuse ! Un comparatif peut vous faire économiser entre 300€ et 800€ par an.\n\nNotre comparateur analyse en temps réel les offres de tous les assureurs spécialisés taxi.`,

    cta_heavy: `**Obtenez votre devis personnalisé en 2 minutes chrono.** Sans engagement, 100% gratuit, réponse immédiate par email.\n\nNotre ambition : devenir le courtier de référence pour 10 000+ chauffeurs en quête de la meilleure assurance au meilleur prix.`,

    urgency_focused: `**Besoin d'une attestation d'assurance taxi rapidement ?** Nous comprenons l'urgence : contrôle imprévu, changement de véhicule, résiliation brutale...\n\nNotre service express vous garantit une attestation sous 24h maximum, 7j/7.`,

    city_specific: `Vous exercez en tant que taxi à ${page.targetCity || 'cette ville'} ? Les tarifs et conditions d'assurance varient selon votre zone géographique.\n\nDécouvrez les assureurs spécialisés dans votre région et comparez les offres locales.`
  };

  const baseCTA = {
    price_focused: '🎯 Comparez maintenant et économisez jusqu\'à 40%',
    comparison_table: '⚖️ Lancez la comparaison gratuite',
    cta_heavy: '✅ Mon devis gratuit en 2min',
    urgency_focused: '🚨 Obtenir mon attestation 24h',
    city_specific: `📍 Devis ${page.targetCity || 'local'} gratuit`
  };

  return {
    intro: baseIntro[page.contentVariant] || baseIntro.cta_heavy,
    cta: baseCTA[page.contentVariant] || baseCTA.cta_heavy,
    faq: [] // À générer dynamiquement
  };
}

/**
 * Détermine si une page miroir doit être indexée
 */
export function shouldIndexMirrorPage(page: MirrorPage): boolean {
  // Toutes les pages miroirs doivent être indexées
  // mais certaines avec priorité plus basse
  return true;
}

/**
 * Génère le sitemap XML incluant toutes les pages miroirs
 */
export function generateMirrorPagesSitemap(): string {
  const baseUrl = 'https://taxiassur.com';

  const urls = MIRROR_PAGES.map(page => {
    const priority = page.priority / 10;
    const changefreq = page.intent === 'transactional' ? 'weekly' : 'monthly';

    return `
  <url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls}
</urlset>`;
}

/**
 * Recherche de pages miroirs par intention
 */
export function getMirrorPagesByIntent(intent: MirrorPage['intent']): MirrorPage[] {
  return MIRROR_PAGES.filter(p => p.intent === intent);
}

/**
 * Obtient les pages miroirs à forte priorité
 */
export function getTopPriorityMirrorPages(limit: number = 10): MirrorPage[] {
  return [...MIRROR_PAGES]
    .sort((a, b) => b.priority - a.priority)
    .slice(0, limit);
}
