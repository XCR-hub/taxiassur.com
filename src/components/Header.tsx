import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Phone, Menu, X, Shield, ChevronDown } from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  separator?: boolean;
}

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isServicesOpen, setIsServicesOpen] = useState(false);
  const location = useLocation();

  const mainNavigation = [
    { name: 'Accueil', href: '/' },
    { name: 'Assurance Taxi', href: '/assurance-taxi' },
    { name: 'Blog', href: '/blog' },
    { name: 'FAQ', href: '/faq' },
    { name: 'Avis', href: '/avis' },
    { name: 'Contact', href: '/contact' }
  ];

  const servicesDropdown = [
    { name: 'RC Professionnelle', href: '/rc-professionnelle' },
    { name: 'Flotte Véhicules', href: '/flotte-vehicules' },
    { name: 'Conseil Personnalisé', href: '/conseil-personnalise' },
    { name: 'Gestion Sinistres', href: '/gestion-sinistres' },
    { name: 'Partenaires', href: '/programme-partenaires' },
    { name: 'Backoffice Admin', href: '/backoffice', separator: true },
    { name: 'Portail Partenaires', href: '/backoffice/partner-portal' }
  ];

  const allNavigation = [...mainNavigation, ...servicesDropdown];

  return (
    <header className="bg-black/95 backdrop-blur-lg border-b border-gray-800 sticky top-0 z-50 shadow-lg">
      {/* Top bar */}
      <div className="bg-gradient-to-r from-yellow-600 to-yellow-500 text-black py-2">
        <div className="container-max">
          <div className="flex flex-col sm:flex-row justify-between items-center text-sm font-bold">
            <div className="flex items-center space-x-6 mb-2 sm:mb-0">
              <div className="flex items-center space-x-2">
                <Phone size={14} aria-hidden="true" />
                <a href="tel:0180855786" className="hover:text-gray-900 transition-colors" aria-label="Téléphone 01 80 85 57 86">
                  01 80 85 57 86
                </a>
              </div>
              <div className="flex items-center space-x-2">
                <span>team@taxiassur.com</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Shield size={14} aria-hidden="true" />
              <span>ORIAS 11 061 425 • Courtier Agréé</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="container-max py-4">
        <div className="flex justify-between items-center">
          <Link to="/" className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-600 to-yellow-500 rounded-xl flex items-center justify-center shadow-2xl">
              <span className="text-black font-black text-lg">🚖</span>
            </div>
            <div>
              <span className="text-3xl font-black text-white tracking-tight">TaxiAssur</span>
              <span className="block text-xs text-yellow-400 tracking-widest font-bold">EXCELLENCE COVERAGE RISKS</span>
            </div>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-4 xl:space-x-6">
            {mainNavigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`text-sm font-medium transition-colors duration-200 hover:text-orange-300 whitespace-nowrap ${
                  location.pathname === item.href ? 'text-yellow-400' : 'text-gray-200'
                }`}
              >
                {item.name}
              </Link>
            ))}

            {/* Services Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setIsServicesOpen(true)}
              onMouseLeave={() => setIsServicesOpen(false)}
            >
              <button className="flex items-center space-x-1 text-sm font-medium text-gray-200 hover:text-orange-300 transition-colors whitespace-nowrap">
                <span>Services</span>
                <ChevronDown size={14} className={`transition-transform ${isServicesOpen ? 'rotate-180' : ''}`} />
              </button>

              {isServicesOpen && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl py-2 z-50">
                  {servicesDropdown.map((item) => (
                    <React.Fragment key={item.name}>
                      {item.separator && <div className="my-2 border-t border-yellow-500/30"></div>}
                      <Link
                        to={item.href}
                        className="block px-4 py-2 text-sm text-gray-200 hover:bg-gray-800 hover:text-orange-300 transition-colors"
                      >
                        {item.name}
                      </Link>
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>
          </nav>

          <div className="hidden lg:flex items-center space-x-3">
            <a
              href="/#devis"
              className="bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-black font-bold py-2 px-6 rounded-lg transition-all duration-300 text-sm whitespace-nowrap shadow-lg"
            >
              Devis Gratuit
            </a>
          </div>

          {/* Mobile menu button */}
          <button
            className="lg:hidden text-gray-200 hover:text-yellow-300 transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={isMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="lg:hidden mt-4 pb-4 border-t border-gray-700 bg-gray-900/95 backdrop-blur-lg rounded-lg">
            <div className="flex flex-col space-y-2 pt-4">
              {allNavigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`text-sm font-medium transition-colors duration-200 hover:text-orange-300 px-4 py-2 rounded-lg hover:bg-gray-800/50 ${
                    location.pathname === item.href ? 'text-yellow-400 bg-gray-800/30' : 'text-gray-200'
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              <a
                href="#devis"
                className="bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-black font-bold py-3 px-6 rounded-lg transition-all duration-300 text-center mx-4 mt-4"
                onClick={() => setIsMenuOpen(false)}
              >
                Devis Gratuit
              </a>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;