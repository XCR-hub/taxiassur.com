import React from 'react';
import { Link } from 'react-router-dom';
import { Home, FileText, MessageCircle, Star, Phone, Shield } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Seo from '../components/Seo';
import Card from '../components/Card';

const SitemapPage: React.FC = () => {
  const pages = [
    {
      icon: Home,
      title: 'Accueil',
      path: '/',
      description: 'Page principale avec formulaire de devis'
    },
    {
      icon: FileText,
      title: 'Blog',
      path: '/blog',
      description: 'Actualités et conseils assurance taxi'
    },
    {
      icon: MessageCircle,
      title: 'FAQ',
      path: '/faq',
      description: 'Questions fréquentes sur l\'assurance taxi'
    },
    {
      icon: Star,
      title: 'Avis Clients',
      path: '/avis',
      description: 'Témoignages de nos clients satisfaits'
    },
    {
      icon: Shield,
      title: 'Nos Offres',
      path: '/offres',
      description: 'Solutions d\'assurance pour professionnels'
    },
    {
      icon: Phone,
      title: 'Contact',
      path: '/contact',
      description: 'Contactez nos experts TaxiAssur'
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
    <>
      <Seo
        title="Plan du Site - TaxiAssur"
        description="Retrouvez facilement toutes les pages de TaxiAssur.com : blog, FAQ, avis clients, offres d'assurance et informations légales."
        canonical="/plan-du-site"
        keywords="plan du site, navigation, pages taxiassur"
      />

      <div className="min-h-screen bg-white">
        <Header />
        
        <main>
          {/* Hero Section */}
          <section className="bg-gradient-to-br from-gray-900 to-black text-white py-20">
            <div className="container-max">
              <div className="max-w-4xl mx-auto text-center">
                <h1 className="text-4xl md:text-5xl font-bold mb-6">
                  Plan du <span className="text-gradient">Site</span>
                </h1>
                <p className="text-xl text-gray-300">
                  Retrouvez facilement toutes les pages de TaxiAssur.com
                </p>
              </div>
            </div>
          </section>

          {/* Main Pages */}
          <section className="section-padding">
            <div className="container-max">
              <div className="max-w-6xl mx-auto">
                <h2 className="text-3xl font-bold text-gray-900 mb-8">Pages Principales</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
                  {pages.map((page, index) => {
                    const IconComponent = page.icon;
                    return (
                      <Link
                        key={index}
                        to={page.path}
                        className="block"
                      >
                        <Card hover className="group h-full">
                          <div className="flex items-center mb-3">
                            <IconComponent className="text-amber-500 mr-3 group-hover:scale-110 transition-transform" size={24} />
                            <h3 className="text-lg font-bold text-gray-900 group-hover:text-amber-600 transition-colors">
                              {page.title}
                            </h3>
                          </div>
                          <p className="text-gray-600 text-sm">
                            {page.description}
                          </p>
                        </Card>
                      </Link>
                    );
                  })}
                </div>

                {/* Legal Pages */}
                <h2 className="text-3xl font-bold text-gray-900 mb-8">Informations Légales</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
                  {legalPages.map((page, index) => (
                    <Link
                      key={index}
                      to={page.path}
                      className="block"
                    >
                      <Card hover className="group h-full">
                        <h3 className="text-lg font-bold text-gray-900 mb-3 group-hover:text-amber-600 transition-colors">
                          {page.title}
                        </h3>
                        <p className="text-gray-600 text-sm">
                          {page.description}
                        </p>
                      </Card>
                    </Link>
                  ))}
                </div>

                {/* Services Pages */}
                <h2 className="text-3xl font-bold text-gray-900 mb-8">Nos Services</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
                  <Link to="/assurance-taxi" className="block">
                    <Card hover className="group h-full">
                      <h3 className="text-lg font-bold text-gray-900 mb-3 group-hover:text-amber-600 transition-colors">
                        Assurance Taxi
                      </h3>
                      <p className="text-gray-600 text-sm">
                        Guide complet et devis assurance taxi professionnel
                      </p>
                    </Card>
                  </Link>
                  <Link to="/rc-professionnelle" className="block">
                    <Card hover className="group h-full">
                      <h3 className="text-lg font-bold text-gray-900 mb-3 group-hover:text-amber-600 transition-colors">
                        RC Professionnelle
                      </h3>
                      <p className="text-gray-600 text-sm">
                        Responsabilité civile pro obligatoire pour taxis et VTC
                      </p>
                    </Card>
                  </Link>
                  <Link to="/flotte-vehicules" className="block">
                    <Card hover className="group h-full">
                      <h3 className="text-lg font-bold text-gray-900 mb-3 group-hover:text-amber-600 transition-colors">
                        Assurance Flotte
                      </h3>
                      <p className="text-gray-600 text-sm">
                        Solutions pour flottes de taxis et VTC
                      </p>
                    </Card>
                  </Link>
                  <Link to="/gestion-sinistres" className="block">
                    <Card hover className="group h-full">
                      <h3 className="text-lg font-bold text-gray-900 mb-3 group-hover:text-amber-600 transition-colors">
                        Gestion Sinistres
                      </h3>
                      <p className="text-gray-600 text-sm">
                        Accompagnement expert dans vos démarches sinistres
                      </p>
                    </Card>
                  </Link>
                </div>

                {/* External Resources - SEO Backlinks */}
                <h2 className="text-3xl font-bold text-gray-900 mb-8">Ressources Externes</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
                  <Card>
                    <h3 className="text-lg font-bold text-gray-900 mb-3">ORIAS - Registre des Intermédiaires</h3>
                    <p className="text-gray-600 text-sm mb-3">
                      Vérifiez notre agrément courtier ORIAS 11 061 425
                    </p>
                    <a
                      href="https://www.orias.fr/search"
                      className="text-amber-600 hover:text-amber-700 font-medium transition-colors"
                      target="_blank"
                      rel="nofollow noopener noreferrer"
                    >
                      Consulter ORIAS →
                    </a>
                  </Card>
                  <Card>
                    <h3 className="text-lg font-bold text-gray-900 mb-3">Service Public - Taxi</h3>
                    <p className="text-gray-600 text-sm mb-3">
                      Réglementation officielle des taxis en France
                    </p>
                    <a
                      href="https://www.service-public.fr/professionnels-entreprises/vosdroits/F22550"
                      className="text-amber-600 hover:text-amber-700 font-medium transition-colors"
                      target="_blank"
                      rel="nofollow noopener noreferrer"
                    >
                      En savoir plus →
                    </a>
                  </Card>
                  <Card>
                    <h3 className="text-lg font-bold text-gray-900 mb-3">Légifrance - Code des Assurances</h3>
                    <p className="text-gray-600 text-sm mb-3">
                      Textes de loi régissant l'assurance en France
                    </p>
                    <a
                      href="https://www.legifrance.gouv.fr/codes/id/LEGITEXT000006073984/"
                      className="text-amber-600 hover:text-amber-700 font-medium transition-colors"
                      target="_blank"
                      rel="nofollow noopener noreferrer"
                    >
                      Consulter Légifrance →
                    </a>
                  </Card>
                  <Card>
                    <h3 className="text-lg font-bold text-gray-900 mb-3">FFA - Fédération Française Assurance</h3>
                    <p className="text-gray-600 text-sm mb-3">
                      Informations officielles sur l'assurance en France
                    </p>
                    <a
                      href="https://www.ffa-assurance.fr/"
                      className="text-amber-600 hover:text-amber-700 font-medium transition-colors"
                      target="_blank"
                      rel="nofollow noopener noreferrer"
                    >
                      Visiter FFA →
                    </a>
                  </Card>
                </div>

                {/* Technical Links */}
                <h2 className="text-3xl font-bold text-gray-900 mb-8">Liens Techniques</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <h3 className="text-lg font-bold text-gray-900 mb-3">Flux RSS</h3>
                    <p className="text-gray-600 text-sm mb-3">
                      Suivez nos derniers articles de blog
                    </p>
                    <a
                      href="/feeds/rss.xml"
                      className="text-amber-600 hover:text-amber-700 font-medium transition-colors"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      /feeds/rss.xml
                    </a>
                  </Card>

                  <Card>
                    <h3 className="text-lg font-bold text-gray-900 mb-3">Sitemap XML</h3>
                    <p className="text-gray-600 text-sm mb-3">
                      Plan du site pour les moteurs de recherche
                    </p>
                    <a
                      href="/feeds/sitemap.xml"
                      className="text-amber-600 hover:text-amber-700 font-medium transition-colors"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      /feeds/sitemap.xml
                    </a>
                  </Card>
                </div>
              </div>
            </div>
          </section>

          {/* Contact CTA */}
          <section className="section-padding bg-gradient-to-br from-amber-50 to-yellow-50">
            <div className="container-max">
              <div className="max-w-2xl mx-auto text-center">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Besoin d'Aide ?
                </h2>
                <p className="text-gray-600 mb-8">
                  Notre équipe est à votre disposition pour répondre à toutes vos questions
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <a 
                    href="tel:0180855786" 
                    className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black font-bold py-4 px-8 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    01 80 85 57 86
                  </a>
                  <a 
                    href="mailto:team@taxiassur.com" 
                    className="border-2 border-amber-500 text-amber-600 hover:bg-amber-500 hover:text-black font-bold py-4 px-8 rounded-lg transition-all duration-300"
                  >
                    team@taxiassur.com
                  </a>
                </div>
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default SitemapPage;