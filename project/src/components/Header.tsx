import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Phone, Menu, X, Shield } from 'lucide-react';

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const navigation = [
    { name: 'Accueil', href: '/' },
    { name: 'Assurance Taxi', href: '/assurance-taxi' },
    { name: 'RC Professionnelle', href: '/rc-professionnelle' },
    { name: 'Flotte Véhicules', href: '/flotte-vehicules' },
    { name: 'Conseil Personnalisé', href: '/conseil-personnalise' },
    { name: 'Gestion Sinistres', href: '/gestion-sinistres' },
    { name: 'Blog', href: '/blog' },
    { name: 'FAQ', href: '/faq' },
    { name: 'Avis', href: '/avis' },
    { name: 'Partenaires', href: '/programme-partenaires' },
    { name: 'Contact', href: '/contact' }
  ];

  return (
    <header className="bg-black/95 backdrop-blur-lg border-b border-gray-800 sticky top-0 z-50 shadow-lg">
      {/* Top bar */}
      <div className="bg-gradient-to-r from-yellow-600 to-yellow-500 text-black py-2">
        <div className="container-max">
          <div className="flex flex-col sm:flex-row justify-between items-center text-sm font-bold">
            <div className="flex items-center space-x-6 mb-2 sm:mb-0">
              <div className="flex items-center space-x-2">
                <Phone size={14} />
                <a href="tel:0180855786" className="hover:text-gray-800 transition-colors">
                  01 80 85 57 86
                </a>
              </div>
              <div className="flex items-center space-x-2">
                <span>team@taxiassur.com</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Shield size={14} />
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
          <nav className="hidden lg:flex items-center space-x-6">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`text-sm font-medium transition-colors duration-200 hover:text-orange-300 ${
                  location.pathname === item.href ? 'text-yellow-400' : 'text-gray-200'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm text-gray-300">Devis IA gratuit</p>
              <p className="font-bold text-yellow-300">01 80 85 57 86</p>
            </div>
            <div className="flex flex-col">
              <a 
                href="/#devis" 
                className="bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-black font-bold py-2 px-4 rounded-lg transition-all duration-300 text-sm"
              >
                Devis IA
              </a>
              <Link
                to="/backoffice"
                className="text-xs text-gray-400 hover:text-yellow-300 transition-colors mt-1 text-center"
                title="Accès backoffice"
              >
                Admin
              </Link>
            </div>
          </div>

          {/* Mobile menu button */}
          <button
            className="lg:hidden text-gray-200 hover:text-yellow-300 transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="lg:hidden mt-4 pb-4 border-t border-gray-700 bg-gray-900/95 backdrop-blur-lg rounded-lg">
            <div className="flex flex-col space-y-2 pt-4">
              {navigation.map((item) => (
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
                Devis IA Gratuit
              </a>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;