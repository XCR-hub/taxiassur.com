import React from 'react';
import { Shield, Phone, Mail, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  const services = [
    { name: 'Assurance Taxi', href: '/assurance-taxi' },
    { name: 'RC Professionnelle', href: '/rc-professionnelle' },
    { name: 'Flotte Véhicules', href: '/flotte-vehicules' },
    { name: 'Conseil Personnalisé', href: '/conseil-personnalise' },
    { name: 'Gestion Sinistres', href: '/gestion-sinistres' }
  ];

  const pages = [
    { name: 'Blog', href: '/blog' },
    { name: 'FAQ', href: '/faq' },
    { name: 'Avis Clients', href: '/avis' },
    { name: 'Nos Offres', href: '/offres' },
    { name: 'Partenaires', href: '/programme-partenaires' },
    { name: 'Villes', href: '/villes' },
    { name: 'Newsletter', href: '/newsletter' },
    { name: 'Plan du Site', href: '/plan-du-site' }
  ];

  const legal = [
    { name: 'Mentions Légales', href: '/mentions-legales' },
    { name: 'Politique de Confidentialité', href: '/politique-confidentialite' },
    { name: 'Conditions Générales', href: '/conditions-generales' }
  ];

  return (
    <footer className="bg-black border-t border-gray-800">
      <div className="container-max py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div>
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center shadow-lg">
                <Shield className="text-white" size={20} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">TaxiAssur</h3>
                <p className="text-sm text-gray-300">Excellence Coverage Risks</p>
              </div>
            </div>
            <p className="text-gray-300 text-sm mb-4 leading-relaxed">
              Courtier spécialisé en assurance taxi et RC professionnelle depuis 15 ans. 
              Expertise reconnue, tarifs négociés, service premium.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-2 text-gray-300">
                <Shield size={14} aria-hidden="true" />
                <span>Courtier agréé ORIAS 11 061 425</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-300">
                <span>Spécialiste taxi depuis septembre 2025</span>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-lg font-bold text-white mb-6">Contact</h4>
            <div className="space-y-4 text-sm">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                  <Phone className="text-white" size={14} aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Ligne directe</p>
                  <a href="tel:0180855786" className="text-orange-300 font-semibold hover:text-orange-200 transition-colors">
                    01 80 85 57 86
                  </a>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                  <Mail className="text-white" size={14} aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Email</p>
                  <a href="mailto:team@taxiassur.com" className="text-orange-300 font-semibold hover:text-orange-200 transition-colors">
                    team@taxiassur.com
                  </a>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                  <MapPin className="text-white" size={14} aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Siège social</p>
                  <p className="text-orange-300 font-semibold">Melun, France</p>
                </div>
              </div>
            </div>
          </div>

          {/* Services & Pages */}
          <div>
            <h4 className="text-lg font-bold text-white mb-6">Nos Services</h4>
            <ul className="space-y-2 text-sm">
              {services.map((service, index) => (
                <li key={index}>
                  <Link
                    to={service.href}
                    className="text-gray-300 hover:text-orange-300 transition-colors"
                  >
                    {service.name}
                  </Link>
                </li>
              ))}
            </ul>
            
            <h4 className="text-lg font-bold text-white mb-4 mt-8">Pages</h4>
            <ul className="space-y-2 text-sm">
              {pages.slice(0, 4).map((page, index) => (
                <li key={index}>
                  <Link 
                    to={page.href}
                    className="text-gray-300 hover:text-orange-300 transition-colors"
                  >
                    {page.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal & More Pages */}
          <div>
            <h4 className="text-lg font-bold text-white mb-6">Informations</h4>
            <ul className="space-y-2 text-sm">
              {legal.map((item, index) => (
                <li key={index}>
                  <Link 
                    to={item.href}
                    className="text-gray-300 hover:text-orange-300 transition-colors"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
            
            <h4 className="text-lg font-bold text-white mb-4 mt-8">Plus</h4>
            <ul className="space-y-2 text-sm">
              {pages.slice(4).map((page, index) => (
                <li key={index}>
                  <Link 
                    to={page.href}
                    className="text-gray-300 hover:text-orange-300 transition-colors"
                  >
                    {page.name}
                  </Link>
                </li>
              ))}
            </ul>
            
            <div className="mt-6">
              <a 
                href="#devis" 
                className="btn-primary inline-block w-full text-center text-sm"
              >
                Devis Gratuit
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-gray-400 mb-4 md:mb-0">
              © 2025 TaxiAssur.com - Tous droits réservés • Excellence Coverage Risks
            </p>
            <div className="flex items-center space-x-4 text-sm">
              <Link to="/backoffice" className="text-gray-500 hover:text-orange-300 transition-colors">
                Admin
              </Link>
              <a href="/feeds/sitemap.xml" className="text-gray-500 hover:text-orange-300 transition-colors">
                Sitemap
              </a>
              <a href="/feeds/rss.xml" className="text-gray-500 hover:text-orange-300 transition-colors">
                RSS
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;