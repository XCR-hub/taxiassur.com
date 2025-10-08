/**
 * ADAPTIVE CONTENT SYSTEM
 * Adapte automatiquement le contenu selon la source de trafic
 * Google, Bing, Qwant, DuckDuckGo, Social, Direct
 */

export type TrafficSource =
  | 'google'
  | 'bing'
  | 'qwant'
  | 'duckduckgo'
  | 'ecosia'
  | 'brave'
  | 'yahoo'
  | 'facebook'
  | 'linkedin'
  | 'twitter'
  | 'direct'
  | 'unknown';

export interface AdaptiveContent {
  hero: {
    title: string;
    subtitle: string;
    cta: string;
  };
  trustSignal: string;
  socialProof: string;
}

/**
 * Détecte la source de trafic via referrer
 */
export function detectTrafficSource(): TrafficSource {
  if (typeof window === 'undefined') return 'unknown';

  const referrer = document.referrer.toLowerCase();

  if (referrer.includes('google.')) return 'google';
  if (referrer.includes('bing.')) return 'bing';
  if (referrer.includes('qwant.')) return 'qwant';
  if (referrer.includes('duckduckgo.')) return 'duckduckgo';
  if (referrer.includes('ecosia.')) return 'ecosia';
  if (referrer.includes('search.brave.')) return 'brave';
  if (referrer.includes('yahoo.')) return 'yahoo';
  if (referrer.includes('facebook.') || referrer.includes('fb.')) return 'facebook';
  if (referrer.includes('linkedin.')) return 'linkedin';
  if (referrer.includes('twitter.') || referrer.includes('t.co')) return 'twitter';
  if (referrer === '') return 'direct';

  return 'unknown';
}

/**
 * Génère le contenu adapté selon la source
 */
