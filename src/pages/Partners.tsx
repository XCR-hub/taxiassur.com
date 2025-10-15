import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import PartnerDirectory from '../components/PartnerDirectory';
import Seo from '../components/Seo';
import JsonLd from '../components/JsonLd';

const Partners: React.FC = () => {
  const breadcrumbs = [
    { name: 'Accueil', url: '/' },
    { name: 'Partenaires', url: '/partenaires' }
  ];

  return (
    <>
      <Seo
        title="Nos Partenaires - Réseau TaxiAssur"
        description="Découvrez le réseau de partenaires TaxiAssur : annuaires, équipementiers, services et associations du secteur taxi."
        canonical="/partenaires"
        keywords="partenaires taxiassur, réseau taxi, annuaires taxi, équipements taxi"
      />
      <JsonLd type="breadcrumb" data={breadcrumbs} />

      <div className="min-h-screen bg-white">
        <Header />
        
        <main>
          {/* Hero Section */}
          <section className="bg-gradient-to-br from-gray-900 to-black text-white py-20">
            <div className="container-max">
              <div className="max-w-4xl mx-auto text-center">
                <h1 className="text-4xl md:text-5xl font-bold mb-6">
                  Nos <span className="text-gradient">Partenaires</span>
                </h1>
                <p className="text-xl text-gray-300 mb-8">
                  Un réseau de confiance pour accompagner les professionnels du taxi. 
                  Découvrez nos partenaires privilégiés et leurs services.
                </p>
              </div>
            </div>
          </section>

          {/* Featured Partners */}
          <section className="section-padding bg-gradient-to-br from-amber-50 to-yellow-50">
            <div className="container-max">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 font-semibold mb-4">
                  Partenaires Privilégiés
                </h2>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Nos partenaires de confiance, sélectionnés pour leur expertise 
                  et leur engagement envers les professionnels du taxi.
                </p>
              </div>
              
              <PartnerDirectory featured={true} showFilters={false} />
            </div>
          </section>

          {/* All Partners */}
          <section className="section-padding">
            <div className="container-max">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 font-semibold mb-4">
                  Répertoire Complet
                </h2>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Explorez l'ensemble de notre réseau de partenaires par catégorie.
                </p>
              </div>
              
              <PartnerDirectory showFilters={true} />
            </div>
          </section>

          {/* Partnership CTA */}
          <section className="section-padding bg-gradient-to-br from-gray-900 to-black text-white">
            <div className="container-max">
              <div className="max-w-2xl mx-auto text-center">
                <h2 className="text-3xl font-bold mb-4">
                  Devenir Partenaire TaxiAssur
                </h2>
                <p className="text-gray-300 mb-8">
                  Vous souhaitez rejoindre notre réseau de partenaires ? 
                  Contactez-nous pour découvrir les opportunités de collaboration.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <a 
                    href="mailto:partenariats@taxiassur.com" 
                    className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black font-bold py-4 px-8 rounded-lg transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-105"
                  >
                    Nous Contacter
                  </a>
                  <a 
                    href="tel:0180855786" 
                    className="border-2 border-amber-500 text-amber-500 hover:bg-amber-500 hover:text-black font-bold py-4 px-8 rounded-lg transition-all duration-300"
                  >
                    01 80 85 57 86
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

export default Partners;