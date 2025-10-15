/**
 * Composant Internal Linking Intelligent
 *
 * Améliore automatiquement le maillage interne (internal linking)
 * pour booster le SEO et l'expérience utilisateur
 */

import { Link } from 'react-router-dom';
import { ArrowRight, TrendingUp, MapPin, FileText } from 'lucide-react';

interface RelatedLink {
  title: string;
  url: string;
  description?: string;
  category: 'blog' | 'city' | 'service' | 'faq';
}

interface InternalLinkingProps {
  currentPage: string;
  currentCategory?: string;
  city?: string;
  keyword?: string;
}

/**
 * Génère des liens internes pertinents basés sur le contexte
 */
export default function InternalLinking({
  currentPage,
  currentCategory,
  city,
  keyword
}: InternalLinkingProps) {
  const relatedLinks = generateRelatedLinks(currentPage, currentCategory, city, keyword);

  if (relatedLinks.length === 0) return null;

  return (
    <section className="bg-gradient-to-br from-orange-50 to-white py-12 sm:py-16 border-t border-b border-orange-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 mb-8">
          <TrendingUp className="w-6 h-6 text-yellow-600" />
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Découvrez aussi
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {relatedLinks.map((link, index) => (
            <InternalLinkCard key={index} link={link} />
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Card individuelle de lien interne
 */
function InternalLinkCard({ link }: { link: RelatedLink }) {
  const icons = {
    blog: <FileText className="w-5 h-5" />,
    city: <MapPin className="w-5 h-5" />,
    service: <TrendingUp className="w-5 h-5" />,
    faq: <FileText className="w-5 h-5" />
  };

  const colors = {
    blog: 'from-yellow-400 to-yellow-600',
    city: 'from-green-500 to-green-600',
    service: 'from-gray-800 to-yellow-600',
    faq: 'from-orange-500 to-orange-600'
  };

  return (
    <Link
      to={link.url}
      className="group bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-orange-300"
    >
      <div className="flex items-start gap-4 mb-3">
        <div className={`bg-gradient-to-br ${colors[link.category]} text-white p-3 rounded-lg group-hover:scale-110 transition-transform`}>
          {icons[link.category]}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900 group-hover:text-yellow-600 transition-colors mb-2 line-clamp-2">
            {link.title}
          </h3>
          {link.description && (
            <p className="text-sm text-gray-600 line-clamp-2">
              {link.description}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center text-yellow-600 font-semibold text-sm group-hover:gap-3 gap-2 transition-all">
        En savoir plus
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </div>
    </Link>
  );
}

/**
 * Génère les liens internes pertinents
 */
function generateRelatedLinks(
  currentPage: string,
  currentCategory?: string,
  city?: string,
  keyword?: string
): RelatedLink[] {
  const allLinks: RelatedLink[] = [
    // Articles blog populaires
    {
      title: 'Comparatif Assurances Taxi 2025',
      url: '/blog/comparatif-assurances-taxi-2025',
      description: 'Comparez AXA, Generali et Covéa pour choisir la meilleure assurance',
      category: 'blog'
    },
    {
      title: 'Comment payer 30% moins cher ?',
      url: '/blog/comment-payer-30-moins-cher-assurance-taxi-2025',
      description: 'Techniques éprouvées pour réduire drastiquement vos cotisations',
      category: 'blog'
    },
    {
      title: 'Sinistre Taxi : Procédure Complète',
      url: '/taxis-sinistres',
      description: 'Guide étape par étape pour gérer un sinistre efficacement',
      category: 'blog'
    },
    {
      title: 'Assurance Taxi Jeune Conducteur',
      url: '/blog/assurance-taxi-jeune-conducteur-solutions-2025',
      description: 'Solutions adaptées aux conducteurs de moins de 25 ans',
      category: 'blog'
    },
    {
      title: 'RC Professionnelle : 3 Erreurs à Éviter',
      url: '/blog/rc-pro-taxi-3-erreurs-eviter-2025',
      description: 'Les pièges qui coûtent cher aux chauffeurs de taxi',
      category: 'blog'
    },

    // Pages ville principales
    {
      title: 'Assurance Taxi Paris',
      url: '/assurance-taxi-paris',
      description: 'Assurance spéciale taxi parisien avec tarifs adaptés',
      category: 'city'
    },
    {
      title: 'Assurance Taxi Lyon',
      url: '/assurance-taxi-lyon',
      description: 'Assurance taxi Lyon avec couverture complète',
      category: 'city'
    },
    {
      title: 'Assurance Taxi Marseille',
      url: '/assurance-taxi-marseille',
      description: 'Protection optimale pour taxis marseillais',
      category: 'city'
    },
    {
      title: 'Assurance Taxi Toulouse',
      url: '/assurance-taxi-toulouse',
      description: 'Assurance taxi Toulouse à prix compétitif',
      category: 'city'
    },

    // Services
    {
      title: 'Devis Assurance Taxi Gratuit',
      url: '/contact',
      description: 'Obtenez votre devis personnalisé en 2 minutes',
      category: 'service'
    },
    {
      title: 'RC Professionnelle Taxi',
      url: '/rc-professionnelle',
      description: 'Protection juridique complète pour votre activité',
      category: 'service'
    },
    {
      title: 'Assurance Flotte de Taxis',
      url: '/flotte-vehicules',
      description: 'Tarifs dégressifs pour plusieurs véhicules',
      category: 'service'
    },
    {
      title: 'Gestion des Sinistres',
      url: '/gestion-sinistres',
      description: 'Assistance 24/7 en cas d'accident',
      category: 'service'
    },

    // FAQ
    {
      title: 'Questions Fréquentes',
      url: '/faq',
      description: 'Toutes les réponses à vos questions sur l'assurance taxi',
      category: 'faq'
    }
  ];

  // Filtrer les liens pertinents
  let filtered = allLinks.filter(link => !currentPage.includes(link.url));

  // Si on est sur une page ville, privilégier les services et autres villes
  if (currentCategory === 'city') {
    filtered = [
      ...filtered.filter(l => l.category === 'service').slice(0, 2),
      ...filtered.filter(l => l.category === 'city' && l.url !== currentPage).slice(0, 2),
      ...filtered.filter(l => l.category === 'blog').slice(0, 2)
    ];
  }

  // Si on est sur un article blog, privilégier articles similaires et services
  if (currentCategory === 'blog') {
    filtered = [
      ...filtered.filter(l => l.category === 'blog').slice(0, 3),
      ...filtered.filter(l => l.category === 'service').slice(0, 2),
      ...filtered.filter(l => l.category === 'city').slice(0, 1)
    ];
  }

  // Si on est sur une page service, privilégier blog et FAQ
  if (currentCategory === 'service') {
    filtered = [
      ...filtered.filter(l => l.category === 'blog').slice(0, 3),
      ...filtered.filter(l => l.category === 'faq').slice(0, 1),
      ...filtered.filter(l => l.category === 'service').slice(0, 2)
    ];
  }

  // Si ville spécifiée, ajouter la page ville correspondante
  if (city) {
    const cityUrl = `/assurance-taxi-${city.toLowerCase().replace(/\s+/g, '-')}`;
    const cityLink = allLinks.find(l => l.url === cityUrl);
    if (cityLink && !filtered.find(l => l.url === cityUrl)) {
      filtered.unshift(cityLink);
    }
  }

  return filtered.slice(0, 6);
}

/**
 * Composant Footer Links (internal linking dans footer)
 */
export function FooterInternalLinks() {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
      {/* Assurance Taxi */}
      <div>
        <h3 className="font-bold text-lg mb-4 text-white">Assurance Taxi</h3>
        <ul className="space-y-2">
          <li>
            <Link to="/assurance-taxi" className="text-gray-300 hover:text-yellow-400 transition">
              Assurance Taxi Professionnel
            </Link>
          </li>
          <li>
            <Link to="/rc-professionnelle" className="text-gray-300 hover:text-yellow-400 transition">
              RC Professionnelle
            </Link>
          </li>
          <li>
            <Link to="/flotte-vehicules" className="text-gray-300 hover:text-yellow-400 transition">
              Assurance Flotte
            </Link>
          </li>
          <li>
            <Link to="/assurance-taxi-vtc" className="text-gray-300 hover:text-yellow-400 transition">
              Assurance VTC
            </Link>
          </li>
        </ul>
      </div>

      {/* Grandes villes */}
      <div>
        <h3 className="font-bold text-lg mb-4 text-white">Grandes Villes</h3>
        <ul className="space-y-2">
          <li>
            <Link to="/assurance-taxi-paris" className="text-gray-300 hover:text-yellow-400 transition">
              Paris
            </Link>
          </li>
          <li>
            <Link to="/assurance-taxi-lyon" className="text-gray-300 hover:text-yellow-400 transition">
              Lyon
            </Link>
          </li>
          <li>
            <Link to="/assurance-taxi-marseille" className="text-gray-300 hover:text-yellow-400 transition">
              Marseille
            </Link>
          </li>
          <li>
            <Link to="/ville" className="text-gray-300 hover:text-yellow-400 transition">
              Toutes les villes
            </Link>
          </li>
        </ul>
      </div>

      {/* Ressources */}
      <div>
        <h3 className="font-bold text-lg mb-4 text-white">Ressources</h3>
        <ul className="space-y-2">
          <li>
            <Link to="/blog" className="text-gray-300 hover:text-yellow-400 transition">
              Blog
            </Link>
          </li>
          <li>
            <Link to="/faq" className="text-gray-300 hover:text-yellow-400 transition">
              FAQ
            </Link>
          </li>
          <li>
            <Link to="/taxis-sinistres" className="text-gray-300 hover:text-yellow-400 transition">
              Gestion Sinistres
            </Link>
          </li>
          <li>
            <Link to="/prix-assurance-taxi" className="text-gray-300 hover:text-yellow-400 transition">
              Prix Assurance Taxi
            </Link>
          </li>
        </ul>
      </div>

      {/* Contact */}
      <div>
        <h3 className="font-bold text-lg mb-4 text-white">Contact</h3>
        <ul className="space-y-2">
          <li>
            <Link to="/contact" className="text-gray-300 hover:text-yellow-400 transition">
              Devis Gratuit
            </Link>
          </li>
          <li>
            <a href="tel:+33186653850" className="text-gray-300 hover:text-yellow-400 transition">
              01 86 65 38 50
            </a>
          </li>
          <li>
            <Link to="/partenaires" className="text-gray-300 hover:text-yellow-400 transition">
              Devenir Partenaire
            </Link>
          </li>
          <li>
            <Link to="/ambassadeur" className="text-gray-300 hover:text-yellow-400 transition">
              Programme Ambassadeur
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}

/**
 * Composant Breadcrumbs (fil d'Ariane) pour SEO
 */
interface BreadcrumbItem {
  name: string;
  url: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav className="bg-gray-50 py-3 px-4 sm:px-6 lg:px-8 border-b border-gray-200">
      <ol className="max-w-7xl mx-auto flex items-center space-x-2 text-sm">
        {items.map((item, index) => (
          <li key={index} className="flex items-center">
            {index > 0 && (
              <ArrowRight className="w-4 h-4 text-gray-400 mx-2" />
            )}
            {index === items.length - 1 ? (
              <span className="text-gray-600 font-semibold">{item.name}</span>
            ) : (
              <Link
                to={item.url}
                className="text-yellow-600 hover:text-yellow-800 hover:underline transition"
              >
                {item.name}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
