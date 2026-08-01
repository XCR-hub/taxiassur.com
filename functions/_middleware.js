const SITE_ORIGIN = 'https://taxiassur.com';
const APEX_HOST = 'taxiassur.com';
const WWW_HOST = 'www.taxiassur.com';
const OG_IMAGE = `${SITE_ORIGIN}/logo-600x300.png`;
const SEO_CONTENT_MAP_PATH = '/seo-content-map.json';
let seoContentMapCache = null;
let seoContentMapLoaded = false;

const STATIC_ROUTE_META = {
  '/': {
    title: 'TaxiAssur - Assurance taxi professionnelle',
    description:
      'TaxiAssur accompagne les chauffeurs de taxi pour comparer leur assurance professionnelle, obtenir un devis et gerer leurs documents.',
    section: 'Accueil',
    priority: 'home',
  },
  '/assurance-taxi': {
    title: 'Assurance taxi professionnelle - Devis gratuit | TaxiAssur',
    description:
      'Comparez votre assurance taxi professionnelle avec un courtier ORIAS specialise : RC pro, tous risques, assistance, flotte et gestion sinistres.',
    section: 'Assurance taxi',
    priority: 'service',
  },
  '/devis-assurance-taxi': {
    title: 'Devis assurance taxi en ligne - Gratuit et rapide | TaxiAssur',
    description:
      'Demandez un devis assurance taxi en ligne. TaxiAssur qualifie votre besoin, compare les garanties et vous aide a choisir une offre adaptee.',
    section: 'Devis assurance taxi',
    priority: 'conversion',
  },
  '/prix-assurance-taxi': {
    title: 'Prix assurance taxi - Tarifs et garanties | TaxiAssur',
    description:
      'Comprendre le prix d une assurance taxi : garanties, franchise, profil conducteur, vehicule, zone d activite et leviers pour reduire la prime.',
    section: 'Prix assurance taxi',
    priority: 'service',
  },
  '/quelle-assurance-taxi': {
    title: 'Quelle assurance taxi choisir ? Guide professionnel | TaxiAssur',
    description:
      'Guide pour choisir une assurance taxi adaptee : responsabilite civile professionnelle, dommages, assistance, protection conducteur et flotte.',
    section: 'Quelle assurance taxi',
    priority: 'guide',
  },
  '/courtier-assurance-taxi': {
    title: 'Courtier assurance taxi - Accompagnement ORIAS | TaxiAssur',
    description:
      'TaxiAssur agit comme courtier specialise pour aider les chauffeurs de taxi a comparer garanties, prix, documents et suivi du contrat.',
    section: 'Courtier assurance taxi',
    priority: 'service',
  },
  '/assurance-obligatoire-taxi': {
    title: 'Assurance obligatoire taxi - Garanties requises | TaxiAssur',
    description:
      'Les garanties obligatoires pour exercer comme taxi et les protections utiles pour couvrir le vehicule, l activite et les passagers.',
    section: 'Assurance obligatoire taxi',
    priority: 'guide',
  },
  '/assurance-taxi-vtc': {
    title: 'Assurance taxi et VTC - Garanties professionnelles | TaxiAssur',
    description:
      'Solutions d assurance pour taxi et VTC : RC circulation, RC professionnelle, dommages, assistance et garanties adaptees au transport de personnes.',
    section: 'Assurance taxi VTC',
    priority: 'service',
  },
  '/assurance-moto-taxi': {
    title: 'Assurance moto taxi - Devis professionnel | TaxiAssur',
    description:
      'Assurance moto taxi pour chauffeurs professionnels : responsabilite civile, dommages, protection conducteur et accompagnement dossier.',
    section: 'Assurance moto taxi',
    priority: 'service',
  },
  '/assurance-taxi-solly-azar': {
    title: 'Assurance taxi Solly Azar - Offre et garanties | TaxiAssur',
    description:
      'Presentation de l offre assurance taxi Solly Azar avec TaxiAssur : garanties, documents, devis et accompagnement courtier.',
    section: 'Assurance taxi Solly Azar',
    priority: 'partner',
  },
  '/rc-professionnelle': {
    title: 'RC professionnelle taxi - Responsabilite civile pro | TaxiAssur',
    description:
      'La responsabilite civile professionnelle taxi couvre les dommages lies a l activite. TaxiAssur vous aide a verifier les garanties utiles.',
    section: 'RC professionnelle',
    priority: 'service',
  },
  '/flotte-vehicules': {
    title: 'Assurance flotte taxi - Gestion de parc | TaxiAssur',
    description:
      'Solutions pour assurer une flotte de taxis, gerer les vehicules, les avenants, les renouvellements et les documents contractuels.',
    section: 'Flotte vehicules',
    priority: 'service',
  },
  '/gestion-sinistres': {
    title: 'Gestion sinistres taxi - Accompagnement dossier | TaxiAssur',
    description:
      'TaxiAssur accompagne les chauffeurs de taxi dans la declaration, le suivi documentaire et les echanges autour des sinistres professionnels.',
    section: 'Gestion sinistres',
    priority: 'service',
  },
  '/taxis-sinistres': {
    title: 'Sinistre taxi - Demarches et assurance | TaxiAssur',
    description:
      'Que faire apres un sinistre taxi : declaration, pieces utiles, garanties mobilisables, franchise et suivi avec votre courtier.',
    section: 'Taxis sinistres',
    priority: 'guide',
  },
  '/faq': {
    title: 'FAQ assurance taxi - Questions frequentes | TaxiAssur',
    description:
      'Reponses aux questions frequentes sur l assurance taxi, les documents, garanties, devis, paiements, sinistres et renouvellements.',
    section: 'FAQ',
    priority: 'support',
  },
  '/blog': {
    title: 'Blog assurance taxi - Guides professionnels | TaxiAssur',
    description:
      'Guides, conseils et analyses TaxiAssur pour mieux comprendre l assurance taxi, les garanties, les tarifs et la gestion des contrats.',
    section: 'Blog',
    priority: 'content',
  },
  '/actualites': {
    title: 'Actualites taxi et assurance professionnelle | TaxiAssur',
    description:
      'Actualites utiles aux chauffeurs de taxi : assurance, reglementation, mobilite professionnelle, sinistres et vie du secteur.',
    section: 'Actualites',
    priority: 'content',
  },
  '/villes': {
    title: 'Assurance taxi par ville - Guides locaux | TaxiAssur',
    description:
      'Retrouvez les pages locales TaxiAssur pour comparer une assurance taxi professionnelle selon votre ville et votre zone d activite.',
    section: 'Villes',
    priority: 'local',
  },
  '/contact': {
    title: 'Contact TaxiAssur - Courtier assurance taxi',
    description:
      'Contactez TaxiAssur pour un devis, une question sur votre dossier, vos documents, votre contrat ou votre assurance taxi professionnelle.',
    section: 'Contact',
    priority: 'support',
  },
};

