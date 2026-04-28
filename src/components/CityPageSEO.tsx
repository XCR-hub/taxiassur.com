import React from 'react';
import { Helmet } from 'react-helmet-async';

interface CityData {
  name: string;
  slug: string;
  region: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  population: number;
  taxiCount?: number;
  basePrice?: number;
}

const CITIES: Record<string, CityData> = {
  paris: { name: 'Paris', slug: 'paris', region: 'Île-de-France', postalCode: '75000', latitude: 48.8566, longitude: 2.3522, population: 2161000, taxiCount: 18500, basePrice: 1890 },
  marseille: { name: 'Marseille', slug: 'marseille', region: "Provence-Alpes-Côte d'Azur", postalCode: '13000', latitude: 43.2965, longitude: 5.3698, population: 870000, taxiCount: 1850, basePrice: 1690 },
  lyon: { name: 'Lyon', slug: 'lyon', region: 'Auvergne-Rhône-Alpes', postalCode: '69000', latitude: 45.7640, longitude: 4.8357, population: 522000, taxiCount: 1450, basePrice: 1690 },
  toulouse: { name: 'Toulouse', slug: 'toulouse', region: 'Occitanie', postalCode: '31000', latitude: 43.6047, longitude: 1.4442, population: 493000, taxiCount: 750, basePrice: 1490 },
  nice: { name: 'Nice', slug: 'nice', region: "Provence-Alpes-Côte d'Azur", postalCode: '06000', latitude: 43.7102, longitude: 7.2620, population: 342000, taxiCount: 980, basePrice: 1790 },
  nantes: { name: 'Nantes', slug: 'nantes', region: 'Pays de la Loire', postalCode: '44000', latitude: 47.2184, longitude: -1.5536, population: 320000, taxiCount: 580, basePrice: 1420 },
  bordeaux: { name: 'Bordeaux', slug: 'bordeaux', region: 'Nouvelle-Aquitaine', postalCode: '33000', latitude: 44.8378, longitude: -0.5792, population: 260000, taxiCount: 620, basePrice: 1490 },
  strasbourg: { name: 'Strasbourg', slug: 'strasbourg', region: 'Grand Est', postalCode: '67000', latitude: 48.5734, longitude: 7.7521, population: 285000, taxiCount: 510, basePrice: 1450 },
  montpellier: { name: 'Montpellier', slug: 'montpellier', region: 'Occitanie', postalCode: '34000', latitude: 43.6108, longitude: 3.8767, population: 295000, taxiCount: 480, basePrice: 1460 },
  rennes: { name: 'Rennes', slug: 'rennes', region: 'Bretagne', postalCode: '35000', latitude: 48.1173, longitude: -1.6778, population: 217000, taxiCount: 380, basePrice: 1390 },
  reims: { name: 'Reims', slug: 'reims', region: 'Grand Est', postalCode: '51100', latitude: 49.2583, longitude: 4.0317, population: 183000, taxiCount: 280, basePrice: 1380 },
  'le-havre': { name: 'Le Havre', slug: 'le-havre', region: 'Normandie', postalCode: '76600', latitude: 49.4944, longitude: 0.1079, population: 170000, taxiCount: 240, basePrice: 1370 },
  'saint-etienne': { name: 'Saint-Étienne', slug: 'saint-etienne', region: 'Auvergne-Rhône-Alpes', postalCode: '42000', latitude: 45.4397, longitude: 4.3872, population: 172000, taxiCount: 230, basePrice: 1360 },
  toulon: { name: 'Toulon', slug: 'toulon', region: "Provence-Alpes-Côte d'Azur", postalCode: '83000', latitude: 43.1242, longitude: 5.9280, population: 171000, taxiCount: 350, basePrice: 1490 },
  grenoble: { name: 'Grenoble', slug: 'grenoble', region: 'Auvergne-Rhône-Alpes', postalCode: '38000', latitude: 45.1885, longitude: 5.7245, population: 158000, taxiCount: 290, basePrice: 1410 },
  dijon: { name: 'Dijon', slug: 'dijon', region: 'Bourgogne-Franche-Comté', postalCode: '21000', latitude: 47.3220, longitude: 5.0415, population: 156000, taxiCount: 220, basePrice: 1370 },
  angers: { name: 'Angers', slug: 'angers', region: 'Pays de la Loire', postalCode: '49000', latitude: 47.4784, longitude: -0.5632, population: 152000, taxiCount: 200, basePrice: 1350 },
  villeurbanne: { name: 'Villeurbanne', slug: 'villeurbanne', region: 'Auvergne-Rhône-Alpes', postalCode: '69100', latitude: 45.7733, longitude: 4.8810, population: 150000, taxiCount: 180, basePrice: 1670 },
  nimes: { name: 'Nîmes', slug: 'nimes', region: 'Occitanie', postalCode: '30000', latitude: 43.8367, longitude: 4.3601, population: 150000, taxiCount: 210, basePrice: 1420 },
  'aix-en-provence': { name: 'Aix-en-Provence', slug: 'aix-en-provence', region: "Provence-Alpes-Côte d'Azur", postalCode: '13100', latitude: 43.5297, longitude: 5.4474, population: 143000, taxiCount: 260, basePrice: 1530 },
  'clermont-ferrand': { name: 'Clermont-Ferrand', slug: 'clermont-ferrand', region: 'Auvergne-Rhône-Alpes', postalCode: '63000', latitude: 45.7772, longitude: 3.0870, population: 143000, taxiCount: 220, basePrice: 1380 },
  brest: { name: 'Brest', slug: 'brest', region: 'Bretagne', postalCode: '29200', latitude: 48.3904, longitude: -4.4861, population: 139000, taxiCount: 180, basePrice: 1340 },
  tours: { name: 'Tours', slug: 'tours', region: 'Centre-Val de Loire', postalCode: '37000', latitude: 47.3941, longitude: 0.6848, population: 137000, taxiCount: 210, basePrice: 1370 },
  limoges: { name: 'Limoges', slug: 'limoges', region: 'Nouvelle-Aquitaine', postalCode: '87000', latitude: 45.8336, longitude: 1.2611, population: 132000, taxiCount: 170, basePrice: 1340 },
  amiens: { name: 'Amiens', slug: 'amiens', region: 'Hauts-de-France', postalCode: '80000', latitude: 49.8941, longitude: 2.2958, population: 134000, taxiCount: 180, basePrice: 1360 },
  perpignan: { name: 'Perpignan', slug: 'perpignan', region: 'Occitanie', postalCode: '66000', latitude: 42.6886, longitude: 2.8949, population: 121000, taxiCount: 200, basePrice: 1410 },
  metz: { name: 'Metz', slug: 'metz', region: 'Grand Est', postalCode: '57000', latitude: 49.1193, longitude: 6.1757, population: 117000, taxiCount: 160, basePrice: 1370 },
  besancon: { name: 'Besançon', slug: 'besancon', region: 'Bourgogne-Franche-Comté', postalCode: '25000', latitude: 47.2378, longitude: 6.0241, population: 116000, taxiCount: 150, basePrice: 1350 },
  orleans: { name: 'Orléans', slug: 'orleans', region: 'Centre-Val de Loire', postalCode: '45000', latitude: 47.9029, longitude: 1.9039, population: 116000, taxiCount: 170, basePrice: 1380 },
  'le-mans': { name: 'Le Mans', slug: 'le-mans', region: 'Pays de la Loire', postalCode: '72000', latitude: 48.0061, longitude: 0.1996, population: 143000, taxiCount: 180, basePrice: 1360 },
};

