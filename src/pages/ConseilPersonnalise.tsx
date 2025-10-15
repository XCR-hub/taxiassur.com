import React, { useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import LeadForm from '../components/LeadForm';
import StickyCTA from '../components/StickyCTA';
import SEOHead from '../components/SEOHead';
import JsonLd from '../components/JsonLd';
import AITaxiBackground from '../components/AITaxiBackground';
import { Users, MessageCircle, Target, Award } from 'lucide-react';

const ConseilPersonnalise: React.FC = () => {
  const breadcrumbs = [
    { name: 'Accueil', url: '/' },
    { name: 'Conseil Personnalisé', url: '/conseil-personnalise' }
  ];

  return (
    <>
      <SEOHead
        title="Conseil Assurance Taxi Personnalisé - Expert Dédié | TaxiAssur"
        description="👨‍💼 Conseil assurance taxi personnalisé avec TaxiAssur. Expert dédié ✓ Analyse sur-mesure ✓ Accompagnement complet ✓ Gratuit ✓ Spécialiste taxi ✓ 15 ans expertise"
        canonical="/conseil-personnalise"
        keywords="conseil assurance taxi, expert assurance taxi, accompagnement taxi, analyse personnalisée taxi, consultant assurance taxi, expertise taxi"
      />
      <JsonLd type="breadcrumb" data={breadcrumbs} />
      <JsonLd type="organization" />

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
                Conseil <span className="text-gradient">Personnalisé</span>
              </h1>
              <p className="text-2xl text-gray-200 mb-8 leading-relaxed drop-shadow-md">
                👨‍💼 <strong className="text-yellow-400">Nos experts vous accompagnent</strong> pour trouver 
                <strong className="text-yellow-500">l'assurance taxi parfaitement adaptée</strong> à votre activité. 
                <strong className="text-green-400">Conseil gratuit et personnalisé</strong> par des spécialistes.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a href="#devis" className="btn-primary">
                  🎯 Demander Mon Conseil Gratuit
                </a>
                <a href="tel:0180855786" className="btn-outline">
                  📞 Expert Conseil : 01 80 85 57 86
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Why Choose Our Advice */}
        <section className="section-padding bg-gradient-to-br from-gray-900 to-gray-800">
          <div className="container-max">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-4 drop-shadow-lg">
                Pourquoi Faire Appel à Nos Experts ?
              </h2>
              <p className="text-gray-200 max-w-2xl mx-auto drop-shadow-md">
                Une expertise reconnue au service de votre réussite professionnelle
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="ai-card text-center p-6 hover:shadow-amber-500/40 transition-all duration-300 group">
                <Award className="text-yellow-500 mx-auto mb-4 group-hover:scale-110 transition-transform drop-shadow-md" size={48} />
                <h3 className="text-xl font-bold text-white mb-3 drop-shadow-lg">
                  Expertise Reconnue
                </h3>
                <p className="text-gray-300 drop-shadow-md">
                  Spécialistes du secteur taxi avec des années d'expérience
                </p>
              </div>

              <div className="ai-card text-center p-6 hover:shadow-green-500/40 transition-all duration-300 group">
                <Target className="text-green-400 mx-auto mb-4 group-hover:scale-110 transition-transform drop-shadow-md" size={48} />
                <h3 className="text-xl font-bold text-white mb-3 drop-shadow-lg">
                  Analyse Précise
                </h3>
                <p className="text-gray-300 drop-shadow-md">
                  Étude détaillée de vos besoins et de votre activité
                </p>
              </div>

              <div className="ai-card text-center p-6 hover:shadow-yellow-500/40 transition-all duration-300 group">
                <MessageCircle className="text-yellow-400 mx-auto mb-4 group-hover:scale-110 transition-transform drop-shadow-md" size={48} />
                <h3 className="text-xl font-bold text-white mb-3 drop-shadow-lg">
                  Écoute Attentive
                </h3>
                <p className="text-gray-300 drop-shadow-md">
                  Prise en compte de vos contraintes et objectifs
                </p>
              </div>

              <div className="ai-card text-center p-6 hover:shadow-yellow-500/40 transition-all duration-300 group">
                <Users className="text-yellow-400 mx-auto mb-4 group-hover:scale-110 transition-transform drop-shadow-md" size={48} />
                <h3 className="text-xl font-bold text-white mb-3 drop-shadow-lg">
                  Suivi Personnalisé
                </h3>
                <p className="text-gray-300 drop-shadow-md">
                  Accompagnement continu et conseils adaptés
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Our Process */}
        <section className="section-padding bg-gradient-to-br from-black via-gray-950 to-gray-900">
          <div className="container-max">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-white mb-12 text-center drop-shadow-lg">
                Notre Processus de Conseil
              </h2>
              
              <div className="space-y-8">
                <div className="flex items-start space-x-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-full flex items-center justify-center flex-shrink-0 text-black font-bold shadow-lg">
                    1
                  </div>
                  <div className="ai-card flex-1 p-6 hover:shadow-yellow-500/40 transition-all duration-300">
                    <h3 className="text-xl font-bold text-white mb-3 drop-shadow-lg">Analyse de Votre Situation</h3>
                    <p className="text-gray-300 drop-shadow-md">
                      Étude complète de votre activité : type de taxi, zone d'activité, 
                      expérience, historique sinistres, objectifs professionnels.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-full flex items-center justify-center flex-shrink-0 text-black font-bold shadow-lg">
                    2
                  </div>
                  <div className="ai-card flex-1 p-6 hover:shadow-green-500/40 transition-all duration-300">
                    <h3 className="text-xl font-bold text-white mb-3 drop-shadow-lg">Identification des Besoins</h3>
                    <p className="text-gray-300 drop-shadow-md">
                      Définition précise de vos besoins en assurance : garanties indispensables, 
                      options souhaitées, budget disponible.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-full flex items-center justify-center flex-shrink-0 text-black font-bold shadow-lg">
                    3
                  </div>
                  <div className="ai-card flex-1 p-6 hover:shadow-yellow-500/40 transition-all duration-300">
                    <h3 className="text-xl font-bold text-white mb-3 drop-shadow-lg">Recommandations Personnalisées</h3>
                    <p className="text-gray-300 drop-shadow-md">
                      Présentation des solutions les mieux adaptées avec explications détaillées 
                      des avantages et inconvénients de chaque option.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-full flex items-center justify-center flex-shrink-0 text-black font-bold shadow-lg">
                    4
                  </div>
                  <div className="ai-card flex-1 p-6 hover:shadow-amber-500/40 transition-all duration-300">
                    <h3 className="text-xl font-bold text-white mb-3 drop-shadow-lg">Accompagnement Continu</h3>
                    <p className="text-gray-300 drop-shadow-md">
                      Suivi régulier de votre contrat, conseils pour l'évolution de vos besoins, 
                      assistance en cas de questions ou de sinistres.
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-center mt-12">
                <div className="ai-card p-8 taxi-glow">
                  <h3 className="text-2xl font-bold text-gradient mb-4 drop-shadow-lg">
                    Un Conseil 100% Gratuit
                  </h3>
                  <p className="text-gray-200 mb-6 text-lg drop-shadow-md">
                    Notre expertise est à votre service sans engagement. 
                    Profitez de conseils professionnels pour optimiser votre protection.
                  </p>
                  <a href="#devis" className="btn-primary">
                    🎯 Bénéficier de Nos Conseils Gratuits
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

export default ConseilPersonnalise;