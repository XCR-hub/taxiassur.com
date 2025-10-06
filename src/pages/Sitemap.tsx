import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Home, Shield, Users, Truck, MessageCircle, FileText } from 'lucide-react';

const Sitemap: React.FC = () => {
  useEffect(() => {
    document.title = 'Plan du Site | TaxiAssur.com';
  }, []);

  const pages = [
    {
      icon: Home,
      title: 'Accueil',
      path: '/',
      description: 'Page principale avec formulaire de devis'
    },
    {
      icon: Shield,
      title: 'Assurance Taxi',
      path: '/assurance-taxi',
      description: 'Assurance professionnelle pour taxis'
    },
    {
      icon: Users,
      title: 'RC Professionnelle',
      path: '/rc-professionnelle',
      description: 'Responsabilité civile professionnelle'
    },
    {
      icon: Truck,
      title: 'Flotte de Véhicules',
      path: '/flotte-vehicules',
      description: 'Assurance pour flottes de taxis'
    },
    {
      icon: MessageCircle,
      title: 'Conseil Personnalisé',
      path: '/conseil-personnalise',
      description: 'Accompagnement sur-mesure'
    },
    {
      icon: FileText,
      title: 'Gestion des Sinistres',
      path: '/gestion-sinistres',
      description: 'Assistance et gestion des sinistres'
    }
  ];

  const legalPages = [
    {
      title: 'Mentions Légales',
      path: '/mentions-legales',
      description: 'Informations légales et réglementaires'
    },
    {
      title: 'Politique de Confidentialité',
      path: '/politique-confidentialite',
      description: 'Protection des données personnelles'
    },
    {
      title: 'Conditions Générales',
      path: '/conditions-generales',
      description: 'Conditions d\'utilisation des services'
    }
  ];

  return (
    <div className="min-h-screen bg-black">
      <Header />
      <main className="section-padding">
        <div className="container-max">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-white mb-4">
                Plan du <span className="text-gradient">Site</span>
              </h1>
              <p className="text-xl text-gray-300">
                Retrouvez facilement toutes les pages de TaxiAssur.com
              </p>
            </div>

            {/* Main Pages */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-white mb-6">Nos Services</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pages.map((page, index) => {
                  const IconComponent = page.icon;
                  return (
                    <Link
                      key={index}
                      to={page.path}
                      className="card-premium hover:border-amber-500/50 transition-all duration-300 group"
                    >
                      <div className="flex items-center mb-3">
                        <IconComponent className="text-amber-400 mr-3 group-hover:scale-110 transition-transform" size={24} />
                        <h3 className="text-lg font-bold text-white group-hover:text-amber-400 transition-colors">
                          {page.title}
                        </h3>
                      </div>
                      <p className="text-gray-600 text-sm">
                        {page.description}
                      </p>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Legal Pages */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-white mb-6">Informations Légales</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {legalPages.map((page, index) => (
                  <Link
                    key={index}
                    to={page.path}
                    className="card-premium hover:border-amber-500/50 transition-all duration-300 group"
                  >
                    <h3 className="text-lg font-bold text-white mb-3 group-hover:text-amber-400 transition-colors">
                      {page.title}
                    </h3>
                    <p className="text-gray-600 text-sm">
                      {page.description}
                    </p>
                  </Link>
                ))}
              </div>
            </div>

            {/* Contact Section */}
            <div className="card-premium text-center">
              <h2 className="text-2xl font-bold text-gradient mb-4">
                Besoin d'Aide ?
              </h2>
              <p className="text-gray-300 mb-6">
                Notre équipe est à votre disposition pour répondre à toutes vos questions
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a href="tel:0180855786" className="btn-primary">
                  01 80 85 57 86
                </a>
                <a href="mailto:team@taxiassur.com" className="btn-outline">
                  team@taxiassur.com
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Sitemap;