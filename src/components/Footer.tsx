import React from 'react';
import { Shield, Phone, Mail, MapPin, Facebook, Twitter, Linkedin, Share2, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import NewsletterFooterWidget from './NewsletterFooterWidget';

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
    { name: 'Conditions Générales', href: '/conditions-generales' },
    { name: 'Confiance & Certifications', href: '/confiance-certifications' }
  ];

  return (
    <footer className="bg-black border-t border-gray-800">
      <div className="container-max py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
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

            {/* Badges de confiance compacts */}
            <div className="mt-4 pt-4 border-t border-gray-800">
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 bg-yellow-900/30 text-yellow-300 rounded text-xs font-medium border border-yellow-800">
                  CSCA
                </span>
                <span className="px-2 py-1 bg-orange-900/30 text-orange-300 rounded text-xs font-medium border border-orange-800">
                  EDI Courtage
                </span>
                <span className="px-2 py-1 bg-amber-900/30 text-amber-300 rounded text-xs font-medium border border-amber-800">
                  EDI Signature
                </span>
                <span className="px-2 py-1 bg-green-900/30 text-green-300 rounded text-xs font-medium border border-green-800">
                  RC Pro CGPA
                </span>
                <span className="px-2 py-1 bg-yellow-900/30 text-yellow-300 rounded text-xs font-medium border border-yellow-800">
                  EXCALIBUR
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Courtier certifié, assuré et conforme LCB-FT
              </p>
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
                  <p className="text-xs text-gray-600">Ligne directe</p>
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
                  <p className="text-xs text-gray-600">Email</p>
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
                  <p className="text-xs text-gray-600">Siège social</p>
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

            <h4 className="text-lg font-bold text-white mb-4 mt-8">Guides Gratuits</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <a
                  href="/guides/guide-assurance-taxi-2026.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2 text-amber-400 hover:text-amber-300 transition-colors group"
                >
                  <BookOpen size={14} className="flex-shrink-0 mt-0.5" />
                  <span className="group-hover:underline underline-offset-2">Guide Assurance Taxi 2026</span>
                </a>
              </li>
              <li>
                <a
                  href="/guides/checklist-documents-taxi.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2 text-amber-400 hover:text-amber-300 transition-colors group"
                >
                  <BookOpen size={14} className="flex-shrink-0 mt-0.5" />
                  <span className="group-hover:underline underline-offset-2">Checklist Documents Obligatoires</span>
                </a>
              </li>
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
              <li>
                <Link
                  to="/backoffice"
                  className="text-yellow-400 hover:text-yellow-300 transition-colors font-semibold flex items-center"
                >
                  <Shield className="mr-1" size={14} />
                  Administrateur
                </Link>
              </li>
            </ul>

            <div className="mt-6">
              <a
                href="#devis"
                onClick={(e) => {
                  e.preventDefault();
                  const devisSection = document.getElementById('devis');
                  if (devisSection) {
                    devisSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
                className="btn-primary inline-block w-full text-center text-sm"
              >
                Devis Gratuit
              </a>
            </div>
          </div>

          {/* Newsletter */}
          <div>
            <NewsletterFooterWidget />
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-center md:text-left">
              <p className="text-sm text-gray-600 mb-2">
                © 2025 TaxiAssur.com - Tous droits réservés • Excellence Coverage Risks
              </p>
              <div className="flex items-center justify-center md:justify-start space-x-3">
                <span className="text-xs text-gray-600">Suivez-nous :</span>
                <a
                  href="https://facebook.com/taxiassur"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-orange-500 transition-colors"
                  aria-label="Suivez-nous sur Facebook"
                >
                  <Facebook size={18} />
                </a>
                <a
                  href="https://twitter.com/taxiassur"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-orange-400 transition-colors"
                  aria-label="Suivez-nous sur Twitter"
                >
                  <Twitter size={18} />
                </a>
                <a
                  href="https://linkedin.com/company/taxiassur"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-orange-600 transition-colors"
                  aria-label="Suivez-nous sur LinkedIn"
                >
                  <Linkedin size={18} />
                </a>
                <button
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: 'TaxiAssur - Assurance Taxi Pas Cher',
                        text: 'Découvrez TaxiAssur : devis gratuit en 2min, économisez 35%',
                        url: 'https://taxiassur.com'
                      });
                    }
                  }}
                  className="text-gray-600 hover:text-orange-400 transition-colors"
                  aria-label="Partager TaxiAssur"
                >
                  <Share2 size={18} />
                </button>
              </div>
            </div>
            <div className="flex items-center flex-wrap gap-4 text-sm justify-center md:justify-end">
              <a href="/sitemap.xml" className="text-gray-600 hover:text-orange-300 transition-colors" target="_blank" rel="noopener noreferrer">
                Sitemap XML
              </a>
              <a href="/feeds/rss.xml" className="text-gray-600 hover:text-orange-300 transition-colors" target="_blank" rel="noopener noreferrer">
                Flux RSS
              </a>
              <Link to="/plan-du-site" className="text-gray-600 hover:text-orange-300 transition-colors">
                Plan du Site
              </Link>
              <Link to="/contact" className="text-gray-600 hover:text-orange-300 transition-colors">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;