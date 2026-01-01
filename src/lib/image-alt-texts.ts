export const imageAltTexts = {
  logo: {
    main: 'TaxiAssur - Courtier spécialiste en assurance taxi',
    header: 'Logo TaxiAssur, votre courtier en assurance taxi',
    footer: 'TaxiAssur, expert en assurance professionnelle pour taxis',
  },

  icons: {
    check: 'Icône de validation',
    shield: 'Icône de protection et sécurité',
    phone: 'Icône téléphone pour contact direct',
    email: 'Icône email pour contact par courriel',
    location: 'Icône de localisation géographique',
    clock: 'Icône horloge indiquant le délai',
    star: 'Icône étoile représentant une évaluation',
    user: 'Icône utilisateur',
    document: 'Icône document',
  },

  services: {
    insurance: 'Illustration assurance taxi professionnelle',
    quote: 'Formulaire de devis d\'assurance taxi en ligne',
    fleet: 'Gestion de flotte de taxis assurés',
    claim: 'Gestion des sinistres pour chauffeurs de taxi',
    rcPro: 'Assurance responsabilité civile professionnelle taxi',
  },

  testimonials: {
    default: 'Photo de profil d\'un client satisfait TaxiAssur',
    placeholder: 'Avatar d\'un chauffeur de taxi client TaxiAssur',
  },

  cities: {
    default: (cityName: string) => `Assurance taxi à ${cityName} - Vue de la ville`,
    landmark: (cityName: string, landmark: string) => `${landmark} à ${cityName}, zone de couverture TaxiAssur`,
  },

  blog: {
    featured: (title: string) => `Illustration de l'article : ${title}`,
    thumbnail: (title: string) => `Aperçu de l'article : ${title}`,
    category: (category: string) => `Icône catégorie ${category}`,
  },

  partners: {
    logo: (partnerName: string) => `Logo de notre partenaire ${partnerName}`,
    certification: (certName: string) => `Certification ${certName} de TaxiAssur`,
  },

  dashboard: {
    chart: (chartType: string) => `Graphique ${chartType} des statistiques`,
    metric: (metricName: string) => `Indicateur ${metricName}`,
    avatar: (userName: string) => `Photo de profil de ${userName}`,
  },

  ui: {
    decorative: '',
    loading: 'Chargement en cours',
    error: 'Une erreur est survenue',
    success: 'Opération réussie',
    warning: 'Attention',
  },
};

export function getImageAlt(category: keyof typeof imageAltTexts, key: string, ...args: string[]): string {
  const categoryObj = imageAltTexts[category];

  if (!categoryObj) return '';

  const value = (categoryObj as any)[key];

  if (typeof value === 'function') {
    return value(...args);
  }

  return value || '';
}

export default imageAltTexts;
