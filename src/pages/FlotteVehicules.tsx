import React, { useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import LeadForm from '../components/LeadForm';
import StickyCTA from '../components/StickyCTA';
import SEOHead from '../components/SEOHead';
import JsonLd from '../components/JsonLd';
import AITaxiBackground from '../components/AITaxiBackground';
import { Truck, TrendingDown, Clock, Users } from 'lucide-react';

const FlotteVehicules: React.FC = () => {
  const breadcrumbs = [
    { name: 'Accueil', url: '/' },
    { name: 'Flotte Véhicules', url: '/flotte-vehicules' }
  ];

  return (
    <>
      <SEOHead
        title="Assurance Flotte Taxi - Tarifs Préférentiels Groupe | TaxiAssur"
        description="🚐 Assurance flotte taxi avec TaxiAssur. Devis gratuit ✓ Tarifs dégressifs ✓ Gestion centralisée ✓ Conseiller dédié ✓ 2-100+ véhicules ✓ Économies importantes"
        canonical="/flotte-vehicules"
        keywords="assurance flotte taxi, assurance groupe taxi, tarifs flotte taxi, gestion centralisée taxi, assurance multi-véhicules taxi, courtier flotte taxi"
      />
      <JsonLd type="breadcrumb" data={breadcrumbs} />
      <JsonLd type="organization" />
      <JsonLd type="insurance-product" data={{
        name: "Assurance Flotte Taxi Multi-Véhicules",
        description: "Assurance flotte taxi avec tarifs dégressifs pour 2 à 100+ véhicules. Gestion centralisée, conseiller dédié, économies importantes sur votre parc automobile professionnel.",
        url: "/flotte-vehicules",
        lowPrice: 2500,
        highPrice: 8000,
        ratingValue: "4.8",
        reviewCount: 45,
        offerCount: 8
      }} />

    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black">
      <Header />
      <main>
        {/* Hero Section */}
        <section className="relative py-20 bg-gradient-to-br from-gray-950 via-gray-900 to-black overflow-hidden">
          <AITaxiBackground section="hero" intensity="medium" />
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-30"
            style={{
              backgroundImage: `url('https://images.pexels.com/photos/1545743/pexels-photo-1545743.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop')`,
            }}
          ></div>
          <div className="container-max relative z-20">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 drop-shadow-lg">
                Assurance <span className="text-gradient">Flotte de Véhicules</span>
              </h1>
              <p className="text-2xl text-gray-200 mb-8 leading-relaxed drop-shadow-md">
                🚐 <strong className="text-yellow-400">Simplifiez la gestion de votre flotte taxi</strong> avec une 
                <strong className="text-yellow-500">assurance globale</strong>. 
                <strong className="text-green-400">Tarifs préférentiels groupe</strong> et service dédié professionnel.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a href="#devis" className="btn-primary">
                  🎯 Demander Mon Devis Flotte Gratuit
                </a>
                <a href="tel:0180855786" className="btn-outline">
                  📞 Expert Flotte : 01 80 85 57 86
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Advantages Section */}
        <section className="section-padding bg-gradient-to-br from-gray-900 to-gray-800">
          <div className="container-max">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-4 drop-shadow-lg">
                Avantages de l'Assurance Flotte
              </h2>
              <p className="text-gray-200 max-w-2xl mx-auto drop-shadow-md">
                Une solution complète pour optimiser la protection et la gestion de vos véhicules
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="ai-card text-center p-6 hover:shadow-green-500/40 transition-all duration-300 group">
                <TrendingDown className="text-green-400 mx-auto mb-4 group-hover:scale-110 transition-transform drop-shadow-md" size={48} />
                <h3 className="text-xl font-bold text-white mb-3 drop-shadow-lg">
                  Tarifs Préférentiels
                </h3>
                <p className="text-gray-300 drop-shadow-md">
                  Économies substantielles grâce aux tarifs négociés pour les flottes
                </p>
              </div>

              <div className="ai-card text-center p-6 hover:shadow-amber-500/40 transition-all duration-300 group">
                <Clock className="text-yellow-500 mx-auto mb-4 group-hover:scale-110 transition-transform drop-shadow-md" size={48} />
                <h3 className="text-xl font-bold text-white mb-3 drop-shadow-lg">
                  Gestion Simplifiée
                </h3>
                <p className="text-gray-300 drop-shadow-md">
                  Un seul contrat, une seule échéance pour tous vos véhicules
                </p>
              </div>

              <div className="ai-card text-center p-6 hover:shadow-yellow-500/40 transition-all duration-300 group">
                <Users className="text-yellow-400 mx-auto mb-4 group-hover:scale-110 transition-transform drop-shadow-md" size={48} />
                <h3 className="text-xl font-bold text-white mb-3 drop-shadow-lg">
                  Conseiller Dédié
                </h3>
                <p className="text-gray-300 drop-shadow-md">
                  Un interlocuteur unique pour toute votre flotte
                </p>
              </div>

              <div className="ai-card text-center p-6 hover:shadow-yellow-500/40 transition-all duration-300 group">
                <Truck className="text-yellow-400 mx-auto mb-4 group-hover:scale-110 transition-transform drop-shadow-md" size={48} />
                <h3 className="text-xl font-bold text-white mb-3 drop-shadow-lg">
                  Flexibilité Totale
                </h3>
                <p className="text-gray-300 drop-shadow-md">
                  Ajout et retrait de véhicules en cours de contrat
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Fleet Sizes */}
        <section className="section-padding bg-gradient-to-br from-black via-gray-950 to-gray-900">
          <div className="container-max">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-white mb-8 text-center drop-shadow-lg">
                Solutions Adaptées à Votre Taille
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="ai-card text-center p-6 hover:shadow-yellow-500/40 transition-all duration-300">
                  <div className="text-4xl font-bold text-gradient mb-4 drop-shadow-lg">2-5</div>
                  <h3 className="text-xl font-bold text-white mb-3 drop-shadow-lg">Petite Flotte</h3>
                  <ul className="text-gray-300 space-y-2 text-sm drop-shadow-md">
                    <li>• Gestion simplifiée</li>
                    <li>• Tarifs négociés</li>
                    <li>• Flexibilité maximale</li>
                    <li>• Service personnalisé</li>
                  </ul>
                </div>

                <div className="ai-card text-center p-6 border-2 border-amber-500/60 shadow-2xl taxi-glow">
                  <div className="text-4xl font-bold text-gradient mb-4 drop-shadow-lg">6-20</div>
                  <h3 className="text-xl font-bold text-white mb-3 drop-shadow-lg">Flotte Moyenne</h3>
                  <div className="bg-gradient-to-r from-amber-500 to-yellow-500 text-black px-3 py-2 rounded-full text-xs font-bold mb-3 shadow-lg">
                    PLUS POPULAIRE
                  </div>
                  <ul className="text-gray-300 space-y-2 text-sm drop-shadow-md">
                    <li>• Remises importantes</li>
                    <li>• Gestion centralisée</li>
                    <li>• Reporting détaillé</li>
                    <li>• Conseiller dédié</li>
                  </ul>
                </div>

                <div className="ai-card text-center p-6 hover:shadow-yellow-500/40 transition-all duration-300">
                  <div className="text-4xl font-bold text-gradient mb-4 drop-shadow-lg">20+</div>
                  <h3 className="text-xl font-bold text-white mb-3 drop-shadow-lg">Grande Flotte</h3>
                  <ul className="text-gray-300 space-y-2 text-sm drop-shadow-md">
                    <li>• Tarifs sur-mesure</li>
                    <li>• Outils de gestion avancés</li>
                    <li>• Support prioritaire</li>
                    <li>• Solutions personnalisées</li>
                  </ul>
                </div>
              </div>

              <div className="text-center mt-12">
                <div className="ai-card p-8 taxi-glow">
                  <h3 className="text-2xl font-bold text-gradient mb-4 drop-shadow-lg">
                    Quelle que soit votre taille
                  </h3>
                  <p className="text-gray-200 mb-6 text-lg drop-shadow-md">
                    Nous adaptons notre offre à vos besoins spécifiques. 
                    De 2 à plus de 100 véhicules, nous avons la solution.
                  </p>
                  <a href="#devis" className="btn-primary">
                    🎯 Obtenir Mon Devis Flotte Gratuit
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        <LeadForm />
      </main>
      <Footer />
      <StickyCTA />
    </div>
    </>
  );
};

export default FlotteVehicules;