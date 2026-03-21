import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ReviewsList from '../components/ReviewsList';
import Seo from '../components/Seo';
import JsonLd from '../components/JsonLd';
import AITaxiBackground from '../components/AITaxiBackground';
import StickyCTA from '../components/StickyCTA';
import { useRealStats } from '../hooks/useRealStats';

const Reviews: React.FC = () => {
  const { totalLeads, totalReviews, loading } = useRealStats();

  const breadcrumbs = [
    { name: 'Accueil', url: '/' },
    { name: 'Avis Clients', url: '/avis' }
  ];

  return (
    <>
      <Seo
        title="Avis Clients TaxiAssur - Témoignages Authentiques Taxi | 100+ Clients"
        description="Avis clients TaxiAssur : plus de 100 chauffeurs de taxi témoignent de leurs économies et de la qualité du service. Courtier spécialisé assurance taxi, satisfaction garantie."
        canonical="/avis"
        keywords="avis clients TaxiAssur, témoignages taxi authentiques, satisfaction client taxi, note avis taxi, retour expérience assurance taxi, clients satisfaits taxi"
      />
      <JsonLd type="breadcrumb" data={breadcrumbs} />
      <JsonLd type="organization" />

      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black">
        <Header />
        
        <main>
          {/* Hero Section */}
          <section className="relative bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white py-20 overflow-hidden">
            <AITaxiBackground section="hero" intensity="medium" />
            <div className="container-max">
              <div className="max-w-5xl mx-auto text-center relative z-20">
                <h1 className="text-4xl md:text-6xl font-bold mb-6 drop-shadow-lg">
                  Avis <span className="text-gradient">Clients</span>
                </h1>
                <p className="text-2xl text-gray-200 mb-8 leading-relaxed drop-shadow-md">
                  ⭐ <strong className="text-yellow-500">Découvrez pourquoi {loading ? '100+' : `${totalLeads}+`} professionnels du taxi</strong>
                  nous ont fait confiance pour leur assurance. <strong className="text-green-400">Clients satisfaits</strong>,
                  <strong className="text-yellow-400">témoignages authentiques</strong> et économies réelles.
                </p>

                <div className="grid grid-cols-3 gap-6 max-w-md mx-auto mb-8">
                  <div className="ai-card p-4 hover:shadow-amber-500/40 transition-all duration-300">
                    <div className="text-2xl font-bold text-yellow-500 drop-shadow-lg">
                      {loading ? '100+' : `${totalLeads}+`}
                    </div>
                    <div className="text-xs text-gray-300 drop-shadow-md">Demandes de devis</div>
                  </div>
                  <div className="ai-card p-4 hover:shadow-green-500/40 transition-all duration-300">
                    <div className="text-2xl font-bold text-green-400 drop-shadow-lg">{totalReviews}</div>
                    <div className="text-xs text-gray-300 drop-shadow-md">Avis réels</div>
                  </div>
                  <div className="ai-card p-4 hover:shadow-yellow-500/40 transition-all duration-300">
                    <div className="text-2xl font-bold text-yellow-400 drop-shadow-lg">580€</div>
                    <div className="text-xs text-gray-300 drop-shadow-md">Économie moy.</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Reviews Content */}
          <section className="section-padding bg-gradient-to-br from-gray-900 to-gray-800">
            <div className="container-max">
              <ReviewsList showFilters />
            </div>
          </section>

          {/* CTA Section */}
          <section className="section-padding bg-gradient-to-br from-black via-gray-950 to-gray-900">
            <div className="container-max">
              <div className="max-w-3xl mx-auto text-center">
                <h2 className="text-3xl font-bold text-white mb-4 drop-shadow-lg">
                  Rejoignez Nos Clients Satisfaits
                </h2>
                <p className="text-gray-200 mb-8 text-lg drop-shadow-md">
                  Découvrez pourquoi nos clients recommandent TaxiAssur et 
                  obtenez votre devis personnalisé dès maintenant.
                </p>
                <a href="#devis" className="btn-primary">
                  🎯 Demander Mon Devis Gratuit
                </a>
              </div>
            </div>
          </section>
        </main>

        <Footer />
        <StickyCTA />
      </div>
    </>
  );
};

export default Reviews;