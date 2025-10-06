import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Offer } from '../lib/schema';
import { getOffers } from '../lib/content';
import { truncateText } from '../lib/utils';
import Seo from '../components/Seo';
import JsonLd from '../components/JsonLd';
import Card from '../components/Card';

const Offers: React.FC = () => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOffers = async () => {
      try {
        const offersData = await getOffers();
        setOffers(offersData);
      } catch (error) {
        console.error('Failed to load offers:', error);
      } finally {
        setLoading(false);
      }
    };

    loadOffers();
  }, []);

  const breadcrumbs = [
    { name: 'Accueil', url: '/' },
    { name: 'Nos Offres', url: '/offres' }
  ];

  return (
    <>
      <Seo
        title="Offres Assurance Taxi - Solutions Pro Sur-Mesure | TaxiAssur"
        description="🎯 Offres assurance taxi TaxiAssur : RC professionnelle ✓ Flotte véhicules ✓ Conseil personnalisé ✓ Gestion sinistres ✓ Solutions sur-mesure ✓ Tarifs négociés ✓ Expert taxi"
        canonical="/offres"
        keywords="offres assurance taxi, solutions assurance taxi, RC professionnelle taxi, flotte véhicules taxi, conseil assurance taxi, gestion sinistres taxi, tarifs assurance taxi"
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
                  Nos <span className="text-gradient">Offres</span>
                </h1>
                <p className="text-2xl text-gray-200 mb-8 leading-relaxed drop-shadow-md">
                  🎯 <strong className="text-blue-400">Solutions d'assurance sur-mesure</strong> pour tous les 
                  <strong className="text-amber-400">professionnels du transport de personnes</strong>. 
                  <strong className="text-green-400">Tarifs négociés exclusifs</strong> et service expert.
                </p>
                
                <div className="grid grid-cols-3 gap-6 max-w-md mx-auto mb-8">
                  <div className="ai-card p-4 hover:shadow-blue-500/40 transition-all duration-300">
                    <div className="text-2xl font-bold text-blue-400 drop-shadow-lg">4</div>
                    <div className="text-xs text-gray-300 drop-shadow-md">Offres</div>
                  </div>
                  <div className="ai-card p-4 hover:shadow-green-500/40 transition-all duration-300">
                    <div className="text-2xl font-bold text-green-400 drop-shadow-lg">-35%</div>
                    <div className="text-xs text-gray-300 drop-shadow-md">Économies</div>
                  </div>
                  <div className="ai-card p-4 hover:shadow-purple-500/40 transition-all duration-300">
                    <div className="text-2xl font-bold text-purple-400 drop-shadow-lg">Expert</div>
                    <div className="text-xs text-gray-300 drop-shadow-md">Service</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Offers Grid */}
          <section className="section-padding bg-gradient-to-br from-gray-900 to-gray-800">
            <div className="container-max">
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="ai-card animate-pulse p-6">
                      <div className="h-6 bg-gray-200 rounded mb-4"></div>
                      <div className="h-32 bg-gray-200 rounded mb-4"></div>
                      <div className="space-y-2">
                        {[...Array(4)].map((_, j) => (
                          <div key={j} className="h-4 bg-gray-200 rounded"></div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {offers.map(offer => (
                    <div key={offer.id} className="ai-card p-6 hover:shadow-amber-500/40 hover:border-amber-500/50 transition-all duration-300 group">
                      <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-amber-300 transition-colors drop-shadow-lg">
                        {offer.title}
                      </h3>
                      
                      <div 
                        className="text-gray-300 mb-6 leading-relaxed drop-shadow-md"
                        dangerouslySetInnerHTML={{ 
                          __html: truncateText(offer.body.replace(/<[^>]*>/g, ''), 150) 
                        }}
                      />
                      
                      {offer.benefits.length > 0 && (
                        <div className="mb-6">
                          <h4 className="font-semibold text-white mb-3 drop-shadow-lg">Avantages inclus :</h4>
                          <ul className="space-y-2">
                            {offer.benefits.slice(0, 3).map((benefit, index) => (
                              <li key={index} className="flex items-start space-x-2">
                                <CheckCircle className="text-green-400 flex-shrink-0 mt-0.5" size={16} />
                                <span className="text-sm text-gray-300">{benefit}</span>
                              </li>
                            ))}
                            {offer.benefits.length > 3 && (
                              <li className="text-sm text-gray-600 italic">
                                +{offer.benefits.length - 3} autres avantages
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                      
                      <Link
                        to={`/offres/${offer.id}`}
                        className="btn-primary w-full text-center"
                      >
                        <span>{offer.ctaLabel}</span>
                        <ArrowRight size={16} />
                      </Link>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty State */}
              {!loading && offers.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-600 text-lg">Aucune offre disponible pour le moment.</p>
                </div>
              )}
            </div>
          </section>

          {/* Contact CTA */}
          <section className="section-padding bg-gradient-to-br from-black via-gray-950 to-gray-900">
            <div className="container-max">
              <div className="max-w-3xl mx-auto text-center">
                <h2 className="text-3xl font-bold text-white mb-4 drop-shadow-lg">
                  Besoin d'une Solution Sur-Mesure ?
                </h2>
                <p className="text-gray-200 mb-8 text-lg drop-shadow-md">
                  Nos experts analysent vos besoins spécifiques et vous proposent 
                  la solution d'assurance la plus adaptée à votre activité.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <a href="#devis" className="btn-primary">
                    🎯 Demander un Devis Personnalisé
                  </a>
                  <a href="tel:0180855786" className="btn-outline">
                    📞 01 80 85 57 86
                  </a>
                </div>
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

export default Offers;