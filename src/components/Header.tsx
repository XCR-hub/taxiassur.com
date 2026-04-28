import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Phone, Menu, X, Shield, ChevronDown, User } from 'lucide-react';

const mainNavigation = [
  { name: 'Accueil', href: '/' },
  { name: 'Assurance Taxi', href: '/assurance-taxi' },
  { name: 'Blog', href: '/blog' },
  { name: 'Actualités', href: '/actualites' },
  { name: 'FAQ', href: '/faq' },
  { name: 'Villes', href: '/villes' },
  { name: 'Avis', href: '/reviews' },
  { name: 'Contact', href: '/contact' }
];

const servicesDropdown = [
  { name: 'RC Professionnelle', href: '/rc-professionnelle' },
  { name: 'Flotte Véhicules', href: '/flotte-vehicules' },
  { name: 'Conseil Personnalisé', href: '/conseil-personnalise' },
  { name: 'Gestion Sinistres', href: '/gestion-sinistres' },
  { name: 'Partenaires', href: '/programme-partenaires' },
  { name: 'Backoffice Admin', href: '/backoffice', separator: true, highlight: true },
  { name: 'Portail Partenaires', href: '/backoffice/partner-portal' }
];

const allNavigation = [...mainNavigation, ...servicesDropdown];

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isServicesOpen, setIsServicesOpen] = useState(false);
  const [closeTimer, setCloseTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const location = useLocation();

  const handleServicesMouseEnter = useCallback(() => {
    if (closeTimer) {
      clearTimeout(closeTimer);
      setCloseTimer(null);
    }
    setIsServicesOpen(true);
  }, [closeTimer]);

  const handleServicesMouseLeave = useCallback(() => {
    const timer = setTimeout(() => setIsServicesOpen(false), 350);
    setCloseTimer(timer);
  }, []);

  useEffect(() => {
    return () => {
      if (closeTimer) clearTimeout(closeTimer);
    };
  }, [closeTimer]);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  const scrollToDevis = useCallback(() => {
    const devisSection = document.getElementById('devis');
    if (devisSection) {
      devisSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      requestAnimationFrame(() => {
        setTimeout(() => {
          const nameInput = document.getElementById('name') as HTMLInputElement | null;
          if (nameInput) nameInput.focus({ preventScroll: true });
        }, 600);
      });
    } else {
      window.location.href = '/#devis';
    }
  }, []);

  return (
    <header className="bg-black border-b border-gray-800 sticky top-0 z-50 shadow-lg lg:bg-black/95 backdrop-header" style={{willChange:'auto'}}>
      {/* Top bar */}
      <div className="bg-gradient-to-r from-yellow-500 to-amber-500 text-gray-900 py-2 sm:py-2.5">
        <div className="container-max">
          <div className="flex items-center justify-between text-xs sm:text-sm font-bold min-h-[36px]">
            <div className="flex items-center gap-3 sm:gap-6">
              <a
                href="tel:0180855786"
                className="flex items-center gap-1.5 hover:text-gray-700 transition-colors font-bold py-1 -my-1"
                aria-label="Appeler TaxiAssur au 01 80 85 57 86"
              >
                <Phone size={16} aria-hidden="true" />
                <span>01 80 85 57 86</span>
              </a>
              <a
                href="mailto:team@taxiassur.com"
                className="hidden md:flex items-center text-gray-800 hover:text-gray-600 py-1 -my-1"
                aria-label="Envoyer un email à TaxiAssur"
              >
                team@taxiassur.com
              </a>
            </div>
            <div className="flex items-center gap-1.5 text-gray-800">
              <Shield size={16} aria-hidden="true" />
              <span className="hidden sm:inline font-semibold">ORIAS 11 061 425 — Courtier Agréé</span>
              <span className="sm:hidden font-semibold">ORIAS Agréé</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="container-max py-3 sm:py-4">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 sm:gap-3 flex-shrink-0" aria-label="TaxiAssur — Accueil">
            <div className="w-9 h-9 sm:w-11 sm:h-11 bg-gradient-to-br from-yellow-500 to-amber-500 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
              <span className="text-black font-black text-sm sm:text-base" aria-hidden="true">TA</span>
            </div>
            <div>
              <span className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">TaxiAssur</span>
              <span className="hidden sm:block text-[10px] text-yellow-400 tracking-widest font-bold uppercase">Excellence Coverage Risks</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-4 xl:gap-6" aria-label="Navigation principale">
            {mainNavigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`text-sm font-medium transition-colors duration-200 hover:text-amber-300 whitespace-nowrap ${
                  location.pathname === item.href ? 'text-yellow-400' : 'text-gray-200'
                }`}
              >
                {item.name}
              </Link>
            ))}

            {/* Services Dropdown */}
            <div
              className="relative"
              onMouseEnter={handleServicesMouseEnter}
              onMouseLeave={handleServicesMouseLeave}
            >
              <button
                className="flex items-center gap-1 text-sm font-medium text-gray-200 hover:text-amber-300 transition-colors whitespace-nowrap"
                aria-expanded={isServicesOpen}
                aria-haspopup="true"
              >
                <span>Services</span>
                <ChevronDown size={14} className={`transition-transform duration-200 ${isServicesOpen ? 'rotate-180' : ''}`} />
              </button>

              {isServicesOpen && (
                <div
                  className="absolute top-full left-0 mt-1 w-56 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl py-2 z-50"
                  onMouseEnter={handleServicesMouseEnter}
                  onMouseLeave={handleServicesMouseLeave}
                  role="menu"
                >
                  {servicesDropdown.map((item) => (
                    <React.Fragment key={item.name}>
                      {item.separator && <div className="my-1.5 border-t border-yellow-500/30" role="separator" />}
                      <Link
                        to={item.href}
                        role="menuitem"
                        className={`block px-4 py-2 text-sm transition-colors ${
                          item.highlight
                            ? 'text-yellow-400 font-semibold hover:bg-yellow-500/15 hover:text-yellow-300'
                            : 'text-gray-200 hover:bg-gray-800 hover:text-amber-300'
                        }`}
                      >
                        {item.name}
                      </Link>
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>
          </nav>

          {/* Desktop CTA buttons */}
          <div className="hidden lg:flex items-center gap-3">
            <Link
              to="/espace-client"
              className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 text-sm whitespace-nowrap border border-gray-600 hover:border-yellow-400"
            >
              <User size={15} aria-hidden="true" />
              <span>Espace Client</span>
            </Link>
            <button
              onClick={scrollToDevis}
              className="bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black font-bold py-2 px-5 rounded-lg transition-all duration-200 text-sm whitespace-nowrap shadow-lg"
            >
              Devis Gratuit
            </button>
          </div>

          {/* Mobile menu button */}
          <button
            className="lg:hidden inline-flex items-center justify-center min-w-[44px] min-h-[44px] p-3 text-gray-200 hover:text-yellow-300 transition-colors rounded-lg hover:bg-gray-800/50"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={isMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-nav"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav
            id="mobile-nav"
            className="lg:hidden mt-3 pb-3 border-t border-gray-700"
            aria-label="Navigation mobile"
          >
            <div className="flex flex-col gap-1 pt-3">
              {allNavigation.map((item) => (
                <React.Fragment key={item.name}>
                  {item.separator && <div className="my-1 border-t border-gray-700/50" />}
                  <Link
                    to={item.href}
                    className={`text-sm font-medium transition-colors duration-200 px-3 py-3 min-h-[44px] flex items-center rounded-lg ${
                      item.highlight
                        ? 'text-yellow-400 font-bold hover:bg-yellow-500/15'
                        : location.pathname === item.href
                        ? 'text-yellow-400 bg-gray-800/40'
                        : 'text-gray-200 hover:text-amber-300 hover:bg-gray-800/40'
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                </React.Fragment>
              ))}

              <div className="flex flex-col gap-2 mt-3 px-1">
                <Link
                  to="/espace-client"
                  className="flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 rounded-lg transition-all duration-200 text-sm border border-gray-600"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <User size={16} aria-hidden="true" />
                  <span>Espace Client</span>
                </Link>
                <button
                  className="bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black font-bold py-3 rounded-lg transition-all duration-200 text-sm shadow-lg w-full"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setTimeout(scrollToDevis, 250);
                  }}
                >
                  Devis Gratuit
                </button>

                {/* Mobile phone CTA */}
                <a
                  href="tel:0180855786"
                  className="flex items-center justify-center gap-2 border-2 border-yellow-500 text-yellow-400 hover:bg-yellow-500/10 font-bold py-3 rounded-lg transition-all duration-200 text-sm"
                >
                  <Phone size={16} aria-hidden="true" />
                  <span>01 80 85 57 86</span>
                </a>
              </div>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;