const CITY_ROUTE_OVERRIDES = {
  '/assurance-taxi-paris': 'Paris',
  '/assurance-taxi-lyon': 'Lyon',
  '/assurance-taxi-marseille': 'Marseille',
  '/assurance-taxi-toulouse': 'Toulouse',
  '/assurance-taxi-nice': 'Nice',
  '/assurance-taxi-nantes': 'Nantes',
  '/assurance-taxi-bordeaux': 'Bordeaux',
  '/assurance-taxi-rennes': 'Rennes',
  '/assurance-taxi-strasbourg': 'Strasbourg',
  '/assurance-taxi-montpellier': 'Montpellier',
  '/assurance-taxi-lille': 'Lille',
  '/assurance-taxi-grenoble': 'Grenoble',
  '/assurance-taxi-dijon': 'Dijon',
  '/assurance-taxi-angers': 'Angers',
  '/assurance-taxi-aix-en-provence': 'Aix-en-Provence',
  '/assurance-taxi-brest': 'Brest',
  '/assurance-taxi-clermont-ferrand': 'Clermont-Ferrand',
  '/assurance-taxi-le-mans': 'Le Mans',
  '/assurance-taxi-toulon': 'Toulon',
};

const RESERVED_ASSURANCE_TAXI_ROUTES = new Set([
  '/assurance-taxi',
  '/assurance-taxi-vtc',
  '/assurance-taxi-solly-azar',
]);