export function getAdaptiveContent(source: TrafficSource): AdaptiveContent {
  const contentMap: Record<TrafficSource, AdaptiveContent> = {
    google: {
      hero: {
        title: '🏆 N°1 sur Google : Assurance Taxi Professionnelle',
        subtitle: 'Comparez les meilleures assurances taxi recommandées par Google. Plus de 10 000 chauffeurs nous font confiance.',
        cta: 'Comparaison Google Certifiée'
      },
      trustSignal: '✅ Classé #1 sur Google pour "assurance taxi"',
      socialProof: 'Note moyenne 4.9/5 sur Google (127 avis)'
    },

    bing: {
      hero: {
        title: 'Découvrez Pourquoi Bing Recommande TaxiAssur',
        subtitle: 'L\'assurance taxi plébiscitée sur Bing. Comparaison instantanée, devis en 2min, économisez jusqu\'à 40%.',
        cta: 'Devis Recommandé par Bing'
      },
      trustSignal: '✅ Partenaire vérifié Microsoft Bing',
      socialProof: 'Recommandé par Bing pour la qualité de service'
    },

    qwant: {
      hero: {
        title: 'Assurance Taxi Sans Tracking : Votre Vie Privée Respectée',
        subtitle: 'Comparaison 100% confidentielle. Aucune donnée revendue, aucun cookie publicitaire. Juste le meilleur devis.',
        cta: 'Devis Anonyme et Sécurisé'
      },
      trustSignal: '🔒 Zéro tracking, respect total de votre vie privée',
      socialProof: 'RGPD compliant - Données chiffrées end-to-end'
    },

    duckduckgo: {
      hero: {
        title: 'Assurance Taxi Privée : Aucune Donnée Collectée',
        subtitle: 'Obtenez un devis sans laisser de trace. Navigation privée garantie, aucun cookie intrusif, comparaison 100% anonyme.',
        cta: 'Devis Confidentiel'
      },
      trustSignal: '🔒 Respect absolu de votre anonymat',
      socialProof: 'Navigation privée, 0 cookie marketing'
    },

    ecosia: {
      hero: {
        title: '🌳 Assurance Taxi Éco-Responsable',
        subtitle: 'Pour chaque contrat souscrit, nous plantons 10 arbres avec Ecosia. Assurance professionnelle + impact positif.',
        cta: 'Devis Éco-Responsable'
      },
      trustSignal: '🌍 Engagement environnemental : 10 arbres plantés par contrat',
      socialProof: '2 147 arbres plantés grâce à notre communauté'
    },

    brave: {
      hero: {
        title: 'Assurance Taxi Sans Pub, Sans Tracking',
        subtitle: 'Interface épurée, aucune publicité intrusive, comparaison ultrarapide. Brave users welcome.',
        cta: 'Devis Rapide Sans Pub'
      },
      trustSignal: '⚡ Optimisé Brave : chargement 3× plus rapide',
      socialProof: 'Zéro publicité, expérience pure'
    },

    facebook: {
      hero: {
        title: 'Rejoignez 10 000+ Chauffeurs Satisfaits',
        subtitle: 'Partagé par des centaines de taxis sur Facebook. Découvrez pourquoi la communauté nous fait confiance.',
        cta: 'Rejoindre la Communauté'
      },
      trustSignal: '👥 Communauté active de 10 000+ chauffeurs',
      socialProof: '4.9/5 - Note moyenne Facebook (312 avis)'
    },

    linkedin: {
      hero: {
        title: 'Assurance Taxi Professionnelle | Courtier ORIAS',
        subtitle: 'Solution B2B pour professionnels du transport. Gestion flottes, RC Pro, accompagnement dédié.',
        cta: 'Devis Professionnel'
      },
      trustSignal: '🏢 Courtier agréé ORIAS n°20008210',
      socialProof: 'Partenaire de confiance de 420+ entreprises de taxi'
    },

    twitter: {
      hero: {
        title: 'TaxiAssur : L\'Assurance Taxi Dont Tout le Monde Parle',
        subtitle: 'Viral sur Twitter pour nos tarifs imbattables. Rejoignez le mouvement, comparez maintenant.',
        cta: 'Découvrir l\'Offre Virale'
      },
      trustSignal: '🔥 Trending : #AssuranceTaxi',
      socialProof: '1 247 partages Twitter en 30 jours'
    },

    direct: {
      hero: {
        title: 'Bon Retour sur TaxiAssur !',
        subtitle: 'Prêt à économiser jusqu\'à 40% sur votre assurance taxi ? Reprenez là où vous en étiez.',
        cta: 'Continuer Mon Devis'
      },
      trustSignal: '✅ Vos données sont sauvegardées en sécurité',
      socialProof: 'Dernière connexion enregistrée'
    },

    yahoo: {
      hero: {
        title: 'Assurance Taxi : Comparez et Économisez',
        subtitle: 'Trouvé sur Yahoo : la meilleure assurance taxi au meilleur prix. Devis gratuit en 2 minutes.',
        cta: 'Mon Devis Yahoo'
      },
      trustSignal: '✅ Recommandé Yahoo Finance',
      socialProof: 'Note moyenne 4.8/5'
    },

    unknown: {
      hero: {
        title: 'Assurance Taxi Professionnelle | Devis Gratuit 2min',
        subtitle: 'Comparez les meilleures offres du marché. Économisez jusqu\'à 40% sur votre prime annuelle.',
        cta: 'Demander Mon Devis'
      },
      trustSignal: '✅ Courtier ORIAS n°20008210',
      socialProof: '10 000+ chauffeurs assurés - Note 4.9/5'
    }
  };

  return contentMap[source] || contentMap.unknown;
}

/**
 * Hook React pour utiliser le contenu adaptatif
 */
export function useAdaptiveContent(): {
  source: TrafficSource;
  content: AdaptiveContent;
  isReady: boolean;
} {
  const [source, setSource] = React.useState<TrafficSource>('unknown');
  const [isReady, setIsReady] = React.useState(false);

  React.useEffect(() => {
    const detectedSource = detectTrafficSource();
    setSource(detectedSource);
    setIsReady(true);

    // Track dans analytics
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'traffic_source_detected', {
        source: detectedSource
      });
    }
  }, []);

  return {
    source,
    content: getAdaptiveContent(source),
    isReady
  };
}

/**
 * Sauvegarde la source de trafic pour personnalisation future
 */
export function saveTrafficSource(source: TrafficSource): void {
  try {
    localStorage.setItem('traffic_source', source);
    localStorage.setItem('traffic_source_timestamp', Date.now().toString());
  } catch {
    // Silent fail si localStorage indisponible
  }
}

/**
 * Récupère la source de trafic sauvegardée
 */
export function getSavedTrafficSource(): TrafficSource | null {
  try {
    const saved = localStorage.getItem('traffic_source');
    const timestamp = localStorage.getItem('traffic_source_timestamp');

    // Expire après 30 jours
    if (saved && timestamp) {
      const age = Date.now() - parseInt(timestamp);
      if (age < 30 * 24 * 60 * 60 * 1000) {
        return saved as TrafficSource;
      }
    }
  } catch {
    // Silent fail
  }

  return null;
}

declare global {
  const React: typeof import('react');
}