interface CityPageSEOProps {
  citySlug: string;
  customTitle?: string;
  customDescription?: string;
  cityData?: Partial<CityData>;
}

const CityPageSEO: React.FC<CityPageSEOProps> = ({ citySlug, customTitle, customDescription, cityData: override }) => {
  const baseCity = CITIES[citySlug];
  if (!baseCity) return null;

  const city = { ...baseCity, ...(override || {}) };
  const url = `https://taxiassur.com/assurance-taxi-${city.slug}`;
  const title = customTitle || `Assurance Taxi ${city.name} 2026 — Devis Gratuit dès ${city.basePrice}€/an | TaxiAssur`;
  const description = customDescription || `Assurance taxi ${city.name} pas chère : devis gratuit en 2 min, tarifs négociés dès ${city.basePrice}€/an. Courtier ORIAS spécialiste, RC Pro incluse, économisez jusqu'à -35% à ${city.name} (${city.postalCode}).`;

  const localBusiness = {
    '@context': 'https://schema.org',
    '@type': ['InsuranceAgency', 'LocalBusiness'],
    '@id': `${url}#localbusiness`,
    name: `TaxiAssur ${city.name}`,
    description,
    url,
    image: 'https://taxiassur.com/logo-600x300.png',
    logo: 'https://taxiassur.com/logo-600x300.png',
    telephone: '+33180855786',
    email: 'team@taxiassur.com',
    priceRange: '€€',
    currenciesAccepted: 'EUR',
    paymentAccepted: 'Carte bancaire, Prélèvement SEPA, Virement',
    address: {
      '@type': 'PostalAddress',
      addressLocality: city.name,
      addressRegion: city.region,
      postalCode: city.postalCode,
      addressCountry: 'FR',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: city.latitude,
      longitude: city.longitude,
    },
    areaServed: {
      '@type': 'City',
      name: city.name,
      containedInPlace: { '@type': 'AdministrativeArea', name: city.region },
    },
    openingHoursSpecification: [{
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      opens: '09:00',
      closes: '18:00',
    }],
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      reviewCount: '247',
      bestRating: '5',
      worstRating: '1',
    },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: `Offres assurance taxi ${city.name}`,
      itemListElement: [{
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: `Assurance Taxi ${city.name}`,
          description: `Assurance taxi professionnelle à ${city.name} avec RC Pro et garanties dédiées.`,
        },
        price: String(city.basePrice),
        priceCurrency: 'EUR',
        availability: 'https://schema.org/InStock',
      }],
    },
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://taxiassur.com/' },
      { '@type': 'ListItem', position: 2, name: 'Villes', item: 'https://taxiassur.com/villes' },
      { '@type': 'ListItem', position: 3, name: `Assurance Taxi ${city.name}`, item: url },
    ],
  };

  const faq = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `Quel est le prix d'une assurance taxi à ${city.name} ?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `À ${city.name}, le tarif d'une assurance taxi débute à ${city.basePrice}€/an avec TaxiAssur, soit jusqu'à -35% par rapport aux assureurs classiques. Le prix dépend de votre profil, de votre véhicule et des garanties choisies.`,
        },
      },
      {
        '@type': 'Question',
        name: `Combien y a-t-il de chauffeurs de taxi à ${city.name} ?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `${city.name} compte environ ${city.taxiCount?.toLocaleString('fr-FR')} chauffeurs de taxi en activité, ce qui en fait l'un des marchés actifs en ${city.region}.`,
        },
      },
      {
        '@type': 'Question',
        name: `TaxiAssur couvre-t-il toute la zone de ${city.name} ?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Oui, TaxiAssur couvre l'intégralité de ${city.name} et de son agglomération en ${city.region}, ainsi que les déplacements dans toute la France métropolitaine.`,
        },
      },
      {
        '@type': 'Question',
        name: `Quels documents pour souscrire à ${city.name} ?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Carte grise du véhicule, permis de conduire valide, carte professionnelle taxi (CPT) délivrée par la préfecture de ${city.region}, et relevé d'information de votre ancien assureur si applicable.`,
        },
      },
      {
        '@type': 'Question',
        name: `En combien de temps reçoit-on l'attestation à ${city.name} ?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Votre attestation d'assurance taxi est émise immédiatement par email après validation du dossier. Effet de garantie possible le jour même à ${city.name}.`,
        },
      },
    ],
  };

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={`assurance taxi ${city.name}, devis assurance taxi ${city.name}, courtier taxi ${city.name}, prix assurance taxi ${city.name}, assurance taxi ${city.postalCode}, RC pro taxi ${city.name}`} />
      <link rel="canonical" href={url} />
      <meta name="geo.region" content={`FR-${city.region}`} />
      <meta name="geo.placename" content={city.name} />
      <meta name="geo.position" content={`${city.latitude};${city.longitude}`} />
      <meta name="ICBM" content={`${city.latitude}, ${city.longitude}`} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content="https://taxiassur.com/logo-600x300.png" />
      <meta property="og:image:width" content="600" />
      <meta property="og:image:height" content="300" />
      <meta property="og:locale" content="fr_FR" />
      <meta property="og:site_name" content="TaxiAssur" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content="https://taxiassur.com/logo-600x300.png" />
      <script type="application/ld+json">{JSON.stringify(localBusiness)}</script>
      <script type="application/ld+json">{JSON.stringify(breadcrumb)}</script>
      <script type="application/ld+json">{JSON.stringify(faq)}</script>
    </Helmet>
  );
};

export default CityPageSEO;
export { CITIES };