class RemoveElement {
  element(element) {
    element.remove();
  }
}

class HeadInjector {
  constructor(meta) {
    this.meta = meta;
  }

  element(element) {
    element.append(renderSeoHead(this.meta), { html: true });
  }
}

export async function onRequest(context) {
  const url = new URL(context.request.url);

  if (url.hostname.toLowerCase() === WWW_HOST) {
    url.hostname = APEX_HOST;
    return Response.redirect(url.toString(), 301);
  }

  const response = await context.next();
  const meta = await getRouteMeta(url, context);
  if (!meta || context.request.method !== 'GET') return response;

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('text/html')) return response;

  return new HTMLRewriter()
    .on('title', new RemoveElement())
    .on('meta[name="description"]', new RemoveElement())
    .on('link[rel="canonical"]', new RemoveElement())
    .on('link[rel="alternate"][hreflang="fr"]', new RemoveElement())
    .on('link[rel="alternate"][hreflang="x-default"]', new RemoveElement())
    .on('meta[property="og:title"]', new RemoveElement())
    .on('meta[property="og:description"]', new RemoveElement())
    .on('meta[property="og:url"]', new RemoveElement())
    .on('meta[property="og:type"]', new RemoveElement())
    .on('meta[property="og:image"]', new RemoveElement())
    .on('meta[name="twitter:title"]', new RemoveElement())
    .on('meta[name="twitter:description"]', new RemoveElement())
    .on('meta[name="twitter:image"]', new RemoveElement())
    .on('head', new HeadInjector(meta))
    .transform(response);
}

function normalizePathname(pathname) {
  if (!pathname || pathname === '/') return '/';
  return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

async function getRouteMeta(url, context) {
  const pathname = normalizePathname(url.pathname);

  if (STATIC_ROUTE_META[pathname]) {
    return { ...STATIC_ROUTE_META[pathname], canonicalPath: pathname };
  }

  const mappedMeta = await getMappedContentMeta(pathname, context);
  if (mappedMeta) return mappedMeta;

  if (pathname.startsWith('/blog/')) {
    const title = titleFromSlug(pathname.replace('/blog/', ''));
    return {
      title: `${title} | Blog TaxiAssur`,
      description:
        'Article TaxiAssur pour les chauffeurs de taxi : assurance professionnelle, garanties, sinistres, tarifs et bonnes pratiques.',
      section: 'Blog',
      canonicalPath: pathname,
      priority: 'content',
    };
  }

  if (pathname.startsWith('/actualites/')) {
    const title = titleFromSlug(pathname.replace('/actualites/', ''));
    return {
      title: `${title} | Actualites TaxiAssur`,
      description:
        'Actualite TaxiAssur utile aux chauffeurs de taxi : assurance professionnelle, reglementation, mobilite et gestion des risques.',
      section: 'Actualites',
      canonicalPath: pathname,
      priority: 'content',
    };
  }

  if (pathname.startsWith('/villes/')) {
    const city = titleFromSlug(pathname.replace('/villes/', ''));
    return createCityMeta(pathname, city);
  }

  if (pathname.startsWith('/assurance-taxi-') && !RESERVED_ASSURANCE_TAXI_ROUTES.has(pathname)) {
    const city = CITY_ROUTE_OVERRIDES[pathname] || titleFromSlug(pathname.replace('/assurance-taxi-', ''));
    return createCityMeta(pathname, city);
  }

  return null;
}

async function getMappedContentMeta(pathname, context) {
  if (!isMappedContentPath(pathname)) return null;
  const contentMap = await loadSeoContentMap(context);
  const entry = contentMap?.routes?.[pathname];
  if (!entry?.title || !entry?.description) return null;

  return {
    title: entry.title,
    description: entry.description,
    section: entry.section || sectionForPath(pathname),
    canonicalPath: pathname,
    city: entry.city,
    priority: entry.priority || 'content',
  };
}

function isMappedContentPath(pathname) {
  return pathname.startsWith('/blog/') || pathname.startsWith('/actualites/') || pathname.startsWith('/assurance-taxi-') || pathname.startsWith('/villes/');
}

function sectionForPath(pathname) {
  if (pathname.startsWith('/blog/')) return 'Blog';
  if (pathname.startsWith('/actualites/')) return 'Actualites';
  if (pathname.startsWith('/assurance-taxi-') || pathname.startsWith('/villes/')) return 'Villes';
  return 'TaxiAssur';
}

async function loadSeoContentMap(context) {
  if (seoContentMapLoaded) return seoContentMapCache;
  seoContentMapLoaded = true;

  try {
    const assets = context?.env?.ASSETS;
    if (!assets?.fetch) return null;

    const response = await assets.fetch(new Request(`${SITE_ORIGIN}${SEO_CONTENT_MAP_PATH}`));
    if (!response.ok) return null;
    const json = await response.json();
    if (!json || typeof json !== 'object' || !json.routes || typeof json.routes !== 'object') return null;
    seoContentMapCache = json;
    return seoContentMapCache;
  } catch {
    seoContentMapCache = null;
    return null;
  }
}

function createCityMeta(canonicalPath, city) {
  const place = city || 'votre ville';
  return {
    title: `Assurance taxi ${place} - Devis professionnel | TaxiAssur`,
    description: `Comparez votre assurance taxi a ${place} avec TaxiAssur : garanties professionnelles, devis, documents, sinistres et accompagnement courtier.`,
    section: `Assurance taxi ${place}`,
    canonicalPath,
    city: place,
    priority: 'local',
  };
}

function titleFromSlug(slug) {
  const decoded = safeDecode(slug)
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!decoded) return 'TaxiAssur';

  return decoded
    .split(' ')
    .map((word) => {
      if (word.length <= 3 && ['rc', 'pro', 'vtc'].includes(word.toLowerCase())) {
        return word.toUpperCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function renderSeoHead(meta) {
  const canonical = `${SITE_ORIGIN}${meta.canonicalPath}`;
  const title = escapeHtml(meta.title);
  const description = escapeHtml(meta.description);
  const schema = JSON.stringify(buildRouteSchema(meta, canonical))
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');

  return `
    <title>${title}</title>
    <meta name="description" content="${description}">
    <link rel="canonical" href="${escapeHtml(canonical)}">
    <link rel="alternate" href="${escapeHtml(canonical)}" hreflang="fr">
    <link rel="alternate" href="${escapeHtml(canonical)}" hreflang="x-default">
    <meta property="og:locale" content="fr_FR">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="TaxiAssur">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:url" content="${escapeHtml(canonical)}">
    <meta property="og:image" content="${escapeHtml(OG_IMAGE)}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="${escapeHtml(OG_IMAGE)}">
    <meta name="taxiassur:seo-edge" content="active">
    <script type="application/ld+json" data-seo-edge="route">${schema}</script>
  `;
}

function buildRouteSchema(meta, canonical) {
  const graph = [
    {
      '@type': 'WebPage',
      '@id': `${canonical}#webpage`,
      url: canonical,
      name: meta.title,
      description: meta.description,
      inLanguage: 'fr-FR',
      isPartOf: {
        '@id': `${SITE_ORIGIN}/#website`,
      },
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbItems(meta, canonical),
    },
  ];

  if (['service', 'conversion', 'local', 'partner'].includes(meta.priority)) {
    graph.push({
      '@type': 'Service',
      '@id': `${canonical}#service`,
      name: meta.section,
      serviceType: 'Assurance taxi professionnelle',
      provider: {
        '@type': 'Organization',
        name: 'TaxiAssur',
        url: SITE_ORIGIN,
      },
      areaServed: meta.city
        ? {
            '@type': 'City',
            name: meta.city,
          }
        : {
            '@type': 'Country',
            name: 'France',
          },
    });
  }

  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  };
}

function breadcrumbItems(meta, canonical) {
  const items = [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Accueil',
      item: SITE_ORIGIN,
    },
  ];

  if (meta.canonicalPath !== '/') {
    items.push({
      '@type': 'ListItem',
      position: 2,
      name: meta.section || meta.title,
      item: canonical,
    });
  }

  return items;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#39;';
      default:
        return char;
    }
  });
}
